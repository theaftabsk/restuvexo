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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.cache = new Map();
    }
    async getRestaurantSettings(restaurantId) {
        if (this.cache.has(restaurantId)) {
            return this.cache.get(restaurantId);
        }
        let settings = await this.prisma.restaurantSetting.findUnique({
            where: { restaurantId }
        });
        if (!settings) {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId },
                select: { createdAt: true }
            });
            const trialStart = restaurant ? new Date(restaurant.createdAt) : new Date();
            const trialEndsAt = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            settings = await this.prisma.restaurantSetting.create({
                data: {
                    restaurantId,
                    qrOrderingEnabled: true,
                    customerTheme: 'sunset',
                    sidebarTheme: 'light',
                    sidebarQuickActions: true,
                    sidebarStoreSwitch: true,
                    sidebarCollapsible: true,
                    sidebarHiddenItems: [],
                    vexoAiEnabled: true,
                    vexoAiNormalLimit: 15,
                    vexoAiApiLimit: 5,
                    subscriptionPlan: 'trial',
                    subscriptionStatus: 'active',
                    trialEndsAt: trialEndsAt,
                    enabledFeatures: {
                        posBilling: true,
                        qrOrdering: true,
                        kds: true,
                        inventory: true,
                        vexoAI: true,
                        whatsappAPI: true,
                        staffManagement: true,
                        multiBranch: true,
                        analytics: true,
                        thermalPrinter: true
                    },
                    customPrice: 0.00,
                    customNotes: ""
                }
            });
        }
        else if (!settings.trialEndsAt && settings.subscriptionPlan === 'trial') {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId },
                select: { createdAt: true }
            });
            const trialStart = restaurant ? new Date(restaurant.createdAt) : new Date();
            const trialEndsAt = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            settings = await this.prisma.restaurantSetting.update({
                where: { restaurantId },
                data: { trialEndsAt }
            });
        }
        this.cache.set(restaurantId, settings);
        return settings;
    }
    async updateRestaurantSettings(restaurantId, updateData) {
        const settings = await this.prisma.restaurantSetting.upsert({
            where: { restaurantId },
            update: {
                qrOrderingEnabled: updateData.qrOrderingEnabled !== undefined ? updateData.qrOrderingEnabled === true : undefined,
                customerTheme: updateData.customerTheme || undefined,
                sidebarTheme: updateData.sidebarTheme || undefined,
                sidebarQuickActions: updateData.sidebarQuickActions !== undefined ? updateData.sidebarQuickActions === true : undefined,
                sidebarStoreSwitch: updateData.sidebarStoreSwitch !== undefined ? updateData.sidebarStoreSwitch === true : undefined,
                sidebarCollapsible: updateData.sidebarCollapsible !== undefined ? updateData.sidebarCollapsible === true : undefined,
                sidebarHiddenItems: Array.isArray(updateData.sidebarHiddenItems) ? updateData.sidebarHiddenItems : undefined,
                vexoAiEnabled: updateData.vexoAiEnabled !== undefined ? updateData.vexoAiEnabled === true : undefined,
                vexoAiNormalLimit: updateData.vexoAiNormalLimit !== undefined ? parseInt(updateData.vexoAiNormalLimit, 10) : undefined,
                vexoAiApiLimit: updateData.vexoAiApiLimit !== undefined ? parseInt(updateData.vexoAiApiLimit, 10) : undefined,
                subscriptionPlan: updateData.subscriptionPlan || undefined,
                subscriptionStatus: updateData.subscriptionStatus || undefined,
                trialEndsAt: updateData.trialEndsAt !== undefined ? (updateData.trialEndsAt ? new Date(updateData.trialEndsAt) : null) : undefined,
                enabledFeatures: updateData.enabledFeatures !== undefined ? updateData.enabledFeatures : undefined,
                customPrice: updateData.customPrice !== undefined ? updateData.customPrice : undefined,
                customNotes: updateData.customNotes !== undefined ? updateData.customNotes : undefined
            },
            create: {
                restaurantId,
                qrOrderingEnabled: updateData.qrOrderingEnabled !== undefined ? updateData.qrOrderingEnabled === true : true,
                customerTheme: updateData.customerTheme || 'sunset',
                sidebarTheme: updateData.sidebarTheme || 'light',
                sidebarQuickActions: updateData.sidebarQuickActions !== undefined ? updateData.sidebarQuickActions === true : true,
                sidebarStoreSwitch: updateData.sidebarStoreSwitch !== undefined ? updateData.sidebarStoreSwitch === true : true,
                sidebarCollapsible: updateData.sidebarCollapsible !== undefined ? updateData.sidebarCollapsible === true : true,
                sidebarHiddenItems: Array.isArray(updateData.sidebarHiddenItems) ? updateData.sidebarHiddenItems : [],
                vexoAiEnabled: updateData.vexoAiEnabled !== undefined ? updateData.vexoAiEnabled === true : true,
                vexoAiNormalLimit: updateData.vexoAiNormalLimit !== undefined ? parseInt(updateData.vexoAiNormalLimit, 10) : 15,
                vexoAiApiLimit: updateData.vexoAiApiLimit !== undefined ? parseInt(updateData.vexoAiApiLimit, 10) : 5,
                subscriptionPlan: updateData.subscriptionPlan || 'trial',
                subscriptionStatus: updateData.subscriptionStatus || 'active',
                trialEndsAt: updateData.trialEndsAt ? new Date(updateData.trialEndsAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                enabledFeatures: updateData.enabledFeatures || {
                    posBilling: true,
                    qrOrdering: true,
                    kds: true,
                    inventory: true,
                    vexoAI: true,
                    whatsappAPI: true,
                    staffManagement: true,
                    multiBranch: true,
                    analytics: true,
                    thermalPrinter: true
                },
                customPrice: updateData.customPrice !== undefined ? updateData.customPrice : 0.00,
                customNotes: updateData.customNotes || ""
            }
        });
        this.cache.set(restaurantId, settings);
        return settings;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map