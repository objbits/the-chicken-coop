# Chandler's World — Map Builder Reference

## Overview

`map-builder.html` is a standalone level-design tool for Chandler's World. It produces versioned JSON files that describe a level's cell grid, which can be consumed by the game to generate walls, objects, and entity spawn positions.

---

## Grid System

| Property | Value |
|----------|-------|
| Max grid | 60 × 60 cells |
| Cell size (game world) | 64 × 64 px (2 × 2 game tiles at 32 px/tile) |
| Inactive cells | Not part of the map — treated as out-of-bounds |
| Active cell count | No minimum enforced by the builder, but a Jax start, exit, and Chandler are required before export |

Maps can be any shape. Only cells explicitly activated are included in the exported JSON.

---

## Cell Properties

Each active cell has four configurable properties:

### Background
Determines the visual style rendered in that cell. Matches the art styles used in the game's existing levels.

| Value | Description |
|-------|-------------|
| `empty` | Dark/void tile |
| `hallway` | Tan floor tiles (Level 1 style) |
| `grass` | Green field (Level 2 style) |
| `cafeteria` | Cream tile floor (Level 3 style) |
| `carpet` | Purple carpet (Level 4 office style) |
| `dirt` | Brown dirt (Level 5 baseball field) |
| `concrete` | Gray concrete |
| `asphalt` | Dark asphalt (playground court) |

### Borders
Each cell has four independent border toggles — **N**, **S**, **E**, **W**. A blocked border creates a wall object on that edge of the cell in the game world. Border walls block both Jax and Chandler.

> Note: If two adjacent cells both define a border on their shared edge, only one wall object is needed — the importer should deduplicate.

### Object
One optional object placed inside the cell. Fills the cell's 64 × 64 area.

| Value | Kind | Effect |
|-------|------|--------|
| `wall` | Immovable | Blocks Jax and Chandler |
| `mud` | Passable | Slows Jax (`speedMult`) |
| `pushable` | Movable | Jax can push it; also blocks Chandler |

### Special
One optional special designation per cell. Only one of each type may exist per map.

| Value | Meaning |
|-------|---------|
| `player` | Jax spawn position |
| `exit` | Level exit (pulsing green square) |
| `villain` | Chandler spawn position |

All three are required to export the map.

---

## JSON Format

```json
{
  "version": 1,
  "playerStart": [5, 12],
  "exit": [42, 8],
  "villain": [2, 2],
  "cells": {
    "5,12": {
      "background": "hallway",
      "borders": { "n": false, "s": false, "e": false, "w": true },
      "object": null,
      "special": "player"
    },
    "6,12": {
      "background": "hallway",
      "borders": { "n": false, "s": false, "e": false, "w": false },
      "object": "pushable",
      "special": null
    }
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version — increment on breaking changes |
| `playerStart` | `[col, row]` | Convenience duplicate of the `player` special cell coordinates |
| `exit` | `[col, row]` | Convenience duplicate of the `exit` special cell coordinates |
| `villain` | `[col, row]` | Convenience duplicate of the `villain` special cell coordinates |
| `cells` | object | Keys are `"col,row"` strings; values are cell objects |
| `cells[k].background` | string | Background style key |
| `cells[k].borders` | object | `{ n, s, e, w }` — each boolean; `true` = wall on that edge |
| `cells[k].object` | string \| null | Object kind, or `null` for no object |
| `cells[k].special` | string \| null | `"player"`, `"exit"`, `"villain"`, or `null` |

### Versioning

| Version | Changes |
|---------|---------|
| 1 | Initial format |

When a breaking change is made to the format, increment `version` in both the builder constant `MAP_VERSION` and this table. The builder will refuse to load files with a version higher than `MAP_VERSION`.

---

## Builder UI

### Toolbar

| Control | Action |
|---------|--------|
| **Select** | Click an active cell to open the cell editor |
| **Paint** | Click or drag to activate cells |
| **Erase** | Click or drag to deactivate cells (also removes specials) |
| **− / +** | Zoom out / in |
| **New** | Clear the current map (confirms before discarding) |
| **Load JSON** | Open a `.json` map file |
| **Export JSON** | Download the map as `.json` (requires all three specials) |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Switch to Select tool |
| `P` | Switch to Paint tool |
| `E` | Switch to Erase tool |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| Arrow keys | Pan the grid |

### Mouse

| Action | Result |
|--------|--------|
| Scroll wheel | Zoom toward cursor |
| Alt + drag | Pan the grid |
| Middle-click drag | Pan the grid |

### Cell Editor (right panel)

Appears when a cell is selected with the Select tool. All changes apply immediately and are reflected in the grid view.

- **Background** — dropdown of visual styles
- **Borders** — compass button layout; active (red) = wall on that edge
- **Object** — dropdown; one object per cell or none
- **Special** — three toggle buttons; only one of each type allowed per map
- **Deactivate Cell** — removes the cell from the map

### Status Bar

Shows active cell count and warnings when required specials (Jax start, exit, Chandler) are missing.

---

## Game Integration

To convert a map JSON into a playable level, the game needs an importer that:

1. **Reads `playerStart` / `exit` / `villain`** → compute pixel positions as `[col * 64 + 32, row * 64 + 32]` (cell center)
2. **Reads `cells`** → for each active cell:
   - Apply the background pattern for that cell's 64 × 64 area
   - For each `true` border: create a `wall` object on that edge (14 px thick, spanning the full cell edge)
   - If `object` is set: create the corresponding `levelObjects` entry centered in the cell
3. **Deduplicate border walls** — if two adjacent cells both set a wall on their shared edge, create one wall, not two

### Coordinate Mapping

```
game_x = col * 64
game_y = row * 64
cell_center_x = col * 64 + 32
cell_center_y = row * 64 + 32
map_width  = max_col * 64 + 64
map_height = max_row * 64 + 64
```

---

## Planned

- [ ] Multi-cell selection (shift-click, drag select)
- [ ] Copy / paste cell regions
- [ ] Undo / redo stack
- [ ] Preview mode (renders the cell in game-accurate art)
- [ ] Named map metadata (level name, Chandler speed override)
- [ ] Game importer that reads map JSON into `generateLevelObjects()`
