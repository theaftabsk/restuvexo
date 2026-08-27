import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { SubscriptionStatus, Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private getCashfreeConfig() {
    const isProd = (process.env.CASHFREE_ENV || '').trim().toLowerCase() === 'production';
    return {
      appId: process.env.CASHFREE_APP_ID || '',
      secret: process.env.CASHFREE_SECRET_KEY || '',
      env: isProd ? 'production' : 'sandbox',
      baseUrl: isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
    };
  }

  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebsocketGateway
  ) {}

  // 1. Get All Active Public Plans
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
  }

  // 2. Get Restaurant's Current Subscription & History
  async getMySubscription(restaurantId: number) {
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
      // Default to Starter if unassigned
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
        isInGrace: subscription.status === SubscriptionStatus.GRACE,
        isSuspended: subscription.status === SubscriptionStatus.SUSPENDED
      }
    };
  }

  // 3. Create Cashfree Order for ₹1 First Month Promo or Full Renewal
  async createCashfreeOrder(restaurantId: number, planId?: number, isRenewal: boolean = false) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    let targetPlan: any;
    if (planId) {
      targetPlan = await this.prisma.plan.findUnique({ where: { id: planId } });
    } else {
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
        price: new Prisma.Decimal(999),
        firstMonthPrice: new Prisma.Decimal(1.00),
        billingDays: 30
      };
    }

    // Check if this is the first subscription for the restaurant or a tier upgrade
    const existingSub = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { payments: true, plan: true }
    });

    // 1-Time ₹1 Promo Eligibility Check:
    // Only eligible if restaurant.firstMonthPromoUsed === false AND no previous payments exist
    const promoEligible = !restaurant.firstMonthPromoUsed && (!existingSub || existingSub.payments.length === 0);
    const isFirstTime = promoEligible;
    const isPlanSwitch = existingSub && existingSub.planId !== targetPlan.id;

    // Price calculation:
    // 1. One-Time First-Month Launch Promo (if promo not used) = ₹1.00
    // 2. Plan Tier Switch / Upgrade = New Plan's Standard Price (e.g. ₹999)
    // 3. Regular Monthly Renewal = Target Plan's Standard Price (e.g. ₹999)
    let orderAmount: number;
    if (promoEligible && !isRenewal) {
      orderAmount = 1.00;
    } else if (isPlanSwitch) {
      orderAmount = Number(targetPlan.price || 999.00);
    } else {
      orderAmount = Number(existingSub?.renewalAmount || targetPlan.price || 999.00);
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

      // Cashfree Production requires HTTPS return_url
      const targetPath = (promoEligible && !isRenewal)
        ? `/onboarding?step=3&cf_order_id={order_id}`
        : `/dashboard/subscription?cf_order_id={order_id}`;

      const returnUrl = cfConfig.env === 'production' && frontendBase.startsWith('http://localhost')
        ? `https://app.restuvexo.shop${targetPath}`
        : `${frontendBase}${targetPath}`;

      const noteText = isFirstTime
        ? `RESTUVEXO ${targetPlan.name} Plan (₹1 First Month Launch Offer)`
        : isPlanSwitch
        ? `RESTUVEXO Upgrade: ${existingSub?.plan?.name || 'Previous'} -> ${targetPlan.name} Tier`
        : `RESTUVEXO ${targetPlan.name} Monthly Renewal`;

      // Create Order via Cashfree API
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
      } else {
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
        } else {
          return {
            success: false,
            error: cfData.message || cfData.error || 'Failed to create payment order on Cashfree.'
          };
        }
      }
    } catch (error: any) {
      console.error('[Cashfree Gateway Exception]', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to Cashfree payment gateway.'
      };
    }
  }

  // 4. Verify Cashfree Payment according to v2023-08-01 API
  async verifyCashfreePayment(restaurantId: number, orderId: string, planId?: number) {
    if (!orderId) {
      return { success: false, error: 'Order ID is required.' };
    }

    const idempotencyKey = `CF_ORDER_${orderId}`;
    const cfConfig = this.getCashfreeConfig();

    // Check if already processed
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

    let cfPaymentId: string | null = null;
    let paymentMethod = 'UPI';
    let cfOrderStatus = 'UNKNOWN';
    let hasSuccessfulPayment = false;

    // Strict Production Verification: Never auto-approve in production mode
    const isMock = (orderId.includes('mock') || !cfConfig.appId) && cfConfig.env !== 'production';

    if (isMock) {
      console.log(`[Cashfree Dev Mock Mode] Auto-approving dev order ${orderId}`);
      hasSuccessfulPayment = true;
      cfPaymentId = `mock_pay_${Date.now()}`;
      cfOrderStatus = 'PAID';
    } else {
      // Query live Cashfree API to confirm order is PAID
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

        // ONLY proceed if order is PAID
        if (cfOrderStatus !== 'PAID') {
          return {
            success: false,
            error: `Payment not completed. Order status: ${cfOrderStatus}. Please complete the payment on Cashfree.`
          };
        }

        // Fetch payment details for this order
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
            const successPayment = payments.find((p: any) => p.payment_status === 'SUCCESS');
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
      } catch (e: any) {
        console.error('[Cashfree Verify Exception]', e.message);
        return {
          success: false,
          error: `Could not verify payment with Cashfree: ${e.message}`
        };
      }
    }

    let targetPlan: any;
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
        price: new Prisma.Decimal(999),
        firstMonthPrice: new Prisma.Decimal(1.00),
        billingDays: 30
      };
    }

    const now = new Date();
    const existingSub = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { payments: true }
    });

    // Calculate new period: Maintain period continuity from old due date if late payment
    let periodStart = now;
    let periodEnd: Date;
    const billingDays = targetPlan.billingDays || 30;

    if (existingSub && existingSub.currentPeriodEnd) {
      const oldDue = new Date(existingSub.currentPeriodEnd);
      const baseDate = oldDue > now ? oldDue : now;
      periodEnd = new Date(baseDate.getTime() + billingDays * 24 * 60 * 60 * 1000);
    } else {
      periodEnd = new Date(now.getTime() + billingDays * 24 * 60 * 60 * 1000);
    }

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const promoEligible = restaurant && !restaurant.firstMonthPromoUsed && (!existingSub || existingSub.payments?.length === 0);
    const isFirstTime = promoEligible;
    const isPlanSwitch = existingSub && existingSub.planId !== targetPlan.id;
    
    let paidAmount: number;
    if (promoEligible) {
      paidAmount = 1.00;
    } else if (isPlanSwitch) {
      paidAmount = Number(targetPlan.price || 999.00);
    } else {
      paidAmount = Number(existingSub?.renewalAmount || targetPlan.price || 999.00);
    }

    if (isNaN(paidAmount) || paidAmount < 1) {
      paidAmount = 1.00;
    }

    // Upsert Subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { restaurantId },
      update: {
        planId: targetPlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
        amount: new Prisma.Decimal(paidAmount),
        renewalAmount: new Prisma.Decimal(targetPlan.price || 999.00),
        graceDays: 7
      },
      create: {
        restaurantId,
        planId: targetPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
        amount: new Prisma.Decimal(paidAmount),
        renewalAmount: new Prisma.Decimal(targetPlan.price || 999.00),
        graceDays: 7,
        notes: promoEligible ? 'Initial ₹1 launch offer activation via Cashfree' : 'Subscription activation via Cashfree'
      }
    });

    const paymentNote = promoEligible
      ? '₹1 First Month Launch Offer via Cashfree'
      : isPlanSwitch
      ? `Tier Switch: Upgrade to ${targetPlan.name} Plan via Cashfree`
      : 'Monthly Recurring Renewal via Cashfree';

    // Record Payment
    await this.prisma.saasPayment.create({
      data: {
        restaurantId,
        subscriptionId: subscription.id,
        amount: new Prisma.Decimal(paidAmount),
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

    // Mark firstMonthPromoUsed = true so this restaurant can NEVER claim ₹1 promo again!
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { firstMonthPromoUsed: true }
    });

    // Sync Restaurant Settings
    await this.prisma.restaurantSetting.upsert({
      where: { restaurantId },
      update: {
        subscriptionStatus: 'active',
        subscriptionPlan: targetPlan.name
      },
      create: {
        restaurantId,
        subscriptionStatus: 'active',
        subscriptionPlan: targetPlan.name
      }
    });

    // Log Audit Event
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

    // Broadcast live event over WebSocket
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

  // 4b. Cashfree Webhook Handler (v2023-08-01)
  async handleCashfreeWebhook(payload: any, signature?: string, timestamp?: string) {
    if (!payload || !payload.data) {
      return { status: 'IGNORED', message: 'No payload data.' };
    }

    const eventType = payload.type;
    const orderData = payload.data.order;
    const paymentData = payload.data.payment;

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' && orderData && orderData.order_id) {
      const orderId = orderData.order_id;
      // Extract restaurantId from order_id format (e.g. SUB_1_1787607631426)
      const parts = orderId.split('_');
      const restaurantId = parseInt(parts[1]);

      if (restaurantId && !isNaN(restaurantId)) {
        await this.verifyCashfreePayment(restaurantId, orderId);
        return { status: 'PROCESSED', orderId };
      }
    }

    return { status: 'RECEIVED', type: eventType };
  }

  // 5. Super Admin: List Subscriptions with MRR Telemetry
  async getAdminSubscriptions(statusFilter: string = 'ALL', search: string = '', page: number = 1, limit: number = 50) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));

    const where: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter as SubscriptionStatus;
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
        where: { status: SubscriptionStatus.ACTIVE },
        select: { renewalAmount: true }
      })
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = allActive.reduce((sum, s) => sum + Number(s.renewalAmount || 0), 0);

    const [activeCount, graceCount, suspendedCount] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.GRACE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.SUSPENDED } })
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

  // 6. Super Admin: Extend Subscription (Free Days)
  async adminExtendSubscription(subscriptionId: number, days: number, reason: string, actor: string = 'Super Admin') {
    if (!days || days <= 0) throw new BadRequestException('Days must be a positive number');

    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const now = new Date();
    const currentEnd = new Date(sub.currentPeriodEnd);
    const baseDate = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: newEnd,
        nextBillingAt: newEnd,
        status: SubscriptionStatus.ACTIVE
      }
    });

    // Log Audit Event
    await this.prisma.subscriptionEvent.create({
      data: {
        subscriptionId,
        action: 'EXTEND',
        actor,
        notes: reason,
        details: { daysAdded: days, newEndDate: newEnd }
      }
    });

    // WebSocket notify
    this.websocketGateway?.server?.to(`restaurant_${sub.restaurantId}`).emit('subscription_updated', {
      status: 'ACTIVE',
      currentPeriodEnd: newEnd
    });

    return { success: true, message: `Subscription extended by ${days} days!`, newEndDate: newEnd };
  }

  // 7. Super Admin: Record Offline / Manual Payment
  async adminRecordPayment(subscriptionId: number, amount: number, paymentMethod: string, transactionId: string, notes: string, actor: string = 'Super Admin') {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
    if (!sub) throw new NotFoundException('Subscription not found');

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
          amount: new Prisma.Decimal(amount),
          status: SubscriptionStatus.ACTIVE
        }
      }),
      this.prisma.saasPayment.create({
        data: {
          restaurantId: sub.restaurantId,
          subscriptionId,
          amount: new Prisma.Decimal(amount),
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

  // 8. Super Admin: Change Plan & Price Snapshot
  async adminChangePlan(subscriptionId: number, newPlanId: number, customRenewalPrice?: number, actor: string = 'Super Admin') {
    const newPlan = await this.prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new NotFoundException('Plan not found');

    const renewalAmount = customRenewalPrice !== undefined ? customRenewalPrice : Number(newPlan.price);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        renewalAmount: new Prisma.Decimal(renewalAmount)
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

  // 9. Super Admin: Suspend / Reactivate / Cancel
  async adminChangeStatus(subscriptionId: number, status: SubscriptionStatus, reason: string, actor: string = 'Super Admin') {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

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

  // 10. Daily Cron: Process Reminders & Expiration Transitions
  async processDailyCron() {
    const now = new Date();
    console.log(`[Subscription Cron] Running daily check at ${now.toISOString()}`);

    // A. Subscriptions where period ended and still ACTIVE -> Move to GRACE
    const expiredActive = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now }
      }
    });

    for (const sub of expiredActive) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.GRACE }
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

    // B. Subscriptions where grace period ended -> Move to SUSPENDED
    const graceSubs = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.GRACE }
    });

    for (const sub of graceSubs) {
      const graceEnd = new Date(new Date(sub.currentPeriodEnd).getTime() + (sub.graceDays || 7) * 24 * 60 * 60 * 1000);
      if (now > graceEnd) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.SUSPENDED }
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
}
