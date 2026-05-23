const jwt = require('jsonwebtoken');

const JWT_SECRET = "ros_super_secret_jwt_key_2026_itvexo";

async function main() {
  const token = jwt.sign(
    { id: 13, restaurantId: 5, role: 'owner', name: 'Demo Owner' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log("Fetching /api/orders?status=pending,cooking,ready&dateFilter=all&limit=100...");
  const res = await fetch("http://localhost:5000/api/orders?status=pending,cooking,ready&dateFilter=all&limit=100", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (res.ok) {
    const data = await res.json();
    console.log("Response Cache-Control Headers:", {
      'Cache-Control': res.headers.get('cache-control'),
      'Pragma': res.headers.get('pragma'),
      'Expires': res.headers.get('expires')
    });
    console.log("Orders response metadata:", {
      total: data.total,
      count: data.data ? data.data.length : 0
    });
    if (data.data) {
      for (const o of data.data) {
        console.log(`Order ID: ${o.id}, Status: ${o.status}, Creator: ${o.creator?.name}`);
      }
    }
  } else {
    console.error("Failed to fetch:", res.status, res.statusText);
  }
}

main().catch(console.error);
