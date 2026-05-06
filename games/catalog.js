// Official level catalog.
// Each entry matches the LEVEL_CATALOG schema in index.html plus a `map` field
// containing the full map-builder JSON. Loaded before index.html's main script
// so LEVEL_CATALOG can spread it at parse time.

window.GAME_CATALOG = [
  {
    code:          'SCH001',
    name:          'School Hallway',
    author:        'CW Team',
    best:          null,
    diff:          2,
    plays:         0,
    theme:         'hallway',
    cat:           'system',
    featured:      true,
    chandlerSpeed: 75,
    map:           buildSchoolHallway(),
  },
];

// ─── Map builders ───────────────────────────────────────────────────────────
// Each function returns a map-builder v1 JSON object.

function buildSchoolHallway() {
  const COLS = 22, ROWS = 14;

  // Helpers
  function makeCell(bg, borders, object, rotation, special) {
    return {
      background: bg,
      borders: { n: !!borders.n, s: !!borders.s, e: !!borders.e, w: !!borders.w },
      object: object || null,
      rotation: rotation || 0,
      special: special || null,
    };
  }

  const cells = {};

  // Fill every cell with hallway, auto-set outer borders
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells[`${c},${r}`] = makeCell(
        'hallway',
        { n: r === 0, s: r === ROWS - 1, w: c === 0, e: c === COLS - 1 },
      );
    }
  }

  // Top classroom zone: rows 0–3 → classroom background
  for (let r = 0; r <= 3; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      cells[`${c},${r}`].background = 'classroom';
    }
  }

  // Bottom classroom zone: rows 10–13 → classroom background
  for (let r = 10; r <= ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      cells[`${c},${r}`].background = 'classroom';
    }
  }

  // Corridor walls between classrooms and hallway (rows 4/5 boundary and 8/9 boundary)
  // Gaps at cols 5–6, 11–12, 17–18 for cross-access
  const gapCols = new Set([5, 6, 11, 12, 17, 18]);

  for (let c = 1; c < COLS - 1; c++) {
    if (!gapCols.has(c)) {
      cells[`${c},4`].borders.s  = true;
      cells[`${c},5`].borders.n  = true;
      cells[`${c},8`].borders.s  = true;
      cells[`${c},9`].borders.n  = true;
    }
  }

  // Desks in top classrooms (rows 1–2)
  for (let c = 2; c < COLS - 2; c += 4) {
    cells[`${c},2`].object   = 'desk';
    cells[`${c},2`].rotation = 0;   // face south toward corridor
  }

  // Desks in bottom classrooms (rows 11–12)
  for (let c = 2; c < COLS - 2; c += 4) {
    cells[`${c},11`].object   = 'desk';
    cells[`${c},11`].rotation = 180; // face north toward corridor
  }

  // Lockers along corridor wall cells (north face of row 5, south face of row 8)
  for (let c = 1; c < COLS - 1; c += 3) {
    if (!gapCols.has(c)) {
      cells[`${c},5`].object   = 'locker';
      cells[`${c},5`].rotation = 0;   // strip at top of cell (faces into corridor from north wall)
      cells[`${c},8`].object   = 'locker';
      cells[`${c},8`].rotation = 180; // strip at bottom of cell (faces into corridor from south wall)
    }
  }

  // Chairs scattered through the main corridor (rows 6–7)
  const chairCols = [3, 7, 10, 14, 19];
  for (const c of chairCols) {
    const r = (c % 2 === 0) ? 6 : 7;
    cells[`${c},${r}`].object = 'pushable';
  }

  // Specials
  cells['1,12'].special  = 'player';
  cells['20,1'].special  = 'exit';
  cells['20,12'].special = 'villain';

  // Pickups in the corridor
  cells['5,6'].special  = 'pickup_gel';
  cells['11,7'].special = 'pickup_mirror';
  cells['16,6'].special = 'pickup_spray';

  return {
    version:     1,
    playerStart: [1, 12],
    exit:        [20, 1],
    villain:     [20, 12],
    pickups: {
      gel:    [5,  6],
      mirror: [11, 7],
      spray:  [16, 6],
    },
    cells,
  };
}
