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
exports.RecipeEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const unit_converter_1 = require("../../shared/unit-converter");
let RecipeEngineService = class RecipeEngineService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveOrderItemConsumption(restaurantId, menuItemId, qty, variantId, addonIds = []) {
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
        if (menuItem.stockMode === 'dont_track') {
            return [];
        }
        if (menuItem.stockMode === 'item_stock') {
            return [];
        }
        const consumptionMap = new Map();
        const selectedVariant = menuItem.variants?.[0];
        let hasVariantRecipe = false;
        if (selectedVariant && selectedVariant.recipes && selectedVariant.recipes.length > 0) {
            hasVariantRecipe = true;
            for (const r of selectedVariant.recipes) {
                if (!r.inventory)
                    continue;
                const requiredInBase = (0, unit_converter_1.convertToBaseUnit)(Number(r.qtyRequired) * qty, r.unit, r.inventory.baseUnit);
                const cost = Number(r.inventory.costPerUnit || 0);
                if (consumptionMap.has(r.inventoryId)) {
                    const existing = consumptionMap.get(r.inventoryId);
                    existing.qtyToDeduct += requiredInBase;
                }
                else {
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
        if (!hasVariantRecipe && menuItem.recipes && menuItem.recipes.length > 0) {
            for (const r of menuItem.recipes) {
                if (r.scope !== 'base_item' && r.variantId)
                    continue;
                if (!r.inventory)
                    continue;
                const requiredInBase = (0, unit_converter_1.convertToBaseUnit)(Number(r.qtyRequired) * qty, r.unit, r.inventory.baseUnit);
                const cost = Number(r.inventory.costPerUnit || 0);
                if (consumptionMap.has(r.inventoryId)) {
                    const existing = consumptionMap.get(r.inventoryId);
                    existing.qtyToDeduct += requiredInBase;
                }
                else {
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
        if (menuItem.addons && menuItem.addons.length > 0) {
            for (const addon of menuItem.addons) {
                if (addon.recipes && addon.recipes.length > 0) {
                    for (const r of addon.recipes) {
                        if (!r.inventory)
                            continue;
                        const requiredInBase = (0, unit_converter_1.convertToBaseUnit)(Number(r.qtyRequired) * qty, r.unit, r.inventory.baseUnit);
                        const cost = Number(r.inventory.costPerUnit || 0);
                        if (consumptionMap.has(r.inventoryId)) {
                            const existing = consumptionMap.get(r.inventoryId);
                            existing.qtyToDeduct += requiredInBase;
                        }
                        else {
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
    async calculateAvailablePortions(restaurantId, menuItemId, variantId) {
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
        if (!menuItem)
            return { availablePortions: 0, isOutOfStock: true };
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
        const recipesToEvaluate = menuItem.variants?.[0]?.recipes?.length
            ? menuItem.variants[0].recipes
            : menuItem.recipes;
        if (!recipesToEvaluate || recipesToEvaluate.length === 0) {
            return { availablePortions: 9999, isOutOfStock: false };
        }
        let minPortions = Infinity;
        let bottleneck = undefined;
        for (const r of recipesToEvaluate) {
            if (!r.inventory)
                continue;
            const currentStock = Number(r.inventory.currentStock);
            const reqInBase = (0, unit_converter_1.convertToBaseUnit)(Number(r.qtyRequired), r.unit, r.inventory.baseUnit);
            if (reqInBase <= 0)
                continue;
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
};
exports.RecipeEngineService = RecipeEngineService;
exports.RecipeEngineService = RecipeEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecipeEngineService);
//# sourceMappingURL=recipe-engine.service.js.map