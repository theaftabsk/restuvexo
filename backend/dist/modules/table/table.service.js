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
exports.TableService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const path = require("path");
const fs = require("fs");
const blacklistFilePath = path.join(__dirname, '../../blacklistedDevices.json');
const readBlacklist = () => {
    try {
        if (!fs.existsSync(blacklistFilePath))
            return {};
        return JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8'));
    }
    catch (e) {
        return {};
    }
};
const writeBlacklist = (blacklist) => {
    try {
        fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
    }
    catch (e) {
        console.error(e);
    }
};
let TableService = class TableService {
    constructor(prisma, settingsService, websocketGateway, dashboardService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.websocketGateway = websocketGateway;
        this.dashboardService = dashboardService;
    }
    async getTables(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        if (isNaN(restaurantId)) {
            return res.status(400).json({ error: "Invalid restaurant identity." });
        }
        try {
            let tables = await this.prisma.table.findMany({
                where: { restaurantId: restaurantId },
                orderBy: { tableNo: 'asc' }
            });
            if (!tables || !tables.length) {
                console.log(`🌱 Auto-seeding 6 default dining tables for restaurant ID ${restaurantId}...`);
                const tablesToSeed = [
                    { restaurantId, tableNo: "Table 1", qrCode: `qr_rest_${restaurantId}_1`, status: "free" },
                    { restaurantId, tableNo: "Table 2", qrCode: `qr_rest_${restaurantId}_2`, status: "free" },
                    { restaurantId, tableNo: "Table 3", qrCode: `qr_rest_${restaurantId}_3`, status: "free" },
                    { restaurantId, tableNo: "Table 4", qrCode: `qr_rest_${restaurantId}_4`, status: "free" },
                    { restaurantId, tableNo: "Table 5", qrCode: `qr_rest_${restaurantId}_5`, status: "free" },
                    { restaurantId, tableNo: "Table 6", qrCode: `qr_rest_${restaurantId}_6`, status: "free" }
                ];
                await this.prisma.table.createMany({
                    data: tablesToSeed
                });
                tables = await this.prisma.table.findMany({
                    where: { restaurantId: restaurantId },
                    orderBy: { tableNo: 'asc' }
                });
            }
            let hasMigrated = false;
            for (const table of tables) {
                if (!table.qrCode || !table.qrCode.startsWith('restuvexo-indian-bistro-premium-dining-')) {
                    const uniqueSalt = Math.random().toString(36).substr(2, 6) + Math.random().toString(36).substr(2, 6);
                    const tableSlug = table.tableNo.replace(/\s+/g, '-').toLowerCase();
                    const slug = `restuvexo-indian-bistro-premium-dining-${tableSlug}-${uniqueSalt}`;
                    await this.prisma.table.update({
                        where: { id: table.id },
                        data: { qrCode: slug }
                    });
                    hasMigrated = true;
                }
            }
            if (hasMigrated) {
                tables = await this.prisma.table.findMany({
                    where: { restaurantId: restaurantId },
                    orderBy: { tableNo: 'asc' }
                });
            }
            res.json(tables);
        }
        catch (error) {
            console.error('[Get Tables Error]', error);
            res.status(500).json({ error: "Failed to load tables." });
        }
    }
    ;
    async createTable(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const { tableNo, capacity, floor } = req.body;
        if (!tableNo)
            return res.status(400).json({ error: "Table name/number is required." });
        try {
            const uniqueSalt = Math.random().toString(36).substr(2, 6) + Math.random().toString(36).substr(2, 6);
            const tableSlug = tableNo.replace(/\s+/g, '-').toLowerCase();
            const qrCode = `restuvexo-indian-bistro-premium-dining-${tableSlug}-${uniqueSalt}`;
            const newTable = await this.prisma.table.create({
                data: {
                    restaurantId,
                    tableNo: String(tableNo).trim(),
                    capacity: capacity ? parseInt(capacity) : 4,
                    floor: floor ? String(floor).trim() : "Ground Floor",
                    qrCode,
                    status: "free"
                }
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', newTable);
            }
            res.json(newTable);
        }
        catch (e) {
            console.error('[Create Table Error]', e);
            res.status(500).json({ error: "Failed to create new table." });
        }
    }
    ;
    async updateTable(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const tableId = parseInt(req.params.id);
        const { tableNo, status, capacity, floor } = req.body;
        if (tableNo === undefined && status === undefined && capacity === undefined && floor === undefined) {
            return res.status(400).json({ error: "No fields provided to update." });
        }
        try {
            const table = await this.prisma.table.findUnique({ where: { id: tableId } });
            if (!table || table.restaurantId !== restaurantId) {
                return res.status(403).json({ error: "Unauthorized access." });
            }
            const updateData = {};
            if (tableNo !== undefined)
                updateData.tableNo = String(tableNo).trim();
            if (status !== undefined)
                updateData.status = status;
            if (capacity !== undefined)
                updateData.capacity = parseInt(capacity) || 4;
            if (floor !== undefined)
                updateData.floor = String(floor).trim();
            const updatedTable = await this.prisma.table.update({
                where: { id: tableId },
                data: updateData
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', updatedTable);
            }
            res.json(updatedTable);
        }
        catch (e) {
            console.error('[Update Table Error]', e);
            res.status(500).json({ error: "Failed to update table." });
        }
    }
    ;
    async deleteTable(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const tableId = parseInt(req.params.id);
        try {
            const table = await this.prisma.table.findUnique({ where: { id: tableId } });
            if (!table || table.restaurantId !== restaurantId) {
                return res.status(403).json({ error: "Unauthorized access." });
            }
            await this.prisma.table.delete({ where: { id: tableId } });
            res.json({ success: true, message: "Table deleted." });
        }
        catch (e) {
            console.error('[Delete Table Error]', e);
            res.status(500).json({ error: "Failed to delete table. Check if there are active orders linked to it." });
        }
    }
    ;
    async getActiveSessions(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const sessionFilePath = path.join(__dirname, '../guestSessions.json');
        try {
            if (!fs.existsSync(sessionFilePath))
                return res.json([]);
            const data = fs.readFileSync(sessionFilePath, 'utf8');
            const sessions = JSON.parse(data);
            const tables = await this.prisma.table.findMany({
                where: { restaurantId: restaurantId }
            });
            const tableIds = tables.map(t => t.id);
            const tableMap = {};
            tables.forEach(t => { tableMap[t.id] = t.tableNo; });
            const now = Date.now();
            const activeSessions = [];
            for (const [sid, sessVal] of Object.entries(sessions)) {
                const sess = sessVal;
                if (now - sess.updatedAt < 10 * 60 * 1000 && tableIds.includes(sess.tableId)) {
                    activeSessions.push({
                        sessionId: sess.sessionId,
                        deviceId: sess.deviceId || "unknown",
                        tableId: sess.tableId,
                        tableNo: tableMap[sess.tableId] || `Table #${sess.tableId}`,
                        deviceInfo: sess.deviceInfo,
                        customerName: sess.customerName || "Walk-in Guest",
                        customerPhone: sess.customerPhone || "N/A",
                        activeOrders: sess.activeOrders || [],
                        minutesAgo: Math.round((now - sess.updatedAt) / 60000),
                        createdAt: sess.createdAt
                    });
                }
            }
            res.json(activeSessions);
        }
        catch (error) {
            console.error('[Get Active Sessions Failed]', error);
            res.status(500).json({ error: "Failed to fetch active floor sessions." });
        }
    }
    ;
    async clearActiveSession(req, res) {
        const { sessionId } = req.params;
        const restaurantId = parseInt(req.user.restaurantId);
        const sessionFilePath = path.join(__dirname, '../guestSessions.json');
        try {
            if (!fs.existsSync(sessionFilePath)) {
                return res.status(404).json({ error: "No active floor sessions found." });
            }
            const data = fs.readFileSync(sessionFilePath, 'utf8');
            const sessions = JSON.parse(data);
            if (!sessions[sessionId]) {
                return res.status(404).json({ error: "Session not found or already expired." });
            }
            const session = sessions[sessionId];
            const table = await this.prisma.table.findUnique({
                where: { id: session.tableId }
            });
            if (!table || table.restaurantId !== restaurantId) {
                return res.status(403).json({ error: "Unauthorized access to this table session." });
            }
            delete sessions[sessionId];
            fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2), 'utf8');
            await this.prisma.table.update({
                where: { id: session.tableId },
                data: { status: "free" }
            });
            const io = this.websocketGateway?.server;
            if (io)
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', { id: session.tableId, status: 'free' });
            res.json({ message: `Successfully cleared Table ${table.tableNo} session and marked table as Free.` });
        }
        catch (error) {
            console.error('[Clear Session Failed]', error);
            res.status(500).json({ error: "Failed to clear table session." });
        }
    }
    ;
    async getSettings(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        try {
            const restSettings = await this.settingsService.getRestaurantSettings(restaurantId);
            res.json(restSettings);
        }
        catch (error) {
            console.error('[Get Settings Error]', error);
            res.status(500).json({ error: "Failed to get settings." });
        }
    }
    ;
    async updateSettings(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const { qrOrderingEnabled, customerTheme, sidebarTheme, sidebarQuickActions, sidebarStoreSwitch, sidebarCollapsible, sidebarHiddenItems, vexoAiEnabled, vexoAiNormalLimit, vexoAiApiLimit, subscriptionPlan, subscriptionStatus, trialEndsAt } = req.body;
        try {
            const updateData = {};
            if (qrOrderingEnabled !== undefined)
                updateData.qrOrderingEnabled = qrOrderingEnabled === true;
            if (customerTheme !== undefined)
                updateData.customerTheme = customerTheme;
            if (sidebarTheme !== undefined)
                updateData.sidebarTheme = sidebarTheme;
            if (sidebarQuickActions !== undefined)
                updateData.sidebarQuickActions = sidebarQuickActions === true;
            if (sidebarStoreSwitch !== undefined)
                updateData.sidebarStoreSwitch = sidebarStoreSwitch === true;
            if (sidebarCollapsible !== undefined)
                updateData.sidebarCollapsible = sidebarCollapsible === true;
            if (sidebarHiddenItems !== undefined) {
                updateData.sidebarHiddenItems = Array.isArray(sidebarHiddenItems) ? sidebarHiddenItems : [];
            }
            if (vexoAiEnabled !== undefined)
                updateData.vexoAiEnabled = vexoAiEnabled === true;
            if (vexoAiNormalLimit !== undefined)
                updateData.vexoAiNormalLimit = parseInt(vexoAiNormalLimit, 10);
            if (vexoAiApiLimit !== undefined)
                updateData.vexoAiApiLimit = parseInt(vexoAiApiLimit, 10);
            if (subscriptionPlan !== undefined)
                updateData.subscriptionPlan = subscriptionPlan;
            if (subscriptionStatus !== undefined)
                updateData.subscriptionStatus = subscriptionStatus;
            if (trialEndsAt !== undefined)
                updateData.trialEndsAt = trialEndsAt;
            const restSettings = await this.settingsService.updateRestaurantSettings(restaurantId, updateData);
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('settings_updated', restSettings);
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({
                success: true,
                ...restSettings
            });
        }
        catch (error) {
            console.error('[Update Settings Error]', error);
            res.status(500).json({ error: "Failed to update settings." });
        }
    }
    ;
    async blockDevice(req, res) {
        const { deviceId, deviceInfo, customerName, reason } = req.body;
        if (!deviceId)
            return res.status(400).json({ error: "Device ID required." });
        const blacklist = readBlacklist();
        blacklist[deviceId] = {
            deviceId,
            deviceInfo: deviceInfo || "Unknown Device",
            customerName: customerName || "Unknown",
            reason: reason || "Manually blocked by Waiter/Owner",
            blockedAt: Date.now()
        };
        writeBlacklist(blacklist);
        res.json({ success: true, message: "Device permanently blocked." });
    }
    ;
    async getBlacklistedDevices(req, res) {
        const blacklist = readBlacklist();
        res.json(Object.values(blacklist));
    }
    ;
    async unblockDevice(req, res) {
        const { deviceId } = req.params;
        const blacklist = readBlacklist();
        if (blacklist[deviceId]) {
            delete blacklist[deviceId];
            writeBlacklist(blacklist);
        }
        res.json({ success: true, message: "Device unblocked successfully." });
    }
    ;
    async getTableHistory(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        const tableId = parseInt(req.params.id);
        if (isNaN(tableId)) {
            return res.status(400).json({ error: "Invalid table ID." });
        }
        try {
            const table = await this.prisma.table.findFirst({
                where: { id: tableId, restaurantId }
            });
            if (!table)
                return res.status(404).json({ error: "Table not found." });
            const orders = await this.prisma.order.findMany({
                where: { tableId, restaurantId },
                include: {
                    orderItems: {
                        include: { menuItem: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 25
            });
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const todayOrders = orders.filter(o => new Date(o.createdAt) >= startOfToday && o.paymentStatus === 'paid');
            const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
            const todayTurnoverCount = todayOrders.length;
            const allPaidOrders = orders.filter(o => o.paymentStatus === 'paid');
            const lifetimeRevenue = allPaidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
            return res.json({
                table,
                todayRevenue,
                todayTurnoverCount,
                lifetimeRevenue,
                totalOrdersCount: orders.length,
                orders
            });
        }
        catch (error) {
            console.error('[Get Table History Error]', error);
            res.status(500).json({ error: "Failed to load table history." });
        }
    }
    ;
    async completeOnboardingSetup(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        if (isNaN(restaurantId)) {
            return res.status(400).json({ error: "Invalid restaurant identity." });
        }
        const { cuisineType, tableCount, currency, currencySymbol, taxRate, taxName, address, logoUrl } = req.body;
        const numTables = Math.min(Math.max(parseInt(tableCount) || 6, 1), 50);
        try {
            if (address || logoUrl) {
                await this.prisma.restaurant.update({
                    where: { id: restaurantId },
                    data: {
                        ...(address && { address: address.trim() }),
                        ...(logoUrl && { logoUrl: logoUrl.trim() })
                    }
                });
            }
            await this.prisma.restaurantSetting.upsert({
                where: { restaurantId },
                update: {
                    customerTheme: "sunset",
                    qrOrderingEnabled: true,
                    enabledFeatures: {
                        cuisineType: cuisineType || "multi",
                        currency: currency || "INR",
                        currencySymbol: currencySymbol || "₹",
                        taxRate: taxRate !== undefined ? Number(taxRate) : 5,
                        taxName: taxName || "GST"
                    }
                },
                create: {
                    restaurantId,
                    customerTheme: "sunset",
                    qrOrderingEnabled: true,
                    enabledFeatures: {
                        cuisineType: cuisineType || "multi",
                        currency: currency || "INR",
                        currencySymbol: currencySymbol || "₹",
                        taxRate: taxRate !== undefined ? Number(taxRate) : 5,
                        taxName: taxName || "GST"
                    }
                }
            });
            const existingTables = await this.prisma.table.findMany({
                where: { restaurantId }
            });
            if (existingTables.length < numTables) {
                const startIndex = existingTables.length + 1;
                const newTables = [];
                for (let i = startIndex; i <= numTables; i++) {
                    newTables.push({
                        restaurantId,
                        tableNo: `Table ${i}`,
                        qrCode: `qr_rest_${restaurantId}_${i}`,
                        capacity: 4,
                        floor: "Ground Floor",
                        status: "free"
                    });
                }
                await this.prisma.table.createMany({ data: newTables });
            }
            const existingCats = await this.prisma.category.findMany({ where: { restaurantId } });
            if (!existingCats.length) {
                await this.prisma.category.createMany({
                    data: [
                        { restaurantId, name: "Starters & Snacks" },
                        { restaurantId, name: "Main Course" },
                        { restaurantId, name: "Beverages & Drinks" },
                        { restaurantId, name: "Desserts & Sweets" }
                    ]
                });
            }
            const allTables = await this.prisma.table.findMany({
                where: { restaurantId },
                orderBy: { tableNo: 'asc' }
            });
            this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('tables_updated', {
                tables: allTables,
                timestamp: new Date().toISOString()
            });
            return res.status(200).json({
                success: true,
                message: "Restaurant setup initialized successfully!",
                tablesCount: allTables.length,
                tables: allTables
            });
        }
        catch (error) {
            console.error('[Onboarding Setup Error]', error);
            return res.status(500).json({ error: error.message || "Failed to initialize restaurant configuration." });
        }
    }
};
exports.TableService = TableService;
exports.TableService = TableService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService, websocket_gateway_1.WebsocketGateway, dashboard_service_1.DashboardService])
], TableService);
//# sourceMappingURL=table.service.js.map