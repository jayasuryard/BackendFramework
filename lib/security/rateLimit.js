'use strict';

/**
 * rateLimit - in-memory sliding-window limiter keyed by client + method.
 * In production this can be swapped for a Redis-backed store; the interface
 * stays the same (check/consume).
 */
const buckets = new Map();

function key(identity, methodName) {
  return `${identity}::${methodName}`;
}

const RateLimiter = {
  windowMs: Number(process.env.RATE_WINDOW_MS || 60000),

  /**
   * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
   */
  consume(identity, methodName, limit) {
    if (!limit || limit <= 0) return { allowed: true, remaining: Infinity, resetMs: 0 };
    const now = Date.now();
    const k = key(identity, methodName);
    let bucket = buckets.get(k);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + this.windowMs };
      buckets.set(k, bucket);
    }
    bucket.count += 1;
    const allowed = bucket.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - bucket.count),
      resetMs: bucket.reset - now,
    };
  },

  reset() {
    buckets.clear();
  },
};

module.exports = RateLimiter;
