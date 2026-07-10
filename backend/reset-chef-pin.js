const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const chef = await p.user.findUnique({
    where: { loginId: '01800000000' }
  });

  if (!chef) {
    console.log('Chef user not found in DB!');
    p.$disconnect();
    return;
  }

  // Hash '0000'
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('0000', salt);

  // Update chef user
  await p.user.update({
    where: { id: chef.id },
    data: {
      passwordHash: hash
    }
  });

  console.log('Successfully set Demo Chef PIN/Password to "0000"!');
  p.$disconnect();
}

main();
