import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { SubscriptionStatus, Prisma } from '@prisma/client';
export declare class SubscriptionService {
    private prisma;
    private websocketGateway;
    private getCashfreeConfig;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway);
    getPlans(): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        features: Prisma.JsonValue | null;
        price: Prisma.Decimal;
        billingDays: number;
        firstMonthPrice: Prisma.Decimal;
        isActive: boolean;
    }[]>;
    getMySubscription(restaurantId: number): Promise<{
        hasSubscription: boolean;
        recommendedPlan: {
            id: number;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            features: Prisma.JsonValue | null;
            price: Prisma.Decimal;
            billingDays: number;
            firstMonthPrice: Prisma.Decimal;
            isActive: boolean;
        };
        subscription?: undefined;
    } | {
        hasSubscription: boolean;
        subscription: {
            daysRemaining: number;
            isExpiringSoon: boolean;
            isInGrace: boolean;
            isSuspended: boolean;
            plan: {
                id: number;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                features: Prisma.JsonValue | null;
                price: Prisma.Decimal;
                billingDays: number;
                firstMonthPrice: Prisma.Decimal;
                isActive: boolean;
            };
            payments: {
                id: number;
                restaurantId: number;
                createdAt: Date;
                status: string;
                subscriptionId: number;
                paymentMethod: string;
                amount: Prisma.Decimal;
                transactionId: string | null;
                notes: string | null;
                gateway: string | null;
                gatewayEventId: string | null;
                cfOrderId: string | null;
                cfPaymentId: string | null;
                paidAt: Date | null;
            }[];
            events: {
                id: number;
                createdAt: Date;
                subscriptionId: number;
                action: string;
                notes: string | null;
                actor: string;
                details: Prisma.JsonValue | null;
            }[];
            id: number;
            restaurantId: number;
            createdAt: Date;
            planId: number;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            updatedAt: Date;
            discountApplied: Prisma.Decimal;
            amount: Prisma.Decimal;
            startedAt: Date;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            nextBillingAt: Date;
            renewalAmount: Prisma.Decimal;
            graceDays: number;
            notes: string | null;
        };
        recommendedPlan?: undefined;
    }>;
    createCashfreeOrder(restaurantId: number, planId?: number, isRenewal?: boolean): Promise<{
        success: boolean;
        orderId: string;
        paymentSessionId: any;
        orderAmount: number;
        planName: any;
        isFirstTime: boolean;
        environment: string;
        isMock?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        orderId: string;
        paymentSessionId: string;
        orderAmount: number;
        planName: any;
        isFirstTime: boolean;
        isMock: boolean;
        environment: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        orderId?: undefined;
        paymentSessionId?: undefined;
        orderAmount?: undefined;
        planName?: undefined;
        isFirstTime?: undefined;
        environment?: undefined;
        isMock?: undefined;
    }>;
    verifyCashfreePayment(restaurantId: number, orderId: string, planId?: number): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
        subscription?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        subscription?: undefined;
    } | {
        success: boolean;
        message: string;
        subscription: {
            planName: any;
            status: string;
            currentPeriodEnd: Date;
            renewalAmount: any;
        };
        error?: undefined;
    }>;
    handleCashfreeWebhook(payload: any, signature?: string, timestamp?: string): Promise<{
        status: string;
        message: string;
        orderId?: undefined;
        type?: undefined;
    } | {
        status: string;
        orderId: any;
        message?: undefined;
        type?: undefined;
    } | {
        status: string;
        type: any;
        message?: undefined;
        orderId?: undefined;
    }>;
    getAdminSubscriptions(statusFilter?: string, search?: string, page?: number, limit?: number): Promise<{
        data: ({
            restaurant: {
                id: number;
                name: string;
                phone: string;
                email: string;
                createdAt: Date;
            };
            plan: {
                id: number;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                features: Prisma.JsonValue | null;
                price: Prisma.Decimal;
                billingDays: number;
                firstMonthPrice: Prisma.Decimal;
                isActive: boolean;
            };
            payments: {
                id: number;
                restaurantId: number;
                createdAt: Date;
                status: string;
                subscriptionId: number;
                paymentMethod: string;
                amount: Prisma.Decimal;
                transactionId: string | null;
                notes: string | null;
                gateway: string | null;
                gatewayEventId: string | null;
                cfOrderId: string | null;
                cfPaymentId: string | null;
                paidAt: Date | null;
            }[];
        } & {
            id: number;
            restaurantId: number;
            createdAt: Date;
            planId: number;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            updatedAt: Date;
            discountApplied: Prisma.Decimal;
            amount: Prisma.Decimal;
            startedAt: Date;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            nextBillingAt: Date;
            renewalAmount: Prisma.Decimal;
            graceDays: number;
            notes: string | null;
        })[];
        stats: {
            totalSubscribed: number;
            mrr: number;
            activeCount: number;
            graceCount: number;
            suspendedCount: number;
        };
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    adminExtendSubscription(subscriptionId: number, days: number, reason: string, actor?: string): Promise<{
        success: boolean;
        message: string;
        newEndDate: Date;
    }>;
    adminRecordPayment(subscriptionId: number, amount: number, paymentMethod: string, transactionId: string, notes: string, actor?: string): Promise<{
        success: boolean;
        message: string;
        newEndDate: Date;
    }>;
    adminChangePlan(subscriptionId: number, newPlanId: number, customRenewalPrice?: number, actor?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    adminChangeStatus(subscriptionId: number, status: SubscriptionStatus, reason: string, actor?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    processDailyCron(): Promise<{
        success: boolean;
        processed: {
            movedToGrace: number;
            checkedGrace: number;
        };
    }>;
}
