// ─────────────────────────────────────────────
// Chandler's World — shared sprite library
//
// Single source of truth for both index.html (game) and the map builder.
// Character sprites (Jax, Chandler) come from the game's pixel art.
// Environment art (tiles, walls, lockers, desks, doors, blackboards,
// exit, pickups) comes from the map builder.
//
// All draw functions take the canvas context as their first argument so
// they can render into any canvas. Old originals are preserved in
// /archive for reference.
// ─────────────────────────────────────────────
(function () {
  'use strict';

  // ── PALETTE ─────────────────────────────────
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
    windowPane:  '#a8d4f0',
    windowFrame: '#6b7a8b',
    blackboard:  '#2a4a35',
    chalkLine:   '#c8d8c0',
    corridorShadow: 'rgba(0,0,0,0.18)',
    exitGlow:    '#00ff88',
    exitDark:    '#00aa55',
    jaxColor:    '#4dabf7',
    chandlerRed: '#e03040',
    mud:         '#5a4220',
    mudDark:     '#3a2810',
  };

  // ── CHARACTER PALETTES (from the game) ──────
  const JAX_PAL = {
    skin:      '#f5c9a0',
    skinShad:  '#d4956a',
    hairA:     '#e8c840',
    hairB:     '#c8a020',
    hairC:     '#f0dc60',
    polo:      '#cc2020',
    poloShad:  '#8b1010',
    poloHi:    '#e84040',
    collar:    '#ffffff',
    pants:     '#2a4a7a',
    pantsShad: '#1a2f50',
    shoe:      '#1a1a1a',
    shoeSole:  '#3a3030',
    outline:   '#1a0a00',
    white:     '#ffffff',
    eyeW:      '#e8e8e8',
    eyeP:      '#3a2010',
    bagStrap:  '#8b6a30',
    bag:       '#6b5020',
  };

  const CHA_PAL = {
    skin:     '#e8b888',
    skinShad: '#b87848',
    skinHi:   '#f0c898',
    wrinkle:  '#c09060',
    hair:     '#1a1a1a',
    hairDark: '#0a0a0a',
    hairHi:   '#383838',
    shirt:    '#f0f0f0',
    shirtShad:'#c8c8c8',
    shirtHi:  '#ffffff',
    tie:      '#101010',
    tieHi:    '#383838',
    tieShi:   '#080808',
    pants:    '#b8a870',
    pantsSh:  '#8a7a50',
    pantsHi:  '#d0bf90',
    shoe:     '#2a1a0a',
    shoeSole: '#1a0f05',
    scisA:    '#d0d8e0',
    scisB:    '#909aa0',
    scisHan:  '#c03020',
    scisHanD: '#801a10',
    outline:  '#100800',
    eyeP:     '#202020',
    eyeW:     '#e8e8e8',
    brow:     '#1a1a1a',
    mouth:    '#9a5848',
    O:        '#100800',
  };

  // ── CHARACTER SPRITES ───────────────────────
  // Jax — 16×20 logical pixels. pixelSize controls how many actual
  // canvas pixels each logical pixel becomes. Default 2 matches the
  // game's natural 32×40 size; the builder passes a smaller value to
  // fit the sprite into a cell.
  function drawJaxSprite(ctx, ox, oy, frame, facing, pixelSize) {
    const ps = pixelSize || 2;
    ctx.save();
    if (facing === -1) {
      ctx.translate(ox + 16 * ps, oy);
      ctx.scale(-1, 1);
      ox = 0; oy = 0;
    }

    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x * ps, oy + y * ps, ps, ps);
    }
    function row(y) {
      for (let i = 1; i < arguments.length; i++) {
        const [x, c] = arguments[i];
        px(x, y, c);
      }
    }

    const S = JAX_PAL.skin, Ss = JAX_PAL.skinShad;
    const H = JAX_PAL.hairA, Hb = JAX_PAL.hairB, Hh = JAX_PAL.hairC;
    const P = JAX_PAL.polo, Ps = JAX_PAL.poloShad, Ph = JAX_PAL.poloHi;
    const C = JAX_PAL.collar;
    const N = JAX_PAL.pants, Ns = JAX_PAL.pantsShad;
    const K = JAX_PAL.shoe, Ks = JAX_PAL.shoeSole;
    const O = JAX_PAL.outline;
    const Ep = JAX_PAL.eyeP, Ew = JAX_PAL.eyeW;

    const legA = frame === 1 ? -1 : (frame === 2 ? 1 : 0);
    const legB = frame === 1 ? 1  : (frame === 2 ? -1 : 0);

    row(0,  [4,O],[5,Hb],[6,H],[7,Hh],[8,H],[9,O]);
    row(1,  [3,O],[4,Hb],[5,H],[6,Hh],[7,H],[8,Hh],[9,H],[10,O]);
    row(2,  [2,O],[3,H],[4,Hh],[5,S],[6,S],[7,S],[8,S],[9,H],[10,Hb],[11,O]);
    row(3,  [2,Hb],[3,H],[4,S],[5,S],[6,S],[7,S],[8,S],[9,S],[10,H],[11,O]);
    row(4,  [2,Hb],[3,S],[4,Ew],[5,Ep],[6,S],[7,S],[8,S],[9,Ep],[10,S],[11,Hb]);
    row(5,  [2,O],[3,S],[4,S],[5,S],[6,S],[7,S],[8,S],[9,S],[10,S],[11,O]);
    row(6,  [3,O],[4,S],[5,S],[6,Ss],[7,S],[8,S],[9,S],[10,O]);
    row(7,  [4,O],[5,S],[6,S],[7,Ss],[8,S],[9,O]);
    row(8,  [4,O],[5,C],[6,C],[7,C],[8,C],[9,O]);
    row(9,  [3,O],[4,Ph],[5,P],[6,P],[7,P],[8,P],[9,P],[10,Ps],[11,O]);
    row(10, [2,O],[3,P],[4,P],[5,P],[6,P],[7,P],[8,P],[9,P],[10,Ps],[11,O]);
    row(11, [2,O],[3,Ph],[4,P],[5,P],[6,P],[7,P],[8,P],[9,Ps],[10,O]);
    row(12, [1,O],[2,S],[3,P],[4,P],[5,P],[6,P],[7,P],[8,P],[9,P],[10,S],[11,O]);
    row(13, [1,Ss],[2,S],[3,Ph],[4,P],[5,P],[6,P],[7,P],[8,Ps],[9,P],[10,S],[11,Ss]);
    row(14, [1,O],[2,Ss],[3,O],[4,N],[5,N],[6,N],[7,N],[8,N],[9,O],[10,Ss],[11,O]);
    row(15, [3,O],[4,Ns],[5,N],[6,N],[7,N],[8,Ns],[9,O]);

    const ll = 16 + legA;
    row(Math.max(16, ll),   [3,O],[4,N],[5,N],[6,O]);
    row(Math.max(17, ll+1), [3,N],[4,Ns],[5,N],[6,O]);
    const rl = 16 + legB;
    row(Math.max(16, rl),   [7,O],[8,N],[9,N],[10,O]);
    row(Math.max(17, rl+1), [7,N],[8,Ns],[9,N],[10,O]);

    const sl = 18 + legA, sr = 18 + legB;
    row(Math.min(18, sl),   [3,O],[4,K],[5,K],[6,O]);
    row(Math.min(19, sl+1), [3,Ks],[4,K],[5,K],[6,Ks]);
    row(Math.min(18, sr),   [7,O],[8,K],[9,K],[10,O]);
    row(Math.min(19, sr+1), [7,Ks],[8,K],[9,K],[10,Ks]);

    ctx.restore();
  }

  // Chandler — 17 wide × 23 tall, plus scissors extending to col 21.
  function drawChandlerSprite(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    ctx.save();
    if (facing === -1) {
      ctx.translate(ox + 17 * ps, oy);
      ctx.scale(-1, 1);
      ox = 0; oy = 0;
    }

    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x * ps, oy + y * ps, ps, ps);
    }
    function row(y) {
      for (let i = 1; i < arguments.length; i++) {
        const [x, c] = arguments[i];
        px(x, y, c);
      }
    }

    const Ss = CHA_PAL.skinShad;
    const Wr = CHA_PAL.wrinkle;
    const Hr = CHA_PAL.hair, Hd = CHA_PAL.hairDark, Hh = CHA_PAL.hairHi;
    const W = CHA_PAL.shirt, Ws = CHA_PAL.shirtShad, Wh = CHA_PAL.shirtHi;
    const T = CHA_PAL.tie, Th = CHA_PAL.tieHi;
    const K = CHA_PAL.pants, Ks = CHA_PAL.pantsSh, Kh = CHA_PAL.pantsHi;
    const E = CHA_PAL.shoe, Es = CHA_PAL.shoeSole;
    const SA = CHA_PAL.scisA, SB = CHA_PAL.scisB;
    const SH = CHA_PAL.scisHan, SD = CHA_PAL.scisHanD;
    const O = CHA_PAL.O;
    const Ep = CHA_PAL.eyeP, Ew = CHA_PAL.eyeW;
    const Br = CHA_PAL.brow;
    const Sk = stunned ? CHA_PAL.shirtShad : CHA_PAL.skin;

    const legA = frame === 1 ? -1 : (frame === 2 ? 1 : 0);
    const legB = frame === 1 ? 1  : (frame === 2 ? -1 : 0);

    row(0,  [4,O],[5,Hd],[6,Hr],[7,Hr],[8,Hh],[9,Hr],[10,Hd],[11,O]);
    row(1,  [3,O],[4,Hd],[5,Hr],[6,Hr],[7,Hh],[8,Hr],[9,Hr],[10,Hd],[11,O]);
    row(2,  [3,Hd],[4,Hr],[5,Sk],[6,Sk],[7,Sk],[8,Sk],[9,Sk],[10,Hr],[11,Hd]);
    row(3,  [2,O],[3,Hd],[4,Sk],[5,Sk],[6,Wr],[7,Sk],[8,Sk],[9,Sk],[10,Hd],[11,O]);
    row(4,  [2,O],[3,Sk],[4,Br],[5,Br],[6,Br],[7,Sk],[8,Br],[9,Br],[10,Sk],[11,O]);
    row(5,  [2,Ss],[3,Sk],[4,Ew],[5,Ep],[6,Sk],[7,Sk],[8,Ew],[9,Ep],[10,Sk],[11,Ss]);
    row(6,  [2,Wr],[3,Sk],[4,Sk],[5,Ss],[6,Sk],[7,Sk],[8,Ss],[9,Sk],[10,Sk],[11,Wr]);
    row(7,  [3,Wr],[4,Sk],[5,Sk],[6,CHA_PAL.mouth],[7,CHA_PAL.mouth],[8,Sk],[9,Sk],[10,Wr]);
    row(8,  [2,O],[3,Ss],[4,Sk],[5,Sk],[6,Sk],[7,Sk],[8,Sk],[9,Ss],[10,O]);
    row(9,  [4,O],[5,Wh],[6,Wh],[7,T],[8,Wh],[9,Wh],[10,O]);
    row(10, [2,O],[3,Wh],[4,W],[5,W],[6,T],[7,T],[8,W],[9,W],[10,Ws],[11,O]);
    row(11, [2,O],[3,W],[4,W],[5,W],[6,Th],[7,T],[8,W],[9,W],[10,Ws],[11,O]);
    row(12, [1,O],[2,Ws],[3,W],[4,W],[5,W],[6,T],[7,T],[8,W],[9,W],[10,Ws],[11,O]);
    row(13, [1,O],[2,W],[3,W],[4,W],[5,W],[6,Th],[7,T],[8,W],[9,Ws],[10,O]);
    row(14, [0,O],[1,Ws],[2,W],[3,W],[4,W],[5,W],[6,Th],[7,T],[8,W],[9,W],[10,W],[11,O]);
    row(15, [0,Ss],[1,Sk],[2,Ws],[3,W],[4,W],[5,Th],[6,T],[7,T],[8,W],[9,Ws],[10,Sk],[11,Ss]);
    row(16, [2,O],[3,Ks],[4,K],[5,K],[6,Ks],[7,K],[8,K],[9,Ks],[10,O]);

    // Scissors in right hand
    row(12, [11,O],[12,SH],[13,SH],[14,O]);
    row(13, [11,SH],[12,SD],[13,SH],[14,SH],[15,O]);
    row(14, [11,SH],[12,SD],[13,SH],[14,O]);
    row(15, [11,O],[12,SH],[13,SD],[14,O]);
    row(13, [14,O],[15,SA],[16,O]);
    row(10, [14,O],[15,SA],[16,SA],[17,SA],[18,O]);
    row(11, [13,O],[14,SB],[15,SA],[16,SA],[17,SA],[18,SA],[19,O]);
    row(12, [13,SA],[14,SB],[15,SA],[16,SA],[17,SA],[18,SA],[19,SA],[20,O]);
    row(13, [14,SA],[15,SB],[16,SA],[17,SA],[18,SA],[19,O]);
    row(14, [14,O],[15,SA],[16,SA],[17,SA],[18,SA],[19,O]);
    row(15, [13,O],[14,SB],[15,SA],[16,SA],[17,SA],[18,SA],[19,SA],[20,O]);
    row(16, [13,SA],[14,SB],[15,SA],[16,SA],[17,SA],[18,O]);
    row(17, [14,O],[15,SA],[16,SA],[17,O]);
    row(9,  [18,O],[19,SA],[20,SA],[21,O]);
    row(10, [19,O],[20,SA],[21,O]);
    row(18, [17,O],[18,SA],[19,SA],[20,O]);
    row(19, [18,O],[19,SA],[20,O]);

    // Legs
    const ll = 17 + legA, rl = 17 + legB;
    row(Math.max(17,ll),   [3,O],[4,Kh],[5,K],[6,O]);
    row(Math.max(18,ll+1), [3,K],[4,Ks],[5,K],[6,O]);
    row(Math.max(19,ll+2), [3,K],[4,Ks],[5,Kh],[6,O]);
    row(Math.max(17,rl),   [7,O],[8,Kh],[9,K],[10,O]);
    row(Math.max(18,rl+1), [7,K],[8,Ks],[9,K],[10,O]);
    row(Math.max(19,rl+2), [7,K],[8,Ks],[9,Kh],[10,O]);

    // Shoes
    const sl = 20 + legA, sr = 20 + legB;
    row(Math.min(20,sl),   [3,O],[4,E],[5,E],[6,O]);
    row(Math.min(21,sl+1), [2,O],[3,Es],[4,E],[5,E],[6,Es],[7,O]);
    row(Math.min(20,sr),   [7,O],[8,E],[9,E],[10,O]);
    row(Math.min(21,sr+1), [6,O],[7,Es],[8,E],[9,E],[10,Es],[11,O]);

    ctx.restore();
  }

  // Convenience wrappers: fit a character sprite inside an s×s cell.
  // Used by the map builder to render the same game sprites at any zoom.
  // Sprite is centered horizontally; bottom-aligned to the cell.
  function drawJaxInCell(ctx, x, y, s, frame, facing) {
    const ps = s / 20;             // 20 logical rows tall
    const drawnW = 16 * ps;
    const ox = x + (s - drawnW) / 2;
    drawJaxSprite(ctx, ox, y, frame || 0, facing == null ? 1 : facing, ps);
  }
  function drawChandlerInCell(ctx, x, y, s, frame, facing, stunned) {
    const ps = s / 23;             // 23 logical rows tall
    const drawnW = 22 * ps;        // includes scissors extending to col 21
    const ox = x + (s - drawnW) / 2;
    drawChandlerSprite(ctx, ox, y, frame || 0, facing == null ? 1 : facing, !!stunned, ps);
  }

  // ── ENVIRONMENT ART (from the map builder) ──
  const T = 32;
  const SRC = T * 2;

  function _newTile() {
    const c = document.createElement('canvas');
    c.width = SRC; c.height = SRC;
    return c;
  }

  function _checker(c2, a, b, groutAlpha, groutColor) {
    if (groutAlpha == null) groutAlpha = 0.30;
    if (groutColor == null) groutColor = '#000';
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
        c2.fillStyle = '#8b6535';
        for (let i = 0; i < 16; i++) {
          const x = ((i * 17) % SRC), y = ((i * 31) % SRC);
          c2.fillRect(x, y, 2, 2);
        }
        break;
      case 'carpet':
        c2.fillStyle = PAL.carpet; c2.fillRect(0, 0, SRC, SRC);
        c2.fillStyle = PAL.carpetDark;
        for (let y = 0; y < SRC; y += 4)
          for (let x = (y / 4 % 2) * 2; x < SRC; x += 4)
            c2.fillRect(x, y, 2, 2);
        break;
      case 'grass':
        c2.fillStyle = PAL.grass; c2.fillRect(0, 0, SRC, SRC);
        c2.fillStyle = PAL.grassDark;
        for (let i = 0; i < 28; i++) {
          const x = ((i * 13) % SRC), y = ((i * 23) % SRC);
          c2.fillRect(x, y, 1, 4);
          c2.fillRect(x+2, y+1, 1, 3);
        }
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
        c2.fillRect(T - 1, 0, 2, SRC);
        c2.fillRect(0, T - 1, SRC, 2);
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

  function drawBrickEdge(ctx, dir, x, y, s) {
    const t = Math.max(2, Math.round(s * 0.14));
    ctx.imageSmoothingEnabled = false;

    let rx = x, ry = y, rw = s, rh = s;
    if      (dir === 'n') { rh = t; }
    else if (dir === 's') { ry = y + s - t; rh = t; }
    else if (dir === 'w') { rw = t; }
    else if (dir === 'e') { rx = x + s - t; rw = t; }

    ctx.fillStyle = PAL.wallFace;
    ctx.fillRect(rx, ry, rw, rh);

    const horizontal = (dir === 'n' || dir === 's');
    const brickH = Math.max(2, Math.round(s * 0.12));
    const brickW = Math.max(4, Math.round(s * 0.28));

    ctx.fillStyle = PAL.wallMortar;
    if (horizontal) {
      for (let yy = ry + brickH; yy < ry + rh; yy += brickH) {
        ctx.fillRect(rx, yy, rw, 1);
      }
      let course = 0;
      for (let yy = ry; yy < ry + rh; yy += brickH, course++) {
        const off = (course % 2) * (brickW / 2);
        for (let xx = rx + off; xx < rx + rw; xx += brickW) {
          ctx.fillRect(xx, yy, 1, brickH);
        }
      }
    } else {
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

    ctx.fillStyle = PAL.wallTop;
    if      (dir === 'n') ctx.fillRect(rx, ry, rw, 1);
    else if (dir === 'w') ctx.fillRect(rx, ry, 1, rh);
    else if (dir === 'e') ctx.fillRect(rx, ry, 1, rh);
    else if (dir === 's') {
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.35;
      ctx.fillRect(rx, ry + rh - 1, rw, 1);
      ctx.globalAlpha = 1;
    }
  }

  function drawWall(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAL.wallFace;
    ctx.fillRect(x, y, s, s);

    const brickH = Math.max(3, Math.round(s * 0.18));
    const brickW = Math.max(6, Math.round(s * 0.40));
    ctx.fillStyle = PAL.wallMortar;
    for (let yy = y + brickH; yy < y + s; yy += brickH) {
      ctx.fillRect(x, yy, s, 1);
    }
    let course = 0;
    for (let yy = y; yy < y + s; yy += brickH, course++) {
      const off = (course % 2) * (brickW / 2);
      for (let xx = x + off; xx < x + s; xx += brickW) {
        ctx.fillRect(xx, yy, 1, brickH);
      }
    }
    ctx.fillStyle = PAL.wallTop;
    ctx.fillRect(x, y, s, 1);
    ctx.fillRect(x, y, 1, s);
  }

  function drawPushable(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.10));
    ctx.fillStyle = PAL.deskTop;
    ctx.fillRect(x + pad, y + s * 0.40, s - pad*2, s * 0.45);
    ctx.fillStyle = PAL.deskSide;
    ctx.fillRect(x + pad, y + s * 0.78, s - pad*2, Math.max(2, s * 0.07));
    ctx.fillStyle = PAL.deskTop;
    ctx.fillRect(x + pad + 1, y + pad, s - pad*2 - 2, s * 0.32);
    ctx.fillStyle = PAL.deskSide;
    ctx.fillRect(x + pad + 1, y + pad + s * 0.28, s - pad*2 - 2, 2);
    ctx.fillStyle = PAL.deskLeg;
    const legW = Math.max(1, Math.round(s * 0.08));
    ctx.fillRect(x + pad + 1, y + s - pad - 2, legW, 2);
    ctx.fillRect(x + s - pad - 1 - legW, y + s - pad - 2, legW, 2);
    ctx.fillStyle = '#a07848';
    ctx.fillRect(x + pad, y + s * 0.40, s - pad*2, 1);
  }

  function drawMud(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAL.mudDark;
    const cx = x + s/2, cy = y + s/2;
    const dots = [
      [0.5,0.5,0.32],[0.30,0.40,0.16],[0.70,0.45,0.18],
      [0.45,0.70,0.20],[0.25,0.65,0.10],[0.75,0.70,0.12],
      [0.55,0.25,0.13],
    ];
    for (let i = 0; i < dots.length; i++) {
      const [dx, dy, r] = dots[i];
      ctx.fillRect(x + s*dx - s*r/2, y + s*dy - s*r/2, s*r, s*r);
    }
    ctx.fillStyle = PAL.mud;
    ctx.fillRect(cx - s*0.10, cy - s*0.10, s*0.10, s*0.10);
    ctx.fillRect(cx + s*0.05, cy - s*0.20, s*0.06, s*0.06);
  }

  function drawLocker(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.08));
    const lx = x + pad, ly = y + pad, lw = s - pad*2, lh = s - pad*2;
    ctx.fillStyle = PAL.lockerA;
    ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = PAL.lockerB;
    ctx.fillRect(lx + lw - Math.max(1, lw*0.15), ly, Math.max(1, lw*0.15), lh);
    ctx.fillRect(lx, ly + lh - Math.max(1, lh*0.10), lw, Math.max(1, lh*0.10));
    ctx.fillStyle = PAL.lockerTrim;
    ctx.fillRect(lx, ly, lw, 1);
    ctx.fillRect(lx, ly, 1, lh);
    ctx.fillStyle = PAL.lockerVent;
    const vy = ly + lh * 0.18;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(lx + lw*0.20, vy + i * Math.max(1, Math.round(lh*0.08)), lw*0.60, 1);
    }
    if (s >= 16) {
      ctx.fillStyle = '#1a2a40';
      const hx = lx + lw*0.70, hy = ly + lh*0.55;
      const hw = Math.max(1, lw*0.12), hh = Math.max(2, lh*0.14);
      ctx.fillRect(hx, hy, hw, hh);
      ctx.fillStyle = '#88aacc';
      ctx.fillRect(hx, hy, hw, 1);
    }
  }

  function drawDesk(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.10));
    const dx = x + pad, dy = y + pad + s*0.10;
    const dw = s - pad*2, dh = s - pad*2 - s*0.20;
    ctx.fillStyle = PAL.deskTop;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = '#a07848';
    ctx.fillRect(dx, dy, dw, 1);
    ctx.fillStyle = PAL.deskSide;
    ctx.fillRect(dx, dy + dh - Math.max(1, dh*0.20), dw, Math.max(1, dh*0.20));
    ctx.fillStyle = PAL.deskLeg;
    const legW = Math.max(1, Math.round(s*0.10));
    ctx.fillRect(dx + 1, dy + dh, legW, Math.max(1, s*0.10));
    ctx.fillRect(dx + dw - 1 - legW, dy + dh, legW, Math.max(1, s*0.10));
    if (s >= 24) {
      ctx.fillStyle = '#cc4040';
      ctx.fillRect(dx + dw*0.20, dy + dh*0.30, dw*0.30, dh*0.20);
      ctx.fillStyle = '#fff';
      ctx.fillRect(dx + dw*0.22, dy + dh*0.34, dw*0.26, 1);
    }
  }

  function drawDoor(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.10));
    const dx = x + pad, dy = y + Math.max(1, Math.round(s * 0.05));
    const dw = s - pad*2, dh = s - Math.max(2, Math.round(s * 0.10));
    ctx.fillStyle = PAL.doorFrame;
    ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
    ctx.fillStyle = PAL.doorFace;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = PAL.doorFrame;
    const panelMargin = Math.max(1, Math.round(s * 0.10));
    ctx.fillRect(dx + panelMargin, dy + panelMargin, dw - panelMargin*2, 1);
    ctx.fillRect(dx + panelMargin, dy + dh*0.5, dw - panelMargin*2, 1);
    ctx.fillRect(dx + panelMargin, dy + dh - panelMargin, dw - panelMargin*2, 1);
    if (s >= 16) {
      ctx.fillStyle = PAL.doorKnob;
      ctx.fillRect(dx + dw - Math.max(2, s*0.18), dy + dh*0.5 - 1, Math.max(2, s*0.10), Math.max(2, s*0.10));
    }
    ctx.fillStyle = '#e89060';
    ctx.fillRect(dx, dy, dw, 1);
  }

  function drawBlackboard(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.08));
    const bx = x + pad, by = y + pad + s*0.08;
    const bw = s - pad*2, bh = s - pad*2 - s*0.16;
    ctx.fillStyle = PAL.deskSide;
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = PAL.blackboard;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = PAL.chalkLine;
    if (s >= 14) {
      ctx.fillRect(bx + bw*0.12, by + bh*0.20, bw*0.50, 1);
      ctx.fillRect(bx + bw*0.12, by + bh*0.40, bw*0.30, 1);
      ctx.fillRect(bx + bw*0.12, by + bh*0.60, bw*0.45, 1);
    }
    ctx.fillStyle = PAL.deskTop;
    ctx.fillRect(bx, by + bh, bw, Math.max(1, s*0.06));
    ctx.fillStyle = PAL.deskSide;
    ctx.fillRect(bx, by + bh + Math.max(1, s*0.06), bw, 1);
  }

  function drawExit(ctx, x, y, s, t) {
    ctx.imageSmoothingEnabled = false;
    const pad = Math.max(1, Math.round(s * 0.06));
    const ex = x + pad, ey = y + pad;
    const ew = s - pad*2, eh = s - pad*2;
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    ctx.fillStyle = PAL.exitDark;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.fillStyle = PAL.exitGlow;
    ctx.fillRect(ex + 2, ey + 2, ew - 4, eh - 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    const cx = ex + ew/2;
    const tipY = ey + eh*0.22;
    const wingY = ey + eh*0.50;
    const wingW = ew*0.30;
    for (let i = 0; i < eh*0.30; i++) {
      const w = (i / (eh*0.30)) * wingW;
      ctx.fillRect(cx - w, tipY + i, w*2, 1);
    }
    ctx.fillRect(cx - 1, wingY, 2, eh*0.30);
    if (s >= 28) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.floor(s*0.16) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('EXIT', x + s/2, ey + eh*0.82);
    }
    ctx.strokeStyle = PAL.exitGlow;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
  }

  // Pickups — 16×16 logical pixels, scaled to cell size s.
  function _pickupHelper(ctx, x, y, s) {
    const u = s / 16;
    return function (px_, py_, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x + px_*u, y + py_*u, Math.max(1, w*u), Math.max(1, h*u));
    };
  }

  function drawGel(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const P = _pickupHelper(ctx, x, y, s);
    P(4, 14, 8, 1, 'rgba(0,0,0,0.35)');
    P(5, 4, 6, 10, '#f0d020');
    P(5, 4, 1, 10, '#fff080');
    P(10, 4, 1, 10, '#a08810');
    P(5, 2, 6, 2, '#1a1a1a');
    P(6, 1, 4, 1, '#3a3a3a');
    P(6, 6, 4, 3, '#fff');
    P(6, 7, 4, 1, '#cc2020');
    P(7, 4, 1, 1, '#fff');
  }

  function drawMirror(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const P = _pickupHelper(ctx, x, y, s);
    P(5, 14, 6, 1, 'rgba(0,0,0,0.30)');
    P(7, 11, 2, 4, '#a06030');
    P(7, 11, 1, 4, '#c08050');
    P(4, 2, 8, 1, '#a0a8b0');
    P(3, 3, 1, 6, '#a0a8b0');
    P(12, 3, 1, 6, '#a0a8b0');
    P(4, 9, 8, 1, '#a0a8b0');
    P(4, 3, 1, 1, '#a0a8b0');
    P(11, 3, 1, 1, '#a0a8b0');
    P(4, 8, 1, 1, '#a0a8b0');
    P(11, 8, 1, 1, '#a0a8b0');
    P(4, 3, 8, 6, '#c0d8e8');
    P(5, 3, 1, 1, '#a0a8b0');
    P(10, 3, 1, 1, '#a0a8b0');
    P(5, 8, 1, 1, '#a0a8b0');
    P(10, 8, 1, 1, '#a0a8b0');
    P(5, 4, 2, 1, '#fff');
    P(5, 5, 1, 1, '#fff');
    P(5, 2, 3, 1, '#e0e8f0');
  }

  function drawSpray(ctx, x, y, s) {
    ctx.imageSmoothingEnabled = false;
    const P = _pickupHelper(ctx, x, y, s);
    P(5, 14, 6, 1, 'rgba(0,0,0,0.30)');
    P(5, 4, 6, 10, '#c8c8c8');
    P(5, 4, 1, 10, '#f0f0f0');
    P(10, 4, 1, 10, '#888');
    P(5, 7, 6, 3, '#cc2020');
    P(5, 7, 6, 1, '#ee5050');
    P(5, 9, 6, 1, '#881010');
    P(5, 3, 6, 1, '#a0a0a0');
    P(7, 1, 2, 2, '#3a3a3a');
    P(7, 1, 1, 2, '#5a5a5a');
    P(9, 0, 1, 1, 'rgba(255,255,255,0.7)');
    P(10, 1, 1, 1, 'rgba(255,255,255,0.5)');
    P(11, 0, 1, 1, 'rgba(255,255,255,0.4)');
  }

  // ── PUBLIC API ──────────────────────────────
  window.Sprites = {
    PAL, JAX_PAL, CHA_PAL,
    drawJaxSprite, drawChandlerSprite,
    drawJaxInCell, drawChandlerInCell,
    buildTile,
    drawBrickEdge, drawWall, drawPushable, drawMud,
    drawLocker, drawDesk, drawDoor, drawBlackboard,
    drawExit, drawGel, drawMirror, drawSpray,
  };
})();
