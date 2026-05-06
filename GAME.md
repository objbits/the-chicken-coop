# Chandler's World — Game Design & Technical Reference

## Story
Jax is a student trying to escape the school grounds before the villain **Chandler** catches him. Jax must navigate five different school locations and reach the exit in each one. Escape time is accumulated across all five levels. The player with the lowest cumulative time earns a spot on the leaderboard.

---

## Game States

The game runs a single `requestAnimationFrame` loop and switches between these states stored in `gameState`:

| State | Description |
|-------|-------------|
| `menu` | Title screen with Play and Leaderboard buttons |
| `playing` | Active gameplay — Jax moves, Chandler chases, timer runs |
| `level_complete` | Overlay shown after reaching the exit (not the last level) |
| `game_over` | Chandler caught Jax — shows time and retry options |
| `win` | All 5 levels complete — shows split times and name entry |
| `leaderboard` | Top 10 scores sorted by total time |

---

## Player (Jax)

- Represented as a **28×28 square** labeled `JAX`
- **Movement:** Jax continuously follows the mouse cursor at all times — no button required
- Speed base: **220 px/s** (modified by buffs and mud zones)
- Constrained to map boundaries via clamping + wall collision resolution
- **Color changes** reflect current state:

| Color | Meaning |
|-------|---------|
| Blue `#4dabf7` | Normal |
| Yellow `#f0c040` | In a mud zone (slowed by object) |
| Green `#00ff88` | `speed_up` buff active |
| Orange `#ff8800` | `speed_down` buff active |
| Pink `#ff6688` | `push` buff active (knockback) |

---

## Villain (Chandler)

- Represented as a **34×34 red square** labeled `CHANDLER`
- Straight-line chase AI: moves directly toward Jax's center every frame
- Blocked by `wall` and `pushable` objects (collision resolution, no push applied)
- Not slowed by `mud` objects
- Not affected by Jax's buffs
- Collision with Jax → **Game Over**
- Speed increases each level (see Level Configs)

> **Known limitation:** Chandler slides along walls but does not path-find around them. A* or similar pathfinding is planned.

---

## Level Configs

| # | Name | Map Size | Player Start | Exit Position | Chandler Start | Chandler Speed |
|---|------|----------|-------------|---------------|----------------|----------------|
| 1 | School Hallway | 3200 × 2400 | (160, 2100) | (3060, 200) | (160, 200) | 75 px/s |
| 2 | Playground | 2800 × 2800 | (160, 2550) | (2620, 160) | (2620, 2550) | 105 px/s |
| 3 | Cafeteria | 2600 × 2600 | (160, 400) | (2420, 2420) | (1260, 1260) | 135 px/s |
| 4 | The Office | 2800 × 3200 | (250, 1700) | (2610, 1560) | (1380, 200) | 165 px/s |
| 5 | Baseball Field | 3600 × 3600 | (200, 3300) | (3400, 200) | (1800, 1800) | 198 px/s |

Player speed is a constant **220 px/s** (before buffs/mud). On Level 5 Chandler reaches 198 px/s — nearly as fast as Jax, leaving very little margin.

---

## Exit

- A pulsing **90×90 green square** labeled `EXIT`, positioned per level config
- Pulses via `Math.sin(exitPulse)` applied to `shadowBlur`
- When Jax's bounding box overlaps the exit:
  - Level time is saved to `levelTimes[]` and added to `totalTime`
  - If levels remain → `level_complete` state
  - If all 5 done → `win` state
- **Compass arrow:** When the exit is off-screen, a directional arrow appears in the top-right HUD corner pointing toward it

---

## Timer & Leaderboard

- `levelTime` resets at the start of each level
- `totalTime` accumulates across all levels
- Both are shown live in the HUD: `This level: Xs  Total: Ys`
- After completing all 5 levels: player types a name (up to 16 characters, keyboard input)
- Scores saved to `localStorage` key `cw_lb` — top 10 kept, sorted ascending by total time
- Leaderboard accessible from the main menu at any time

---

## Map Themes

Each level has a hand-drawn static background rendered with Canvas 2D. Grid tile backgrounds are generated once via offscreen canvas and cached as `CanvasPattern`.

### Level 1 — School Hallway (3200 × 2400)
- Tiled tan floor with main horizontal corridor and four vertical cross-corridors
- Classroom outlines drawn every 400px above and below the corridor
- Locker strips along corridor edges, classroom doors marked
- **Inner walls active:** Corridor top and bottom walls with gaps at each cross-corridor (x: 430–570, 1030–1170, 1630–1770, 2230–2370) — forces Jax and Chandler to navigate through corridor gaps

### Level 2 — Playground (2800 × 2800)
- Grass field with central asphalt sport court (basketball court lines, center circle)
- Sandbox areas in two corners, playground equipment outlines (slide, merry-go-round)
- Chain-link fence border with post details

### Level 3 — Cafeteria (2600 × 2600)
- Tiled cream floor with serving counter along the top (with sneeze guard and food blobs)
- Four rows of tables with benches above and below each
- Player spawns below the serving counter (y=400) to avoid counter overlap

### Level 4 — The Office (2800 × 3200)
- Carpet-textured floor with a central hallway (220px wide)
- Reception desk at top center
- Five office rooms on each side with drawn desks, shelves, and door gaps

### Level 5 — Baseball Field (3600 × 3600)
- Outfield grass with warning track dirt arc
- Full infield: dirt circle, grass diamond, all four bases, home plate, pitcher's mound
- Foul lines extending to corners, outfield fence border

---

## Object System

Every entry in `levelObjects` has a `kind` field that controls physics and collision behavior. The array is populated at `startLevel()` and contains both wall definitions and dynamic objects.

### Kinds

| Kind | Passable | Blocks Jax | Blocks Chandler | Jax Can Push | Notes |
|------|----------|------------|-----------------|--------------|-------|
| `wall` | No | Yes | Yes | No | Immovable |
| `mud` | Yes | No | No | No | Slows Jax by `speedMult` |
| `pushable` | No | Yes | Yes | Yes | Slides with momentum |

### Per-Level Object Assignments

| Level | Object | Kind | Effect |
|-------|--------|------|--------|
| 1 — Hallway | Chairs | `pushable` | Jax shoves chairs aside |
| 2 — Playground | Basketballs, soccer balls | `pushable` | Balls roll when hit |
| 3 — Cafeteria | Food trays | `mud` | Slippery floor, 38% speed |
| 4 — Office | Cardboard boxes | `wall` | Immovable filing boxes |
| 4 — Office | Office chairs | `pushable` | Chairs roll aside |
| 5 — Baseball | Baseballs | `mud` | 52% speed (small, scattered) |
| 5 — Baseball | Equipment bags | `pushable` | Bags slide along baseline |

Objects are randomly placed within their designated zones each playthrough. A 140px clear zone around the player spawn and a 90px clear zone around the exit are enforced.

---

## Wall System

Walls are rectangular collision objects (`kind: 'wall'`) included in `levelObjects`.

### Outer Border Walls
All five levels have four invisible border walls (14px thick) along each map edge. These are invisible (`visible: false`) since the map visuals already draw borders.

### Inner Walls
Inner walls are visible (`visible: true`) and drawn as solid rectangles with a dark stroke.

**Level 1 only** currently has inner walls — corridor walls that create the hallway:
- Top corridor wall: `y = midY - 180`, broken into segments with 140px gaps at each cross-corridor
- Bottom corridor wall: `y = midY + 166`, same gap pattern
- This forces Jax (and Chandler) to use corridor gaps to move between the top and bottom halves of the map

Levels 2–5 have outer walls only. Inner wall layouts are planned per map design session.

---

## Collision Resolution

### AABB Resolution (`resolveAABB`)
Standard axis-aligned bounding box push-out: finds the axis of minimum overlap and displaces the entity along that axis only.

### Player vs Solids
Runs **3 passes** per frame against all `wall` and `pushable` objects to handle corner cases. On each pass:
1. Resolve position out of the solid
2. If `pushable`: apply push force (280 px/s) to the object in the direction from player center → object center

### Chandler vs Solids
Runs **2 passes** per frame. Resolves against `wall` and `pushable` objects but does **not** apply push force.

### Mud Detection
Checked once per frame. If Jax overlaps any `mud` object, the `speedMult` from that object is applied to movement. Only the most restrictive (lowest) multiplier is used if multiple overlap.

---

## Pushable Physics

When Jax pushes a `pushable` object it receives an initial velocity of **280 px/s** in the push direction. Each frame:

1. Position updated by `vx * dt`, `vy * dt`
2. Clamped to map bounds (respecting border wall thickness)
3. Exponential drag applied: `v *= Math.exp(-5 * dt)` — object stops in ~1–2 seconds
4. Velocity zeroed when below 2 px/s
5. Resolves against `wall` objects and stops velocity on the colliding axis

---

## Buff System

Buffs are **Jax-only** timed effects stored in `activeBuffs[]`. Each buff has a type, remaining duration, and optional parameters.

### Defined Buffs

| Type | Label | Effect | Default Duration |
|------|-------|--------|-----------------|
| `speed_up` | SPEED UP! | Multiplies movement speed by 1.8× | 5 seconds |
| `speed_down` | SLOWED | Multiplies movement speed by 0.4× | 5 seconds |
| `push` | PUSHED! | Applies directional velocity `{ vx, vy }` that decays over duration | 2 seconds |

Multiple buffs stack multiplicatively for speed. Push velocity decays via the same exponential drag as pushable objects.

### API

```javascript
applyBuff('speed_up')                    // speed boost
applyBuff('speed_down')                  // slow debuff
applyBuff('push', { vx: 300, vy: -200 }) // knockback in direction
```

Applying a buff of a type that's already active replaces it (resets duration). Adding new buff types requires an entry in `BUFF_DEFS` and handling in `buffSpeedMult()` or `buffPushVec()`.

### HUD Display
Active buffs appear as labeled progress bars below the main HUD panel. Bar width represents remaining duration.

### Buff Triggers
- **Pickups** (see below) are the primary trigger — Jax overlaps a pickup, pickup applies its buff, pickup is consumed
- Planned: secondary villain collisions → apply `speed_down` or `push`

---

## Pickups

Pickups are hair-salon-themed items scattered across each map. When Jax's bounding box overlaps a pickup, the pickup is consumed and applies its effect. They're the primary trigger for the buff system and add risk/reward routing — detour for an advantage or rush straight for the exit.

### Pickup Types

| Item | Sprite | Effect | Strategic Use |
|------|--------|--------|---------------|
| Hair Gel | Yellow tube, ~22×22 | Applies `speed_up` (5s) | Slip past Chandler when cornered |
| Hand Mirror | Silver disc, ~24×24 | Freezes Chandler for 2s (`chandler_stun`) | Best used when Chandler is on a direct line — buys distance |
| Hairspray | Silver can, ~22×26 | Applies `push` *away from Chandler* (auto-aimed) | Emergency button — knock Jax to safety |

### Placement Rules
- 3–6 pickups per level, randomly placed each playthrough
- Stored in `levelObjects` with `kind: 'pickup'` and a `pickupType` field
- Passable to all entities (do not block movement) — only AABB overlap with Jax triggers them
- Reuses `tooClose()` for player spawn (140px) and exit (90px) clearance
- Additional 200px clear zone around Chandler's spawn so a pickup never sits under him at level start
- Mirror is rarer (1 per level max) since the stun is the strongest effect

### Consumption
- Overlap check runs once per frame in `update()`, after Jax movement and before the catch check
- On overlap: invoke the pickup's effect, splice the entry out of `levelObjects`
- Pickups pulse via the existing `exitPulse` value (subtle scale + glow)

### New State: Chandler Stun
- Add `chandlerStun` (seconds remaining, default `0`) to game state
- When `chandlerStun > 0`: skip Chandler's chase movement (collision resolution still runs, so Jax can't push through him)
- Decremented each frame; cleared in `startLevel()`
- Visual: Chandler's red square dims to `#aa3036` and shows a `STUNNED` label in place of his name

### HUD Indication
- Active `chandler_stun` shows as a yellow countdown bar above Chandler's sprite
- Off-screen pickups within 400px of Jax flash a small icon at the bottom HUD edge so the player knows one is near

### Code Hooks
- `PICKUP_DEFS` table (parallel to `BUFF_DEFS`) with `apply(player, chandler)` callback per type
- `genPickups(lvl)` runs after `OBJ_GENERATORS[idx]` in `generateLevelObjects()`
- `drawPickup(o)` added to the `drawObjects()` switch on `kind === 'pickup'`

---

## Camera

- Always centered on Jax
- Clamped to map bounds — never shows outside the map area
- Updated after all physics resolve each frame

---

## UI Flow

```
Menu
 ├─ PLAY ──────────────────────────────► Level 1 starts
 │                                          │
 │                              ┌───────────┴────────────┐
 │                         Exit reached            Chandler catches Jax
 │                              │                         │
 │                    Level Complete screen          Game Over screen
 │                     (levels 1–4 only)              │         │
 │                              │                  TRY AGAIN   MENU
 │                    NEXT LEVEL button                │
 │                              │                 (back to Level 1)
 │                         Next level starts
 │                              │
 │                    After Level 5 exit ──────────► Win screen
 │                                                    │
 │                                              Name entry + SUBMIT
 │                                                    │
 └─ LEADERBOARD ◄────────────────────────────── Leaderboard screen
```

---

## Technical Architecture

| Concern | Detail |
|---------|--------|
| Rendering | Single `<canvas>` element, Canvas 2D API |
| Loop | `requestAnimationFrame`, delta-time capped at 100ms |
| Dependencies | None — single `index.html` file, no build step |
| Persistence | `localStorage` key `cw_lb` for leaderboard |
| Input | `mousemove` for cursor tracking; `mousedown`/`mouseup` for button clicks |
| Button system | Drawn into a `buttons[]` array each frame; `mousedown` hits against last frame's entries |
| Tile backgrounds | Offscreen `<canvas>` elements rendered once, cached as `CanvasPattern` via `ctx.createPattern` |
| Frame-rate independence | All movement uses `dt` (seconds since last frame) |

### Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `PLAYER_SIZE` | 28 px | Jax bounding box |
| `PLAYER_SPEED` | 220 px/s | Base movement speed |
| `CHANDLER_SIZE` | 34 px | Chandler bounding box |
| `PUSH_FORCE` | 280 px/s | Initial velocity applied to pushable on hit |
| `PUSH_DRAG` | 5 | Exponential drag coefficient for pushables and push buff |
| `WALL_THICK` | 14 px | Outer border wall thickness |

### Code Sections (index.html)

```
CONSTANTS          → sizing, physics values
LEVEL CONFIGS      → 5 level definitions (map size, spawns, speeds)
STATE              → all mutable game variables
CANVAS & INPUT     → canvas setup, mouse + keyboard listeners
CAMERA             → updateCamera(), clamped centering
GRID TILE FACTORY  → offscreen canvas → CanvasPattern cache
MAP DRAW FUNCTIONS → drawMap0–drawMap4 (static backgrounds)
BUFF SYSTEM        → applyBuff, tickBuffs, buffSpeedMult, buffPushVec
WALL DEFINITIONS   → outerWalls(), wallsLevel0–4, WALL_GENERATORS[]
DYNAMIC OBJECTS    → tooClose(), genObjects0–4, OBJ_GENERATORS[]
                     generateLevelObjects() combines walls + objects
COLLISION HELPERS  → overlaps(), resolveAABB(), resolveSolids(), getMudMult()
PUSHABLE PHYSICS   → updatePushables()
DRAW OBJECTS       → drawObjectShape() (per-type renderer), drawObjects()
ENTITY DRAW        → drawExit(), drawPlayer(), drawChandler()
EXIT COMPASS       → off-screen directional HUD arrow
BUTTON SYSTEM      → drawButton(), handleClick(), onButtonClick()
LEADERBOARD        → getScores(), saveScore(), submitScore()
GAME INIT          → startGame(), startLevel()
UPDATE             → main physics + logic loop
DRAW SCREENS       → drawMenu, drawHUD, drawLevelComplete, drawGameOver, drawWin, drawLeaderboard
DRAW (main)        → draw() — routes to correct screen, composes world
GAME LOOP          → loop() entry point
```

---

## Planned / Future Development

### Core Gameplay
- [ ] Implement Pickups system (see Pickups section) — sprite art, placement, stun state
- [ ] Secondary villain collision applies `speed_down` or `push` debuff
- [ ] Additional buff types: shield, teleport
- [ ] Multiple villains in later levels (additional Chandlers or new characters)
- [ ] Inner wall layouts for Levels 2–5 (map design sessions)
- [ ] Chandler pathfinding around walls (A* or steering behaviors)

### Objects & Environment
- [ ] Dynamic object placement rules per level (density, zone constraints)
- [ ] Destructible objects (walls that can be broken after enough pushes)
- [ ] Moving obstacles (e.g., rolling ball that bounces)

### Polish
- [ ] Sprite/pixel-art graphics for Jax and Chandler
- [ ] Sound effects and background music per level theme
- [ ] Animated exit portal
- [ ] Level intro screen showing the map theme and Chandler speed warning

### Platform
- [ ] Mobile/touch support (touch position replaces mouse)
- [ ] Server-side leaderboard (replace `localStorage`)
- [ ] Level select screen (unlocked after first full completion)
