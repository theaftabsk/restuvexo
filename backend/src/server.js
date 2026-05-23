const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Setup Socket.IO with CORS support
const allowedSocketOrigins = [
  'https://app.restuvexo.shop',
  'https://restuvexo.shop',
  'https://www.restuvexo.shop'
];

if (process.env.NODE_ENV !== 'production') {
  allowedSocketOrigins.push('http://localhost:3000');
  allowedSocketOrigins.push('http://app.localhost:3000');
}

if (process.env.FRONTEND_URL) {
  allowedSocketOrigins.push(process.env.FRONTEND_URL);
}

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      let isAllowed = allowedSocketOrigins.includes(origin);
      if (process.env.NODE_ENV !== 'production') {
        if (/^https?:\/\/([a-z0-9-]+)\.localhost:3000$/.test(origin)) {
          isAllowed = true;
        }
      }
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true
  }
});

// Real-time Event Subsystem
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join isolated room for each restaurant tenant
  socket.on('join_restaurant', (restaurantId) => {
    const roomName = `restaurant_${restaurantId}`;
    socket.join(roomName);
    console.log(`[Socket.io] Socket ${socket.id} joined room: ${roomName}`);
  });

  // Call Waiter Event
  socket.on('call_waiter', (data) => {
    // data: { restaurantId, tableNo }
    if (data.restaurantId && data.tableNo) {
      io.to(`restaurant_${data.restaurantId}`).emit('waiter_called', {
        tableNo: data.tableNo,
        timestamp: new Date()
      });
      console.log(`[Socket.io] Waiter called at Table ${data.tableNo} for Restaurant ${data.restaurantId}`);
    }
  });

  // KDS Alert (Order placed)
  socket.on('new_order_placed', (data) => {
    // data: { restaurantId, orderId, orderType }
    if (data.restaurantId) {
      io.to(`restaurant_${data.restaurantId}`).emit('kds_new_order', {
        orderId: data.orderId,
        orderType: data.orderType,
        timestamp: new Date()
      });
      console.log(`[Socket.io] KDS Alert: New order #${data.orderId} placed for Restaurant ${data.restaurantId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Attach Socket.io instance to Express App so controllers can trigger socket emissions
app.set('socketio', io);

server.listen(PORT, () => {
  console.log(`🚀 [ROS Backend] Running smoothly on port ${PORT}`);
});
