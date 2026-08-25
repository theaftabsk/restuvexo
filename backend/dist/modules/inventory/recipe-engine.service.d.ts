import { PrismaService } from '../../prisma/prisma.service';
export interface IngredientConsumption {
    inventoryId: number;
    itemName: string;
    qtyToDeduct: number;
    baseUnit: string;
    costAtTx: number;
}
export declare class RecipeEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    resolveOrderItemConsumption(restaurantId: number, menuItemId: number, qty: number, variantId?: number | null, addonIds?: number[]): Promise<IngredientConsumption[]>;
    calculateAvailablePortions(restaurantId: number, menuItemId: number, variantId?: number): Promise<{
        availablePortions: number;
        isOutOfStock: boolean;
        bottleneckItem?: string;
    }>;
}
