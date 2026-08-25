import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { RecipeEngineService } from './recipe-engine.service';
import { InventoryTxType, Prisma } from '@prisma/client';

@Injectable()
export class StockLedgerService {
  constructor(
    private prisma: PrismaService,
    private recipeEngine: RecipeEngineService,
    private websocketGateway: WebsocketGateway
  ) {}

  /**
   * Safe Idempotent stock deduction for an entire Order
   */
  async deductStockForOrder(
    restaurantId: number,
    orderId: number,
    sourceType: 'KOT' | 'ORDER' = 'ORDER'
  ): Promise<{ success: boolean; deductedItemsCount: number }> {
    const idempotencyKey = `${sourceType}:${orderId}:CONSUMPTION`;

    // Check if this idempotency key was already processed
    const existingTx = await this.prisma.inventoryTransaction.findFirst({
      where: { idempotencyKey }
    });
    if (existingTx) {
      // Already deducted, prevent double deduction!
      return { success: true, deductedItemsCount: 0 };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { menuItem: true }
        }
      }
    });

    if (!order || order.restaurantId !== restaurantId) {
      return { success: false, deductedItemsCount: 0 };
    }

    // Check restaurant settings
    const settings = await this.prisma.restaurantSetting.findUnique({
      where: { restaurantId }
    });

    if (settings?.inventoryMode === 'disabled') {
      return { success: true, deductedItemsCount: 0 };
    }

    // Execute within database transaction for atomicity and concurrency safety
    await this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        // 1. Finished Item Stock Mode
        if (item.menuItem.stockMode === 'item_stock') {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stockQty: {
                decrement: item.qty
              }
            }
          });
          continue;
        }

        // 2. Recipe BOM Stock Mode
        if (item.menuItem.stockMode === 'recipe_bom') {
          const addonIds: number[] = Array.isArray(item.addonsSnapshot)
            ? (item.addonsSnapshot as any[]).map((a) => a.id).filter(Boolean)
            : [];

          const consumptions = await this.recipeEngine.resolveOrderItemConsumption(
            restaurantId,
            item.menuItemId,
            item.qty,
            item.variantId,
            addonIds
          );

          for (const c of consumptions) {
            // Fetch and lock inventory record
            const inv = await tx.inventory.findUnique({
              where: { id: c.inventoryId }
            });

            if (!inv) continue;

            const newBalance = Number(inv.currentStock) - c.qtyToDeduct;

            // Block sale if negative stock is disallowed
            if (newBalance < 0 && settings?.negativeStockPolicy === 'block_sale') {
              throw new BadRequestException(
                `Insufficient stock for ingredient: ${inv.itemName}. Required: ${c.qtyToDeduct} ${inv.baseUnit}, Available: ${inv.currentStock} ${inv.baseUnit}`
              );
            }

            // Update inventory current stock
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                currentStock: new Prisma.Decimal(newBalance)
              }
            });

            // Write audit ledger record
            await tx.inventoryTransaction.create({
              data: {
                restaurantId,
                inventoryId: inv.id,
                txType: InventoryTxType.recipe_consumption,
                qtyDelta: new Prisma.Decimal(-c.qtyToDeduct),
                balanceAfter: new Prisma.Decimal(newBalance),
                costAtTx: new Prisma.Decimal(c.costAtTx),
                idempotencyKey: `${idempotencyKey}:INV:${inv.id}`,
                sourceType,
                sourceId: orderId,
                note: `Order #${orderId} - ${item.nameSnapshot || item.menuItem.name} (x${item.qty})`
              }
            });
          }
        }
      }
    });

    // Broadcast live inventory update over websocket
    this.websocketGateway?.server?.to(`restaurant_${restaurantId}`).emit('inventory_updated');

    return { success: true, deductedItemsCount: order.orderItems.length };
  }

  /**
   * Reverses stock for a cancelled order (if not prepared/wasted)
   */
  async reverseStockForOrder(
    restaurantId: number,
    orderId: number,
    reason: string = 'Order Cancelled'
  ): Promise<{ success: boolean }> {
    const consumptionKeyPattern = `ORDER:${orderId}:CONSUMPTION`;

    const txs = await this.prisma.inventoryTransaction.findMany({
      where: {
        restaurantId,
        sourceId: orderId,
        txType: InventoryTxType.recipe_consumption
      },
      include: { inventory: true }
    });

    if (txs.length === 0) {
      return { success: true };
    }

    const reversalKey = `ORDER:${orderId}:REVERSAL`;
    const alreadyReversed = await this.prisma.inventoryTransaction.findFirst({
      where: { idempotencyKey: { startsWith: reversalKey } }
    });
    if (alreadyReversed) {
      return { success: true };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const t of txs) {
        const inv = await tx.inventory.findUnique({
          where: { id: t.inventoryId }
        });
        if (!inv) continue;

        const returnedQty = Math.abs(Number(t.qtyDelta));
        const newBalance = Number(inv.currentStock) + returnedQty;

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            currentStock: new Prisma.Decimal(newBalance)
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            restaurantId,
            inventoryId: inv.id,
            txType: InventoryTxType.cancellation_return,
            qtyDelta: new Prisma.Decimal(returnedQty),
            balanceAfter: new Prisma.Decimal(newBalance),
            costAtTx: t.costAtTx,
            idempotencyKey: `${reversalKey}:INV:${inv.id}`,
            sourceType: 'ORDER',
            sourceId: orderId,
            note: `Reversal for Order #${orderId} (${reason})`
          }
        });
      }
    });

    this.websocketGateway?.server?.to(`restaurant_${restaurantId}`).emit('inventory_updated');
    return { success: true };
  }

  /**
   * Log raw material Purchase entry
   */
  async recordPurchase(
    restaurantId: number,
    inventoryId: number,
    qtyPurchased: number,
    costPerUnit: number,
    invoiceNo?: string,
    supplierName?: string
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { id: inventoryId }
      });
      if (!inv || inv.restaurantId !== restaurantId) {
        throw new BadRequestException('Ingredient not found');
      }

      const newBalance = Number(inv.currentStock) + qtyPurchased;

      // Calculate weighted average cost
      const oldVal = Number(inv.currentStock) * Number(inv.costPerUnit || 0);
      const newVal = qtyPurchased * costPerUnit;
      const weightedAvgCost = newBalance > 0 ? (oldVal + newVal) / newBalance : costPerUnit;

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          currentStock: new Prisma.Decimal(newBalance),
          costPerUnit: new Prisma.Decimal(weightedAvgCost)
        }
      });

      const idempotencyKey = `PURCHASE:${Date.now()}:${inventoryId}`;
      const record = await tx.inventoryTransaction.create({
        data: {
          restaurantId,
          inventoryId: inv.id,
          txType: InventoryTxType.purchase,
          qtyDelta: new Prisma.Decimal(qtyPurchased),
          balanceAfter: new Prisma.Decimal(newBalance),
          costAtTx: new Prisma.Decimal(costPerUnit),
          idempotencyKey,
          sourceType: 'PURCHASE',
          note: `Purchase: ${supplierName ? supplierName + ' ' : ''}${invoiceNo ? '(Inv: ' + invoiceNo + ')' : ''}`
        }
      });

      return record;
    });
  }

  /**
   * Log Spoilage / Wastage
   */
  async recordWastage(
    restaurantId: number,
    inventoryId: number,
    qtyWasted: number,
    reason: string = 'Spoilage'
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { id: inventoryId }
      });
      if (!inv || inv.restaurantId !== restaurantId) {
        throw new BadRequestException('Ingredient not found');
      }

      const newBalance = Math.max(0, Number(inv.currentStock) - qtyWasted);

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          currentStock: new Prisma.Decimal(newBalance)
        }
      });

      const idempotencyKey = `WASTAGE:${Date.now()}:${inventoryId}`;
      return await tx.inventoryTransaction.create({
        data: {
          restaurantId,
          inventoryId: inv.id,
          txType: InventoryTxType.wastage,
          qtyDelta: new Prisma.Decimal(-qtyWasted),
          balanceAfter: new Prisma.Decimal(newBalance),
          costAtTx: inv.costPerUnit,
          idempotencyKey,
          sourceType: 'WASTAGE',
          note: `Wastage logged: ${reason}`
        }
      });
    });
  }

  /**
   * Physical Stock Count Adjustment
   */
  async recordAdjustment(
    restaurantId: number,
    inventoryId: number,
    newPhysicalCount: number,
    reason: string = 'Physical Audit Count'
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { id: inventoryId }
      });
      if (!inv || inv.restaurantId !== restaurantId) {
        throw new BadRequestException('Ingredient not found');
      }

      const current = Number(inv.currentStock);
      const delta = newPhysicalCount - current;

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          currentStock: new Prisma.Decimal(newPhysicalCount)
        }
      });

      const idempotencyKey = `ADJUSTMENT:${Date.now()}:${inventoryId}`;
      return await tx.inventoryTransaction.create({
        data: {
          restaurantId,
          inventoryId: inv.id,
          txType: InventoryTxType.stock_adjustment,
          qtyDelta: new Prisma.Decimal(delta),
          balanceAfter: new Prisma.Decimal(newPhysicalCount),
          costAtTx: inv.costPerUnit,
          idempotencyKey,
          sourceType: 'AUDIT',
          note: `Stock Adjustment: ${reason} (Was ${current} ${inv.baseUnit}, Now ${newPhysicalCount} ${inv.baseUnit})`
        }
      });
    });
  }
}
