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

function metaToFields(meta = {}) {
  const official = meta.official === '1';
  return {
    // An official map has been published; the lock state no longer carries
    // meaning for the creator, so flatten it.
    locked:          !official && meta.locked === '1',
    official,
    verified:        meta.verified === '1',
    verifiedTime:    meta.verifiedTime ? Number(meta.verifiedTime) : null,
    verifiedAt:      meta.verifiedAt   || null,
    submittedAt:     meta.submittedAt  || null,
    rejected:        meta.rejected === '1',
    rejectedAt:      meta.rejectedAt   || null,
    rejectionReason: meta.rejectionReason || null,
  };
}

// GET /api/unofficial/my-levels — list all levels for a creator key (official + unofficial)
router.get('/my-levels', async (req, res) => {
  const creatorKey = (req.query.creatorKey || '').toUpperCase();
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const codes = await redis.smembers(`cw:creator:${creatorKey}`);
    const levels = await Promise.all(codes.map(async code => {
      const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
      const m = metaToFields(meta);
      const mapPath = m.official
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
          ...m,
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
    const m = metaToFields(meta);
    const mapPath = m.official
      ? path.join(MAPS_DIR, `${code}.json`)
      : path.join(UNOFFICIAL_DIR, `${code}.json`);

    if (!fs.existsSync(mapPath)) return res.status(404).json({ error: 'not found' });
    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    res.json({ ...mapData, _meta: m });
  } catch (err) {
    console.error('[unofficial] get error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial — create or update a draft
//
// Saving a draft invalidates any prior playthrough verification — the map may
// have changed in ways that make it unbeatable, so the creator must re-prove.
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
      await redis.hset(`cw:map:${code}:meta`,
        'locked',   '0',
        'official', '0',
        'verified', '0',
        'rejected', '0',
      );
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
    // Invalidate prior playthrough verification — the map just changed.
    await redis.hset(`cw:map:${code}:meta`, 'verified', '0');
    await redis.hdel(`cw:map:${code}:meta`, 'verifiedAt', 'verifiedTime');
    res.json({ code });
  } catch (err) {
    console.error('[unofficial] post error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial/:code/verify — record that the creator beat their own level
//
// The win condition runs in the browser, so this is a record of trust ("creator
// claims to have beaten it"), not a cryptographic proof. Its purpose is to gate
// submission on a real playthrough and give admin a "creator beat in N seconds"
// signal — not to defeat a determined cheater.
router.post('/:code/verify', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = ((req.body && req.body.creatorKey) || '').toUpperCase();
  const time = Number(req.body && req.body.time);
  if (!VALID_CODE.test(code))      return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });
  if (!Number.isFinite(time) || time <= 0) return res.status(400).json({ error: 'invalid time' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const locked = await redis.hget(`cw:map:${code}:meta`, 'locked');
    if (locked === '1') return res.status(403).json({ error: 'locked' });

    await redis.hset(`cw:map:${code}:meta`,
      'verified',     '1',
      'verifiedAt',   new Date().toISOString(),
      'verifiedTime', String(time),
    );
    res.json({ code, verified: true, verifiedTime: time });
  } catch (err) {
    console.error('[unofficial] verify error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial/:code/submit — lock a verified draft for review
router.post('/:code/submit', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = ((req.body && req.body.creatorKey) || '').toUpperCase();
  if (!VALID_CODE.test(code))      return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    if (meta.locked === '1') return res.status(409).json({ error: 'already submitted' });
    if (meta.verified !== '1') return res.status(412).json({ error: 'not verified — beat the level first' });

    await redis.hset(`cw:map:${code}:meta`,
      'locked',      '1',
      'submittedAt', new Date().toISOString(),
      'rejected',    '0',
    );
    await redis.hdel(`cw:map:${code}:meta`, 'rejectedAt', 'rejectionReason');
    await redis.sadd('cw:submissions', code);
    res.json({ code, locked: true });
  } catch (err) {
    console.error('[unofficial] submit error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/unofficial/:code/unsubmit — withdraw a submission to resume editing
router.post('/:code/unsubmit', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = ((req.body && req.body.creatorKey) || '').toUpperCase();
  if (!VALID_CODE.test(code))      return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    if (meta.official === '1') return res.status(409).json({ error: 'already official' });

    await redis.hset(`cw:map:${code}:meta`,
      'locked',   '0',
      'verified', '0',
    );
    await redis.hdel(`cw:map:${code}:meta`, 'submittedAt', 'verifiedAt', 'verifiedTime');
    await redis.srem('cw:submissions', code);
    res.json({ code, locked: false });
  } catch (err) {
    console.error('[unofficial] unsubmit error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/unofficial/:code — permanently remove a draft (creator key required)
//
// Refuses to delete a published official map — those live in the public catalog
// and removal is an admin operation, not a creator one. Submitted drafts CAN
// be deleted (this also clears them from the admin queue).
router.delete('/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const creatorKey = ((req.body && req.body.creatorKey) || req.query.creatorKey || '').toUpperCase();
  if (!VALID_CODE.test(code))      return res.status(400).json({ error: 'invalid code' });
  if (!VALID_KEY.test(creatorKey)) return res.status(400).json({ error: 'invalid creator key' });

  try {
    const storedKey = await redis.get(`cw:map:${code}:creator`);
    if (!storedKey)               return res.status(404).json({ error: 'not found' });
    if (storedKey !== creatorKey) return res.status(403).json({ error: 'forbidden' });

    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    if (meta.official === '1') return res.status(409).json({ error: 'cannot delete an official level' });

    const filePath = path.join(UNOFFICIAL_DIR, `${code}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await redis.del(`cw:map:${code}:creator`, `cw:map:${code}:meta`);
    await redis.srem(`cw:creator:${creatorKey}`, code);
    await redis.srem('cw:submissions', code);

    res.json({ code, deleted: true });
  } catch (err) {
    console.error('[unofficial] delete error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
