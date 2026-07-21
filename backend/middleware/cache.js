const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL

const cacheMiddleware = (key) => {
  return (req, res, next) => {
    const cacheKey = key || req.originalUrl;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json(cachedData);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data) {
      cache.set(cacheKey, data);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

const setCache = (key, data, ttl) => {
  cache.set(key, data, ttl);
};

const clearCache = (key) => {
  if (key) {
    cache.del(key);
  } else {
    cache.flushAll();
  }
};

module.exports = {
  cacheMiddleware,
  setCache,
  clearCache
};
