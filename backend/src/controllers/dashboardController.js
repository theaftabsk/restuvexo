const prisma = require('../db');
const settingsService = require('../settingsService');

exports.getDashboardStats = async (req, res) => {
  const restaurantId = req.user.restaurantId;

  // Timezone-safe limits for "today" (from 00:00:00.000 to 23:59:59.999 of current day)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  try {
    // Execute all queries in parallel for lightning-fast speeds and zero server overhead!
    const [
      paidOrdersToday,
      activeOrdersCount,
      completedOrdersTodayCount,
      tables,
      recentKots,
      popularItemsRaw,
      allOrdersToday,
      outOfStockCount,
      lowStockCount
    ] = await Promise.all([
      // 1. Today's Paid Orders for absolute revenue & avg bill calculations
      prisma.order.findMany({
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
      // 2. Active Orders count (status pending, cooking, ready)
      prisma.order.count({
        where: {
          restaurantId,
          status: {
            in: ['pending', 'cooking', 'ready']
          }
        }
      }),
      // 3. Completed Orders Today
      prisma.order.count({
        where: {
          restaurantId,
          status: 'completed',
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }),
      // 4. Tables status
      prisma.table.findMany({
        where: { restaurantId },
        select: { status: true }
      }),
      // 5. Recent 5 KOTs for the kitchen feed
      prisma.order.findMany({
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
      // 6. Popular items today
      prisma.orderItem.groupBy({
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
      // 7. All orders today to count active/completed details by fulfillment type
      prisma.order.findMany({
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
      // 8. Out of Stock items count
      prisma.menuItem.count({
        where: {
          restaurantId,
          trackStock: true,
          stockQty: { lte: 0 }
        }
      }),
      // 9. Low Stock items count (between 1 and 10)
      prisma.menuItem.count({
        where: {
          restaurantId,
          trackStock: true,
          stockQty: { gt: 0, lte: 10 }
        }
      })
    ]);

    // Compute basic revenue totals
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
      const amt = parseFloat(order.totalAmount) || 0;
      const cost = parseFloat(order.totalCost) || 0;
      const profit = parseFloat(order.totalProfit) || 0;

      todayRevenue += amt;
      todayCost += cost;
      todayProfit += profit;
      
      if (order.orderType === 'dine_in') {
        dineInRevenue += amt;
        dineInOrders += 1;
      } else if (order.orderType === 'delivery') {
        deliveryRevenue += amt;
        deliveryOrders += 1;
      } else if (order.orderType === 'takeaway') {
        takeawayRevenue += amt;
        takeawayOrders += 1;
      }
    });

    // Compute fulfillment shares & averages
    const totalPaidOrdersCount = paidOrdersToday.length;
    const getShare = (count) => totalPaidOrdersCount > 0 ? parseFloat(((count / totalPaidOrdersCount) * 100).toFixed(1)) : 0;
    const getAverage = (rev, count) => count > 0 ? parseFloat((rev / count).toFixed(2)) : 0;

    // Compute fulfillment live status and items today
    let dineInActive = 0, dineInCompleted = 0, dineInItems = 0;
    let deliveryActive = 0, deliveryCompleted = 0, deliveryItems = 0;
    let takeawayActive = 0, takeawayCompleted = 0, takeawayItems = 0;

    allOrdersToday.forEach(order => {
      const itemQty = order.orderItems.reduce((sum, item) => sum + item.qty, 0);
      const isActive = ['pending', 'cooking', 'ready'].includes(order.status);
      const isCompleted = order.status === 'completed';

      if (order.orderType === 'dine_in') {
        if (isActive) dineInActive++;
        if (isCompleted) dineInCompleted++;
        dineInItems += itemQty;
      } else if (order.orderType === 'delivery') {
        if (isActive) deliveryActive++;
        if (isCompleted) deliveryCompleted++;
        deliveryItems += itemQty;
      } else if (order.orderType === 'takeaway') {
        if (isActive) takeawayActive++;
        if (isCompleted) takeawayCompleted++;
        takeawayItems += itemQty;
      }
    });

    // Compute table stats
    const totalTablesCount = tables.length;
    const busyTablesCount = tables.filter(t => t.status === 'occupied' || t.status === 'reserved').length;

    // Map kitchen feed
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

    // Map popular items names in a single fast query
    const menuItemIds = popularItemsRaw.map(item => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true }
    });
    const menuItemsMap = new Map(menuItems.map(item => [item.id, item.name]));
    const popularItems = popularItemsRaw.map((item, idx) => ({
      rank: idx + 1,
      name: menuItemsMap.get(item.menuItemId) || "Delicious Item",
      soldCount: item._sum.qty || 0
    }));

    // Send complete compiled report
    res.json({
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      todayCost: parseFloat(todayCost.toFixed(2)),
      todayProfit: parseFloat(todayProfit.toFixed(2)),
      activeOrdersCount,
      completedTodayCount: completedOrdersTodayCount,
      outOfStockCount: outOfStockCount || 0,
      lowStockCount: lowStockCount || 0,
      busyTables: {
        busy: busyTablesCount,
        total: totalTablesCount
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
      popularItems
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: "Failed to load dashboard statistics." });
  }
};

exports.getSidebarTelemetry = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);

  try {
    const [pendingQrCount, activeKdsCount] = await Promise.all([
      prisma.order.count({
        where: {
          restaurantId,
          status: 'pending',
          creator: {
            name: 'QR Customer'
          }
        }
      }),
      prisma.order.count({
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

    const restSettings = await settingsService.getRestaurantSettings(restaurantId);

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
      trialEndsAt: restSettings.trialEndsAt
    });
  } catch (error) {
    console.error('Error fetching sidebar telemetry:', error);
    res.status(500).json({ error: "Failed to load sidebar metrics." });
  }
};

exports.broadcastSidebarTelemetry = async (io, restaurantId) => {
  try {
    const parsedId = parseInt(restaurantId);
    const [pendingQrCount, activeKdsCount] = await Promise.all([
      prisma.order.count({
        where: {
          restaurantId: parsedId,
          status: 'pending',
          creator: {
            name: 'QR Customer'
          }
        }
      }),
      prisma.order.count({
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

    const restSettings = await settingsService.getRestaurantSettings(parsedId);

    io.to(`restaurant_${parsedId}`).emit('sidebar_telemetry_updated', {
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
      trialEndsAt: restSettings.trialEndsAt
    });
  } catch (error) {
    console.error('Error broadcasting sidebar telemetry:', error);
  }
};
