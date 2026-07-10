const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const waiter = await p.user.findUnique({
    where: { loginId: '01700000000' }
  });

  if (!waiter) {
    console.log('Waiter user not found in DB!');
    p.$disconnect();
    return;
  }

  // Hash '0000'
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('0000', salt);

  // Update waiter user
  await p.user.update({
    where: { id: waiter.id },
    data: {
      passwordHash: hash
    }
  });

  console.log('Successfully set Demo Waiter PIN/Password to "0000"!');
  p.$disconnect();
}

main();
