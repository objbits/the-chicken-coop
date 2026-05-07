// ─────────────────────────────────────────────
// Map Builder — Application Logic
// Schema-compatible with v1 of MAP-BUILDER.md, with backward-compatible
// extensions: extra `object` types (locker/desk/door/blackboard) and
// extra `special` values (pickup_gel/pickup_mirror/pickup_spray).
// ─────────────────────────────────────────────

const MAP_VERSION = 2;

// Themed replacement for native alert(). Returns a promise that resolves
// when the user dismisses the modal, so callers can await if needed.
function showAlert(message, title = 'Notice') {
  return new Promise(resolve => {
    const modal   = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const body    = document.getElementById('alert-body');
    const okBtn   = document.getElementById('alert-ok');
    const closeBtn = document.getElementById('alert-close');

    titleEl.textContent = '★ ' + String(title).toUpperCase();
    body.textContent    = String(message);
    modal.style.display = 'flex';
    setTimeout(() => okBtn.focus(), 0);

    function close() {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', close);
      closeBtn.removeEventListener('click', close);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve();
    }
    function onBackdrop(e) { if (e.target === modal) close(); }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); }
    }
    okBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}

const VILLAIN_DEFS = {
  chandler:     { label: 'CHANDLER',     color: '#e03040', defaultSpeed: 0.9 },
  bigw:         { label: 'BIG W',        color: '#8030e0', defaultSpeed: 0.75 },
  herbert:      { label: 'HERBERT',      color: '#e07030', defaultSpeed: 1.0 },
  quitaker:     { label: 'QUITAKER',     color: '#30a0e0', defaultSpeed: 0.85 },
  chonkersmith: { label: 'CHONKERSMITH', color: '#e0a030', defaultSpeed: 0.7 },
  wingman:      { label: 'WINGMAN',      color: '#30e070', defaultSpeed: 1.1 },
};
const VILLAIN_KEYS = ['chandler', 'bigw', 'herbert', 'quitaker', 'chonkersmith', 'wingman'];
const OPPOSITE = { n:'s', s:'n', e:'w', w:'e' };
const DELTA    = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

const GRID_COLS   = 60;
const GRID_ROWS   = 60;
const ZOOM_LEVELS = [8, 12, 16, 20, 28, 40, 56];

const BG_KEYS = [
  'empty', 'hallway', 'classroom', 'cafeteria', 'carpet',
  'grass', 'dirt', 'concrete', 'asphalt',
  'snow', 'ice', 'sand', 'gravel',
];
const BG_LABELS = {
  empty: 'Void', hallway: 'Hallway', classroom: 'Class', cafeteria: 'Cafe',
  carpet: 'Carpet', grass: 'Grass', dirt: 'Dirt',
  concrete: 'Concrete', asphalt: 'Asphalt',
  snow: 'Snow', ice: 'Ice', sand: 'Sand', gravel: 'Gravel',
};

// Object kinds — game properties + how to render the icon.
// Schema field is just `object` (string|null); types extend v1 minimally.
const OBJ_DEFS = {
  wall:        { label: 'Wall',     kind: 'immovable', draw: 'wall' },
  pushable:    { label: 'Chair',    kind: 'movable',   draw: 'chair' },
  mud:         { label: 'Mud',      kind: 'sticky',    draw: 'mud' },
  locker:      { label: 'Locker',   kind: 'immovable', draw: 'locker' },
  desk:        { label: 'Desk',     kind: 'immovable', draw: 'desk' },
  door:        { label: 'Door',     kind: 'passable',  draw: 'door' },
  blackboard:  { label: 'Board',    kind: 'immovable', draw: 'blackboard' },
  // Extras
  hedge:       { label: 'Hedge',    kind: 'immovable', draw: 'hedge' },
  bush:        { label: 'Bush',     kind: 'immovable', draw: 'bush' },
  fence:       { label: 'Fence',    kind: 'immovable', draw: 'fence' },
  stump:       { label: 'Stump',    kind: 'immovable', draw: 'stump' },
  rock:        { label: 'Rock',     kind: 'immovable', draw: 'rock' },
  snowman:     { label: 'Snowman',  kind: 'immovable', draw: 'snowman' },
  barrel:      { label: 'Barrel',   kind: 'immovable', draw: 'barrel' },
  crate:       { label: 'Crate',    kind: 'immovable', draw: 'crate' },
  backpack:    { label: 'Backpack', kind: 'passable',  draw: 'backpack' },
  toilet:      { label: 'Toilet',   kind: 'immovable', draw: 'toilet' },
  sink:        { label: 'Sink',     kind: 'immovable', draw: 'sink' },
  flag:        { label: 'Flag',     kind: 'immovable', draw: 'flag' },
  trashcan:    { label: 'Trash',    kind: 'immovable', draw: 'trashcan' },
  fountain:    { label: 'Fountain', kind: 'immovable', draw: 'fountain' },
  bookshelf:   { label: 'Bookshelf',kind: 'immovable', draw: 'bookshelf' },
  bulletinboard:{ label: 'Bulletin',kind: 'immovable', draw: 'bulletinboard' },
  basketball:  { label: 'B-ball',   kind: 'movable',   draw: 'basketball' },
  hurdle:      { label: 'Hurdle',   kind: 'immovable', draw: 'hurdle' },
  dodgeball:   { label: 'D-ball',   kind: 'movable',   draw: 'dodgeball' },
  soccerball:  { label: 'Soccer',   kind: 'movable',   draw: 'soccerball' },
  baseball:    { label: 'Baseball', kind: 'movable',   draw: 'baseball' },
  cone:        { label: 'Cone',     kind: 'immovable', draw: 'cone' },
  sportsbag:   { label: 'Bag',      kind: 'immovable', draw: 'sportsbag' },
  flowerpatch: { label: 'Flowers',  kind: 'passable',  draw: 'flowerpatch' },
  sign:        { label: 'Sign',     kind: 'immovable', draw: 'sign' },
  campfire:    { label: 'Campfire', kind: 'immovable', draw: 'campfire' },
};
const OBJ_ORDER = ['wall', 'pushable', 'mud', 'locker', 'desk', 'door', 'blackboard'];
const EXTRAS_ORDER = [
  'hedge', 'bush', 'fence', 'stump', 'rock', 'snowman', 'barrel', 'crate',
  'backpack', 'toilet', 'sink', 'flag', 'trashcan', 'fountain', 'bookshelf', 'bulletinboard',
  'basketball', 'hurdle', 'dodgeball', 'soccerball', 'baseball', 'cone', 'sportsbag',
  'flowerpatch', 'sign', 'campfire',
];

// Specials — player, exit, and pickups. Villains are tracked separately.
const SPECIAL_DEFS = {
  player:         { label: 'Jax',    color: '#4dabf7' },
  exit:           { label: 'Exit',   color: '#00ff88' },
  pickup_gel:     { label: 'Gel',    color: '#f0d020' },
  pickup_mirror:  { label: 'Mirror', color: '#c0d8e8' },
  pickup_spray:   { label: 'Spray',  color: '#c0c0c0' },
};
const SPECIAL_KEYS = ['player','exit','pickup_gel','pickup_mirror','pickup_spray'];


// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let cells       = {};
let specials    = {  // each special tracked by type for uniqueness
  player: null, exit: null,
  pickup_gel: null, pickup_mirror: null, pickup_spray: null,
};
let villainsPlaced = [];          // [{ type, col, row }]
let selectedObjectItem = { kind: 'none' };  // { kind: 'none'|'object'|'special'|'villain', type }
let activeObjTab = 'basic';
let objCtxPos = null;  // last painted cell in OBJ mode, for context panel only
let paintRotation = 0; // rotation to apply when placing objects in OBJ mode
let selected    = null;

let zoomIdx   = 2;
let cellSize  = ZOOM_LEVELS[zoomIdx];
let panX = 0, panY = 0;
let tool            = 'bg';
let paintBackground = 'hallway';
let penSize         = 1;
let viewMode        = 'builder';   // 'builder' | 'game'

let isPainting  = false;
let isPanning   = false;
let panOrigin   = null;
let lastPainted = null;
let hoverCell   = null;
let eraseMode   = 'all'; // 'all' | 'objects'

// Cached tile patterns (64×64 source canvases)
const tileCache = {};

const canvas  = document.getElementById('grid-canvas');
const ctx     = canvas.getContext('2d');
const wrap    = document.getElementById('grid-wrap');

// ─────────────────────────────────────────────
// CELL HELPERS
// ─────────────────────────────────────────────
const cellKey = (col, row) => `${col},${row}`;
const getCell = (col, row) => cells[cellKey(col, row)] || null;
const isActive = (col, row) => !!cells[cellKey(col, row)];
const inGrid = (col, row) => col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;

function activateCell(col, row) {
  if (!inGrid(col, row)) return;
  const k = cellKey(col, row);
  if (!cells[k]) cells[k] = {
    background: 'hallway',
    borders: {n:false, s:false, e:false, w:false},
    object: null,
    rotation: 0,
    special: null,
  };
  autoBorders(col, row);
}

function autoBorders(col, row) {
  const cell = getCell(col, row);
  if (!cell) return;
  for (const [dir, [dc, dr]] of Object.entries(DELTA)) {
    const nb = getCell(col + dc, row + dr);
    if (nb) {
      cell.borders[dir] = false;
      nb.borders[OPPOSITE[dir]] = false;
    } else {
      cell.borders[dir] = true;
    }
  }
}

function deactivateCell(col, row) {
  const k = cellKey(col, row);
  const cell = cells[k];
  if (!cell) return;
  if (cell.special && specials[cell.special]
      && specials[cell.special][0] === col
      && specials[cell.special][1] === row) {
    specials[cell.special] = null;
  }
  villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
  delete cells[k];
  for (const [dir, [dc, dr]] of Object.entries(DELTA)) {
    const nb = getCell(col + dc, row + dr);
    if (nb) nb.borders[OPPOSITE[dir]] = true;
  }
  if (selected && selected.col === col && selected.row === row) {
    selected = null;
    refreshSidebar();
  }
}

function clearCellObjects(col, row) {
  const cell = getCell(col, row);
  if (!cell) return;
  if (cell.special && specials[cell.special]
      && specials[cell.special][0] === col
      && specials[cell.special][1] === row) {
    specials[cell.special] = null;
  }
  cell.special = null;
  cell.object = null;
  cell.rotation = 0;
  villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
  if (selected && selected.col === col && selected.row === row) refreshSidebar();
}

function assignSpecial(col, row, type) {
  const cell = getCell(col, row);
  if (!cell) return;

  // If clearing same type — toggle off
  if (cell.special === type) {
    cell.special = null;
    specials[type] = null;
    return;
  }

  // Clear previous holder of this type elsewhere
  const prev = specials[type];
  if (prev) {
    const old = getCell(prev[0], prev[1]);
    if (old && old.special === type) old.special = null;
  }
  // Clear this cell's old special (if any) from its tracker
  if (cell.special && specials[cell.special]
      && specials[cell.special][0] === col
      && specials[cell.special][1] === row) {
    specials[cell.special] = null;
  }
  cell.special = type;
  specials[type] = [col, row];
}

function paintBrush(col, row) {
  const offset = Math.floor((penSize - 1) / 2);
  for (let dr = 0; dr < penSize; dr++) {
    for (let dc = 0; dc < penSize; dc++) {
      const c = col - offset + dc, r = row - offset + dr;
      if (!inGrid(c, r)) continue;
      activateCell(c, r);
      getCell(c, r).background = paintBackground;
    }
  }
}

// ─────────────────────────────────────────────
// COORDS
// ─────────────────────────────────────────────
function screenToCell(sx, sy) {
  return {
    col: Math.floor((sx - panX) / cellSize),
    row: Math.floor((sy - panY) / cellSize),
  };
}

// ─────────────────────────────────────────────
// TILE CACHE
// ─────────────────────────────────────────────
function buildTileCache() {
  for (const k of BG_KEYS) tileCache[k] = window.MB_buildTile(k);
}

// ─────────────────────────────────────────────
// ANIMATION TICK (for exit pulse + pickups)
// ─────────────────────────────────────────────
let animTime = 0;
function tickAnim() {
  animTime = performance.now() / 1000;
  render();
  requestAnimationFrame(tickAnim);
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function render() {
  const W = canvas.width, H = canvas.height;
  // Letterbox background
  ctx.fillStyle = '#1a0f06';
  ctx.fillRect(0, 0, W, H);

  // Subtle wood grain backdrop in builder mode (thin lines)
  if (viewMode === 'builder') {
    ctx.fillStyle = 'rgba(58,40,24,0.4)';
    for (let y = 0; y < H; y += 18) ctx.fillRect(0, y, W, 1);
  }

  const c0 = Math.max(0, Math.floor(-panX / cellSize));
  const r0 = Math.max(0, Math.floor(-panY / cellSize));
  const c1 = Math.min(GRID_COLS - 1, Math.ceil((W - panX) / cellSize));
  const r1 = Math.min(GRID_ROWS - 1, Math.ceil((H - panY) / cellSize));

  // Draw inactive grid cells (only in builder mode)
  if (viewMode === 'builder') {
    ctx.strokeStyle = 'rgba(212,180,131,0.10)';
    ctx.lineWidth = 0.5;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (isActive(c, r)) continue;
        const x = c * cellSize + panX, y = r * cellSize + panY;
        ctx.fillStyle = '#1a0f06';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }

  // Draw active cells (backgrounds + objects)
  for (const [key, cell] of Object.entries(cells)) {
    const [col, row] = key.split(',').map(Number);
    if (col < c0 || col > c1 || row < r0 || row > r1) continue;
    drawCellBackground(col, row, cell);
  }

  // Borders next pass (so brick draws on top of adjacent floor)
  for (const [key, cell] of Object.entries(cells)) {
    const [col, row] = key.split(',').map(Number);
    if (col < c0 || col > c1 || row < r0 || row > r1) continue;
    drawCellBorders(col, row, cell);
  }

  // Objects
  for (const [key, cell] of Object.entries(cells)) {
    const [col, row] = key.split(',').map(Number);
    if (col < c0 || col > c1 || row < r0 || row > r1) continue;
    drawCellObject(col, row, cell);
  }

  // Specials (on top of objects)
  for (const [key, cell] of Object.entries(cells)) {
    const [col, row] = key.split(',').map(Number);
    if (col < c0 || col > c1 || row < r0 || row > r1) continue;
    drawCellSpecial(col, row, cell);
  }

  // Villain placement overlay (on top of specials)
  drawVillainsOverlay(c0, r0, c1, r1);

  // Select hover highlight
  if (viewMode === 'builder' && tool === 'select' && hoverCell && inGrid(hoverCell.col, hoverCell.row) && isActive(hoverCell.col, hoverCell.row)) {
    const x = hoverCell.col * cellSize + panX, y = hoverCell.row * cellSize + panY;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, cellSize - 1.5, cellSize - 1.5);
  }

  // Selection highlight (builder mode only)
  if (viewMode === 'builder' && tool === 'select' && selected && inGrid(selected.col, selected.row)) {
    const x = selected.col * cellSize + panX, y = selected.row * cellSize + panY;
    // Pulsing yellow + red marching-ants
    const flash = (Math.sin(animTime * 6) + 1) * 0.5; // 0..1
    ctx.strokeStyle = '#e8c840';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
    ctx.strokeStyle = `rgba(204,32,32,${0.5 + flash * 0.5})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -animTime * 12;
    ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // BG hover preview
  if (viewMode === 'builder' && tool === 'bg' && hoverCell && inGrid(hoverCell.col, hoverCell.row)) {
    const offset = Math.floor((penSize - 1) / 2);
    const tile = tileCache[paintBackground] || tileCache.empty;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.imageSmoothingEnabled = false;
    for (let dr = 0; dr < penSize; dr++) {
      for (let dc = 0; dc < penSize; dc++) {
        const c = hoverCell.col - offset + dc, r = hoverCell.row - offset + dr;
        if (!inGrid(c, r)) continue;
        ctx.drawImage(tile, c * cellSize + panX, r * cellSize + panY, cellSize, cellSize);
      }
    }
    ctx.restore();
    const x = (hoverCell.col - offset) * cellSize + panX;
    const y = (hoverCell.row - offset) * cellSize + panY;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, penSize * cellSize - 2, penSize * cellSize - 2);
  }

  // Objects hover preview
  if (viewMode === 'builder' && tool === 'objects' && hoverCell && inGrid(hoverCell.col, hoverCell.row) && isActive(hoverCell.col, hoverCell.row)) {
    const x = hoverCell.col * cellSize + panX, y = hoverCell.row * cellSize + panY;
    if (selectedObjectItem.kind === 'object') {
      drawCellObject(hoverCell.col, hoverCell.row, { object: selectedObjectItem.type, rotation: paintRotation }, 0.55);
    }
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }

  // Quick Build placement ghost
  if (viewMode === 'builder' && placingQB && hoverCell && inGrid(hoverCell.col, hoverCell.row)) {
    drawQuickBuildGhost(placingQB, hoverCell.col, hoverCell.row);
  }

  // Erase hover highlight
  if (viewMode === 'builder' && tool === 'erase' && hoverCell && inGrid(hoverCell.col, hoverCell.row)) {
    const x = hoverCell.col * cellSize + panX, y = hoverCell.row * cellSize + panY;
    ctx.fillStyle = 'rgba(204, 32, 32, 0.35)';
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = '#cc2020';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }

  // Grid boundary (builder mode only)
  if (viewMode === 'builder') {
    ctx.strokeStyle = '#5a3e22';
    ctx.lineWidth = 2;
    ctx.strokeRect(panX - 1, panY - 1, GRID_COLS * cellSize + 2, GRID_ROWS * cellSize + 2);
  }

  refreshStatus();
}

function drawCellBackground(col, row, cell) {
  const x = col * cellSize + panX;
  const y = row * cellSize + panY;
  const s = cellSize;
  const tile = tileCache[cell.background] || tileCache.empty;
  // For small cells we can just drawImage at scaled size; for large we tile.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile, x, y, s, s);
}

function drawCellBorders(col, row, cell) {
  const x = col * cellSize + panX;
  const y = row * cellSize + panY;
  const s = cellSize;
  for (const dir of ['n','s','e','w']) {
    if (cell.borders[dir]) window.MB_drawBrickEdge(ctx, dir, x, y, s);
  }
}

const OBJ_DRAW_FNS = {
  wall: () => window.MB_drawWall,
  chair: () => window.MB_drawPushable,
  mud: () => window.MB_drawMud,
  locker: () => window.MB_drawLocker,
  desk: () => window.MB_drawDesk,
  door: () => window.MB_drawDoor,
  blackboard: () => window.MB_drawBlackboard,
  hedge: () => window.MB_drawHedge,
  bush: () => window.MB_drawBush,
  fence: () => window.MB_drawFence,
  stump: () => window.MB_drawStump,
  rock: () => window.MB_drawRock,
  snowman: () => window.MB_drawSnowman,
  barrel: () => window.MB_drawBarrel,
  crate: () => window.MB_drawCrate,
  backpack: () => window.MB_drawBackpack,
  toilet: () => window.MB_drawToilet,
  sink: () => window.MB_drawSink,
  flag: () => window.MB_drawFlag,
  trashcan: () => window.MB_drawTrashcan,
  fountain: () => window.MB_drawFountain,
  bookshelf: () => window.MB_drawBookshelf,
  bulletinboard: () => window.MB_drawBulletinboard,
  basketball: () => window.MB_drawBasketball,
  hurdle: () => window.MB_drawHurdle,
  dodgeball: () => window.MB_drawDodgeball,
  soccerball: () => window.MB_drawSoccerball,
  baseball: () => window.MB_drawBaseball,
  cone: () => window.MB_drawCone,
  sportsbag: () => window.MB_drawSportsbag,
  flowerpatch: () => window.MB_drawFlowerpatch,
  sign: () => window.MB_drawSign,
  campfire: () => window.MB_drawCampfire,
};

function drawCellObject(col, row, cell, alpha = 1) {
  if (!cell.object) return;
  const def = OBJ_DEFS[cell.object];
  if (!def) return;
  const drawFnGetter = OBJ_DRAW_FNS[def.draw];
  if (!drawFnGetter) return;
  const drawFn = drawFnGetter();
  if (!drawFn) return;

  const x = col * cellSize + panX;
  const y = row * cellSize + panY;
  const s = cellSize;
  const rot = cell.rotation || 0;

  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (rot !== 0) {
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot * Math.PI / 180);
    drawFn(ctx, -s / 2, -s / 2, s);
  } else {
    drawFn(ctx, x, y, s);
  }
  ctx.restore();
}

function drawCellSpecial(col, row, cell) {
  if (!cell.special) return;
  const x = col * cellSize + panX;
  const y = row * cellSize + panY;
  const s = cellSize;

  if (cell.special === 'exit') {
    window.MB_drawExit(ctx, x, y, s, animTime);
    return;
  }

  // Subtle pulsing aura behind sprite (builder mode only, to flag spawn)
  if (viewMode === 'builder') {
    const def = SPECIAL_DEFS[cell.special];
    if (def) {
      const pulse = 0.5 + Math.sin(animTime * 3) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    }
  }

  // Bobbing offset for pickups
  let dy = 0;
  if (cell.special.startsWith('pickup_')) {
    dy = Math.sin(animTime * 3 + col * 0.7 + row * 0.4) * Math.max(1, s * 0.04);
  }

  if (cell.special === 'player') {
    Sprites.drawJaxInCell(ctx, x, y + dy, s, 0, 1);
  } else if (cell.special === 'villain') {
    Sprites.drawChandlerInCell(ctx, x, y + dy, s, 0, 1, false);
  } else {
    const drawFn = {
      pickup_gel: Sprites.drawGel,
      pickup_mirror: Sprites.drawMirror,
      pickup_spray: Sprites.drawSpray,
    }[cell.special];
    if (drawFn) drawFn(ctx, x, y + dy, s);
  }

  // Spawn label for player
  if (viewMode === 'builder' && s >= 24 && cell.special === 'player') {
    ctx.fillStyle = SPECIAL_DEFS.player.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.max(8, Math.floor(s*0.18))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeText('JAX', x + s/2, y + 1);
    ctx.fillText('JAX', x + s/2, y + 1);
  }
}

function drawVillainInCell(ctx, x, y, s, type, frame, facing, stunned) {
  const sprite = window.VILLAIN_SPRITES && window.VILLAIN_SPRITES[type];
  if (!sprite) {
    Sprites.drawChandlerInCell(ctx, x, y, s, frame, facing, stunned);
    return;
  }
  const ps = s / 23;
  const drawnW = 17 * ps;
  const ox = x + (s - drawnW) / 2;
  sprite.draw(ctx, ox, y, frame || 0, facing == null ? 1 : facing, !!stunned, ps);
}

function makeVillainSwatchRenderer(type) {
  return (c2, x, y, s) => {
    const def = VILLAIN_DEFS[type];
    if (def) {
      c2.save();
      c2.globalAlpha = 0.3;
      c2.fillStyle = def.color;
      c2.fillRect(x, y, s, s);
      c2.restore();
    }
    drawVillainInCell(c2, x, y, s, type, 0, 1, false);
  };
}

function drawVillainsOverlay(c0, r0, c1, r1) {
  for (const v of villainsPlaced) {
    if (v.col < c0 || v.col > c1 || v.row < r0 || v.row > r1) continue;
    const def = VILLAIN_DEFS[v.type];
    const x = v.col * cellSize + panX;
    const y = v.row * cellSize + panY;
    const s = cellSize;
    // Tinted aura
    if (viewMode === 'builder') {
      const pulse = 0.5 + Math.sin(animTime * 3) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse * 0.4;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    }
    drawVillainInCell(ctx, x, y, s, v.type, 0, 1, false);
    if (viewMode === 'builder' && s >= 16) {
      ctx.fillStyle = def.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.font = `bold ${Math.max(7, Math.floor(s * 0.18))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeText(def.label, x + s/2, y + 1);
      ctx.fillText(def.label, x + s/2, y + 1);
    }
  }
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function refreshSidebar() {
  updateBgVisibility();
  updateObjectsPaletteVisibility();
  updatePenSizeVisibility();
  updateEraseModeVisibility();
  const noSel = document.getElementById('no-sel');
  const editor = document.getElementById('cell-editor');
  const ctxPanel = document.getElementById('context-panel');
  const cell = selected ? getCell(selected.col, selected.row) : null;

  if (tool !== 'select') {
    noSel.style.display = 'none';
    editor.style.display = 'none';
    const showCtx = tool === 'objects' && selectedObjectItem.kind === 'object';
    ctxPanel.style.display = showCtx ? 'flex' : 'none';
    if (showCtx) {
      document.querySelectorAll('.rot-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.rot) === paintRotation));
    }
    return;
  }

  if (!cell) {
    noSel.style.display = '';
    editor.style.display = 'none';
    ctxPanel.style.display = 'none';
    return;
  }

  noSel.style.display = 'none';
  editor.style.display = '';
  ctxPanel.style.display = cell.object ? 'flex' : 'none';

  selectPaintBg(cell.background, false);
  syncPaletteActiveToCell(cell);
  refreshSpecialPlacedState();

  const rot = cell.rotation || 0;
  document.querySelectorAll('.rot-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.rot) === rot);
  });
}

function refreshStatus() {
  const count = Object.keys(cells).length;
  updateToolAvailability();
  document.getElementById('status').textContent = `${count} CELL${count !== 1 ? 'S' : ''}`;

  const msgs = [];
  if (count === 0)                   msgs.push('<span class="warn">⚠ No active cells</span>');
  if (!specials.player)              msgs.push('<span class="warn">⚠ No Jax start</span>');
  if (!specials.exit)                msgs.push('<span class="warn">⚠ No exit</span>');
  if (villainsPlaced.length === 0)   msgs.push('<span class="warn">⚠ No villains placed</span>');

  const footer = document.getElementById('sidebar-footer');
  footer.innerHTML = msgs.length
    ? msgs.join('<br>')
    : '<span class="ok">✓ READY TO EXPORT</span>';
}

// ─────────────────────────────────────────────
// SIDEBAR EVENTS
// ─────────────────────────────────────────────
document.getElementById('btn-deactivate').addEventListener('click', () => {
  if (selected) { deactivateCell(selected.col, selected.row); render(); }
});

// ─────────────────────────────────────────────
// CANVAS INPUT
// ─────────────────────────────────────────────
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning = true;
    panOrigin = { x: e.offsetX - panX, y: e.offsetY - panY };
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;

  const { col, row } = screenToCell(e.offsetX, e.offsetY);
  if (!inGrid(col, row)) return;

  // Quick-build click-to-stamp mode: any left-click stamps and exits.
  if (placingQB && !draggingQB) {
    stampQuickBuild(placingQB, col, row);
    cancelPlaceMode();
    return;
  }

  if (tool === 'objects') {
    if (!isActive(col, row)) return;
    const cell = getCell(col, row);
    if (selectedObjectItem.kind === 'none') {
      cell.object = null; cell.rotation = 0;
      if (cell.special) { specials[cell.special] = null; cell.special = null; }
      villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
    } else if (selectedObjectItem.kind === 'object') {
      if (cell.object === selectedObjectItem.type) { cell.object = null; cell.rotation = 0; }
      else { cell.object = selectedObjectItem.type; cell.rotation = paintRotation; }
    } else if (selectedObjectItem.kind === 'special') {
      assignSpecial(col, row, selectedObjectItem.type);
    } else if (selectedObjectItem.kind === 'villain') {
      const type = selectedObjectItem.type;
      const existing = villainsPlaced.findIndex(v => v.col === col && v.row === row && v.type === type);
      if (existing >= 0) villainsPlaced.splice(existing, 1);
      else {
        villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
        villainsPlaced.push({ type, col, row, data: { speed: VILLAIN_DEFS[type].defaultSpeed } });
      }
    }
    objCtxPos = cell.object ? { col, row } : null;
    isPainting = true;
    lastPainted = { col, row };
    refreshSidebar();
    refreshSpecialPlacedState();
    selectObjectItem(selectedObjectItem.kind, selectedObjectItem.type);
    render();
  } else if (tool === 'select') {
    selected = isActive(col, row) ? { col, row } : null;
    refreshSidebar();
    render();
  } else if (tool === 'bg') {
    isPainting = true;
    lastPainted = { col, row };
    paintBrush(col, row);
    render();
  } else if (tool === 'erase') {
    isPainting = true;
    lastPainted = { col, row };
    eraseMode === 'objects' ? clearCellObjects(col, row) : deactivateCell(col, row);
    render();
  }
});

canvas.addEventListener('mousemove', e => {
  if (isPanning) {
    panX = e.offsetX - panOrigin.x;
    panY = e.offsetY - panOrigin.y;
    render();
    return;
  }

  if (placingQB || tool === 'erase' || tool === 'objects' || tool === 'bg' || tool === 'select') {
    const { col, row } = screenToCell(e.offsetX, e.offsetY);
    const inside = inGrid(col, row);
    const prev = hoverCell;
    hoverCell = inside ? { col, row } : null;
    const moved = !prev !== !hoverCell || (hoverCell && prev && (hoverCell.col !== prev.col || hoverCell.row !== prev.row));
    if (!isPainting && moved) render();
  } else {
    hoverCell = null;
  }

  if (!isPainting) return;

  const { col, row } = screenToCell(e.offsetX, e.offsetY);
  if (!inGrid(col, row)) return;
  if (lastPainted && lastPainted.col === col && lastPainted.row === row) return;
  lastPainted = { col, row };

  if (tool === 'bg') {
    paintBrush(col, row);
    render();
  } else if (tool === 'erase') {
    eraseMode === 'objects' ? clearCellObjects(col, row) : deactivateCell(col, row);
    render();
  } else if (tool === 'objects') {
    if (!isActive(col, row)) return;
    const cell = getCell(col, row);
    if (selectedObjectItem.kind === 'none') {
      cell.object = null; cell.rotation = 0;
      if (cell.special) { specials[cell.special] = null; cell.special = null; }
      villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
    } else if (selectedObjectItem.kind === 'object') {
      cell.object = selectedObjectItem.type;
      cell.rotation = paintRotation;
    } else if (selectedObjectItem.kind === 'special') {
      assignSpecial(col, row, selectedObjectItem.type);
    } else if (selectedObjectItem.kind === 'villain') {
      const type = selectedObjectItem.type;
      if (!villainsPlaced.find(v => v.col === col && v.row === row)) {
        villainsPlaced = villainsPlaced.filter(v => !(v.col === col && v.row === row));
        villainsPlaced.push({ type, col, row, data: { speed: VILLAIN_DEFS[type].defaultSpeed } });
      }
    }
    objCtxPos = cell.object ? { col, row } : null;
    render();
  }
});

canvas.addEventListener('mouseup', () => {
  if (isPainting && tool === 'objects') {
    refreshSidebar();
    refreshSpecialPlacedState();
    selectObjectItem(selectedObjectItem.kind, selectedObjectItem.type);
  }
  isPainting = false;
  isPanning = false;
  setCanvasCursor();
});
canvas.addEventListener('mouseleave', () => {
  isPainting = false;
  isPanning = false;
  if (hoverCell) { hoverCell = null; render(); }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const { col, row } = screenToCell(e.offsetX, e.offsetY);
  const prev = zoomIdx;
  if (e.deltaY < 0) zoomIdx = Math.min(zoomIdx + 1, ZOOM_LEVELS.length - 1);
  else              zoomIdx = Math.max(zoomIdx - 1, 0);
  if (zoomIdx === prev) return;
  cellSize = ZOOM_LEVELS[zoomIdx];
  panX = e.offsetX - col * cellSize;
  panY = e.offsetY - row * cellSize;
  document.getElementById('zoom-label').textContent = cellSize + 'px';
  setCanvasCursor();
  render();
}, { passive: false });

// ─────────────────────────────────────────────
// TOOLBAR BUTTONS
// ─────────────────────────────────────────────
const TOOL_CURSORS = { select: 'default', bg: 'default', objects: 'default', erase: 'no-drop' };

function setCanvasCursor() {
  canvas.style.cursor = TOOL_CURSORS[tool] || 'default';
}

function buildBgSwatches() {
  const container = document.getElementById('bg-swatches');
  for (const key of BG_KEYS) {
    const swatch = document.createElement('div');
    swatch.className = 'bg-swatch' + (key === paintBackground ? ' active' : '');
    swatch.dataset.bg = key;
    swatch.title = BG_LABELS[key];

    const cvs = document.createElement('canvas');
    cvs.width = 56; cvs.height = 56;
    const c2 = cvs.getContext('2d');
    c2.imageSmoothingEnabled = false;
    c2.drawImage(tileCache[key], 0, 0, 56, 56);

    const lbl = document.createElement('span');
    lbl.textContent = BG_LABELS[key];

    swatch.append(cvs, lbl);
    swatch.addEventListener('click', () => selectPaintBg(key, true));
    container.appendChild(swatch);
  }
}



function setRotation(deg) {
  if (tool === 'objects') {
    paintRotation = deg;
    const cell = objCtxPos && getCell(objCtxPos.col, objCtxPos.row);
    if (cell) cell.rotation = deg;
  } else {
    const cell = selected && getCell(selected.col, selected.row);
    if (!cell) return;
    cell.rotation = deg;
  }
  document.querySelectorAll('.rot-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.rot) === deg);
  });
  render();
}

document.querySelectorAll('.rot-btn').forEach(b => {
  b.addEventListener('click', () => setRotation(Number(b.dataset.rot)));
});

function selectPaintBg(bg, updateCell = true) {
  paintBackground = bg;
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === bg));
  setCanvasCursor();
  if (updateCell) {
    const cell = selected && getCell(selected.col, selected.row);
    if (cell) {
      cell.background = bg;
      render();
    }
  }
}

function updateBgVisibility() {
  const el = document.getElementById('bg-field');
  if (el) el.style.display = tool === 'objects' ? 'none' : '';
}

function updatePenSizeVisibility() {
  const show = tool === 'bg';
  document.getElementById('pen-size-row').style.display = show ? 'flex' : 'none';
  document.getElementById('pen-size-sep').style.display = show ? ''    : 'none';
}

function updateToolAvailability() {
  const hasCells = Object.keys(cells).length > 0;
  for (const id of ['t-select', 't-objects', 't-erase']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !hasCells;
  }
  if (!hasCells && tool !== 'bg') {
    document.getElementById('t-bg').click();
  }
}

function updateEraseModeVisibility() {
  const show = tool === 'erase';
  document.getElementById('erase-mode-row').style.display = show ? 'flex' : 'none';
  document.getElementById('erase-mode-sep').style.display = show ? ''    : 'none';
}

function updateObjectsPaletteVisibility() {
  const el = document.getElementById('objects-palette');
  if (!el) return;
  const cell = selected ? getCell(selected.col, selected.row) : null;
  el.style.display = (tool === 'objects' || (tool === 'select' && !!cell)) ? '' : 'none';
}

function selectObjectItem(kind, type) {
  selectedObjectItem = { kind, type: type || null };
  document.querySelectorAll('.obj-place-item').forEach(el => {
    const match = el.dataset.kind === kind && (kind === 'none' || el.dataset.type === (type || ''));
    el.classList.toggle('active', match);
  });
}

function addObjSwatch(container, kind, type, label, renderFn, opts = {}) {
  const el = document.createElement('div');
  el.className = 'obj-swatch' + (kind === 'none' ? ' none' : '') + (opts.placeItem ? ' obj-place-item' : '');
  el.dataset.kind = kind;
  el.dataset.type = type || '';
  const cvs = document.createElement('canvas');
  cvs.width = 48; cvs.height = 48;
  if (renderFn) {
    const c2 = cvs.getContext('2d');
    c2.imageSmoothingEnabled = false;
    if (kind === 'object') c2.drawImage(tileCache.hallway, 0, 0, 48, 48);
    renderFn(c2, 0, 0, 48);
  }
  const lbl = document.createElement('span');
  lbl.textContent = label;
  el.append(cvs, lbl);
  el.addEventListener('click', opts.onClick || (() => handlePaletteClick(kind, type)));
  container.appendChild(el);
  return el;
}

function handlePaletteClick(kind, type) {
  if (tool === 'objects') {
    selectObjectItem(kind, type);
    refreshSidebar();
    return;
  }
  if (tool !== 'select' || !selected) return;
  const cell = getCell(selected.col, selected.row);
  if (!cell) return;

  if (kind === 'none') {
    cell.object = null; cell.rotation = 0;
  } else if (kind === 'object') {
    if (cell.object === type) { cell.object = null; cell.rotation = 0; }
    else cell.object = type;
  } else if (kind === 'special') {
    assignSpecial(selected.col, selected.row, type);
  } else if (kind === 'villain') {
    const idx = villainsPlaced.findIndex(v => v.col === selected.col && v.row === selected.row && v.type === type);
    if (idx >= 0) villainsPlaced.splice(idx, 1);
    else {
      villainsPlaced = villainsPlaced.filter(v => !(v.col === selected.col && v.row === selected.row));
      villainsPlaced.push({ type, col: selected.col, row: selected.row, data: { speed: VILLAIN_DEFS[type].defaultSpeed } });
    }
  }

  syncPaletteActiveToCell(cell);
  refreshSpecialPlacedState();
  document.getElementById('context-panel').style.display = cell.object ? 'flex' : 'none';
  const rot = cell.rotation || 0;
  document.querySelectorAll('.rot-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.rot) === rot));
  render();
}

function syncPaletteActiveToCell(cell) {
  const villain = selected && villainsPlaced.find(v => v.col === selected.col && v.row === selected.row);
  document.querySelectorAll('.obj-place-item').forEach(el => {
    const k = el.dataset.kind, t = el.dataset.type;
    let active = false;
    if (k === 'none')    active = !cell.object;
    else if (k === 'object')  active = t === (cell.object  || '');
    else if (k === 'special') active = t === (cell.special || '');
    else if (k === 'villain') active = !!villain && villain.type === t;
    el.classList.toggle('active', active);
  });
}

function renderObjTabContent() {
  const content = document.getElementById('obj-tab-content');
  if (!content) return;
  content.innerHTML = '';

  if (activeObjTab === 'basic') {
    content.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
    const drawFns = {
      wall: window.MB_drawWall, chair: window.MB_drawPushable, mud: window.MB_drawMud,
      locker: window.MB_drawLocker, desk: window.MB_drawDesk, door: window.MB_drawDoor,
      blackboard: window.MB_drawBlackboard,
    };
    for (const key of OBJ_ORDER) {
      const def = OBJ_DEFS[key];
      addObjSwatch(content, 'object', key, def.label.toUpperCase(), drawFns[def.draw], { placeItem: true });
    }
  } else if (activeObjTab === 'extras') {
    content.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
    const drawFns = {
      hedge: window.MB_drawHedge, bush: window.MB_drawBush, fence: window.MB_drawFence,
      stump: window.MB_drawStump, rock: window.MB_drawRock, snowman: window.MB_drawSnowman,
      barrel: window.MB_drawBarrel, crate: window.MB_drawCrate, backpack: window.MB_drawBackpack,
      toilet: window.MB_drawToilet, sink: window.MB_drawSink, flag: window.MB_drawFlag,
      trashcan: window.MB_drawTrashcan, fountain: window.MB_drawFountain,
      bookshelf: window.MB_drawBookshelf, bulletinboard: window.MB_drawBulletinboard,
      basketball: window.MB_drawBasketball, hurdle: window.MB_drawHurdle,
      dodgeball: window.MB_drawDodgeball, soccerball: window.MB_drawSoccerball,
      baseball: window.MB_drawBaseball, cone: window.MB_drawCone,
      sportsbag: window.MB_drawSportsbag, flowerpatch: window.MB_drawFlowerpatch,
      sign: window.MB_drawSign, campfire: window.MB_drawCampfire,
    };
    for (const key of EXTRAS_ORDER) {
      const def = OBJ_DEFS[key];
      addObjSwatch(content, 'object', key, def.label.toUpperCase(), drawFns[def.draw], { placeItem: true });
    }
  } else if (activeObjTab === 'specials') {
    content.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
    const drawFns = {
      player: (c, x, y, s) => Sprites.drawJaxInCell(c, x, y, s, 0, 1),
      exit: (c, x, y, s) => Sprites.drawExit(c, x, y, s, 0),
      pickup_gel: Sprites.drawGel,
      pickup_mirror: Sprites.drawMirror,
      pickup_spray: Sprites.drawSpray,
    };
    const labels = { player: 'JAX', exit: 'EXIT', pickup_gel: 'GEL', pickup_mirror: 'MIRROR', pickup_spray: 'SPRAY' };
    for (const key of SPECIAL_KEYS) {
      addObjSwatch(content, 'special', key, labels[key], drawFns[key], { placeItem: true });
    }
  } else if (activeObjTab === 'villains') {
    content.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
    for (const key of VILLAIN_KEYS) {
      addObjSwatch(content, 'villain', key, VILLAIN_DEFS[key].label, makeVillainSwatchRenderer(key), { placeItem: true });
    }
  }

  if (tool === 'select' && selected) {
    const c = getCell(selected.col, selected.row);
    if (c) syncPaletteActiveToCell(c);
  } else {
    selectObjectItem(selectedObjectItem.kind, selectedObjectItem.type);
  }
  refreshSpecialPlacedState();
}

function refreshSpecialPlacedState() {
  document.querySelectorAll('.obj-place-item[data-kind="special"]').forEach(el => {
    const t = el.dataset.type;
    el.classList.toggle('placed', (t === 'player' && !!specials.player) || (t === 'exit' && !!specials.exit));
  });
}

function switchObjTab(tabId) {
  activeObjTab = tabId;
  document.querySelectorAll('.obj-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  renderObjTabContent();
}

function filterObjPalette(query) {
  const tabBar = document.getElementById('obj-tab-bar');
  const content = document.getElementById('obj-tab-content');
  if (!tabBar || !content) return;

  const q = query.trim().toLowerCase();
  if (!q) {
    tabBar.style.display = 'flex';
    renderObjTabContent();
    return;
  }

  tabBar.style.display = 'none';
  content.innerHTML = '';
  content.style.cssText = '';

  const objDrawFns = {
    wall: window.MB_drawWall, chair: window.MB_drawPushable, mud: window.MB_drawMud,
    locker: window.MB_drawLocker, desk: window.MB_drawDesk, door: window.MB_drawDoor,
    blackboard: window.MB_drawBlackboard,
    hedge: window.MB_drawHedge, bush: window.MB_drawBush, fence: window.MB_drawFence,
    stump: window.MB_drawStump, rock: window.MB_drawRock, snowman: window.MB_drawSnowman,
    barrel: window.MB_drawBarrel, crate: window.MB_drawCrate, backpack: window.MB_drawBackpack,
    toilet: window.MB_drawToilet, sink: window.MB_drawSink, flag: window.MB_drawFlag,
    trashcan: window.MB_drawTrashcan, fountain: window.MB_drawFountain,
    bookshelf: window.MB_drawBookshelf, bulletinboard: window.MB_drawBulletinboard,
    basketball: window.MB_drawBasketball, hurdle: window.MB_drawHurdle,
    dodgeball: window.MB_drawDodgeball, soccerball: window.MB_drawSoccerball,
    baseball: window.MB_drawBaseball, cone: window.MB_drawCone,
    sportsbag: window.MB_drawSportsbag, flowerpatch: window.MB_drawFlowerpatch,
    sign: window.MB_drawSign, campfire: window.MB_drawCampfire,
  };
  const specDrawFns = {
    player: (c, x, y, s) => Sprites.drawJaxInCell(c, x, y, s, 0, 1),
    exit: (c, x, y, s) => Sprites.drawExit(c, x, y, s, 0),
    pickup_gel: Sprites.drawGel, pickup_mirror: Sprites.drawMirror, pickup_spray: Sprites.drawSpray,
  };
  const specLabels = { player: 'JAX', exit: 'EXIT', pickup_gel: 'GEL', pickup_mirror: 'MIRROR', pickup_spray: 'SPRAY' };

  const swatchGrid = document.createElement('div');
  swatchGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
  for (const key of OBJ_ORDER) {
    if (OBJ_DEFS[key].label.toLowerCase().includes(q))
      addObjSwatch(swatchGrid, 'object', key, OBJ_DEFS[key].label.toUpperCase(), objDrawFns[OBJ_DEFS[key].draw], { placeItem: true });
  }
  for (const key of SPECIAL_KEYS) {
    if (specLabels[key].toLowerCase().includes(q))
      addObjSwatch(swatchGrid, 'special', key, specLabels[key], specDrawFns[key], { placeItem: true });
  }
  if (swatchGrid.children.length) content.appendChild(swatchGrid);

  const villainMatches = VILLAIN_KEYS.filter(k => VILLAIN_DEFS[k].label.toLowerCase().includes(q));
  if (villainMatches.length) {
    for (const key of villainMatches) {
      addObjSwatch(swatchGrid, 'villain', key, VILLAIN_DEFS[key].label, makeVillainSwatchRenderer(key), { placeItem: true });
    }
    if (!content.contains(swatchGrid)) content.appendChild(swatchGrid);
  }

  if (!swatchGrid.children.length && !villainMatches.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#a08858;font-size:10px;text-align:center;padding:12px 0;';
    empty.textContent = 'No results';
    content.appendChild(empty);
  }

  if (tool === 'select' && selected) {
    const c = getCell(selected.col, selected.row);
    if (c) syncPaletteActiveToCell(c);
  } else {
    selectObjectItem(selectedObjectItem.kind, selectedObjectItem.type);
  }
  refreshSpecialPlacedState();
}

function buildObjectsPalette() {
  const container = document.getElementById('obj-place-grid');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;gap:0;';

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  searchInput.style.marginBottom = '8px';
  searchInput.addEventListener('input', e => filterObjPalette(e.target.value));
  container.appendChild(searchInput);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.id = 'obj-tab-bar';
  for (const [id, label] of [['basic','BASIC'],['extras','EXTRAS'],['specials','SPECIALS'],['villains','VILLAINS']]) {
    const btn = document.createElement('button');
    btn.className = 'obj-tab' + (id === activeObjTab ? ' active' : '');
    btn.dataset.tab = id;
    btn.textContent = label;
    btn.addEventListener('click', () => switchObjTab(id));
    tabBar.appendChild(btn);
  }
  container.appendChild(tabBar);

  // Tab content area
  const content = document.createElement('div');
  content.id = 'obj-tab-content';
  content.style.marginTop = '8px';
  container.appendChild(content);

  // Clear button at bottom
  const clearBtn = document.createElement('button');
  clearBtn.className = 'villain-type-btn obj-place-item';
  clearBtn.dataset.kind = 'none';
  clearBtn.dataset.type = '';
  clearBtn.style.cssText = 'color:#a08858;border-color:#5a3e22;margin-top:10px;';
  clearBtn.textContent = '✕  CLEAR';
  clearBtn.addEventListener('click', () => handlePaletteClick('none', null));
  container.appendChild(clearBtn);

  renderObjTabContent();
}

['select','bg','objects','erase'].forEach(t => {
  const btn = document.getElementById('t-' + t);
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    tool = t;
    if (t !== 'objects') objCtxPos = null;
    if (!['objects','bg','erase','select'].includes(t) && hoverCell) { hoverCell = null; render(); }
    if (t === 'objects' && selectedObjectItem.kind === 'none') {
      selectedObjectItem = { kind: 'object', type: OBJ_ORDER[0] };
    }
    document.querySelectorAll('[id^="t-"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePenSizeVisibility();
    updateEraseModeVisibility();
    updateObjectsPaletteVisibility();
    setCanvasCursor();
    refreshSidebar();
  });
});

document.querySelectorAll('.pen-size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    penSize = Number(btn.dataset.size);
    document.querySelectorAll('.pen-size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setCanvasCursor();
  });
});

document.querySelectorAll('.erase-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    eraseMode = btn.dataset.mode;
    document.querySelectorAll('.erase-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('m-builder').addEventListener('click', () => setViewMode('builder'));
document.getElementById('m-game').addEventListener('click', () => setViewMode('game'));

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('m-builder').classList.toggle('active', mode === 'builder');
  document.getElementById('m-game').classList.toggle('active', mode === 'game');
  document.getElementById('btn-play').style.display = (mode === 'game') ? '' : 'none';
  if (mode === 'builder') exitTestMode();
  render();
}

document.getElementById('zoom-in').addEventListener('click', () => {
  if (zoomIdx < ZOOM_LEVELS.length - 1) {
    zoomIdx++;
    cellSize = ZOOM_LEVELS[zoomIdx];
    document.getElementById('zoom-label').textContent = cellSize + 'px';
    setCanvasCursor();
    render();
  }
});

document.getElementById('zoom-out').addEventListener('click', () => {
  if (zoomIdx > 0) {
    zoomIdx--;
    cellSize = ZOOM_LEVELS[zoomIdx];
    document.getElementById('zoom-label').textContent = cellSize + 'px';
    setCanvasCursor();
    render();
  }
});

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // ESC cancels Quick Build placing mode (always, even from inputs)
  if (e.key === 'Escape' && placingQB) { cancelPlaceMode(); return; }
  if (e.target !== document.body) return;
  const key = e.key.toLowerCase();
  // Dev shortcut: Ctrl/Cmd+Shift+Q opens "save current map as Quick Build".
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'q') {
    if (!isQuickBuildDevEnv()) return;
    e.preventDefault();
    openSaveQBModal();
    return;
  }
  if (key === 's') document.getElementById('t-select').click();
  if (key === 'b') document.getElementById('t-bg').click();
  if (key === 'o') document.getElementById('t-objects').click();
  if (key === 'e') document.getElementById('t-erase').click();
  if (key === 'g') setViewMode(viewMode === 'builder' ? 'game' : 'builder');
  if (key === 'r') {
    const cell = selected && getCell(selected.col, selected.row);
    if (cell) setRotation((cell.rotation + 90) % 360);
  }
  if (key === '=' || key === '+') document.getElementById('zoom-in').click();
  if (key === '-') document.getElementById('zoom-out').click();
  if (key === 'arrowleft')  { panX += 64; render(); }
  if (key === 'arrowright') { panX -= 64; render(); }
  if (key === 'arrowup')    { panY += 64; render(); }
  if (key === 'arrowdown')  { panY -= 64; render(); }
});

// ─────────────────────────────────────────────
// FILE I/O
// ─────────────────────────────────────────────
function validateMap() {
  const errors = [];
  if (Object.keys(cells).length === 0) errors.push('No active cells.');
  if (!specials.player)              errors.push('No Jax start position.');
  if (!specials.exit)                errors.push('No exit position.');
  if (villainsPlaced.length === 0)   errors.push('No villains placed.');
  return errors;
}

function buildMapData() {
  const metaName   = document.getElementById('meta-name').value.trim();
  const metaAuthor = document.getElementById('meta-author').value.trim();
  const metaDesc   = document.getElementById('meta-desc').value.trim();

  const data = {
    version: MAP_VERSION,
    name: metaName || 'Untitled',
    author: metaAuthor || 'Unknown',
    description: metaDesc,
    playerStart: specials.player,
    exit: specials.exit,
    villains: villainsPlaced.map(v => ({ type: v.type, col: v.col, row: v.row, data: v.data || {} })),
    pickups: {
      gel: specials.pickup_gel,
      mirror: specials.pickup_mirror,
      spray: specials.pickup_spray,
    },
    cells: {},
  };
  for (const [k, cell] of Object.entries(cells)) {
    data.cells[k] = {
      background: cell.background,
      borders: { ...cell.borders },
      object: cell.object,
      rotation: cell.rotation || 0,
      special: cell.special,
    };
  }
  return data;
}

document.getElementById('btn-export').addEventListener('click', () => {
  const errors = validateMap();
  if (errors.length) { showAlert('Cannot export:\n\n' + errors.join('\n'), 'Cannot Export'); return; }

  const data = buildMapData();
  const slug = (data.name || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = slug + '.json';
  a.click(); URL.revokeObjectURL(url);
});

document.getElementById('btn-load').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      resetDraftState();
      loadMap(JSON.parse(ev.target.result));
    } catch (err) { showAlert('Could not parse JSON: ' + err.message, 'Load Failed'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function loadMap(data) {
  if (!data || !data.version) { showAlert('Invalid map file.', 'Load Failed'); return; }
  if (data.version > MAP_VERSION) {
    showAlert(`Map version ${data.version} is newer than this builder (v${MAP_VERSION}).`, 'Load Failed');
    return;
  }

  cells = {};
  specials = { player:null, exit:null,
               pickup_gel:null, pickup_mirror:null, pickup_spray:null };
  villainsPlaced = [];
  selected = null;

  document.getElementById('meta-name').value   = data.name        || '';
  document.getElementById('meta-author').value = data.author      || '';
  document.getElementById('meta-desc').value   = data.description || '';
  updateMapNameDisplay();

  for (const [k, cd] of Object.entries(data.cells || {})) {
    const special = (cd.special && cd.special !== 'villain') ? cd.special : null;
    cells[k] = {
      background: cd.background || 'empty',
      borders: { n:false, s:false, e:false, w:false, ...(cd.borders || {}) },
      object:  cd.object  || null,
      rotation: cd.rotation || 0,
      special,
    };
    const [col, row] = k.split(',').map(Number);
    if (special && SPECIAL_DEFS[special]) {
      specials[special] = [col, row];
    }
  }

  // Load villains: v2 array or fall back to v1 single villain field
  if (Array.isArray(data.villains)) {
    villainsPlaced = data.villains.map(v => ({
      type: VILLAIN_DEFS[v.type] ? v.type : 'chandler',
      col: v.col, row: v.row,
      data: v.data || { speed: VILLAIN_DEFS[v.type]?.defaultSpeed ?? 0.9 },
    }));
  } else if (data.villain) {
    villainsPlaced = [{ type: 'chandler', col: data.villain[0], row: data.villain[1], data: { speed: 0.9 } }];
  }

  centerOnCells();
  refreshSidebar();
  render();
}

// ─────────────────────────────────────────────
// NEW MAP
// ─────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click', () => {
  if (Object.keys(cells).length > 0 && !confirm('Start a new map? Current work will be lost.')) return;
  cells = {};
  specials = { player:null, exit:null,
               pickup_gel:null, pickup_mirror:null, pickup_spray:null };
  villainsPlaced = [];
  selected = null;
  document.getElementById('meta-name').value   = '';
  document.getElementById('meta-author').value = '';
  document.getElementById('meta-desc').value   = '';
  updateMapNameDisplay();
  resetDraftState();
  centerOnGrid();
  refreshSidebar();
  render();
});

// ─────────────────────────────────────────────
// PAN HELPERS
// ─────────────────────────────────────────────
function centerOnGrid() {
  panX = canvas.width  / 2 - (GRID_COLS * cellSize) / 2;
  panY = canvas.height / 2 - (GRID_ROWS * cellSize) / 2;
}

function centerOnCells() {
  const keys = Object.keys(cells);
  if (!keys.length) { centerOnGrid(); return; }
  let minC = GRID_COLS, maxC = 0, minR = GRID_ROWS, maxR = 0;
  for (const k of keys) {
    const [c, r] = k.split(',').map(Number);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
  }
  panX = canvas.width  / 2 - ((minC + maxC) / 2 + 0.5) * cellSize;
  panY = canvas.height / 2 - ((minR + maxR) / 2 + 0.5) * cellSize;
}

function resize() {
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  render();
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────
function buildMap(fn) {
  const _cells = {};
  const _villains = [];
  const get = (c, r) => {
    const k = `${c},${r}`;
    if (!_cells[k]) _cells[k] = {
      background: 'hallway',
      borders: { n:false, s:false, e:false, w:false },
      object: null, special: null,
    };
    return _cells[k];
  };
  const fill = (c0, r0, w, h, bg) => {
    for (let r = r0; r < r0+h; r++)
      for (let c = c0; c < c0+w; c++) get(c, r).background = bg;
  };
  const outerWalls = (c0, r0, w, h) => {
    for (let c = c0; c < c0+w; c++) {
      get(c, r0).borders.n = true;
      get(c, r0+h-1).borders.s = true;
    }
    for (let r = r0; r < r0+h; r++) {
      get(c0, r).borders.w = true;
      get(c0+w-1, r).borders.e = true;
    }
  };
  const obj  = (c, r, type) => { get(c, r).object  = type; };
  const spec = (c, r, type) => { get(c, r).special = type; };
  const vill = (type, c, r) => {
    _villains.push({ type, col: c, row: r, data: { speed: VILLAIN_DEFS[type]?.defaultSpeed ?? 0.9 } });
  };

  fn({ fill, outerWalls, obj, spec, vill });

  // Build manifest (v2 format)
  const out = { version: MAP_VERSION, playerStart: null, exit: null,
                villains: _villains,
                pickups: { gel:null, mirror:null, spray:null },
                cells: _cells };
  for (const [k, v] of Object.entries(_cells)) {
    const [c, r] = k.split(',').map(Number);
    if (v.special === 'player')        out.playerStart    = [c, r];
    if (v.special === 'exit')          out.exit           = [c, r];
    if (v.special === 'pickup_gel')    out.pickups.gel    = [c, r];
    if (v.special === 'pickup_mirror') out.pickups.mirror = [c, r];
    if (v.special === 'pickup_spray')  out.pickups.spray  = [c, r];
  }
  return out;
}

const TEMPLATES = [
  {
    name: 'The Gauntlet',
    desc: 'Hallway · 22×5 · Two walls force a zigzag dash. Lockers line the corridor.',
    data: buildMap(({ fill, outerWalls, obj, spec, vill }) => {
      fill(0,0, 22,5, 'hallway');
      outerWalls(0,0, 22,5);
      // Lockers along top and bottom
      for (let c = 1; c <= 20; c++) {
        if (c % 4 !== 0) {
          obj(c, 0, 'locker');
          obj(c, 4, 'locker');
        }
      }
      // Barriers
      obj(7, 1, 'wall'); obj(7, 2, 'wall'); obj(7, 3, 'wall');
      obj(14, 1, 'wall'); obj(14, 2, 'wall'); obj(14, 3, 'wall');
      // Pushable chairs
      obj(3, 2, 'pushable'); obj(18, 2, 'pushable');
      // Pickup
      spec(10, 2, 'pickup_gel');
      // Specials
      spec(1, 2, 'player');
      spec(20, 2, 'exit');
      vill('chandler', 20, 3);
    }),
  },
  {
    name: 'Open Field',
    desc: 'Grass · 13×13 · Wide-open field with mud trap and pushable obstacles.',
    data: buildMap(({ fill, outerWalls, obj, spec, vill }) => {
      fill(0,0, 13,13, 'grass');
      outerWalls(0,0, 13,13);
      obj(3,3,'pushable'); obj(9,3,'pushable');
      obj(3,9,'pushable'); obj(9,9,'pushable');
      obj(6,2,'pushable'); obj(6,10,'pushable');
      for (let r=5;r<=7;r++) for (let c=5;c<=7;c++) obj(c,r,'mud');
      spec(2, 6, 'pickup_spray');
      spec(10, 6, 'pickup_mirror');
      spec(1,11,'player');
      spec(11,1,'exit');
      vill('chandler', 11, 11);
    }),
  },
  {
    name: 'Lunch Rush',
    desc: 'Cafeteria · 14×10 · Three table rows form corridors. Spilled mud is a trap.',
    data: buildMap(({ fill, outerWalls, obj, spec, vill }) => {
      fill(0,0, 14,10, 'cafeteria');
      outerWalls(0,0, 14,10);
      // Tables (use desk sprites)
      for (let c=1;c<=4;c++)   obj(c, 2, 'desk');
      for (let c=9;c<=12;c++)  obj(c, 2, 'desk');
      for (let c=3;c<=6;c++)   obj(c, 5, 'desk');
      for (let c=7;c<=10;c++)  obj(c, 5, 'desk');
      for (let c=1;c<=4;c++)   obj(c, 8, 'desk');
      for (let c=9;c<=12;c++)  obj(c, 8, 'desk');
      // Mud spills
      obj(6,2,'mud'); obj(7,2,'mud');
      obj(1,5,'mud'); obj(12,5,'mud');
      obj(6,8,'mud'); obj(7,8,'mud');
      // Pickups
      spec(2, 4, 'pickup_gel');
      spec(11, 6, 'pickup_spray');
      spec(1,8,'player');
      spec(12,1,'exit');
      vill('chandler', 7, 1);
    }),
  },
  {
    name: 'Office Block',
    desc: 'Carpet · 16×12 · Office dividers create a winding path. Desks block sightlines.',
    data: buildMap(({ fill, outerWalls, obj, spec, vill }) => {
      fill(0,0, 16,12, 'carpet');
      outerWalls(0,0, 16,12);
      for (let c=0;c<=10;c++)  obj(c, 3, 'desk');
      for (let c=5;c<=15;c++)  obj(c, 7, 'desk');
      obj(2,1,'pushable'); obj(8,1,'pushable');
      obj(7,5,'pushable'); obj(12,5,'pushable');
      obj(2,9,'pushable'); obj(13,9,'pushable');
      // Pickups
      spec(13, 1, 'pickup_mirror');
      spec(1, 9, 'pickup_gel');
      spec(1,10,'player');
      spec(14,1,'exit');
      vill('chandler', 12, 2);
    }),
  },
  {
    name: 'Schoolhouse',
    desc: 'Hallway + classroom · 18×11 · A real classroom with blackboard, desks, lockers.',
    data: buildMap(({ fill, outerWalls, obj, spec, vill }) => {
      // Hallway band
      fill(0,4, 18,3, 'hallway');
      // Classroom on top
      fill(2,0, 14,4, 'classroom');
      // Classroom on bottom
      fill(2,7, 14,4, 'classroom');
      // Outer walls
      outerWalls(0,0, 18,11);
      // Lockers along hallway
      for (let c = 1; c <= 16; c++) {
        if (c < 8 || c > 9) {
          obj(c, 4, 'locker');
          obj(c, 6, 'locker');
        }
      }
      // Doors connect classrooms to hallway
      obj(8, 4, 'door');
      obj(9, 6, 'door');
      // Top classroom contents
      obj(8, 0, 'blackboard');
      obj(4, 2, 'desk'); obj(7, 2, 'desk'); obj(10, 2, 'desk'); obj(13, 2, 'desk');
      obj(4, 3, 'pushable'); obj(7, 3, 'pushable'); obj(10, 3, 'pushable'); obj(13, 3, 'pushable');
      // Bottom classroom contents
      obj(8, 10, 'blackboard');
      obj(4, 8, 'desk'); obj(7, 8, 'desk'); obj(10, 8, 'desk'); obj(13, 8, 'desk');
      obj(4, 9, 'pushable'); obj(7, 9, 'pushable'); obj(10, 9, 'pushable'); obj(13, 9, 'pushable');
      // Pickups
      spec(15, 5, 'pickup_gel');
      spec(2, 5, 'pickup_spray');
      spec(8, 9, 'pickup_mirror');
      // Specials
      spec(1, 5, 'player');
      spec(16, 5, 'exit');
      vill('chandler', 16, 8);
    }),
  },
];

function renderMinimap(data, cvs) {
  const c = cvs.getContext('2d');
  const keys = Object.keys(data.cells);
  if (!keys.length) return;

  let minC=60, maxC=0, minR=60, maxR=0;
  for (const k of keys) {
    const [col,row] = k.split(',').map(Number);
    minC = Math.min(minC,col); maxC = Math.max(maxC,col);
    minR = Math.min(minR,row); maxR = Math.max(maxR,row);
  }
  const cols = maxC - minC + 1, rows = maxR - minR + 1;
  const pad = 4;
  const cs = Math.min(
    Math.floor((cvs.width  - pad*2) / cols),
    Math.floor((cvs.height - pad*2) / rows),
    16
  );
  const ox = Math.floor((cvs.width  - cols*cs) / 2);
  const oy = Math.floor((cvs.height - rows*cs) / 2);

  c.imageSmoothingEnabled = false;
  c.fillStyle = '#1a0e04';
  c.fillRect(0, 0, cvs.width, cvs.height);

  // Backgrounds
  for (const [k, cell] of Object.entries(data.cells)) {
    const [col,row] = k.split(',').map(Number);
    const x = ox + (col - minC) * cs, y = oy + (row - minR) * cs;
    const tile = tileCache[cell.background] || tileCache.empty;
    c.drawImage(tile, x, y, cs, cs);
  }
  // Borders
  for (const [k, cell] of Object.entries(data.cells)) {
    const [col,row] = k.split(',').map(Number);
    const x = ox + (col - minC) * cs, y = oy + (row - minR) * cs;
    for (const dir of ['n','s','e','w']) {
      if (cell.borders[dir]) window.MB_drawBrickEdge(c, dir, x, y, cs);
    }
  }
  // Objects
  for (const [k, cell] of Object.entries(data.cells)) {
    if (!cell.object) continue;
    const [col,row] = k.split(',').map(Number);
    const x = ox + (col - minC) * cs, y = oy + (row - minR) * cs;
    const def = OBJ_DEFS[cell.object];
    const drawFn = def && {
      wall: window.MB_drawWall,
      chair: window.MB_drawPushable,
      mud: window.MB_drawMud,
      locker: window.MB_drawLocker,
      desk: window.MB_drawDesk,
      door: window.MB_drawDoor,
      blackboard: window.MB_drawBlackboard,
      hedge: window.MB_drawHedge, bush: window.MB_drawBush, fence: window.MB_drawFence,
      stump: window.MB_drawStump, rock: window.MB_drawRock, snowman: window.MB_drawSnowman,
      barrel: window.MB_drawBarrel, crate: window.MB_drawCrate, backpack: window.MB_drawBackpack,
      toilet: window.MB_drawToilet, sink: window.MB_drawSink, flag: window.MB_drawFlag,
      trashcan: window.MB_drawTrashcan, fountain: window.MB_drawFountain,
      bookshelf: window.MB_drawBookshelf, bulletinboard: window.MB_drawBulletinboard,
      basketball: window.MB_drawBasketball, hurdle: window.MB_drawHurdle,
      dodgeball: window.MB_drawDodgeball, soccerball: window.MB_drawSoccerball,
      baseball: window.MB_drawBaseball, cone: window.MB_drawCone,
      sportsbag: window.MB_drawSportsbag, flowerpatch: window.MB_drawFlowerpatch,
      sign: window.MB_drawSign, campfire: window.MB_drawCampfire,
    }[def.draw];
    if (drawFn) drawFn(c, x, y, cs);
  }
  // Specials
  for (const [k, cell] of Object.entries(data.cells)) {
    if (!cell.special) continue;
    const [col,row] = k.split(',').map(Number);
    const x = ox + (col - minC) * cs, y = oy + (row - minR) * cs;
    const drawFn = {
      player: (cc, x, y, s) => Sprites.drawJaxInCell(cc, x, y, s, 0, 1),
      exit: (cc, x, y, s) => Sprites.drawExit(cc, x, y, s, 0),
      pickup_gel: Sprites.drawGel,
      pickup_mirror: Sprites.drawMirror,
      pickup_spray: Sprites.drawSpray,
    }[cell.special];
    if (drawFn) drawFn(c, x, y, cs);
  }
  // Villains
  for (const v of (data.villains || [])) {
    const x = ox + (v.col - minC) * cs, y = oy + (v.row - minR) * cs;
    drawVillainInCell(c, x, y, cs, v.type, 0, 1, false);
  }
}

function openTemplatesModal() {
  const modal = document.getElementById('templates-modal');
  const grid  = document.getElementById('template-cards');
  grid.innerHTML = '';

  TEMPLATES.forEach((tpl, idx) => {
    const card = document.createElement('div');
    card.className = 'tpl-card';

    const cvs = document.createElement('canvas');
    cvs.className = 'tpl-preview';
    cvs.width  = 320;
    cvs.height = 160;

    const name = document.createElement('div');
    name.className = 'tpl-name';
    name.textContent = '★ ' + tpl.name.toUpperCase();

    const desc = document.createElement('div');
    desc.className = 'tpl-desc';
    desc.textContent = tpl.desc;

    const btn = document.createElement('button');
    btn.className = 'tpl-load';
    btn.textContent = 'LOAD MAP';
    btn.addEventListener('click', () => loadTemplate(idx));

    card.append(cvs, name, desc, btn);
    grid.appendChild(card);

    requestAnimationFrame(() => renderMinimap(tpl.data, cvs));
  });

  modal.style.display = 'flex';
}

function loadTemplate(idx) {
  if (Object.keys(cells).length > 0 && !confirm('Load this template? Current work will be lost.')) return;
  document.getElementById('templates-modal').style.display = 'none';
  resetDraftState();
  loadMap(TEMPLATES[idx].data);
}

// ── Map Info Modal ──
function updateMapNameDisplay() {
  const name = document.getElementById('meta-name').value.trim();
  const display = document.getElementById('map-name-display');
  const text = document.getElementById('map-name-text');
  if (name) {
    text.textContent = name;
    display.classList.remove('untitled');
  } else {
    text.textContent = 'Untitled Level';
    display.classList.add('untitled');
  }
}
document.getElementById('map-name-display').addEventListener('click', () => {
  document.getElementById('map-info-modal').style.display = 'flex';
  document.getElementById('meta-name').focus();
  // Danger zone only appears when there's a server-side draft to delete.
  const hasDraft = !!draftCode;
  document.getElementById('map-info-danger-divider').style.display = hasDraft ? '' : 'none';
  document.getElementById('map-info-danger').style.display = hasDraft ? '' : 'none';
});

async function deleteCurrentDraft() {
  if (!creatorKey || !draftCode) return;
  const codeToDelete = draftCode;
  const name = document.getElementById('meta-name').value.trim() || 'Untitled';
  if (!confirm(`Permanently delete "${name}" (${codeToDelete})?\n\nThis cannot be undone. Anyone holding this code will lose access.`)) return;

  try {
    const res = await fetch(`/api/unofficial/${codeToDelete}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorKey }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);

    cells = {};
    specials = { player:null, exit:null,
                 pickup_gel:null, pickup_mirror:null, pickup_spray:null };
    villainsPlaced = [];
    selected = null;
    document.getElementById('meta-name').value   = '';
    document.getElementById('meta-author').value = '';
    document.getElementById('meta-desc').value   = '';
    updateMapNameDisplay();
    resetDraftState();
    centerOnGrid();
    refreshSidebar();
    render();

    document.getElementById('map-info-modal').style.display = 'none';
    setSaveStatus(`Deleted ${codeToDelete}`, '#ff9944');
  } catch (err) {
    showAlert('Delete failed: ' + err.message, 'Delete Failed');
  }
}
document.getElementById('btn-delete-draft').addEventListener('click', deleteCurrentDraft);
document.getElementById('meta-name').addEventListener('input', updateMapNameDisplay);
document.getElementById('map-info-close').addEventListener('click', () => {
  document.getElementById('map-info-modal').style.display = 'none';
  updateMapNameDisplay();
});
document.getElementById('map-info-apply').addEventListener('click', () => {
  document.getElementById('map-info-modal').style.display = 'none';
  updateMapNameDisplay();
});
document.getElementById('map-info-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('map-info-modal')) {
    document.getElementById('map-info-modal').style.display = 'none';
    updateMapNameDisplay();
  }
});

document.getElementById('btn-templates').addEventListener('click', openTemplatesModal);
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('templates-modal').style.display = 'none';
});
document.getElementById('templates-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('templates-modal'))
    document.getElementById('templates-modal').style.display = 'none';
});

// ─────────────────────────────────────────────
// QUICK BUILDS — drag/stamp pre-built room layouts
// ─────────────────────────────────────────────
const QB_LIST_URL = '/api/quick-builds';
// Quick Build authoring (the SAVE QB button + Ctrl-Shift-Q shortcut) is a
// dev-time tool: the saved JSON is meant to be committed to the repo. Gated
// to localhost so it never appears in production.
const QB_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
function isQuickBuildDevEnv() { return QB_DEV_HOSTS.has(location.hostname); }
let qbBuilds   = [];     // [{ name, description, _cells, width, height, ... }]
let placingQB  = null;   // current build being ghost-rendered + stamped on click
let draggingQB = null;   // build currently being HTML5-dragged from the modal
let qbDidDrop  = false;  // set by canvas drop handler so dragend knows not to "cancel"

async function loadQuickBuilds() {
  try {
    const res = await fetch(QB_LIST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('list ' + res.status);
    const body = await res.json();
    const builds = Array.isArray(body.builds) ? body.builds : [];
    qbBuilds = builds.map(expandQuickBuild);
  } catch (err) {
    console.warn('Quick Builds could not be loaded:', err);
    qbBuilds = [];
  }
}

// Normalize either compact form (defaultBackground/outerWalls/objects/borders/backgrounds)
// or full form (cells dict) into a canonical { _cells, width, height } shape.
function expandQuickBuild(qb) {
  if (qb._cells) return qb;
  const out = {};

  if (qb.cells && typeof qb.cells === 'object') {
    let maxC = 0, maxR = 0;
    for (const [k, c] of Object.entries(qb.cells)) {
      const [col, row] = k.split(',').map(Number);
      if (col > maxC) maxC = col;
      if (row > maxR) maxR = row;
      out[`${col},${row}`] = {
        background: c.background || 'empty',
        borders: { n:false, s:false, e:false, w:false, ...(c.borders || {}) },
        object: c.object || null,
        rotation: c.rotation || 0,
      };
    }
    qb.width  = qb.width  || (maxC + 1);
    qb.height = qb.height || (maxR + 1);
  } else {
    const w = qb.width || 0, h = qb.height || 0;
    const bg = qb.defaultBackground || 'empty';
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const borders = { n:false, s:false, e:false, w:false };
        if (qb.outerWalls) {
          if (r === 0)     borders.n = true;
          if (r === h - 1) borders.s = true;
          if (c === 0)     borders.w = true;
          if (c === w - 1) borders.e = true;
        }
        out[`${c},${r}`] = { background: bg, borders, object: null, rotation: 0 };
      }
    }
    for (const e of (qb.backgrounds || [])) {
      const k = `${e.col},${e.row}`;
      if (out[k]) out[k].background = e.type;
    }
    for (const e of (qb.objects || [])) {
      const k = `${e.col},${e.row}`;
      if (out[k]) {
        out[k].object   = e.type;
        out[k].rotation = e.rotation || 0;
      }
    }
    for (const e of (qb.borders || [])) {
      const k = `${e.col},${e.row}`;
      if (out[k] && Array.isArray(e.dirs))
        for (const d of e.dirs) out[k].borders[d] = true;
    }
  }

  qb._cells = out;
  return qb;
}

function openQuickBuildsModal() {
  if (placingQB) cancelPlaceMode();
  const modal = document.getElementById('quick-builds-modal');
  const grid  = document.getElementById('qb-cards');
  grid.innerHTML = '';

  if (!qbBuilds.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;color:#d4b483;text-align:center;padding:24px;font-size:12px;';
    empty.textContent = 'No quick builds available. Drop JSON files into games/quick-builds/ and they will appear here automatically.';
    grid.appendChild(empty);
  }

  qbBuilds.forEach((qb) => {
    const card = document.createElement('div');
    card.className = 'qb-card';

    const cvs = document.createElement('canvas');
    cvs.className = 'qb-preview';
    cvs.width  = 220; cvs.height = 140;
    cvs.draggable = true;
    cvs.title = 'Drag onto the grid to stamp, or use PLACE.';
    cvs.addEventListener('dragstart', (e) => {
      draggingQB = qb;
      placingQB  = qb;
      qbDidDrop  = false;
      card.classList.add('dragging');
      modal.classList.add('dragging');
      // Use the thumbnail as the drag image so cursor carries something.
      try { e.dataTransfer.setDragImage(cvs, cvs.width / 2, cvs.height / 2); } catch (_) {}
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', qb.name);
    });
    cvs.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      modal.classList.remove('dragging');
      draggingQB = null;
      if (qbDidDrop) {
        modal.style.display = 'none';
      }
      // Always clear ghost state and re-render.
      placingQB = null;
      hoverCell = null;
      qbDidDrop = false;
      render();
    });

    const name = document.createElement('div');
    name.className = 'qb-name';
    name.textContent = '★ ' + qb.name.toUpperCase();

    const desc = document.createElement('div');
    desc.className = 'qb-desc';
    desc.textContent = qb.description || '';

    const btn = document.createElement('button');
    btn.className = 'qb-place';
    btn.textContent = 'PLACE ↘';
    btn.addEventListener('click', () => {
      modal.style.display = 'none';
      enterPlaceMode(qb);
    });

    card.append(cvs, name, desc, btn);
    grid.appendChild(card);
    requestAnimationFrame(() => renderMinimap({ cells: qb._cells, villains: [] }, cvs));
  });

  modal.style.display = 'flex';
}

function enterPlaceMode(qb) {
  placingQB = qb;
  document.body.classList.add('qb-placing');
  document.getElementById('qb-place-name').textContent = '★ ' + qb.name.toUpperCase();
  document.getElementById('qb-place-hud').style.display = 'flex';
  render();
}

function cancelPlaceMode() {
  placingQB = null;
  document.body.classList.remove('qb-placing');
  document.getElementById('qb-place-hud').style.display = 'none';
  hoverCell = null;
  render();
}

function stampQuickBuild(qb, anchorCol, anchorRow) {
  expandQuickBuild(qb);
  const stamped = [];
  for (const [k, lcell] of Object.entries(qb._cells)) {
    const [lc, lr] = k.split(',').map(Number);
    const c = anchorCol + lc, r = anchorRow + lr;
    if (!inGrid(c, r)) continue;
    const targetKey = `${c},${r}`;
    const existing = cells[targetKey];
    // Clear special / villain on overwritten cells.
    if (existing && existing.special && specials[existing.special]) {
      specials[existing.special] = null;
    }
    villainsPlaced = villainsPlaced.filter(v => !(v.col === c && v.row === r));
    cells[targetKey] = {
      background: lcell.background,
      borders: { n:false, s:false, e:false, w:false },
      object: lcell.object,
      rotation: lcell.rotation,
      special: null,
    };
    stamped.push([c, r]);
  }
  // Re-derive borders so walls only appear at the edge of the active region.
  // Run autoBorders on every stamped cell *and* every adjacent cell so neighbours
  // outside the stamp drop walls that now face into it.
  const seen = new Set();
  const queue = [];
  for (const [c, r] of stamped) {
    const k = `${c},${r}`;
    if (!seen.has(k)) { seen.add(k); queue.push([c, r]); }
    for (const [, [dc, dr]] of Object.entries(DELTA)) {
      const nk = `${c + dc},${r + dr}`;
      if (cells[nk] && !seen.has(nk)) { seen.add(nk); queue.push([c + dc, r + dr]); }
    }
  }
  for (const [c, r] of queue) autoBorders(c, r);

  selected = null;
  refreshSidebar();
  render();
}

function drawQuickBuildGhost(qb, anchorCol, anchorRow) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (const [k, lcell] of Object.entries(qb._cells)) {
    const [lc, lr] = k.split(',').map(Number);
    const c = anchorCol + lc, r = anchorRow + lr;
    if (!inGrid(c, r)) continue;
    drawCellBackground(c, r, lcell);
    drawCellBorders(c, r, lcell);
    drawCellObject(c, r, lcell);
  }
  ctx.restore();
  // Stamp area outline
  const x = anchorCol * cellSize + panX;
  const y = anchorRow * cellSize + panY;
  const w = qb.width * cellSize, h = qb.height * cellSize;
  ctx.strokeStyle = 'rgba(102, 255, 153, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -animTime * 12;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// Canvas drop handlers — only active while a card is being dragged.
canvas.addEventListener('dragover', (e) => {
  if (!draggingQB) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const { col, row } = screenToCell(sx, sy);
  const inside = inGrid(col, row);
  hoverCell = inside ? { col, row } : null;
  render();
});
canvas.addEventListener('dragleave', () => {
  if (!draggingQB) return;
  hoverCell = null;
  render();
});
canvas.addEventListener('drop', (e) => {
  if (!draggingQB) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const { col, row } = screenToCell(sx, sy);
  if (inGrid(col, row)) {
    stampQuickBuild(draggingQB, col, row);
    qbDidDrop = true;
  }
});

document.getElementById('btn-quick-builds').addEventListener('click', openQuickBuildsModal);
document.getElementById('qb-close').addEventListener('click', () => {
  document.getElementById('quick-builds-modal').style.display = 'none';
});
document.getElementById('quick-builds-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('quick-builds-modal'))
    document.getElementById('quick-builds-modal').style.display = 'none';
});
document.getElementById('qb-place-cancel').addEventListener('click', cancelPlaceMode);

// ── Admin: save current map as Quick Build ─────────────────
function openSaveQBModal() {
  if (!isQuickBuildDevEnv()) return;
  if (Object.keys(cells).length === 0) {
    showAlert('No cells to save. Place some backgrounds and objects first.', 'Nothing to Save');
    return;
  }
  document.getElementById('qb-save-name').value = '';
  document.getElementById('qb-save-desc').value = '';
  document.getElementById('qb-save-status').textContent = '';
  document.getElementById('qb-save-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('qb-save-name').focus(), 0);
}

function buildQBPayloadFromMap(name, desc) {
  const keys = Object.keys(cells);
  if (!keys.length) return null;
  let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity;
  for (const k of keys) {
    const [c, r] = k.split(',').map(Number);
    if (c < minC) minC = c; if (c > maxC) maxC = c;
    if (r < minR) minR = r; if (r > maxR) maxR = r;
  }
  const outCells = {};
  for (const [k, cell] of Object.entries(cells)) {
    const [c, r] = k.split(',').map(Number);
    outCells[`${c - minC},${r - minR}`] = {
      background: cell.background,
      borders: { ...cell.borders },
      object: cell.object,
      rotation: cell.rotation || 0,
    };
  }
  return {
    name,
    description: desc,
    data: {
      width:  maxC - minC + 1,
      height: maxR - minR + 1,
      cells:  outCells,
    },
  };
}

async function saveQB() {
  const name = document.getElementById('qb-save-name').value.trim();
  const desc = document.getElementById('qb-save-desc').value.trim();
  const status = document.getElementById('qb-save-status');
  const btn    = document.getElementById('qb-save-download');

  if (!name) { status.textContent = 'Name required.'; return; }

  const payload = buildQBPayloadFromMap(name, desc);
  if (!payload) { status.textContent = 'No cells to save.'; return; }

  async function send(overwrite) {
    return fetch('/api/quick-builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, overwrite }),
    });
  }

  btn.disabled = true;
  status.textContent = 'Saving…';
  try {
    let res = await send(false);
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const ok = confirm(`A Quick Build named "${body.file}" already exists. Overwrite?`);
      if (!ok) { status.textContent = 'Cancelled.'; return; }
      res = await send(true);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      status.textContent = 'Save failed: ' + (body.error || res.status);
      return;
    }
    const body = await res.json();
    status.textContent = body.overwrote ? `Updated ${body.file}` : `Wrote ${body.file}`;
    // Refresh the in-memory list so the new build is immediately stampable.
    await loadQuickBuilds();
    setTimeout(() => {
      document.getElementById('qb-save-modal').style.display = 'none';
    }, 600);
  } catch (err) {
    status.textContent = 'Save failed: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('qb-save-close').addEventListener('click', () => {
  document.getElementById('qb-save-modal').style.display = 'none';
});
document.getElementById('qb-save-download').addEventListener('click', saveQB);
document.getElementById('qb-save-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('qb-save-modal'))
    document.getElementById('qb-save-modal').style.display = 'none';
});

loadQuickBuilds();

// ─────────────────────────────────────────────
// DRAFT SESSION — creator key + server persistence
// ─────────────────────────────────────────────
let creatorKey = null;
let draftCode  = null;
let isLocked   = false;
let isRejected = false;
let rejectionReason = null;
let autoSaveTimer = null;
let lastSavedAt   = null;
let isSaving      = false;

const CREATOR_KEY_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function generateCreatorKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = n => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(4)}-${rand(4)}`;
}

function buildMapPayload() {
  const metaName   = document.getElementById('meta-name').value.trim();
  const metaAuthor = document.getElementById('meta-author').value.trim();
  const metaDesc   = document.getElementById('meta-desc').value.trim();
  const data = {
    version: MAP_VERSION,
    name:        metaName  || 'Untitled',
    author:      metaAuthor || 'Unknown',
    description: metaDesc,
    playerStart: specials.player,
    exit:        specials.exit,
    villains:    villainsPlaced.map(v => ({ type: v.type, col: v.col, row: v.row, data: v.data || {} })),
    pickups: {
      gel:    specials.pickup_gel,
      mirror: specials.pickup_mirror,
      spray:  specials.pickup_spray,
    },
    cells: {},
  };
  for (const [k, cell] of Object.entries(cells)) {
    data.cells[k] = {
      background: cell.background,
      borders:    { ...cell.borders },
      object:     cell.object,
      rotation:   cell.rotation || 0,
      special:    cell.special,
    };
  }
  return data;
}

function resetDraftState() {
  draftCode = null; isLocked = false; lastSavedAt = null;
  isRejected = false; rejectionReason = null;
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
  localStorage.removeItem('cw_draft_code');
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-submit').textContent = 'SUBMIT';
  setSaveStatus('');
  setBuilderLocked(false);
  renderStatusBanner();
}

function setSaveStatus(msg, color) {
  const el = document.getElementById('save-status');
  if (el) { el.textContent = msg; el.style.color = color || '#a08858'; }
}

function setBuilderLocked(locked) {
  isLocked = locked;
  const inputs = [
    'meta-name', 'meta-author', 'meta-desc',
  ].map(id => document.getElementById(id)).filter(Boolean);
  inputs.forEach(el => { el.disabled = locked; });
  document.querySelectorAll('.obj-swatch, .bg-swatch, .spec-btn, .rot-btn, .obj-place-item').forEach(el => {
    el.style.pointerEvents = locked ? 'none' : '';
    el.style.opacity = locked ? '0.4' : '';
  });
  document.getElementById('btn-deactivate').disabled = locked;
  const submit = document.getElementById('btn-submit');
  if (submit) {
    submit.disabled = locked;
    submit.textContent = locked ? 'SUBMITTED ✓' : 'SUBMIT';
  }
  if (locked) {
    tool = 'select';
    document.querySelectorAll('[id^="t-"]').forEach(b => b.disabled = true);
    canvas.style.cursor = 'default';
  } else {
    document.querySelectorAll('[id^="t-"]').forEach(b => b.disabled = false);
  }
  renderStatusBanner();
}

// Renders the banner above the workspace based on isLocked / isRejected.
function renderStatusBanner() {
  const banner   = document.getElementById('status-banner');
  const textEl   = document.getElementById('status-banner-text');
  const reasonEl = document.getElementById('status-banner-reason');
  const btn      = document.getElementById('btn-banner-action');
  if (!banner) return;

  banner.className = '';
  btn.style.display = 'none';
  btn.onclick = null;

  if (isLocked) {
    banner.classList.add('submitted');
    textEl.textContent = '★ SUBMITTED — awaiting admin review.';
    reasonEl.textContent = 'Need to make changes? Withdraw your submission to keep editing.';
    btn.textContent = 'WITHDRAW';
    btn.style.display = '';
    btn.onclick = withdrawSubmission;
    return;
  }
  if (isRejected) {
    banner.classList.add('rejected');
    textEl.textContent = '✕ REJECTED —';
    reasonEl.textContent = rejectionReason || 'No reason given.';
    return;
  }
}

async function withdrawSubmission() {
  if (!creatorKey || !draftCode || !isLocked) return;
  if (!confirm('Withdraw this submission? You\'ll be able to edit again, but you\'ll need to play through and resubmit.')) return;

  try {
    const res = await fetch(`/api/unofficial/${draftCode}/unsubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorKey }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    setBuilderLocked(false);
    setSaveStatus('Submission withdrawn — editing resumed', '#ffd84a');
    startAutoSave();
  } catch (err) {
    showAlert('Withdraw failed: ' + err.message, 'Withdraw Failed');
  }
}

function startAutoSave() {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(() => saveDraft(true), 30_000);
}

async function saveDraft(silent = false) {
  if (!creatorKey) return;
  if (isLocked) return;
  if (isSaving) return;

  const errors = [];
  if (Object.keys(cells).length === 0) errors.push('No active cells.');
  if (!specials.player)              errors.push('No Jax start position.');
  if (!specials.exit)                errors.push('No exit position.');
  if (villainsPlaced.length === 0)   errors.push('No villains placed.');
  if (errors.length) {
    if (!silent) showAlert('Cannot save draft:\n\n' + errors.join('\n'), 'Cannot Save');
    return;
  }

  isSaving = true;
  setSaveStatus('Saving…', '#e8c840');

  try {
    const body = { creatorKey, mapData: buildMapPayload() };
    if (draftCode) body.code = draftCode;

    const res = await fetch('/api/unofficial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const { code } = await res.json();
    const isNew = !draftCode;
    draftCode = code;
    localStorage.setItem('cw_draft_code', code);
    lastSavedAt = new Date();

    setSaveStatus('Saved ' + lastSavedAt.toLocaleTimeString(), '#66ff99');

    if (isNew) {
      document.getElementById('btn-submit').disabled = false;
      showFirstSavePanel(code);
      startAutoSave();
    }
  } catch (err) {
    setSaveStatus('Save failed: ' + err.message, '#ff6666');
  } finally {
    isSaving = false;
  }
}

function showFirstSavePanel(code) {
  const msg = `✓ Draft saved!\n\nMap Code: ${code}\n\nShare this code so others can find your map once it's approved. Your creator key controls editing — keep it safe.`;
  showAlert(msg, 'Draft Saved');
}

// ─────────────────────────────────────────────
// SUBMIT FLOW — play-to-submit gate
//
// The creator must beat their own level inside an iframe before the SUBMIT
// button on the modal becomes active. The iframe game posts
// { type: 'test:win', time } when the player reaches the exit. We record the
// time on the server (as a record-of-trust), then call /submit.
// ─────────────────────────────────────────────
let submitFlowMap = null;
let submitFlowReady = false;
let submitFlowVerified = false;
let submitFlowTime = null;

function postToSubmitIframe(msg) {
  const iframe = document.getElementById('submit-iframe');
  if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(msg, '*');
}

function setSubmitStatus(text, kind) {
  const el = document.getElementById('submit-status');
  if (!el) return;
  el.textContent = text;
  el.className = kind || '';
}

async function submitForReview() {
  if (!creatorKey || !draftCode || isLocked) return;

  // Make sure the latest state is on the server before opening the playthrough.
  // A pending save would otherwise mean the iframe loads an outdated map.
  if (isSaving) {
    showAlert('Still saving — try again in a moment.', 'Wait');
    return;
  }
  await saveDraft(true);

  const errors = [];
  if (Object.keys(cells).length === 0) errors.push('No active cells.');
  if (!specials.player) errors.push('No Jax start position.');
  if (!specials.exit)   errors.push('No exit position.');
  if (villainsPlaced.length === 0) errors.push('No villains placed.');
  if (errors.length) {
    showAlert('Cannot submit:\n\n' + errors.join('\n'), 'Cannot Submit');
    return;
  }

  submitFlowMap = buildMapPayload();
  submitFlowReady = false;
  submitFlowVerified = false;
  submitFlowTime = null;

  document.getElementById('btn-submit-confirm').disabled = true;
  setSubmitStatus('Loading playthrough…');

  document.getElementById('submit-modal').style.display = 'flex';
  document.getElementById('submit-iframe').src = '/?test=1';
}

function closeSubmitFlow() {
  submitFlowMap = null;
  submitFlowReady = false;
  submitFlowVerified = false;
  submitFlowTime = null;
  document.getElementById('submit-modal').style.display = 'none';
  document.getElementById('submit-iframe').src = 'about:blank';
}

async function confirmSubmit() {
  if (!submitFlowVerified || !creatorKey || !draftCode) return;
  const btn = document.getElementById('btn-submit-confirm');
  btn.disabled = true;
  setSubmitStatus('Submitting…');

  try {
    const verifyRes = await fetch(`/api/unofficial/${draftCode}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorKey, time: submitFlowTime }),
    });
    if (!verifyRes.ok) throw new Error((await verifyRes.json().catch(() => ({}))).error || `verify ${verifyRes.status}`);

    const submitRes = await fetch(`/api/unofficial/${draftCode}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorKey }),
    });
    if (!submitRes.ok) throw new Error((await submitRes.json().catch(() => ({}))).error || `submit ${submitRes.status}`);

    isRejected = false;
    rejectionReason = null;
    setBuilderLocked(true);
    setSaveStatus('Submitted for review ✓', '#aa88ff');
    closeSubmitFlow();
  } catch (err) {
    setSubmitStatus('Submit failed: ' + err.message, 'error');
    btn.disabled = false;
  }
}

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;

  // Submit flow iframe
  if (document.getElementById('submit-modal').style.display !== 'none') {
    if (msg.type === 'test:ready') {
      submitFlowReady = true;
      if (submitFlowMap) {
        postToSubmitIframe({ type: 'test:load', map: submitFlowMap });
        setSubmitStatus('Beat the level to enable submit. Restart anytime.');
      }
    } else if (msg.type === 'test:win' && !submitFlowVerified) {
      submitFlowVerified = true;
      submitFlowTime = Number(msg.time) || 0;
      setSubmitStatus(`✓ Level beaten in ${submitFlowTime.toFixed(2)}s — ready to submit`, 'success');
      document.getElementById('btn-submit-confirm').disabled = false;
    }
  }
});

document.getElementById('btn-submit-cancel').addEventListener('click', closeSubmitFlow);
document.getElementById('btn-submit-restart').addEventListener('click', () => {
  if (submitFlowReady && submitFlowMap) {
    submitFlowVerified = false;
    submitFlowTime = null;
    document.getElementById('btn-submit-confirm').disabled = true;
    setSubmitStatus('Beat the level to enable submit. Restart anytime.');
    postToSubmitIframe({ type: 'test:restart' });
  }
});
document.getElementById('btn-submit-confirm').addEventListener('click', confirmSubmit);
document.getElementById('submit-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('submit-modal')) closeSubmitFlow();
});

async function loadDraftFromServer() {
  if (!creatorKey || !draftCode) return;
  try {
    setSaveStatus('Loading draft…', '#e8c840');
    const res = await fetch(`/api/unofficial/${draftCode}?creatorKey=${encodeURIComponent(creatorKey)}`);
    if (!res.ok) {
      // Draft may have been approved or deleted — clear local reference
      if (res.status === 403 || res.status === 404) {
        localStorage.removeItem('cw_draft_code');
        draftCode = null;
      }
      setSaveStatus('');
      return;
    }
    const payload = await res.json();
    const meta = payload._meta || {};
    delete payload._meta;

    if (meta.official) {
      // The map has been approved — it lives in the official catalog now and
      // is no longer editable. Drop the local draft pointer.
      localStorage.removeItem('cw_draft_code');
      draftCode = null;
      setSaveStatus('');
      showAlert(
        'This level was approved and published. It now lives in the official catalog and is no longer editable as a draft.\n\nStart a new map to keep building.',
        'Already Official',
      );
      return;
    }

    loadMap(payload);

    isRejected = !!meta.rejected && !meta.locked;
    rejectionReason = meta.rejectionReason || null;
    setBuilderLocked(!!meta.locked);

    document.getElementById('btn-submit').disabled = !!meta.locked;
    if (!meta.locked) startAutoSave();
    setSaveStatus('Draft loaded ✓', '#66ff99');
  } catch (err) {
    setSaveStatus('');
  }
}

// ── Session overlay handlers ──
(function initSessionOverlay() {
  const keyInput   = document.getElementById('key-input');
  const keyError   = document.getElementById('key-error');
  const draftInfo  = document.getElementById('draft-info');
  const draftDisp  = document.getElementById('draft-code-display');

  // Pre-fill from localStorage
  const savedKey   = localStorage.getItem('cw_key');
  const savedCode  = localStorage.getItem('cw_draft_code');
  if (savedKey)  keyInput.value = savedKey;
  if (savedCode && draftDisp) {
    draftDisp.textContent = savedCode;
    draftInfo.style.display = '';
  }

  keyInput.addEventListener('input', function () {
    keyError.textContent = '';
    // Auto-format XXXX-XXXX
    let raw = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    this.value = raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw;
  });

  keyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') continueSession();
    // Backspace through dash
    if (e.key === 'Backspace' && keyInput.selectionStart === 5 && keyInput.selectionEnd === 5) {
      e.preventDefault();
      let raw = keyInput.value.replace(/-/g, '').slice(0, 3);
      keyInput.value = raw;
    }
  });

  document.getElementById('btn-generate-key').addEventListener('click', () => {
    keyInput.value = generateCreatorKey();
    keyError.textContent = '';
  });

  document.getElementById('btn-continue-key').addEventListener('click', continueSession);

  function continueSession() {
    let raw = keyInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length !== 8) {
      keyError.textContent = 'Key must be 8 characters (XXXX-XXXX)';
      return;
    }
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    creatorKey = formatted;
    localStorage.setItem('cw_key', formatted);

    const savedCode = localStorage.getItem('cw_draft_code');
    if (savedCode) draftCode = savedCode;

    document.getElementById('session-overlay').style.display = 'none';

    if (draftCode) loadDraftFromServer();
  }
})();

(() => {
  const btnSave = document.getElementById('btn-save-draft');
  const menu    = document.getElementById('save-menu');
  const devMode = isQuickBuildDevEnv();

  if (devMode) {
    btnSave.textContent = 'SAVE ▾';
    btnSave.title = 'Save options';
    btnSave.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'flex' : 'none';
    });
    document.getElementById('mi-save-draft').addEventListener('click', () => {
      menu.style.display = 'none';
      saveDraft(false);
    });
    document.getElementById('mi-save-qb').addEventListener('click', () => {
      menu.style.display = 'none';
      openSaveQBModal();
    });
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== btnSave) menu.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') menu.style.display = 'none';
    });
  } else {
    btnSave.addEventListener('click', () => saveDraft(false));
  }
})();
document.getElementById('btn-submit').addEventListener('click', submitForReview);

// ─────────────────────────────────────────────
// TEST MODE — playable preview inside the builder
//
// Clicking PLAY (visible in Game view) launches /index.html?test=1 in an
// iframe overlay. The builder posts the current map to the iframe via
// postMessage; the iframe runs the real game with stats disabled and a
// simplified win/loss screen. Restart re-runs the same snapshot;
// switching back to Builder mode auto-exits.
// ─────────────────────────────────────────────
let testActive = false;
let testIframeReady = false;
let pendingTestMap = null;

function postToTestIframe(msg) {
  const iframe = document.getElementById('test-iframe');
  if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(msg, '*');
}

function enterTestMode() {
  const errors = validateMap();
  if (errors.length) { showAlert('Cannot test:\n\n' + errors.join('\n'), 'Cannot Test'); return; }

  pendingTestMap = buildMapData();
  testIframeReady = false;
  testActive = true;

  const overlay = document.getElementById('test-overlay');
  const iframe = document.getElementById('test-iframe');
  overlay.style.display = '';
  iframe.src = '/?test=1';  // setting src triggers reload even if already on this URL
}

function exitTestMode() {
  if (!testActive) return;
  testActive = false;
  testIframeReady = false;
  pendingTestMap = null;
  const overlay = document.getElementById('test-overlay');
  const iframe = document.getElementById('test-iframe');
  overlay.style.display = 'none';
  iframe.src = 'about:blank';  // tear down the game so its rAF loop stops
}

function restartTest() {
  if (!testActive) return;
  if (testIframeReady && pendingTestMap) {
    postToTestIframe({ type: 'test:restart' });
  }
}

window.addEventListener('message', (ev) => {
  if (!testActive) return;
  if (!ev.data || typeof ev.data !== 'object') return;
  if (ev.data.type === 'test:ready') {
    testIframeReady = true;
    if (pendingTestMap) postToTestIframe({ type: 'test:load', map: pendingTestMap });
  }
});

document.getElementById('btn-play').addEventListener('click', enterTestMode);
document.getElementById('btn-test-restart').addEventListener('click', restartTest);
document.getElementById('btn-test-exit').addEventListener('click', exitTestMode);

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
buildTileCache();
buildBgSwatches();
buildObjectsPalette();
selectedObjectItem = { kind: 'object', type: OBJ_ORDER[0] };
selectObjectItem(selectedObjectItem.kind, selectedObjectItem.type);
window.addEventListener('resize', resize);
resize();
centerOnGrid();
updateMapNameDisplay();
refreshSidebar();
render();
requestAnimationFrame(tickAnim);
