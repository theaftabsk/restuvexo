import { PrismaService } from '../../prisma/prisma.service';
export declare class SubscriptionService {
    private prisma;
    constructor(prisma: PrismaService);
    canUse(restaurantId: number, featureCode: string): Promise<boolean>;
    trackUsage(restaurantId: number, metric: string, amount?: number): Promise<void>;
    checkOrderLimit(restaurantId: number): Promise<{
        allowed: boolean;
        warning?: string;
    }>;
    getSubscriptionStatus(restaurantId: number): Promise<any>;
    purchaseAddon(restaurantId: number, addonCode: string, quantity: number): Promise<any>;
    getInvoices(restaurantId: number): Promise<any[]>;
}
