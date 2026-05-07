const express = require('express');
const path = require('path');
const fs = require('fs');
const redis = require('../redis');

const router = express.Router();
const UNOFFICIAL_DIR = path.join(__dirname, '..', '..', 'games', 'unofficial-maps');
const MAPS_DIR = path.join(__dirname, '..', '..', 'games', 'maps');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_CODE = /^[A-Z0-9]{6}$/;
const VALID_KEY  = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function generateCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

async function uniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    if (!fs.existsSync(path.join(UNOFFICIAL_DIR, `${code}.json`)) &&
        !fs.existsSync(path.join(MAPS_DIR, `${code}.json`))) return code;
  }
  throw new Error('Could not generate unique code');
}

// GET /api/unofficial/my-levels — list all levels for a creator key (official + unofficial)
router.get('/my-levels', async (req, res) => {
  const creatorKey = (req.query.creatorKey || '').toUpperCase();
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const codes = await redis.smembers(`cw:creator:${creatorKey}`);
    const levels = await Promise.all(codes.map(async code => {
      const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
      const official = meta.official === '1';
      const mapPath = official
        ? path.join(MAPS_DIR, `${code}.json`)
        : path.join(UNOFFICIAL_DIR, `${code}.json`);

      if (!fs.existsSync(mapPath)) return null;
      try {
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        return {
          code,
          name:          map.name          || code,
          author:        map.author        || '',
          description:   map.description   || '',
          chandlerSpeed: map.chandlerSpeed  || 75,
          diff:          map.diff           || 1,
          official,
          locked:        meta.locked === '1',
          submittedAt:   meta.submittedAt   || null,
        };
      } catch { return null; }
    }));
    res.json(levels.filter(Boolean));
  } catch (err) {
    console.error('[unofficial] my-levels error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/unofficial/:code — load a draft (creator key required)
router.get('/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = (req.query.creatorKey || '').toUpperCase();
  if (!VALID_CODE.test(code))   return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    const official = meta.official === '1';
    const mapPath = official
      ? path.join(MAPS_DIR, `${code}.json`)
      : path.join(UNOFFICIAL_DIR, `${code}.json`);

    if (!fs.existsSync(mapPath)) return res.status(404).json({ error: 'not found' });
    res.json(JSON.parse(fs.readFileSync(mapPath, 'utf8')));
  } catch (err) {
    console.error('[unofficial] get error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial — create or update a draft
router.post('/', async (req, res) => {
  const { creatorKey: rawKey, code: rawCode, mapData } = req.body;
  const creatorKey = (rawKey || '').toUpperCase();
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });
  if (!mapData || typeof mapData !== 'object') return res.status(400).json({ error: 'missing map data' });

  try {
    if (!rawCode) {
      // New draft
      const code = await uniqueCode();
      fs.writeFileSync(path.join(UNOFFICIAL_DIR, `${code}.json`), JSON.stringify(mapData, null, 2));
      await redis.set(`cw:map:${code}:creator`, creatorKey);
      await redis.hset(`cw:map:${code}:meta`, 'locked', '0', 'official', '0');
      await redis.sadd(`cw:creator:${creatorKey}`, code);
      return res.json({ code });
    }

    // Update existing draft
    const code = rawCode.toUpperCase();
    if (!VALID_CODE.test(code)) return res.status(400).json({ error: 'invalid code' });

    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const locked = await redis.hget(`cw:map:${code}:meta`, 'locked');
    if (locked === '1') return res.status(403).json({ error: 'locked' });

    const mapPath = path.join(UNOFFICIAL_DIR, `${code}.json`);
    if (!fs.existsSync(mapPath)) return res.status(404).json({ error: 'not found' });

    fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2));
    res.json({ code });
  } catch (err) {
    console.error('[unofficial] post error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial/:code/submit — lock a draft for review
router.post('/:code/submit', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = ((req.body && req.body.creatorKey) || '').toUpperCase();
  if (!VALID_CODE.test(code))      return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    await redis.hset(`cw:map:${code}:meta`, 'locked', '1', 'submittedAt', new Date().toISOString());
    res.json({ code, locked: true });
  } catch (err) {
    console.error('[unofficial] submit error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
