// ─────────────────────────────────────────────────────────────
// CHANDLER'S WORLD — VILLAIN SPRITES
// 17×23 pixel grid, drawn at 2× (34×46 actual) — same as Chandler.
// Each draw fn: (ctx, ox, oy, frame, facing[, stunned])
//   frame: 0 = idle, 1/2 = walk cycle
//   facing: 1 = right, -1 = left
// ─────────────────────────────────────────────────────────────
(function () {
  function pxFn(ctx, ps) {
    return function (x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, ps, ps);
    };
  }

  function spriteWrap(ctx, ox, oy, facing, ps, drawBody) {
    ctx.save();
    if (facing === -1) {
      ctx.translate(ox + 17 * ps, oy);
      ctx.scale(-1, 1);
      ox = 0;
      oy = 0;
    }
    const px = pxFn(ctx, ps);
    function row(y, ...pixels) {
      for (const [x, c] of pixels) px(ox + x * ps, oy + y * ps, c);
    }
    drawBody(row, px);
    ctx.restore();
  }

  // Common: leg offsets for walk animation
  function legOffsets(frame) {
    const a = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    const b = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    return [a, b];
  }

  // ───────────────────────────────────────────────
  // BIG W — egg-shaped head, balding, chunky belly, tall
  // White dress shirt, dark tie, blue pants
  // ───────────────────────────────────────────────
  const BIGW = {
    skin: '#f0c898', skinShad: '#c89058', skinHi: '#f8d8b0',
    hair: '#6a4520', hairD: '#3a2510',
    shirt: '#f0f0f0', shirtShad: '#c8c8c8', shirtHi: '#ffffff',
    tie: '#1a2640', tieHi: '#3a4660',
    pants: '#3050a0', pantsShad: '#1a3070', pantsHi: '#5070c0',
    shoe: '#1a1208', shoeS: '#0a0604',
    eyeP: '#202020', eyeW: '#f0f0f0',
    brow: '#3a2510', mouth: '#9a5848',
    O: '#100800',
  };

  function drawBigW(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    spriteWrap(ctx, ox, oy, facing, ps, (row) => {
      const P = BIGW;
      const Sk = P.skin, Ss = P.skinShad, Sh = P.skinHi;
      const O = P.O;
      const [legA, legB] = legOffsets(frame);

      // Egg-shaped bald head — wide at top, tapers in. Just a few hairs on sides.
      // Row 0: very top of dome
      row(0, [6, P.O], [7, Sk], [8, Sk], [9, Sk], [10, P.O]);
      // Row 1: dome widening
      row(1, [5, P.O], [6, Sk], [7, Sh], [8, Sk], [9, Sk], [10, Sk], [11, P.O]);
      // Row 2: thin hair wisps on top + temple hair starting
      row(2, [4, P.O], [5, Sk], [6, P.hair], [7, Sk], [8, P.hair], [9, Sk], [10, P.hair], [11, Sk], [12, P.O]);
      // Row 3: forehead, hair on sides only (balding)
      row(3, [3, P.O], [4, P.hair], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Sk], [11, Sk], [12, P.hair], [13, P.O]);
      // Row 4: temples + hair sides + faint brows (sparse)
      row(4, [3, P.hair], [4, P.hairD], [5, Sk], [6, P.brow], [7, P.brow], [8, Sk], [9, P.brow], [10, P.brow], [11, Sk], [12, P.hairD], [13, P.hair]);
      // Row 5: eyes
      row(5, [3, Ss], [4, Sk], [5, Sk], [6, P.eyeW], [7, P.eyeP], [8, Sk], [9, P.eyeW], [10, P.eyeP], [11, Sk], [12, Sk], [13, Ss]);
      // Row 6: nose
      row(6, [3, P.O], [4, Sk], [5, Sk], [6, Sk], [7, Sk], [8, Ss], [9, Sk], [10, Sk], [11, Sk], [12, Sk], [13, P.O]);
      // Row 7: mouth
      row(7, [4, P.O], [5, Sk], [6, Sk], [7, P.mouth], [8, P.mouth], [9, P.mouth], [10, Sk], [11, Sk], [12, P.O]);
      // Row 8: jaw / double chin (tall guy, but full chin)
      row(8, [4, P.O], [5, Ss], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Sk], [11, Ss], [12, P.O]);
      // Row 9: neck/collar
      row(9, [4, P.O], [5, P.shirtHi], [6, P.shirtHi], [7, P.tie], [8, P.tie], [9, P.shirtHi], [10, P.shirtHi], [11, P.O]);

      // Chunky torso — wider than Chandler's
      const W = P.shirt, Ws = P.shirtShad, Wh = P.shirtHi;
      row(10, [2, P.O], [3, Wh], [4, W], [5, W], [6, P.tie], [7, P.tie], [8, W], [9, W], [10, Ws], [11, P.O]);
      row(11, [1, P.O], [2, Wh], [3, W], [4, W], [5, W], [6, P.tieHi], [7, P.tie], [8, W], [9, W], [10, Ws], [11, Ws], [12, P.O]);
      // Belly bulges out wider rows 12–14
      row(12, [1, P.O], [2, W], [3, W], [4, W], [5, W], [6, P.tie], [7, P.tie], [8, W], [9, W], [10, W], [11, Ws], [12, P.O]);
      row(13, [0, P.O], [1, Ws], [2, W], [3, W], [4, W], [5, W], [6, P.tieHi], [7, P.tie], [8, W], [9, W], [10, W], [11, Ws], [12, Ws], [13, P.O]);
      row(14, [0, P.O], [1, W], [2, W], [3, W], [4, W], [5, W], [6, P.tie], [7, P.tie], [8, W], [9, W], [10, W], [11, W], [12, Ws], [13, P.O]);
      row(15, [0, P.O], [1, W], [2, W], [3, W], [4, W], [5, W], [6, W], [7, W], [8, W], [9, W], [10, W], [11, W], [12, Ws], [13, P.O]);
      // Belt
      row(16, [1, P.O], [2, P.pantsShad], [3, P.pants], [4, P.pants], [5, P.pants], [6, P.pantsShad], [7, P.pants], [8, P.pants], [9, P.pants], [10, P.pantsShad], [11, P.pants], [12, P.O]);

      // Blue pants legs
      const K = P.pants, Ks = P.pantsShad, Kh = P.pantsHi;
      const ll = 17 + legA, rl = 17 + legB;
      row(Math.max(17, ll), [3, P.O], [4, Kh], [5, K], [6, P.O]);
      row(Math.max(18, ll + 1), [3, K], [4, Ks], [5, K], [6, P.O]);
      row(Math.max(19, ll + 2), [3, K], [4, Ks], [5, Kh], [6, P.O]);
      row(Math.max(17, rl), [9, P.O], [10, Kh], [11, K], [12, P.O]);
      row(Math.max(18, rl + 1), [9, K], [10, Ks], [11, K], [12, P.O]);
      row(Math.max(19, rl + 2), [9, K], [10, Ks], [11, Kh], [12, P.O]);

      // Shoes
      const sl = 20 + legA, sr = 20 + legB;
      row(Math.min(20, sl), [3, P.O], [4, P.shoe], [5, P.shoe], [6, P.O]);
      row(Math.min(21, sl + 1), [2, P.O], [3, P.shoeS], [4, P.shoe], [5, P.shoe], [6, P.shoeS], [7, P.O]);
      row(Math.min(20, sr), [9, P.O], [10, P.shoe], [11, P.shoe], [12, P.O]);
      row(Math.min(21, sr + 1), [8, P.O], [9, P.shoeS], [10, P.shoe], [11, P.shoe], [12, P.shoeS], [13, P.O]);
    });
  }

  // ───────────────────────────────────────────────
  // WINGMAN — thick dark hair, glasses, big nose
  // Brown suit coat, white shirt under, khaki pants
  // ───────────────────────────────────────────────
  const WING = {
    skin: '#e8c098', skinShad: '#b88460', skinHi: '#f0d0a8',
    hair: '#1a1208', hairD: '#0a0604', hairHi: '#3a2818',
    shirt: '#f0f0f0', shirtShad: '#c8c8c8',
    coat: '#5a3a1c', coatShad: '#3a2410', coatHi: '#7a5230',
    tie: '#3a2410', tieHi: '#5a3a1c',
    pants: '#b8a870', pantsShad: '#8a7a50', pantsHi: '#d0bf90',
    shoe: '#2a1a0a', shoeS: '#1a0f05',
    eyeP: '#202020', eyeW: '#f0f0f0',
    glass: '#1a1208', lens: '#a8c0d0',
    mouth: '#8a4838',
    O: '#100800',
  };

  function drawWingman(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    spriteWrap(ctx, ox, oy, facing, ps, (row) => {
      const P = WING;
      const Sk = P.skin, Ss = P.skinShad, Sh = P.skinHi;
      const Hr = P.hair, Hd = P.hairD, Hh = P.hairHi;
      const O = P.O;
      const [legA, legB] = legOffsets(frame);

      // Thick dark hair — full coverage, slightly poofed
      row(0, [4, O], [5, Hd], [6, Hr], [7, Hr], [8, Hr], [9, Hr], [10, Hd], [11, O]);
      row(1, [3, O], [4, Hd], [5, Hr], [6, Hr], [7, Hh], [8, Hr], [9, Hr], [10, Hr], [11, Hd], [12, O]);
      row(2, [3, Hd], [4, Hr], [5, Hr], [6, Hr], [7, Hr], [8, Hr], [9, Hr], [10, Hr], [11, Hr], [12, Hd]);
      // Forehead under thick fringe
      row(3, [2, O], [3, Hr], [4, Hr], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Hr], [11, Hr], [12, O]);
      // Brows
      row(4, [2, O], [3, Hd], [4, Sk], [5, P.glass], [6, P.glass], [7, Sk], [8, P.glass], [9, P.glass], [10, Sk], [11, Hd], [12, O]);
      // Glasses frame top + eyes
      row(5, [2, O], [3, Sk], [4, P.glass], [5, P.lens], [6, P.lens], [7, P.glass], [8, P.lens], [9, P.lens], [10, P.glass], [11, Sk], [12, O]);
      // Eyes inside lenses + glasses bridge
      row(6, [2, Ss], [3, Sk], [4, P.glass], [5, P.eyeP], [6, P.lens], [7, P.glass], [8, P.lens], [9, P.eyeP], [10, P.glass], [11, Sk], [12, Ss]);
      // Glasses bottom + BIG nose protruding
      row(7, [2, O], [3, Sk], [4, P.glass], [5, P.glass], [6, Sk], [7, Ss], [8, Sk], [9, P.glass], [10, P.glass], [11, Sk], [12, O]);
      // Big nose continues — bridge wider
      row(8, [3, O], [4, Sk], [5, Sk], [6, Ss], [7, Sk], [8, Ss], [9, Sk], [10, Sk], [11, O]);
      row(9, [3, O], [4, Sk], [5, Sk], [6, Sk], [7, P.mouth], [8, Sk], [9, Sk], [10, Sk], [11, O]);
      // Chin / neck
      row(10, [4, O], [5, Ss], [6, Sk], [7, Sk], [8, Sk], [9, Ss], [10, O]);

      // Brown suit coat with white shirt + brown tie peeking
      const C = P.coat, Cs = P.coatShad, Ch = P.coatHi;
      const W = P.shirt, T = P.tie, Th = P.tieHi;
      row(11, [2, O], [3, Cs], [4, C], [5, W], [6, T], [7, T], [8, W], [9, C], [10, Cs], [11, O]);
      row(12, [1, O], [2, Cs], [3, C], [4, Ch], [5, W], [6, Th], [7, T], [8, W], [9, C], [10, C], [11, Cs], [12, O]);
      row(13, [1, O], [2, C], [3, C], [4, C], [5, W], [6, T], [7, T], [8, W], [9, C], [10, C], [11, Cs], [12, O]);
      row(14, [0, O], [1, Cs], [2, C], [3, C], [4, C], [5, T], [6, Th], [7, T], [8, C], [9, C], [10, C], [11, Cs], [12, O]);
      row(15, [0, O], [1, C], [2, C], [3, C], [4, C], [5, C], [6, T], [7, C], [8, C], [9, C], [10, C], [11, Cs], [12, O]);
      // Belt under coat
      row(16, [2, O], [3, P.pantsShad], [4, P.pants], [5, P.pants], [6, P.pantsShad], [7, P.pants], [8, P.pants], [9, P.pantsShad], [10, O]);

      // Khaki pants
      const K = P.pants, Ks = P.pantsShad, Kh = P.pantsHi;
      const ll = 17 + legA, rl = 17 + legB;
      row(Math.max(17, ll), [3, O], [4, Kh], [5, K], [6, O]);
      row(Math.max(18, ll + 1), [3, K], [4, Ks], [5, K], [6, O]);
      row(Math.max(19, ll + 2), [3, K], [4, Ks], [5, Kh], [6, O]);
      row(Math.max(17, rl), [7, O], [8, Kh], [9, K], [10, O]);
      row(Math.max(18, rl + 1), [7, K], [8, Ks], [9, K], [10, O]);
      row(Math.max(19, rl + 2), [7, K], [8, Ks], [9, Kh], [10, O]);

      const sl = 20 + legA, sr = 20 + legB;
      row(Math.min(20, sl), [3, O], [4, P.shoe], [5, P.shoe], [6, O]);
      row(Math.min(21, sl + 1), [2, O], [3, P.shoeS], [4, P.shoe], [5, P.shoe], [6, P.shoeS], [7, O]);
      row(Math.min(20, sr), [7, O], [8, P.shoe], [9, P.shoe], [10, O]);
      row(Math.min(21, sr + 1), [6, O], [7, P.shoeS], [8, P.shoe], [9, P.shoe], [10, P.shoeS], [11, O]);
    });
  }

  // ───────────────────────────────────────────────
  // QUITTAKER — long blonde hair, big-toothed grin, big eyes, big nose
  // Outfit: simple top, dark skirt
  // ───────────────────────────────────────────────
  const QUIT = {
    skin: '#f8d4b0', skinShad: '#d8a070', skinHi: '#fce0c0',
    hair: '#e8c050', hairD: '#a87820', hairHi: '#fce070',
    top: '#a02050', topShad: '#701030', topHi: '#c83870',
    skirt: '#3a2a4a', skirtShad: '#201428', skirtHi: '#5a4070',
    leg: '#f0c898',
    shoe: '#2a1a0a', shoeS: '#1a0f05',
    eyeP: '#1a1a1a', eyeW: '#ffffff',
    teeth: '#fff8e0', teethShad: '#d8c8a0', toothLine: '#1a1208',
    mouth: '#1a0a08', lipPink: '#e08090',
    O: '#100800',
  };

  function drawQuittaker(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    spriteWrap(ctx, ox, oy, facing, ps, (row) => {
      const P = QUIT;
      const Sk = P.skin, Ss = P.skinShad;
      const Hr = P.hair, Hd = P.hairD, Hh = P.hairHi;
      const O = P.O;
      const [legA, legB] = legOffsets(frame);

      // Long blonde hair — frames the head, falls past shoulders
      row(0, [4, O], [5, Hd], [6, Hr], [7, Hh], [8, Hh], [9, Hr], [10, Hd], [11, O]);
      row(1, [3, O], [4, Hd], [5, Hr], [6, Hh], [7, Hh], [8, Hh], [9, Hr], [10, Hr], [11, Hd], [12, O]);
      row(2, [2, O], [3, Hd], [4, Hr], [5, Hr], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Hr], [11, Hr], [12, Hd], [13, O]);
      row(3, [2, Hd], [3, Hr], [4, Hr], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Sk], [11, Hr], [12, Hr], [13, Hd]);
      // Big eyes — wide and round
      row(4, [2, Hr], [3, Hr], [4, Sk], [5, P.eyeW], [6, P.eyeW], [7, Sk], [8, P.eyeW], [9, P.eyeW], [10, Sk], [11, Hr], [12, Hr]);
      row(5, [2, Hr], [3, Hr], [4, Sk], [5, P.eyeP], [6, P.eyeW], [7, Sk], [8, P.eyeP], [9, P.eyeW], [10, Sk], [11, Hr], [12, Hr]);
      // Big nose
      row(6, [2, Hr], [3, Sk], [4, Sk], [5, Sk], [6, Ss], [7, Ss], [8, Sk], [9, Sk], [10, Sk], [11, Sk], [12, Hr]);
      row(7, [2, Hr], [3, Sk], [4, Sk], [5, Sk], [6, Sk], [7, Ss], [8, Sk], [9, Sk], [10, Sk], [11, Sk], [12, Hr]);
      // Mouth WIDE OPEN with all teeth showing
      row(8, [2, Hr], [3, Sk], [4, P.lipPink], [5, P.toothLine], [6, P.toothLine], [7, P.toothLine], [8, P.toothLine], [9, P.toothLine], [10, P.lipPink], [11, Sk], [12, Hr]);
      row(9, [2, Hr], [3, Sk], [4, P.lipPink], [5, P.teeth], [6, P.teeth], [7, P.teeth], [8, P.teeth], [9, P.teeth], [10, P.lipPink], [11, Sk], [12, Hr]);
      // Tooth gaps drawn as vertical lines
      row(10, [2, Hr], [3, Sk], [4, P.lipPink], [5, P.toothLine], [6, P.teeth], [7, P.toothLine], [8, P.teeth], [9, P.toothLine], [10, P.lipPink], [11, Sk], [12, Hr]);
      // Chin
      row(11, [2, Hr], [3, Hr], [4, Sk], [5, P.lipPink], [6, P.lipPink], [7, P.lipPink], [8, P.lipPink], [9, P.lipPink], [10, Sk], [11, Hr], [12, Hr]);
      // Hair flowing past shoulders
      row(12, [1, O], [2, Hr], [3, Hr], [4, Ss], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Ss], [11, Hr], [12, Hr], [13, O]);

      // Top (magenta-ish)
      const T = P.top, Ts = P.topShad, Th = P.topHi;
      row(13, [1, O], [2, Hr], [3, T], [4, T], [5, T], [6, Th], [7, T], [8, T], [9, T], [10, T], [11, Hr], [12, O]);
      row(14, [0, O], [1, Hr], [2, T], [3, T], [4, T], [5, T], [6, T], [7, Th], [8, T], [9, T], [10, T], [11, Ts], [12, Hr], [13, O]);
      row(15, [0, O], [1, Ss], [2, T], [3, T], [4, T], [5, T], [6, T], [7, T], [8, T], [9, T], [10, Ts], [11, Ts], [12, O]);

      // Skirt
      const Sk2 = P.skirt, Sks = P.skirtShad, Skh = P.skirtHi;
      row(16, [1, O], [2, Sks], [3, Sk2], [4, Sk2], [5, Skh], [6, Sk2], [7, Sk2], [8, Skh], [9, Sk2], [10, Sk2], [11, Sks], [12, O]);

      // Bare legs
      const L = P.leg, Ls = P.skinShad;
      const ll = 17 + legA, rl = 17 + legB;
      row(Math.max(17, ll), [3, O], [4, L], [5, L], [6, O]);
      row(Math.max(18, ll + 1), [3, L], [4, Ls], [5, L], [6, O]);
      row(Math.max(19, ll + 2), [3, L], [4, Ls], [5, L], [6, O]);
      row(Math.max(17, rl), [9, O], [10, L], [11, L], [12, O]);
      row(Math.max(18, rl + 1), [9, L], [10, Ls], [11, L], [12, O]);
      row(Math.max(19, rl + 2), [9, L], [10, Ls], [11, L], [12, O]);

      // Flat shoes
      const sl = 20 + legA, sr = 20 + legB;
      row(Math.min(20, sl), [3, O], [4, P.shoe], [5, P.shoe], [6, O]);
      row(Math.min(21, sl + 1), [2, O], [3, P.shoeS], [4, P.shoe], [5, P.shoe], [6, P.shoeS], [7, O]);
      row(Math.min(20, sr), [9, O], [10, P.shoe], [11, P.shoe], [12, O]);
      row(Math.min(21, sr + 1), [8, O], [9, P.shoeS], [10, P.shoe], [11, P.shoe], [12, P.shoeS], [13, O]);
    });
  }

  // ───────────────────────────────────────────────
  // CHONKERSMITH — old lady, circle glasses, oval body, gray thin hair
  // Lavender/floral house dress
  // ───────────────────────────────────────────────
  const CHONK = {
    skin: '#e8c8b0', skinShad: '#b8907c', skinHi: '#f0d8c0',
    wrinkle: '#9a7060',
    hair: '#b8b8b8', hairD: '#787878', hairHi: '#e0e0e0',
    dress: '#8870a8', dressShad: '#5a4880', dressHi: '#a890c8',
    flower: '#e8c050', flower2: '#c83870',
    leg: '#e8c8b0',
    shoe: '#3a1a18', shoeS: '#200a08',
    glass: '#3a2a18', lens: '#c0d8e0',
    eyeP: '#202020', mouth: '#9a5848',
    O: '#100800',
  };

  function drawChonkerSmith(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    spriteWrap(ctx, ox, oy, facing, ps, (row) => {
      const P = CHONK;
      const Sk = P.skin, Ss = P.skinShad, Sh = P.skinHi;
      const Hr = P.hair, Hd = P.hairD, Hh = P.hairHi;
      const O = P.O;
      const [legA, legB] = legOffsets(frame);

      // Thin gray hair — short medium length, you can see scalp through
      row(0, [5, O], [6, Hd], [7, Hr], [8, Hr], [9, Hd], [10, O]);
      row(1, [4, O], [5, Hd], [6, Hr], [7, Hh], [8, Hr], [9, Hr], [10, Hd], [11, O]);
      row(2, [4, Hd], [5, Hr], [6, Sk], [7, Hr], [8, Hr], [9, Sk], [10, Hr], [11, Hd]);
      // Forehead with wrinkle
      row(3, [3, O], [4, Hd], [5, Sk], [6, P.wrinkle], [7, Sk], [8, Sk], [9, P.wrinkle], [10, Sk], [11, Hd], [12, O]);
      // Eyebrows + temples
      row(4, [3, Hd], [4, Sk], [5, Sk], [6, P.glass], [7, P.glass], [8, Sk], [9, P.glass], [10, P.glass], [11, Sk], [12, Hd]);
      // CIRCLE GLASSES — top arc + eyes
      row(5, [3, Hd], [4, P.glass], [5, P.lens], [6, P.eyeP], [7, P.glass], [8, P.glass], [9, P.eyeP], [10, P.lens], [11, P.glass], [12, Hd]);
      row(6, [2, O], [3, P.glass], [4, P.lens], [5, P.lens], [6, P.glass], [7, Ss], [8, P.glass], [9, P.lens], [10, P.lens], [11, P.glass], [12, O]);
      row(7, [3, P.glass], [4, P.lens], [5, P.glass], [6, Sk], [7, Sk], [8, Sk], [9, P.glass], [10, P.lens], [11, P.glass]);
      // Cheeks, faint nose
      row(8, [3, O], [4, P.glass], [5, P.glass], [6, Sk], [7, Ss], [8, Sk], [9, P.glass], [10, P.glass], [11, O]);
      // Mouth (small, set)
      row(9, [3, O], [4, Ss], [5, Sk], [6, P.mouth], [7, P.mouth], [8, P.mouth], [9, Sk], [10, Ss], [11, O]);
      // Chin / neck
      row(10, [4, O], [5, Ss], [6, Sk], [7, Sk], [8, Sk], [9, Ss], [10, O]);

      // OVAL VERY FAT BODY — bulges out wide on rows 11–15
      const D = P.dress, Ds = P.dressShad, Dh = P.dressHi;
      row(11, [2, O], [3, Ds], [4, D], [5, Dh], [6, D], [7, D], [8, D], [9, D], [10, Ds], [11, O]);
      row(12, [0, O], [1, Ds], [2, D], [3, D], [4, D], [5, D], [6, P.flower], [7, D], [8, D], [9, D], [10, D], [11, Ds], [12, O]);
      row(13, [0, Ds], [1, D], [2, D], [3, D], [4, P.flower2], [5, D], [6, D], [7, D], [8, P.flower], [9, D], [10, D], [11, D], [12, Ds]);
      row(14, [0, D], [1, D], [2, D], [3, D], [4, D], [5, D], [6, D], [7, D], [8, D], [9, D], [10, D], [11, D], [12, Ds]);
      row(15, [0, Ds], [1, D], [2, D], [3, D], [4, D], [5, P.flower], [6, D], [7, D], [8, D], [9, P.flower2], [10, D], [11, D], [12, Ds]);
      row(16, [1, O], [2, Ds], [3, D], [4, D], [5, D], [6, D], [7, Dh], [8, D], [9, D], [10, D], [11, Ds], [12, O]);

      // Stocky legs
      const L = P.leg, Ls = P.skinShad;
      const ll = 17 + legA, rl = 17 + legB;
      row(Math.max(17, ll), [3, O], [4, L], [5, L], [6, O]);
      row(Math.max(18, ll + 1), [3, L], [4, Ls], [5, L], [6, O]);
      row(Math.max(19, ll + 2), [3, L], [4, Ls], [5, L], [6, O]);
      row(Math.max(17, rl), [9, O], [10, L], [11, L], [12, O]);
      row(Math.max(18, rl + 1), [9, L], [10, Ls], [11, L], [12, O]);
      row(Math.max(19, rl + 2), [9, L], [10, Ls], [11, L], [12, O]);

      // Old-lady shoes
      const sl = 20 + legA, sr = 20 + legB;
      row(Math.min(20, sl), [3, O], [4, P.shoe], [5, P.shoe], [6, O]);
      row(Math.min(21, sl + 1), [2, O], [3, P.shoeS], [4, P.shoe], [5, P.shoe], [6, P.shoeS], [7, O]);
      row(Math.min(20, sr), [9, O], [10, P.shoe], [11, P.shoe], [12, O]);
      row(Math.min(21, sr + 1), [8, O], [9, P.shoeS], [10, P.shoe], [11, P.shoe], [12, P.shoeS], [13, O]);
    });
  }

  // ───────────────────────────────────────────────
  // HERBERT — oval body, squinted eyes, pointy nose, thin blonde hair
  // White shirt + RED tie, blue dress pants
  // ───────────────────────────────────────────────
  const HERB = {
    skin: '#f0c8a0', skinShad: '#c89058', skinHi: '#f8d8b0',
    hair: '#e8c860', hairD: '#a88820', hairHi: '#fce080',
    shirt: '#f0f0f0', shirtShad: '#c8c8c8', shirtHi: '#ffffff',
    tie: '#cc2030', tieHi: '#e85058', tieShad: '#801018',
    pants: '#3050a0', pantsShad: '#1a3070', pantsHi: '#5070c0',
    shoe: '#1a1208', shoeS: '#0a0604',
    brow: '#a88820', mouth: '#9a5848',
    O: '#100800',
  };

  function drawHerbert(ctx, ox, oy, frame, facing, stunned, pixelSize) {
    const ps = pixelSize || 2;
    spriteWrap(ctx, ox, oy, facing, ps, (row) => {
      const P = HERB;
      const Sk = P.skin, Ss = P.skinShad, Sh = P.skinHi;
      const Hr = P.hair, Hd = P.hairD, Hh = P.hairHi;
      const O = P.O;
      const [legA, legB] = legOffsets(frame);

      // Thin blonde hair on top — sparse, more skin showing
      row(0, [6, O], [7, Hd], [8, Hr], [9, Hd], [10, O]);
      row(1, [5, O], [6, Hd], [7, Hr], [8, Hh], [9, Hr], [10, Hd], [11, O]);
      row(2, [4, O], [5, Sk], [6, Hr], [7, Sk], [8, Hr], [9, Sk], [10, Hr], [11, Sk], [12, O]);
      row(3, [4, O], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Sk], [11, Sk], [12, O]);
      // Brows
      row(4, [3, O], [4, Sk], [5, P.brow], [6, P.brow], [7, Sk], [8, P.brow], [9, P.brow], [10, Sk], [11, Sk], [12, O]);
      // SQUINTED eyes — just horizontal lines
      row(5, [3, O], [4, Sk], [5, P.O], [6, P.O], [7, Sk], [8, P.O], [9, P.O], [10, Sk], [11, Sk], [12, O]);
      // Pointy nose - protrudes more on one side
      row(6, [3, O], [4, Ss], [5, Sk], [6, Sk], [7, Sk], [8, Sk], [9, Sk], [10, Sk], [11, Ss], [12, O]);
      row(7, [3, O], [4, Ss], [5, Sk], [6, Sk], [7, Ss], [8, Ss], [9, Sk], [10, Sk], [11, Ss], [12, O]);
      row(8, [3, O], [4, Ss], [5, Sk], [6, Sk], [7, Sk], [8, P.mouth], [9, P.mouth], [10, Sk], [11, Sk], [12, Ss], [13, O]);
      // Chin
      row(9, [4, O], [5, Ss], [6, Sk], [7, P.shirtHi], [8, P.tie], [9, P.shirtHi], [10, Sk], [11, Ss], [12, O]);

      // Oval body — wider in middle (chunky, oval shape)
      const W = P.shirt, Ws = P.shirtShad, Wh = P.shirtHi;
      const T = P.tie, Th = P.tieHi, Td = P.tieShad;
      row(10, [3, O], [4, Wh], [5, W], [6, W], [7, T], [8, Th], [9, T], [10, W], [11, W], [12, Ws], [13, O]);
      row(11, [2, O], [3, Wh], [4, W], [5, W], [6, W], [7, Td], [8, T], [9, T], [10, W], [11, W], [12, Ws], [13, O]);
      // Body bulges wider rows 12–14 (oval)
      row(12, [1, O], [2, Wh], [3, W], [4, W], [5, W], [6, W], [7, T], [8, T], [9, W], [10, W], [11, W], [12, Ws], [13, O]);
      row(13, [1, O], [2, W], [3, W], [4, W], [5, W], [6, W], [7, Td], [8, T], [9, W], [10, W], [11, W], [12, Ws], [13, O]);
      row(14, [1, O], [2, W], [3, W], [4, W], [5, W], [6, W], [7, T], [8, T], [9, W], [10, W], [11, W], [12, Ws], [13, O]);
      row(15, [2, O], [3, W], [4, W], [5, W], [6, W], [7, W], [8, W], [9, W], [10, W], [11, W], [12, Ws], [13, O]);
      // Belt
      row(16, [2, O], [3, P.pantsShad], [4, P.pants], [5, P.pants], [6, P.pantsShad], [7, P.pants], [8, P.pants], [9, P.pants], [10, P.pantsShad], [11, P.pants], [12, P.pants], [13, O]);

      // Blue dress pants
      const K = P.pants, Ks = P.pantsShad, Kh = P.pantsHi;
      const ll = 17 + legA, rl = 17 + legB;
      row(Math.max(17, ll), [3, O], [4, Kh], [5, K], [6, P.O]);
      row(Math.max(18, ll + 1), [3, K], [4, Ks], [5, K], [6, O]);
      row(Math.max(19, ll + 2), [3, K], [4, Ks], [5, Kh], [6, O]);
      row(Math.max(17, rl), [9, O], [10, Kh], [11, K], [12, O]);
      row(Math.max(18, rl + 1), [9, K], [10, Ks], [11, K], [12, O]);
      row(Math.max(19, rl + 2), [9, K], [10, Ks], [11, Kh], [12, O]);

      const sl = 20 + legA, sr = 20 + legB;
      row(Math.min(20, sl), [3, O], [4, P.shoe], [5, P.shoe], [6, O]);
      row(Math.min(21, sl + 1), [2, O], [3, P.shoeS], [4, P.shoe], [5, P.shoe], [6, P.shoeS], [7, O]);
      row(Math.min(20, sr), [9, O], [10, P.shoe], [11, P.shoe], [12, O]);
      row(Math.min(21, sr + 1), [8, O], [9, P.shoeS], [10, P.shoe], [11, P.shoe], [12, P.shoeS], [13, O]);
    });
  }

  window.VILLAIN_SPRITES = {
    bigw: { name: 'BIG W',          draw: drawBigW,         desc: 'egg-headed exec' },
    wingman: { name: 'WINGMAN',     draw: drawWingman,      desc: 'glasses, brown suit' },
    quitaker: { name: 'QUITAKER', draw: drawQuittaker,    desc: 'big-toothed grin' },
    chonkersmith: { name: 'CHONKERSMITH', draw: drawChonkerSmith, desc: 'old lady, oval' },
    herbert: { name: 'HERBERT',     draw: drawHerbert,      desc: 'squinty, red tie' },
  };
})();
