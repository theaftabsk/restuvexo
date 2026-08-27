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
    handleConnection(client) {
        console.log(`[Socket.io] Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`[Socket.io] Client disconnected: ${client.id}`);
    }
    handleJoinRestaurant(restaurantId, client) {
        const roomName = `restaurant_${restaurantId}`;
        client.join(roomName);
        console.log(`[Socket.io] Socket ${client.id} joined room: ${roomName}`);
    }
    handleCallWaiter(data) {
        if (data.restaurantId && data.tableNo) {
            const roomName = `restaurant_${data.restaurantId}`;
            this.server.to(roomName).emit('waiter_called', {
                tableNo: data.tableNo,
                timestamp: new Date()
            });
            console.log(`[Socket.io] Waiter called at Table ${data.tableNo} for Restaurant ${data.restaurantId}`);
        }
    }
    handleNewOrderPlaced(data) {
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
    emitToRestaurant(restaurantId, event, payload) {
        if (this.server) {
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
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleJoinRestaurant", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call_waiter'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleCallWaiter", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('new_order_placed'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleNewOrderPlaced", null);
exports.WebsocketGateway = WebsocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: function (origin, callback) {
                if (isOriginAllowed(origin)) {
                    callback(null, true);
                }
                else {
                    callback(null, true);
                }
            },
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    }),
    (0, common_1.Injectable)()
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map