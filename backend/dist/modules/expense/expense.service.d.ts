import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
export declare class ExpenseService {
    private prisma;
    private websocketGateway;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway);
    addExpense(req: any, res: any): Promise<any>;
    getExpenses(req: any, res: any): Promise<any>;
    deleteExpense(req: any, res: any): Promise<any>;
}
