const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findFirst({
  where: { role: 'owner', restaurantId: 1 },
  select: { id: true, name: true, role: true, restaurantId: true }
}).then(u => {
  console.log(JSON.stringify(u));
  p.$disconnect();
});
