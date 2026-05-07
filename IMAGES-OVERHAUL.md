# Images / Object & Terrain System — Overhaul Proposal

**Status:** decisions locked, ready for implementation planning
**Owner:** Josh
**Last updated:** 2026-05-07

---

## 1. Goal

Replace the current procedural-canvas sprite system with an **image-based, data-driven object & terrain catalog** that supports:

1. Image-asset sprites (PNG) drawn in a Prison-Architect-style top-down view with oblique sprite perspective.
2. **4-way rotation** (0° / 90° / 180° / 270°) with explicit per-rotation art, not `ctx.rotate`.
3. **Symmetry tiers** so symmetrical objects only ship the sprites they actually need.
4. **Multi-tile footprints** (1×1, 1×2, 2×1, 2×2, and arbitrary W×H).
5. **Edge-anchored vs center-anchored** placement (e.g. a door sits on a tile edge between two cells; a barrel sits in the middle of one cell).
6. **Soft transitions between adjacent floor types** (grass → dirt, sand → grass, etc.) instead of the current hard rectangular boundary.
7. **Tile variation within a single floor type** so a large grass field doesn't show a repeating, uniform grid pattern.

This doc defines the requirements and proposes a data model. It does **not** prescribe an implementation order — that's a follow-up plan once the requirements are agreed.

---

## 2. Current state (for context)

- All objects are procedurally drawn via `window.Sprites.draw*` functions in `sprites-shared.js`, exported through `mb-sprites.js` as `window.MB_draw*`.
- Each function takes `(ctx, x, y, size)` and renders into a single cell.
- `OBJ_DEFS` in `mb-app.js:74` maps an object id → `{ label, kind, draw }`. There is no concept of footprint, anchor, or symmetry.
- Each cell stores `{ background, borders, object, rotation, special }`. `rotation` is one of `0/90/180/270` and is applied via `ctx.translate` + `ctx.rotate` around the cell center (`mb-app.js:521`).
- This means every object is currently a symmetric, single-cell, center-anchored sprite. Anything else looks wrong (e.g. a door rotated 90° just shows the same face turned sideways).
- Floors: each background type is rendered to a **single 64×64 source canvas** in `tileCache` via `MB_buildTile(k)` (`mb-app.js:289`), then `drawImage`'d into every cell of that type. Two consequences:
  - Every cell of a given floor is **pixel-identical**, so large patches reveal a visible repeating grid.
  - Adjacent floor types meet at an **exact rectangular boundary** with no transition.

The overhaul keeps the cell grid and rotation values but rebuilds everything on top of an explicit catalog with image references.

---

## 3. Requirements

### 3.1 Sprites are images, not procedural draws

- Each object provides one or more PNG sprites at a canonical pixel size (proposed: **64×64 per tile**, matching the current default `cellSize`).
- Sprites are loaded once at startup and cached as `Image` / `ImageBitmap`.
- The game and map builder must render through the same code path — no divergence between in-game and editor visuals.

### 3.2 Rotation

- Objects rotate in 90° increments only.
- A rotation is **never** synthesized by `ctx.rotate` for art-bearing sprites. Rotated views are explicit artwork, because the projection style is oblique (a horizontal door shows its face; a vertical door shows a thin profile).
- The catalog declares which rotations are supported and where the artwork for each comes from (see §4).

### 3.3 Symmetry tiers

The catalog should support these tiers without forcing duplicate assets:

| Tier | Unique sprites | Example |
|---|---|---|
| `full` | 1 — same sprite for all 4 rotations | round table, barrel, rug |
| `axis` | 2 — `v` (N/S) and `h` (E/W) | door, fence segment, long bench |
| `quad` | 4 — `n`, `e`, `s`, `w` | desk, sofa with armrest, sign |

A future `mirror` flag (uses canvas flip to halve `quad` asset count for bilaterally-symmetric pieces) is **out of scope for v1** but the schema should leave room for it.

### 3.4 Footprint (size in tiles)

- Every object declares a footprint `W × H` in tiles. Default is `1 × 1`.
- Common values: `1×1`, `1×2`, `2×1`, `2×2`. The system must allow arbitrary `W × H`.
- The footprint **rotates with the object**: a `1×2` desk becomes `2×1` when rotated 90°/270°.
- All cells under the footprint are considered occupied. Painting an object onto any of those cells should resolve to the same logical placement, and erasing any of them should remove the whole object.
- Placement is rejected if any tile in the footprint is out of grid, inactive, or already occupied.

### 3.5 Anchoring (where the sprite sits relative to the grid)

Two anchor modes:

- **`center`** (default) — the sprite occupies the interior of its footprint. Examples: barrel, desk, locker, fountain.
- **`edge`** — the sprite straddles a grid line between two cells. Used for thin objects whose natural place is *between* tiles, not inside one. Examples: doors, fences, walls.

For `edge` anchoring, the object is associated with a specific cell + side (`n`, `s`, `e`, `w`), much like the existing `borders` field. The sprite is drawn centered on that edge, half overlapping each adjacent cell.

Notes:
- An `edge` object's footprint is described along the edge it sits on. A 1-tile-wide door has length 1 along the edge. A 2-tile-wide gate has length 2.
- Rotating an `edge` object alternates between horizontal and vertical edges (effectively swapping which side of which cell it's on).
- Walls today are drawn as cell borders, not as objects. The overhaul should unify "walls" and "fences" under the edge-anchored object model so everything edge-shaped lives in one system. (See §7 — open question.)

### 3.6 Backwards compatibility

- Saved maps reference object ids and rotations. The new catalog must keep ids stable for already-saved maps in `games/maps/*.json` (and any drafts). Where an existing id changes shape (e.g. a former 1×1 becomes a 1×2), the loader needs a migration path — at minimum, a documented breakage list.

### 3.7 Floor blending between different types

When two floor types meet (e.g. grass and dirt), the boundary today is a hard rectangular line. The new system should render an **organic transition** where adjacent cells of different terrain types blend into each other.

Requirements:

- The transition should look natural for organic terrain (grass/dirt/sand/snow) and stay clean for built terrain (concrete/asphalt/floor tile).
- Blending should not depend on the order cells were painted — repainting a grass cell next to dirt produces the same result regardless of which was placed first.
- Each terrain pair has a defined **priority** that decides which one bleeds into the other (e.g. dirt bleeds onto grass, sand bleeds onto dirt). Two terrains with equal priority share the boundary symmetrically.
- The system needs to handle 4-neighbor cases at minimum (N/S/E/W transitions). 8-neighbor (corners) is desirable so a single grass cell surrounded by dirt feels rounded, not stair-stepped.
- The map builder must show the blended result live as you paint, not only after a redraw pass.

Three candidate techniques are sketched in §5; pick one in review.

### 3.8 Tile variation within a single floor type

A large patch of one terrain currently tiles a single 64×64 source canvas, so the eye picks up the seam grid immediately. The new system should ensure same-type cells **don't visually repeat** in a noticeable pattern.

Requirements:

- Each terrain type can ship **N variant sprites** (proposed: 2–4 per type). The renderer picks one per cell deterministically from `(col, row)` so the result is stable across redraws and saves.
- Variants should be designed to tile against each other in any combination — no variant should have a feature that only works at a specific grid position.
- Optionally, a per-cell **flip** or **90° rotation** of the chosen variant can multiply effective variety without extra art, but only for terrains whose art is rotation-safe (e.g. grass yes, wood planks no).
- For terrains where larger-scale features matter (e.g. occasional flowers in grass, cracks in concrete), support a **decal layer**: scattered detail sprites placed on top of the base tile at a configurable density, again deterministic per cell.
- Variation must compose cleanly with §3.7 blending — the variant choice shouldn't change which cells get a transition.

### 3.9 Editor UX

- The object palette must show each object at its native footprint, not crammed into a 1×1 swatch.
- Rotation control (the existing `paintRotation` UI) must reflect the chosen object's symmetry tier — e.g. a `full`-tier object hides the rotation buttons entirely.
- Hover preview must render the actual rotated, footprint-correct sprite, including showing red/invalid state when the footprint can't fit.
- Terrain blending and variation must be visible **live** while painting — the editor should not render a "flat" preview that diverges from the saved/in-game look.
- Terrain palette swatches should display a representative variant (or a small composite of all variants) so the user sees what they're actually painting.

---

## 4. Proposed data model

### 4.1 Catalog entry

```js
// OBJ_DEFS entries
{
  id: 'desk',
  label: 'Desk',
  kind: 'immovable',           // existing field, unchanged
  footprint: [1, 2],            // [w, h] in tiles. Default [1, 1].
  anchor: 'center',             // 'center' | 'edge'
  symmetry: 'quad',             // 'full' | 'axis' | 'quad'
  sprites: {
    n: 'assets/objects/desk_n.png',
    e: 'assets/objects/desk_e.png',
    s: 'assets/objects/desk_s.png',
    w: 'assets/objects/desk_w.png',
  },
}

// Symmetry tier shorthand
{ id: 'barrel',  symmetry: 'full', sprites: { all: '...' } }
{ id: 'door',    symmetry: 'axis', anchor: 'edge', sprites: { v: '...', h: '...' } }
```

The renderer resolves a sprite from `(symmetry, rotation)`:

| symmetry | rotation 0 | 90 | 180 | 270 |
|---|---|---|---|---|
| `full` | `all` | `all` | `all` | `all` |
| `axis` | `v` | `h` | `v` | `h` |
| `quad` | `n` | `e` | `s` | `w` |

### 4.2 Cell state

The current `cell.object` (id) + `cell.rotation` (deg) is preserved for `1×1 center` objects. For multi-tile or edge-anchored objects, we need a richer placement record.

Option A — store one canonical record per object, referenced from each occupied cell:

```js
// New top-level state alongside `cells`
placedObjects = [
  { uid, id: 'desk', col, row, rotation, /* origin tile of the footprint */ }
];

// Each covered cell stores a back-reference
cell.objectRef = uid;
```

Option B — keep storage on cells, denormalize:

```js
cell.object = 'desk';      // every covered cell holds the same id
cell.rotation = 90;
cell.footprintOrigin = [col0, row0];  // which tile is the "anchor" of this object
cell.footprintIndex = [dx, dy];        // this cell's offset within the footprint
```

Recommendation: **Option A**. It keeps the canonical representation in one place (cleaner for rotation, deletion, and edge anchoring), and edge objects don't fit naturally on a single cell anyway. Saved-map JSON would change shape — see §6.

### 4.3 Edge-anchored placement record

```js
{ uid, id: 'door', col, row, side: 'n', length: 1, rotation: 0 }
```

`side` is which edge of `(col, row)` the object sits on. Rotating the object cycles `side` through `n → e → s → w`, which is equivalent to moving it onto the next neighboring cell's matching edge — the renderer normalizes this so two cells don't both claim the same physical edge.

### 4.4 Terrain catalog entry

```js
TERRAIN_DEFS = {
  grass: {
    label: 'Grass',
    priority: 10,                  // higher = bleeds onto lower-priority neighbors
    variants: [                    // 2–4 base tiles; renderer hashes (col,row) to pick
      'assets/terrain/grass_a.png',
      'assets/terrain/grass_b.png',
      'assets/terrain/grass_c.png',
    ],
    allowFlip: true,               // multiply variety via canvas flip
    allowRotate: true,             // multiply variety via 90° rotation
    decals: [                      // optional scattered detail layer
      { sprite: 'assets/terrain/grass_tuft.png', density: 0.05 },
      { sprite: 'assets/terrain/grass_flower.png', density: 0.01 },
    ],
  },
  dirt: { label: 'Dirt', priority: 20, variants: [...], allowFlip: true },
  concrete: { label: 'Concrete', priority: 50, variants: [...], allowFlip: false, allowRotate: false },
}
```

Variant / flip / rotation choices for cell `(c, r)` come from a deterministic hash of `(c, r, terrainId)`. Decal placement uses a separate hash so terrain repaints don't shuffle decals.

---

## 5. Rendering

### 5.1 Objects

- Each draw call: look up the catalog entry, resolve sprite via `(symmetry, rotation)`, compute draw rectangle from `footprint` + `anchor`, `drawImage` once.
- `center` anchor: rectangle is `(col*S, row*S, W*S, H*S)`, where `[W, H]` is the (possibly rotation-swapped) footprint.
- `edge` anchor: rectangle is centered on the edge, with the long axis matching `length` and the short axis being a fixed thickness (proposed: ½ tile, configurable per object).
- Hover/preview uses the same path with reduced alpha and a red tint when invalid.

The procedural `Sprites.draw*` functions stay around during migration as a fallback — a catalog entry can declare `sprites: { proceduralFn: 'desk' }` to reuse the existing draw function until art exists. This lets the overhaul ship incrementally.

### 5.2 Terrain — variation

For each cell `(c, r)` of terrain `t`:

1. Hash `(c, r, t)` to pick a variant index, plus an optional flip (H/V) and 90° rotation if the terrain allows them.
2. `drawImage` the chosen variant into the cell.
3. For each entry in `decals`, hash `(c, r, t, decalIndex)` against the decal's `density` to decide whether to draw it, and where within the cell to place it.

Because the hash is deterministic, the same map renders identically every time and across save/load.

### 5.3 Terrain — blending between adjacent types

Three candidate techniques:

**A. Mask blending (recommended).** Render the lower-priority terrain in every cell, then for each cell draw the higher-priority terrain through a soft alpha mask along edges where the neighbor differs. One mask sprite per directional case (N, E, S, W, plus 4 corners) — 8 masks total, reusable across all terrain pairs. Cheap, organic-looking, asset-light. Best fit for our pixel-art style.

**B. Wang / blob auto-tiling.** Each terrain ships a 16- or 47-tile transition set; for each cell, look at neighbors and pick the matching tile. Crisp results but the asset count multiplies per terrain (47 tiles × N terrains is a lot of art).

**C. Per-pair transition strips.** Each ordered pair (e.g. `grass→dirt`) ships a dedicated edge sprite. Maximum control, maximum asset cost. Doesn't scale beyond a handful of terrains.

Recommendation: **A** for v1. It gets us 90% of the visual win with one shared mask set. We can move individual high-traffic pairs to **C** later if any look bad.

### 5.4 Render order

Per cell, in this order:

1. Base terrain variant (lower-priority terrain wins ties at boundaries).
2. Higher-priority terrain blended in via mask (if any neighbor differs).
3. Decals.
4. Cell-anchored objects (`center` anchor).
5. Edge-anchored objects (drawn after the row of cells they sit between, so they overlap correctly).
6. Specials (player, exit, pickups).

A frame-level cache keyed on `(terrainId, neighborSignature, variantIndex, flipFlags)` lets us pre-render the terrain composite once and `drawImage` it into each cell, instead of doing 9 sub-draws per cell every frame.

---

## 6. Catalog inventory

This is the proposed full catalog after merging your list with everything that already lives in `OBJ_DEFS` / `BG_KEYS`. Status legend:

- **E** — exists in the current codebase (procedural draw or terrain).
- **N** — new, needs art and catalog entry.
- **R** — exists but needs rework (e.g. footprint change, recategorization, or anchor change).

Footprint / anchor / symmetry columns are **proposed defaults**, not final — adjust during art production.

### 6.1 User-requested items

#### Furniture & Seating

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Bleachers | N | — | 2×4 | center | quad | Big sports/auditorium piece |
| Window | N | — | 1 along edge | edge | axis | Sits in a wall — see §7 #11 |
| Table | N | — | 1×2 | center | axis | Generic dining table |
| Bench | N | — | 1×2 | center | axis | |
| Picnic Table | N | — | 2×2 | center | axis | |
| Bed | N | — | 1×2 | center | quad | Headboard makes it directional |
| Chair | E | `pushable` | 1×1 | center | quad | Currently labeled "Chair", id `pushable` |
| Sofa | N | — | 1×2 | center | quad | |
| Swivel Chair | N | — | 1×1 | center | full | Round, no facing |
| Bookshelf | E | `bookshelf` | 1×1 | center | quad | Already in catalog; consider 1×2 |

> **Note:** "Chair" appears twice in your list — assuming that was a typo and there's only one Chair entry.

#### Entertainment

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Table Football | N | — | 1×2 | center | axis | |
| Table Tennis | N | — | 1×2 | center | axis | |
| TV | N | — | 1×1 | center or edge | quad | Edge if wall-mounted, center if standing |
| BoomBox | N | — | 1×1 | center | quad | |

#### Plumbing

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Toilet | E | `toilet` | 1×1 | center | quad | |
| Shower Head | N | — | 1 along edge | edge | axis | Wall-mounted |
| Drain | N | — | 1×1 | center | full | Floor decal-ish |
| Sink & Mirror | R | `sink` | 1×1 | center | quad | Existing `sink` doesn't include mirror; see §7 #12 |
| Fountain | E | `fountain` | 1×1 (consider 2×2) | center | full | Already in catalog — fits Plumbing |

#### Electronics / Lighting

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Light (ceiling) | N | — | 1×1 | center overlay | full | Renders above objects? |
| Floor Lamp | N | — | 1×1 | center | full | |
| Wall Light | N | — | 1 along edge | edge | axis | |

#### Exercise

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Weights Bench | N | — | 1×2 | center | axis | |
| Hurdle | E | `hurdle` | 1×1 | center | axis | Already in catalog — fits Exercise |

#### Foliage / Plants

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Plant | N | — | 1×1 | center | full | Small potted |
| Bush | E | `bush` | 1×1 | center | full | |
| Tree | N | — | 1×1 or 2×2 | center | full | Decide size during art |
| Fern Bush | N | — | 1×1 | center | full | |
| Tree (Bare) | N | — | 1×1 or 2×2 | center | full | Winter variant |
| Stump | E | `stump` | 1×1 | center | full | Existing |
| Flower Patch | E | `flowerpatch` | 1×1 | center | full | Existing — passable |

#### Doors & Gates

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Door | E | `door` | 1 along edge | edge | axis | Existing — needs edge-anchor migration |
| Locked Door | N | — | 1 along edge | edge | axis | New visual variant + game-logic flag |
| Fence Gate | N | — | 1 along edge | edge | axis | |

#### Walls

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Brick Wall | R | `wall` (border) | 1 along edge | edge | axis | Existing `wall` is brick — rework as edge object |
| Concrete Wall | N | — | 1 along edge | edge | axis | |
| Wall (Rusty) | N | — | 1 along edge | edge | axis | |
| Fence | E | `fence` | 1 along edge | edge | axis | Existing — needs edge-anchor migration |
| Hedge | R | `hedge` | 1 along edge | edge | axis | Currently a center-anchored object — move to edge |

#### Flooring (terrain, not objects)

| Terrain | Status | Existing id | Notes |
|---|---|---|---|
| Grass | E | `grass` | |
| Long Grass | N | — | Variant of grass with taller blades; can be a `grass` variant per §3.8 instead of separate terrain |
| Dirt | E | `dirt` | |
| Mud | R | `mud` (object!) | Currently exists as a sticky **object**, not a floor — see §7 #13 |
| Sand | E | `sand` | |
| Water | N | — | Animated? See §8 (out of scope) |
| Snow | E | `snow` | |
| Ice | E | `ice` | |
| Gravel | E | `gravel` | |
| Road | R | `asphalt` | Existing `asphalt` is the same thing — rename or alias |
| Stone | N | — | Cobblestone? Distinct from concrete? |
| Concrete Floor | E | `concrete` | Existing |
| Concrete Tiles | N | — | Tiled variant — distinct sprite from `concrete` |
| Wooden Floor | N | — | Replaces or supplements `carpet`? |
| Marble Tiles | N | — | |
| White Tiles | N | — | Bathroom-style |
| Fancy Tiles | N | — | Patterned — risky for tile-variation goal (§3.8) |

> **Existing terrains not in your list:** `empty` (system "void", keep), `hallway`, `classroom`, `cafeteria`, `carpet` — all themed school floors. See §7 #14 — keep as-is, retire, or fold under Marble/White/Wooden Floor?

#### Work / Shop / Catering

| Item | Status | Existing id | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|---|
| Desk | E | `desk` | 1×2 | center | quad | Currently 1×1 — rework to 1×2 |
| Filing Cabinet | N | — | 1×1 | center | quad | |
| Trash | E | `trashcan` | 1×1 | center | full | |
| Recycling | N | — | 1×1 | center | full | |
| Big W Statue | N | — | 2×2 | center | quad | "W" branding piece |
| Gravestone | N | — | 1×1 | center | quad | |
| Painting | N | — | 1 along edge | edge | quad | Wall-mounted |

### 6.2 Existing items missing from your list

These are in `OBJ_DEFS` today but aren't in your category list. Proposed homes:

| Existing id | Proposed category | Footprint | Anchor | Symmetry | Notes |
|---|---|---|---|---|---|
| `locker` | Storage / Containers (new category) or Furniture | 1×1 | center | quad | School locker |
| `blackboard` | Work / Shop | 1×1 along edge | edge | axis | Wall-mounted; behaves like Painting |
| `bulletinboard` | Work / Shop | 1 along edge | edge | axis | Wall-mounted |
| `barrel` | Storage / Containers | 1×1 | center | full | |
| `crate` | Storage / Containers | 1×1 | center | full | |
| `backpack` | Storage / Containers | 1×1 | center | quad | |
| `flag` | Decoration / Signage | 1×1 | center | quad | |
| `sign` | Decoration / Signage | 1×1 | center | quad | |
| `snowman` | Foliage / Decoration | 1×1 | center | full | Seasonal |
| `rock` | Foliage / Decoration | 1×1 | center | full | |
| `campfire` | Decoration | 1×1 | center | full | Animated? |
| `basketball` | Sports / Recreation (new category) | 1×1 | center | full | |
| `dodgeball` | Sports / Recreation | 1×1 | center | full | |
| `soccerball` | Sports / Recreation | 1×1 | center | full | |
| `baseball` | Sports / Recreation | 1×1 | center | full | |
| `cone` | Sports / Recreation | 1×1 | center | full | |
| `sportsbag` | Sports / Recreation | 1×1 | center | quad | |

I'd recommend adding **two new top-level categories** to your list:

- **Storage / Containers** — locker, barrel, crate, backpack, filing cabinet
- **Sports / Recreation** — basketball, dodgeball, soccerball, baseball, cone, sportsbag, hurdle (these are core to the existing game)

And keeping **Decoration / Signage** as a category alongside Foliage rather than merged into it (flag, sign, snowman, gravestone, painting, big W statue all sit naturally there).

### 6.3 Specials (player, exit, pickups)

These aren't objects in the catalog sense and aren't in your list — leaving them out of scope for this overhaul:

- `player` (Jax spawn), `exit`, `pickup_gel`, `pickup_mirror`, `pickup_spray`. They live in `SPECIAL_DEFS` (`mb-app.js:119`) and have their own placement rules (singletons, special render path).

### 6.4 Totals

- **Items in your list:** ~50 items + 17 floor types
- **Existing usable as-is or with light rework:** ~20
- **New items to author:** ~45
- **New floor types to author:** ~10 (counting Long Grass/Mud as variants)

That's the v1 art workload, before counting variants for §3.8 tile variation.

---

## 7. Save format

Current map JSON stores per-cell `object` + `rotation`. Under Option A, we'd add a top-level `placedObjects` array and drop those fields from individual cells (or keep them as denormalized hints for backwards compat).

Proposed shape:

```json
{
  "version": 2,
  "cells": { "3,4": { "background": "hallway", "borders": {...} } },
  "placedObjects": [
    { "id": "desk",  "col": 3, "row": 4, "rotation": 0 },
    { "id": "door",  "col": 5, "row": 6, "side": "n", "rotation": 0 }
  ]
}
```

The loader must handle `version: 1` (current format) by reading `cell.object` / `cell.rotation` and synthesizing `placedObjects` entries.

---

## 8. Decisions

All resolved on 2026-05-07. Listed in order with the resolution and any implementation note.

| # | Topic | Decision | Note |
|---|---|---|---|
| 1 | Walls | **Fold into edge-anchored objects.** | Brick Wall, Concrete Wall, Rusty Wall, Hedge, Fence all become edge objects. Save migration converts `cell.borders.*` to placed edge objects. |
| 2 | Asset pipeline | **AI-generated sprites via Claude Design**, fed this doc as input. | Existing procedural draws are fully replaced. Need a Style Spec section (§11) so generation is consistent across 50+ items. |
| 3 | Sprite resolution | **64×64 per tile.** | 1×2 piece = 64×128 PNG; 2×2 = 128×128. Crisp at default zoom, matches current `cellSize`. |
| 4 | Mirror symmetry tier | **Defer to v2.** | Three tiers in v1: full / axis / quad. AI generation makes the asset-saving argument weak. |
| 5 | Multi-tile collision | **Reject placement.** | Hover preview turns red on any overlap. User must manually erase before placing. |
| 6 | Z-order | **Implicit by row + anchor.** | Painter's algorithm: sort by row; within a row, edge before center. Multi-tile uses bottom row for sort. |
| 7 | Terrain blending | **Mask blending — 8 shared masks.** | Single mask set reused across every terrain pair. Asset cost: 8 masks + per-terrain base variants. |
| 8 | Terrain priority | **Two-group model approved as-is.** | Organic group (Snow 100, Ice 90, Mud 80, Sand 70, Dirt 60, Gravel 50, Long Grass 40, Grass 30) blends via masks. Sharp group (Water, Stone, Road, Concrete Tiles, Concrete Floor, Wooden, Marble, White, Fancy) has hard edges. |
| 9 | Variant count | **Per-terrain custom.** | Organic 3–4 variants, snow/ice 2, built floors 2, marble/white/fancy 1 (uniform pattern). |
| 10 | Decals | **Auto-placed only.** | Deterministic from `(col, row, terrain)` hash. Hand-placed decoration uses existing object system (sign, flag, gravestone are objects). |
| 11 | Windows | **Own edge object, replaces wall on the edge.** | Edge slot holds one of {wall, fence, hedge, door, gate, window}. Likely needs a window sprite per wall material (brick window, concrete window, rusty window) so the frame matches its neighbors. |
| 12 | Sink & Mirror | **One combined sprite.** | Single `sink_mirror` catalog entry. Always renders against a wall by convention. Note: gameplay `pickup_mirror` is unrelated. |
| 13 | Mud | **Move to terrain with `slows: true`.** | Terrain catalog gains gameplay flags. Game logic checks cell terrain for slow effect. Existing `mud` object retires; save migration converts mud-object cells to mud-terrain. |
| 14 | School floors | **Retire with save migration.** | `hallway → marble_tiles`, `classroom → white_tiles`, `cafeteria → wooden_floor`, `carpet → wooden_floor`. Loader rewrites old terrain ids on read. |
| 15 | Locked Door | **Same Door sprite + lock-badge overlay + `locked: true` flag.** | One door art asset. Editor toggles `locked` in the context panel. |
| 16 | Animation | **Extend schema with `frames` + `fps` in v1.** | Catalog entries (object or terrain) can declare frame sets. Renderer cycles frames over time. Used by Water, Campfire; leaves room for TV, fountain, future animated items. |
| 17 | New categories | **Approve all three.** | Final 12 categories: Furniture & Seating, Entertainment, Plumbing, Electronics & Lighting, Exercise, Foliage, Doors & Gates, Walls, Flooring, Work / Shop / Catering, Storage / Containers, Sports / Recreation, Decoration / Signage. |

### 8.1 Cross-cutting consequences

- **Save format** (§7) needs migration paths for: walls (`cell.borders` → placed edge objects), mud (object cell → terrain), school floors (terrain rename), and existing 1×1 desk → 1×2 desk.
- **Style Spec** (§11, to be added) is now a hard prerequisite — Claude Design needs it before generating any sprite to avoid style drift across 50+ items.
- **Animation schema** affects both object and terrain catalog entries; bake into v1 data model from the start, not a follow-up.
- **Edge-object slot** must enforce one occupant per edge across the full {wall, fence, hedge, door, gate, window} set.

---

## 9. Out of scope

- Animated sprites (multi-frame).
- Per-instance variants (e.g. a desk with random book skins).
- Lighting / shadows.
- Asset hot-reload in the editor.

These can layer on top of the catalog later without changing its shape.
