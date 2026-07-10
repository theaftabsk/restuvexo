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
exports.PhonePeController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../shared/auth.guard");
const phonepe_service_1 = require("./phonepe.service");
let PhonePeController = class PhonePeController {
    constructor(phonePeService) {
        this.phonePeService = phonePeService;
    }
    async initiate(res, body) {
        const { orderId, redirectUrl } = body;
        if (!orderId || !redirectUrl) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'orderId and redirectUrl are required.' });
        }
        try {
            const paymentUrl = await this.phonePeService.initiatePayment(orderId, redirectUrl);
            return res.json({ paymentUrl });
        }
        catch (e) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to initiate payment.' });
        }
    }
    async callback(res, body) {
        try {
            const result = await this.phonePeService.processCallback(body);
            return res.json(result);
        }
        catch (e) {
            console.error('[PhonePe Webhook Callback Error]', e);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: e.message || 'Webhook processing failed.' });
        }
    }
    async status(res, txnId) {
        if (!txnId) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'txnId is required.' });
        }
        try {
            const status = await this.phonePeService.checkTransactionStatus(txnId);
            return res.json(status);
        }
        catch (e) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to check status.' });
        }
    }
};
exports.PhonePeController = PhonePeController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PhonePeController.prototype, "initiate", null);
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PhonePeController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('status/:txnId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)('txnId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PhonePeController.prototype, "status", null);
exports.PhonePeController = PhonePeController = __decorate([
    (0, common_1.Controller)('api/payment/phonepe'),
    __metadata("design:paramtypes", [phonepe_service_1.PhonePeService])
], PhonePeController);
//# sourceMappingURL=phonepe.controller.js.map