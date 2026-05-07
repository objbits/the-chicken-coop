const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const MAPS_DIR = path.join(__dirname, '..', '..', 'games', 'maps');

const VALID_CODE = /^[A-Z0-9]{1,16}$/;

const BG_TO_THEME = {
  hallway: 'hallway', classroom: 'hallway',
  cafeteria: 'cafeteria',
  carpet: 'office',
  grass: 'playground', asphalt: 'playground', concrete: 'playground',
  dirt: 'baseball',
};

function deriveTheme(cells = {}) {
  const counts = {};
  for (const cell of Object.values(cells)) {
    const bg = cell.background;
    if (bg && bg !== 'empty') counts[bg] = (counts[bg] || 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return dominant ? (BG_TO_THEME[dominant[0]] || 'hallway') : 'hallway';
}

// GET /api/games — dynamically built from maps directory
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.json'));
    const catalog = files.map(file => {
      const code = file.replace('.json', '');
      try {
        const map = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, file), 'utf8'));
        return {
          code,
          name:          map.name         || code,
          author:        map.author        || 'Unknown',
          description:   map.description  || '',
          chandlerSpeed: map.chandlerSpeed || 75,
          theme:         deriveTheme(map.cells),
          diff:          map.diff          || 1,
          cat:           map.cat           || 'system',
          featured:      map.featured      || false,
          best:          null,
          plays:         0,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    res.json(catalog);
  } catch {
    res.status(500).json({ error: 'failed to load game catalog' });
  }
});

// GET /api/games/:code
router.get('/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!VALID_CODE.test(code)) return res.status(400).json({ error: 'invalid code' });

  const mapPath = path.join(MAPS_DIR, `${code}.json`);
  if (!fs.existsSync(mapPath)) return res.status(404).json({ error: 'not found' });

  try {
    res.json(JSON.parse(fs.readFileSync(mapPath, 'utf8')));
  } catch {
    res.status(500).json({ error: 'failed to load map' });
  }
});

module.exports = router;
