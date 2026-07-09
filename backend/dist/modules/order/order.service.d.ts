import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { DashboardService } from '../dashboard/dashboard.service';
export declare class OrderService {
    private prisma;
    private settingsService;
    private websocketGateway;
    private dashboardService;
    constructor(prisma: PrismaService, settingsService: SettingsService, websocketGateway: WebsocketGateway, dashboardService: DashboardService);
    generateTemplink(req: any, res: any): Promise<any>;
    createOrder(req: any, res: any): Promise<any>;
    updateOrder(req: any, res: any): Promise<any>;
    getOrders(req: any, res: any): Promise<void>;
    updateOrderStatus(req: any, res: any): Promise<any>;
    getQrMenu(req: any, res: any): Promise<any>;
    createQrOrder(req: any, res: any): Promise<any>;
    approveQrOrder(req: any, res: any): Promise<any>;
    settleOrder(req: any, res: any): Promise<any>;
    deleteOrder(req: any, res: any): Promise<any>;
}
