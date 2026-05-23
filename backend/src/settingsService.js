const prisma = require('./db');

// In-memory cache for restaurant settings to reduce DB query load
const cache = new Map();

/**
 * Get settings for a restaurant. Returns cached settings if available.
 */
async function getRestaurantSettings(restaurantId) {
  if (cache.has(restaurantId)) {
    return cache.get(restaurantId);
  }

  let settings = await prisma.restaurantSetting.findUnique({
    where: { restaurantId }
  });

  if (!settings) {
    // Seed default settings in database
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { createdAt: true }
    });
    const trialStart = restaurant ? new Date(restaurant.createdAt) : new Date();
    const trialEndsAt = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Days Trial

    settings = await prisma.restaurantSetting.create({
      data: {
        restaurantId,
        qrOrderingEnabled: true,
        customerTheme: 'sunset',
        sidebarTheme: 'light',
        sidebarQuickActions: true,
        sidebarStoreSwitch: true,
        sidebarCollapsible: true,
        sidebarHiddenItems: [],
        vexoAiEnabled: true,
        vexoAiNormalLimit: 15,
        vexoAiApiLimit: 5,
        subscriptionPlan: 'trial',
        subscriptionStatus: 'active',
        trialEndsAt: trialEndsAt
      }
    });
  } else if (!settings.trialEndsAt && settings.subscriptionPlan === 'trial') {
    // Auto-migrate older records that lack trial expiration details
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { createdAt: true }
    });
    const trialStart = restaurant ? new Date(restaurant.createdAt) : new Date();
    const trialEndsAt = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    settings = await prisma.restaurantSetting.update({
      where: { restaurantId },
      data: { trialEndsAt }
    });
  }

  cache.set(restaurantId, settings);
  return settings;
}

/**
 * Update settings for a restaurant. Updates both database and cache.
 */
async function updateRestaurantSettings(restaurantId, updateData) {
  const settings = await prisma.restaurantSetting.upsert({
    where: { restaurantId },
    update: {
      qrOrderingEnabled: updateData.qrOrderingEnabled !== undefined ? updateData.qrOrderingEnabled === true : undefined,
      customerTheme: updateData.customerTheme || undefined,
      sidebarTheme: updateData.sidebarTheme || undefined,
      sidebarQuickActions: updateData.sidebarQuickActions !== undefined ? updateData.sidebarQuickActions === true : undefined,
      sidebarStoreSwitch: updateData.sidebarStoreSwitch !== undefined ? updateData.sidebarStoreSwitch === true : undefined,
      sidebarCollapsible: updateData.sidebarCollapsible !== undefined ? updateData.sidebarCollapsible === true : undefined,
      sidebarHiddenItems: Array.isArray(updateData.sidebarHiddenItems) ? updateData.sidebarHiddenItems : undefined,
      vexoAiEnabled: updateData.vexoAiEnabled !== undefined ? updateData.vexoAiEnabled === true : undefined,
      vexoAiNormalLimit: updateData.vexoAiNormalLimit !== undefined ? parseInt(updateData.vexoAiNormalLimit, 10) : undefined,
      vexoAiApiLimit: updateData.vexoAiApiLimit !== undefined ? parseInt(updateData.vexoAiApiLimit, 10) : undefined,
      subscriptionPlan: updateData.subscriptionPlan || undefined,
      subscriptionStatus: updateData.subscriptionStatus || undefined,
      trialEndsAt: updateData.trialEndsAt !== undefined ? (updateData.trialEndsAt ? new Date(updateData.trialEndsAt) : null) : undefined
    },
    create: {
      restaurantId,
      qrOrderingEnabled: updateData.qrOrderingEnabled !== undefined ? updateData.qrOrderingEnabled === true : true,
      customerTheme: updateData.customerTheme || 'sunset',
      sidebarTheme: updateData.sidebarTheme || 'light',
      sidebarQuickActions: updateData.sidebarQuickActions !== undefined ? updateData.sidebarQuickActions === true : true,
      sidebarStoreSwitch: updateData.sidebarStoreSwitch !== undefined ? updateData.sidebarStoreSwitch === true : true,
      sidebarCollapsible: updateData.sidebarCollapsible !== undefined ? updateData.sidebarCollapsible === true : true,
      sidebarHiddenItems: Array.isArray(updateData.sidebarHiddenItems) ? updateData.sidebarHiddenItems : [],
      vexoAiEnabled: updateData.vexoAiEnabled !== undefined ? updateData.vexoAiEnabled === true : true,
      vexoAiNormalLimit: updateData.vexoAiNormalLimit !== undefined ? parseInt(updateData.vexoAiNormalLimit, 10) : 15,
      vexoAiApiLimit: updateData.vexoAiApiLimit !== undefined ? parseInt(updateData.vexoAiApiLimit, 10) : 5,
      subscriptionPlan: updateData.subscriptionPlan || 'trial',
      subscriptionStatus: updateData.subscriptionStatus || 'active',
      trialEndsAt: updateData.trialEndsAt ? new Date(updateData.trialEndsAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  cache.set(restaurantId, settings);
  return settings;
}

module.exports = {
  getRestaurantSettings,
  updateRestaurantSettings
};
