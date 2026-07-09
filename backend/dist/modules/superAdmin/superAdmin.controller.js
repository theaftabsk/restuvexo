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
exports.SuperAdminController = void 0;
const common_1 = require("@nestjs/common");
const superAdmin_service_1 = require("./superAdmin.service");
let SuperAdminController = class SuperAdminController {
    constructor(superAdminService) {
        this.superAdminService = superAdminService;
    }
    async getStats(req, res) {
        return this.superAdminService.getStats(req, res);
    }
    async getRestaurants(req, res) {
        return this.superAdminService.getRestaurants(req, res);
    }
    async getRestaurantById(req, res) {
        return this.superAdminService.getRestaurantById(req, res);
    }
    async updateRestaurantSettings(req, res) {
        return this.superAdminService.updateRestaurantSettings(req, res);
    }
    async deleteRestaurant(req, res) {
        return this.superAdminService.deleteRestaurant(req, res);
    }
    async getDemoRequests(req, res) {
        return this.superAdminService.getDemoRequests(req, res);
    }
    async updateDemoRequest(req, res) {
        return this.superAdminService.updateDemoRequest(req, res);
    }
    async deleteDemoRequest(req, res) {
        return this.superAdminService.deleteDemoRequest(req, res);
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('restaurants'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getRestaurants", null);
__decorate([
    (0, common_1.Get)('restaurants/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getRestaurantById", null);
__decorate([
    (0, common_1.Put)('restaurants/:id/settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateRestaurantSettings", null);
__decorate([
    (0, common_1.Delete)('restaurants/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "deleteRestaurant", null);
__decorate([
    (0, common_1.Get)('demo-requests'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getDemoRequests", null);
__decorate([
    (0, common_1.Put)('demo-requests/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateDemoRequest", null);
__decorate([
    (0, common_1.Delete)('demo-requests/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "deleteDemoRequest", null);
exports.SuperAdminController = SuperAdminController = __decorate([
    (0, common_1.Controller)('api/super-admin'),
    __metadata("design:paramtypes", [superAdmin_service_1.SuperAdminService])
], SuperAdminController);
//# sourceMappingURL=superAdmin.controller.js.map