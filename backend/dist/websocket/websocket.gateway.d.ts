import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRestaurant(restaurantId: number | string, client: Socket): void;
    handleCallWaiter(data: {
        restaurantId: number | string;
        tableNo: string;
    }): void;
    handleNewOrderPlaced(data: {
        restaurantId: number | string;
        orderId: number;
        orderType: string;
    }): void;
    emitToRestaurant(restaurantId: number | string, event: string, payload: any): void;
}
