const express = require('express');
const path = require('path');
const fs = require('fs');
const redis = require('../redis');

const router = express.Router();
const UNOFFICIAL_DIR = path.join(__dirname, '..', '..', 'games', 'unofficial-maps');
const MAPS_DIR       = path.join(__dirname, '..', '..', 'games', 'maps');

const VALID_CODE = /^[A-Z0-9]{6}$/;
const TAG_MAX_LEN = 24;
const TAG_MAX_COUNT = 10;
const TAG_VALID = /^[a-z0-9][a-z0-9-]*$/;

// Comma-separated string → normalized array (lowercase, trimmed, deduped,
// kebab-cased). Returns the normalized array; throws on invalid characters.
function parseTags(input) {
  if (input == null) return [];
  const raw = Array.isArray(input)
    ? input
    : String(input).split(',');
  const seen = new Set();
  const out = [];
  for (const piece of raw) {
    const t = String(piece).trim().toLowerCase().replace(/\s+/g, '-');
    if (!t) continue;
    if (t.length > TAG_MAX_LEN) {
      throw new Error(`tag too long (max ${TAG_MAX_LEN}): "${t}"`);
    }
    if (!TAG_VALID.test(t)) {
      throw new Error(`tag has invalid characters: "${t}" — use letters, digits, hyphens`);
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length > TAG_MAX_COUNT) {
      throw new Error(`too many tags (max ${TAG_MAX_COUNT})`);
    }
  }
  return out;
}

// Admin key gate. ADMIN_KEY must be set in env; without it, every admin route
// returns 503 so the feature can't be silently used in an unconfigured deploy.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return res.status(503).json({ error: 'admin not configured' });
  const provided = req.get('x-admin-key') || (req.body && req.body.adminKey) || req.query.adminKey;
  if (provided !== expected) return res.status(401).json({ error: 'unauthorized' });
  next();
}

router.use(requireAdmin);

// GET /api/admin/queue — list submitted (locked, not official) maps
router.get('/queue', async (_req, res) => {
  try {
    const codes = await redis.smembers('cw:submissions');
    const items = await Promise.all(codes.map(async code => {
      const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
      if (meta.official === '1' || meta.locked !== '1') {
        // Stale entry — clean it up
        await redis.srem('cw:submissions', code);
        return null;
      }
      const filePath = path.join(UNOFFICIAL_DIR, `${code}.json`);
      if (!fs.existsSync(filePath)) return null;
      let map;
      try { map = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
      catch { return null; }
      const creatorKey = await redis.get(`cw:map:${code}:creator`);
      return {
        code,
        name:         map.name        || code,
        author:       map.author      || '',
        description:  map.description || '',
        tags:         Array.isArray(map.tags) ? map.tags : [],
        creatorKey,
        submittedAt:  meta.submittedAt || null,
        verifiedTime: meta.verifiedTime ? Number(meta.verifiedTime) : null,
      };
    }));
    res.json(items.filter(Boolean));
  } catch (err) {
    console.error('[admin] queue error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/admin/map/:code — fetch the raw map JSON for review
router.get('/map/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!VALID_CODE.test(code)) return res.status(400).json({ error: 'invalid code' });
  const draftPath = path.join(UNOFFICIAL_DIR, `${code}.json`);
  const officialPath = path.join(MAPS_DIR, `${code}.json`);
  const filePath = fs.existsSync(draftPath) ? draftPath : officialPath;
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not found' });
  try {
    res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch {
    res.status(500).json({ error: 'failed to load map' });
  }
});

// POST /api/admin/approve/:code — move file to maps/, flip official flag.
// Optional body: { name, author, description } overrides the corresponding
// fields in the map JSON before publishing. Lengths match builder limits.
router.post('/approve/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!VALID_CODE.test(code)) return res.status(400).json({ error: 'invalid code' });

  const body = req.body || {};
  const overrides = {};
  if (typeof body.name === 'string')        overrides.name        = body.name.trim().slice(0, 40);
  if (typeof body.author === 'string')      overrides.author      = body.author.trim().slice(0, 24);
  if (typeof body.description === 'string') overrides.description = body.description.trim().slice(0, 120);
  if ('tags' in body) {
    try { overrides.tags = parseTags(body.tags); }
    catch (err) { return res.status(400).json({ error: err.message }); }
  }
  if ('name' in overrides && !overrides.name) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }

  try {
    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    if (meta.official === '1') return res.status(409).json({ error: 'already official' });
    if (meta.locked !== '1')   return res.status(409).json({ error: 'not submitted' });

    const src = path.join(UNOFFICIAL_DIR, `${code}.json`);
    const dst = path.join(MAPS_DIR, `${code}.json`);
    if (!fs.existsSync(src)) return res.status(404).json({ error: 'map file missing' });

    if (Object.keys(overrides).length) {
      const map = JSON.parse(fs.readFileSync(src, 'utf8'));
      Object.assign(map, overrides);
      fs.writeFileSync(src, JSON.stringify(map, null, 2));
    }
    fs.renameSync(src, dst);

    await redis.hset(`cw:map:${code}:meta`,
      'official',   '1',
      'approvedAt', new Date().toISOString(),
    );
    await redis.hdel(`cw:map:${code}:meta`, 'rejected', 'rejectedAt', 'rejectionReason');
    await redis.srem('cw:submissions', code);

    res.json({ code, official: true });
  } catch (err) {
    console.error('[admin] approve error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/admin/reject/:code — body { reason }. Unlocks for revision.
router.post('/reject/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!VALID_CODE.test(code)) return res.status(400).json({ error: 'invalid code' });
  const reason = String((req.body && req.body.reason) || '').trim().slice(0, 500);
  if (!reason) return res.status(400).json({ error: 'reason required' });

  try {
    const meta = await redis.hgetall(`cw:map:${code}:meta`) || {};
    if (meta.official === '1') return res.status(409).json({ error: 'already official' });
    if (meta.locked !== '1')   return res.status(409).json({ error: 'not submitted' });

    await redis.hset(`cw:map:${code}:meta`,
      'locked',          '0',
      'verified',        '0',
      'rejected',        '1',
      'rejectedAt',      new Date().toISOString(),
      'rejectionReason', reason,
    );
    await redis.hdel(`cw:map:${code}:meta`, 'submittedAt', 'verifiedAt', 'verifiedTime');
    await redis.srem('cw:submissions', code);

    res.json({ code, rejected: true, reason });
  } catch (err) {
    console.error('[admin] reject error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
