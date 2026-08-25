import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { StockLedgerService } from './stock-ledger.service';
export declare class InventoryService {
    private prisma;
    private websocketGateway;
    private stockLedgerService;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway, stockLedgerService: StockLedgerService);
    getInventory(req: any, res: any): Promise<void>;
    addInventoryItem(req: any, res: any): Promise<any>;
    updateInventoryItem(req: any, res: any): Promise<any>;
    deleteInventoryItem(req: any, res: any): Promise<any>;
    recordPurchase(req: any, res: any): Promise<any>;
    recordWastage(req: any, res: any): Promise<any>;
    recordAdjustment(req: any, res: any): Promise<any>;
    getTransactions(req: any, res: any): Promise<void>;
    getStockSettings(req: any, res: any): Promise<void>;
    updateStockSettings(req: any, res: any): Promise<void>;
}
