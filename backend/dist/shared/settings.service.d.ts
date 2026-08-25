import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    private cache;
    constructor(prisma: PrismaService);
    getRestaurantSettings(restaurantId: number): Promise<any>;
    updateRestaurantSettings(restaurantId: number, updateData: any): Promise<{
        subscriptionPlan: string;
        id: number;
        restaurantId: number;
        qrOrderingEnabled: boolean;
        customerTheme: string;
        sidebarTheme: string;
        sidebarQuickActions: boolean;
        sidebarStoreSwitch: boolean;
        sidebarCollapsible: boolean;
        sidebarHiddenItems: string[];
        inventoryMode: import(".prisma/client").$Enums.InventoryMode;
        deductionTrigger: import(".prisma/client").$Enums.StockDeductionTrigger;
        negativeStockPolicy: import(".prisma/client").$Enums.NegativeStockPolicy;
        lowStockAlertEnabled: boolean;
        autoOutOfStockEnabled: boolean;
        vexoAiEnabled: boolean;
        vexoAiNormalLimit: number;
        vexoAiApiLimit: number;
        subscriptionStatus: string;
        trialEndsAt: Date | null;
        enabledFeatures: import("@prisma/client/runtime/library").JsonValue | null;
        customPrice: import("@prisma/client/runtime/library").Decimal;
        customNotes: string | null;
    }>;
}
