// ─────────────────────────────────────────────
// Map Builder — Application Logic
// Schema-compatible with v1 of MAP-BUILDER.md, with backward-compatible
// extensions: extra `object` types (locker/desk/door/blackboard) and
// extra `special` values (pickup_gel/pickup_mirror/pickup_spray).
// ─────────────────────────────────────────────

const MAP_VERSION = 1;
const GRID_COLS   = 60;
const GRID_ROWS   = 60;
const ZOOM_LEVELS = [8, 12, 16, 20, 28, 40, 56];

const BG_KEYS = [
  'empty', 'hallway', 'classroom', 'cafeteria', 'carpet',
  'grass', 'dirt', 'concrete', 'asphalt'
];
const BG_LABELS = {
  empty: 'Void', hallway: 'Hallway', classroom: 'Class', cafeteria: 'Cafe',
  carpet: 'Carpet', grass: 'Grass', dirt: 'Dirt',
  concrete: 'Concrete', asphalt: 'Asphalt',
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
};
const OBJ_ORDER = ['wall', 'pushable', 'mud', 'locker', 'desk', 'door', 'blackboard'];

// Specials — keep v1 player/exit/villain plus new pickup_* values.
// Each pickup_* is unique-per-map (only one of each type), matching the
// existing single-instance rule for player/exit/villain.
const SPECIAL_DEFS = {
  player:         { label: 'Jax',       color: '#4dabf7' },
  exit:           { label: 'Exit',      color: '#00ff88' },
  villain:        { label: 'Chandler',  color: '#ff4444' },
  pickup_gel:     { label: 'Gel',       color: '#f0d020' },
  pickup_mirror:  { label: 'Mirror',    color: '#c0d8e8' },
  pickup_spray:   { label: 'Spray',     color: '#c0c0c0' },
};
const SPECIAL_KEYS = ['player','exit','villain','pickup_gel','pickup_mirror','pickup_spray'];

const OPPOSITE = { n:'s', s:'n', e:'w', w:'e' };
const DELTA    = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let cells       = {};
let specials    = {  // each special tracked by type for uniqueness
  player: null, exit: null, villain: null,
  pickup_gel: null, pickup_mirror: null, pickup_spray: null,
};
let selected    = null;

let zoomIdx   = 2;
let cellSize  = ZOOM_LEVELS[zoomIdx];
let panX = 0, panY = 0;
let tool            = 'select';
let paintBackground = 'hallway';
let viewMode        = 'builder';   // 'builder' | 'game'

let isPainting  = false;
let isPanning   = false;
let panOrigin   = null;
let lastPainted = null;

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

  // Selection highlight (builder mode only)
  if (viewMode === 'builder' && selected && inGrid(selected.col, selected.row)) {
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

function drawCellObject(col, row, cell) {
  if (!cell.object) return;
  const def = OBJ_DEFS[cell.object];
  if (!def) return;
  const x = col * cellSize + panX;
  const y = row * cellSize + panY;
  const s = cellSize;
  const drawFn = {
    wall: window.MB_drawWall,
    chair: window.MB_drawPushable,
    mud: window.MB_drawMud,
    locker: window.MB_drawLocker,
    desk: window.MB_drawDesk,
    door: window.MB_drawDoor,
    blackboard: window.MB_drawBlackboard,
  }[def.draw];
  if (!drawFn) return;

  const rot = cell.rotation || 0;
  if (rot === 0) {
    drawFn(ctx, x, y, s);
  } else {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot * Math.PI / 180);
    drawFn(ctx, -s / 2, -s / 2, s);
    ctx.restore();
  }
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

  const drawFn = {
    player: window.MB_drawJaxIcon,
    villain: window.MB_drawChandlerIcon,
    pickup_gel: window.MB_drawGel,
    pickup_mirror: window.MB_drawMirror,
    pickup_spray: window.MB_drawSpray,
  }[cell.special];
  if (drawFn) drawFn(ctx, x, y + dy, s);

  // Spawn label in builder mode
  if (viewMode === 'builder' && s >= 24
      && (cell.special === 'player' || cell.special === 'villain')) {
    ctx.fillStyle = SPECIAL_DEFS[cell.special].color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.max(8, Math.floor(s*0.18))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = cell.special === 'player' ? 'JAX' : 'CHANDLER';
    ctx.strokeText(label, x + s/2, y + 1);
    ctx.fillText(label, x + s/2, y + 1);
  }
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function refreshSidebar() {
  updateBgVisibility();
  const noSel = document.getElementById('no-sel');
  const editor = document.getElementById('cell-editor');
  const cell = selected ? getCell(selected.col, selected.row) : null;

  if (!cell) {
    noSel.style.display = '';
    editor.style.display = 'none';
    return;
  }

  noSel.style.display = 'none';
  editor.style.display = '';

  document.getElementById('cell-title').textContent = `CELL [${selected.col}, ${selected.row}]`;
  document.getElementById('bg-select').value = cell.background;
  selectPaintBg(cell.background, false);

  // Object swatches
  document.querySelectorAll('.obj-swatch').forEach(s => {
    const v = s.dataset.obj || '';
    const cur = cell.object || '';
    s.classList.toggle('active', v === cur);
  });

  ['n','s','e','w'].forEach(d => {
    document.getElementById('b-' + d).classList.toggle('active', !!cell.borders[d]);
  });

  for (const k of SPECIAL_KEYS) {
    const id = k === 'player' ? 's-player'
             : k === 'exit'   ? 's-exit'
             : k === 'villain' ? 's-villain'
             : 's-' + k.replace('_','-');
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', cell.special === k);
  }

  const rot = cell.rotation || 0;
  document.querySelectorAll('.rot-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.rot) === rot);
  });
}

function refreshStatus() {
  const count = Object.keys(cells).length;
  document.getElementById('status').textContent = `${count} CELL${count !== 1 ? 'S' : ''}`;

  const msgs = [];
  if (count === 0)         msgs.push('<span class="warn">⚠ No active cells</span>');
  if (!specials.player)    msgs.push('<span class="warn">⚠ No Jax start</span>');
  if (!specials.exit)      msgs.push('<span class="warn">⚠ No exit</span>');
  if (!specials.villain)   msgs.push('<span class="warn">⚠ No Chandler</span>');

  const footer = document.getElementById('sidebar-footer');
  footer.innerHTML = msgs.length
    ? msgs.join('<br>')
    : '<span class="ok">✓ READY TO EXPORT</span>';
}

// ─────────────────────────────────────────────
// SIDEBAR EVENTS
// ─────────────────────────────────────────────
document.getElementById('bg-select').addEventListener('change', e => {
  const cell = selected && getCell(selected.col, selected.row);
  if (cell) {
    cell.background = e.target.value;
    selectPaintBg(e.target.value, false);
    render();
  }
});

['n','s','e','w'].forEach(d => {
  document.getElementById('b-' + d).addEventListener('click', () => {
    const cell = selected && getCell(selected.col, selected.row);
    if (!cell) return;
    cell.borders[d] = !cell.borders[d];
    document.getElementById('b-' + d).classList.toggle('active', cell.borders[d]);
    render();
  });
});

const SPEC_BTN_MAP = [
  ['s-player','player'],
  ['s-exit','exit'],
  ['s-villain','villain'],
  ['s-pickup-gel','pickup_gel'],
  ['s-pickup-mirror','pickup_mirror'],
  ['s-pickup-spray','pickup_spray'],
];
for (const [id, type] of SPEC_BTN_MAP) {
  document.getElementById(id).addEventListener('click', () => {
    if (!selected) return;
    assignSpecial(selected.col, selected.row, type);
    refreshSidebar();
    render();
  });
}

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

  if (tool === 'select') {
    selected = isActive(col, row) ? { col, row } : null;
    refreshSidebar();
    render();
  } else if (tool === 'paint') {
    isPainting = true;
    lastPainted = { col, row };
    activateCell(col, row);
    getCell(col, row).background = paintBackground;
    render();
  } else if (tool === 'erase') {
    isPainting = true;
    lastPainted = { col, row };
    deactivateCell(col, row);
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
  if (!isPainting) return;

  const { col, row } = screenToCell(e.offsetX, e.offsetY);
  if (!inGrid(col, row)) return;
  if (lastPainted && lastPainted.col === col && lastPainted.row === row) return;
  lastPainted = { col, row };

  if (tool === 'paint') {
    activateCell(col, row);
    getCell(col, row).background = paintBackground;
    render();
  } else if (tool === 'erase') {
    deactivateCell(col, row);
    render();
  }
});

canvas.addEventListener('mouseup', () => {
  isPainting = false;
  isPanning = false;
  canvas.style.cursor = TOOL_CURSORS[tool];
});
canvas.addEventListener('mouseleave', () => {
  isPainting = false;
  isPanning = false;
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
  render();
}, { passive: false });

// ─────────────────────────────────────────────
// TOOLBAR BUTTONS
// ─────────────────────────────────────────────
const TOOL_CURSORS = { select: 'default', paint: 'cell', erase: 'no-drop' };

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

function buildObjSwatches() {
  const container = document.getElementById('obj-swatches');
  // First swatch: None
  const noneSwatch = document.createElement('div');
  noneSwatch.className = 'obj-swatch none';
  noneSwatch.dataset.obj = '';
  noneSwatch.title = 'No object';
  const noneCvs = document.createElement('canvas');
  noneCvs.width = 48; noneCvs.height = 48;
  const lblNone = document.createElement('span');
  lblNone.textContent = 'NONE';
  noneSwatch.append(noneCvs, lblNone);
  noneSwatch.addEventListener('click', () => setObject(null));
  container.appendChild(noneSwatch);

  // Object swatches
  for (const key of OBJ_ORDER) {
    const def = OBJ_DEFS[key];
    const swatch = document.createElement('div');
    swatch.className = 'obj-swatch';
    swatch.dataset.obj = key;
    swatch.title = `${def.label} — ${def.kind}`;

    const cvs = document.createElement('canvas');
    cvs.width = 48; cvs.height = 48;
    const c2 = cvs.getContext('2d');
    c2.imageSmoothingEnabled = false;
    // Draw a hallway base then the object
    c2.drawImage(tileCache.hallway, 0, 0, 48, 48);
    const drawFn = {
      wall: window.MB_drawWall,
      chair: window.MB_drawPushable,
      mud: window.MB_drawMud,
      locker: window.MB_drawLocker,
      desk: window.MB_drawDesk,
      door: window.MB_drawDoor,
      blackboard: window.MB_drawBlackboard,
    }[def.draw];
    if (drawFn) drawFn(c2, 0, 0, 48);

    const lbl = document.createElement('span');
    lbl.textContent = def.label.toUpperCase();

    swatch.append(cvs, lbl);
    swatch.addEventListener('click', () => setObject(key));
    container.appendChild(swatch);
  }
}

function setObject(key) {
  const cell = selected && getCell(selected.col, selected.row);
  if (!cell) return;
  cell.object = key || null;
  document.querySelectorAll('.obj-swatch').forEach(s => {
    s.classList.toggle('active', (s.dataset.obj || '') === (key || ''));
  });
  render();
}

function setRotation(deg) {
  const cell = selected && getCell(selected.col, selected.row);
  if (!cell) return;
  cell.rotation = deg;
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
  if (updateCell) {
    const cell = selected && getCell(selected.col, selected.row);
    if (cell) {
      cell.background = bg;
      document.getElementById('bg-select').value = bg;
      render();
    }
  }
}

function updateBgVisibility() {
  // Background is always useful as paint color — don't hide it.
}

['select','paint','erase'].forEach(t => {
  document.getElementById('t-' + t).addEventListener('click', () => {
    tool = t;
    document.querySelectorAll('[id^="t-"]').forEach(b => b.classList.remove('active'));
    document.getElementById('t-' + t).classList.add('active');
    canvas.style.cursor = TOOL_CURSORS[t];
  });
});

document.getElementById('m-builder').addEventListener('click', () => setViewMode('builder'));
document.getElementById('m-game').addEventListener('click', () => setViewMode('game'));

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('m-builder').classList.toggle('active', mode === 'builder');
  document.getElementById('m-game').classList.toggle('active', mode === 'game');
  render();
}

document.getElementById('zoom-in').addEventListener('click', () => {
  if (zoomIdx < ZOOM_LEVELS.length - 1) {
    zoomIdx++;
    cellSize = ZOOM_LEVELS[zoomIdx];
    document.getElementById('zoom-label').textContent = cellSize + 'px';
    render();
  }
});

document.getElementById('zoom-out').addEventListener('click', () => {
  if (zoomIdx > 0) {
    zoomIdx--;
    cellSize = ZOOM_LEVELS[zoomIdx];
    document.getElementById('zoom-label').textContent = cellSize + 'px';
    render();
  }
});

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target !== document.body) return;
  const key = e.key.toLowerCase();
  if (key === 's') document.getElementById('t-select').click();
  if (key === 'p') document.getElementById('t-paint').click();
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
document.getElementById('btn-export').addEventListener('click', () => {
  const errors = [];
  if (Object.keys(cells).length === 0) errors.push('No active cells.');
  if (!specials.player)  errors.push('No Jax start position.');
  if (!specials.exit)    errors.push('No exit position.');
  if (!specials.villain) errors.push('No Chandler position.');
  if (errors.length) { alert('Cannot export:\n\n' + errors.join('\n')); return; }

  const data = {
    version: MAP_VERSION,
    playerStart: specials.player,
    exit: specials.exit,
    villain: specials.villain,
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

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'chicken-coop-map.json';
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
    try { loadMap(JSON.parse(ev.target.result)); }
    catch (err) { alert('Could not parse JSON: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function loadMap(data) {
  if (!data || !data.version) { alert('Invalid map file.'); return; }
  if (data.version > MAP_VERSION) {
    alert(`Map version ${data.version} is newer than this builder (v${MAP_VERSION}).`);
    return;
  }

  cells = {};
  specials = { player:null, exit:null, villain:null,
               pickup_gel:null, pickup_mirror:null, pickup_spray:null };
  selected = null;

  for (const [k, cd] of Object.entries(data.cells || {})) {
    cells[k] = {
      background: cd.background || 'empty',
      borders: { n:false, s:false, e:false, w:false, ...(cd.borders || {}) },
      object:  cd.object  || null,
      rotation: cd.rotation || 0,
      special: cd.special || null,
    };
    const [col, row] = k.split(',').map(Number);
    if (cd.special && SPECIAL_DEFS[cd.special]) {
      specials[cd.special] = [col, row];
    }
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
  specials = { player:null, exit:null, villain:null,
               pickup_gel:null, pickup_mirror:null, pickup_spray:null };
  selected = null;
  centerOnGrid();
  refreshSidebar();
  render();
});

// ─────────────────────────────────────────────
// SPECIAL ICON BUTTONS — pre-render mini sprites
// ─────────────────────────────────────────────
function paintSpecialIcons() {
  const map = [
    ['s-player', window.MB_drawJaxIcon],
    ['s-exit', (c, x, y, s) => window.MB_drawExit(c, x, y, s, 0)],
    ['s-villain', window.MB_drawChandlerIcon],
    ['s-pickup-gel', window.MB_drawGel],
    ['s-pickup-mirror', window.MB_drawMirror],
    ['s-pickup-spray', window.MB_drawSpray],
  ];
  for (const [id, fn] of map) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const cvs = btn.querySelector('canvas');
    const c = cvs.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cvs.width, cvs.height);
    fn(c, 0, 0, 32);
  }
}

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

  fn({ fill, outerWalls, obj, spec });

  // Build manifest
  const out = { version: 1, playerStart: null, exit: null, villain: null,
                pickups: { gel:null, mirror:null, spray:null },
                cells: _cells };
  for (const [k, v] of Object.entries(_cells)) {
    const [c, r] = k.split(',').map(Number);
    if (v.special === 'player')        out.playerStart = [c, r];
    if (v.special === 'exit')          out.exit        = [c, r];
    if (v.special === 'villain')       out.villain     = [c, r];
    if (v.special === 'pickup_gel')    out.pickups.gel = [c, r];
    if (v.special === 'pickup_mirror') out.pickups.mirror = [c, r];
    if (v.special === 'pickup_spray')  out.pickups.spray  = [c, r];
  }
  return out;
}

const TEMPLATES = [
  {
    name: 'The Gauntlet',
    desc: 'Hallway · 22×5 · Two walls force a zigzag dash. Lockers line the corridor.',
    data: buildMap(({ fill, outerWalls, obj, spec }) => {
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
      spec(20, 3, 'villain');
    }),
  },
  {
    name: 'Open Field',
    desc: 'Grass · 13×13 · Wide-open field with mud trap and pushable obstacles.',
    data: buildMap(({ fill, outerWalls, obj, spec }) => {
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
      spec(11,11,'villain');
    }),
  },
  {
    name: 'Lunch Rush',
    desc: 'Cafeteria · 14×10 · Three table rows form corridors. Spilled mud is a trap.',
    data: buildMap(({ fill, outerWalls, obj, spec }) => {
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
      spec(7,1,'villain');
    }),
  },
  {
    name: 'Office Block',
    desc: 'Carpet · 16×12 · Office dividers create a winding path. Desks block sightlines.',
    data: buildMap(({ fill, outerWalls, obj, spec }) => {
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
      spec(12,2,'villain');
    }),
  },
  {
    name: 'Schoolhouse',
    desc: 'Hallway + classroom · 18×11 · A real classroom with blackboard, desks, lockers.',
    data: buildMap(({ fill, outerWalls, obj, spec }) => {
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
      spec(16, 8, 'villain');
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
    }[def.draw];
    if (drawFn) drawFn(c, x, y, cs);
  }
  // Specials
  for (const [k, cell] of Object.entries(data.cells)) {
    if (!cell.special) continue;
    const [col,row] = k.split(',').map(Number);
    const x = ox + (col - minC) * cs, y = oy + (row - minR) * cs;
    const drawFn = {
      player: window.MB_drawJaxIcon,
      villain: window.MB_drawChandlerIcon,
      exit: (cc, x, y, s) => window.MB_drawExit(cc, x, y, s, 0),
      pickup_gel: window.MB_drawGel,
      pickup_mirror: window.MB_drawMirror,
      pickup_spray: window.MB_drawSpray,
    }[cell.special];
    if (drawFn) drawFn(c, x, y, cs);
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
  loadMap(TEMPLATES[idx].data);
}

document.getElementById('btn-templates').addEventListener('click', openTemplatesModal);
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('templates-modal').style.display = 'none';
});
document.getElementById('templates-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('templates-modal'))
    document.getElementById('templates-modal').style.display = 'none';
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
buildTileCache();
buildBgSwatches();
buildObjSwatches();
paintSpecialIcons();
window.addEventListener('resize', resize);
resize();
centerOnGrid();
refreshSidebar();
render();
requestAnimationFrame(tickAnim);
