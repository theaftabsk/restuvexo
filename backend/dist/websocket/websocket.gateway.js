"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "VexoSecretRosJwtToken2026MasterKey";
const isOriginAllowed = (origin) => {
    if (!origin)
        return true;
    if (/^https?:\/\/([a-z0-9-]+\.)?restuvexo\.shop(:\d+)?$/i.test(origin))
        return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin))
        return true;
    if (/^https?:\/\/([a-z0-9-]+)\.localhost(:\d+)?$/i.test(origin))
        return true;
    if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL))
        return true;
    return true;
};
let WebsocketGateway = class WebsocketGateway {
    constructor(prisma) {
        this.prisma = prisma;
    }
    handleConnection(client) {
        console.log(`[Socket.io] Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`[Socket.io] Client disconnected: ${client.id}`);
    }
    async handleJoinRestaurant(payload, client) {
        let targetRestaurantId = null;
        let token = null;
        let tableId = null;
        if (typeof payload === 'object' && payload !== null) {
            targetRestaurantId = parseInt(payload.restaurantId, 10);
            token = payload.token || client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
            tableId = payload.tableId;
        }
        else {
            targetRestaurantId = parseInt(payload, 10);
            token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
        }
        if (!targetRestaurantId || isNaN(targetRestaurantId)) {
            console.warn(`[Security Alert] Socket ${client.id} provided invalid restaurant ID.`);
            client.emit('security_error', { error: 'Invalid restaurant identity.' });
            return;
        }
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const tokenRestId = parseInt(decoded.restaurantId, 10);
                if (tokenRestId !== targetRestaurantId) {
                    console.warn(`[Security Breach Blocked] Cross-tenant violation: Socket ${client.id} (restaurant ${tokenRestId}) tried to join room restaurant_${targetRestaurantId}!`);
                    client.emit('security_error', { error: 'Access Denied: Cross-tenant data isolation violation.' });
                    client.disconnect(true);
                    return;
                }
            }
            catch (err) {
                console.warn(`[Security Warning] Socket ${client.id} passed invalid/expired token for restaurant_${targetRestaurantId}`);
                client.emit('security_error', { error: 'Invalid or expired session token.' });
                return;
            }
        }
        else if (tableId) {
            try {
                const table = await this.prisma.table.findFirst({
                    where: { id: parseInt(tableId, 10), restaurantId: targetRestaurantId }
                });
                if (!table) {
                    console.warn(`[Security Alert] Socket ${client.id} customer table ${tableId} does not belong to restaurant ${targetRestaurantId}!`);
                    client.emit('security_error', { error: 'Invalid table for this restaurant.' });
                    return;
                }
            }
            catch (e) {
                return;
            }
        }
        const restaurantExists = await this.prisma.restaurant.findUnique({
            where: { id: targetRestaurantId },
            select: { id: true }
        });
        if (!restaurantExists) {
            console.warn(`[Security Alert] Socket ${client.id} tried to join non-existent restaurant_${targetRestaurantId}`);
            client.emit('security_error', { error: 'Restaurant not found.' });
            return;
        }
        client.data.restaurantId = targetRestaurantId;
        const roomName = `restaurant_${targetRestaurantId}`;
        client.join(roomName);
        console.log(`[Socket.io] Verified socket ${client.id} joined isolated room: ${roomName}`);
    }
    async handleCallWaiter(data, client) {
        const targetRestId = parseInt(String(data?.restaurantId), 10);
        if (!targetRestId || !data.tableNo)
            return;
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
    handleNewOrderPlaced(data, client) {
        const targetRestId = parseInt(String(data?.restaurantId), 10);
        if (!targetRestId)
            return;
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
    emitToRestaurant(restaurantId, event, payload) {
        if (this.server && restaurantId) {
            const roomName = `restaurant_${restaurantId}`;
            this.server.to(roomName).emit(event, payload);
        }
    }
};
exports.WebsocketGateway = WebsocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WebsocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_restaurant'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleJoinRestaurant", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call_waiter'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleCallWaiter", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('new_order_placed'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleNewOrderPlaced", null);
exports.WebsocketGateway = WebsocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: function (origin, callback) {
                callback(null, true);
            },
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map