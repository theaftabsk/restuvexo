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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../shared/auth.guard");
const subscription_service_1 = require("./subscription.service");
let SubscriptionController = class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }
    async getPlans(res) {
        try {
            const plans = await this.subscriptionService.getPlans();
            return res.json(plans);
        }
        catch (e) {
            console.error('[Get Plans Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve plans.' });
        }
    }
    async getMySubscription(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const data = await this.subscriptionService.getMySubscription(restaurantId);
            return res.json(data);
        }
        catch (e) {
            console.error('[Get My Subscription Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load subscription.' });
        }
    }
    async createCashfreeOrder(req, res, body) {
        const restaurantId = req.user.restaurantId;
        try {
            const result = await this.subscriptionService.createCashfreeOrder(restaurantId, body.planId, body.isRenewal);
            return res.json(result);
        }
        catch (e) {
            console.error('[Create Cashfree Order Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to create payment order.' });
        }
    }
    async verifyCashfreePayment(req, res, body) {
        const restaurantId = req.user.restaurantId;
        if (!body.orderId) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Order ID is required.' });
        }
        try {
            const result = await this.subscriptionService.verifyCashfreePayment(restaurantId, body.orderId, body.planId);
            return res.json(result);
        }
        catch (e) {
            console.error('[Verify Cashfree Payment Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Payment verification failed.' });
        }
    }
    async handleCashfreeWebhook(req, res, body) {
        try {
            const signature = req.headers['x-webhook-signature'];
            const timestamp = req.headers['x-webhook-timestamp'];
            const result = await this.subscriptionService.handleCashfreeWebhook(body, signature, timestamp);
            return res.status(common_1.HttpStatus.OK).json(result);
        }
        catch (e) {
            console.error('[Cashfree Webhook Error]', e);
            return res.status(common_1.HttpStatus.OK).json({ status: 'ERROR', message: e.message });
        }
    }
    async getAdminSubscriptions(status, search, page, limit, res) {
        try {
            const data = await this.subscriptionService.getAdminSubscriptions(status || 'ALL', search || '', parseInt(page) || 1, parseInt(limit) || 50);
            return res.json(data);
        }
        catch (e) {
            console.error('[Admin Subscriptions Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load admin subscriptions.' });
        }
    }
    async adminExtendSubscription(req, res, body) {
        try {
            const actor = req.user.name || 'Super Admin';
            const result = await this.subscriptionService.adminExtendSubscription(body.subscriptionId, body.days, body.reason, actor);
            return res.json(result);
        }
        catch (e) {
            console.error('[Admin Extend Error]', e);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to extend subscription.' });
        }
    }
    async adminRecordPayment(req, res, body) {
        try {
            const actor = req.user.name || 'Super Admin';
            const result = await this.subscriptionService.adminRecordPayment(body.subscriptionId, body.amount, body.paymentMethod, body.transactionId, body.notes, actor);
            return res.json(result);
        }
        catch (e) {
            console.error('[Admin Record Payment Error]', e);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to record payment.' });
        }
    }
    async adminChangePlan(req, res, body) {
        try {
            const actor = req.user.name || 'Super Admin';
            const result = await this.subscriptionService.adminChangePlan(body.subscriptionId, body.newPlanId, body.customRenewalPrice, actor);
            return res.json(result);
        }
        catch (e) {
            console.error('[Admin Change Plan Error]', e);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to change plan.' });
        }
    }
    async adminChangeStatus(req, res, body) {
        try {
            const actor = req.user.name || 'Super Admin';
            const result = await this.subscriptionService.adminChangeStatus(body.subscriptionId, body.status, body.reason, actor);
            return res.json(result);
        }
        catch (e) {
            console.error('[Admin Change Status Error]', e);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to update status.' });
        }
    }
    async runCron(res) {
        try {
            const result = await this.subscriptionService.processDailyCron();
            return res.json(result);
        }
        catch (e) {
            console.error('[Cron Execution Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Cron execution failed.' });
        }
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('plans'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getPlans", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Get)('my-subscription'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('cashfree/create-order'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createCashfreeOrder", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('cashfree/verify'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "verifyCashfreePayment", null);
__decorate([
    (0, common_1.Post)('cashfree/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "handleCashfreeWebhook", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Get)('admin/subscriptions'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getAdminSubscriptions", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('admin/extend'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminExtendSubscription", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('admin/record-payment'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminRecordPayment", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('admin/change-plan'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminChangePlan", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('admin/change-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminChangeStatus", null);
__decorate([
    (0, common_1.Post)('admin/run-cron'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "runCron", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)('api/subscription'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], SubscriptionController);
//# sourceMappingURL=subscription.controller.js.map