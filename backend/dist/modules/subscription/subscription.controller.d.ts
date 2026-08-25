import { SubscriptionService } from './subscription.service';
import { Request, Response } from 'express';
export declare class SubscriptionController {
    private subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    getPlans(res: Response): Promise<Response<any, Record<string, any>>>;
    getMySubscription(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    createCashfreeOrder(req: any, res: Response, body: {
        planId?: number;
        isRenewal?: boolean;
    }): Promise<Response<any, Record<string, any>>>;
    verifyCashfreePayment(req: any, res: Response, body: {
        orderId: string;
        planId?: number;
    }): Promise<Response<any, Record<string, any>>>;
    handleCashfreeWebhook(req: Request, res: Response, body: any): Promise<Response<any, Record<string, any>>>;
    getAdminSubscriptions(status: string, search: string, page: string, limit: string, res: Response): Promise<Response<any, Record<string, any>>>;
    adminExtendSubscription(req: any, res: Response, body: {
        subscriptionId: number;
        days: number;
        reason: string;
    }): Promise<Response<any, Record<string, any>>>;
    adminRecordPayment(req: any, res: Response, body: {
        subscriptionId: number;
        amount: number;
        paymentMethod: string;
        transactionId: string;
        notes: string;
    }): Promise<Response<any, Record<string, any>>>;
    adminChangePlan(req: any, res: Response, body: {
        subscriptionId: number;
        newPlanId: number;
        customRenewalPrice?: number;
    }): Promise<Response<any, Record<string, any>>>;
    adminChangeStatus(req: any, res: Response, body: {
        subscriptionId: number;
        status: any;
        reason: string;
    }): Promise<Response<any, Record<string, any>>>;
    runCron(res: Response): Promise<Response<any, Record<string, any>>>;
}
