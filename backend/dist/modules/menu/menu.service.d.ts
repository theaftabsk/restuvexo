import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
export declare class MenuService {
    private prisma;
    private websocketGateway;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway);
    createCategory(req: any, res: any): Promise<any>;
    getCategories(req: any, res: any): Promise<void>;
    createMenuItem(req: any, res: any): Promise<any>;
    getMenuItems(req: any, res: any): Promise<void>;
    updateCategory(req: any, res: any): Promise<any>;
    deleteCategory(req: any, res: any): Promise<any>;
    updateMenuItem(req: any, res: any): Promise<any>;
    deleteMenuItem(req: any, res: any): Promise<any>;
}
