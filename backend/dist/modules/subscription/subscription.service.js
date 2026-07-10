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
let SubscriptionService = class SubscriptionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canUse(restaurantId, featureCode) {
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
        if (!sub || ['canceled', 'unpaid'].includes(sub.status))
            return false;
        if (sub.plan.name === 'Enterprise')
            return true;
        const hasBase = sub.plan.features.some((f) => f.feature.code === featureCode && f.enabled);
        const hasAddon = sub.addons.some((a) => a.addon.feature?.code === featureCode);
        return hasBase || hasAddon;
    }
    async trackUsage(restaurantId, metric, amount = 1) {
        const period = 'daily';
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
    async checkOrderLimit(restaurantId) {
        const sub = await this.prisma.restaurantSubscription.findUnique({
            where: { restaurantId },
            include: { plan: true }
        });
        if (!sub)
            return { allowed: false, warning: 'No active subscription found.' };
        if (sub.plan.name === 'Enterprise')
            return { allowed: true };
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
        const limit = sub.plan.maxDailyOrders || 30;
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
    async getSubscriptionStatus(restaurantId) {
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
    async purchaseAddon(restaurantId, addonCode, quantity) {
        const sub = await this.prisma.restaurantSubscription.findUnique({
            where: { restaurantId }
        });
        if (!sub)
            throw new common_1.BadRequestException('No subscription profile linked.');
        const addon = await this.prisma.addon.findUnique({
            where: { code: addonCode }
        });
        if (!addon)
            throw new common_1.BadRequestException(`Addon ${addonCode} not found in catalog.`);
        const subAddon = await this.prisma.subscriptionAddon.create({
            data: {
                subscriptionId: sub.id,
                addonId: addon.id,
                quantity: quantity
            }
        });
        if (addonCode === 'extra_staff') {
            await this.prisma.restaurantSubscription.update({
                where: { id: sub.id },
                data: { extraStaffCount: { increment: quantity } }
            });
        }
        else if (addonCode === 'extra_tables') {
            await this.prisma.restaurantSubscription.update({
                where: { id: sub.id },
                data: { extraTablesCount: { increment: quantity } }
            });
        }
        const unitPrice = parseFloat(addon.price.toString());
        const totalAmount = unitPrice * quantity;
        const tax = totalAmount * 0.18;
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
    async getInvoices(restaurantId) {
        const sub = await this.prisma.restaurantSubscription.findUnique({
            where: { restaurantId }
        });
        if (!sub)
            return [];
        return this.prisma.invoice.findMany({
            where: { subscriptionId: sub.id },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map