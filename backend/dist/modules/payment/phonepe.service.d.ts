import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
export declare class PhonePeService {
    private prisma;
    private websocketGateway;
    private readonly clientId;
    private readonly clientSecret;
    private readonly clientVersion;
    private readonly merchantId;
    private client;
    constructor(prisma: PrismaService, websocketGateway: WebsocketGateway);
    initiatePayment(orderId: number, redirectUrl: string): Promise<string>;
    checkTransactionStatus(txnId: string): Promise<any>;
    processCallback(responsePayload: {
        response: string;
    }): Promise<any>;
}
