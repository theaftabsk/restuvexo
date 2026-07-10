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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhonePeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const pg_sdk_node_1 = require("@phonepe-pg/pg-sdk-node");
let PhonePeService = class PhonePeService {
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
        this.clientId = 'M23OOWJ17N2GQ_2604172032';
        this.clientSecret = 'OTUxNjcwZTktMDVkOC00NDA4LWI5OGMtNGEyYjMwMmFhMWMw';
        this.clientVersion = 1;
        this.merchantId = 'M23OOWJ17N2GQ';
        this.client = pg_sdk_node_1.StandardCheckoutClient.getInstance(this.clientId, this.clientSecret, this.clientVersion, pg_sdk_node_1.Env.SANDBOX);
    }
    async initiatePayment(orderId, redirectUrl) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order)
            throw new common_1.BadRequestException('Order not found.');
        if (order.paymentStatus === 'paid')
            throw new common_1.BadRequestException('Order is already paid.');
        const amountInPaise = Math.round(parseFloat(order.totalAmount.toString()) * 100);
        const txnId = `TXN_REST_${orderId}_${Date.now()}`;
        try {
            const payRequest = pg_sdk_node_1.StandardCheckoutPayRequest.builder()
                .merchantOrderId(txnId)
                .amount(amountInPaise)
                .redirectUrl(redirectUrl)
                .build();
            const response = await this.client.pay(payRequest);
            if (!response.redirectUrl) {
                throw new Error('PhonePe PG response missing redirectUrl.');
            }
            return response.redirectUrl;
        }
        catch (e) {
            console.error('[PhonePe SDK Pay Request Failed]', e);
            throw new common_1.BadRequestException(`PhonePe Pay Gateway Error: ${e.message}`);
        }
    }
    async checkTransactionStatus(txnId) {
        try {
            const response = await this.client.getOrderStatus(txnId);
            return response;
        }
        catch (e) {
            console.error('[PhonePe SDK Check Status Failed]', e);
            throw new common_1.BadRequestException(`PhonePe Status API Error: ${e.message}`);
        }
    }
    async processCallback(responsePayload) {
        const base64Body = responsePayload.response;
        if (!base64Body)
            throw new common_1.BadRequestException('Empty callback response.');
        const decodedStr = Buffer.from(base64Body, 'base64').toString('utf8');
        const decoded = JSON.parse(decodedStr);
        console.log('📬 [PhonePe Webhook Received]', decoded);
        if (decoded.success === true && decoded.code === 'PAYMENT_SUCCESS') {
            const txnId = decoded.data.merchantTransactionId;
            const amount = decoded.data.amount / 100;
            const parts = txnId.split('_');
            if (parts.length >= 3 && parts[1] === 'REST') {
                const orderId = parseInt(parts[2], 10);
                const order = await this.prisma.order.findUnique({
                    where: { id: orderId }
                });
                if (order && order.paymentStatus !== 'paid') {
                    const updatedOrder = await this.prisma.$transaction(async (tx) => {
                        await tx.payment.create({
                            data: {
                                orderId: order.id,
                                method: 'upi',
                                amount: amount,
                                status: 'completed',
                                transactionId: txnId
                            }
                        });
                        return tx.order.update({
                            where: { id: order.id },
                            data: {
                                paymentStatus: 'paid',
                                status: 'completed'
                            },
                            include: {
                                orderItems: { include: { menuItem: { include: { category: true } } } },
                                table: true
                            }
                        });
                    });
                    console.log(`✅ [PhonePe Webhook] Settle Order ${orderId} successfully.`);
                    const io = this.websocketGateway?.server;
                    if (io) {
                        io.to(`restaurant_${order.restaurantId}`).emit('order_payment_settled', updatedOrder);
                        io.to(`restaurant_${order.restaurantId}`).emit('order_updated');
                        io.to(`restaurant_${order.restaurantId}`).emit('table_updated');
                    }
                }
            }
        }
        return { status: 'acknowledged' };
    }
};
exports.PhonePeService = PhonePeService;
exports.PhonePeService = PhonePeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebsocketGateway])
], PhonePeService);
//# sourceMappingURL=phonepe.service.js.map