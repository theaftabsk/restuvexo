const prisma = require('../src/db');

async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`User ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, RestaurantID: ${u.restaurantId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
