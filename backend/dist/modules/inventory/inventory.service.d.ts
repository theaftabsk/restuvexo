import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
export declare class InventoryService {
    private prisma;
    private websocketGateway;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway);
    getInventory(req: any, res: any): Promise<void>;
    addInventoryItem(req: any, res: any): Promise<any>;
    updateInventoryItem(req: any, res: any): Promise<any>;
    deleteInventoryItem(req: any, res: any): Promise<any>;
}
