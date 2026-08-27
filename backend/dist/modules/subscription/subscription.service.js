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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const client_1 = require("@prisma/client");
let SubscriptionService = class SubscriptionService {
    getCashfreeConfig() {
        const isProd = (process.env.CASHFREE_ENV || '').trim().toLowerCase() === 'production';
        return {
            appId: process.env.CASHFREE_APP_ID || '',
            secret: process.env.CASHFREE_SECRET_KEY || '',
            env: isProd ? 'production' : 'sandbox',
            baseUrl: isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
        };
    }
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
    }
    async getPlans() {
        return this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
    }
    async getMySubscription(restaurantId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { restaurantId },
            include: {
                plan: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        if (!subscription) {
            const starter = await this.prisma.plan.findFirst({ where: { name: 'Starter' } });
            return {
                hasSubscription: false,
                recommendedPlan: starter
            };
        }
        const now = new Date();
        const dueDate = new Date(subscription.currentPeriodEnd);
        const msDiff = dueDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        return {
            hasSubscription: true,
            subscription: {
                ...subscription,
                daysRemaining,
                isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
                isInGrace: subscription.status === client_1.SubscriptionStatus.GRACE,
                isSuspended: subscription.status === client_1.SubscriptionStatus.SUSPENDED
            }
        };
    }
    async createCashfreeOrder(restaurantId, planId, isRenewal = false) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId }
        });
        if (!restaurant)
            throw new common_1.NotFoundException('Restaurant not found');
        let targetPlan;
        if (planId) {
            targetPlan = await this.prisma.plan.findUnique({ where: { id: planId } });
        }
        else {
            const currentSub = await this.prisma.subscription.findUnique({ where: { restaurantId }, include: { plan: true } });
            targetPlan = currentSub?.plan;
        }
        if (!targetPlan) {
            targetPlan = await this.prisma.plan.findFirst({ where: { name: 'Growth' } });
        }
        if (!targetPlan) {
            targetPlan = await this.prisma.plan.findFirst();
        }
        if (!targetPlan) {
            targetPlan = {
                id: 1,
                name: 'Growth',
                price: new client_1.Prisma.Decimal(999),
                firstMonthPrice: new client_1.Prisma.Decimal(1.00),
                billingDays: 30
            };
        }
        const existingSub = await this.prisma.subscription.findUnique({
            where: { restaurantId },
            include: { payments: true, plan: true }
        });
        const isFirstTime = !existingSub || existingSub.payments.length === 0;
        const isPlanSwitch = existingSub && existingSub.planId !== targetPlan.id;
        let orderAmount;
        if (isFirstTime && !isRenewal) {
            orderAmount = Number(targetPlan.firstMonthPrice || 1.00);
        }
        else if (isPlanSwitch) {
            orderAmount = Number(targetPlan.price);
        }
        else {
            orderAmount = Number(existingSub?.renewalAmount || targetPlan.price);
        }
        if (isNaN(orderAmount) || orderAmount < 1) {
            orderAmount = 1.00;
        }
        const orderId = `SUB_${restaurantId}_${Date.now()}`;
        const cfConfig = this.getCashfreeConfig();
        try {
            const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
            const cleanPhone = (restaurant.phone || '').replace(/[^0-9]/g, '');
            const validPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : '9876543210';
            const returnUrl = cfConfig.env === 'production' && frontendBase.startsWith('http://localhost')
                ? `https://app.restuvexo.shop/dashboard/subscription?cf_order_id={order_id}`
                : `${frontendBase}/dashboard/subscription?cf_order_id={order_id}`;
            const noteText = isFirstTime
                ? `RESTUVEXO ${targetPlan.name} Plan (₹1 First Month Launch Offer)`
                : isPlanSwitch
                    ? `RESTUVEXO Upgrade: ${existingSub?.plan?.name || 'Previous'} -> ${targetPlan.name} Tier`
                    : `RESTUVEXO ${targetPlan.name} Monthly Renewal`;
            const response = await fetch(`${cfConfig.baseUrl}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-client-id': cfConfig.appId,
                    'x-client-secret': cfConfig.secret
                },
                body: JSON.stringify({
                    order_id: orderId,
                    order_amount: orderAmount,
                    order_currency: 'INR',
                    customer_details: {
                        customer_id: `CUST_${restaurantId}`,
                        customer_name: restaurant.name || 'Restaurant Owner',
                        customer_email: restaurant.email || `owner_${restaurantId}@restuvexo.shop`,
                        customer_phone: validPhone
                    },
                    order_meta: {
                        return_url: returnUrl
                    },
                    order_note: noteText
                })
            });
            const cfData = await response.json();
            if (response.ok && cfData.payment_session_id) {
                return {
                    success: true,
                    orderId,
                    paymentSessionId: cfData.payment_session_id,
                    orderAmount,
                    planName: targetPlan.name,
                    isFirstTime,
                    environment: cfConfig.env
                };
            }
            else {
                console.error('[Cashfree Gateway Error]', cfData);
                const isSandboxOrMock = cfConfig.appId.includes('dummy') || cfConfig.appId.includes('TEST') || !cfConfig.appId;
                if (isSandboxOrMock) {
                    return {
                        success: true,
                        orderId,
                        paymentSessionId: `mock_session_${Date.now()}`,
                        orderAmount,
                        planName: targetPlan.name,
                        isFirstTime,
                        isMock: true,
                        environment: cfConfig.env
                    };
                }
                else {
                    return {
                        success: false,
                        error: cfData.message || cfData.error || 'Failed to create payment order on Cashfree.'
                    };
                }
            }
        }
        catch (error) {
            console.error('[Cashfree Gateway Exception]', error);
            return {
                success: false,
                error: error.message || 'Failed to connect to Cashfree payment gateway.'
            };
        }
    }
    async verifyCashfreePayment(restaurantId, orderId, planId) {
        if (!orderId) {
            return { success: false, error: 'Order ID is required.' };
        }
        const idempotencyKey = `CF_ORDER_${orderId}`;
        const cfConfig = this.getCashfreeConfig();
        const existingPayment = await this.prisma.saasPayment.findFirst({
            where: {
                OR: [
                    { gatewayEventId: idempotencyKey },
                    { cfOrderId: orderId }
                ]
            }
        });
        if (existingPayment && existingPayment.status === 'SUCCESS') {
            return { success: true, message: 'Payment already verified and active.' };
        }
        let cfPaymentId = null;
        let paymentMethod = 'UPI';
        let cfOrderStatus = 'UNKNOWN';
        let hasSuccessfulPayment = false;
        const isMock = (orderId.includes('mock') || !cfConfig.appId) && cfConfig.env !== 'production';
        if (isMock) {
            console.log(`[Cashfree Dev Mock Mode] Auto-approving dev order ${orderId}`);
            hasSuccessfulPayment = true;
            cfPaymentId = `mock_pay_${Date.now()}`;
            cfOrderStatus = 'PAID';
        }
        else {
            try {
                const orderRes = await fetch(`${cfConfig.baseUrl}/orders/${orderId}`, {
                    headers: {
                        'x-api-version': '2023-08-01',
                        'x-client-id': cfConfig.appId,
                        'x-client-secret': cfConfig.secret
                    }
                });
                if (!orderRes.ok) {
                    const errBody = await orderRes.json().catch(() => ({}));
                    console.error(`[Cashfree Order Lookup Failed] HTTP ${orderRes.status}:`, errBody);
                    return {
                        success: false,
                        error: errBody.message || `Cashfree order lookup failed with status ${orderRes.status}.`
                    };
                }
                const orderData = await orderRes.json();
                cfOrderStatus = orderData.order_status || 'UNKNOWN';
                console.log(`[Cashfree Verify] Order ${orderId} status: ${cfOrderStatus}`);
                if (cfOrderStatus !== 'PAID') {
                    return {
                        success: false,
                        error: `Payment not completed. Order status: ${cfOrderStatus}. Please complete the payment on Cashfree.`
                    };
                }
                const paymentsRes = await fetch(`${cfConfig.baseUrl}/orders/${orderId}/payments`, {
                    headers: {
                        'x-api-version': '2023-08-01',
                        'x-client-id': cfConfig.appId,
                        'x-client-secret': cfConfig.secret
                    }
                });
                if (paymentsRes.ok) {
                    const payments = await paymentsRes.json();
                    if (Array.isArray(payments) && payments.length > 0) {
                        const successPayment = payments.find((p) => p.payment_status === 'SUCCESS');
                        if (successPayment) {
                            hasSuccessfulPayment = true;
                            cfPaymentId = successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : null;
                            paymentMethod = successPayment.payment_group || successPayment.payment_method || 'UPI';
                        }
                    }
                }
                if (!hasSuccessfulPayment) {
                    return {
                        success: false,
                        error: 'No confirmed payment found for this order on Cashfree. Please complete checkout.'
                    };
                }
            }
            catch (e) {
                console.error('[Cashfree Verify Exception]', e.message);
                return {
                    success: false,
                    error: `Could not verify payment with Cashfree: ${e.message}`
                };
            }
        }
        let targetPlan;
        if (planId) {
            targetPlan = await this.prisma.plan.findUnique({ where: { id: planId } });
        }
        if (!targetPlan) {
            const sub = await this.prisma.subscription.findUnique({ where: { restaurantId }, include: { plan: true } });
            targetPlan = sub?.plan || await this.prisma.plan.findFirst({ where: { name: 'Growth' } });
        }
        if (!targetPlan) {
            targetPlan = await this.prisma.plan.findFirst();
        }
        if (!targetPlan) {
            targetPlan = {
                id: 1,
                name: 'Growth',
                price: new client_1.Prisma.Decimal(999),
                firstMonthPrice: new client_1.Prisma.Decimal(1.00),
                billingDays: 30
            };
        }
        const now = new Date();
        const existingSub = await this.prisma.subscription.findUnique({ where: { restaurantId } });
        let periodStart = now;
        let periodEnd;
        const billingDays = targetPlan.billingDays || 30;
        if (existingSub && existingSub.currentPeriodEnd) {
            const oldDue = new Date(existingSub.currentPeriodEnd);
            const baseDate = oldDue > now ? oldDue : now;
            periodEnd = new Date(baseDate.getTime() + billingDays * 24 * 60 * 60 * 1000);
        }
        else {
            periodEnd = new Date(now.getTime() + billingDays * 24 * 60 * 60 * 1000);
        }
        const isFirstTime = !existingSub;
        const isPlanSwitch = existingSub && existingSub.planId !== targetPlan.id;
        let paidAmount;
        if (isFirstTime) {
            paidAmount = Number(targetPlan.firstMonthPrice || 1.00);
        }
        else if (isPlanSwitch) {
            paidAmount = Number(targetPlan.price);
        }
        else {
            paidAmount = Number(existingSub?.renewalAmount || targetPlan.price);
        }
        if (isNaN(paidAmount) || paidAmount < 1) {
            paidAmount = 1.00;
        }
        const subscription = await this.prisma.subscription.upsert({
            where: { restaurantId },
            update: {
                planId: targetPlan.id,
                status: client_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                nextBillingAt: periodEnd,
                amount: new client_1.Prisma.Decimal(paidAmount),
                renewalAmount: new client_1.Prisma.Decimal(targetPlan.price || 999),
                graceDays: 7
            },
            create: {
                restaurantId,
                planId: targetPlan.id,
                status: client_1.SubscriptionStatus.ACTIVE,
                startedAt: now,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                nextBillingAt: periodEnd,
                amount: new client_1.Prisma.Decimal(paidAmount),
                renewalAmount: new client_1.Prisma.Decimal(targetPlan.price || 999),
                graceDays: 7,
                notes: 'Initial ₹1 activation via Cashfree'
            }
        });
        const paymentNote = isFirstTime
            ? '₹1 First Month Launch Offer via Cashfree'
            : isPlanSwitch
                ? `Tier Switch: Upgrade to ${targetPlan.name} Plan via Cashfree`
                : 'Monthly Recurring Renewal via Cashfree';
        await this.prisma.saasPayment.create({
            data: {
                restaurantId,
                subscriptionId: subscription.id,
                amount: new client_1.Prisma.Decimal(paidAmount),
                paymentMethod: paymentMethod.toUpperCase(),
                status: 'SUCCESS',
                transactionId: `TXN_${orderId}`,
                gateway: 'Cashfree',
                gatewayEventId: idempotencyKey,
                cfOrderId: orderId,
                cfPaymentId: cfPaymentId,
                notes: paymentNote
            }
        });
        await this.prisma.subscriptionEvent.create({
            data: {
                subscriptionId: subscription.id,
                action: isFirstTime ? 'INITIAL_ACTIVATION' : isPlanSwitch ? 'PLAN_UPGRADE' : 'RENEWAL_PAID',
                actor: 'Cashfree PG v2023-08-01',
                details: {
                    orderId,
                    cfPaymentId,
                    paymentMethod,
                    paidAmount,
                    previousPlanId: existingSub?.planId || null,
                    targetPlanId: targetPlan.id,
                    planName: targetPlan.name,
                    validUntil: periodEnd
                }
            }
        });
        this.websocketGateway?.server?.to(`restaurant_${restaurantId}`).emit('subscription_updated', {
            status: 'ACTIVE',
            planName: targetPlan.name,
            currentPeriodEnd: periodEnd
        });
        return {
            success: true,
            message: 'Subscription successfully activated!',
            subscription: {
                planName: targetPlan.name,
                status: 'ACTIVE',
                currentPeriodEnd: periodEnd,
                renewalAmount: targetPlan.price
            }
        };
    }
    async handleCashfreeWebhook(payload, signature, timestamp) {
        if (!payload || !payload.data) {
            return { status: 'IGNORED', message: 'No payload data.' };
        }
        const eventType = payload.type;
        const orderData = payload.data.order;
        const paymentData = payload.data.payment;
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' && orderData && orderData.order_id) {
            const orderId = orderData.order_id;
            const parts = orderId.split('_');
            const restaurantId = parseInt(parts[1]);
            if (restaurantId && !isNaN(restaurantId)) {
                await this.verifyCashfreePayment(restaurantId, orderId);
                return { status: 'PROCESSED', orderId };
            }
        }
        return { status: 'RECEIVED', type: eventType };
    }
    async getAdminSubscriptions(statusFilter = 'ALL', search = '', page = 1, limit = 50) {
        const pageNum = Math.max(1, page);
        const pageSize = Math.min(100, Math.max(1, limit));
        const where = {};
        if (statusFilter && statusFilter !== 'ALL') {
            where.status = statusFilter;
        }
        if (search) {
            where.restaurant = {
                name: { contains: search, mode: 'insensitive' }
            };
        }
        const [totalCount, subscriptions, allActive] = await Promise.all([
            this.prisma.subscription.count({ where }),
            this.prisma.subscription.findMany({
                where,
                include: {
                    restaurant: {
                        select: { id: true, name: true, phone: true, email: true, createdAt: true }
                    },
                    plan: true,
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { updatedAt: 'desc' },
                skip: (pageNum - 1) * pageSize,
                take: pageSize
            }),
            this.prisma.subscription.findMany({
                where: { status: client_1.SubscriptionStatus.ACTIVE },
                select: { renewalAmount: true }
            })
        ]);
        const mrr = allActive.reduce((sum, s) => sum + Number(s.renewalAmount || 0), 0);
        const [activeCount, graceCount, suspendedCount] = await Promise.all([
            this.prisma.subscription.count({ where: { status: client_1.SubscriptionStatus.ACTIVE } }),
            this.prisma.subscription.count({ where: { status: client_1.SubscriptionStatus.GRACE } }),
            this.prisma.subscription.count({ where: { status: client_1.SubscriptionStatus.SUSPENDED } })
        ]);
        return {
            data: subscriptions,
            stats: {
                totalSubscribed: activeCount + graceCount + suspendedCount,
                mrr,
                activeCount,
                graceCount,
                suspendedCount
            },
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(totalCount / pageSize)
            }
        };
    }
    async adminExtendSubscription(subscriptionId, days, reason, actor = 'Super Admin') {
        if (!days || days <= 0)
            throw new common_1.BadRequestException('Days must be a positive number');
        const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        const now = new Date();
        const currentEnd = new Date(sub.currentPeriodEnd);
        const baseDate = currentEnd > now ? currentEnd : now;
        const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        const updated = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                currentPeriodEnd: newEnd,
                nextBillingAt: newEnd,
                status: client_1.SubscriptionStatus.ACTIVE
            }
        });
        await this.prisma.subscriptionEvent.create({
            data: {
                subscriptionId,
                action: 'EXTEND',
                actor,
                notes: reason,
                details: { daysAdded: days, newEndDate: newEnd }
            }
        });
        this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
            status: 'ACTIVE',
            currentPeriodEnd: newEnd
        });
        return { success: true, message: `Subscription extended by ${days} days!`, newEndDate: newEnd };
    }
    async adminRecordPayment(subscriptionId, amount, paymentMethod, transactionId, notes, actor = 'Super Admin') {
        const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        const now = new Date();
        const currentEnd = new Date(sub.currentPeriodEnd);
        const baseDate = currentEnd > now ? currentEnd : now;
        const newEnd = new Date(baseDate.getTime() + (sub.plan.billingDays || 30) * 24 * 60 * 60 * 1000);
        const txnId = transactionId || `MANUAL_${Date.now()}`;
        await this.prisma.$transaction([
            this.prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    currentPeriodEnd: newEnd,
                    nextBillingAt: newEnd,
                    amount: new client_1.Prisma.Decimal(amount),
                    status: client_1.SubscriptionStatus.ACTIVE
                }
            }),
            this.prisma.saasPayment.create({
                data: {
                    restaurantId: sub.restaurantId,
                    subscriptionId,
                    amount: new client_1.Prisma.Decimal(amount),
                    paymentMethod: paymentMethod || 'Cash',
                    status: 'SUCCESS',
                    transactionId: txnId,
                    gateway: 'Manual',
                    notes: notes || 'Admin recorded offline payment'
                }
            }),
            this.prisma.subscriptionEvent.create({
                data: {
                    subscriptionId,
                    action: 'RECORD_PAYMENT',
                    actor,
                    notes,
                    details: { amount, paymentMethod, transactionId: txnId, newEndDate: newEnd }
                }
            })
        ]);
        this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
            status: 'ACTIVE',
            currentPeriodEnd: newEnd
        });
        return { success: true, message: 'Offline payment recorded and subscription renewed!', newEndDate: newEnd };
    }
    async adminChangePlan(subscriptionId, newPlanId, customRenewalPrice, actor = 'Super Admin') {
        const newPlan = await this.prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan)
            throw new common_1.NotFoundException('Plan not found');
        const renewalAmount = customRenewalPrice !== undefined ? customRenewalPrice : Number(newPlan.price);
        const updated = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                planId: newPlanId,
                renewalAmount: new client_1.Prisma.Decimal(renewalAmount)
            }
        });
        await this.prisma.subscriptionEvent.create({
            data: {
                subscriptionId,
                action: 'CHANGE_PLAN',
                actor,
                details: { newPlanName: newPlan.name, newRenewalPrice: renewalAmount }
            }
        });
        return { success: true, message: `Plan changed to ${newPlan.name} (Renewal: ₹${renewalAmount})` };
    }
    async adminChangeStatus(subscriptionId, status, reason, actor = 'Super Admin') {
        const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        const updated = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status }
        });
        await this.prisma.subscriptionEvent.create({
            data: {
                subscriptionId,
                action: status,
                actor,
                notes: reason
            }
        });
        this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
            status
        });
        return { success: true, message: `Subscription status updated to ${status}` };
    }
    async processDailyCron() {
        const now = new Date();
        console.log(`[Subscription Cron] Running daily check at ${now.toISOString()}`);
        const expiredActive = await this.prisma.subscription.findMany({
            where: {
                status: client_1.SubscriptionStatus.ACTIVE,
                currentPeriodEnd: { lt: now }
            }
        });
        for (const sub of expiredActive) {
            await this.prisma.subscription.update({
                where: { id: sub.id },
                data: { status: client_1.SubscriptionStatus.GRACE }
            });
            await this.prisma.subscriptionEvent.create({
                data: {
                    subscriptionId: sub.id,
                    action: 'GRACE',
                    actor: 'System Cron',
                    notes: 'Current period expired, entered 7-day grace period'
                }
            });
            this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
                status: 'GRACE'
            });
        }
        const graceSubs = await this.prisma.subscription.findMany({
            where: { status: client_1.SubscriptionStatus.GRACE }
        });
        for (const sub of graceSubs) {
            const graceEnd = new Date(new Date(sub.currentPeriodEnd).getTime() + (sub.graceDays || 7) * 24 * 60 * 60 * 1000);
            if (now > graceEnd) {
                await this.prisma.subscription.update({
                    where: { id: sub.id },
                    data: { status: client_1.SubscriptionStatus.SUSPENDED }
                });
                await this.prisma.subscriptionEvent.create({
                    data: {
                        subscriptionId: sub.id,
                        action: 'SUSPENDED',
                        actor: 'System Cron',
                        notes: 'Grace period expired without payment'
                    }
                });
                this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
                    status: 'SUSPENDED'
                });
            }
        }
        return {
            success: true,
            processed: {
                movedToGrace: expiredActive.length,
                checkedGrace: graceSubs.length
            }
        };
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebsocketGateway])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map