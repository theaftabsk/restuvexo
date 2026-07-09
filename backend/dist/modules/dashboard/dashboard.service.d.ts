import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
export declare class DashboardService {
    private prisma;
    private settingsService;
    private websocketGateway;
    constructor(prisma: PrismaService, settingsService: SettingsService, websocketGateway: WebsocketGateway);
    getDashboardStats(req: any, res: any): Promise<void>;
    getSidebarTelemetry(req: any, res: any): Promise<void>;
    broadcastSidebarTelemetry(restaurantId: any): Promise<void>;
}
