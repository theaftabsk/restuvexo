import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private settingsService: SettingsService,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const originalUrl = request.originalUrl || request.url;

    // 1. Bypass public auth and demo paths
    if (
      originalUrl.startsWith('/api/auth/owner/signup') ||
      originalUrl.startsWith('/api/auth/verify-otp') ||
      originalUrl.startsWith('/api/auth/login') ||
      originalUrl.startsWith('/api/auth/forgot-password') ||
      originalUrl.startsWith('/api/auth/reset-password') ||
      originalUrl.startsWith('/api/demo')
    ) {
      return true;
    }

    // 2. Bypass settings retrieval and updates (so users can always upgrade/view billing settings)
    if (
      originalUrl === '/api/tables/settings' ||
      originalUrl.startsWith('/api/tables/settings?') ||
      originalUrl.startsWith('/api/tables/settings/')
    ) {
      return true;
    }

    // 3. Bypass sidebar telemetry so the frontend dashboard can load subscription state
    if (originalUrl.includes('/api/dashboard/sidebar-telemetry')) {
      return true;
    }

    // Bypass Super Admin APIs
    if (originalUrl.startsWith('/api/super-admin')) {
      return true;
    }

    // 4. Resolve Restaurant ID
    let restaurantId = request.user ? request.user.restaurantId : null;

    if (!restaurantId) {
      // Resolve for guest checkout / scan paths
      if (originalUrl.startsWith('/api/orders/qr-menu/')) {
        const parts = originalUrl.split('/');
        const tableId = parseInt(parts[parts.length - 1], 10);
        if (tableId) {
          const table = await this.prisma.table.findUnique({
            where: { id: tableId },
            select: { restaurantId: true }
          });
          if (table) restaurantId = table.restaurantId;
        }
      } else if (originalUrl.startsWith('/api/orders/qr-place') || originalUrl.startsWith('/api/orders/generate-templink')) {
        const { qrCode } = request.body;
        if (qrCode) {
          const table = await this.prisma.table.findFirst({
            where: { qrCode: qrCode },
            select: { restaurantId: true }
          });
          if (table) restaurantId = table.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      return true;
    }

    try {
      // 5. Query Active Tenant Subscription with Features & Addons Catalog
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

      // 6. Expired Subscription Check (Trial End / Base End Date Check)
      let isExpired = !sub || ['canceled', 'unpaid'].includes(sub.status);

      if (sub && sub.status === 'trialing' && sub.trialEnd) {
        if (Date.now() > new Date(sub.trialEnd).getTime()) {
          isExpired = true;
          await this.prisma.restaurantSubscription.update({
            where: { id: sub.id },
            data: { status: 'canceled' }
          });
        }
      }

      if (sub && sub.status === 'active' && sub.endDate) {
        if (Date.now() > new Date(sub.endDate).getTime()) {
          isExpired = true;
          await this.prisma.restaurantSubscription.update({
            where: { id: sub.id },
            data: { status: 'canceled' }
          });
        }
      }

      if (isExpired) {
        throw new HttpException({
          subscriptionError: "expired",
          message: "Your subscription or free trial has expired. Please select a plan in Settings to restore access."
        }, HttpStatus.PAYMENT_REQUIRED);
      }

      // Helper function to check catalog features
      const hasFeature = (code: string) => {
        if (!sub) return false;
        // Enterprise plan bypasses all feature locks
        if (sub.plan.name === 'Enterprise') return true;
        
        const hasBase = sub.plan.features.some(f => f.feature.code === code && f.enabled);
        const hasAddon = sub.addons.some(a => a.addon.feature?.code === code);
        return hasBase || hasAddon;
      };

      // Customer QR Self-Ordering
      if (originalUrl.startsWith('/api/orders/qr-place') && !hasFeature('qr_ordering')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Customer QR Self-Ordering module is not enabled for your plan. Please upgrade."
        }, HttpStatus.FORBIDDEN);
      }

      // Kitchen Display System (KDS)
      if (originalUrl.startsWith('/api/orders/kds') && !hasFeature('kds')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Kitchen Display System (KDS) module is not enabled for your plan. Please upgrade."
        }, HttpStatus.FORBIDDEN);
      }

      // Inventory Management
      if (originalUrl.startsWith('/api/inventory') && !hasFeature('inventory')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Inventory Management module is not enabled for your plan. Please upgrade."
        }, HttpStatus.FORBIDDEN);
      }

      // Analytics & Dynamic Report Generator
      if (originalUrl.startsWith('/api/dashboard/telemetry') && !hasFeature('advanced_analytics')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Analytics & Dynamic Report Generator is not enabled for your plan. Please upgrade."
        }, HttpStatus.FORBIDDEN);
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message || 'Subscription validation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
