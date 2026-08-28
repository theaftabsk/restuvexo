import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    server: Server;
    constructor(prisma: PrismaService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRestaurant(payload: any, client: Socket): Promise<void>;
    handleCallWaiter(data: {
        restaurantId: number | string;
        tableNo: string;
    }, client: Socket): Promise<void>;
    handleNewOrderPlaced(data: {
        restaurantId: number | string;
        orderId: number;
        orderType: string;
    }, client: Socket): void;
    emitToRestaurant(restaurantId: number | string, event: string, payload: any): void;
}
