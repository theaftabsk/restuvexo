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
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
const getAdminKey = () => process.env.SUPER_ADMIN_KEY || "VexoSecretSuperAdminPasskey2026";
const checkAdminAuth = (req) => {
    const clientKey = req.headers['x-super-admin-key'] || req.query.adminKey;
    return clientKey === getAdminKey();
};
let SuperAdminService = class SuperAdminService {
    constructor(prisma, settingsService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
    }
    async getStats(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        try {
            const now = new Date();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOf7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const [totalRestaurants, newSignupsToday, newSignups7Days, allSettings, totalDemoRequests, pendingDemoRequests, totalOrders, totalUsers] = await Promise.all([
                this.prisma.restaurant.count(),
                this.prisma.restaurant.count({ where: { createdAt: { gte: startOfToday } } }),
                this.prisma.restaurant.count({ where: { createdAt: { gte: startOf7DaysAgo } } }),
                this.prisma.restaurantSetting.findMany({
                    select: {
                        subscriptionPlan: true,
                        subscriptionStatus: true,
                        trialEndsAt: true,
                        customPrice: true
                    }
                }),
                this.prisma.demoRequest.count(),
                this.prisma.demoRequest.count({ where: { status: 'pending' } }),
                this.prisma.order.count(),
                this.prisma.user.count({ where: { role: 'owner' } })
            ]);
            let trialActive = 0, trialExpired = 0, activePaid = 0, lifetime = 0, customActive = 0, suspended = 0;
            let totalMonthlyRevenue = 0;
            for (const s of allSettings) {
                if (s.subscriptionStatus === 'expired') {
                    suspended++;
                    continue;
                }
                if (s.subscriptionPlan === 'trial') {
                    if (s.trialEndsAt && new Date(s.trialEndsAt) > now) {
                        trialActive++;
                    }
                    else {
                        trialExpired++;
                    }
                }
                else if (s.subscriptionPlan === 'lifetime') {
                    lifetime++;
                }
                else if (s.subscriptionPlan === 'custom') {
                    customActive++;
                    totalMonthlyRevenue += parseFloat(String(s.customPrice || 0));
                }
                else {
                    activePaid++;
                    totalMonthlyRevenue += parseFloat(String(s.customPrice || 0));
                }
            }
            res.json({
                success: true,
                data: {
                    totalRestaurants,
                    newSignupsToday,
                    newSignups7Days,
                    totalOwners: totalUsers,
                    totalOrders,
                    totalDemoRequests,
                    pendingDemoRequests,
                    subscription: {
                        trialActive,
                        trialExpired,
                        activePaid,
                        lifetime,
                        customActive,
                        suspended
                    },
                    totalMonthlyRevenue
                }
            });
        }
        catch (err) {
            console.error('[Super Admin getStats Error]', err);
            res.status(500).json({ error: "Failed to fetch system stats." });
        }
    }
    ;
    async getRestaurants(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        try {
            const restaurants = await this.prisma.restaurant.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    settings: true,
                    users: {
                        where: { role: 'owner' },
                        select: { name: true, loginId: true }
                    },
                    _count: {
                        select: { orders: true, users: true }
                    }
                }
            });
            res.json({ success: true, data: restaurants });
        }
        catch (error) {
            console.error('[Super Admin getRestaurants Error]', error);
            res.status(500).json({ error: "Failed to fetch restaurants." });
        }
    }
    ;
    async getRestaurantById(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        const { id } = req.params;
        const restaurantId = parseInt(id, 10);
        if (isNaN(restaurantId))
            return res.status(400).json({ error: "Invalid Restaurant ID." });
        try {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId },
                include: {
                    settings: true,
                    users: {
                        select: { id: true, name: true, loginId: true, role: true, status: true, createdAt: true }
                    },
                    _count: {
                        select: { orders: true, menuItems: true, tables: true }
                    }
                }
            });
            if (!restaurant)
                return res.status(404).json({ error: "Restaurant not found." });
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const todayOrders = await this.prisma.order.count({
                where: { restaurantId, createdAt: { gte: startOfToday } }
            });
            res.json({ success: true, data: { ...restaurant, todayOrders } });
        }
        catch (error) {
            console.error('[Super Admin getRestaurantById Error]', error);
            res.status(500).json({ error: "Failed to fetch restaurant." });
        }
    }
    ;
    async updateRestaurantSettings(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        const { id } = req.params;
        const { qrOrderingEnabled, vexoAiEnabled, subscriptionPlan, subscriptionStatus, trialEndsAt, enabledFeatures, customPrice, customNotes } = req.body;
        const restaurantId = parseInt(id, 10);
        if (isNaN(restaurantId))
            return res.status(400).json({ error: "Invalid Restaurant ID." });
        try {
            const updatedSettings = await this.settingsService.updateRestaurantSettings(restaurantId, {
                qrOrderingEnabled: qrOrderingEnabled !== undefined ? qrOrderingEnabled === true : undefined,
                vexoAiEnabled: vexoAiEnabled !== undefined ? vexoAiEnabled === true : undefined,
                subscriptionPlan,
                subscriptionStatus,
                trialEndsAt,
                enabledFeatures,
                customPrice: customPrice !== undefined ? parseFloat(customPrice) : undefined,
                customNotes
            });
            res.json({ success: true, data: updatedSettings });
        }
        catch (error) {
            console.error('[Super Admin updateRestaurantSettings Error]', error);
            res.status(500).json({ error: "Failed to update settings." });
        }
    }
    ;
    async deleteRestaurant(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        const { id } = req.params;
        const restaurantId = parseInt(id, 10);
        if (isNaN(restaurantId))
            return res.status(400).json({ error: "Invalid Restaurant ID." });
        try {
            await this.prisma.restaurant.delete({ where: { id: restaurantId } });
            res.json({ success: true, message: "Restaurant permanently deleted." });
        }
        catch (error) {
            console.error('[Super Admin deleteRestaurant Error]', error);
            res.status(500).json({ error: "Failed to delete restaurant." });
        }
    }
    ;
    async getDemoRequests(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        try {
            const demoRequests = await this.prisma.demoRequest.findMany({
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: demoRequests });
        }
        catch (error) {
            console.error('[Super Admin getDemoRequests Error]', error);
            res.status(500).json({ error: "Failed to fetch demo requests." });
        }
    }
    ;
    async updateDemoRequest(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        const { id } = req.params;
        const demoId = parseInt(id, 10);
        if (isNaN(demoId))
            return res.status(400).json({ error: "Invalid Demo Request ID." });
        const { status, adminNote } = req.body;
        try {
            const updated = await this.prisma.demoRequest.update({
                where: { id: demoId },
                data: {
                    status: status || undefined,
                    adminNote: adminNote !== undefined ? adminNote : undefined
                }
            });
            res.json({ success: true, data: updated });
        }
        catch (error) {
            console.error('[Super Admin updateDemoRequest Error]', error);
            res.status(500).json({ error: "Failed to update demo request." });
        }
    }
    ;
    async deleteDemoRequest(req, res) {
        if (!checkAdminAuth(req))
            return res.status(401).json({ error: "Unauthorized Super Admin Access." });
        const { id } = req.params;
        const demoId = parseInt(id, 10);
        if (isNaN(demoId))
            return res.status(400).json({ error: "Invalid Demo Request ID." });
        try {
            await this.prisma.demoRequest.delete({ where: { id: demoId } });
            res.json({ success: true, message: "Demo request deleted." });
        }
        catch (error) {
            console.error('[Super Admin deleteDemoRequest Error]', error);
            res.status(500).json({ error: "Failed to delete demo request." });
        }
    }
    ;
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService])
], SuperAdminService);
//# sourceMappingURL=superAdmin.service.js.map