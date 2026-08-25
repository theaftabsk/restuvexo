import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { convertToBaseUnit } from '../../shared/unit-converter';

export interface IngredientConsumption {
  inventoryId: number;
  itemName: string;
  qtyToDeduct: number;
  baseUnit: string;
  costAtTx: number;
}

@Injectable()
export class RecipeEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolves total raw ingredients needed for an ordered item
   * considering its stockMode, selected variant, and selected addons.
   */
  async resolveOrderItemConsumption(
    restaurantId: number,
    menuItemId: number,
    qty: number,
    variantId?: number | null,
    addonIds: number[] = []
  ): Promise<IngredientConsumption[]> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        recipes: {
          include: { inventory: true }
        },
        variants: {
          where: variantId ? { id: variantId } : undefined,
          include: {
            recipes: {
              include: { inventory: true }
            }
          }
        },
        addons: {
          where: addonIds.length > 0 ? { id: { in: addonIds } } : undefined,
          include: {
            recipes: {
              include: { inventory: true }
            }
          }
        }
      }
    });

    if (!menuItem || menuItem.restaurantId !== restaurantId) {
      return [];
    }

    // 1. If stockMode is 'dont_track', do not consume any inventory!
    if (menuItem.stockMode === 'dont_track') {
      return [];
    }

    // 2. If stockMode is 'item_stock', this is handled via finished item decrement, not raw ingredients
    if (menuItem.stockMode === 'item_stock') {
      return [];
    }

    const consumptionMap = new Map<number, IngredientConsumption>();

    // 3. Resolve Variant-Specific Recipes if variant selected and has its own recipe
    const selectedVariant = menuItem.variants?.[0];
    let hasVariantRecipe = false;

    if (selectedVariant && selectedVariant.recipes && selectedVariant.recipes.length > 0) {
      hasVariantRecipe = true;
      for (const r of selectedVariant.recipes) {
        if (!r.inventory) continue;
        const requiredInBase = convertToBaseUnit(
          Number(r.qtyRequired) * qty,
          r.unit,
          r.inventory.baseUnit
        );
        const cost = Number(r.inventory.costPerUnit || 0);

        if (consumptionMap.has(r.inventoryId)) {
          const existing = consumptionMap.get(r.inventoryId)!;
          existing.qtyToDeduct += requiredInBase;
        } else {
          consumptionMap.set(r.inventoryId, {
            inventoryId: r.inventoryId,
            itemName: r.inventory.itemName,
            qtyToDeduct: requiredInBase,
            baseUnit: r.inventory.baseUnit,
            costAtTx: cost
          });
        }
      }
    }

    // 4. Resolve Base Item Recipe (if no variant recipe overrode it, or for base BOM)
    if (!hasVariantRecipe && menuItem.recipes && menuItem.recipes.length > 0) {
      for (const r of menuItem.recipes) {
        if (r.scope !== 'base_item' && r.variantId) continue;
        if (!r.inventory) continue;

        const requiredInBase = convertToBaseUnit(
          Number(r.qtyRequired) * qty,
          r.unit,
          r.inventory.baseUnit
        );
        const cost = Number(r.inventory.costPerUnit || 0);

        if (consumptionMap.has(r.inventoryId)) {
          const existing = consumptionMap.get(r.inventoryId)!;
          existing.qtyToDeduct += requiredInBase;
        } else {
          consumptionMap.set(r.inventoryId, {
            inventoryId: r.inventoryId,
            itemName: r.inventory.itemName,
            qtyToDeduct: requiredInBase,
            baseUnit: r.inventory.baseUnit,
            costAtTx: cost
          });
        }
      }
    }

    // 5. Resolve Selected Addons' Recipes
    if (menuItem.addons && menuItem.addons.length > 0) {
      for (const addon of menuItem.addons) {
        if (addon.recipes && addon.recipes.length > 0) {
          for (const r of addon.recipes) {
            if (!r.inventory) continue;

            const requiredInBase = convertToBaseUnit(
              Number(r.qtyRequired) * qty,
              r.unit,
              r.inventory.baseUnit
            );
            const cost = Number(r.inventory.costPerUnit || 0);

            if (consumptionMap.has(r.inventoryId)) {
              const existing = consumptionMap.get(r.inventoryId)!;
              existing.qtyToDeduct += requiredInBase;
            } else {
              consumptionMap.set(r.inventoryId, {
                inventoryId: r.inventoryId,
                itemName: r.inventory.itemName,
                qtyToDeduct: requiredInBase,
                baseUnit: r.inventory.baseUnit,
                costAtTx: cost
              });
            }
          }
        }
      }
    }

    return Array.from(consumptionMap.values());
  }

  /**
   * Calculates how many portions of a dish can be made based on live ingredient stocks
   */
  async calculateAvailablePortions(
    restaurantId: number,
    menuItemId: number,
    variantId?: number
  ): Promise<{ availablePortions: number; isOutOfStock: boolean; bottleneckItem?: string }> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        recipes: { include: { inventory: true } },
        variants: {
          where: variantId ? { id: variantId } : undefined,
          include: { recipes: { include: { inventory: true } } }
        }
      }
    });

    if (!menuItem) return { availablePortions: 0, isOutOfStock: true };

    if (menuItem.stockMode === 'dont_track') {
      return { availablePortions: 9999, isOutOfStock: false };
    }

    if (menuItem.stockMode === 'item_stock') {
      return {
        availablePortions: menuItem.stockQty,
        isOutOfStock: menuItem.stockQty <= 0,
        bottleneckItem: menuItem.stockQty <= 0 ? menuItem.name : undefined
      };
    }

    // Recipe BOM calculation
    const recipesToEvaluate =
      menuItem.variants?.[0]?.recipes?.length
        ? menuItem.variants[0].recipes
        : menuItem.recipes;

    if (!recipesToEvaluate || recipesToEvaluate.length === 0) {
      return { availablePortions: 9999, isOutOfStock: false };
    }

    let minPortions = Infinity;
    let bottleneck: string | undefined = undefined;

    for (const r of recipesToEvaluate) {
      if (!r.inventory) continue;
      const currentStock = Number(r.inventory.currentStock);
      const reqInBase = convertToBaseUnit(Number(r.qtyRequired), r.unit, r.inventory.baseUnit);

      if (reqInBase <= 0) continue;

      const portionsPossible = Math.floor(currentStock / reqInBase);
      if (portionsPossible < minPortions) {
        minPortions = portionsPossible;
        bottleneck = r.inventory.itemName;
      }
    }

    const finalPortions = minPortions === Infinity ? 9999 : Math.max(0, minPortions);
    return {
      availablePortions: finalPortions,
      isOutOfStock: finalPortions <= 0,
      bottleneckItem: finalPortions <= 0 ? bottleneck : undefined
    };
  }
}
