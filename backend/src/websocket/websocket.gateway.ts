import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

const allowedOrigins = [
  'https://app.restuvexo.shop',
  'https://restuvexo.shop',
  'https://www.restuvexo.shop'
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://app.localhost:3000');
}

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

@WebSocketGateway({
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      let isAllowed = allowedOrigins.includes(origin);
      if (process.env.NODE_ENV !== 'production') {
        if (/^https?:\/\/([a-z0-9-]+)\.localhost:3000$/.test(origin)) {
          isAllowed = true;
        }
      }
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true
  }
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
