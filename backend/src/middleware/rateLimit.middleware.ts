import rateLimit from 'express-rate-limit';

// Key generator using IP + Table Number so customers sharing a cafe Wi-Fi NAT IP aren't blocked
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 orders per table/IP per 15 mins
  keyGenerator: (req) => {
    const table = req.body?.tableNumber || 'counter';
    return `${req.ip || 'unknown'}-${table}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many orders placed from this table. Please wait before ordering again.' }
});

// Auth limiter for login attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 login attempts per IP per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});
