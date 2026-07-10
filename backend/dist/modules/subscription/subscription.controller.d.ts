import { SubscriptionService } from './subscription.service';
import { Response } from 'express';
export declare class SubscriptionController {
    private subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    getStatus(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    purchaseAddon(req: any, res: Response, body: {
        addonCode: string;
        quantity: number;
    }): Promise<Response<any, Record<string, any>>>;
    getInvoices(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
