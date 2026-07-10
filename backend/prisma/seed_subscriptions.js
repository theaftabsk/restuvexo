const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Restuvexo Enterprise subscription plan system...');

  // 1. Clean existing records
  await prisma.subscriptionHistory.deleteMany({});
  await prisma.subscriptionAddon.deleteMany({});
  await prisma.paymentProfile.deleteMany({});
  await prisma.restaurantSubscription.deleteMany({});
  await prisma.planFeature.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.addon.deleteMany({});
  await prisma.usageMetric.deleteMany({});

  // 2. Create Features
  console.log('✨ Creating core features catalog...');
  const fInventory = await prisma.feature.create({
    data: { code: 'inventory', name: 'Inventory & Recipe Tracking', description: 'Real-time stock checking, costing, BOM, and waste tracking.' }
  });
  const fQrOrdering = await prisma.feature.create({
    data: { code: 'qr_ordering', name: 'Table QR Self-Ordering', description: 'Generate QR codes for tables and allow customer checkout.' }
  });
  const fKds = await prisma.feature.create({
    data: { code: 'kds', name: 'Digital KDS Monitors', description: 'Kitchen queue display terminals with status routing.' }
  });
  const fAnalytics = await prisma.feature.create({
    data: { code: 'advanced_analytics', name: 'Advanced Profit & Telemetry Analytics', description: 'Comprehensive reports on profits, tax, and sales.' }
  });
  const fMultiBranch = await prisma.feature.create({
    data: { code: 'multi_branch', name: 'Multi-Branch & Franchise Consolidation', description: 'Manage warehouses, central menu, and branch operations.' }
  });

  // 3. Create Subscription Plans
  console.log('🎟️ Creating billing tiers...');
  const pStarter = await prisma.subscriptionPlan.create({
    data: {
      name: 'Starter',
      priceMonthly: 499.00,
      priceYearly: 4990.00,
      maxTables: 1,
      maxStaff: 2,
      maxKds: 0,
      maxDailyOrders: 30
    }
  });

  const pGrowth = await prisma.subscriptionPlan.create({
    data: {
      name: 'Growth',
      priceMonthly: 1499.00,
      priceYearly: 14990.00,
      maxTables: 15,
      maxStaff: 5,
      maxKds: 1,
      maxDailyOrders: 99999
    }
  });

  const pPro = await prisma.subscriptionPlan.create({
    data: {
      name: 'Pro',
      priceMonthly: 2499.00,
      priceYearly: 24990.00,
      maxTables: 9999,
      maxStaff: 20,
      maxKds: 4,
      maxDailyOrders: 99999
    }
  });

  const pEnterprise = await prisma.subscriptionPlan.create({
    data: {
      name: 'Enterprise',
      priceMonthly: 3999.00,
      priceYearly: 39990.00,
      maxTables: 9999,
      maxStaff: 9999,
      maxKds: 9999,
      maxDailyOrders: 99999
    }
  });

  // 4. Map Features to Plans
  console.log('🔗 Mapping features to plans...');
  
  // Growth Plan Features
  await prisma.planFeature.create({ data: { planId: pGrowth.id, featureId: fQrOrdering.id } });

  // Pro Plan Features
  await prisma.planFeature.create({ data: { planId: pPro.id, featureId: fInventory.id } });
  await prisma.planFeature.create({ data: { planId: pPro.id, featureId: fQrOrdering.id } });
  await prisma.planFeature.create({ data: { planId: pPro.id, featureId: fKds.id } });
  await prisma.planFeature.create({ data: { planId: pPro.id, featureId: fAnalytics.id } });

  // Enterprise Plan Features (All features)
  await prisma.planFeature.create({ data: { planId: pEnterprise.id, featureId: fInventory.id } });
  await prisma.planFeature.create({ data: { planId: pEnterprise.id, featureId: fQrOrdering.id } });
  await prisma.planFeature.create({ data: { planId: pEnterprise.id, featureId: fKds.id } });
  await prisma.planFeature.create({ data: { planId: pEnterprise.id, featureId: fAnalytics.id } });
  await prisma.planFeature.create({ data: { planId: pEnterprise.id, featureId: fMultiBranch.id } });

  // 5. Create Addons Catalog
  console.log('🛍️ Creating addons catalog...');
  await prisma.addon.create({ data: { code: 'extra_staff', name: 'Extra Staff Seat', price: 100.00, unitType: 'per_seat' } });
  await prisma.addon.create({ data: { code: 'extra_kds', name: 'Extra KDS Terminal Screen', price: 200.00, unitType: 'per_seat' } });
  await prisma.addon.create({ data: { code: 'whatsapp_bot', name: 'WhatsApp Billing Bot Integration', price: 499.00, unitType: 'flat' } });

  // 6. Link Existing Restaurants to Pro Active Subscriptions
  console.log('🏢 Linking existing restaurants to Pro plan...');
  const restaurants = await prisma.restaurant.findMany();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year active subscription

  for (const rest of restaurants) {
    await prisma.restaurantSubscription.create({
      data: {
        restaurantId: rest.id,
        planId: pPro.id,
        status: 'active',
        billingPeriod: 'yearly',
        startDate: new Date(),
        endDate: endDate,
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Populate usage metric counters
    await prisma.usageMetric.create({
      data: { restaurantId: rest.id, metric: 'daily_orders', currentValue: 0, period: 'daily' }
    });
  }

  console.log('✅ Subscription seeding process complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
