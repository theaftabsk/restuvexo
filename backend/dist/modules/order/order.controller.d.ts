import { Request, Response } from 'express';
import { OrderService } from './order.service';
export declare class OrderController {
    private orderService;
    constructor(orderService: OrderService);
    generateTemplink(req: Request, res: Response): Promise<any>;
    getQrMenu(req: Request, res: Response): Promise<any>;
    createQrOrder(req: Request, res: Response): Promise<any>;
    createOrder(req: Request, res: Response): Promise<any>;
    getOrders(req: Request, res: Response): Promise<void>;
    updateOrder(req: Request, res: Response): Promise<any>;
    updateOrderStatus(req: Request, res: Response): Promise<any>;
    approveQrOrder(req: Request, res: Response): Promise<any>;
    settleOrder(req: Request, res: Response): Promise<any>;
    deleteOrder(req: Request, res: Response): Promise<any>;
    mergeOrders(req: Request, res: Response): Promise<any>;
    splitOrder(req: Request, res: Response): Promise<any>;
    moveTable(req: Request, res: Response): Promise<any>;
    reprintOrder(req: Request, res: Response): Promise<any>;
    applyDiscount(req: Request, res: Response): Promise<any>;
    assignWaiter(req: Request, res: Response): Promise<any>;
    voidOrder(req: Request, res: Response): Promise<any>;
    getOrderLogs(req: Request, res: Response): Promise<any>;
}
