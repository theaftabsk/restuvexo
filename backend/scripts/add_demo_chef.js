const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding Demo Chef/Kitchen staff user to the database...');

  // 1. Find the demo restaurant
  const restaurant = await prisma.restaurant.findFirst({
    where: { email: 'demo@restuvexo.shop' }
  });

  if (!restaurant) {
    console.error('❌ Demo restaurant not found! Please make sure your database is seeded.');
    process.exit(1);
  }

  // 2. Hash passwords & PINs
  const passwordHash = await bcrypt.hash("password123", 10);
  const pinHash = await bcrypt.hash("0000", 10);

  // 3. Upsert Demo Chef User
  const demoChef = await prisma.user.upsert({
    where: { loginId: '01800000000' },
    update: {
      restaurantId: restaurant.id,
      name: "Demo Chef",
      role: "kitchen",
      passwordHash: passwordHash,
      pinHash: pinHash,
      status: "active"
    },
    create: {
      restaurantId: restaurant.id,
      name: "Demo Chef",
      role: "kitchen",
      loginId: "01800000000",
      passwordHash: passwordHash,
      pinHash: pinHash,
      status: "active"
    }
  });

  console.log('========================================================');
  console.log('   🎉 DEMO CHEF REGISTERED IN DATABASE SUCCESSFULLY!');
  console.log('   👤 Name:     ' + demoChef.name);
  console.log('   📞 loginId:  01800000000');
  console.log('   🔒 PIN:      0000');
  console.log('   🏢 Restro:   ' + restaurant.name);
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo chef:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
