// ─────────────────────────────────────────────
// Map Builder — Sprite library
// All draw functions take (ctx, x, y, size) and render into an `size x size` cell.
// Palette pulled directly from index.html (SNES School palette).
// ─────────────────────────────────────────────

const PAL = {
  floorLight:  '#d4b483',
  floorDark:   '#c8a870',
  classFloor:  '#e8d9b8',
  classDark:   '#dccba5',
  cafeFloor:   '#e0c890',
  cafeDark:    '#c8b078',
  carpet:      '#6b7a8b',
  carpetDark:  '#5a6878',
  grass:       '#5a8a3a',
  grassDark:   '#4a7530',
  dirt:        '#8b6535',
  dirtDark:    '#6b4825',
  concrete:    '#9a9a9a',
  concreteDark:'#808080',
  asphalt:     '#3a3a3a',
  asphaltDark: '#2a2a2a',
  wallFace:    '#8b6f47',
  wallMortar:  '#6b5235',
  wallTop:     '#a07848',
  lockerA:     '#4a7fa5',
  lockerB:     '#3d6d8f',
  lockerVent:  '#2a4f6a',
  lockerTrim:  '#7ab0cc',
  deskTop:     '#8b5e3c',
  deskSide:    '#6b4428',
  deskLeg:     '#5a3820',
  doorFace:    '#c8703a',
  doorFrame:   '#8b4a20',
  doorKnob:    '#d4a020',
  blackboard:  '#2a4a35',
  chalkLine:   '#c8d8c0',
  exitGlow:    '#00ff88',
  exitDark:    '#00aa55',
  jaxColor:    '#4dabf7',
  chandlerRed: '#e03040',
  mud:         '#5a4220',
  mudDark:     '#3a2810',
  // ── New terrain ──
  snow:        '#e8eef4',
  snowDark:    '#c8d4e0',
  snowBlue:    '#a8b8c8',
  ice:         '#b8d8e8',
  iceDark:     '#88b8d0',
  iceShine:    '#e8f4fc',
  sand:        '#e8d090',
  sandDark:    '#c8b070',
  sandShine:   '#f0dca0',
  gravel:      '#888880',
  gravelDark:  '#605850',
  gravelLight: '#a8a098',
  // ── New object palette ──
  hedge:       '#3a6a30',
  hedgeDark:   '#1f4820',
  hedgeLight:  '#5a8a40',
  bark:        '#6b4a2a',
  barkDark:    '#3a2a18',
  leaf:        '#4a8a3a',
  rock:        '#888080',
  rockDark:    '#585050',
  rockLight:   '#b8b0a8',
  snowmanBody: '#f8fcff',
  snowmanShade:'#c8d4e0',
  fenceWood:   '#a07848',
  fenceWoodDark:'#6b4a2a',
  metalGray:   '#909098',
  metalDark:   '#484848',
  metalLight:  '#c8c8d0',
  porcelain:   '#f0f4f8',
  porcelainShade:'#c8d0d8',
  paperBoard:  '#d8b888',
  paperBoardDark:'#a08858',
  cork:        '#c89868',
  corkDark:    '#80583a',
  flagRed:     '#cc2020',
  flagPole:    '#c8c8c8',
  bookA:       '#7a3030',
  bookB:       '#2a4a8b',
  bookC:       '#3a6030',
  bookD:       '#a06820',
  basketball:  '#d87830',
  basketballDark:'#883818',
  dodgeball:   '#cc2020',
  dodgeballDark:'#881010',
  soccerWhite: '#f0f0f0',
  soccerBlack: '#1a1a1a',
  baseballWhite:'#f0e8d8',
  baseballRed: '#cc2020',
  cone:        '#f08020',
  coneDark:    '#a04810',
  fire:        '#ff8020',
  fireBright:  '#ffd040',
  fireDark:    '#cc3010',
  ash:         '#3a2a1a',
  flowerPink:  '#e890a8',
  flowerYellow:'#f0d040',
  flowerWhite: '#f8f0e8',
  signWood:    '#9a6838',
};

// ─────────────────────────────────────────────
// TILE BACKGROUNDS
// Each builds a 64×64 source canvas with a 2-cell pattern. We then drawImage()
// the canvas at the cell's screen size (it scales with imageSmoothing off,
// preserving the chunky look at any zoom).
// ─────────────────────────────────────────────
const T = 32;  // sub-tile cell size in source canvas
const SRC = T * 2;

function _newTile() {
  const c = document.createElement('canvas');
  c.width = SRC; c.height = SRC;
  return c;
}

function _checker(c2, a, b, groutAlpha = 0.30, groutColor = '#000') {
  c2.fillStyle = a; c2.fillRect(0, 0, SRC, SRC);
  c2.fillStyle = b;
  c2.fillRect(0, 0, T, T);
  c2.fillRect(T, T, T, T);
  c2.strokeStyle = groutColor; c2.lineWidth = 2; c2.globalAlpha = groutAlpha;
  c2.strokeRect(1, 1, T-2, T-2);
  c2.strokeRect(T+1, 1, T-2, T-2);
  c2.strokeRect(1, T+1, T-2, T-2);
  c2.strokeRect(T+1, T+1, T-2, T-2);
  c2.globalAlpha = 1;
}

function buildTile(kind) {
  const c = _newTile();
  const c2 = c.getContext('2d');
  c2.imageSmoothingEnabled = false;

  switch (kind) {
    case 'empty':
      // Diagonal cross-hatch on dark — clearly "no floor"
      c2.fillStyle = '#1a0e04';
      c2.fillRect(0, 0, SRC, SRC);
      c2.strokeStyle = '#3a2818';
      c2.lineWidth = 2;
      for (let i = -SRC; i < SRC * 2; i += 8) {
        c2.beginPath();
        c2.moveTo(i, 0);
        c2.lineTo(i + SRC, SRC);
        c2.stroke();
      }
      break;

    case 'hallway':
      _checker(c2, PAL.floorLight, PAL.floorDark, 0.35, PAL.wallMortar);
      break;

    case 'classroom':
      _checker(c2, PAL.classFloor, PAL.classDark, 0.30, '#b8a882');
      break;

    case 'cafeteria':
      _checker(c2, PAL.cafeFloor, PAL.cafeDark, 0.25, '#806840');
      // little speckles
      c2.fillStyle = '#8b6535';
      for (let i = 0; i < 16; i++) {
        const x = ((i * 17) % SRC), y = ((i * 31) % SRC);
        c2.fillRect(x, y, 2, 2);
      }
      break;

    case 'carpet':
      c2.fillStyle = PAL.carpet; c2.fillRect(0, 0, SRC, SRC);
      // weave dots
      c2.fillStyle = PAL.carpetDark;
      for (let y = 0; y < SRC; y += 4)
        for (let x = (y / 4 % 2) * 2; x < SRC; x += 4)
          c2.fillRect(x, y, 2, 2);
      break;

    case 'grass':
      c2.fillStyle = PAL.grass; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.grassDark;
      // grass blades — vertical pairs
      for (let i = 0; i < 28; i++) {
        const x = ((i * 13) % SRC), y = ((i * 23) % SRC);
        c2.fillRect(x, y, 1, 4);
        c2.fillRect(x+2, y+1, 1, 3);
      }
      // a few light highlights
      c2.fillStyle = '#7ab055';
      for (let i = 0; i < 12; i++) {
        const x = ((i * 19 + 7) % SRC), y = ((i * 11 + 3) % SRC);
        c2.fillRect(x, y, 1, 2);
      }
      break;

    case 'dirt':
      c2.fillStyle = PAL.dirt; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.dirtDark;
      for (let i = 0; i < 24; i++) {
        const x = ((i * 11) % SRC), y = ((i * 19) % SRC);
        c2.fillRect(x, y, 2, 1);
      }
      c2.fillStyle = '#a08858';
      for (let i = 0; i < 16; i++) {
        const x = ((i * 17 + 5) % SRC), y = ((i * 13 + 9) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      break;

    case 'concrete':
      c2.fillStyle = PAL.concrete; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.concreteDark;
      // expansion joints
      c2.fillRect(T - 1, 0, 2, SRC);
      c2.fillRect(0, T - 1, SRC, 2);
      // speckle
      c2.fillStyle = '#7a7a7a';
      for (let i = 0; i < 32; i++) {
        const x = ((i * 13 + 1) % SRC), y = ((i * 7 + 3) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      break;

    case 'asphalt':
      c2.fillStyle = PAL.asphalt; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.asphaltDark;
      for (let i = 0; i < 40; i++) {
        const x = ((i * 11 + 3) % SRC), y = ((i * 17 + 5) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      c2.fillStyle = '#5a5a5a';
      for (let i = 0; i < 24; i++) {
        const x = ((i * 19 + 1) % SRC), y = ((i * 23 + 7) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      break;

    case 'snow':
      // bright field with subtle drift speckle and a few sparkles
      c2.fillStyle = PAL.snow; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.snowDark;
      for (let i = 0; i < 22; i++) {
        const x = ((i * 13) % SRC), y = ((i * 19) % SRC);
        c2.fillRect(x, y, 2, 1);
      }
      c2.fillStyle = PAL.snowBlue;
      for (let i = 0; i < 10; i++) {
        const x = ((i * 23 + 5) % SRC), y = ((i * 11 + 3) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      // sparkles
      c2.fillStyle = '#ffffff';
      c2.fillRect(8, 4, 1, 1); c2.fillRect(7, 5, 1, 1); c2.fillRect(9, 5, 1, 1);
      c2.fillRect(48, 22, 1, 1); c2.fillRect(47, 23, 1, 1); c2.fillRect(49, 23, 1, 1);
      c2.fillRect(28, 50, 1, 1); c2.fillRect(27, 51, 1, 1); c2.fillRect(29, 51, 1, 1);
      break;

    case 'ice':
      // pale blue with crack lines
      c2.fillStyle = PAL.ice; c2.fillRect(0, 0, SRC, SRC);
      c2.fillStyle = PAL.iceShine;
      // diagonal shine bands
      for (let i = 0; i < SRC * 2; i += 18) {
        for (let j = 0; j < 6; j++) {
          c2.fillRect(i + j, j, 1, 1);
        }
      }
      // crack lines
      c2.fillStyle = PAL.iceDark;
      // crack 1
      const crack1 = [[6,10],[10,12],[14,11],[18,14],[22,13],[26,16]];
      for (const [x,y] of crack1) c2.fillRect(x, y, 1, 1);
      // crack 2
      const crack2 = [[36,38],[40,40],[44,39],[48,42],[52,41],[56,44]];
      for (const [x,y] of crack2) c2.fillRect(x, y, 1, 1);
      // crack 3
      const crack3 = [[40,8],[42,12],[44,14],[46,18],[48,20]];
      for (const [x,y] of crack3) c2.fillRect(x, y, 1, 1);
      break;

    case 'sand':
      c2.fillStyle = PAL.sand; c2.fillRect(0, 0, SRC, SRC);
      // ripple bands
      c2.fillStyle = PAL.sandDark;
      for (let y = 4; y < SRC; y += 12) {
        for (let x = 0; x < SRC; x += 1) {
          const w = Math.sin((x + y) * 0.5) * 1.5;
          if (w > 0.3) c2.fillRect(x, y + Math.floor(w), 1, 1);
        }
      }
      // grain speckle
      for (let i = 0; i < 20; i++) {
        const x = ((i * 17) % SRC), y = ((i * 13 + 5) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      c2.fillStyle = PAL.sandShine;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 19 + 3) % SRC), y = ((i * 23 + 1) % SRC);
        c2.fillRect(x, y, 1, 1);
      }
      break;

    case 'gravel':
      // base
      c2.fillStyle = PAL.gravel; c2.fillRect(0, 0, SRC, SRC);
      // pebbles — fixed pattern of small rects
      const pebbles = [
        [4,5,3,2], [12,3,2,2], [18,7,3,2], [25,4,2,3], [32,6,3,2],
        [40,3,2,2], [48,7,3,2], [54,4,3,2],
        [3,16,2,3], [10,18,3,2], [16,15,2,2], [22,19,3,2], [30,17,2,3],
        [37,15,3,2], [45,18,2,2], [52,16,3,3],
        [6,28,3,2], [14,30,2,2], [21,28,3,3], [28,31,2,2], [35,28,3,2],
        [42,30,2,3], [50,29,3,2], [56,31,2,2],
        [4,42,2,3], [12,44,3,2], [19,41,2,2], [26,43,3,3], [33,41,2,2],
        [41,44,3,2], [48,42,2,3], [55,44,3,2],
        [8,55,3,2], [16,57,2,2], [24,54,3,3], [32,56,2,2], [40,55,3,2],
        [47,57,2,2], [54,54,3,3],
      ];
      c2.fillStyle = PAL.gravelDark;
      for (const [x,y,w,h] of pebbles) c2.fillRect(x, y, w, h);
      // light highlights
      c2.fillStyle = PAL.gravelLight;
      for (const [x,y,w,h] of pebbles) c2.fillRect(x, y, w, 1);
      break;

    default:
      c2.fillStyle = '#444'; c2.fillRect(0, 0, SRC, SRC);
  }
  return c;
}

window.MB_buildTile = buildTile;

// ─────────────────────────────────────────────
// BRICK WALL EDGE
// Renders a brick-pattern strip on one side of a cell — n/s = horizontal,
// e/w = vertical. Strip is ~14% of cell size with mortar lines.
// ─────────────────────────────────────────────
function drawBrickEdge(ctx, dir, x, y, s) {
  const t = Math.max(2, Math.round(s * 0.14));  // wall thickness
  ctx.imageSmoothingEnabled = false;

  // Strip rect
  let rx = x, ry = y, rw = s, rh = s;
  if      (dir === 'n') { rh = t; }
  else if (dir === 's') { ry = y + s - t; rh = t; }
  else if (dir === 'w') { rw = t; }
  else if (dir === 'e') { rx = x + s - t; rw = t; }

  // Base fill
  ctx.fillStyle = PAL.wallFace;
  ctx.fillRect(rx, ry, rw, rh);

  // Brick courses
  const horizontal = (dir === 'n' || dir === 's');
  const brickH = Math.max(2, Math.round(s * 0.12));
  const brickW = Math.max(4, Math.round(s * 0.28));

  ctx.fillStyle = PAL.wallMortar;
  if (horizontal) {
    // horizontal mortar lines between courses
    for (let yy = ry + brickH; yy < ry + rh; yy += brickH) {
      ctx.fillRect(rx, yy, rw, 1);
    }
    // vertical mortar joints, offset every other course
    let course = 0;
    for (let yy = ry; yy < ry + rh; yy += brickH, course++) {
      const off = (course % 2) * (brickW / 2);
      for (let xx = rx + off; xx < rx + rw; xx += brickW) {
        ctx.fillRect(xx, yy, 1, brickH);
      }
    }
  } else {
    // vertical wall: courses run vertically
    for (let xx = rx + brickH; xx < rx + rw; xx += brickH) {
      ctx.fillRect(xx, ry, 1, rh);
    }
    let course = 0;
    for (let xx = rx; xx < rx + rw; xx += brickH, course++) {
      const off = (course % 2) * (brickW / 2);
      for (let yy = ry + off; yy < ry + rh; yy += brickW) {
        ctx.fillRect(xx, yy, brickH, 1);
      }
    }
  }

  // Highlight on top edge (light source from above)
  ctx.fillStyle = PAL.wallTop;
  if      (dir === 'n') ctx.fillRect(rx, ry, rw, 1);
  else if (dir === 'w') ctx.fillRect(rx, ry, 1, rh);
  else if (dir === 'e') ctx.fillRect(rx, ry, 1, rh);
  // South edge gets a darker bottom shadow
  else if (dir === 's') {
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(rx, ry + rh - 1, rw, 1);
    ctx.globalAlpha = 1;
  }
}
window.MB_drawBrickEdge = drawBrickEdge;

// ─────────────────────────────────────────────
// OBJECT SPRITES
// All take (ctx, x, y, s)
// ─────────────────────────────────────────────

// Wall — solid brick block filling the cell
function drawWall(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL.wallFace;
  ctx.fillRect(x, y, s, s);

  const brickH = Math.max(3, Math.round(s * 0.18));
  const brickW = Math.max(6, Math.round(s * 0.40));
  ctx.fillStyle = PAL.wallMortar;
  // horizontal mortar
  for (let yy = y + brickH; yy < y + s; yy += brickH) {
    ctx.fillRect(x, yy, s, 1);
  }
  // vertical mortar offset per course
  let course = 0;
  for (let yy = y; yy < y + s; yy += brickH, course++) {
    const off = (course % 2) * (brickW / 2);
    for (let xx = x + off; xx < x + s; xx += brickW) {
      ctx.fillRect(xx, yy, 1, brickH);
    }
  }
  // top highlight
  ctx.fillStyle = PAL.wallTop;
  ctx.fillRect(x, y, s, 1);
  ctx.fillRect(x, y, 1, s);
}
window.MB_drawWall = drawWall;

// Pushable chair — wooden box with seat back
function drawPushable(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.10));
  // seat
  ctx.fillStyle = PAL.deskTop;
  ctx.fillRect(x + pad, y + s * 0.40, s - pad*2, s * 0.45);
  // shadow under seat
  ctx.fillStyle = PAL.deskSide;
  ctx.fillRect(x + pad, y + s * 0.78, s - pad*2, Math.max(2, s * 0.07));
  // backrest
  ctx.fillStyle = PAL.deskTop;
  ctx.fillRect(x + pad + 1, y + pad, s - pad*2 - 2, s * 0.32);
  ctx.fillStyle = PAL.deskSide;
  ctx.fillRect(x + pad + 1, y + pad + s * 0.28, s - pad*2 - 2, 2);
  // legs
  ctx.fillStyle = PAL.deskLeg;
  const legW = Math.max(1, Math.round(s * 0.08));
  ctx.fillRect(x + pad + 1, y + s - pad - 2, legW, 2);
  ctx.fillRect(x + s - pad - 1 - legW, y + s - pad - 2, legW, 2);
  // top highlight
  ctx.fillStyle = '#a07848';
  ctx.fillRect(x + pad, y + s * 0.40, s - pad*2, 1);
}
window.MB_drawPushable = drawPushable;

// Mud — splatter
function drawMud(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL.mudDark;
  // big blob
  const cx = x + s/2, cy = y + s/2;
  // simple fixed-pattern splatter dots so it looks intentional
  const dots = [
    [0.5,0.5,0.32],[0.30,0.40,0.16],[0.70,0.45,0.18],
    [0.45,0.70,0.20],[0.25,0.65,0.10],[0.75,0.70,0.12],
    [0.55,0.25,0.13],
  ];
  for (const [dx, dy, r] of dots) {
    ctx.fillRect(x + s*dx - s*r/2, y + s*dy - s*r/2, s*r, s*r);
  }
  // lighter highlights
  ctx.fillStyle = PAL.mud;
  ctx.fillRect(cx - s*0.10, cy - s*0.10, s*0.10, s*0.10);
  ctx.fillRect(cx + s*0.05, cy - s*0.20, s*0.06, s*0.06);
}
window.MB_drawMud = drawMud;

// Locker — blue, with vent stripe & lock
function drawLocker(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.08));
  const lx = x + pad, ly = y + pad, lw = s - pad*2, lh = s - pad*2;
  // body
  ctx.fillStyle = PAL.lockerA;
  ctx.fillRect(lx, ly, lw, lh);
  // shadow on right + bottom
  ctx.fillStyle = PAL.lockerB;
  ctx.fillRect(lx + lw - Math.max(1, lw*0.15), ly, Math.max(1, lw*0.15), lh);
  ctx.fillRect(lx, ly + lh - Math.max(1, lh*0.10), lw, Math.max(1, lh*0.10));
  // top highlight
  ctx.fillStyle = PAL.lockerTrim;
  ctx.fillRect(lx, ly, lw, 1);
  ctx.fillRect(lx, ly, 1, lh);
  // vent stripe
  ctx.fillStyle = PAL.lockerVent;
  const vy = ly + lh * 0.18;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(lx + lw*0.20, vy + i * Math.max(1, Math.round(lh*0.08)), lw*0.60, 1);
  }
  // handle / lock
  if (s >= 16) {
    ctx.fillStyle = '#1a2a40';
    const hx = lx + lw*0.70, hy = ly + lh*0.55;
    const hw = Math.max(1, lw*0.12), hh = Math.max(2, lh*0.14);
    ctx.fillRect(hx, hy, hw, hh);
    ctx.fillStyle = '#88aacc';
    ctx.fillRect(hx, hy, hw, 1);
  }
}
window.MB_drawLocker = drawLocker;

// Desk — wooden top with legs
function drawDesk(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.10));
  const dx = x + pad, dy = y + pad + s*0.10;
  const dw = s - pad*2, dh = s - pad*2 - s*0.20;
  // top
  ctx.fillStyle = PAL.deskTop;
  ctx.fillRect(dx, dy, dw, dh);
  // top highlight
  ctx.fillStyle = '#a07848';
  ctx.fillRect(dx, dy, dw, 1);
  // side shadow
  ctx.fillStyle = PAL.deskSide;
  ctx.fillRect(dx, dy + dh - Math.max(1, dh*0.20), dw, Math.max(1, dh*0.20));
  // legs (peeking below)
  ctx.fillStyle = PAL.deskLeg;
  const legW = Math.max(1, Math.round(s*0.10));
  ctx.fillRect(dx + 1, dy + dh, legW, Math.max(1, s*0.10));
  ctx.fillRect(dx + dw - 1 - legW, dy + dh, legW, Math.max(1, s*0.10));
  // book on top (small detail at high zoom)
  if (s >= 24) {
    ctx.fillStyle = '#cc4040';
    ctx.fillRect(dx + dw*0.20, dy + dh*0.30, dw*0.30, dh*0.20);
    ctx.fillStyle = '#fff';
    ctx.fillRect(dx + dw*0.22, dy + dh*0.34, dw*0.26, 1);
  }
}
window.MB_drawDesk = drawDesk;

// Door — orange wood with frame and knob
function drawDoor(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.10));
  const dx = x + pad, dy = y + Math.max(1, Math.round(s * 0.05));
  const dw = s - pad*2, dh = s - Math.max(2, Math.round(s * 0.10));
  // frame
  ctx.fillStyle = PAL.doorFrame;
  ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
  // face
  ctx.fillStyle = PAL.doorFace;
  ctx.fillRect(dx, dy, dw, dh);
  // panels
  ctx.fillStyle = PAL.doorFrame;
  const panelMargin = Math.max(1, Math.round(s * 0.10));
  ctx.fillRect(dx + panelMargin, dy + panelMargin, dw - panelMargin*2, 1);
  ctx.fillRect(dx + panelMargin, dy + dh*0.5, dw - panelMargin*2, 1);
  ctx.fillRect(dx + panelMargin, dy + dh - panelMargin, dw - panelMargin*2, 1);
  // knob
  if (s >= 16) {
    ctx.fillStyle = PAL.doorKnob;
    ctx.fillRect(dx + dw - Math.max(2, s*0.18), dy + dh*0.5 - 1, Math.max(2, s*0.10), Math.max(2, s*0.10));
  }
  // top highlight
  ctx.fillStyle = '#e89060';
  ctx.fillRect(dx, dy, dw, 1);
}
window.MB_drawDoor = drawDoor;

// Blackboard — green panel with chalk lines, mounted on a strip
function drawBlackboard(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.08));
  const bx = x + pad, by = y + pad + s*0.08;
  const bw = s - pad*2, bh = s - pad*2 - s*0.16;
  // wood frame
  ctx.fillStyle = PAL.deskSide;
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  // board
  ctx.fillStyle = PAL.blackboard;
  ctx.fillRect(bx, by, bw, bh);
  // chalk lines
  ctx.fillStyle = PAL.chalkLine;
  if (s >= 14) {
    ctx.fillRect(bx + bw*0.12, by + bh*0.20, bw*0.50, 1);
    ctx.fillRect(bx + bw*0.12, by + bh*0.40, bw*0.30, 1);
    ctx.fillRect(bx + bw*0.12, by + bh*0.60, bw*0.45, 1);
  }
  // chalk tray
  ctx.fillStyle = PAL.deskTop;
  ctx.fillRect(bx, by + bh, bw, Math.max(1, s*0.06));
  ctx.fillStyle = PAL.deskSide;
  ctx.fillRect(bx, by + bh + Math.max(1, s*0.06), bw, 1);
}
window.MB_drawBlackboard = drawBlackboard;

// ─────────────────────────────────────────────
// SPECIAL SPRITES
// ─────────────────────────────────────────────

// Exit — pulsing green portal "EXIT" tile
function drawExit(ctx, x, y, s, t) {
  ctx.imageSmoothingEnabled = false;
  const pad = Math.max(1, Math.round(s * 0.06));
  const ex = x + pad, ey = y + pad;
  const ew = s - pad*2, eh = s - pad*2;
  // base bright green
  const pulse = 0.5 + Math.sin(t * 3) * 0.5;
  ctx.fillStyle = PAL.exitDark;
  ctx.fillRect(ex, ey, ew, eh);
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  ctx.fillStyle = PAL.exitGlow;
  ctx.fillRect(ex + 2, ey + 2, ew - 4, eh - 4);
  ctx.globalAlpha = 1;
  // arrow up
  ctx.fillStyle = '#fff';
  const cx = ex + ew/2;
  const tipY = ey + eh*0.22;
  const wingY = ey + eh*0.50;
  const wingW = ew*0.30;
  // arrow head (triangle)
  for (let i = 0; i < eh*0.30; i++) {
    const w = (i / (eh*0.30)) * wingW;
    ctx.fillRect(cx - w, tipY + i, w*2, 1);
  }
  // shaft
  ctx.fillRect(cx - 1, wingY, 2, eh*0.30);
  // "EXIT" text at high zoom
  if (s >= 28) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s*0.16)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('EXIT', x + s/2, ey + eh*0.82);
  }
  // border
  ctx.strokeStyle = PAL.exitGlow;
  ctx.lineWidth = 1;
  ctx.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
}
window.MB_drawExit = drawExit;

// Helper: pixel rect with bounds-check skipping fractional zero
function px(ctx, x, y, w, h) { ctx.fillRect(x|0, y|0, Math.max(1, w|0), Math.max(1, h|0)); }

// Jax icon — blue baseball cap, outfit, simplified front-view
function drawJaxIcon(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16; // unit
  // Helper draws on a 16x16 grid
  const P = (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
  // Head (skin)
  P(5, 3, 6, 5, '#fcd5b3');
  // Hair under cap
  P(5, 5, 6, 1, '#3a2810');
  // Cap (blue) — Jax wears a baseball cap
  P(4, 2, 8, 2, PAL.jaxColor);
  P(4, 1, 6, 1, PAL.jaxColor);
  // Cap brim
  P(8, 3, 5, 1, '#2a6a9a');
  // Cap highlight
  P(5, 1, 2, 1, '#88ccff');
  // Eyes
  P(6, 5, 1, 1, '#000');
  P(9, 5, 1, 1, '#000');
  // Mouth
  P(7, 7, 2, 1, '#a04040');
  // Body — yellow shirt
  P(4, 8, 8, 4, '#ffd840');
  // Shirt highlight
  P(4, 8, 6, 1, '#ffe870');
  // Arms
  P(3, 8, 1, 3, '#fcd5b3');
  P(12, 8, 1, 3, '#fcd5b3');
  // Belt
  P(4, 12, 8, 1, '#3a2810');
  // Legs — blue jeans
  P(5, 13, 2, 3, '#2a4a8b');
  P(9, 13, 2, 3, '#2a4a8b');
  // Shoes
  P(5, 15, 2, 1, '#000');
  P(9, 15, 2, 1, '#000');
}
window.MB_drawJaxIcon = drawJaxIcon;

// Chandler icon — red, evil grin
function drawChandlerIcon(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16;
  const P = (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
  // Hair (slicked back, dark) — Chandler hair is a key feature
  P(4, 1, 8, 3, '#1a0e04');
  P(3, 2, 1, 3, '#1a0e04');
  P(12, 2, 1, 3, '#1a0e04');
  // Hair shine
  P(6, 1, 4, 1, '#3a2818');
  // Face
  P(5, 4, 6, 4, '#fcd5b3');
  // Eyebrows angled (mean)
  P(5, 4, 2, 1, '#1a0e04');
  P(9, 4, 2, 1, '#1a0e04');
  // Eyes red
  P(6, 5, 1, 1, PAL.chandlerRed);
  P(9, 5, 1, 1, PAL.chandlerRed);
  // Evil grin
  P(6, 7, 4, 1, '#000');
  P(7, 6, 1, 1, '#fff');
  P(8, 6, 1, 1, '#fff');
  // Body — red shirt
  P(4, 8, 8, 5, PAL.chandlerRed);
  // Shirt shadow
  P(4, 12, 8, 1, '#a01818');
  // Arms
  P(3, 8, 1, 4, '#fcd5b3');
  P(12, 8, 1, 4, '#fcd5b3');
  // Pants — black
  P(5, 13, 2, 3, '#000');
  P(9, 13, 2, 3, '#000');
  // Shoes
  P(5, 15, 2, 1, '#3a2818');
  P(9, 15, 2, 1, '#3a2818');
}
window.MB_drawChandlerIcon = drawChandlerIcon;

// Hair Gel — yellow tube
function drawGel(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16;
  const P = (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
  // shadow oval at base
  P(4, 14, 8, 1, 'rgba(0,0,0,0.35)');
  // tube body — bright yellow
  P(5, 4, 6, 10, '#f0d020');
  // highlight on left
  P(5, 4, 1, 10, '#fff080');
  // shadow on right
  P(10, 4, 1, 10, '#a08810');
  // cap (top) black
  P(5, 2, 6, 2, '#1a1a1a');
  P(6, 1, 4, 1, '#3a3a3a');
  // label
  P(6, 6, 4, 3, '#fff');
  P(6, 7, 4, 1, '#cc2020');
  // bright sparkle
  P(7, 4, 1, 1, '#fff');
}
window.MB_drawGel = drawGel;

// Mirror — circle hand mirror
function drawMirror(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16;
  const P = (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
  // shadow
  P(5, 14, 6, 1, 'rgba(0,0,0,0.30)');
  // handle
  P(7, 11, 2, 4, '#a06030');
  P(7, 11, 1, 4, '#c08050');
  // frame (silver)
  P(4, 2, 8, 1, '#a0a8b0');
  P(3, 3, 1, 6, '#a0a8b0');
  P(12, 3, 1, 6, '#a0a8b0');
  P(4, 9, 8, 1, '#a0a8b0');
  P(4, 3, 1, 1, '#a0a8b0');
  P(11, 3, 1, 1, '#a0a8b0');
  P(4, 8, 1, 1, '#a0a8b0');
  P(11, 8, 1, 1, '#a0a8b0');
  // mirror face (light blue)
  P(4, 3, 8, 6, '#c0d8e8');
  P(5, 3, 1, 1, '#a0a8b0'); // corner adjust
  P(10, 3, 1, 1, '#a0a8b0');
  P(5, 8, 1, 1, '#a0a8b0');
  P(10, 8, 1, 1, '#a0a8b0');
  // shine
  P(5, 4, 2, 1, '#fff');
  P(5, 5, 1, 1, '#fff');
  // frame highlight
  P(5, 2, 3, 1, '#e0e8f0');
}
window.MB_drawMirror = drawMirror;

// Hairspray — silver can
function drawSpray(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16;
  const P = (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
  // shadow
  P(5, 14, 6, 1, 'rgba(0,0,0,0.30)');
  // can body
  P(5, 4, 6, 10, '#c8c8c8');
  // highlight
  P(5, 4, 1, 10, '#f0f0f0');
  // shadow
  P(10, 4, 1, 10, '#888');
  // label band
  P(5, 7, 6, 3, '#cc2020');
  P(5, 7, 6, 1, '#ee5050');
  P(5, 9, 6, 1, '#881010');
  // top rim
  P(5, 3, 6, 1, '#a0a0a0');
  // nozzle
  P(7, 1, 2, 2, '#3a3a3a');
  P(7, 1, 1, 2, '#5a5a5a');
  // spray puff (decorative)
  P(9, 0, 1, 1, 'rgba(255,255,255,0.7)');
  P(10, 1, 1, 1, 'rgba(255,255,255,0.5)');
  P(11, 0, 1, 1, 'rgba(255,255,255,0.4)');
}
window.MB_drawSpray = drawSpray;


// ─────────────────────────────────────────────
// EXTENDED OBJECT SPRITES (school / outdoor / sports / decor)
// All take (ctx, x, y, s) and draw on a 16×16 logical grid.
// ─────────────────────────────────────────────

// Shared helper for 16-grid pixel art on (ctx, x, y, s)
function _grid(ctx, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  const u = s / 16;
  return (px_, py_, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
  };
}

// ── OBSTACLES / WALLS ──────────────────────────────────────

// Hedge — full-cell leafy green block
function drawHedge(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // base
  P(0, 0, 16, 16, PAL.hedgeDark);
  // mounded foliage
  P(1, 1, 14, 14, PAL.hedge);
  // highlight clumps
  const highs = [[2,2],[5,1],[9,2],[12,1],[3,5],[7,4],[11,5],[14,3],
                 [2,8],[6,7],[10,8],[13,7],[3,11],[7,11],[11,11],[14,11]];
  for (const [a,b] of highs) P(a, b, 2, 2, PAL.hedgeLight);
  // dark dimples
  const dims = [[4,3],[8,5],[12,4],[5,9],[9,9],[13,10],[5,13],[10,13]];
  for (const [a,b] of dims) P(a, b, 1, 1, PAL.hedgeDark);
  // top rim highlight
  P(1, 1, 14, 1, PAL.hedgeLight);
}
window.MB_drawHedge = drawHedge;

// Bush — small rounded shrub, centered
function drawBush(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(4, 13, 8, 1, 'rgba(0,0,0,0.30)');
  // body — rounded
  P(4, 5, 8, 8, PAL.hedgeDark);
  P(3, 7, 1, 4, PAL.hedgeDark);
  P(12, 7, 1, 4, PAL.hedgeDark);
  P(5, 4, 6, 1, PAL.hedgeDark);
  // foliage fill
  P(5, 6, 6, 6, PAL.hedge);
  // light clumps
  P(5, 6, 2, 2, PAL.hedgeLight);
  P(9, 6, 2, 2, PAL.hedgeLight);
  P(7, 8, 2, 2, PAL.hedgeLight);
  P(5, 10, 2, 2, PAL.hedge);
  // tiny berries (random highlight)
  P(8, 7, 1, 1, '#cc4040');
  P(6, 10, 1, 1, '#cc4040');
}
window.MB_drawBush = drawBush;

// Fence segment — wooden picket
function drawFence(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(0, 14, 16, 1, 'rgba(0,0,0,0.25)');
  // horizontal rails
  P(0, 5, 16, 2, PAL.fenceWood);
  P(0, 11, 16, 2, PAL.fenceWood);
  P(0, 5, 16, 1, PAL.wallTop);
  P(0, 11, 16, 1, PAL.wallTop);
  // pickets
  const pickets = [1, 5, 9, 13];
  for (const px of pickets) {
    P(px, 1, 2, 13, PAL.fenceWood);
    P(px, 1, 1, 13, PAL.wallTop); // light edge
    P(px+1, 1, 1, 1, PAL.wallTop);
    // pointy top
    P(px, 1, 2, 1, PAL.fenceWoodDark);
    P(px+1, 0, 1, 1, PAL.fenceWood);
  }
  // dark joints behind rails
  P(0, 7, 16, 1, PAL.fenceWoodDark);
  P(0, 13, 16, 1, PAL.fenceWoodDark);
}
window.MB_drawFence = drawFence;

// Tree stump — round wood with rings
function drawStump(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // ground shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // bark sides
  P(2, 4, 12, 11, PAL.barkDark);
  // bark face
  P(3, 5, 10, 9, PAL.bark);
  // bark texture (vertical streaks on sides)
  P(2, 6, 1, 7, PAL.barkDark);
  P(13, 6, 1, 7, PAL.barkDark);
  P(4, 13, 8, 1, PAL.barkDark);
  // top oval
  P(3, 3, 10, 4, '#c89868');
  P(2, 4, 1, 2, '#c89868');
  P(13, 4, 1, 2, '#c89868');
  P(4, 2, 8, 1, '#c89868');
  // rings on top
  P(5, 4, 6, 2, '#a07848');
  P(6, 4, 4, 2, PAL.bark);
  P(7, 5, 2, 1, '#80583a');
  // top highlight
  P(4, 3, 8, 1, '#e0b078');
}
window.MB_drawStump = drawStump;

// Rock / boulder
function drawRock(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // body
  P(3, 6, 10, 8, PAL.rockDark);
  P(2, 8, 12, 5, PAL.rockDark);
  P(4, 4, 8, 2, PAL.rockDark);
  // mid tone
  P(4, 7, 8, 6, PAL.rock);
  P(3, 9, 10, 3, PAL.rock);
  P(5, 5, 6, 2, PAL.rock);
  // top highlight
  P(5, 5, 4, 1, PAL.rockLight);
  P(4, 6, 2, 1, PAL.rockLight);
  P(7, 7, 2, 1, PAL.rockLight);
  // crack
  P(8, 9, 1, 3, PAL.rockDark);
  P(9, 11, 1, 1, PAL.rockDark);
}
window.MB_drawRock = drawRock;

// Snowman
function drawSnowman(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // bottom snowball
  P(4, 9, 8, 5, PAL.snowmanBody);
  P(3, 10, 10, 3, PAL.snowmanBody);
  P(4, 13, 8, 1, PAL.snowmanShade);
  P(11, 10, 1, 3, PAL.snowmanShade);
  // top snowball (head)
  P(5, 3, 6, 5, PAL.snowmanBody);
  P(4, 4, 8, 3, PAL.snowmanBody);
  P(10, 5, 1, 2, PAL.snowmanShade);
  // eyes
  P(6, 5, 1, 1, '#1a1a1a');
  P(9, 5, 1, 1, '#1a1a1a');
  // carrot nose
  P(7, 6, 2, 1, PAL.cone);
  P(9, 6, 1, 1, PAL.coneDark);
  // mouth (coal dots)
  P(7, 7, 1, 1, '#1a1a1a');
  P(8, 7, 1, 1, '#1a1a1a');
  // hat (top hat)
  P(4, 1, 8, 1, '#1a1a1a');
  P(5, 0, 6, 2, '#1a1a1a');
  // hat band
  P(5, 1, 6, 1, PAL.flagRed);
  // buttons
  P(7, 10, 1, 1, '#1a1a1a');
  P(7, 12, 1, 1, '#1a1a1a');
  // arm sticks
  P(2, 10, 2, 1, PAL.barkDark);
  P(12, 10, 2, 1, PAL.barkDark);
  P(1, 11, 1, 1, PAL.barkDark);
  P(14, 9, 1, 1, PAL.barkDark);
}
window.MB_drawSnowman = drawSnowman;

// Barrel — wooden, vertical staves
function drawBarrel(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // body
  P(3, 3, 10, 11, PAL.bark);
  // edges curve in
  P(2, 5, 1, 7, PAL.bark);
  P(13, 5, 1, 7, PAL.bark);
  P(3, 4, 10, 1, PAL.barkDark);
  P(3, 13, 10, 1, PAL.barkDark);
  // staves (vertical lines)
  P(5, 3, 1, 11, PAL.barkDark);
  P(8, 3, 1, 11, PAL.barkDark);
  P(11, 3, 1, 11, PAL.barkDark);
  // metal hoops
  P(2, 5, 12, 1, PAL.metalGray);
  P(2, 11, 12, 1, PAL.metalGray);
  P(2, 5, 12, 1, PAL.metalLight); // top edge of hoop highlight
  // top opening
  P(4, 2, 8, 2, PAL.barkDark);
  P(5, 3, 6, 1, '#3a2818');
  // highlight
  P(3, 3, 1, 10, PAL.wallTop);
}
window.MB_drawBarrel = drawBarrel;

// Crate / box
function drawCrate(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // body
  P(2, 3, 12, 11, PAL.bark);
  // top highlight
  P(2, 3, 12, 1, PAL.wallTop);
  P(2, 3, 1, 11, PAL.wallTop);
  // bottom shadow
  P(2, 13, 12, 1, PAL.barkDark);
  P(13, 3, 1, 11, PAL.barkDark);
  // plank slats — horizontal
  P(2, 7, 12, 1, PAL.barkDark);
  P(2, 11, 12, 1, PAL.barkDark);
  // X bracing on front
  P(3, 4, 1, 1, PAL.barkDark);
  P(4, 5, 1, 1, PAL.barkDark);
  P(5, 6, 1, 1, PAL.barkDark);
  P(6, 7, 1, 1, PAL.barkDark);
  P(12, 4, 1, 1, PAL.barkDark);
  P(11, 5, 1, 1, PAL.barkDark);
  P(10, 6, 1, 1, PAL.barkDark);
  P(9, 7, 1, 1, PAL.barkDark);
  // little nail dots
  P(3, 3, 1, 1, PAL.metalLight);
  P(12, 3, 1, 1, PAL.metalLight);
  P(3, 13, 1, 1, PAL.metalDark);
  P(12, 13, 1, 1, PAL.metalDark);
}
window.MB_drawCrate = drawCrate;

// ── SCHOOL OBJECTS ─────────────────────────────────────────

// Backpack — dropped on floor
function drawBackpack(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // main body (red)
  P(4, 4, 8, 10, PAL.flagRed);
  P(3, 6, 1, 7, PAL.flagRed);
  P(12, 6, 1, 7, PAL.flagRed);
  P(5, 3, 6, 1, PAL.flagRed);
  // shadow side
  P(11, 4, 1, 10, '#881010');
  P(4, 13, 8, 1, '#881010');
  // top flap
  P(5, 5, 6, 4, '#a01818');
  P(5, 5, 6, 1, '#cc2020');
  // strap (top loop)
  P(7, 2, 2, 2, PAL.barkDark);
  P(7, 2, 2, 1, PAL.bark);
  // buckle / pocket
  P(6, 9, 4, 3, '#881010');
  P(6, 9, 4, 1, '#cc2020');
  P(7, 10, 2, 1, PAL.metalLight);
  // zipper line
  P(5, 6, 6, 1, PAL.metalGray);
  // highlight
  P(4, 4, 7, 1, '#ee4040');
}
window.MB_drawBackpack = drawBackpack;

// Toilet — porcelain, top-down-ish
function drawToilet(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // tank (back)
  P(4, 2, 8, 5, PAL.porcelain);
  P(4, 6, 8, 1, PAL.porcelainShade);
  P(11, 3, 1, 4, PAL.porcelainShade);
  P(4, 2, 8, 1, '#ffffff');
  // bowl rim (oval)
  P(3, 7, 10, 6, PAL.porcelain);
  P(2, 9, 1, 3, PAL.porcelain);
  P(13, 9, 1, 3, PAL.porcelain);
  P(3, 12, 10, 1, PAL.porcelainShade);
  P(12, 8, 1, 4, PAL.porcelainShade);
  // bowl interior (water)
  P(5, 9, 6, 3, '#88b8d0');
  P(5, 9, 6, 1, '#a8d4e8');
  // base
  P(5, 13, 6, 1, PAL.porcelainShade);
  // flush handle
  P(11, 4, 2, 1, PAL.metalGray);
  P(12, 4, 1, 1, PAL.metalDark);
}
window.MB_drawToilet = drawToilet;

// Sink — basin with faucet
function drawSink(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // basin outer
  P(2, 5, 12, 9, PAL.porcelain);
  // basin shadow edges
  P(13, 5, 1, 9, PAL.porcelainShade);
  P(2, 13, 12, 1, PAL.porcelainShade);
  P(2, 5, 12, 1, '#ffffff');
  // basin inner well
  P(4, 7, 8, 5, '#b8c4d0');
  P(4, 7, 8, 1, '#90a0b0');
  P(4, 7, 1, 5, '#a0b0c0');
  P(11, 7, 1, 5, '#90a0b0');
  // drain
  P(7, 10, 2, 1, '#484848');
  // faucet base
  P(7, 3, 2, 2, PAL.metalGray);
  P(7, 3, 2, 1, PAL.metalLight);
  // spout
  P(8, 4, 1, 2, PAL.metalGray);
  P(8, 6, 2, 1, PAL.metalGray);
  // water drip (decorative)
  P(9, 7, 1, 1, '#a8d4e8');
}
window.MB_drawSink = drawSink;

// Flag — wall-mounted
function drawFlag(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.20)');
  // pole
  P(2, 1, 1, 14, PAL.flagPole);
  P(3, 1, 1, 14, '#888');
  // pole top finial
  P(2, 0, 2, 1, '#f0d040');
  // flag cloth
  P(4, 2, 9, 6, PAL.flagRed);
  // stripes
  P(4, 3, 9, 1, '#ffffff');
  P(4, 5, 9, 1, '#ffffff');
  P(4, 7, 9, 1, '#ffffff');
  // canton (blue square)
  P(4, 2, 4, 3, '#2a4a8b');
  // tiny stars
  P(5, 3, 1, 1, '#ffffff');
  P(7, 3, 1, 1, '#ffffff');
  // ripple shadow
  P(11, 2, 2, 6, '#881010');
  P(12, 3, 1, 4, '#cc2020');
}
window.MB_drawFlag = drawFlag;

// Trash can
function drawTrashcan(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // can body — slightly tapered
  P(4, 4, 8, 10, PAL.metalGray);
  // ribs (vertical)
  P(5, 5, 1, 9, PAL.metalDark);
  P(7, 5, 1, 9, PAL.metalDark);
  P(9, 5, 1, 9, PAL.metalDark);
  P(11, 5, 1, 9, PAL.metalDark);
  // highlight
  P(4, 4, 1, 10, PAL.metalLight);
  // shadow side
  P(11, 4, 1, 10, PAL.metalDark);
  // lid
  P(3, 2, 10, 2, PAL.metalDark);
  P(3, 2, 10, 1, PAL.metalGray);
  // handle
  P(7, 1, 2, 1, PAL.metalDark);
  // recycle symbol
  P(7, 8, 2, 2, '#3aaa55');
}
window.MB_drawTrashcan = drawTrashcan;

// Water fountain — wall mount
function drawFountain(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // back panel
  P(3, 1, 10, 4, PAL.metalGray);
  P(3, 1, 10, 1, PAL.metalLight);
  // basin
  P(2, 5, 12, 5, PAL.porcelain);
  P(2, 5, 12, 1, '#ffffff');
  P(13, 5, 1, 5, PAL.porcelainShade);
  P(2, 9, 12, 1, PAL.porcelainShade);
  // basin interior
  P(4, 6, 8, 3, '#b8c4d0');
  // spout
  P(7, 4, 2, 2, PAL.metalGray);
  P(7, 4, 2, 1, PAL.metalLight);
  // water arc
  P(7, 6, 1, 1, '#a8d4e8');
  P(8, 6, 1, 1, '#a8d4e8');
  P(9, 7, 1, 1, '#a8d4e8');
  // pedestal
  P(5, 10, 6, 4, PAL.metalGray);
  P(5, 10, 1, 4, PAL.metalLight);
  P(10, 10, 1, 4, PAL.metalDark);
  // buttons
  P(5, 2, 1, 1, '#cc2020');
  P(11, 2, 1, 1, '#3aaa55');
}
window.MB_drawFountain = drawFountain;

// Bookshelf — full of books
function drawBookshelf(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // frame
  P(1, 1, 14, 14, PAL.deskTop);
  P(1, 1, 14, 1, '#a07848');
  P(1, 1, 1, 14, '#a07848');
  P(14, 1, 1, 14, PAL.deskSide);
  P(1, 14, 14, 1, PAL.deskSide);
  // interior
  P(2, 2, 12, 12, PAL.deskSide);
  // shelf dividers
  P(2, 6, 12, 1, PAL.deskTop);
  P(2, 10, 12, 1, PAL.deskTop);
  // books — top shelf
  P(3, 3, 1, 3, PAL.bookA);
  P(4, 3, 1, 3, PAL.bookB);
  P(5, 3, 2, 3, PAL.bookC);
  P(7, 3, 1, 3, PAL.bookD);
  P(8, 3, 1, 3, PAL.bookA);
  P(9, 4, 2, 2, PAL.bookB);  // shorter
  P(11, 3, 1, 3, PAL.bookC);
  P(12, 3, 1, 3, PAL.bookD);
  P(13, 3, 1, 3, PAL.bookA);
  // mid shelf
  P(3, 7, 1, 3, PAL.bookB);
  P(4, 7, 2, 3, PAL.bookA);
  P(6, 7, 1, 3, PAL.bookD);
  P(7, 7, 1, 3, PAL.bookC);
  P(8, 8, 1, 2, PAL.bookB);  // shorter, leaning
  P(9, 7, 1, 3, PAL.bookA);
  P(10, 7, 2, 3, PAL.bookC);
  P(12, 7, 1, 3, PAL.bookD);
  P(13, 7, 1, 3, PAL.bookB);
  // bottom shelf
  P(3, 11, 2, 3, PAL.bookC);
  P(5, 11, 1, 3, PAL.bookA);
  P(6, 11, 1, 3, PAL.bookB);
  P(7, 11, 1, 3, PAL.bookD);
  P(8, 11, 2, 3, PAL.bookA);
  P(10, 11, 1, 3, PAL.bookC);
  P(11, 11, 1, 3, PAL.bookB);
  P(12, 11, 2, 3, PAL.bookD);
  // book highlights
  P(3, 3, 1, 1, '#a04040');
  P(7, 7, 1, 1, '#5a8a4a');
  P(11, 11, 1, 1, '#3a6a8b');
}
window.MB_drawBookshelf = drawBookshelf;

// Bulletin board
function drawBulletinboard(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // wood frame
  P(1, 2, 14, 12, PAL.barkDark);
  // cork interior
  P(2, 3, 12, 10, PAL.cork);
  // cork speckle
  const specks = [[3,4],[6,5],[9,4],[12,5],[4,7],[8,7],[11,8],[3,10],[7,10],[10,11],[13,9]];
  for (const [a,b] of specks) P(a, b, 1, 1, PAL.corkDark);
  // posters / notes
  P(3, 4, 4, 4, '#f0e8d8');  // white note
  P(3, 4, 4, 1, '#c8b888');
  // text lines on note
  P(4, 5, 2, 1, PAL.corkDark);
  P(4, 6, 3, 1, PAL.corkDark);
  // yellow flyer
  P(8, 5, 4, 5, PAL.flowerYellow);
  P(8, 5, 4, 1, '#a08820');
  P(9, 7, 2, 1, PAL.barkDark);
  // pin (red dot)
  P(5, 4, 1, 1, PAL.flagRed);
  P(10, 5, 1, 1, PAL.flagRed);
  // small index card
  P(4, 10, 5, 2, '#f0e8d8');
  P(6, 10, 1, 1, PAL.flagRed); // pin
  // top frame highlight
  P(1, 2, 14, 1, PAL.bark);
  P(1, 2, 1, 12, PAL.bark);
}
window.MB_drawBulletinboard = drawBulletinboard;

// ── SPORTS OBJECTS ─────────────────────────────────────────

// Basketball
function drawBasketball(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(4, 13, 8, 1, 'rgba(0,0,0,0.30)');
  // ball circle
  P(5, 4, 6, 8, PAL.basketball);
  P(4, 5, 8, 6, PAL.basketball);
  P(6, 3, 4, 1, PAL.basketball);
  P(6, 12, 4, 1, PAL.basketball);
  // shadow
  P(10, 6, 1, 4, PAL.basketballDark);
  P(5, 11, 6, 1, PAL.basketballDark);
  // highlight
  P(5, 4, 3, 1, '#ffa050');
  P(5, 5, 1, 1, '#ffa050');
  // seams
  P(7, 3, 1, 10, PAL.basketballDark);
  P(8, 3, 1, 10, PAL.basketballDark);
  P(4, 7, 8, 1, PAL.basketballDark);
  // curved seam
  P(5, 5, 1, 1, PAL.basketballDark);
  P(10, 5, 1, 1, PAL.basketballDark);
  P(5, 10, 1, 1, PAL.basketballDark);
  P(10, 10, 1, 1, PAL.basketballDark);
}
window.MB_drawBasketball = drawBasketball;

// Hurdle
function drawHurdle(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // legs (slanted)
  P(2, 6, 1, 8, PAL.metalDark);
  P(3, 7, 1, 7, PAL.metalDark);
  P(13, 6, 1, 8, PAL.metalDark);
  P(12, 7, 1, 7, PAL.metalDark);
  // foot bases
  P(1, 13, 4, 1, PAL.metalGray);
  P(11, 13, 4, 1, PAL.metalGray);
  // top crossbar (white & red striped)
  P(2, 4, 12, 2, '#ffffff');
  P(2, 4, 12, 1, '#cccccc');
  // red stripes
  P(3, 4, 2, 2, PAL.flagRed);
  P(7, 4, 2, 2, PAL.flagRed);
  P(11, 4, 2, 2, PAL.flagRed);
  // top edge highlight
  P(2, 4, 12, 1, '#ffe8e8');
}
window.MB_drawHurdle = drawHurdle;

// Dodgeball
function drawDodgeball(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  P(4, 13, 8, 1, 'rgba(0,0,0,0.30)');
  P(5, 4, 6, 8, PAL.dodgeball);
  P(4, 5, 8, 6, PAL.dodgeball);
  P(6, 3, 4, 1, PAL.dodgeball);
  P(6, 12, 4, 1, PAL.dodgeball);
  // shadow
  P(10, 6, 1, 4, PAL.dodgeballDark);
  P(5, 11, 6, 1, PAL.dodgeballDark);
  // shine
  P(6, 4, 2, 1, '#ee5050');
  P(5, 5, 1, 2, '#ee5050');
  P(7, 5, 1, 1, '#ffffff');
}
window.MB_drawDodgeball = drawDodgeball;

// Soccer ball
function drawSoccerball(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  P(4, 13, 8, 1, 'rgba(0,0,0,0.30)');
  // white ball
  P(5, 4, 6, 8, PAL.soccerWhite);
  P(4, 5, 8, 6, PAL.soccerWhite);
  P(6, 3, 4, 1, PAL.soccerWhite);
  P(6, 12, 4, 1, PAL.soccerWhite);
  // black pentagon center
  P(7, 6, 2, 2, PAL.soccerBlack);
  // black accents around
  P(5, 5, 1, 1, PAL.soccerBlack);
  P(10, 5, 1, 1, PAL.soccerBlack);
  P(5, 10, 1, 1, PAL.soccerBlack);
  P(10, 10, 1, 1, PAL.soccerBlack);
  P(7, 4, 1, 1, PAL.soccerBlack);
  P(8, 4, 1, 1, PAL.soccerBlack);
  P(7, 11, 2, 1, PAL.soccerBlack);
  P(4, 7, 1, 2, PAL.soccerBlack);
  P(11, 7, 1, 2, PAL.soccerBlack);
  // shadow
  P(10, 9, 1, 2, '#cccccc');
  P(6, 11, 4, 1, '#cccccc');
}
window.MB_drawSoccerball = drawSoccerball;

// Baseball — small white with red stitching
function drawBaseball(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  P(5, 13, 6, 1, 'rgba(0,0,0,0.30)');
  P(6, 5, 4, 6, PAL.baseballWhite);
  P(5, 6, 6, 4, PAL.baseballWhite);
  P(7, 4, 2, 1, PAL.baseballWhite);
  P(7, 11, 2, 1, PAL.baseballWhite);
  // shadow
  P(9, 7, 1, 3, '#c8c0b0');
  P(6, 10, 4, 1, '#c8c0b0');
  // red stitching arc
  P(5, 7, 1, 1, PAL.baseballRed);
  P(6, 5, 1, 1, PAL.baseballRed);
  P(8, 5, 1, 1, PAL.baseballRed);
  P(10, 7, 1, 1, PAL.baseballRed);
  P(10, 9, 1, 1, PAL.baseballRed);
  P(8, 10, 1, 1, PAL.baseballRed);
  P(6, 10, 1, 1, PAL.baseballRed);
  P(5, 8, 1, 1, PAL.baseballRed);
  // shine
  P(7, 6, 1, 1, '#ffffff');
}
window.MB_drawBaseball = drawBaseball;

// Cone / pylon
function drawCone(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(3, 14, 10, 1, 'rgba(0,0,0,0.30)');
  // base
  P(3, 13, 10, 2, PAL.coneDark);
  P(3, 13, 10, 1, PAL.cone);
  // cone body — triangle
  P(7, 3, 2, 1, PAL.cone);
  P(6, 4, 4, 2, PAL.cone);
  P(5, 6, 6, 2, PAL.cone);
  P(5, 8, 6, 2, PAL.cone);
  P(4, 10, 8, 3, PAL.cone);
  // shadow side
  P(9, 4, 1, 1, PAL.coneDark);
  P(9, 6, 1, 4, PAL.coneDark);
  P(10, 10, 1, 3, PAL.coneDark);
  // white reflective stripe
  P(5, 8, 6, 1, '#ffffff');
  P(5, 11, 7, 1, '#ffffff');
  // tip highlight
  P(7, 3, 1, 1, '#ffa050');
  P(6, 4, 1, 2, '#ffa050');
  P(5, 6, 1, 2, '#ffa050');
}
window.MB_drawCone = drawCone;

// Sports bag — duffel
function drawSportsbag(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // body — long rounded
  P(3, 6, 10, 7, '#2a4a8b');
  P(2, 7, 12, 5, '#2a4a8b');
  P(2, 8, 1, 3, '#1a3a6b');
  P(13, 8, 1, 3, '#1a3a6b');
  P(3, 12, 10, 1, '#1a3a6b');
  // top highlight
  P(3, 6, 10, 1, '#3a5a9b');
  P(2, 7, 12, 1, '#3a5a9b');
  // zipper
  P(3, 8, 10, 1, PAL.metalGray);
  // zipper pull
  P(8, 8, 1, 2, PAL.metalDark);
  // handle (top loop)
  P(6, 4, 1, 3, PAL.barkDark);
  P(9, 4, 1, 3, PAL.barkDark);
  P(6, 4, 4, 1, PAL.barkDark);
  P(7, 5, 2, 1, PAL.bark);
  // side stripe
  P(2, 10, 12, 1, '#cc2020');
  // logo dot
  P(11, 9, 1, 1, '#ffffff');
}
window.MB_drawSportsbag = drawSportsbag;

// ── DECOR ──────────────────────────────────────────────────

// Flower patch — passable decor
function drawFlowerpatch(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // small grass tufts
  P(2, 12, 1, 2, PAL.hedgeDark);
  P(5, 13, 1, 2, PAL.hedgeDark);
  P(10, 13, 1, 2, PAL.hedgeDark);
  P(13, 12, 1, 2, PAL.hedgeDark);
  // stems
  P(3, 8, 1, 5, PAL.hedge);
  P(7, 6, 1, 7, PAL.hedge);
  P(11, 8, 1, 5, PAL.hedge);
  P(5, 10, 1, 3, PAL.hedge);
  P(13, 9, 1, 4, PAL.hedge);
  // leaves
  P(4, 10, 1, 1, PAL.hedgeLight);
  P(8, 9, 1, 1, PAL.hedgeLight);
  P(10, 10, 1, 1, PAL.hedgeLight);
  // flowers — pink
  P(2, 7, 3, 2, PAL.flowerPink);
  P(3, 6, 1, 1, PAL.flowerPink);
  P(3, 7, 1, 1, PAL.flowerYellow); // center
  // flowers — yellow
  P(6, 4, 3, 3, PAL.flowerYellow);
  P(7, 3, 1, 1, PAL.flowerYellow);
  P(7, 5, 1, 1, '#cc8000'); // center
  // flowers — white
  P(10, 6, 3, 2, PAL.flowerWhite);
  P(11, 5, 1, 1, PAL.flowerWhite);
  P(11, 6, 1, 1, PAL.flowerYellow);
  // small extra dot
  P(5, 11, 1, 1, PAL.flowerPink);
}
window.MB_drawFlowerpatch = drawFlowerpatch;

// Sign / signpost — directional
function drawSign(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // shadow
  P(5, 14, 6, 1, 'rgba(0,0,0,0.30)');
  // post
  P(7, 6, 2, 9, PAL.signWood);
  P(7, 6, 1, 9, PAL.bark);
  P(8, 6, 1, 9, PAL.barkDark);
  // top sign board (arrow-shape)
  P(2, 2, 11, 4, PAL.signWood);
  P(13, 3, 1, 2, PAL.signWood);  // arrow tip
  // top edge highlight
  P(2, 2, 11, 1, '#c08858');
  // bottom shadow
  P(2, 5, 12, 1, PAL.barkDark);
  // text lines
  P(3, 3, 6, 1, PAL.barkDark);
  P(3, 4, 4, 1, PAL.barkDark);
  // nail dots
  P(3, 2, 1, 1, PAL.metalLight);
  P(11, 2, 1, 1, PAL.metalLight);
  // ground at base
  P(5, 13, 6, 2, PAL.dirtDark);
}
window.MB_drawSign = drawSign;

// Campfire — logs + flames
function drawCampfire(ctx, x, y, s) {
  const P = _grid(ctx, x, y, s);
  // ground shadow
  P(2, 14, 12, 1, 'rgba(0,0,0,0.30)');
  // stone ring
  P(3, 12, 2, 2, PAL.rock);
  P(11, 12, 2, 2, PAL.rock);
  P(6, 13, 4, 1, PAL.rock);
  P(3, 12, 2, 1, PAL.rockLight);
  P(11, 12, 2, 1, PAL.rockLight);
  // logs (crossed)
  P(3, 10, 10, 1, PAL.bark);
  P(2, 11, 12, 1, PAL.barkDark);
  P(4, 9, 8, 1, PAL.bark);
  // log ends
  P(2, 10, 1, 2, PAL.barkDark);
  P(13, 10, 1, 2, PAL.barkDark);
  // ash
  P(5, 11, 6, 1, PAL.ash);
  // flames — outer red
  P(6, 6, 4, 4, PAL.fireDark);
  P(5, 7, 1, 3, PAL.fireDark);
  P(10, 7, 1, 3, PAL.fireDark);
  P(7, 5, 2, 1, PAL.fireDark);
  // mid orange
  P(6, 7, 4, 3, PAL.fire);
  P(7, 6, 2, 1, PAL.fire);
  // bright yellow core
  P(7, 8, 2, 2, PAL.fireBright);
  P(7, 7, 1, 1, PAL.fireBright);
  // sparks
  P(5, 4, 1, 1, PAL.fireBright);
  P(11, 5, 1, 1, PAL.fire);
  P(8, 3, 1, 1, PAL.fireBright);
}
window.MB_drawCampfire = drawCampfire;
