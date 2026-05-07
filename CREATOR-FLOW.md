# Creator Flow

## Overview

Levels move through four stages: **Draft → Submitted → Official** (with **Rejected** as a possible side branch back to Draft). A creator key (`XXXX-XXXX`) is the only credential — no accounts, no passwords. Keep it safe; it cannot be recovered.

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

### 4. Submit for Review (Play-to-Submit)

When the level is finished and beatable:

1. Click **SUBMIT** in the builder toolbar.
2. A modal opens with the level loaded in play mode.
3. **Beat the level.** Reach the exit without getting caught.
4. The **SUBMIT NOW** button activates with the time you took to beat it.
5. Click **SUBMIT NOW** to lock the level and send it to the review queue.

Why this gate? It guarantees the level is winnable. The admin doesn't need to play through every submission — they just spot-check that it's appropriate. The "creator beat in N seconds" signal is shown in the admin queue.

If you fail (caught) or hit a flaw, click **RESTART** in the modal and try again, or close the modal to go back to editing.

> Note: The win check runs in your browser. This isn't cryptographic proof you actually played fair — it's an honesty gate to make sure the level is at least beatable.

---

### 5. Edit After Submitting

Once submitted, the builder is locked and a **SUBMITTED** banner appears at the top. To make changes:

- Click **WITHDRAW** in the banner.
- The level returns to draft state. Edit freely.
- To re-submit, repeat the play-to-submit flow.

The map code stays the same throughout — anyone holding your code keeps a working link.

---

### 6. Rejection

If an admin rejects your submission:

- The level is unlocked automatically.
- A red **REJECTED** banner appears at the top of the builder with the admin's reason.
- The card in **My Levels** shows a **REJECTED** badge.
- Edit your level to address the feedback, then submit again. The banner clears once you submit.

---

### 7. My Levels Tab

The **My Levels** tab in the game shows all levels tied to your creator key.

| Badge | Meaning |
|-------|---------|
| DRAFT | Work in progress, editable |
| SUBMITTED | Locked and awaiting review |
| REJECTED | Admin rejected; back to editable. Reason in the builder banner |
| OFFICIAL | Approved and in the public catalog |

Official levels remain visible in My Levels after approval.

---

## Admin Approval

### Setup

The admin UI requires the `ADMIN_KEY` environment variable to be set. In `docker-compose.yml`:

```yaml
- ADMIN_KEY=${ADMIN_KEY:-changeme}
```

Set a real key in your shell or in a `.env` file before starting the stack:

```bash
export ADMIN_KEY="your-secret-here"
docker-compose up -d
```

If `ADMIN_KEY` is unset, all `/api/admin/*` endpoints return **503**.

### Using the Admin UI

1. Go to **`/admin`** in your browser.
2. Enter the admin key (saved to `sessionStorage` for the tab's lifetime).
3. The queue lists every submission awaiting review, with code, name, author, creator key, the time the creator beat it in, and submission timestamp.
4. Click **REVIEW →** on a row. The level loads in a play iframe so you can spot-check art / theme / appropriateness.
5. **Approve** moves the file to `games/maps/`, sets `official=1`, and removes it from the queue.
6. **Reject** requires a reason. The level is unlocked and the reason surfaces in the creator's builder.

The CLI workaround (mv + redis-cli) still works if needed.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/unofficial` | `creatorKey` in body | Create or update a draft (also clears prior verification) |
| `GET` | `/api/unofficial/:code` | `creatorKey` in query | Load a draft (returns `_meta` with lock/rejection state) |
| `POST` | `/api/unofficial/:code/verify` | `creatorKey`, `time` in body | Record a successful playthrough (gates submit) |
| `POST` | `/api/unofficial/:code/submit` | `creatorKey` in body | Lock for review (requires `verified=1`) |
| `POST` | `/api/unofficial/:code/unsubmit` | `creatorKey` in body | Withdraw submission, return to draft |
| `GET` | `/api/unofficial/my-levels` | `creatorKey` in query | List all levels for a creator |
| `GET` | `/api/admin/queue` | `x-admin-key` header | List submissions awaiting review |
| `GET` | `/api/admin/map/:code` | `x-admin-key` header | Fetch a submission's map JSON |
| `POST` | `/api/admin/approve/:code` | `x-admin-key` header | Approve and publish |
| `POST` | `/api/admin/reject/:code` | `x-admin-key` header, `reason` in body | Reject with reason; unlocks for revision |

The `creatorKey` field is **never returned** in any creator-facing API response. It IS returned in `/api/admin/queue` so the admin can correlate submissions to creators.

---

## Redis Key Design

```
cw:creator:{key}        Set     Map codes owned by this creator
cw:map:{code}:creator   String  Creator key for this map (server-side only)
cw:map:{code}:meta      Hash    locked, official, verified, verifiedAt,
                                verifiedTime, submittedAt, rejected, rejectedAt,
                                rejectionReason, approvedAt
cw:submissions          Set     Codes currently in submitted state (admin queue index)
```

A startup backfill scans `cw:map:*:meta` and populates `cw:submissions` for any locked-but-not-official maps that pre-date the index.

---

## File Structure

```
games/
  maps/               Official levels (public)
    K3F9PX.json
  unofficial-maps/    Drafts (creator key required to access)
    ABC123.json
```
