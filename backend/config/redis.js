const { createClient } = require('redis');

let redisClient = null;
let isRedisAvailable = false;

/**
 * Attempts to connect to Redis. If Redis is not running or not installed,
 * it fails silently and the cache layer falls back to node-cache.
 */
const connectRedis = async () => {
  try {
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        connectTimeout: 3000,     // 3 s timeout — fail fast if Redis is absent
        reconnectStrategy: (retries) => {
          if (retries >= 3) {
            console.warn('[Redis] Max reconnect attempts reached. Using node-cache fallback.');
            return false; // stop retrying
          }
          return Math.min(retries * 200, 1000);
        }
      },
      password: process.env.REDIS_PASSWORD || undefined
    });

    client.on('error', (err) => {
      if (isRedisAvailable) {
        console.warn('[Redis] Connection lost:', err.message, '— falling back to node-cache');
        isRedisAvailable = false;
      }
    });

    client.on('ready', () => {
      console.log('[Redis] ✅ Connected and ready');
      isRedisAvailable = true;
    });

    await client.connect();
    redisClient = client;
  } catch (err) {
    console.warn('[Redis] ⚠️  Not available:', err.message);
    console.warn('[Redis] Using node-cache as fallback. Install Redis for persistent caching.');
    isRedisAvailable = false;
    redisClient = null;
  }
};

const getRedisClient = () => redisClient;
const isRedisReady = () => isRedisAvailable;

module.exports = { connectRedis, getRedisClient, isRedisReady };
