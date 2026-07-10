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
            originalUrl.startsWith('/api/demo') ||
            originalUrl.startsWith('/api/payment/phonepe/callback')) {
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
        let restaurantId = request.user ? request.user.restaurantId : null;
        if (!restaurantId) {
            if (originalUrl.startsWith('/api/orders/qr-menu/')) {
                const parts = originalUrl.split('/');
                const tableId = parseInt(parts[parts.length - 1], 10);
                if (tableId) {
                    const table = await this.prisma.table.findUnique({
                        where: { id: tableId },
                        select: { restaurantId: true }
                    });
                    if (table)
                        restaurantId = table.restaurantId;
                }
            }
            else if (originalUrl.startsWith('/api/orders/qr-place') || originalUrl.startsWith('/api/orders/generate-templink')) {
                const { qrCode } = request.body;
                if (qrCode) {
                    const table = await this.prisma.table.findFirst({
                        where: { qrCode: qrCode },
                        select: { restaurantId: true }
                    });
                    if (table)
                        restaurantId = table.restaurantId;
                }
            }
        }
        if (!restaurantId) {
            return true;
        }
        try {
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
                throw new common_1.HttpException({
                    subscriptionError: "expired",
                    message: "Your subscription or free trial has expired. Please select a plan in Settings to restore access."
                }, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            const hasFeature = (code) => {
                if (!sub)
                    return false;
                if (sub.plan.name === 'Enterprise')
                    return true;
                const hasBase = sub.plan.features.some(f => f.feature.code === code && f.enabled);
                const hasAddon = sub.addons.some(a => a.addon.feature?.code === code);
                return hasBase || hasAddon;
            };
            if (originalUrl.startsWith('/api/orders/qr-place') && !hasFeature('qr_ordering')) {
                throw new common_1.HttpException({
                    subscriptionError: "feature_locked",
                    message: "Customer QR Self-Ordering module is not enabled for your plan. Please upgrade."
                }, common_1.HttpStatus.FORBIDDEN);
            }
            if (originalUrl.startsWith('/api/orders/kds') && !hasFeature('kds')) {
                throw new common_1.HttpException({
                    subscriptionError: "feature_locked",
                    message: "Kitchen Display System (KDS) module is not enabled for your plan. Please upgrade."
                }, common_1.HttpStatus.FORBIDDEN);
            }
            if (originalUrl.startsWith('/api/inventory') && !hasFeature('inventory')) {
                throw new common_1.HttpException({
                    subscriptionError: "feature_locked",
                    message: "Inventory Management module is not enabled for your plan. Please upgrade."
                }, common_1.HttpStatus.FORBIDDEN);
            }
            if (originalUrl.startsWith('/api/dashboard/telemetry') && !hasFeature('advanced_analytics')) {
                throw new common_1.HttpException({
                    subscriptionError: "feature_locked",
                    message: "Analytics & Dynamic Report Generator is not enabled for your plan. Please upgrade."
                }, common_1.HttpStatus.FORBIDDEN);
            }
            return true;
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            throw new common_1.HttpException(err.message || 'Subscription validation failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
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