const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.order.delete({ where: { id: 8 } }).then(() => {
  console.log('Test order 8 deleted');
  p.$disconnect();
}).catch(e => {
  console.log('Could not delete:', e.message);
  p.$disconnect();
});
