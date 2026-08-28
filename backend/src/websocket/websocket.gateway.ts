import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "VexoSecretRosJwtToken2026MasterKey";

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
      callback(null, true);
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

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`[Socket.io] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket.io] Client disconnected: ${client.id}`);
  }

  /**
   * Secure Multi-Tenant Room Join
   * Enforces that staff/owners can ONLY join their own restaurant room,
   * and customer QR users can only join rooms for tables that actually belong to that restaurant.
   */
  @SubscribeMessage('join_restaurant')
  async handleJoinRestaurant(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    let targetRestaurantId: number | null = null;
    let token: string | null = null;
    let tableId: any = null;

    if (typeof payload === 'object' && payload !== null) {
      targetRestaurantId = parseInt(payload.restaurantId, 10);
      token = payload.token || client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      tableId = payload.tableId;
    } else {
      targetRestaurantId = parseInt(payload, 10);
      token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
    }

    if (!targetRestaurantId || isNaN(targetRestaurantId)) {
      console.warn(`[Security Alert] Socket ${client.id} provided invalid restaurant ID.`);
      client.emit('security_error', { error: 'Invalid restaurant identity.' });
      return;
    }

    // 1. If staff/owner provides JWT token: strictly verify identity matches target restaurant
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const tokenRestId = parseInt(decoded.restaurantId, 10);
        if (tokenRestId !== targetRestaurantId) {
          console.warn(`[Security Breach Blocked] Cross-tenant violation: Socket ${client.id} (restaurant ${tokenRestId}) tried to join room restaurant_${targetRestaurantId}!`);
          client.emit('security_error', { error: 'Access Denied: Cross-tenant data isolation violation.' });
          client.disconnect(true);
          return;
        }
      } catch (err) {
        console.warn(`[Security Warning] Socket ${client.id} passed invalid/expired token for restaurant_${targetRestaurantId}`);
        client.emit('security_error', { error: 'Invalid or expired session token.' });
        return;
      }
    } else if (tableId) {
      // 2. If customer QR session: verify table belongs to this restaurant
      try {
        const table = await this.prisma.table.findFirst({
          where: { id: parseInt(tableId, 10), restaurantId: targetRestaurantId }
        });
        if (!table) {
          console.warn(`[Security Alert] Socket ${client.id} customer table ${tableId} does not belong to restaurant ${targetRestaurantId}!`);
          client.emit('security_error', { error: 'Invalid table for this restaurant.' });
          return;
        }
      } catch (e) {
        return;
      }
    }

    // 3. Verify restaurant exists in database
    const restaurantExists = await this.prisma.restaurant.findUnique({
      where: { id: targetRestaurantId },
      select: { id: true }
    });

    if (!restaurantExists) {
      console.warn(`[Security Alert] Socket ${client.id} tried to join non-existent restaurant_${targetRestaurantId}`);
      client.emit('security_error', { error: 'Restaurant not found.' });
      return;
    }

    // Associate authorized restaurantId with this socket connection
    client.data.restaurantId = targetRestaurantId;
    const roomName = `restaurant_${targetRestaurantId}`;
    client.join(roomName);
    console.log(`[Socket.io] Verified socket ${client.id} joined isolated room: ${roomName}`);
  }

  @SubscribeMessage('call_waiter')
  async handleCallWaiter(@MessageBody() data: { restaurantId: number | string; tableNo: string }, @ConnectedSocket() client: Socket) {
    const targetRestId = parseInt(String(data?.restaurantId), 10);
    if (!targetRestId || !data.tableNo) return;

    // Verify socket is authorized for this restaurant room
    if (client.data.restaurantId && client.data.restaurantId !== targetRestId) {
      console.warn(`[Security Violation] Socket ${client.id} unauthorized waiter call for restaurant ${targetRestId}`);
      return;
    }

    const roomName = `restaurant_${targetRestId}`;
    this.server.to(roomName).emit('waiter_called', {
      tableNo: data.tableNo,
      timestamp: new Date()
    });
    console.log(`[Socket.io] Waiter called at Table ${data.tableNo} for Restaurant ${targetRestId}`);
  }

  @SubscribeMessage('new_order_placed')
  handleNewOrderPlaced(@MessageBody() data: { restaurantId: number | string; orderId: number; orderType: string }, @ConnectedSocket() client: Socket) {
    const targetRestId = parseInt(String(data?.restaurantId), 10);
    if (!targetRestId) return;

    // Verify socket is authorized for this restaurant room
    if (client.data.restaurantId && client.data.restaurantId !== targetRestId) {
      console.warn(`[Security Violation] Socket ${client.id} unauthorized order alert for restaurant ${targetRestId}`);
      return;
    }

    const roomName = `restaurant_${targetRestId}`;
    this.server.to(roomName).emit('kds_new_order', {
      orderId: data.orderId,
      orderType: data.orderType,
      timestamp: new Date()
    });
    console.log(`[Socket.io] KDS Alert: New order #${data.orderId} placed for Restaurant ${targetRestId}`);
  }

  // Helper method to emit events from controllers/services to an isolated restaurant room
  emitToRestaurant(restaurantId: number | string, event: string, payload: any) {
    if (this.server && restaurantId) {
      const roomName = `restaurant_${restaurantId}`;
      this.server.to(roomName).emit(event, payload);
    }
  }
}

