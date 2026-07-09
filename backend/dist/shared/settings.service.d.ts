import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    private cache;
    constructor(prisma: PrismaService);
    getRestaurantSettings(restaurantId: number): Promise<any>;
    updateRestaurantSettings(restaurantId: number, updateData: any): Promise<{
        id: number;
        restaurantId: number;
        qrOrderingEnabled: boolean;
        customerTheme: string;
        sidebarTheme: string;
        sidebarQuickActions: boolean;
        sidebarStoreSwitch: boolean;
        sidebarCollapsible: boolean;
        sidebarHiddenItems: string[];
        vexoAiEnabled: boolean;
        vexoAiNormalLimit: number;
        vexoAiApiLimit: number;
        subscriptionPlan: string;
        subscriptionStatus: string;
        trialEndsAt: Date | null;
        enabledFeatures: import("@prisma/client/runtime/library").JsonValue | null;
        customPrice: import("@prisma/client/runtime/library").Decimal;
        customNotes: string | null;
    }>;
}
