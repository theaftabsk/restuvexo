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
    settings = await prisma.restaurantSetting.create({
      data: {
        restaurantId,
        qrOrderingEnabled: true,
        customerTheme: 'sunset',
        sidebarTheme: 'light',
        sidebarQuickActions: true,
        sidebarStoreSwitch: true,
        sidebarCollapsible: true,
        sidebarHiddenItems: []
      }
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
    update: updateData,
    create: {
      restaurantId,
      qrOrderingEnabled: updateData.qrOrderingEnabled !== undefined ? updateData.qrOrderingEnabled === true : true,
      customerTheme: updateData.customerTheme || 'sunset',
      sidebarTheme: updateData.sidebarTheme || 'light',
      sidebarQuickActions: updateData.sidebarQuickActions !== undefined ? updateData.sidebarQuickActions === true : true,
      sidebarStoreSwitch: updateData.sidebarStoreSwitch !== undefined ? updateData.sidebarStoreSwitch === true : true,
      sidebarCollapsible: updateData.sidebarCollapsible !== undefined ? updateData.sidebarCollapsible === true : true,
      sidebarHiddenItems: Array.isArray(updateData.sidebarHiddenItems) ? updateData.sidebarHiddenItems : []
    }
  });

  cache.set(restaurantId, settings);
  return settings;
}

module.exports = {
  getRestaurantSettings,
  updateRestaurantSettings
};
