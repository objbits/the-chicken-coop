const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const QB_DIR = path.join(__dirname, '..', '..', 'games', 'quick-builds');

// Dev-only writes. POST is gated; GET is always available (it just enumerates
// public JSON files). This is a defence-in-depth check on top of the
// NODE_ENV-conditional registration done in server/index.js for the writer.
function devOnlyWrites(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'not found' });
  }
  next();
}

function slugify(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isCellsDict(c) {
  if (!c || typeof c !== 'object') return false;
  for (const k of Object.keys(c)) {
    if (!/^\d+,\d+$/.test(k)) return false;
    const v = c[k];
    if (!v || typeof v !== 'object') return false;
    if (typeof v.background !== 'string') return false;
  }
  return true;
}

// GET /api/quick-builds — enumerate every JSON file in the quick-builds dir
// and return its parsed contents. The folder itself is the source of truth;
// dropping a file in is enough to make it appear in the picker.
router.get('/', (req, res) => {
  if (!fs.existsSync(QB_DIR)) return res.json({ builds: [] });
  let files;
  try {
    files = fs.readdirSync(QB_DIR).filter(f => f.endsWith('.json'));
  } catch (err) {
    console.error('[quick-builds] list error:', err.message);
    return res.status(500).json({ error: 'server error' });
  }

  const builds = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(QB_DIR, file), 'utf8'));
      // Skip anything that doesn't look like a quick build (e.g. a stray
      // index.json from an earlier scheme).
      if (!data || typeof data !== 'object') continue;
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height)) continue;
      data._file = file;
      builds.push(data);
    } catch (err) {
      console.warn(`[quick-builds] skipping ${file}:`, err.message);
    }
  }
  builds.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  res.json({ builds });
});

// POST /api/quick-builds — create or overwrite a quick-build file.
// Body: { name, description, data, overwrite? }
router.post('/', devOnlyWrites, (req, res) => {
  const { name, description, data, overwrite } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' });
  }
  if (description != null && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data required' });
  }
  if (!Number.isInteger(data.width) || !Number.isInteger(data.height) ||
      data.width <= 0 || data.height <= 0) {
    return res.status(400).json({ error: 'invalid width/height' });
  }
  if (!isCellsDict(data.cells)) {
    return res.status(400).json({ error: 'invalid cells' });
  }

  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'name yields empty slug' });

  const file = `${slug}.json`;
  const filePath = path.join(QB_DIR, file);

  const overwriting = fs.existsSync(filePath);
  if (overwriting && !overwrite) {
    return res.status(409).json({ error: 'exists', file });
  }

  if (!fs.existsSync(QB_DIR)) fs.mkdirSync(QB_DIR, { recursive: true });

  const out = {
    version: 1,
    name: name.trim(),
    description: (description || '').trim(),
    width: data.width,
    height: data.height,
    cells: data.cells,
  };
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + '\n');

  res.json({ ok: true, file, overwrote: overwriting });
});

module.exports = router;
