
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { DashboardService } from '../dashboard/dashboard.service';
import * as path from 'path';
import * as fs from 'fs';


const blacklistFilePath = path.join(__dirname, '../../blacklistedDevices.json');
const readBlacklist = () => {
  try {
    if (!fs.existsSync(blacklistFilePath)) return {};
    return JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8'));
  } catch (e) {
    return {};
  }
};
const writeBlacklist = (blacklist: any) => {
  try {
    fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
  } catch (e) {
    console.error(e);
  }
};


@Injectable()
export class TableService {
  constructor(private prisma: PrismaService, private settingsService: SettingsService, private websocketGateway: WebsocketGateway, private dashboardService: DashboardService) {
    
  }

  


// Get All Restaurant Tables (with smart auto-seeding for first launch)
async getTables(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);

  if (isNaN(restaurantId)) {
    return res.status(400).json({ error: "Invalid restaurant identity." });
  }

  try {
    let tables = await this.prisma.table.findMany({
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

      await this.prisma.table.createMany({
        data: tablesToSeed as any
      });

      // Fetch newly seeded tables
      tables = await this.prisma.table.findMany({
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

  } catch (error) {
    console.error('[Get Tables Error]', error);
    res.status(500).json({ error: "Failed to load tables." });
  }
};

// Create a New Table
async createTable(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);
  const { tableNo, capacity, floor } = req.body;
  if (!tableNo) return res.status(400).json({ error: "Table name/number is required." });

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

    // Realtime Broadcast to POS and Table manager
    const io = this.websocketGateway?.server;
    if (io) {
      this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', newTable);
    }

    res.json(newTable);
  } catch (e) {
    console.error('[Create Table Error]', e);
    res.status(500).json({ error: "Failed to create new table." });
  }
};

// Update an Existing Table
async updateTable(req, res: any) {
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

    const updateData: any = {};
    if (tableNo !== undefined) updateData.tableNo = String(tableNo).trim();
    if (status !== undefined) updateData.status = status;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity) || 4;
    if (floor !== undefined) updateData.floor = String(floor).trim();

    const updatedTable = await this.prisma.table.update({
      where: { id: tableId },
      data: updateData
    });

    // Realtime Broadcast
    const io = this.websocketGateway?.server;
    if (io) {
      this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', updatedTable);
    }

    res.json(updatedTable);
  } catch (e) {
    console.error('[Update Table Error]', e);
    res.status(500).json({ error: "Failed to update table." });
  }
};

// Delete a Table
async deleteTable(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);
  const tableId = parseInt(req.params.id);

  try {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.restaurantId !== restaurantId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    await this.prisma.table.delete({ where: { id: tableId } });
    res.json({ success: true, message: "Table deleted." });
  } catch (e) {
    console.error('[Delete Table Error]', e);
    res.status(500).json({ error: "Failed to delete table. Check if there are active orders linked to it." });
  }
};

// Get Live Guest Sessions (Owners/Managers Floor Monitoring)
async getActiveSessions(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);
  
  
  const sessionFilePath = path.join(__dirname, '../guestSessions.json');

  try {
    if (!fs.existsSync(sessionFilePath)) return res.json([]);
    
    const data = fs.readFileSync(sessionFilePath, 'utf8');
    const sessions = JSON.parse(data);
    
    // Get all tables of this restaurant
    const tables = await this.prisma.table.findMany({
      where: { restaurantId: restaurantId }
    });
    const tableIds = tables.map(t => t.id);
    const tableMap = {};
    tables.forEach(t => { tableMap[t.id] = t.tableNo; });

    const now = Date.now();
    const activeSessions = [];
    
    for (const [sid, sessVal] of Object.entries(sessions)) {
      const sess = sessVal as any;
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
async clearActiveSession(req, res: any) {
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

    // Ensure the table belongs to this restaurant
    const table = await this.prisma.table.findUnique({
      where: { id: session.tableId }
    });

    if (!table || table.restaurantId !== restaurantId) {
      return res.status(403).json({ error: "Unauthorized access to this table session." });
    }

    // Delete session from file registry
    delete sessions[sessionId];
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2), 'utf8');

    // Free the table in database
    await this.prisma.table.update({
      where: { id: session.tableId },
      data: { status: "free" }
    });

    // Realtime Broadcast
    
    const io = this.websocketGateway?.server; if (io) this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated', { id: session.tableId, status: 'free' as any });

    res.json({ message: `Successfully cleared Table ${table.tableNo} session and marked table as Free.` });

  } catch (error) {
    console.error('[Clear Session Failed]', error);
    res.status(500).json({ error: "Failed to clear table session." });
  }
};

// Get Restaurant Settings (View-Only digital menu vs Self-Ordering & Themes)
async getSettings(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);

  try {
    const restSettings = await this.settingsService.getRestaurantSettings(restaurantId);
    res.json(restSettings);

  } catch (error) {
    console.error('[Get Settings Error]', error);
    res.status(500).json({ error: "Failed to get settings." });
  }
};

// Update Restaurant Settings
async updateSettings(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);
  const { 
    qrOrderingEnabled, 
    customerTheme,
    sidebarTheme,
    sidebarQuickActions,
    sidebarStoreSwitch,
    sidebarCollapsible,
    sidebarHiddenItems,
    vexoAiEnabled,
    vexoAiNormalLimit,
    vexoAiApiLimit,
    subscriptionPlan,
    subscriptionStatus,
    trialEndsAt
  } = req.body;

  try {
    const updateData: any = {};
    if (qrOrderingEnabled !== undefined) updateData.qrOrderingEnabled = qrOrderingEnabled === true;
    if (customerTheme !== undefined) updateData.customerTheme = customerTheme;
    if (sidebarTheme !== undefined) updateData.sidebarTheme = sidebarTheme;
    if (sidebarQuickActions !== undefined) updateData.sidebarQuickActions = sidebarQuickActions === true;
    if (sidebarStoreSwitch !== undefined) updateData.sidebarStoreSwitch = sidebarStoreSwitch === true;
    if (sidebarCollapsible !== undefined) updateData.sidebarCollapsible = sidebarCollapsible === true;
    if (sidebarHiddenItems !== undefined) {
      updateData.sidebarHiddenItems = Array.isArray(sidebarHiddenItems) ? sidebarHiddenItems : [];
    }
    if (vexoAiEnabled !== undefined) updateData.vexoAiEnabled = vexoAiEnabled === true;
    if (vexoAiNormalLimit !== undefined) updateData.vexoAiNormalLimit = parseInt(vexoAiNormalLimit, 10);
    if (vexoAiApiLimit !== undefined) updateData.vexoAiApiLimit = parseInt(vexoAiApiLimit, 10);
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt;

    const restSettings = await this.settingsService.updateRestaurantSettings(restaurantId, updateData);

    // Realtime Broadcast settings / table state update to all visitors & admin panels
    
    const io = this.websocketGateway?.server; if (io) {
      this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('table_updated');
      
      await this.dashboardService.broadcastSidebarTelemetry(restaurantId);
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







// Owner Manual Block API
async blockDevice(req, res: any) {
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
async getBlacklistedDevices(req, res: any) {
  const blacklist = readBlacklist();
  res.json(Object.values(blacklist));
};

// Unblock Device
async unblockDevice(req, res: any) {
  const { deviceId } = req.params;
  const blacklist = readBlacklist();
  if (blacklist[deviceId]) {
    delete blacklist[deviceId];
    writeBlacklist(blacklist);
  }
  res.json({ success: true, message: "Device unblocked successfully." });
};

// Get Detailed Table Order & Turnover History
async getTableHistory(req, res: any) {
  const restaurantId = parseInt(req.user.restaurantId);
  const tableId = parseInt(req.params.id);

  if (isNaN(tableId)) {
    return res.status(400).json({ error: "Invalid table ID." });
  }

  try {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId }
    });

    if (!table) return res.status(404).json({ error: "Table not found." });

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
  } catch (error) {
    console.error('[Get Table History Error]', error);
    res.status(500).json({ error: "Failed to load table history." });
  }
};

}

