const express = require('express');
const cors = require('cors');
const path = require('path');
const redis = require('./redis');

const app = express();
const PORT = process.env.PORT || 3040;

// Backfill the cw:submissions index for any pre-existing locked drafts that
// were submitted before the index existed. Idempotent — safe to run on every
// boot.
async function backfillSubmissions() {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'cw:map:*:meta', 'COUNT', '100');
    cursor = next;
    for (const key of keys) {
      const meta = await redis.hgetall(key);
      if (meta.locked === '1' && meta.official !== '1') {
        const code = key.split(':')[2];
        await redis.sadd('cw:submissions', code);
      }
    }
  } while (cursor !== '0');
}

backfillSubmissions().catch(err => console.error('[startup] backfill failed:', err.message));

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/games', require('./routes/games'));
app.use('/api/unofficial', require('./routes/unofficial'));
app.use('/api/admin',      require('./routes/admin'));

// Quick-builds: GET (list) is always available (it just enumerates public
// JSON files in games/quick-builds/). POST (create/overwrite) is gated
// inside the route to NODE_ENV !== 'production' as defence-in-depth.
app.use('/api/quick-builds', require('./routes/quick-builds'));

app.get('/map-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'map-builder.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
