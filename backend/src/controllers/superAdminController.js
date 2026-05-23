const prisma = require('../db');
const settingsService = require('../settingsService');

// Verify x-super-admin-key header
const getAdminKey = () => process.env.SUPER_ADMIN_KEY || "VexoSecretSuperAdminPasskey2026";

const checkAdminAuth = (req) => {
  const clientKey = req.headers['x-super-admin-key'];
  return clientKey === getAdminKey();
};

exports.getRestaurants = async (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: "Unauthorized Super Admin Access." });
  }

  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        settings: true,
        users: {
          where: { role: 'owner' },
          select: { name: true, loginId: true }
        }
      }
    });

    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('[Super Admin getRestaurants Error]', error);
    res.status(500).json({ error: "Failed to fetch restaurants." });
  }
};

exports.updateRestaurantSettings = async (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: "Unauthorized Super Admin Access." });
  }

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
  if (isNaN(restaurantId)) {
    return res.status(400).json({ error: "Invalid Restaurant ID." });
  }

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
