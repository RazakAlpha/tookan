// src/middleware/rateLimiter.js
// Simple in-memory rate limiter (swap for Redis in production)

const buckets = new Map();

function rateLimiter({ windowMs = 60000, max = 60, keyFn = null } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();

    if (!buckets.has(key)) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const bucket = buckets.get(key);

    if (now > bucket.resetAt) {
      bucket.count = 1;
      bucket.resetAt = now + windowMs;
      return next();
    }

    if (bucket.count >= max) {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Limit: ${max} per ${windowMs / 1000}s`,
          retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        },
      });
      return;
    }

    bucket.count++;
    next();
  };
}

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt + 60000) buckets.delete(key);
  }
}, 300000).unref();

module.exports = { rateLimiter };
