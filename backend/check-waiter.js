const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, name: true, loginId: true, role: true }
  });
  console.log('Existing users:', users);
  p.$disconnect();
}
main();
