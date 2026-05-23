require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');

const path = require('path');

const app = express();

// Trust the first proxy hop (Hostinger/nginx reverse proxy)
// Required for express-rate-limit to correctly identify real client IPs
// from the X-Forwarded-For header, otherwise all users appear as 127.0.0.1
app.set('trust proxy', 1);

// Secure HTTP response headers
app.use(helmet());

// Dynamic CORS configurations supporting subdomains
const allowedOrigins = [
  'https://app.restuvexo.shop',
  'https://restuvexo.shop',
  'https://www.restuvexo.shop'
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://app.localhost:3000');
}

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    let isAllowed = allowedOrigins.includes(origin);
    
    // In non-production, allow localhost subdomains
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
  credentials: true
}));

app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Disable HTTP caching for all API endpoints to guarantee real-time fresh telemetry and states
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const { subscriptionGuard } = require('./middleware/subscriptionGuard');
app.use('/api', subscriptionGuard);

// Lightweight Request Logger for easy debugging and zero overhead
app.use((req, res, next) => {
  console.log(`🌐 [ROS API] ${req.method} ${req.url}`);
  next();
});

// Health Check API
app.get('/', (req, res) => {
  res.json({
    status: "active",
    message: "RESTUVEXO Restaurant Operating System (ROS) API Server is running.",
    version: "1.0.0",
    timestamp: new Date()
  });
});

// Core API Router Registrations with Rate Limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/menu', apiLimiter, require('./routes/menuRoutes'));
app.use('/api/orders', apiLimiter, require('./routes/orderRoutes'));
app.use('/api/tables', apiLimiter, require('./routes/tableRoutes'));
app.use('/api/inventory', apiLimiter, require('./routes/inventoryRoutes'));
app.use('/api/dashboard', apiLimiter, require('./routes/dashboardRoutes'));
app.use('/api/expenses', apiLimiter, require('./routes/expenseRoutes'));
app.use('/api/upload', apiLimiter, require('./routes/uploadRoutes'));
app.use('/api/demo', apiLimiter, require('./routes/demoRoutes'));
app.use('/api/chatbot', apiLimiter, require('./routes/chatbotRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err.stack);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "An unexpected error occurred." 
  });
});

module.exports = app;
