const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3040;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/games', require('./routes/games'));
app.use('/api/unofficial', require('./routes/unofficial'));

app.get('/map-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'map-builder.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
