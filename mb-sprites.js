// ─────────────────────────────────────────────
// Map Builder — sprite library
//
// All draw functions now live in sprites-shared.js (window.Sprites.*).
// This file just re-exports them under the legacy window.MB_* names so
// existing call sites in mb-app.js keep working. The original per-cell
// implementations (drawJaxIcon, drawChandlerIcon, drawBrickEdge,
// drawWall, drawLocker, drawDesk, drawDoor, drawBlackboard, drawExit,
// buildTile, drawPushable, drawMud, drawGel, drawMirror, drawSpray)
// are preserved in archive/mb-sprites.js.pre-asset-merge.js.
// ─────────────────────────────────────────────

window.MB_buildTile      = Sprites.buildTile;
window.MB_drawBrickEdge  = Sprites.drawBrickEdge;
window.MB_drawWall       = Sprites.drawWall;
window.MB_drawPushable   = Sprites.drawPushable;
window.MB_drawMud        = Sprites.drawMud;
window.MB_drawLocker     = Sprites.drawLocker;
window.MB_drawDesk       = Sprites.drawDesk;
window.MB_drawDoor       = Sprites.drawDoor;
window.MB_drawBlackboard = Sprites.drawBlackboard;
window.MB_drawExit       = Sprites.drawExit;
window.MB_drawGel        = Sprites.drawGel;
window.MB_drawMirror     = Sprites.drawMirror;
window.MB_drawSpray      = Sprites.drawSpray;
