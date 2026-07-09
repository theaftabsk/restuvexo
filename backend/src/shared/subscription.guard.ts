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
      const settings = await this.settingsService.getRestaurantSettings(restaurantId);

      // 5. Expired Subscription Check (Trial End Date Check)
      let isExpired = settings.subscriptionStatus === 'expired';

      if (settings.subscriptionPlan === 'trial' && settings.trialEndsAt) {
        const trialEnd = new Date(settings.trialEndsAt).getTime();
        if (Date.now() > trialEnd) {
          isExpired = true;
          if (settings.subscriptionStatus !== 'expired') {
            await this.settingsService.updateRestaurantSettings(restaurantId, { subscriptionStatus: 'expired' });
          }
        }
      }

      if (isExpired) {
        throw new HttpException({
          subscriptionError: "expired",
          message: "Your 7-Day Free Trial or subscription has expired. Please select a plan in Settings to restore access."
        }, HttpStatus.PAYMENT_REQUIRED);
      }

      // 6. Enforce Granular Custom Feature Locking
      const features = settings.enabledFeatures || {};

      // POS Billing
      if (features.posBilling === false && (originalUrl.startsWith('/api/orders') && !originalUrl.startsWith('/api/orders/qr-place') && !originalUrl.startsWith('/api/orders/qr-menu/'))) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "POS Billing module is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // Customer QR Self-Ordering
      if (features.qrOrdering === false && originalUrl.startsWith('/api/orders/qr-place')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Customer QR Self-Ordering is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // Kitchen Display System (KDS)
      if (features.kds === false && originalUrl.startsWith('/api/orders/kds')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Kitchen Display System (KDS) module is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // Inventory Management
      if (features.inventory === false && originalUrl.startsWith('/api/inventory')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Inventory Management module is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // VexoAI Virtual Assistant
      if (features.vexoAI === false && originalUrl.startsWith('/api/chatbot')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "VexoAI Virtual Assistant module is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // Staff Management (PINs / Accounts)
      if (features.staffManagement === false && originalUrl.startsWith('/api/auth/staff')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Staff Management module is not enabled for your account. Please contact support."
        }, HttpStatus.FORBIDDEN);
      }

      // Analytics & Dynamic Report Generator
      if (features.analytics === false && originalUrl.startsWith('/api/dashboard/telemetry')) {
        throw new HttpException({
          subscriptionError: "feature_locked",
          message: "Analytics & Dynamic Report Generator module is not enabled for your account. Please contact support."
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
