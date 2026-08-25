"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockLedgerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const recipe_engine_service_1 = require("./recipe-engine.service");
const client_1 = require("@prisma/client");
let StockLedgerService = class StockLedgerService {
    constructor(prisma, recipeEngine, websocketGateway) {
        this.prisma = prisma;
        this.recipeEngine = recipeEngine;
        this.websocketGateway = websocketGateway;
    }
    async deductStockForOrder(restaurantId, orderId, sourceType = 'ORDER') {
        const idempotencyKey = `${sourceType}:${orderId}:CONSUMPTION`;
        const existingTx = await this.prisma.inventoryTransaction.findFirst({
            where: { idempotencyKey }
        });
        if (existingTx) {
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
        const settings = await this.prisma.restaurantSetting.findUnique({
            where: { restaurantId }
        });
        if (settings?.inventoryMode === 'disabled') {
            return { success: true, deductedItemsCount: 0 };
        }
        await this.prisma.$transaction(async (tx) => {
            for (const item of order.orderItems) {
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
                if (item.menuItem.stockMode === 'recipe_bom') {
                    const addonIds = Array.isArray(item.addonsSnapshot)
                        ? item.addonsSnapshot.map((a) => a.id).filter(Boolean)
                        : [];
                    const consumptions = await this.recipeEngine.resolveOrderItemConsumption(restaurantId, item.menuItemId, item.qty, item.variantId, addonIds);
                    for (const c of consumptions) {
                        const inv = await tx.inventory.findUnique({
                            where: { id: c.inventoryId }
                        });
                        if (!inv)
                            continue;
                        const newBalance = Number(inv.currentStock) - c.qtyToDeduct;
                        if (newBalance < 0 && settings?.negativeStockPolicy === 'block_sale') {
                            throw new common_1.BadRequestException(`Insufficient stock for ingredient: ${inv.itemName}. Required: ${c.qtyToDeduct} ${inv.baseUnit}, Available: ${inv.currentStock} ${inv.baseUnit}`);
                        }
                        await tx.inventory.update({
                            where: { id: inv.id },
                            data: {
                                currentStock: new client_1.Prisma.Decimal(newBalance)
                            }
                        });
                        await tx.inventoryTransaction.create({
                            data: {
                                restaurantId,
                                inventoryId: inv.id,
                                txType: client_1.InventoryTxType.recipe_consumption,
                                qtyDelta: new client_1.Prisma.Decimal(-c.qtyToDeduct),
                                balanceAfter: new client_1.Prisma.Decimal(newBalance),
                                costAtTx: new client_1.Prisma.Decimal(c.costAtTx),
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
        this.websocketGateway?.server?.to(`restaurant_${restaurantId}`).emit('inventory_updated');
        return { success: true, deductedItemsCount: order.orderItems.length };
    }
    async reverseStockForOrder(restaurantId, orderId, reason = 'Order Cancelled') {
        const consumptionKeyPattern = `ORDER:${orderId}:CONSUMPTION`;
        const txs = await this.prisma.inventoryTransaction.findMany({
            where: {
                restaurantId,
                sourceId: orderId,
                txType: client_1.InventoryTxType.recipe_consumption
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
                if (!inv)
                    continue;
                const returnedQty = Math.abs(Number(t.qtyDelta));
                const newBalance = Number(inv.currentStock) + returnedQty;
                await tx.inventory.update({
                    where: { id: inv.id },
                    data: {
                        currentStock: new client_1.Prisma.Decimal(newBalance)
                    }
                });
                await tx.inventoryTransaction.create({
                    data: {
                        restaurantId,
                        inventoryId: inv.id,
                        txType: client_1.InventoryTxType.cancellation_return,
                        qtyDelta: new client_1.Prisma.Decimal(returnedQty),
                        balanceAfter: new client_1.Prisma.Decimal(newBalance),
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
    async recordPurchase(restaurantId, inventoryId, qtyPurchased, costPerUnit, invoiceNo, supplierName) {
        return await this.prisma.$transaction(async (tx) => {
            const inv = await tx.inventory.findUnique({
                where: { id: inventoryId }
            });
            if (!inv || inv.restaurantId !== restaurantId) {
                throw new common_1.BadRequestException('Ingredient not found');
            }
            const newBalance = Number(inv.currentStock) + qtyPurchased;
            const oldVal = Number(inv.currentStock) * Number(inv.costPerUnit || 0);
            const newVal = qtyPurchased * costPerUnit;
            const weightedAvgCost = newBalance > 0 ? (oldVal + newVal) / newBalance : costPerUnit;
            await tx.inventory.update({
                where: { id: inv.id },
                data: {
                    currentStock: new client_1.Prisma.Decimal(newBalance),
                    costPerUnit: new client_1.Prisma.Decimal(weightedAvgCost)
                }
            });
            const idempotencyKey = `PURCHASE:${Date.now()}:${inventoryId}`;
            const record = await tx.inventoryTransaction.create({
                data: {
                    restaurantId,
                    inventoryId: inv.id,
                    txType: client_1.InventoryTxType.purchase,
                    qtyDelta: new client_1.Prisma.Decimal(qtyPurchased),
                    balanceAfter: new client_1.Prisma.Decimal(newBalance),
                    costAtTx: new client_1.Prisma.Decimal(costPerUnit),
                    idempotencyKey,
                    sourceType: 'PURCHASE',
                    note: `Purchase: ${supplierName ? supplierName + ' ' : ''}${invoiceNo ? '(Inv: ' + invoiceNo + ')' : ''}`
                }
            });
            return record;
        });
    }
    async recordWastage(restaurantId, inventoryId, qtyWasted, reason = 'Spoilage') {
        return await this.prisma.$transaction(async (tx) => {
            const inv = await tx.inventory.findUnique({
                where: { id: inventoryId }
            });
            if (!inv || inv.restaurantId !== restaurantId) {
                throw new common_1.BadRequestException('Ingredient not found');
            }
            const newBalance = Math.max(0, Number(inv.currentStock) - qtyWasted);
            await tx.inventory.update({
                where: { id: inv.id },
                data: {
                    currentStock: new client_1.Prisma.Decimal(newBalance)
                }
            });
            const idempotencyKey = `WASTAGE:${Date.now()}:${inventoryId}`;
            return await tx.inventoryTransaction.create({
                data: {
                    restaurantId,
                    inventoryId: inv.id,
                    txType: client_1.InventoryTxType.wastage,
                    qtyDelta: new client_1.Prisma.Decimal(-qtyWasted),
                    balanceAfter: new client_1.Prisma.Decimal(newBalance),
                    costAtTx: inv.costPerUnit,
                    idempotencyKey,
                    sourceType: 'WASTAGE',
                    note: `Wastage logged: ${reason}`
                }
            });
        });
    }
    async recordAdjustment(restaurantId, inventoryId, newPhysicalCount, reason = 'Physical Audit Count') {
        return await this.prisma.$transaction(async (tx) => {
            const inv = await tx.inventory.findUnique({
                where: { id: inventoryId }
            });
            if (!inv || inv.restaurantId !== restaurantId) {
                throw new common_1.BadRequestException('Ingredient not found');
            }
            const current = Number(inv.currentStock);
            const delta = newPhysicalCount - current;
            await tx.inventory.update({
                where: { id: inv.id },
                data: {
                    currentStock: new client_1.Prisma.Decimal(newPhysicalCount)
                }
            });
            const idempotencyKey = `ADJUSTMENT:${Date.now()}:${inventoryId}`;
            return await tx.inventoryTransaction.create({
                data: {
                    restaurantId,
                    inventoryId: inv.id,
                    txType: client_1.InventoryTxType.stock_adjustment,
                    qtyDelta: new client_1.Prisma.Decimal(delta),
                    balanceAfter: new client_1.Prisma.Decimal(newPhysicalCount),
                    costAtTx: inv.costPerUnit,
                    idempotencyKey,
                    sourceType: 'AUDIT',
                    note: `Stock Adjustment: ${reason} (Was ${current} ${inv.baseUnit}, Now ${newPhysicalCount} ${inv.baseUnit})`
                }
            });
        });
    }
};
exports.StockLedgerService = StockLedgerService;
exports.StockLedgerService = StockLedgerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        recipe_engine_service_1.RecipeEngineService,
        websocket_gateway_1.WebsocketGateway])
], StockLedgerService);
//# sourceMappingURL=stock-ledger.service.js.map