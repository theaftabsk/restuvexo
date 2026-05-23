const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || "ros_super_secret_jwt_key_2026_restuvexo";

// Lightweight TTL cache for session verification to reduce DB load
const verificationCache = new Map();
const CACHE_TTL_MS = 30000; // Cache verification result for 30 seconds

// Authenticate Bearer Token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Access Denied. No token provided or token is malformed." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded) {
      if (decoded.id) decoded.id = parseInt(decoded.id);
      if (decoded.restaurantId) decoded.restaurantId = parseInt(decoded.restaurantId);
    }

    // Bulletproof Seed Check: Verify restaurant and user still exist in seeded db
    if (decoded && decoded.restaurantId && decoded.id) {
      const cacheKey = `${decoded.restaurantId}-${decoded.id}`;
      const cached = verificationCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        if (!cached.valid) {
          return res.status(401).json({ 
            error: "Session expired or database seeded. Please log out and log in again." 
          });
        }
      } else {
        // Query only the 'id' field to minimize transfer size and DB load
        const restaurantExists = await prisma.restaurant.findUnique({
          where: { id: decoded.restaurantId },
          select: { id: true }
        });
        const userExists = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true }
        });

        const valid = !!(restaurantExists && userExists);
        verificationCache.set(cacheKey, { valid, timestamp: Date.now() });

        if (!valid) {
          return res.status(401).json({ 
            error: "Session expired or database seeded. Please log out and log in again." 
          });
        }
      }
    }

    req.user = decoded; // Contains: { id, restaurantId, role, name }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden. Invalid or expired token." });
  }
};

// Check staff roles for specific endpoints
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated. User session missing." });
    }

    const userRole = req.user.role; // 'owner', 'waiter', 'kitchen'

    // Owner has master authority and can bypass any staff-level restrictions
    if (userRole === 'owner') {
      return next();
    }

    // Check if the current user role is permitted
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      error: "Access Denied. You do not have the required permissions to perform this action." 
    });
  };
};

module.exports = {
  authenticate,
  checkRole
};
