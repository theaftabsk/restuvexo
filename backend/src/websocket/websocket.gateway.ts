import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  // Allow all restuvexo.shop root and subdomains (app, order, admin, api, www, etc.)
  if (/^https?:\/\/([a-z0-9-]+\.)?restuvexo\.shop(:\d+)?$/i.test(origin)) return true;
  // Allow localhost & local network IPs
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+)\.localhost(:\d+)?$/i.test(origin)) return true;
  if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL)) return true;
  return true;
};

@WebSocketGateway({
  cors: {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["websocket", "polling"]
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[Socket.io] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket.io] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_restaurant')
  handleJoinRestaurant(@MessageBody() restaurantId: number | string, @ConnectedSocket() client: Socket) {
    const roomName = `restaurant_${restaurantId}`;
    client.join(roomName);
    console.log(`[Socket.io] Socket ${client.id} joined room: ${roomName}`);
  }

  @SubscribeMessage('call_waiter')
  handleCallWaiter(@MessageBody() data: { restaurantId: number | string; tableNo: string }) {
    if (data.restaurantId && data.tableNo) {
      const roomName = `restaurant_${data.restaurantId}`;
      this.server.to(roomName).emit('waiter_called', {
        tableNo: data.tableNo,
        timestamp: new Date()
      });
      console.log(`[Socket.io] Waiter called at Table ${data.tableNo} for Restaurant ${data.restaurantId}`);
    }
  }

  @SubscribeMessage('new_order_placed')
  handleNewOrderPlaced(@MessageBody() data: { restaurantId: number | string; orderId: number; orderType: string }) {
    if (data.restaurantId) {
      const roomName = `restaurant_${data.restaurantId}`;
      this.server.to(roomName).emit('kds_new_order', {
        orderId: data.orderId,
        orderType: data.orderType,
        timestamp: new Date()
      });
      console.log(`[Socket.io] KDS Alert: New order #${data.orderId} placed for Restaurant ${data.restaurantId}`);
    }
  }

  // Helper method to emit events from controllers/services
  emitToRestaurant(restaurantId: number | string, event: string, payload: any) {
    if (this.server) {
      const roomName = `restaurant_${restaurantId}`;
      this.server.to(roomName).emit(event, payload);
    }
  }
}
