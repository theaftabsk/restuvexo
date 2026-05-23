const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Indian Bistro database seeding process...');

  // 1. Clean existing records to prevent unique constraints issues
  console.log('🧹 Clearing old demo database entries...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.restaurant.deleteMany({});

  // 2. Create Indian Restaurant
  console.log('🏢 Creating demo restaurant "RESTUVEXO Indian Bistro"...');
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "RESTUVEXO Indian Bistro",
      phone: "+91 98765 43210",
      email: "demo@restuvexo.shop",
      address: "Plot 42, Sector 5, HSR Layout, Bengaluru, Karnataka, 560102, India"
    }
  });

  // 3. Encrypt Passwords & PINs
  const passwordHash = await bcrypt.hash("password123", 10);
  const pinHash = await bcrypt.hash("0000", 10); // Standard security PIN for POS overrides

  // 4. Create Owner Administrator (Demo Login Credentials)
  console.log('👤 Creating Owner Admin user with all features active...');
  const ownerUser = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: "Demo Owner",
      role: "owner",
      loginId: "demo@restuvexo.shop",
      passwordHash: passwordHash,
      pinHash: pinHash,
      status: "active"
    }
  });

  // 4b. Create Demo Waiter User
  console.log('👤 Creating Demo Waiter user for testing mobile terminal...');
  await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: "Demo Waiter",
      role: "waiter",
      loginId: "01700000000",
      passwordHash: passwordHash,
      pinHash: pinHash,
      status: "active"
    }
  });

  // 4c. Create Demo Chef User
  console.log('👤 Creating Demo Chef user for testing kitchen terminal...');
  await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: "Demo Chef",
      role: "kitchen",
      loginId: "01800000000",
      passwordHash: passwordHash,
      pinHash: pinHash,
      status: "active"
    }
  });

  // 5. Seed dining tables
  console.log('🍽️ Seeding dining tables Table 1 -> Table 6...');
  const tables = [];
  const tableNames = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"];
  
  for (let i = 0; i < tableNames.length; i++) {
    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNo: tableNames[i],
        qrCode: `qr_rest_${restaurant.id}_${i + 1}`,
        status: i === 2 || i === 4 ? "occupied" : "free" // Mark table 3 and 5 occupied for active orders
      }
    });
    tables.push(table);
  }

  // 6. Seed Food Categories (Indian Specialties)
  console.log('📂 Seeding Indian food categories...');
  const catStarters = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Indian Tandoor & Starters" }
  });
  const catCurries = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Royal Curries (Main Course)" }
  });
  const catBiryani = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Hyderabadi Dum Biryani" }
  });
  const catBreads = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Indian Tandoori Breads" }
  });
  const catDrinks = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Beverages & Lassi" }
  });

  // 7. Seed Indian Food Menu Items with stock quantities
  console.log('🍲 Seeding popular Indian menu dishes list...');
  
  // Starters
  const itemSamosa = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catStarters.id,
      name: "Paneer Tikka Samosa Platter",
      price: 120.00,
      stockQty: 80,
      isAvailable: true
    }
  });

  const itemChickenTikka = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catStarters.id,
      name: "Classic Tandoori Chicken Tikka",
      price: 240.00,
      stockQty: 50,
      isAvailable: true
    }
  });

  // Curries
  const itemPaneerButter = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catCurries.id,
      name: "Rich Paneer Butter Masala",
      price: 280.00,
      stockQty: 90,
      isAvailable: true
    }
  });

  const itemChickenTikkaMasala = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catCurries.id,
      name: "Highway Chicken Tikka Masala",
      price: 320.00,
      stockQty: 6, // Low Stock item for visual warning alerts!
      isAvailable: true
    }
  });

  // Biryanis
  const itemKacchi = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBiryani.id,
      name: "Hyderabadi Mutton Dum Biryani",
      price: 390.00,
      stockQty: 100,
      isAvailable: true
    }
  });

  const itemVegBiryani = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBiryani.id,
      name: "Nizami Royal Vegetable Biryani",
      price: 240.00,
      stockQty: 45,
      isAvailable: true
    }
  });

  // Breads
  const itemButterNaan = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBreads.id,
      name: "Garlic Butter Naan (Freshly Baked)",
      price: 50.00,
      stockQty: 250,
      isAvailable: true
    }
  });

  // Drinks
  const itemLassi = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catDrinks.id,
      name: "Punjabi Kesar Sweet Lassi",
      price: 80.00,
      stockQty: 60,
      isAvailable: true
    }
  });

  // 8. Seed 3 Live Active Orders for Instant KDS and Cashier Simulation!
  console.log('🧾 Seeding active live orders into kitchen queues...');
  
  // Order 1: Pending Dine-In (Table 3)
  const order1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      createdBy: ownerUser.id,
      tableId: tables[2].id, // Table 3
      orderType: "dine_in",
      subtotal: 780.00,
      discountApplied: 0.00,
      totalAmount: 780.00,
      status: "pending",
      paymentStatus: "unpaid",
      orderItems: {
        create: [
          { menuItemId: itemKacchi.id, qty: 2, price: 390.00, note: "Make double spicy, serve with Raita" }
        ]
      }
    }
  });

  // Order 2: Cooking Dine-In (Table 5)
  const order2 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      createdBy: ownerUser.id,
      tableId: tables[4].id, // Table 5
      orderType: "dine_in",
      subtotal: 600.00,
      discountApplied: 0.00,
      totalAmount: 600.00,
      status: "cooking",
      paymentStatus: "unpaid",
      orderItems: {
        create: [
          { menuItemId: itemPaneerButter.id, qty: 1, price: 280.00, note: "Less oil" },
          { menuItemId: itemChickenTikkaMasala.id, qty: 1, price: 320.00, note: "" }
        ]
      }
    }
  });

  // Order 3: Ready Takeaway Order (Waiting for payment/delivery)
  const order3 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      createdBy: ownerUser.id,
      tableId: null,
      orderType: "takeaway",
      subtotal: 440.00,
      discountApplied: 40.00, // Manager PIN unlocked discount applied
      totalAmount: 400.00,
      status: "ready",
      paymentStatus: "paid",
      paymentMethod: "cash",
      orderItems: {
        create: [
          { menuItemId: itemSamosa.id, qty: 1, price: 120.00, note: "Serve hot with green chutney" },
          { menuItemId: itemChickenTikka.id, qty: 1, price: 240.00, note: "" },
          { menuItemId: itemLassi.id, qty: 1, price: 80.00, note: "Cold" }
        ]
      }
    }
  });

  console.log('🚀 Seeding completed successfully!');
  console.log('========================================================');
  console.log('   🎉 DEMO LOGIN CREDENTIALS REGISTERED SUCCESSFULLY!');
  console.log('   📧 Email:    demo@restuvexo.shop');
  console.log('   🔑 Password: password123');
  console.log('   🔒 POS PIN:  0000 (To unlock manager custom discounts)');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
