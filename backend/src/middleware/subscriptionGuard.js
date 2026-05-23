const settingsService = require('../settingsService');

const subscriptionGuard = async (req, res, next) => {
  const originalUrl = req.originalUrl || req.url;

  // 1. Bypass public auth and demo paths
  if (
    originalUrl.startsWith('/api/auth/owner/signup') ||
    originalUrl.startsWith('/api/auth/verify-otp') ||
    originalUrl.startsWith('/api/auth/login') ||
    originalUrl.startsWith('/api/auth/forgot-password') ||
    originalUrl.startsWith('/api/auth/reset-password') ||
    originalUrl.startsWith('/api/demo')
  ) {
    return next();
  }

  // 2. Bypass settings retrieval and updates (so users can always upgrade/view billing settings)
  if (originalUrl === '/api/tables/settings' || originalUrl.startsWith('/api/tables/settings?') || originalUrl.startsWith('/api/tables/settings')) {
    return next();
  }

  // 3. Bypass sidebar telemetry so the frontend dashboard can load subscription state
  if (originalUrl.includes('/api/dashboard/sidebar-telemetry')) {
    return next();
  }

  // 4. Resolve Restaurant ID
  let restaurantId = req.user ? req.user.restaurantId : null;

  if (!restaurantId) {
    // Resolve for guest checkout / scan paths
    if (originalUrl.startsWith('/api/orders/qr-menu/')) {
      const parts = originalUrl.split('/');
      const tableId = parseInt(parts[parts.length - 1]);
      if (tableId) {
        const prisma = require('../db');
        const table = await prisma.table.findUnique({ where: { id: tableId }, select: { restaurantId: true } });
        if (table) restaurantId = table.restaurantId;
      }
    } else if (originalUrl.startsWith('/api/orders/qr-place') || originalUrl.startsWith('/api/orders/generate-templink')) {
      const { qrCode } = req.body;
      if (qrCode) {
        const prisma = require('../db');
        const table = await prisma.table.findFirst({ where: { qrCode: qrCode }, select: { restaurantId: true } });
        if (table) restaurantId = table.restaurantId;
      }
    }
  }

  if (!restaurantId) {
    return next();
  }

  try {
    const settings = await settingsService.getRestaurantSettings(restaurantId);

    // 5. Expired Subscription Check (Trial End Date Check)
    let isExpired = settings.subscriptionStatus === 'expired';

    if (settings.subscriptionPlan === 'trial' && settings.trialEndsAt) {
      const trialEnd = new Date(settings.trialEndsAt).getTime();
      if (Date.now() > trialEnd) {
        isExpired = true;
        if (settings.subscriptionStatus !== 'expired') {
          await settingsService.updateRestaurantSettings(restaurantId, { subscriptionStatus: 'expired' });
        }
      }
    }

    if (isExpired) {
      return res.status(402).json({
        subscriptionError: "expired",
        message: "Your 7-Day Free Trial or subscription has expired. Please select a plan in Settings to restore access."
      });
    }

    // 6. Basic Plan Features Restricting
    if (settings.subscriptionPlan === 'basic') {
      // Basic Plan Block: Customer QR Self-Ordering
      if (originalUrl.startsWith('/api/orders/qr-place')) {
        return res.status(403).json({
          subscriptionError: "pro_required",
          message: "Customer QR Self-Ordering is a Pro Plan feature. Upgrade to enable."
        });
      }

      // Basic Plan Block: Staff Dashboard APIs
      if (originalUrl.startsWith('/api/auth/staff')) {
        return res.status(403).json({
          subscriptionError: "pro_required",
          message: "Staff management and multiple terminals require a Pro Plan."
        });
      }

      // Basic Plan Block: Chatbot requests
      if (originalUrl.startsWith('/api/chatbot')) {
        return res.status(403).json({
          subscriptionError: "pro_required",
          message: "VexoAI Chatbot Assistant requires a Pro Plan."
        });
      }
    }

    next();
  } catch (error) {
    console.error('[Subscription Guard Middleware Error]', error);
    next();
  }
};

module.exports = { subscriptionGuard };
