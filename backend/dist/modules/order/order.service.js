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
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const path = require("path");
const fs = require("fs");
const sessionFilePath = path.join(__dirname, '../../guestSessions.json');
const blacklistFilePath = path.join(__dirname, '../../blacklistedDevices.json');
const readSessions = () => {
    try {
        if (!fs.existsSync(sessionFilePath))
            return {};
        const data = fs.readFileSync(sessionFilePath, 'utf8');
        const sessions = JSON.parse(data);
        const now = Date.now();
        const cleanSessions = {};
        for (const [sid, sess] of Object.entries(sessions)) {
            const s = sess;
            if (now - s.updatedAt < 30 * 60 * 1000) {
                cleanSessions[sid] = s;
            }
        }
        return cleanSessions;
    }
    catch (e) {
        return {};
    }
};
const writeSessions = (sessions) => {
    try {
        fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2), 'utf8');
    }
    catch (e) {
        console.error(e);
    }
};
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
let OrderService = class OrderService {
    constructor(prisma, settingsService, websocketGateway, dashboardService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.websocketGateway = websocketGateway;
        this.dashboardService = dashboardService;
    }
    async generateTemplink(req, res) {
        const { qrCode, deviceId } = req.body;
        try {
            const table = await this.prisma.table.findFirst({
                where: { qrCode: qrCode }
            });
            if (!table)
                return res.status(404).json({ error: "Invalid or Unregistered Dining Table QR Code" });
            const token = `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const sessions = readSessions();
            sessions[token] = {
                sessionId: token,
                deviceId: deviceId || "unknown_device",
                tableId: table.id,
                deviceInfo: "Mobile Scanner",
                activeOrders: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            writeSessions(sessions);
            res.json({ url: `/customer/${table.id}?token=${token}` });
        }
        catch (error) {
            console.error('[Templink Gateway Error]', error);
            res.status(500).json({ error: "Failed to generate temporary link." });
        }
    }
    ;
    async createOrder(req, res) {
        const { tableId, orderType, items, discount, paymentStatus, paymentMethod, trackStock } = req.body;
        const restaurantId = req.user.restaurantId;
        const createdBy = req.user.id;
        if (!items || !items.length) {
            return res.status(400).json({ error: "Order items cannot be empty." });
        }
        try {
            const order = await this.prisma.$transaction(async (tx) => {
                let subtotal = 0;
                const orderItemsToCreate = [];
                for (const item of items) {
                    const menuItem = await tx.menuItem.findUnique({
                        where: { id: parseInt(item.menuItemId) }
                    });
                    if (!menuItem || menuItem.restaurantId !== restaurantId) {
                        throw new Error(`Menu item with ID ${item.menuItemId} not found.`);
                    }
                    const shouldTrackThisItem = menuItem.trackStock;
                    if (shouldTrackThisItem) {
                        if (menuItem.stockQty < item.qty) {
                            throw new Error(`Insufficient stock for item: ${menuItem.name}. Available: ${menuItem.stockQty}`);
                        }
                        await tx.menuItem.update({
                            where: { id: menuItem.id },
                            data: { stockQty: menuItem.stockQty - item.qty }
                        });
                    }
                    const priceNum = parseFloat(menuItem.price.toString());
                    const itemTotal = priceNum * item.qty;
                    subtotal += itemTotal;
                    orderItemsToCreate.push({
                        menuItemId: menuItem.id,
                        qty: item.qty,
                        price: menuItem.price,
                        costPrice: menuItem.costPrice,
                        note: item.note || ""
                    });
                }
                const discountAmount = discount ? parseFloat(discount) : 0;
                const totalAmount = subtotal - discountAmount;
                const totalCost = orderItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                const totalProfit = totalAmount - totalCost;
                const newOrder = await tx.order.create({
                    data: {
                        restaurantId: restaurantId,
                        createdBy: createdBy,
                        tableId: tableId ? parseInt(tableId) : null,
                        orderType: orderType || "dine_in",
                        paymentStatus: paymentStatus || "unpaid",
                        paymentMethod: paymentMethod || null,
                        status: "pending",
                        subtotal: subtotal,
                        discountApplied: discountAmount,
                        totalAmount: totalAmount,
                        totalCost: totalCost,
                        totalProfit: totalProfit,
                        orderItems: {
                            create: orderItemsToCreate
                        }
                    },
                    include: {
                        orderItems: {
                            include: {
                                menuItem: true
                            }
                        },
                        table: true,
                        creator: {
                            select: { name: true, role: true, loginId: true }
                        }
                    }
                });
                if (tableId) {
                    await tx.table.update({
                        where: { id: parseInt(tableId) },
                        data: { status: "occupied" }
                    });
                }
                return newOrder;
            });
            const formattedOrder = {
                ...order,
                creator: order.creator ? {
                    name: order.creator.name,
                    role: order.creator.role,
                    phone: order.creator.loginId
                } : null,
                total: parseFloat(order.totalAmount.toString()),
                discount: parseFloat(order.discountApplied.toString()),
                subtotal: parseFloat(order.subtotal.toString()),
                totalCost: parseFloat(order.totalCost.toString()),
                totalProfit: parseFloat(order.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.status(201).json({
                message: "Order placed successfully!",
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Create Order Transaction Failed]', error);
            res.status(400).json({ error: error.message || "Failed to save order. Try again." });
        }
    }
    ;
    async updateOrder(req, res) {
        const { id } = req.params;
        const { tableId, orderType, items, discount, paymentStatus, paymentMethod, trackStock } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!items || !items.length) {
            return res.status(400).json({ error: "Order items cannot be empty." });
        }
        try {
            const existingOrder = await this.prisma.order.findUnique({
                where: { id: parseInt(id) },
                include: { orderItems: { include: { menuItem: true } } }
            });
            if (!existingOrder || existingOrder.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const updatedOrder = await this.prisma.$transaction(async (tx) => {
                for (const oldItem of existingOrder.orderItems) {
                    if (oldItem.menuItem && oldItem.menuItem.trackStock) {
                        await tx.menuItem.update({
                            where: { id: oldItem.menuItem.id },
                            data: { stockQty: oldItem.menuItem.stockQty + oldItem.qty }
                        });
                    }
                }
                await tx.orderItem.deleteMany({
                    where: { orderId: existingOrder.id }
                });
                let subtotal = 0;
                const orderItemsToCreate = [];
                for (const item of items) {
                    const menuItem = await tx.menuItem.findUnique({
                        where: { id: parseInt(item.menuItemId) }
                    });
                    if (!menuItem || menuItem.restaurantId !== restaurantId) {
                        throw new Error(`Menu item with ID ${item.menuItemId} not found.`);
                    }
                    const shouldTrackThisItem = menuItem.trackStock;
                    if (shouldTrackThisItem) {
                        if (menuItem.stockQty < item.qty) {
                            throw new Error(`Insufficient stock for item: ${menuItem.name}. Available: ${menuItem.stockQty}`);
                        }
                        await tx.menuItem.update({
                            where: { id: menuItem.id },
                            data: { stockQty: menuItem.stockQty - item.qty }
                        });
                    }
                    const priceNum = parseFloat(menuItem.price.toString());
                    subtotal += priceNum * item.qty;
                    orderItemsToCreate.push({
                        menuItemId: menuItem.id,
                        qty: item.qty,
                        price: menuItem.price,
                        costPrice: menuItem.costPrice,
                        note: item.note || ""
                    });
                }
                const discountAmount = discount ? parseFloat(discount) : 0;
                const totalAmount = subtotal - discountAmount;
                const totalCost = orderItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                const totalProfit = totalAmount - totalCost;
                const order = await tx.order.update({
                    where: { id: existingOrder.id },
                    data: {
                        tableId: tableId ? parseInt(tableId) : null,
                        orderType: orderType || "dine_in",
                        paymentStatus: paymentStatus || "unpaid",
                        paymentMethod: paymentMethod || null,
                        subtotal: subtotal,
                        discountApplied: discountAmount,
                        totalAmount: totalAmount,
                        totalCost: totalCost,
                        totalProfit: totalProfit,
                        orderItems: {
                            create: orderItemsToCreate
                        }
                    },
                    include: {
                        orderItems: {
                            include: {
                                menuItem: true
                            }
                        },
                        table: true,
                        creator: {
                            select: { name: true, role: true, loginId: true }
                        }
                    }
                });
                return order;
            });
            const formattedOrder = {
                ...updatedOrder,
                creator: updatedOrder.creator ? {
                    name: updatedOrder.creator.name,
                    role: updatedOrder.creator.role,
                    phone: updatedOrder.creator.loginId
                } : null,
                total: parseFloat(updatedOrder.totalAmount.toString()),
                discount: parseFloat(updatedOrder.discountApplied.toString()),
                subtotal: parseFloat(updatedOrder.subtotal.toString()),
                totalCost: parseFloat(updatedOrder.totalCost.toString()),
                totalProfit: parseFloat(updatedOrder.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated', formattedOrder);
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({
                message: "Order updated successfully!",
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Update Order Failed]', error);
            res.status(400).json({ error: error.message || "Failed to update order. Try again." });
        }
    }
    ;
    async getOrders(req, res) {
        const restaurantId = req.user.restaurantId;
        const { status, paymentStatus, dateFilter, customDate, page = 1, limit = 20, qrApprovalOnly } = req.query;
        let dateWhere = {};
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        if (!dateFilter || dateFilter === 'today') {
            dateWhere = { createdAt: { gte: todayStart, lt: todayEnd } };
        }
        else if (dateFilter === 'yesterday') {
            const yStart = new Date(todayStart);
            yStart.setDate(todayStart.getDate() - 1);
            const yEnd = new Date(todayStart);
            dateWhere = { createdAt: { gte: yStart, lt: yEnd } };
        }
        else if (dateFilter === 'last7days') {
            const sevenAgo = new Date(todayStart);
            sevenAgo.setDate(todayStart.getDate() - 7);
            dateWhere = { createdAt: { gte: sevenAgo } };
        }
        else if (dateFilter === 'custom' && customDate) {
            const parts = customDate.split('-');
            if (parts.length === 3) {
                const cStart = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                const cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
                dateWhere = { createdAt: { gte: cStart, lt: cEnd } };
            }
        }
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {
            restaurantId,
            ...(status && {
                status: status.includes(',')
                    ? { in: status.split(',') }
                    : status
            }),
            ...(paymentStatus && { paymentStatus }),
            ...dateWhere
        };
        if (qrApprovalOnly === 'true') {
            whereClause.status = 'pending';
            whereClause.creator = { name: 'QR Customer' };
        }
        else {
            whereClause.NOT = {
                AND: [
                    { status: 'pending' },
                    { creator: { name: 'QR Customer' } }
                ]
            };
        }
        try {
            const [total, orders] = await Promise.all([
                this.prisma.order.count({ where: whereClause }),
                this.prisma.order.findMany({
                    where: whereClause,
                    include: {
                        orderItems: { include: { menuItem: { include: { category: true } } } },
                        table: true,
                        creator: { select: { name: true, role: true, loginId: true } }
                    },
                    orderBy: { id: 'desc' },
                    skip,
                    take: limitNum
                })
            ]);
            const formattedOrders = orders.map(order => ({
                ...order,
                creator: order.creator ? {
                    name: order.creator.name,
                    role: order.creator.role,
                    phone: order.creator.loginId
                } : null,
                total: parseFloat(order.totalAmount.toString()),
                discount: parseFloat(order.discountApplied.toString()),
                subtotal: parseFloat(order.subtotal.toString()),
                totalCost: parseFloat(order.totalCost.toString()),
                totalProfit: parseFloat(order.totalProfit.toString())
            }));
            res.json({
                data: formattedOrders,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            console.error('[Get Orders Error]', error);
            res.status(500).json({ error: "Failed to load orders list." });
        }
    }
    ;
    async updateOrderStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!['pending', 'cooking', 'ready', 'completed'].includes(status)) {
            return res.status(400).json({ error: "Invalid status value." });
        }
        try {
            const updatedOrder = await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: parseInt(id) }
                });
                if (!order || order.restaurantId !== restaurantId) {
                    throw new Error("Order parameters match failed.");
                }
                const result = await tx.order.update({
                    where: { id: order.id },
                    data: { status: status },
                    include: {
                        orderItems: {
                            include: {
                                menuItem: true
                            }
                        },
                        table: true,
                        creator: {
                            select: { name: true, role: true, loginId: true }
                        }
                    }
                });
                if (status === 'completed' && order.tableId) {
                    await tx.table.update({
                        where: { id: order.tableId },
                        data: { status: 'free' }
                    });
                    console.log(`✅ Table ${order.tableId} is freed automatically as order is completed`);
                }
                return result;
            });
            const formattedOrder = {
                ...updatedOrder,
                creator: updatedOrder.creator ? {
                    name: updatedOrder.creator.name,
                    role: updatedOrder.creator.role,
                    phone: updatedOrder.creator.loginId
                } : null,
                total: parseFloat(updatedOrder.totalAmount.toString()),
                discount: parseFloat(updatedOrder.discountApplied.toString()),
                subtotal: parseFloat(updatedOrder.subtotal.toString()),
                totalCost: parseFloat(updatedOrder.totalCost.toString()),
                totalProfit: parseFloat(updatedOrder.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_status_updated', formattedOrder);
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({
                message: `Order status updated to ${status.toUpperCase()} successfully.`,
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Update Order Status Error]', error);
            res.status(400).json({ error: error.message || "Failed to update order status." });
        }
    }
    ;
    async getQrMenu(req, res) {
        const { tableId } = req.params;
        const { sessionId, deviceInfo } = req.query;
        try {
            let table = null;
            const parsedId = parseInt(tableId);
            if (!isNaN(parsedId)) {
                table = await this.prisma.table.findUnique({
                    where: { id: parsedId }
                });
            }
            if (!table) {
                table = await this.prisma.table.findFirst({
                    where: { qrCode: tableId }
                });
            }
            if (!table) {
                return res.status(404).json({ error: "Dining Table not found." });
            }
            const restaurantId = table.restaurantId;
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId }
            });
            const restaurantName = restaurant ? restaurant.name : "RESTUVEXO Café & Diner";
            const categories = await this.prisma.category.findMany({
                where: { restaurantId: restaurantId }
            });
            const menuItems = await this.prisma.menuItem.findMany({
                where: {
                    restaurantId: restaurantId,
                    isAvailable: true
                },
                include: {
                    category: true
                }
            });
            let activeOrders = [];
            let sessionExpired = false;
            if (sessionId) {
                const sessions = readSessions();
                const existingSession = sessions[sessionId];
                const now = Date.now();
                if (existingSession) {
                    if (now - existingSession.updatedAt > 10 * 60 * 1000) {
                        sessionExpired = true;
                    }
                    else {
                        existingSession.updatedAt = now;
                        existingSession.tableId = table.id;
                        if (deviceInfo)
                            existingSession.deviceInfo = deviceInfo;
                        sessions[sessionId] = existingSession;
                        writeSessions(sessions);
                    }
                }
                else {
                    sessions[sessionId] = {
                        sessionId,
                        tableId: table.id,
                        deviceInfo: deviceInfo || "Unknown Device",
                        activeOrders: [],
                        createdAt: now,
                        updatedAt: now
                    };
                    writeSessions(sessions);
                }
                const session = sessions[sessionId];
                if (session.activeOrders && session.activeOrders.length && !sessionExpired) {
                    const dbOrders = await this.prisma.order.findMany({
                        where: {
                            id: { in: session.activeOrders },
                            restaurantId: restaurantId
                        },
                        include: {
                            orderItems: {
                                include: {
                                    menuItem: true
                                }
                            }
                        }
                    });
                    activeOrders = dbOrders.map(o => ({
                        ...o,
                        totalAmount: parseFloat(o.totalAmount.toString()),
                        discountApplied: parseFloat(o.discountApplied.toString()),
                        subtotal: parseFloat(o.subtotal.toString()),
                        totalCost: parseFloat(o.totalCost.toString()),
                        totalProfit: parseFloat(o.totalProfit.toString())
                    }));
                }
            }
            let qrOrderingEnabled = true;
            let customerTheme = 'sunset';
            try {
                const restSettings = await this.settingsService.getRestaurantSettings(restaurantId);
                if (restSettings) {
                    qrOrderingEnabled = restSettings.qrOrderingEnabled;
                    customerTheme = restSettings.customerTheme;
                }
            }
            catch (err) {
                console.error("Failed to read restaurant settings from cache/DB:", err);
            }
            res.json({ restaurantId, restaurantName, tableNo: table.tableNo, categories, menuItems, activeOrders, qrOrderingEnabled, customerTheme, sessionExpired });
        }
        catch (error) {
            console.error('[Get QR Menu Error]', error);
            res.status(500).json({ error: "Failed to fetch restaurant QR menu." });
        }
    }
    ;
    async createQrOrder(req, res) {
        const { tableId, items, sessionId, deviceInfo, customerName, customerPhone, deviceId } = req.body;
        if (!tableId || !items || !items.length) {
            return res.status(400).json({ error: "Table selection or cart items cannot be empty." });
        }
        try {
            let table = null;
            const parsedId = parseInt(tableId);
            if (!isNaN(parsedId)) {
                table = await this.prisma.table.findUnique({
                    where: { id: parsedId }
                });
            }
            if (!table) {
                table = await this.prisma.table.findFirst({
                    where: { qrCode: tableId }
                });
            }
            if (!table) {
                return res.status(404).json({ error: "Dining Table not found." });
            }
            const restaurantId = table.restaurantId;
            try {
                const restSettings = await this.settingsService.getRestaurantSettings(restaurantId);
                if (restSettings && restSettings.qrOrderingEnabled === false) {
                    return res.status(400).json({ error: "QR Self-Ordering is currently offline. Please contact the waiter to place your order." });
                }
            }
            catch (err) {
                console.error("Failed to read restaurant settings from cache/DB:", err);
            }
            if (deviceId) {
                const blacklist = readBlacklist();
                if (blacklist[deviceId]) {
                    return res.status(403).json({ error: "Access Denied: Your device has been permanently blocked by the restaurant." });
                }
                const sessions = readSessions();
                if (sessionId && sessions[sessionId]) {
                    let existingSession = sessions[sessionId];
                    const now = Date.now();
                    existingSession.orderTimestamps = existingSession.orderTimestamps || [];
                    existingSession.orderTimestamps = existingSession.orderTimestamps.filter(t => now - t < 3 * 60 * 1000);
                    if (existingSession.orderTimestamps.length >= 3) {
                        blacklist[deviceId] = {
                            deviceId,
                            deviceInfo: deviceInfo || "Unknown Mobile",
                            customerName: customerName || "Spammer",
                            reason: "Auto-banned: Spamming rapid orders.",
                            blockedAt: now
                        };
                        writeBlacklist(blacklist);
                        return res.status(403).json({ error: "Access Denied: Your device has been auto-blocked for rapid spamming." });
                    }
                }
            }
            const guestPhone = `QR-${restaurantId}`;
            let qrUser = await this.prisma.user.findUnique({
                where: { loginId: guestPhone }
            });
            if (!qrUser) {
                qrUser = await this.prisma.user.create({
                    data: {
                        restaurantId: restaurantId,
                        name: "QR Customer",
                        role: "waiter",
                        loginId: guestPhone,
                        passwordHash: "QR-GUEST-GIBBERISH-HASH",
                        pinHash: "QR-GUEST-PIN-HASH",
                        status: "active"
                    }
                });
            }
            const order = await this.prisma.$transaction(async (tx) => {
                let subtotal = 0;
                const orderItemsToCreate = [];
                for (const item of items) {
                    const menuItem = await tx.menuItem.findUnique({
                        where: { id: parseInt(item.menuItemId) }
                    });
                    if (!menuItem || menuItem.restaurantId !== restaurantId) {
                        throw new Error(`Menu item with ID ${item.menuItemId} not found.`);
                    }
                    const shouldTrackThisItem = menuItem.trackStock;
                    if (shouldTrackThisItem) {
                        if (menuItem.stockQty < item.qty) {
                            throw new Error(`Insufficient stock for item: ${menuItem.name}. Available: ${menuItem.stockQty}`);
                        }
                        await tx.menuItem.update({
                            where: { id: menuItem.id },
                            data: { stockQty: menuItem.stockQty - item.qty }
                        });
                    }
                    const priceNum = parseFloat(menuItem.price.toString());
                    const itemTotal = priceNum * item.qty;
                    subtotal += itemTotal;
                    orderItemsToCreate.push({
                        menuItemId: menuItem.id,
                        qty: item.qty,
                        price: menuItem.price,
                        costPrice: menuItem.costPrice,
                        note: item.note || ""
                    });
                }
                const totalAmount = subtotal;
                const totalCost = orderItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                const totalProfit = totalAmount - totalCost;
                const newOrder = await tx.order.create({
                    data: {
                        restaurantId: restaurantId,
                        createdBy: qrUser.id,
                        tableId: table.id,
                        orderType: "dine_in",
                        paymentStatus: "unpaid",
                        status: "pending",
                        subtotal: subtotal,
                        discountApplied: 0,
                        totalAmount: totalAmount,
                        totalCost: totalCost,
                        totalProfit: totalProfit,
                        approvedBy: "QR Code - Pending Approval",
                        orderItems: {
                            create: orderItemsToCreate
                        }
                    },
                    include: {
                        orderItems: {
                            include: {
                                menuItem: true
                            }
                        },
                        table: true,
                        creator: {
                            select: { name: true, role: true, loginId: true }
                        }
                    }
                });
                await tx.table.update({
                    where: { id: table.id },
                    data: { status: "occupied" }
                });
                return newOrder;
            });
            const formattedOrder = {
                ...order,
                creator: order.creator ? {
                    name: order.creator.name,
                    role: order.creator.role,
                    phone: order.creator.loginId
                } : null,
                total: parseFloat(order.totalAmount.toString()),
                discount: parseFloat(order.discountApplied.toString()),
                subtotal: parseFloat(order.subtotal.toString()),
                totalCost: parseFloat(order.totalCost.toString()),
                totalProfit: parseFloat(order.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_qr_order_placed', formattedOrder);
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            if (sessionId) {
                const sessions = readSessions();
                const session = sessions[sessionId] || {
                    sessionId,
                    tableId: table.id,
                    deviceInfo: deviceInfo || "Unknown Device",
                    activeOrders: [],
                    createdAt: Date.now()
                };
                session.updatedAt = Date.now();
                session.tableId = table.id;
                if (customerName)
                    session.customerName = customerName;
                if (customerPhone)
                    session.customerPhone = customerPhone;
                if (!session.activeOrders)
                    session.activeOrders = [];
                if (!session.activeOrders.includes(formattedOrder.id)) {
                    session.activeOrders.push(formattedOrder.id);
                }
                session.orderTimestamps = session.orderTimestamps || [];
                session.orderTimestamps.push(Date.now());
                sessions[sessionId] = session;
                writeSessions(sessions);
            }
            res.status(201).json({
                message: "Your KOT has been submitted! Waiting for waiter approval...",
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Create QR Order Failed]', error);
            res.status(400).json({ error: error.message || "Failed to submit order. Try again." });
        }
    }
    ;
    async approveQrOrder(req, res) {
        const { id } = req.params;
        const staffId = req.user.id;
        const restaurantId = req.user.restaurantId;
        try {
            const existingOrder = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!existingOrder || existingOrder.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const approvedOrder = await this.prisma.order.update({
                where: { id: existingOrder.id },
                data: {
                    createdBy: staffId,
                    approvedBy: `QR Code - Approved by ${req.user.name}`
                },
                include: {
                    orderItems: {
                        include: {
                            menuItem: true
                        }
                    },
                    table: true,
                    creator: {
                        select: { name: true, role: true, loginId: true }
                    }
                }
            });
            const formattedOrder = {
                ...approvedOrder,
                creator: approvedOrder.creator ? {
                    name: approvedOrder.creator.name,
                    role: approvedOrder.creator.role,
                    phone: approvedOrder.creator.loginId
                } : null,
                total: parseFloat(approvedOrder.totalAmount.toString()),
                discount: parseFloat(approvedOrder.discountApplied.toString()),
                subtotal: parseFloat(approvedOrder.subtotal.toString()),
                totalCost: parseFloat(approvedOrder.totalCost.toString()),
                totalProfit: parseFloat(approvedOrder.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('qr_order_approved', formattedOrder.id);
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({
                message: "QR Order approved and dispatched to Kitchen!",
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Approve QR Order Failed]', error);
            res.status(400).json({ error: error.message || "Failed to approve KOT." });
        }
    }
    ;
    async settleOrder(req, res) {
        const { id } = req.params;
        const { paymentMethod } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
            return res.status(400).json({ error: "Invalid payment method. Choose cash, card, or upi." });
        }
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const updatedOrder = await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: "paid",
                    paymentMethod: paymentMethod
                },
                include: {
                    orderItems: {
                        include: {
                            menuItem: true
                        }
                    },
                    table: true,
                    creator: {
                        select: { name: true, role: true, loginId: true }
                    }
                }
            });
            const formattedOrder = {
                ...updatedOrder,
                creator: updatedOrder.creator ? {
                    name: updatedOrder.creator.name,
                    role: updatedOrder.creator.role,
                    phone: updatedOrder.creator.loginId
                } : null,
                total: parseFloat(updatedOrder.totalAmount.toString()),
                discount: parseFloat(updatedOrder.discountApplied.toString()),
                subtotal: parseFloat(updatedOrder.subtotal.toString()),
                totalCost: parseFloat(updatedOrder.totalCost.toString()),
                totalProfit: parseFloat(updatedOrder.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_payment_settled', formattedOrder);
            }
            res.json({
                message: "Order payment settled successfully!",
                order: formattedOrder
            });
        }
        catch (error) {
            console.error('[Settle Order Payment Failed]', error);
            res.status(400).json({ error: error.message || "Failed to settle payment." });
        }
    }
    ;
    async deleteOrder(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            if (order.paymentStatus === 'paid') {
                return res.status(400).json({ error: "Audit Protection: Paid/Settled orders cannot be deleted." });
            }
            await this.prisma.order.delete({
                where: { id: order.id }
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_deleted', { id: order.id });
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({ message: "Order permanently deleted from the database." });
        }
        catch (error) {
            console.error('[Delete Order Failed]', error);
            res.status(500).json({ error: "Failed to permanently delete order. Check active relations." });
        }
    }
    ;
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService, websocket_gateway_1.WebsocketGateway, dashboard_service_1.DashboardService])
], OrderService);
//# sourceMappingURL=order.service.js.map