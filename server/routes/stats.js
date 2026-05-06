const express = require('express');
const router = express.Router();
const redis = require('../redis');

const UPDATE_FASTEST = `
  local key = KEYS[1]
  local newTime = tonumber(ARGV[1])
  local cur = tonumber(redis.call('HGET', key, 'fastest'))
  if cur == nil or newTime < cur then
    redis.call('HSET', key, 'fastest', newTime)
  end
`;

async function recordLevelPlay(levelId, time) {
  const key = `cw:level:${levelId}:stats`;
  await Promise.all([
    redis.hincrby(key, 'plays', 1),
    redis.hincrbyfloat(key, 'timeSum', time),
    redis.eval(UPDATE_FASTEST, 1, key, time),
  ]);
}

// GET /api/stats/levels
router.get('/levels', async (req, res) => {
  try {
    const keys = await redis.keys('cw:level:*:stats');
    if (!keys.length) return res.json([]);

    const hashes = await Promise.all(keys.map(k => redis.hgetall(k)));

    const stats = keys
      .map((key, i) => {
        const levelId = key.replace('cw:level:', '').replace(':stats', '');
        const h = hashes[i] || {};
        const plays = parseInt(h.plays || '0', 10);
        const fastest = h.fastest != null ? parseFloat(h.fastest) : null;
        const timeSum = h.timeSum != null ? parseFloat(h.timeSum) : 0;
        const avg = plays > 0 ? Math.round((timeSum / plays) * 100) / 100 : null;
        return { level: levelId, plays, fastest, avg };
      })
      .sort((a, b) => a.level.localeCompare(b.level));

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;
module.exports.recordLevelPlay = recordLevelPlay;
