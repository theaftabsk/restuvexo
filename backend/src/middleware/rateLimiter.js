const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (signup, login, OTP verify, password reset)
// Limits each IP to 20 requests per 15 minutes to prevent brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 min per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many authentication requests from this IP. Please try again after 15 minutes."
  }
});

// General api rate limiter for non-auth requests.
// Restaurant dashboard makes ~10 API calls per page load (sidebar, stats, menu items,
// tables, orders etc). 500 per 15 min = ~33 full page navigations before hitting limit.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP. Please try again later."
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
