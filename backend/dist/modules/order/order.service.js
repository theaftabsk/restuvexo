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
                    const activeSession = await tx.tableSession.findFirst({
                        where: { tableId: parseInt(tableId), closedAt: null }
                    });
                    if (!activeSession) {
                        await tx.tableSession.create({
                            data: { tableId: parseInt(tableId) }
                        });
                    }
                }
                await tx.orderLog.create({
                    data: {
                        orderId: newOrder.id,
                        action: "created",
                        newValue: `Order created via POS/Waiter by user ID ${createdBy} with subtotal ₹${subtotal}`,
                        userId: createdBy
                    }
                });
                await tx.kitchenTicket.create({
                    data: {
                        orderId: newOrder.id,
                        ticketNo: "KOT-1",
                        status: "pending",
                        items: {
                            create: orderItemsToCreate.map(item => ({
                                menuItemId: item.menuItemId,
                                qty: item.qty
                            }))
                        }
                    }
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
            const isEditingRestricted = existingOrder.status !== "pending";
            if (isEditingRestricted) {
                let isItemRemoved = false;
                for (const oldItem of existingOrder.orderItems) {
                    const newItem = items.find(i => parseInt(i.menuItemId) === oldItem.menuItemId);
                    if (!newItem || newItem.qty < oldItem.qty) {
                        isItemRemoved = true;
                        break;
                    }
                }
                if (isItemRemoved && !req.body.managerApproved) {
                    return res.status(400).json({ error: "Removing items from preparing/ready orders requires Manager PIN authorization." });
                }
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
                await tx.orderLog.create({
                    data: {
                        orderId: existingOrder.id,
                        action: "updated",
                        oldValue: `Subtotal: ₹${existingOrder.subtotal}, Discount: ₹${existingOrder.discountApplied}`,
                        newValue: `Subtotal: ₹${subtotal}, Discount: ₹${discountAmount}${req.body.managerApproved ? ' (Manager PIN Override Applied)' : ''}`,
                        userId: req.user.id
                    }
                });
                const kotItemsToCreate = [];
                for (const newItem of items) {
                    const oldItem = existingOrder.orderItems.find(oi => oi.menuItemId === parseInt(newItem.menuItemId));
                    if (!oldItem) {
                        kotItemsToCreate.push({
                            menuItemId: parseInt(newItem.menuItemId),
                            qty: newItem.qty
                        });
                    }
                    else if (newItem.qty > oldItem.qty) {
                        kotItemsToCreate.push({
                            menuItemId: parseInt(newItem.menuItemId),
                            qty: newItem.qty - oldItem.qty
                        });
                    }
                }
                if (kotItemsToCreate.length > 0) {
                    const ticketCount = await tx.kitchenTicket.count({
                        where: { orderId: existingOrder.id }
                    });
                    await tx.kitchenTicket.create({
                        data: {
                            orderId: existingOrder.id,
                            ticketNo: `KOT-${ticketCount + 1}`,
                            status: "pending",
                            items: {
                                create: kotItemsToCreate
                            }
                        }
                    });
                }
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
                const activeSession = await tx.tableSession.findFirst({
                    where: { tableId: table.id, closedAt: null }
                });
                if (!activeSession) {
                    await tx.tableSession.create({
                        data: { tableId: table.id }
                    });
                }
                await tx.orderLog.create({
                    data: {
                        orderId: newOrder.id,
                        action: "created",
                        newValue: `Order submitted by QR Customer on table ${table.tableNo} with subtotal ₹${subtotal}`,
                        userId: qrUser.id
                    }
                });
                await tx.kitchenTicket.create({
                    data: {
                        orderId: newOrder.id,
                        ticketNo: "KOT-1",
                        status: "pending",
                        items: {
                            create: orderItemsToCreate.map(item => ({
                                menuItemId: item.menuItemId,
                                qty: item.qty
                            }))
                        }
                    }
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
        const { paymentMethod, payments } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            if (order.paymentStatus === 'paid') {
                return res.status(400).json({ error: "Order is already paid/settled." });
            }
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const countPaidToday = await this.prisma.order.count({
                where: {
                    restaurantId,
                    paymentStatus: "paid",
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            });
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const seqStr = String(countPaidToday + 1).padStart(5, "0");
            const receiptNo = `INV-${dateStr}-${restaurantId}-${seqStr}-${order.id}`;
            const paymentsToCreate = [];
            if (payments && Array.isArray(payments) && payments.length > 0) {
                for (const p of payments) {
                    paymentsToCreate.push({
                        method: p.method,
                        amount: parseFloat(p.amount)
                    });
                }
            }
            else {
                if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
                    return res.status(400).json({ error: "Invalid payment method. Choose cash, card, or upi." });
                }
                paymentsToCreate.push({
                    method: paymentMethod,
                    amount: parseFloat(order.totalAmount.toString())
                });
            }
            const updatedOrder = await this.prisma.$transaction(async (tx) => {
                for (const pay of paymentsToCreate) {
                    await tx.payment.create({
                        data: {
                            orderId: order.id,
                            method: pay.method,
                            amount: pay.amount,
                            status: "completed"
                        }
                    });
                }
                await tx.orderLog.create({
                    data: {
                        orderId: order.id,
                        action: "payment",
                        newValue: `Payment settled for ₹${order.totalAmount} using methods: ${paymentsToCreate.map(p => `${p.method} (₹${p.amount})`).join(', ')}. Invoice: ${receiptNo}`,
                        userId: req.user.id
                    }
                });
                if (order.tableId) {
                    const otherActiveOrders = await tx.order.findMany({
                        where: {
                            tableId: order.tableId,
                            paymentStatus: "unpaid",
                            id: { not: order.id }
                        }
                    });
                    if (otherActiveOrders.length === 0) {
                        await tx.table.update({
                            where: { id: order.tableId },
                            data: { status: 'free' }
                        });
                        await tx.tableSession.updateMany({
                            where: { tableId: order.tableId, closedAt: null },
                            data: { closedAt: new Date() }
                        });
                    }
                }
                return await tx.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: "paid",
                        paymentMethod: paymentsToCreate[0].method,
                        receiptNo: receiptNo,
                        printCount: 1,
                        status: "completed"
                    },
                    include: {
                        orderItems: { include: { menuItem: true } },
                        table: true,
                        creator: { select: { name: true, role: true, loginId: true } }
                    }
                });
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
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
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
    async mergeOrders(req, res) {
        const { orderIds } = req.body;
        const restaurantId = req.user.restaurantId;
        const createdBy = req.user.id;
        if (!orderIds || orderIds.length < 2) {
            return res.status(400).json({ error: "Select at least two orders to merge." });
        }
        try {
            const parsedIds = orderIds.map((id) => parseInt(id));
            const orders = await this.prisma.order.findMany({
                where: { id: { in: parsedIds }, restaurantId },
                include: { orderItems: { include: { menuItem: true } } }
            });
            if (orders.length !== parsedIds.length) {
                return res.status(400).json({ error: "One or more orders not found or unauthorized." });
            }
            if (orders.some(o => o.paymentStatus === 'paid' || o.isMerged)) {
                return res.status(400).json({ error: "Cannot merge already settled or previously merged orders." });
            }
            const mergedOrder = await this.prisma.$transaction(async (tx) => {
                const itemMap = {};
                let firstTableId = null;
                let firstOrderType = 'dine_in';
                for (const order of orders) {
                    if (order.tableId && !firstTableId)
                        firstTableId = order.tableId;
                    if (order.orderType)
                        firstOrderType = order.orderType;
                    for (const item of order.orderItems) {
                        if (itemMap[item.menuItemId]) {
                            itemMap[item.menuItemId].qty += item.qty;
                            if (item.note) {
                                itemMap[item.menuItemId].note = itemMap[item.menuItemId].note
                                    ? `${itemMap[item.menuItemId].note}, ${item.note}`
                                    : item.note;
                            }
                        }
                        else {
                            itemMap[item.menuItemId] = {
                                qty: item.qty,
                                price: item.price,
                                costPrice: item.costPrice,
                                note: item.note || ""
                            };
                        }
                    }
                }
                const orderItemsToCreate = [];
                let subtotal = 0;
                for (const [menuItemId, data] of Object.entries(itemMap)) {
                    const priceNum = parseFloat(data.price.toString());
                    subtotal += priceNum * data.qty;
                    orderItemsToCreate.push({
                        menuItemId: parseInt(menuItemId),
                        qty: data.qty,
                        price: data.price,
                        costPrice: data.costPrice,
                        note: data.note
                    });
                }
                const totalAmount = subtotal;
                const totalCost = orderItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                const totalProfit = totalAmount - totalCost;
                const newOrder = await tx.order.create({
                    data: {
                        restaurantId,
                        createdBy,
                        tableId: firstTableId,
                        orderType: firstOrderType,
                        paymentStatus: "unpaid",
                        status: "pending",
                        subtotal,
                        discountApplied: 0,
                        totalAmount,
                        totalCost,
                        totalProfit,
                        approvedBy: `Merged order of IDs: ${parsedIds.join(', ')}`,
                        orderItems: {
                            create: orderItemsToCreate
                        }
                    },
                    include: {
                        orderItems: { include: { menuItem: true } },
                        table: true,
                        creator: { select: { name: true, role: true, loginId: true } }
                    }
                });
                await tx.order.updateMany({
                    where: { id: { in: parsedIds } },
                    data: {
                        isMerged: true,
                        mergedIntoId: newOrder.id,
                        status: "completed",
                        paymentStatus: "paid",
                        totalAmount: 0,
                        subtotal: 0
                    }
                });
                for (const orderId of parsedIds) {
                    await tx.orderLog.create({
                        data: {
                            orderId: orderId,
                            action: "merge",
                            newValue: `Order merged into parent Order #${newOrder.id}`,
                            userId: createdBy
                        }
                    });
                }
                await tx.orderLog.create({
                    data: {
                        orderId: newOrder.id,
                        action: "created",
                        newValue: `Merged order created from original orders: ${parsedIds.join(', ')}`,
                        userId: createdBy
                    }
                });
                return newOrder;
            });
            const formattedOrder = {
                ...mergedOrder,
                creator: mergedOrder.creator ? {
                    name: mergedOrder.creator.name,
                    role: mergedOrder.creator.role,
                    phone: mergedOrder.creator.loginId
                } : null,
                total: parseFloat(mergedOrder.totalAmount.toString()),
                discount: parseFloat(mergedOrder.discountApplied.toString()),
                subtotal: parseFloat(mergedOrder.subtotal.toString()),
                totalCost: parseFloat(mergedOrder.totalCost.toString()),
                totalProfit: parseFloat(mergedOrder.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.status(201).json({
                message: "Orders merged successfully!",
                order: formattedOrder
            });
        }
        catch (e) {
            console.error('[Merge Failed]', e);
            res.status(400).json({ error: e.message || "Failed to merge orders." });
        }
    }
    async splitOrder(req, res) {
        const { id } = req.params;
        const { items } = req.body;
        const restaurantId = req.user.restaurantId;
        const createdBy = req.user.id;
        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Select items to split off." });
        }
        try {
            const existingOrder = await this.prisma.order.findUnique({
                where: { id: parseInt(id) },
                include: { orderItems: { include: { menuItem: true } } }
            });
            if (!existingOrder || existingOrder.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            if (existingOrder.paymentStatus === 'paid') {
                return res.status(400).json({ error: "Cannot split settled orders." });
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const splitItemsToCreate = [];
                for (const item of items) {
                    const originalItem = existingOrder.orderItems.find(oi => oi.menuItemId === parseInt(item.menuItemId));
                    if (!originalItem) {
                        throw new Error(`Item ${item.menuItemId} is not in the original order.`);
                    }
                    if (originalItem.qty < item.qty) {
                        throw new Error(`Cannot split ${item.qty} qty. Original only has ${originalItem.qty}.`);
                    }
                    splitItemsToCreate.push({
                        menuItemId: originalItem.menuItemId,
                        qty: item.qty,
                        price: originalItem.price,
                        costPrice: originalItem.costPrice,
                        note: originalItem.note || ""
                    });
                    const remainingQty = originalItem.qty - item.qty;
                    if (remainingQty === 0) {
                        await tx.orderItem.delete({ where: { id: originalItem.id } });
                    }
                    else {
                        await tx.orderItem.update({
                            where: { id: originalItem.id },
                            data: { qty: remainingQty }
                        });
                    }
                }
                let splitSubtotal = 0;
                for (const item of splitItemsToCreate) {
                    splitSubtotal += parseFloat(item.price.toString()) * item.qty;
                }
                const splitTotal = splitSubtotal;
                const splitCost = splitItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                const splitProfit = splitTotal - splitCost;
                const childOrder = await tx.order.create({
                    data: {
                        restaurantId,
                        createdBy,
                        tableId: existingOrder.tableId,
                        orderType: existingOrder.orderType,
                        paymentStatus: "unpaid",
                        status: "pending",
                        subtotal: splitSubtotal,
                        discountApplied: 0,
                        totalAmount: splitTotal,
                        totalCost: splitCost,
                        totalProfit: splitProfit,
                        approvedBy: `Split off Order #${id}`,
                        parentOrderId: existingOrder.id,
                        orderItems: {
                            create: splitItemsToCreate
                        }
                    },
                    include: {
                        orderItems: { include: { menuItem: true } },
                        table: true,
                        creator: { select: { name: true, role: true, loginId: true } }
                    }
                });
                const remainingItems = await tx.orderItem.findMany({
                    where: { orderId: existingOrder.id }
                });
                if (remainingItems.length === 0) {
                    await tx.order.update({
                        where: { id: existingOrder.id },
                        data: {
                            subtotal: 0,
                            totalAmount: 0,
                            totalCost: 0,
                            totalProfit: 0,
                            status: "completed",
                            paymentStatus: "paid"
                        }
                    });
                }
                else {
                    const newSubtotal = remainingItems.reduce((sum, item) => sum + (parseFloat(item.price.toString()) * item.qty), 0);
                    const newTotal = newSubtotal - parseFloat(existingOrder.discountApplied.toString());
                    const newCost = remainingItems.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
                    const newProfit = newTotal - newCost;
                    await tx.order.update({
                        where: { id: existingOrder.id },
                        data: {
                            subtotal: newSubtotal,
                            totalAmount: Math.max(0, newTotal),
                            totalCost: newCost,
                            totalProfit: newProfit
                        }
                    });
                }
                await tx.orderLog.create({
                    data: {
                        orderId: existingOrder.id,
                        action: "split",
                        newValue: `Split items to new child Order #${childOrder.id}: ${items.map((i) => `item:${i.menuItemId} qty:${i.qty}`).join(', ')}`,
                        userId: createdBy
                    }
                });
                await tx.orderLog.create({
                    data: {
                        orderId: childOrder.id,
                        action: "created",
                        newValue: `Child order split off from parent Order #${existingOrder.id}`,
                        userId: createdBy
                    }
                });
                return childOrder;
            });
            const formattedOrder = {
                ...result,
                creator: result.creator ? {
                    name: result.creator.name,
                    role: result.creator.role,
                    phone: result.creator.loginId
                } : null,
                total: parseFloat(result.totalAmount.toString()),
                discount: parseFloat(result.discountApplied.toString()),
                subtotal: parseFloat(result.subtotal.toString()),
                totalCost: parseFloat(result.totalCost.toString()),
                totalProfit: parseFloat(result.totalProfit.toString())
            };
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.status(201).json({
                message: "Order split successfully!",
                order: formattedOrder
            });
        }
        catch (e) {
            console.error('[Split Failed]', e);
            res.status(400).json({ error: e.message || "Failed to split order." });
        }
    }
    async moveTable(req, res) {
        const { id } = req.params;
        const { targetTableId } = req.body;
        const restaurantId = req.user.restaurantId;
        const userId = req.user.id;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) },
                include: { table: true }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const previousTableId = order.tableId;
            const targetTable = await this.prisma.table.findUnique({
                where: { id: parseInt(targetTableId) }
            });
            if (!targetTable || targetTable.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Destination table not found." });
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const updated = await tx.order.update({
                    where: { id: order.id },
                    data: { tableId: targetTable.id },
                    include: { table: true }
                });
                await tx.orderLog.create({
                    data: {
                        orderId: order.id,
                        action: "table_move",
                        oldValue: order.table ? `Table: ${order.table.tableNo}` : "None",
                        newValue: `Table: ${targetTable.tableNo}`,
                        userId
                    }
                });
                if (previousTableId) {
                    const otherOrders = await tx.order.findMany({
                        where: {
                            tableId: previousTableId,
                            paymentStatus: "unpaid"
                        }
                    });
                    if (otherOrders.length === 0) {
                        await tx.table.update({
                            where: { id: previousTableId },
                            data: { status: 'free' }
                        });
                    }
                }
                await tx.table.update({
                    where: { id: targetTable.id },
                    data: { status: 'occupied' }
                });
                return updated;
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({
                message: "Order successfully relocated!",
                order: result
            });
        }
        catch (e) {
            console.error('[Move Table Failed]', e);
            res.status(400).json({ error: e.message || "Failed to relocate order." });
        }
    }
    async reprintOrder(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const updated = await this.prisma.order.update({
                where: { id: order.id },
                data: { printCount: order.printCount + 1 }
            });
            await this.prisma.orderLog.create({
                data: {
                    orderId: order.id,
                    action: "reprint",
                    newValue: `Receipt reprinted. Reprint count: ${updated.printCount}`,
                    userId: req.user.id
                }
            });
            res.json({ message: "Reprint logged.", printCount: updated.printCount });
        }
        catch (e) {
            res.status(400).json({ error: e.message || "Failed to reprint." });
        }
    }
    async applyDiscount(req, res) {
        const { id } = req.params;
        const { percentage, approvedBy, reason } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const percent = parseFloat(percentage);
            const discountAmount = parseFloat((parseFloat(order.subtotal.toString()) * (percent / 100)).toFixed(2));
            const newTotal = parseFloat((parseFloat(order.subtotal.toString()) - discountAmount).toFixed(2));
            const profit = newTotal - parseFloat(order.totalCost.toString());
            const result = await this.prisma.$transaction(async (tx) => {
                await tx.discount.upsert({
                    where: { orderId: order.id },
                    create: {
                        orderId: order.id,
                        percentage: percent,
                        amount: discountAmount,
                        approvedBy: approvedBy || "Manager",
                        reason: reason || "General Discount"
                    },
                    update: {
                        percentage: percent,
                        amount: discountAmount,
                        approvedBy: approvedBy || "Manager",
                        reason: reason || "General Discount"
                    }
                });
                const updated = await tx.order.update({
                    where: { id: order.id },
                    data: {
                        discountApplied: discountAmount,
                        totalAmount: newTotal,
                        totalProfit: profit
                    }
                });
                await tx.orderLog.create({
                    data: {
                        orderId: order.id,
                        action: "discount",
                        newValue: `Discount of ${percent}% (₹${discountAmount}) applied. Approved by: ${approvedBy || "Manager"}`,
                        userId: req.user.id
                    }
                });
                return updated;
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
            }
            res.json({ message: "Discount applied successfully.", order: result });
        }
        catch (e) {
            res.status(400).json({ error: e.message || "Failed to apply discount." });
        }
    }
    async assignWaiter(req, res) {
        const { id } = req.params;
        const { waiterId } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const waiter = await this.prisma.user.findUnique({
                where: { id: parseInt(waiterId) }
            });
            if (!waiter || waiter.restaurantId !== restaurantId) {
                return res.status(400).json({ error: "Waiter not found." });
            }
            const updated = await this.prisma.order.update({
                where: { id: order.id },
                data: { createdBy: waiter.id }
            });
            await this.prisma.orderLog.create({
                data: {
                    orderId: order.id,
                    action: "waiter_change",
                    newValue: `Assigned waiter changed to: ${waiter.name}`,
                    userId: req.user.id
                }
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
            }
            res.json({ message: "Waiter assigned successfully.", order: updated });
        }
        catch (e) {
            res.status(400).json({ error: e.message || "Failed to assign waiter." });
        }
    }
    async voidOrder(req, res) {
        const { id } = req.params;
        const { reason, approvedBy } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            if (order.paymentStatus === 'paid') {
                return res.status(400).json({ error: "Paid orders cannot be voided." });
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const updated = await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: "completed",
                        paymentStatus: "paid",
                        totalAmount: 0,
                        subtotal: 0,
                        discountApplied: 0,
                        totalProfit: 0
                    }
                });
                await tx.orderLog.create({
                    data: {
                        orderId: order.id,
                        action: "void",
                        newValue: `Order voided/cancelled. Reason: ${reason || "None"}. Approved by: ${approvedBy || "Manager"}`,
                        userId: req.user.id
                    }
                });
                if (order.tableId) {
                    const otherActiveOrders = await tx.order.findMany({
                        where: {
                            tableId: order.tableId,
                            paymentStatus: "unpaid",
                            id: { not: order.id }
                        }
                    });
                    if (otherActiveOrders.length === 0) {
                        await tx.table.update({
                            where: { id: order.tableId },
                            data: { status: 'free' }
                        });
                        await tx.tableSession.updateMany({
                            where: { tableId: order.tableId, closedAt: null },
                            data: { closedAt: new Date() }
                        });
                    }
                }
                return updated;
            });
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('order_updated');
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated');
                await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
            }
            res.json({ message: "Order voided successfully.", order: result });
        }
        catch (e) {
            res.status(400).json({ error: e.message || "Failed to void order." });
        }
    }
    async getOrderLogs(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: parseInt(id) }
            });
            if (!order || order.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Order not found." });
            }
            const logs = await this.prisma.orderLog.findMany({
                where: { orderId: order.id },
                orderBy: { createdAt: "asc" }
            });
            res.json({ logs });
        }
        catch (e) {
            res.status(400).json({ error: e.message || "Failed to retrieve logs." });
        }
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService, websocket_gateway_1.WebsocketGateway, dashboard_service_1.DashboardService])
], OrderService);
;
//# sourceMappingURL=order.service.js.map