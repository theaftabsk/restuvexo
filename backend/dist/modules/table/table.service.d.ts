import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { DashboardService } from '../dashboard/dashboard.service';
export declare class TableService {
    private prisma;
    private settingsService;
    private websocketGateway;
    private dashboardService;
    constructor(prisma: PrismaService, settingsService: SettingsService, websocketGateway: WebsocketGateway, dashboardService: DashboardService);
    getTables(req: any, res: any): Promise<any>;
    createTable(req: any, res: any): Promise<any>;
    updateTable(req: any, res: any): Promise<any>;
    deleteTable(req: any, res: any): Promise<any>;
    getActiveSessions(req: any, res: any): Promise<any>;
    clearActiveSession(req: any, res: any): Promise<any>;
    getSettings(req: any, res: any): Promise<void>;
    updateSettings(req: any, res: any): Promise<void>;
    blockDevice(req: any, res: any): Promise<any>;
    getBlacklistedDevices(req: any, res: any): Promise<void>;
    unblockDevice(req: any, res: any): Promise<void>;
    getTableHistory(req: any, res: any): Promise<any>;
}
