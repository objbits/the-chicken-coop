# The Chicken Academy

A browser-based top-down chase game at [thechickenacademy.com](https://thechickenacademy.com). Play as Jax — a student trying to escape the school grounds before the villain Chandler catches him. Complete five levels across different school locations, collecting power-ups and navigating obstacles along the way. The fastest total time earns a spot on the leaderboard.

## Stack

- **Frontend** — single `index.html` with Canvas 2D, no build step
- **Map Builder** — `map-builder.html`, standalone level-design tool
- **Backend** — Node.js + Express (`server/`) serving the static files and REST API
- **Cache** — Redis for leaderboard and game stats
- **Infra** — Docker Compose

## Running locally

```bash
docker compose up
```

App available at `http://localhost:3040`.

## Map Builder

Open `/map-builder` to design levels. Paint cells, set backgrounds, place walls and objects, mark Jax/Exit/Chandler spawn positions, then export JSON. See [MAP-BUILDER.md](MAP-BUILDER.md) for full reference.

## Docs

- [GAME.md](GAME.md) — game design & technical reference
- [MAP-BUILDER.md](MAP-BUILDER.md) — map builder reference and JSON format
