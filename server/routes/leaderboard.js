const express = require('express');
const router = express.Router();
const redis = require('../redis');
const { recordLevelPlay } = require('./stats');

const TOP_N = 10;
const LEVEL_RE = /^[a-z0-9_-]+$/i;

function validate(body) {
  const { name, time, level } = body;
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 16)
    return 'name must be 1–16 characters';
  if (typeof time !== 'number' || !isFinite(time) || time <= 0)
    return 'time must be a positive number';
  if (typeof level !== 'string' || !LEVEL_RE.test(level) || level.length > 64)
    return 'level must be alphanumeric (dash/underscore allowed)';
  return null;
}

function lbKey(levelId) {
  return `cw:leaderboard:${levelId}`;
}

async function fetchTop(levelId) {
  const members = await redis.zrange(lbKey(levelId), 0, TOP_N - 1);
  return members.map(m => {
    const { ts, ...rest } = JSON.parse(m);
    return rest;
  });
}

// GET /api/leaderboard/:level
router.get('/:level', async (req, res) => {
  const { level } = req.params;
  if (!LEVEL_RE.test(level) || level.length > 64)
    return res.status(400).json({ error: 'Invalid level identifier' });

  try {
    res.json(await fetchTop(level));
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/leaderboard
router.post('/', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid submission', details: error });

  const { name, time, level } = req.body;
  const member = JSON.stringify({ name: name.trim(), time, ts: Date.now() });

  try {
    await redis.zadd(lbKey(level), time, member);
    await redis.zremrangebyrank(lbKey(level), TOP_N, -1);
    await recordLevelPlay(level, time);
    res.json(await fetchTop(level));
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;
