const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SaaS Subscription Plans...');

  const plans = [
    {
      name: 'Starter',
      price: 499.00,
      billingDays: 30,
      firstMonthPrice: 1.00,
      features: {
        posBilling: true,
        kot: true,
        orderManagement: true,
        basicReports: true,
        maxTables: 10,
        maxStaff: 3,
        kds: false,
        inventoryBOM: false,
        aiAssistant: false
      }
    },
    {
      name: 'Growth',
      price: 999.00,
      billingDays: 30,
      firstMonthPrice: 1.00,
      features: {
        posBilling: true,
        kot: true,
        orderManagement: true,
        advancedReports: true,
        maxTables: 30,
        maxStaff: 10,
        kds: true,
        inventoryBOM: true,
        aiAssistant: true,
        qrOrdering: true
      }
    },
    {
      name: 'Pro',
      price: 1999.00,
      billingDays: 30,
      firstMonthPrice: 1.00,
      features: {
        posBilling: true,
        kot: true,
        orderManagement: true,
        advancedReports: true,
        unlimitedTables: true,
        unlimitedStaff: true,
        kds: true,
        inventoryBOM: true,
        aiAssistant: true,
        qrOrdering: true,
        multiBranch: true,
        dedicatedSupport: true
      }
    }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: {
        price: p.price,
        billingDays: p.billingDays,
        firstMonthPrice: p.firstMonthPrice,
        features: p.features,
        isActive: true
      },
      create: {
        name: p.name,
        price: p.price,
        billingDays: p.billingDays,
        firstMonthPrice: p.firstMonthPrice,
        features: p.features,
        isActive: true
      }
    });
    console.log(`- Plan seeded: ${p.name} (₹${p.price}/mo, ₹${p.firstMonthPrice} first month)`);
  }

  // Ensure default restaurant has an active Growth subscription
  const restaurant = await prisma.restaurant.findFirst();
  if (restaurant) {
    const growthPlan = await prisma.plan.findUnique({ where: { name: 'Growth' } });
    if (growthPlan) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const sub = await prisma.subscription.upsert({
        where: { restaurantId: restaurant.id },
        update: {
          planId: growthPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingAt: periodEnd,
          amount: 1.00,
          renewalAmount: growthPlan.price,
          graceDays: 7
        },
        create: {
          restaurantId: restaurant.id,
          planId: growthPlan.id,
          status: 'ACTIVE',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingAt: periodEnd,
          amount: 1.00,
          renewalAmount: growthPlan.price,
          graceDays: 7,
          notes: 'Seeded initial ₹1 first month subscription'
        }
      });

      // Record first initial payment
      const paymentExists = await prisma.saasPayment.findFirst({
        where: { subscriptionId: sub.id }
      });

      if (!paymentExists) {
        await prisma.saasPayment.create({
          data: {
            restaurantId: restaurant.id,
            subscriptionId: sub.id,
            amount: 1.00,
            paymentMethod: 'UPI',
            status: 'SUCCESS',
            transactionId: `TXN_INIT_${Date.now()}`,
            gateway: 'Cashfree',
            notes: 'Initial ₹1 promo activation payment'
          }
        });
      }

      console.log(`- Subscription attached to restaurant "${restaurant.name}" (Active until ${periodEnd.toISOString().split('T')[0]})`);
    }
  }

  console.log('SaaS seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
