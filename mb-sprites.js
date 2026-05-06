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
