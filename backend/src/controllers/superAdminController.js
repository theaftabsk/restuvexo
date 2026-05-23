const prisma = require('../db');
const settingsService = require('../settingsService');

// Verify x-super-admin-key header
const getAdminKey = () => process.env.SUPER_ADMIN_KEY || "VexoSecretSuperAdminPasskey2026";

const checkAdminAuth = (req) => {
  const clientKey = req.headers['x-super-admin-key'];
  return clientKey === getAdminKey();
};

// ────────────────────────────────────────────────────────────────
// SYSTEM DASHBOARD STATS
// ────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  try {
    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOf7DaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRestaurants,
      newSignupsToday,
      newSignups7Days,
      allSettings,
      totalDemoRequests,
      pendingDemoRequests,
      totalOrders,
      totalUsers
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.restaurant.count({ where: { createdAt: { gte: startOf7DaysAgo } } }),
      prisma.restaurantSetting.findMany({
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          customPrice: true
        }
      }),
      prisma.demoRequest.count(),
      prisma.demoRequest.count({ where: { status: 'pending' } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'owner' } })
    ]);

    // Calculate stats from settings
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
        } else {
          trialExpired++;
        }
      } else if (s.subscriptionPlan === 'lifetime') {
        lifetime++;
      } else if (s.subscriptionPlan === 'custom') {
        customActive++;
        totalMonthlyRevenue += parseFloat(s.customPrice || 0);
      } else {
        activePaid++;
        totalMonthlyRevenue += parseFloat(s.customPrice || 0);
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
  } catch (err) {
    console.error('[Super Admin getStats Error]', err);
    res.status(500).json({ error: "Failed to fetch system stats." });
  }
};

// ────────────────────────────────────────────────────────────────
// GET ALL RESTAURANTS (with full settings + owner)
// ────────────────────────────────────────────────────────────────
exports.getRestaurants = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  try {
    const restaurants = await prisma.restaurant.findMany({
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
  } catch (error) {
    console.error('[Super Admin getRestaurants Error]', error);
    res.status(500).json({ error: "Failed to fetch restaurants." });
  }
};

// ────────────────────────────────────────────────────────────────
// GET SINGLE RESTAURANT DETAILS
// ────────────────────────────────────────────────────────────────
exports.getRestaurantById = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  const { id } = req.params;
  const restaurantId = parseInt(id, 10);
  if (isNaN(restaurantId)) return res.status(400).json({ error: "Invalid Restaurant ID." });

  try {
    const restaurant = await prisma.restaurant.findUnique({
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

    if (!restaurant) return res.status(404).json({ error: "Restaurant not found." });

    // Count today's orders for this restaurant
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.count({
      where: { restaurantId, createdAt: { gte: startOfToday } }
    });

    res.json({ success: true, data: { ...restaurant, todayOrders } });
  } catch (error) {
    console.error('[Super Admin getRestaurantById Error]', error);
    res.status(500).json({ error: "Failed to fetch restaurant." });
  }
};

// ────────────────────────────────────────────────────────────────
// UPDATE RESTAURANT SETTINGS
// ────────────────────────────────────────────────────────────────
exports.updateRestaurantSettings = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  const { id } = req.params;
  const {
    qrOrderingEnabled,
    vexoAiEnabled,
    subscriptionPlan,
    subscriptionStatus,
    trialEndsAt,
    enabledFeatures,
    customPrice,
    customNotes
  } = req.body;

  const restaurantId = parseInt(id, 10);
  if (isNaN(restaurantId)) return res.status(400).json({ error: "Invalid Restaurant ID." });

  try {
    const updatedSettings = await settingsService.updateRestaurantSettings(restaurantId, {
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
  } catch (error) {
    console.error('[Super Admin updateRestaurantSettings Error]', error);
    res.status(500).json({ error: "Failed to update settings." });
  }
};

// ────────────────────────────────────────────────────────────────
// DELETE RESTAURANT (with cascade)
// ────────────────────────────────────────────────────────────────
exports.deleteRestaurant = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  const { id } = req.params;
  const restaurantId = parseInt(id, 10);
  if (isNaN(restaurantId)) return res.status(400).json({ error: "Invalid Restaurant ID." });

  try {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    res.json({ success: true, message: "Restaurant permanently deleted." });
  } catch (error) {
    console.error('[Super Admin deleteRestaurant Error]', error);
    res.status(500).json({ error: "Failed to delete restaurant." });
  }
};

// ────────────────────────────────────────────────────────────────
// GET ALL DEMO REQUESTS
// ────────────────────────────────────────────────────────────────
exports.getDemoRequests = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  try {
    const demoRequests = await prisma.demoRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: demoRequests });
  } catch (error) {
    console.error('[Super Admin getDemoRequests Error]', error);
    res.status(500).json({ error: "Failed to fetch demo requests." });
  }
};

// ────────────────────────────────────────────────────────────────
// UPDATE DEMO REQUEST STATUS
// ────────────────────────────────────────────────────────────────
exports.updateDemoRequest = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  const { id } = req.params;
  const demoId = parseInt(id, 10);
  if (isNaN(demoId)) return res.status(400).json({ error: "Invalid Demo Request ID." });

  const { status, adminNote } = req.body;

  try {
    const updated = await prisma.demoRequest.update({
      where: { id: demoId },
      data: {
        status: status || undefined,
        adminNote: adminNote !== undefined ? adminNote : undefined
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Super Admin updateDemoRequest Error]', error);
    res.status(500).json({ error: "Failed to update demo request." });
  }
};

// ────────────────────────────────────────────────────────────────
// DELETE DEMO REQUEST
// ────────────────────────────────────────────────────────────────
exports.deleteDemoRequest = async (req, res) => {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized Super Admin Access." });

  const { id } = req.params;
  const demoId = parseInt(id, 10);
  if (isNaN(demoId)) return res.status(400).json({ error: "Invalid Demo Request ID." });

  try {
    await prisma.demoRequest.delete({ where: { id: demoId } });
    res.json({ success: true, message: "Demo request deleted." });
  } catch (error) {
    console.error('[Super Admin deleteDemoRequest Error]', error);
    res.status(500).json({ error: "Failed to delete demo request." });
  }
};
