const NodeCache = require('node-cache');
const { getRedisClient, isRedisReady } = require('../config/redis');

// node-cache acts as the local fallback
const localCache = new NodeCache({ stdTTL: 300 });

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS) || 300;

// ─── Core helpers ──────────────────────────────────────────────────────────────

const cacheGet = async (key) => {
  if (isRedisReady()) {
    try {
      const val = await getRedisClient().get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.warn('[Cache] Redis get error, falling back to local:', err.message);
    }
  }
  return localCache.get(key) || null;
};

const cacheSet = async (key, data, ttl = DEFAULT_TTL) => {
  if (isRedisReady()) {
    try {
      await getRedisClient().setEx(key, ttl, JSON.stringify(data));
      return;
    } catch (err) {
      console.warn('[Cache] Redis set error, falling back to local:', err.message);
    }
  }
  localCache.set(key, data, ttl);
};

const cacheDel = async (key) => {
  if (isRedisReady()) {
    try {
      await getRedisClient().del(key);
    } catch (err) {
      console.warn('[Cache] Redis del error:', err.message);
    }
  }
  localCache.del(key);
};

const cacheFlush = async () => {
  if (isRedisReady()) {
    try {
      await getRedisClient().flushDb();
    } catch (err) {
      console.warn('[Cache] Redis flush error:', err.message);
    }
  }
  localCache.flushAll();
};

// ─── Express middleware ────────────────────────────────────────────────────────

/**
 * Cache middleware — checks Redis (or node-cache fallback) before hitting the DB.
 * @param {string} key  Optional explicit cache key; defaults to req.originalUrl
 * @param {number} ttl  TTL in seconds; defaults to CACHE_TTL_SECONDS env var or 300
 */
const cacheMiddleware = (key, ttl) => {
  return async (req, res, next) => {
    const cacheKey = key || req.originalUrl;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      const backend = isRedisReady() ? 'Redis' : 'local';
      console.log(`[Cache] HIT (${backend}): ${cacheKey}`);
      return res.json(cached);
    }

    // Override res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      await cacheSet(cacheKey, data, ttl || DEFAULT_TTL);
      return originalJson(data);
    };

    next();
  };
};

// ─── Public API (backwards-compatible names) ──────────────────────────────────

/** @deprecated Use cacheSet instead (async) */
const setCache = (key, data, ttl) => cacheSet(key, data, ttl);

/** Clears a specific key or flushes all cache */
const clearCache = (key) => (key ? cacheDel(key) : cacheFlush());

module.exports = {
  cacheMiddleware,
  setCache,
  clearCache,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheFlush
};
