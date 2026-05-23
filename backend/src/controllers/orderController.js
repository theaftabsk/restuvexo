const prisma = require('../db');
const settingsService = require('../settingsService');
const fs = require('fs');
const path = require('path');
const sessionFilePath = path.join(__dirname, '../guestSessions.json');

const readSessions = () => {
  try {
    if (!fs.existsSync(sessionFilePath)) return {};
    const data = fs.readFileSync(sessionFilePath, 'utf8');
    const sessions = JSON.parse(data);
    // Cleanup old sessions (older than 30 minutes)
    const now = Date.now();
    const cleanSessions = {};
    for (const [sid, sess] of Object.entries(sessions)) {
      if (now - sess.updatedAt < 30 * 60 * 1000) {
        cleanSessions[sid] = sess;
      }
    }
    return cleanSessions;
  } catch (e) {
    return {};
  }
};

const blacklistFilePath = path.join(__dirname, '../blacklistedDevices.json');
const readBlacklist = () => {
  try {
    if (!fs.existsSync(blacklistFilePath)) return {};
    return JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8'));
  } catch (e) {
    return {};
  }
};
const writeBlacklist = (blacklist) => {
  try {
    fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write blacklist file:", e);
  }
};

const writeSessions = (sessions) => {
  try {
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write guestSessions file:", e);
  }
};

// Generate a 10-Minute Dynamic Templink Token from Physical QR Scan
exports.generateTemplink = async (req, res) => {
  const { qrCode, deviceId } = req.body;
  try {
    const table = await prisma.table.findFirst({
      where: { qrCode: qrCode }
    });
    
    if (!table) return res.status(404).json({ error: "Invalid or Unregistered Dining Table QR Code" });
    
    // Generate a unique 10-minute temporary token
    const token = `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessions = readSessions();
    sessions[token] = {
      sessionId: token,
      deviceId: deviceId || "unknown_device",
      tableId: table.id,
      deviceInfo: "Mobile Scanner",
      activeOrders: [],
      createdAt: Date.now(),
      updatedAt: Date.now() // This will expire strictly 10 mins from now
    };
    writeSessions(sessions);
    
    // Return the safe customer URL with the temporary token
    res.json({ url: `/customer/${table.id}?token=${token}` });
  } catch (error) {
    console.error('[Templink Gateway Error]', error);
    res.status(500).json({ error: "Failed to generate temporary link." });
  }
};

// 1. Place New Order (POS & Waiter Terminal)
exports.createOrder = async (req, res) => {
  const { tableId, orderType, items, discount, paymentStatus, paymentMethod, trackStock } = req.body;
  const restaurantId = req.user.restaurantId;
  const createdBy = req.user.id;

  if (!items || !items.length) {
    return res.status(400).json({ error: "Order items cannot be empty." });
  }

  try {
    // Run order placement inside a database transaction to secure integrity
    const order = await prisma.$transaction(async (tx) => {

      // Calculate financial subtotal by fetching actual menu item prices
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

        // Verify and deduct stock only if trackStock is active (USER REQUESTED STOCK TOGGLE BYPASS)
        if (shouldTrackThisItem) {
          if (menuItem.stockQty < item.qty) {
            throw new Error(`Insufficient stock for item: ${menuItem.name}. Available: ${menuItem.stockQty}`);
          }

          // Deduct item stock qty
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

      // Calculations
      const discountAmount = discount ? parseFloat(discount) : 0;
      const totalAmount = subtotal - discountAmount;
      const totalCost = orderItemsToCreate.reduce((sum, item) => sum + (parseFloat(item.costPrice.toString()) * item.qty), 0);
      const totalProfit = totalAmount - totalCost;

      // Create Order
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
          // Create linked Order Items
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

      // If table is linked, update table status to occupied
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

    // Realtime Broadcast: Emit socket alert
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.status(201).json({
      message: "Order placed successfully!",
      order: formattedOrder
    });

  } catch (error) {
    console.error('[Create Order Transaction Failed]', error);
    res.status(400).json({ error: error.message || "Failed to save order. Try again." });
  }
};

// Update Existing Order Items & Totals (POS Edit Mode)
exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const { tableId, orderType, items, discount, paymentStatus, paymentMethod, trackStock } = req.body;
  const restaurantId = req.user.restaurantId;

  if (!items || !items.length) {
    return res.status(400).json({ error: "Order items cannot be empty." });
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { orderItems: { include: { menuItem: true } } }
    });

    if (!existingOrder || existingOrder.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found." });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Rollback stock of old items if trackStock was active
      for (const oldItem of existingOrder.orderItems) {
        if (oldItem.menuItem && oldItem.menuItem.trackStock) {
          await tx.menuItem.update({
            where: { id: oldItem.menuItem.id },
            data: { stockQty: oldItem.menuItem.stockQty + oldItem.qty }
          });
        }
      }

      // 2. Delete old Order Items
      await tx.orderItem.deleteMany({
        where: { orderId: existingOrder.id }
      });

      // 3. Compute and check stock for new items
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

      // 4. Update the Order
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

    // Broadcast update to real-time socket connections
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('order_updated', formattedOrder);
      io.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder); // Also alert order board
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.json({
      message: "Order updated successfully!",
      order: formattedOrder
    });

  } catch (error) {
    console.error('[Update Order Failed]', error);
    res.status(400).json({ error: error.message || "Failed to update order. Try again." });
  }
};

// 2. Fetch Orders with Server-Side Date Filtering & Pagination
exports.getOrders = async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const {
    status,         // kitchen status: pending | cooking | ready | completed | cancelled
    paymentStatus,  // billing: paid | unpaid
    dateFilter,     // today | yesterday | last7days | all | custom
    customDate,     // YYYY-MM-DD (only when dateFilter=custom)
    page = 1,
    limit = 20,
    qrApprovalOnly
  } = req.query;

  // --- Build Date Range Filter ---
  let dateWhere = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (!dateFilter || dateFilter === 'today') {
    dateWhere = { createdAt: { gte: todayStart, lt: todayEnd } };
  } else if (dateFilter === 'yesterday') {
    const yStart = new Date(todayStart); yStart.setDate(todayStart.getDate() - 1);
    const yEnd   = new Date(todayStart);
    dateWhere = { createdAt: { gte: yStart, lt: yEnd } };
  } else if (dateFilter === 'last7days') {
    const sevenAgo = new Date(todayStart); sevenAgo.setDate(todayStart.getDate() - 7);
    dateWhere = { createdAt: { gte: sevenAgo } };
  } else if (dateFilter === 'custom' && customDate) {
    const parts = customDate.split('-');
    if (parts.length === 3) {
      const cStart = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const cEnd   = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
      dateWhere = { createdAt: { gte: cStart, lt: cEnd } };
    }
  }
  // dateFilter === 'all' → no date restriction

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // cap at 100
  const skip     = (pageNum - 1) * limitNum;

  const whereClause = {
    restaurantId,
    ...(status        && { 
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
  } else {
    whereClause.NOT = {
      AND: [
        { status: 'pending' },
        { creator: { name: 'QR Customer' } }
      ]
    };
  }

  try {
    // Run count + data fetch in parallel for efficiency
    const [total, orders] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.findMany({
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
      total:    parseFloat(order.totalAmount.toString()),
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

  } catch (error) {
    console.error('[Get Orders Error]', error);
    res.status(500).json({ error: "Failed to load orders list." });
  }
};

// 3. Update Order Status (Pending -> Cooking -> Ready -> Completed)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const restaurantId = req.user.restaurantId;

  if (!['pending', 'cooking', 'ready', 'completed'].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Fetch order first to get details
      const order = await tx.order.findUnique({
        where: { id: parseInt(id) }
      });

      if (!order || order.restaurantId !== restaurantId) {
        throw new Error("Order parameters match failed.");
      }

      // Otherwise, update status as normal
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

      // Dynamic Freeing dining table status
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

    // Realtime Broadcast status change
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('order_status_updated', formattedOrder);
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.json({
      message: `Order status updated to ${status.toUpperCase()} successfully.`,
      order: formattedOrder
    });

  } catch (error) {
    console.error('[Update Order Status Error]', error);
    res.status(400).json({ error: error.message || "Failed to update order status." });
  }
};

// 4. Fetch Menu items for QR Guest without authentication (Public)
exports.getQrMenu = async (req, res) => {
  const { tableId } = req.params;
  const { sessionId, deviceInfo } = req.query;

  try {
    let table = null;
    const parsedId = parseInt(tableId);
    if (!isNaN(parsedId)) {
      table = await prisma.table.findUnique({
        where: { id: parsedId }
      });
    }

    if (!table) {
      table = await prisma.table.findFirst({
        where: { qrCode: tableId }
      });
    }

    if (!table) {
      return res.status(404).json({ error: "Dining Table not found." });
    }

    const restaurantId = table.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    const restaurantName = restaurant ? restaurant.name : "RESTUVEXO Café & Diner";

    // Fetch categories and items for this specific restaurant
    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurantId }
    });

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurantId,
        isAvailable: true
      },
      include: {
        category: true
      }
    });

    // Handle Active Guest Session Tracking with 10-Minute Expiry Limit
    let activeOrders = [];
    let sessionExpired = false;

    if (sessionId) {
      const sessions = readSessions();
      const existingSession = sessions[sessionId];
      const now = Date.now();

      if (existingSession) {
        if (now - existingSession.updatedAt > 10 * 60 * 1000) {
          sessionExpired = true;
        } else {
          // Keep-alive during active browsing
          existingSession.updatedAt = now;
          existingSession.tableId = table.id;
          if (deviceInfo) existingSession.deviceInfo = deviceInfo;
          sessions[sessionId] = existingSession;
          writeSessions(sessions);
        }
      } else {
        // Create a new session giving a fresh 10-minute slot
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

      // Fetch active orders placed by this session in the last 10 minutes
      if (session.activeOrders && session.activeOrders.length && !sessionExpired) {
        const dbOrders = await prisma.order.findMany({
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

        // Format decimal values safely to numbers to prevent .toFixed crash
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

    // Fetch Restaurant Settings for QR ordering switch & theme
    let qrOrderingEnabled = true;
    let customerTheme = 'sunset';
    try {
      const restSettings = await settingsService.getRestaurantSettings(restaurantId);
      if (restSettings) {
        qrOrderingEnabled = restSettings.qrOrderingEnabled;
        customerTheme = restSettings.customerTheme;
      }
    } catch (err) {
      console.error("Failed to read restaurant settings from cache/DB:", err);
    }

    res.json({ restaurantId, restaurantName, tableNo: table.tableNo, categories, menuItems, activeOrders, qrOrderingEnabled, customerTheme, sessionExpired });

  } catch (error) {
    console.error('[Get QR Menu Error]', error);
    res.status(500).json({ error: "Failed to fetch restaurant QR menu." });
  }
};

// 5. Place Customer QR self-order directly from Table (Public)
exports.createQrOrder = async (req, res) => {
  const { tableId, items, sessionId, deviceInfo, customerName, customerPhone, deviceId } = req.body;

  if (!tableId || !items || !items.length) {
    return res.status(400).json({ error: "Table selection or cart items cannot be empty." });
  }

  try {
    let table = null;
    const parsedId = parseInt(tableId);
    if (!isNaN(parsedId)) {
      table = await prisma.table.findUnique({
        where: { id: parsedId }
      });
    }

    if (!table) {
      table = await prisma.table.findFirst({
        where: { qrCode: tableId }
      });
    }

    if (!table) {
      return res.status(404).json({ error: "Dining Table not found." });
    }

    const restaurantId = table.restaurantId;

    // Check if QR self-ordering is disabled for this restaurant
    try {
      const restSettings = await settingsService.getRestaurantSettings(restaurantId);
      if (restSettings && restSettings.qrOrderingEnabled === false) {
        return res.status(400).json({ error: "QR Self-Ordering is currently offline. Please contact the waiter to place your order." });
      }
    } catch (err) {
      console.error("Failed to read restaurant settings from cache/DB:", err);
    }

    // --- 🛡️ Intelligent Anti-Spam & Blacklist Firewall ---
    if (deviceId) {
      const blacklist = readBlacklist();
      
      // 1. Hard Block Check
      if (blacklist[deviceId]) {
        return res.status(403).json({ error: "Access Denied: Your device has been permanently blocked by the restaurant." });
      }

      // 2. Auto-Ban Rate Limiter (Max 3 orders in 3 minutes)
      const sessions = readSessions();
      if (sessionId && sessions[sessionId]) {
        let existingSession = sessions[sessionId];
        const now = Date.now();
        existingSession.orderTimestamps = existingSession.orderTimestamps || [];
        
        // Clean up timestamps older than 3 minutes
        existingSession.orderTimestamps = existingSession.orderTimestamps.filter(t => now - t < 3 * 60 * 1000);
        
        if (existingSession.orderTimestamps.length >= 3) {
          // AUTO-BAN TRIPPED!
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
    // ----------------------------------------------------

    // Find or create virtual "QR Customer" user by globally unique loginId to prevent unique constraint crash
    const guestPhone = `QR-${restaurantId}`;
    let qrUser = await prisma.user.findUnique({
      where: { loginId: guestPhone }
    });

    if (!qrUser) {
      qrUser = await prisma.user.create({
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

    // Run transaction
    const order = await prisma.$transaction(async (tx) => {
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

          // Deduct item stock qty
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

      // Create Order in pending approval state
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

      // Update table to occupied
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

    // Realtime Broadcast to Waiters
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('new_qr_order_placed', formattedOrder);
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    // Save order in session history
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
      if (customerName) session.customerName = customerName;
      if (customerPhone) session.customerPhone = customerPhone;
      if (!session.activeOrders) session.activeOrders = [];
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

  } catch (error) {
    console.error('[Create QR Order Failed]', error);
    res.status(400).json({ error: error.message || "Failed to submit order. Try again." });
  }
};

// 6. Approve QR order by Staff/Waiter
exports.approveQrOrder = async (req, res) => {
  const { id } = req.params;
  const staffId = req.user.id;
  const restaurantId = req.user.restaurantId;

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingOrder || existingOrder.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Update order createdBy to staffId (Waiter) to officially approve KOT and set approvedBy tracker
    const approvedOrder = await prisma.order.update({
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

    // Realtime Broadcast to KDS kitchen to ring bell!
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('new_order_placed', formattedOrder);
      io.to(`restaurant_${restaurantId}`).emit('qr_order_approved', formattedOrder.id);
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.json({
      message: "QR Order approved and dispatched to Kitchen!",
      order: formattedOrder
    });

  } catch (error) {
    console.error('[Approve QR Order Failed]', error);
    res.status(400).json({ error: error.message || "Failed to approve KOT." });
  }
};

// 7. Settle payment for Unpaid orders
exports.settleOrder = async (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body; // 'cash' | 'card' | 'upi'
  const restaurantId = req.user.restaurantId;

  if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
    return res.status(400).json({ error: "Invalid payment method. Choose cash, card, or upi." });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!order || order.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found." });
    }

    const updatedOrder = await prisma.order.update({
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

    // Realtime Broadcast payment status update
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('order_payment_settled', formattedOrder);
    }

    res.json({
      message: "Order payment settled successfully!",
      order: formattedOrder
    });

  } catch (error) {
    console.error('[Settle Order Payment Failed]', error);
    res.status(400).json({ error: error.message || "Failed to settle payment." });
  }
};

// 8. Permanent Order Deletion (Owner/Manager override)
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  const restaurantId = req.user.restaurantId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!order || order.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: "Audit Protection: Paid/Settled orders cannot be deleted." });
    }

    await prisma.order.delete({
      where: { id: order.id }
    });

    // Realtime Broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('order_deleted', { id: order.id });
      io.to(`restaurant_${restaurantId}`).emit('order_updated');
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.json({ message: "Order permanently deleted from the database." });

  } catch (error) {
    console.error('[Delete Order Failed]', error);
    res.status(500).json({ error: "Failed to permanently delete order. Check active relations." });
  }
};
