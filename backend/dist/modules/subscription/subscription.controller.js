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
    async getStatus(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const status = await this.subscriptionService.getSubscriptionStatus(restaurantId);
            return res.json(status);
        }
        catch (e) {
            console.error('[Subscription Status GET Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve subscription status.' });
        }
    }
    async purchaseAddon(req, res, body) {
        const restaurantId = req.user.restaurantId;
        const { addonCode, quantity } = body;
        if (!addonCode || !quantity || quantity < 1) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Invalid addon purchase payload.' });
        }
        try {
            const result = await this.subscriptionService.purchaseAddon(restaurantId, addonCode, quantity);
            return res.json(result);
        }
        catch (e) {
            console.error('[Subscription Purchase Addon POST Error]', e);
            return res.status(e.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to purchase addon.' });
        }
    }
    async getInvoices(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const invoices = await this.subscriptionService.getInvoices(restaurantId);
            return res.json(invoices);
        }
        catch (e) {
            console.error('[Subscription Invoices GET Error]', e);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve billing invoices.' });
        }
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('purchase-addon'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "purchaseAddon", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getInvoices", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)('api/subscription'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], SubscriptionController);
//# sourceMappingURL=subscription.controller.js.map