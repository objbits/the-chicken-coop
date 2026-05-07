const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err) => console.error('[redis] error:', err.message));

module.exports = redis;
