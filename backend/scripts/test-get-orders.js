const prisma = require('../src/db');

async function main() {
  console.log("Fetching all orders in the database...");
  const allOrders = await prisma.order.findMany({
    include: {
      creator: true,
      table: true
    }
  });
  console.log("Total orders in DB:", allOrders.length);
  for (const o of allOrders) {
    console.log(`ID: ${o.id}, RestaurantID: ${o.restaurantId}, Status: ${o.status}, Creator: ${o.creator?.name}, CreatorRole: ${o.creator?.role}, CreatorPhone/loginId: ${o.creator?.loginId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
