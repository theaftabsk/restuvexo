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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
let DashboardService = class DashboardService {
    constructor(prisma, settingsService, websocketGateway) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.websocketGateway = websocketGateway;
    }
    async getDashboardStats(req, res) {
        const restaurantId = req.user.restaurantId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        try {
            const [paidOrdersToday, activeOrdersCount, completedOrdersTodayCount, tables, recentKots, popularItemsRaw, allOrdersToday, outOfStockCount, lowStockCount, last7DaysOrdersRaw] = await Promise.all([
                this.prisma.order.findMany({
                    where: {
                        restaurantId,
                        paymentStatus: 'paid',
                        createdAt: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    },
                    select: {
                        totalAmount: true,
                        totalCost: true,
                        totalProfit: true,
                        orderType: true
                    }
                }),
                this.prisma.order.count({
                    where: {
                        restaurantId,
                        status: {
                            in: ['pending', 'cooking', 'ready']
                        }
                    }
                }),
                this.prisma.order.count({
                    where: {
                        restaurantId,
                        status: 'completed',
                        createdAt: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    }
                }),
                this.prisma.table.findMany({
                    where: { restaurantId },
                    select: { status: true }
                }),
                this.prisma.order.findMany({
                    where: {
                        restaurantId,
                        status: {
                            in: ['pending', 'cooking']
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5,
                    include: {
                        table: {
                            select: {
                                tableNo: true
                            }
                        },
                        orderItems: {
                            include: {
                                menuItem: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }),
                this.prisma.orderItem.groupBy({
                    by: ['menuItemId'],
                    where: {
                        order: {
                            restaurantId,
                            createdAt: {
                                gte: startOfToday,
                                lte: endOfToday
                            }
                        }
                    },
                    _sum: {
                        qty: true
                    },
                    orderBy: {
                        _sum: {
                            qty: 'desc'
                        }
                    },
                    take: 5
                }),
                this.prisma.order.findMany({
                    where: {
                        restaurantId,
                        createdAt: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    },
                    select: {
                        orderType: true,
                        status: true,
                        orderItems: {
                            select: {
                                qty: true
                            }
                        }
                    }
                }),
                this.prisma.menuItem.count({
                    where: {
                        restaurantId,
                        trackStock: true,
                        stockQty: { lte: 0 }
                    }
                }),
                this.prisma.menuItem.count({
                    where: {
                        restaurantId,
                        trackStock: true,
                        stockQty: { gt: 0, lte: 10 }
                    }
                }),
                this.prisma.order.findMany({
                    where: {
                        restaurantId,
                        paymentStatus: 'paid',
                        createdAt: {
                            gte: (() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 6);
                                d.setHours(0, 0, 0, 0);
                                return d;
                            })()
                        }
                    },
                    select: {
                        totalAmount: true,
                        createdAt: true
                    }
                })
            ]);
            let todayRevenue = 0;
            let todayCost = 0;
            let todayProfit = 0;
            let dineInRevenue = 0;
            let deliveryRevenue = 0;
            let takeawayRevenue = 0;
            let dineInOrders = 0;
            let deliveryOrders = 0;
            let takeawayOrders = 0;
            paidOrdersToday.forEach(order => {
                const amt = parseFloat(String(order.totalAmount)) || 0;
                const cost = parseFloat(String(order.totalCost)) || 0;
                const profit = parseFloat(String(order.totalProfit)) || 0;
                todayRevenue += amt;
                todayCost += cost;
                todayProfit += profit;
                if (order.orderType === 'dine_in') {
                    dineInRevenue += amt;
                    dineInOrders += 1;
                }
                else if (order.orderType === 'delivery') {
                    deliveryRevenue += amt;
                    deliveryOrders += 1;
                }
                else if (order.orderType === 'takeaway') {
                    takeawayRevenue += amt;
                    takeawayOrders += 1;
                }
            });
            const totalPaidOrdersCount = paidOrdersToday.length;
            const getShare = (count) => totalPaidOrdersCount > 0 ? parseFloat(((count / totalPaidOrdersCount) * 100).toFixed(1)) : 0;
            const getAverage = (rev, count) => count > 0 ? parseFloat((rev / count).toFixed(2)) : 0;
            let dineInActive = 0, dineInCompleted = 0, dineInItems = 0;
            let deliveryActive = 0, deliveryCompleted = 0, deliveryItems = 0;
            let takeawayActive = 0, takeawayCompleted = 0, takeawayItems = 0;
            allOrdersToday.forEach(order => {
                const itemQty = order.orderItems.reduce((sum, item) => sum + item.qty, 0);
                const isActive = ['pending', 'cooking', 'ready'].includes(order.status);
                const isCompleted = order.status === 'completed';
                if (order.orderType === 'dine_in') {
                    if (isActive)
                        dineInActive++;
                    if (isCompleted)
                        dineInCompleted++;
                    dineInItems += itemQty;
                }
                else if (order.orderType === 'delivery') {
                    if (isActive)
                        deliveryActive++;
                    if (isCompleted)
                        deliveryCompleted++;
                    deliveryItems += itemQty;
                }
                else if (order.orderType === 'takeaway') {
                    if (isActive)
                        takeawayActive++;
                    if (isCompleted)
                        takeawayCompleted++;
                    takeawayItems += itemQty;
                }
            });
            const totalTablesCount = tables.length;
            const busyTablesCount = tables.filter(t => t.status === 'occupied' || t.status === 'reserved').length;
            const kitchenFeed = recentKots.map(order => {
                const itemsText = order.orderItems.map(item => `${item.menuItem.name} x${item.qty}`).join(', ');
                return {
                    id: order.id,
                    kotId: `KOT #${order.id}`,
                    tableNo: order.table ? (order.table.tableNo.toLowerCase().startsWith('table') ? order.table.tableNo : `Table ${order.table.tableNo}`) : (order.orderType === 'delivery' ? '🛵 Delivery' : '📦 Takeaway'),
                    itemsText,
                    status: order.status
                };
            });
            const menuItemIds = popularItemsRaw.map(item => item.menuItemId);
            const menuItems = await this.prisma.menuItem.findMany({
                where: { id: { in: menuItemIds } },
                select: { id: true, name: true }
            });
            const menuItemsMap = new Map(menuItems.map(item => [item.id, item.name]));
            const popularItems = popularItemsRaw.map((item, idx) => ({
                rank: idx + 1,
                name: menuItemsMap.get(item.menuItemId) || "Delicious Item",
                soldCount: item._sum.qty || 0
            }));
            const salesMap = new Map();
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                salesMap.set(dateStr, 0);
            }
            const sortedDates = Array.from(salesMap.keys()).reverse();
            let last7DaysTotal = 0;
            last7DaysOrdersRaw.forEach(order => {
                const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                if (salesMap.has(dateStr)) {
                    const orderAmt = parseFloat(String(order.totalAmount)) || 0;
                    salesMap.set(dateStr, salesMap.get(dateStr) + orderAmt);
                    last7DaysTotal += orderAmt;
                }
            });
            const last7DaysFormatted = sortedDates.map(date => {
                const salesVal = parseFloat((salesMap.get(date) || 0).toFixed(2));
                return {
                    date,
                    sales: salesVal,
                    revenue: salesVal
                };
            });
            res.json({
                todayRevenue: parseFloat(todayRevenue.toFixed(2)),
                todayCost: parseFloat(todayCost.toFixed(2)),
                todayProfit: parseFloat(todayProfit.toFixed(2)),
                activeOrdersCount,
                completedTodayCount: completedOrdersTodayCount,
                completedOrdersTodayCount,
                totalOrdersTodayCount: allOrdersToday.length,
                tablesTotal: totalTablesCount,
                tablesOccupied: busyTablesCount,
                tablesFree: Math.max(0, totalTablesCount - busyTablesCount),
                outOfStockCount: outOfStockCount || 0,
                lowStockCount: lowStockCount || 0,
                busyTables: {
                    busy: busyTablesCount,
                    total: totalTablesCount,
                    free: Math.max(0, totalTablesCount - busyTablesCount)
                },
                fulfillments: {
                    dineIn: {
                        share: getShare(dineInOrders),
                        revenue: parseFloat(dineInRevenue.toFixed(2)),
                        orders: dineInOrders,
                        avgBill: getAverage(dineInRevenue, dineInOrders),
                        activeCount: dineInActive,
                        completedCount: dineInCompleted,
                        itemsCount: dineInItems
                    },
                    delivery: {
                        share: getShare(deliveryOrders),
                        revenue: parseFloat(deliveryRevenue.toFixed(2)),
                        orders: deliveryOrders,
                        avgBill: getAverage(deliveryRevenue, deliveryOrders),
                        activeCount: deliveryActive,
                        completedCount: deliveryCompleted,
                        itemsCount: deliveryItems
                    },
                    takeaway: {
                        share: getShare(takeawayOrders),
                        revenue: parseFloat(takeawayRevenue.toFixed(2)),
                        orders: takeawayOrders,
                        avgBill: getAverage(takeawayRevenue, takeawayOrders),
                        activeCount: takeawayActive,
                        completedCount: takeawayCompleted,
                        itemsCount: takeawayItems
                    }
                },
                kitchenFeed,
                recentKots: kitchenFeed,
                popularItems,
                last7Days: last7DaysFormatted,
                last7DaysSales: last7DaysFormatted,
                last7DaysTotal: parseFloat(last7DaysTotal.toFixed(2))
            });
        }
        catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: "Failed to load dashboard statistics." });
        }
    }
    ;
    async getSidebarTelemetry(req, res) {
        const restaurantId = parseInt(req.user.restaurantId);
        try {
            const [pendingQrCount, activeKdsCount] = await Promise.all([
                this.prisma.order.count({
                    where: {
                        restaurantId,
                        status: 'pending',
                        creator: {
                            name: 'QR Customer'
                        }
                    }
                }),
                this.prisma.order.count({
                    where: {
                        restaurantId,
                        status: {
                            in: ['pending', 'cooking', 'ready']
                        },
                        NOT: {
                            creator: {
                                name: 'QR Customer'
                            }
                        }
                    }
                })
            ]);
            const restSettings = await this.settingsService.getRestaurantSettings(restaurantId);
            res.json({
                pendingQrCount,
                activeKdsCount,
                qrOrderingEnabled: restSettings.qrOrderingEnabled,
                sidebarTheme: restSettings.sidebarTheme,
                sidebarQuickActions: restSettings.sidebarQuickActions,
                sidebarStoreSwitch: restSettings.sidebarStoreSwitch,
                sidebarCollapsible: restSettings.sidebarCollapsible,
                sidebarHiddenItems: restSettings.sidebarHiddenItems,
                vexoAiEnabled: restSettings.vexoAiEnabled,
                subscriptionPlan: restSettings.subscriptionPlan,
                subscriptionStatus: restSettings.subscriptionStatus,
                trialEndsAt: restSettings.trialEndsAt,
                enabledFeatures: restSettings.enabledFeatures,
                customPrice: restSettings.customPrice,
                customNotes: restSettings.customNotes
            });
        }
        catch (error) {
            console.error('Error fetching sidebar telemetry:', error);
            res.status(500).json({ error: "Failed to load sidebar metrics." });
        }
    }
    ;
    async broadcastSidebarTelemetry(restaurantId) {
        try {
            const parsedId = parseInt(restaurantId);
            const [pendingQrCount, activeKdsCount] = await Promise.all([
                this.prisma.order.count({
                    where: {
                        restaurantId: parsedId,
                        status: 'pending',
                        creator: {
                            name: 'QR Customer'
                        }
                    }
                }),
                this.prisma.order.count({
                    where: {
                        restaurantId: parsedId,
                        status: {
                            in: ['pending', 'cooking', 'ready']
                        },
                        NOT: {
                            creator: {
                                name: 'QR Customer'
                            }
                        }
                    }
                })
            ]);
            const restSettings = await this.settingsService.getRestaurantSettings(parsedId);
            this.websocketGateway?.server.to(`restaurant_${parsedId}`).emit('sidebar_telemetry_updated', {
                pendingQrCount,
                activeKdsCount,
                qrOrderingEnabled: restSettings.qrOrderingEnabled,
                sidebarTheme: restSettings.sidebarTheme,
                sidebarQuickActions: restSettings.sidebarQuickActions,
                sidebarStoreSwitch: restSettings.sidebarStoreSwitch,
                sidebarCollapsible: restSettings.sidebarCollapsible,
                sidebarHiddenItems: restSettings.sidebarHiddenItems,
                vexoAiEnabled: restSettings.vexoAiEnabled,
                subscriptionPlan: restSettings.subscriptionPlan,
                subscriptionStatus: restSettings.subscriptionStatus,
                trialEndsAt: restSettings.trialEndsAt,
                enabledFeatures: restSettings.enabledFeatures,
                customPrice: restSettings.customPrice,
                customNotes: restSettings.customNotes
            });
        }
        catch (error) {
            console.error('Error broadcasting sidebar telemetry:', error);
        }
    }
    ;
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService, websocket_gateway_1.WebsocketGateway])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map