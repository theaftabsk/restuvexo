const prisma = require('../db');
const settingsService = require('../settingsService');

// Get All Restaurant Tables (with smart auto-seeding for first launch)
exports.getTables = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);

  if (isNaN(restaurantId)) {
    return res.status(400).json({ error: "Invalid restaurant identity." });
  }

  try {
    let tables = await prisma.table.findMany({
      where: { restaurantId: restaurantId },
      orderBy: { tableNo: 'asc' }
    });

    // Auto-seed tables if restaurant has none
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

      await prisma.table.createMany({
        data: tablesToSeed
      });

      // Fetch newly seeded tables
      tables = await prisma.table.findMany({
        where: { restaurantId: restaurantId },
        orderBy: { tableNo: 'asc' }
      });
    }

    // Auto-migrate tables to beautiful unique QR slugs if they are using old plain strings or empty
    let hasMigrated = false;
    for (const table of tables) {
      if (!table.qrCode || !table.qrCode.startsWith('restuvexo-indian-bistro-premium-dining-')) {
        const uniqueSalt = Math.random().toString(36).substr(2, 6) + Math.random().toString(36).substr(2, 6);
        const tableSlug = table.tableNo.replace(/\s+/g, '-').toLowerCase();
        const slug = `restuvexo-indian-bistro-premium-dining-${tableSlug}-${uniqueSalt}`;
        await prisma.table.update({
          where: { id: table.id },
          data: { qrCode: slug }
        });
        hasMigrated = true;
      }
    }

    if (hasMigrated) {
      tables = await prisma.table.findMany({
        where: { restaurantId: restaurantId },
        orderBy: { tableNo: 'asc' }
      });
    }

    res.json(tables);

  } catch (error) {
    console.error('[Get Tables Error]', error);
    res.status(500).json({ error: "Failed to load tables." });
  }
};

// Create a New Table
exports.createTable = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);
  const { tableNo } = req.body;
  if (!tableNo) return res.status(400).json({ error: "Table name/number is required." });

  try {
    const uniqueSalt = Math.random().toString(36).substr(2, 6) + Math.random().toString(36).substr(2, 6);
    const tableSlug = tableNo.replace(/\s+/g, '-').toLowerCase();
    const qrCode = `restuvexo-indian-bistro-premium-dining-${tableSlug}-${uniqueSalt}`;

    const newTable = await prisma.table.create({
      data: {
        restaurantId,
        tableNo,
        qrCode,
        status: "free"
      }
    });
    res.json(newTable);
  } catch (e) {
    console.error('[Create Table Error]', e);
    res.status(500).json({ error: "Failed to create new table." });
  }
};

// Update an Existing Table
exports.updateTable = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);
  const tableId = parseInt(req.params.id);
  const { tableNo, status } = req.body;
  
  if (tableNo === undefined && status === undefined) {
    return res.status(400).json({ error: "No fields provided to update." });
  }

  try {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.restaurantId !== restaurantId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const updateData = {};
    if (tableNo !== undefined) updateData.tableNo = tableNo;
    if (status !== undefined) updateData.status = status;

    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: updateData
    });

    // Realtime Broadcast
    const io = req.app.get('socketio');
    if (io) io.to(`restaurant_${restaurantId}`).emit('table_updated', updatedTable);

    res.json(updatedTable);
  } catch (e) {
    console.error('[Update Table Error]', e);
    res.status(500).json({ error: "Failed to update table." });
  }
};

// Delete a Table
exports.deleteTable = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);
  const tableId = parseInt(req.params.id);

  try {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.restaurantId !== restaurantId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    await prisma.table.delete({ where: { id: tableId } });
    res.json({ success: true, message: "Table deleted." });
  } catch (e) {
    console.error('[Delete Table Error]', e);
    res.status(500).json({ error: "Failed to delete table. Check if there are active orders linked to it." });
  }
};

// Get Live Guest Sessions (Owners/Managers Floor Monitoring)
exports.getActiveSessions = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);
  const fs = require('fs');
  const path = require('path');
  const sessionFilePath = path.join(__dirname, '../guestSessions.json');

  try {
    if (!fs.existsSync(sessionFilePath)) return res.json([]);
    
    const data = fs.readFileSync(sessionFilePath, 'utf8');
    const sessions = JSON.parse(data);
    
    // Get all tables of this restaurant
    const tables = await prisma.table.findMany({
      where: { restaurantId: restaurantId }
    });
    const tableIds = tables.map(t => t.id);
    const tableMap = {};
    tables.forEach(t => { tableMap[t.id] = t.tableNo; });

    const now = Date.now();
    const activeSessions = [];
    
    for (const [sid, sess] of Object.entries(sessions)) {
      // Session is active if updated in the last 30 minutes and belongs to this restaurant's tables
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

  } catch (error) {
    console.error('[Get Active Sessions Failed]', error);
    res.status(500).json({ error: "Failed to fetch active floor sessions." });
  }
};

// Clear Guest Session & Free Table (Owner Only)
exports.clearActiveSession = async (req, res) => {
  const { sessionId } = req.params;
  const restaurantId = parseInt(req.user.restaurantId);
  const fs = require('fs');
  const path = require('path');
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

    // Ensure the table belongs to this restaurant
    const table = await prisma.table.findUnique({
      where: { id: session.tableId }
    });

    if (!table || table.restaurantId !== restaurantId) {
      return res.status(403).json({ error: "Unauthorized access to this table session." });
    }

    // Delete session from file registry
    delete sessions[sessionId];
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2), 'utf8');

    // Free the table in database
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: "free" }
    });

    // Realtime Broadcast
    const io = req.app.get('socketio');
    if (io) io.to(`restaurant_${restaurantId}`).emit('table_updated', { id: session.tableId, status: 'free' });

    res.json({ message: `Successfully cleared Table ${table.tableNo} session and marked table as Free.` });

  } catch (error) {
    console.error('[Clear Session Failed]', error);
    res.status(500).json({ error: "Failed to clear table session." });
  }
};

// Get Restaurant Settings (View-Only digital menu vs Self-Ordering & Themes)
exports.getSettings = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);

  try {
    const restSettings = await settingsService.getRestaurantSettings(restaurantId);
    res.json(restSettings);

  } catch (error) {
    console.error('[Get Settings Error]', error);
    res.status(500).json({ error: "Failed to get settings." });
  }
};

// Update Restaurant Settings
exports.updateSettings = async (req, res) => {
  const restaurantId = parseInt(req.user.restaurantId);
  const { 
    qrOrderingEnabled, 
    customerTheme,
    sidebarTheme,
    sidebarQuickActions,
    sidebarStoreSwitch,
    sidebarCollapsible,
    sidebarHiddenItems
  } = req.body;

  try {
    const updateData = {};
    if (qrOrderingEnabled !== undefined) updateData.qrOrderingEnabled = qrOrderingEnabled === true;
    if (customerTheme !== undefined) updateData.customerTheme = customerTheme;
    if (sidebarTheme !== undefined) updateData.sidebarTheme = sidebarTheme;
    if (sidebarQuickActions !== undefined) updateData.sidebarQuickActions = sidebarQuickActions === true;
    if (sidebarStoreSwitch !== undefined) updateData.sidebarStoreSwitch = sidebarStoreSwitch === true;
    if (sidebarCollapsible !== undefined) updateData.sidebarCollapsible = sidebarCollapsible === true;
    if (sidebarHiddenItems !== undefined) {
      updateData.sidebarHiddenItems = Array.isArray(sidebarHiddenItems) ? sidebarHiddenItems : [];
    }

    const restSettings = await settingsService.updateRestaurantSettings(restaurantId, updateData);

    // Realtime Broadcast settings / table state update to all visitors & admin panels
    const io = req.app.get('socketio');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('table_updated');
      const dashboardController = require('./dashboardController');
      dashboardController.broadcastSidebarTelemetry(io, restaurantId);
    }

    res.json({ 
      success: true, 
      ...restSettings
    });

  } catch (error) {
    console.error('[Update Settings Error]', error);
    res.status(500).json({ error: "Failed to update settings." });
  }
};

// --- Anti-Spam Blacklist Management APIs ---
const path = require('path');
const blacklistFilePath = path.join(__dirname, '../blacklistedDevices.json');

const readBlacklist = () => {
  try {
    const fs = require('fs');
    if (!fs.existsSync(blacklistFilePath)) return {};
    return JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8'));
  } catch (e) {
    return {};
  }
};

const writeBlacklist = (blacklist) => {
  try {
    const fs = require('fs');
    fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write blacklist file:", e);
  }
};

// Owner Manual Block API
exports.blockDevice = async (req, res) => {
  const { deviceId, deviceInfo, customerName, reason } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Device ID required." });
  
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
};

// Get Blocked Devices
exports.getBlacklistedDevices = async (req, res) => {
  const blacklist = readBlacklist();
  res.json(Object.values(blacklist));
};

// Unblock Device
exports.unblockDevice = async (req, res) => {
  const { deviceId } = req.params;
  const blacklist = readBlacklist();
  if (blacklist[deviceId]) {
    delete blacklist[deviceId];
    writeBlacklist(blacklist);
  }
  res.json({ success: true, message: "Device unblocked successfully." });
};
