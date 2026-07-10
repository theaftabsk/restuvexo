const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({
    where: { restaurantId: 1 },
    select: { id: true, status: true, creator: { select: { name: true } }, createdAt: true }
  });
  console.log(orders);
  process.exit(0);
}
main();
