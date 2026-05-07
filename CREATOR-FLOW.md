# Creator Flow

## Overview

Levels move through three stages: **Draft → Submitted → Official**. A creator key (`XXXX-XXXX`) is the only credential — no accounts, no passwords. Keep it safe; it cannot be recovered.

---

## Creator Flow

### 1. Get a Creator Key

Open the **Map Builder** (`/map-builder`). A session overlay appears on first visit.

- **Generate New Key** — creates a random `XXXX-XXXX` key client-side.
- **Enter existing key** — type or paste a key you already have.

The key is saved to `localStorage` so you won't be asked again on the same browser.

> ⚠ Write your key down. It is never stored on the server and cannot be recovered if lost. It can be shared with collaborators — anyone with the key can save to your drafts.

---

### 2. Build and Save a Draft

Design your level in the builder. When ready to persist it:

- Click **SAVE DRAFT** in the toolbar.
- On the **first save**, a map code (e.g. `ABC123`) is assigned and shown. Write this down too.
- After the first save, the builder **auto-saves every 30 seconds**.
- The save status is shown in the toolbar ("Saved 2m ago").

Draft files are stored in `games/unofficial-maps/{CODE}.json`. The creator key is **never written to the file** — the association lives in Redis only.

---

### 3. Play and Iterate

Draft levels are playable before approval:

1. Go to **Select Level → My Levels** tab.
2. Enter your creator key (auto-loaded from `localStorage` on repeat visits).
3. Your draft levels appear with a **DRAFT** badge. Click to play.

Iterate: return to the builder, edit, save — your changes are reflected immediately.

---

### 4. Submit for Review

When the level is finished and beatable:

- Click **SUBMIT** in the builder toolbar.
- Confirm the prompt.
- The level is **locked** — no further edits are possible.
- The status badge in My Levels changes to **SUBMITTED**.

---

### 5. My Levels Tab

The **My Levels** tab in the game shows all levels tied to your creator key — drafts, submitted, and approved.

| Badge | Meaning |
|-------|---------|
| DRAFT | Work in progress, editable |
| SUBMITTED | Locked and awaiting review |
| OFFICIAL | Approved and in the public catalog |

Official levels remain visible in My Levels after approval.

---

## Admin Approval

When a submitted level is ready to approve:

**1. Move the map file:**
```bash
mv games/unofficial-maps/CODE.json games/maps/CODE.json
```

**2. Mark it official in Redis:**
```bash
redis-cli -p 6380 HSET cw:map:CODE:meta official 1
```

The level will now appear in the public catalog (`GET /api/games`) and show an **OFFICIAL** badge in the creator's My Levels.

To reject (remove from the queue without approving):
```bash
rm games/unofficial-maps/CODE.json
redis-cli -p 6380 DEL cw:map:CODE:creator cw:map:CODE:meta
redis-cli -p 6380 SREM cw:creator:XXXX-XXXX CODE
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/unofficial` | `creatorKey` in body | Create or update a draft |
| `GET` | `/api/unofficial/:code` | `creatorKey` in query | Load a draft |
| `POST` | `/api/unofficial/:code/submit` | `creatorKey` in body | Lock for review |
| `GET` | `/api/unofficial/my-levels` | `creatorKey` in query | List all levels for a creator |

The `creatorKey` field is **never returned** in any API response.

---

## Redis Key Design

```
cw:creator:{key}        Set     Map codes owned by this creator
cw:map:{code}:creator   String  Creator key for this map (server-side only)
cw:map:{code}:meta      Hash    locked (0|1), official (0|1), submittedAt (ISO)
```

---

## File Structure

```
games/
  maps/               Official levels (public)
    K3F9PX.json
  unofficial-maps/    Drafts (creator key required to access)
    ABC123.json
```
