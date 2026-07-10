const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Place a test pending order for restaurant 1
  const owner = await p.user.findFirst({ where: { role: 'owner', restaurantId: 1 } });
  const menuItem = await p.menuItem.findFirst({ where: { restaurantId: 1 } });
  const table = await p.table.findFirst({ where: { restaurantId: 1 } });

  if (!owner || !menuItem) {
    console.log('Missing owner or menu item');
    return;
  }

  const order = await p.order.create({
    data: {
      restaurantId: 1,
      createdBy: owner.id,
      tableId: table ? table.id : null,
      orderType: 'dine_in',
      paymentStatus: 'unpaid',
      status: 'pending',
      subtotal: parseFloat(menuItem.price.toString()),
      discountApplied: 0,
      totalAmount: parseFloat(menuItem.price.toString()),
      totalCost: parseFloat(menuItem.costPrice.toString()),
      totalProfit: parseFloat(menuItem.price.toString()) - parseFloat(menuItem.costPrice.toString()),
      orderItems: {
        create: [{
          menuItemId: menuItem.id,
          qty: 1,
          price: menuItem.price,
          costPrice: menuItem.costPrice,
          note: ''
        }]
      }
    }
  });

  console.log('Created test order ID:', order.id, '| Status:', order.status);
  
  // Now check activeKdsCount
  const count = await p.order.count({
    where: {
      restaurantId: 1,
      status: { in: ['pending', 'cooking', 'ready'] },
      NOT: { creator: { name: 'QR Customer' } }
    }
  });
  console.log('activeKdsCount should now be:', count);
  
  await p.$disconnect();
}

main();
