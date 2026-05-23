const prisma = require('../src/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "ros_super_secret_jwt_key_2026_restuvexo";

async function run() {
  console.log("Generating mock authentication token...");
  const user = await prisma.user.findFirst({
    where: { role: 'owner' }
  });
  if (!user) {
    console.error("No owner user found in database! Please seed or register first.");
    return;
  }
  console.log(`Found owner user: ID=${user.id}, Name="${user.name}", RestaurantID=${user.restaurantId}`);

  const token = jwt.sign(
    { 
      id: user.id, 
      restaurantId: user.restaurantId, 
      role: user.role, 
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log("Token generated successfully.\n");

  const endpoints = [
    { name: "Categories", url: "http://localhost:5000/api/menu/categories" },
    { name: "Tables", url: "http://localhost:5000/api/tables" },
    { name: "Settings", url: "http://localhost:5000/api/tables/settings" },
    { name: "Menu Items", url: "http://localhost:5000/api/menu/menu-items?limit=200" }
  ];

  for (const endpoint of endpoints) {
    console.log(`Fetching endpoint [${endpoint.name}] from: ${endpoint.url}`);
    const start = Date.now();
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const duration = Date.now() - start;
      console.log(`Status: ${response.status} (${response.statusText}) in ${duration}ms`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Data preview for [${endpoint.name}]:`, Array.isArray(data) ? `Array with ${data.length} items` : typeof data === 'object' ? Object.keys(data) : data);
      } else {
        const text = await response.text();
        console.log("Response text:", text);
      }
    } catch (e) {
      console.error(`Error fetching [${endpoint.name}]:`, e.message);
    }
    console.log("------------------------------------------\n");
  }

  await prisma.$disconnect();
  console.log("Done.");
}

run();
