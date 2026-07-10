const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const restaurantId = 1;
  const pendingQrCount = await prisma.order.count({
    where: {
      restaurantId,
      status: 'pending',
      creator: {
        name: 'QR Customer'
      }
    }
  });
  const activeKdsCount = await prisma.order.count({
    where: {
      restaurantId,
      status: {
        in: ['pending', 'cooking', 'ready']
      },
      NOT: {
        creator: {
          name: 'QR Customer'
        }
      }
    }
  });
  console.log('pendingQrCount:', pendingQrCount);
  console.log('activeKdsCount:', activeKdsCount);
  process.exit(0);
}
main();
