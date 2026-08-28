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

    // 1. Bypass public auth, demo, and customer QR scan & menu browsing paths
    if (
      originalUrl.startsWith('/api/auth/owner/signup') ||
      originalUrl.startsWith('/api/auth/verify-otp') ||
      originalUrl.startsWith('/api/auth/login') ||
      originalUrl.startsWith('/api/auth/forgot-password') ||
      originalUrl.startsWith('/api/auth/reset-password') ||
      originalUrl.startsWith('/api/orders/generate-templink') ||
      originalUrl.startsWith('/api/order/generate-templink') ||
      originalUrl.startsWith('/api/orders/qr-menu') ||
      originalUrl.startsWith('/api/order/qr-menu') ||
      originalUrl.startsWith('/api/orders/qr-place') ||
      originalUrl.startsWith('/api/order/qr-place') ||
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

    // 4. Bypass Super Admin APIs
    if (originalUrl.startsWith('/api/super-admin')) {
      return true;
    }

    // 5. Resolve Restaurant ID
    const restaurantId = request.user ? request.user.restaurantId : null;
    if (!restaurantId) {
      return true;
    }

    try {
      // 6. Query Active SaaS Subscription
      const sub = await this.prisma.subscription.findUnique({
        where: { restaurantId },
        include: { plan: true }
      });

      // If no explicit subscription row exists, allow access (standard trial / onboarding)
      if (!sub) {
        return true;
      }

      // Check if suspended or cancelled
      if (['SUSPENDED', 'CANCELLED'].includes(sub.status as string)) {
        throw new HttpException({
          subscriptionError: "expired",
          message: "Your subscription has expired or was suspended. Please renew your plan in Settings to restore access."
        }, HttpStatus.PAYMENT_REQUIRED);
      }

      // Check period end
      if (sub.currentPeriodEnd && Date.now() > new Date(sub.currentPeriodEnd).getTime()) {
        const graceEnd = new Date(sub.currentPeriodEnd).getTime() + (sub.graceDays || 7) * 86400000;
        if (Date.now() > graceEnd) {
          throw new HttpException({
            subscriptionError: "expired",
            message: "Your subscription grace period has ended. Please renew to continue using the software."
          }, HttpStatus.PAYMENT_REQUIRED);
        }
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      return true; // Fail open to avoid blocking legitimate operations
    }
  }
}
