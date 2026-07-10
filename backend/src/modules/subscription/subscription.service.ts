import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a specific feature code is active for a restaurant.
   */
  async canUse(restaurantId: number, featureCode: string): Promise<boolean> {
    const sub = await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId },
      include: {
        plan: {
          include: {
            features: {
              include: { feature: true }
            }
          }
        },
        addons: {
          include: { addon: { include: { feature: true } } }
        }
      }
    });

    if (!sub || ['canceled', 'unpaid'].includes(sub.status)) return false;

    // Enterprise plan bypasses all feature locks
    if (sub.plan.name === 'Enterprise') return true;

    // Check plan features
    const hasBase = sub.plan.features.some(
      (f) => f.feature.code === featureCode && f.enabled
    );

    // Check purchased addons features
    const hasAddon = sub.addons.some(
      (a) => a.addon.feature?.code === featureCode
    );

    return hasBase || hasAddon;
  }

  /**
   * Track usage telemetry (e.g., daily orders, QR scans).
   */
  async trackUsage(restaurantId: number, metric: string, amount: number = 1): Promise<void> {
    const period = 'daily'; // Defaulting to daily tracking for POS orders
    await this.prisma.usageMetric.upsert({
      where: {
        restaurantId_metric_period: {
          restaurantId,
          metric,
          period
        }
      },
      update: {
        currentValue: { increment: amount },
        lastSyncedAt: new Date()
      },
      create: {
        restaurantId,
        metric,
        period,
        currentValue: amount
      }
    });
  }

  /**
   * Evaluate soft and hard daily order limits.
   */
  async checkOrderLimit(restaurantId: number): Promise<{ allowed: boolean; warning?: string }> {
    const sub = await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId },
      include: { plan: true }
    });

    if (!sub) return { allowed: false, warning: 'No active subscription found.' };
    if (sub.plan.name === 'Enterprise') return { allowed: true };

    const metricRecord = await this.prisma.usageMetric.findUnique({
      where: {
        restaurantId_metric_period: {
          restaurantId,
          metric: 'daily_orders',
          period: 'daily'
        }
      }
    });

    const currentCount = metricRecord?.currentValue ?? 0;
    const limit = sub.plan.maxDailyOrders || 30; // Default limit for Starter plan

    if (sub.plan.name === 'Starter') {
      if (currentCount >= limit) {
        return {
          allowed: false,
          warning: 'Hard quota reached: Daily limit (30) exceeded on Starter Plan. Upgrade to resume billing.'
        };
      }
      if (currentCount === limit - 3) {
        return {
          allowed: true,
          warning: 'Quota Warning: You have used 90% of your daily order limit. Please upgrade to Pro.'
        };
      }
      if (currentCount === limit - 1) {
        return {
          allowed: true,
          warning: 'Urgent: Only 1 order remaining in your daily quota. Upgrade now!'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Fetch complete subscription status, limits, and usage logs.
   */
  async getSubscriptionStatus(restaurantId: number): Promise<any> {
    const sub = await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId },
      include: {
        plan: {
          include: {
            features: {
              include: { feature: true }
            }
          }
        },
        addons: {
          include: { addon: true }
        }
      }
    });

    if (!sub) {
      return { status: 'inactive', message: 'No subscription record linked.' };
    }

    const usageMetrics = await this.prisma.usageMetric.findMany({
      where: { restaurantId }
    });

    const featuresCatalog = sub.plan.features.map(f => ({
      code: f.feature.code,
      name: f.feature.name,
      enabled: f.enabled
    }));

    sub.addons.forEach(a => {
      if (!featuresCatalog.some(f => f.code === a.addon.code)) {
        featuresCatalog.push({
          code: a.addon.code,
          name: a.addon.name,
          enabled: true
        });
      }
    });

    return {
      planName: sub.plan.name,
      status: sub.status,
      billingPeriod: sub.billingPeriod,
      startDate: sub.startDate,
      endDate: sub.endDate,
      trialStart: sub.trialStart,
      trialEnd: sub.trialEnd,
      extraTables: sub.extraTablesCount,
      extraStaff: sub.extraStaffCount,
      limits: {
        maxTables: sub.plan.maxTables + sub.extraTablesCount,
        maxStaff: sub.plan.maxStaff + sub.extraStaffCount,
        maxKds: sub.plan.maxKds
      },
      features: featuresCatalog,
      usage: usageMetrics.map(m => ({
        metric: m.metric,
        value: m.currentValue,
        period: m.period
      }))
    };
  }

  /**
   * Purchase seat-based or flat addons.
   */
  async purchaseAddon(restaurantId: number, addonCode: string, quantity: number): Promise<any> {
    const sub = await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId }
    });

    if (!sub) throw new BadRequestException('No subscription profile linked.');

    const addon = await this.prisma.addon.findUnique({
      where: { code: addonCode }
    });

    if (!addon) throw new BadRequestException(`Addon ${addonCode} not found in catalog.`);

    // 1. Log purchase addon record
    const subAddon = await this.prisma.subscriptionAddon.create({
      data: {
        subscriptionId: sub.id,
        addonId: addon.id,
        quantity: quantity
      }
    });

    // 2. Adjust subscription limits accordingly
    if (addonCode === 'extra_staff') {
      await this.prisma.restaurantSubscription.update({
        where: { id: sub.id },
        data: { extraStaffCount: { increment: quantity } }
      });
    } else if (addonCode === 'extra_tables') {
      await this.prisma.restaurantSubscription.update({
        where: { id: sub.id },
        data: { extraTablesCount: { increment: quantity } }
      });
    }

    // 3. Create Invoice audit log for billing records
    const unitPrice = parseFloat(addon.price.toString());
    const totalAmount = unitPrice * quantity;
    const tax = totalAmount * 0.18; // 18% standard VAT/Tax
    const grandTotal = totalAmount + tax;

    const invoiceNo = `INV-ADDON-${Date.now()}`;
    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId: sub.id,
        invoiceNo,
        subtotal: totalAmount,
        discount: 0.00,
        tax,
        total: grandTotal,
        status: 'paid',
        paidAt: new Date(),
        items: {
          create: [
            {
              description: `Purchased Addon: ${addon.name} x${quantity}`,
              quantity,
              unitPrice,
              totalAmount
            }
          ]
        }
      }
    });

    return {
      message: `Successfully purchased addon: ${addon.name}`,
      invoiceNo: invoice.invoiceNo,
      totalPaid: grandTotal
    };
  }

  /**
   * Get all invoice records for restaurant
   */
  async getInvoices(restaurantId: number): Promise<any[]> {
    const sub = await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId }
    });

    if (!sub) return [];

    return this.prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
