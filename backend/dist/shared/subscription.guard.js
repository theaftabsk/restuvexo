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
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
const prisma_service_1 = require("../prisma/prisma.service");
let SubscriptionGuard = class SubscriptionGuard {
    constructor(settingsService, prisma) {
        this.settingsService = settingsService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const originalUrl = request.originalUrl || request.url;
        if (originalUrl.startsWith('/api/auth/owner/signup') ||
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
            originalUrl.startsWith('/api/demo')) {
            return true;
        }
        if (originalUrl === '/api/tables/settings' ||
            originalUrl.startsWith('/api/tables/settings?') ||
            originalUrl.startsWith('/api/tables/settings/')) {
            return true;
        }
        if (originalUrl.includes('/api/dashboard/sidebar-telemetry')) {
            return true;
        }
        if (originalUrl.startsWith('/api/super-admin')) {
            return true;
        }
        const restaurantId = request.user ? request.user.restaurantId : null;
        if (!restaurantId) {
            return true;
        }
        try {
            const sub = await this.prisma.subscription.findUnique({
                where: { restaurantId },
                include: { plan: true }
            });
            if (!sub) {
                return true;
            }
            if (['SUSPENDED', 'CANCELLED'].includes(sub.status)) {
                throw new common_1.HttpException({
                    subscriptionError: "expired",
                    message: "Your subscription has expired or was suspended. Please renew your plan in Settings to restore access."
                }, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            if (sub.currentPeriodEnd && Date.now() > new Date(sub.currentPeriodEnd).getTime()) {
                const graceEnd = new Date(sub.currentPeriodEnd).getTime() + (sub.graceDays || 7) * 86400000;
                if (Date.now() > graceEnd) {
                    throw new common_1.HttpException({
                        subscriptionError: "expired",
                        message: "Your subscription grace period has ended. Please renew to continue using the software."
                    }, common_1.HttpStatus.PAYMENT_REQUIRED);
                }
            }
            return true;
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            return true;
        }
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        prisma_service_1.PrismaService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map