const prisma = require('../src/db');

async function test() {
  console.log("Checking connection and fetching data...");
  try {
    const restaurantCount = await prisma.restaurant.count();
    console.log("Restaurant count:", restaurantCount);

    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    const categories = await prisma.category.findMany();
    console.log("Categories found:", categories.length);

    const tables = await prisma.table.findMany();
    console.log("Tables found:", tables.length);
    for (const t of tables) {
      console.log(`Table ID: ${t.id}, Table No: ${t.tableNo}, QR Code: ${t.qrCode}`);
    }

    const settings = await prisma.restaurantSetting.findMany();
    console.log("Settings found:", settings.length);

  } catch (error) {
    console.error("Prisma error occurred:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Disconnected.");
  }
}

test();
