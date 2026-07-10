import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import * as crypto from 'crypto';

@Injectable()
export class PhonePeService {
  private readonly clientId = 'M23OOWJ17N2GQ_2604172032';
  private readonly clientSecret = 'OTUxNjcwZTktMDVkOC00NDA4LWI5OGMtNGEyYjMwMmFhMWMw';
  private readonly clientVersion = 1;
  private readonly merchantId = 'M23OOWJ17N2GQ';
  
  private client: StandardCheckoutClient;

  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebsocketGateway
  ) {
    // Initialize the official PhonePe SDK client
    this.client = StandardCheckoutClient.getInstance(
      this.clientId,
      this.clientSecret,
      this.clientVersion,
      Env.SANDBOX
    );
  }

  /**
   * Initiate PhonePe PG Payment Session using official SDK
   */
  async initiatePayment(orderId: number, redirectUrl: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new BadRequestException('Order not found.');
    if (order.paymentStatus === 'paid') throw new BadRequestException('Order is already paid.');

    const amountInPaise = Math.round(parseFloat(order.totalAmount.toString()) * 100);
    const txnId = `TXN_REST_${orderId}_${Date.now()}`;

    try {
      // Build request payload using official pay request builder
      const payRequest = StandardCheckoutPayRequest.builder()
        .merchantOrderId(txnId)
        .amount(amountInPaise)
        .redirectUrl(redirectUrl)
        .build();

      const response = await this.client.pay(payRequest);
      
      if (!response.redirectUrl) {
        throw new Error('PhonePe PG response missing redirectUrl.');
      }

      return response.redirectUrl;
    } catch (e) {
      console.error('[PhonePe SDK Pay Request Failed]', e);
      throw new BadRequestException(`PhonePe Pay Gateway Error: ${e.message}`);
    }
  }

  /**
   * Check status of a PhonePe transaction from backend using official SDK
   */
  async checkTransactionStatus(txnId: string): Promise<any> {
    try {
      const response = await this.client.getOrderStatus(txnId);
      return response;
    } catch (e) {
      console.error('[PhonePe SDK Check Status Failed]', e);
      throw new BadRequestException(`PhonePe Status API Error: ${e.message}`);
    }
  }

  /**
   * Process PhonePe webhook callback securely
   */
  async processCallback(responsePayload: { response: string }): Promise<any> {
    const base64Body = responsePayload.response;
    if (!base64Body) throw new BadRequestException('Empty callback response.');

    // Decode base64
    const decodedStr = Buffer.from(base64Body, 'base64').toString('utf8');
    const decoded = JSON.parse(decodedStr);

    console.log('📬 [PhonePe Webhook Received]', decoded);

    if (decoded.success === true && decoded.code === 'PAYMENT_SUCCESS') {
      const txnId = decoded.data.merchantTransactionId;
      const amount = decoded.data.amount / 100; // back to Rupees

      // Extract orderId from transactionId format: TXN_REST_{orderId}_{timestamp}
      const parts = txnId.split('_');
      if (parts.length >= 3 && parts[1] === 'REST') {
        const orderId = parseInt(parts[2], 10);
        
        // Settle order in database if not already paid
        const order = await this.prisma.order.findUnique({
          where: { id: orderId }
        });

        if (order && order.paymentStatus !== 'paid') {
          // Perform atomic transaction
          const updatedOrder = await this.prisma.$transaction(async (tx) => {
            // Create payment record
            await tx.payment.create({
              data: {
                orderId: order.id,
                method: 'upi',
                amount: amount,
                status: 'completed',
                transactionId: txnId
              }
            });

            // Update order status
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

          // Emit real-time WebSockets update to cashier dashboards
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
}
