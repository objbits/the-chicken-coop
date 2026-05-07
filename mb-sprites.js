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
window.MB_drawHedge      = Sprites.drawHedge;
window.MB_drawBush       = Sprites.drawBush;
window.MB_drawFence      = Sprites.drawFence;
window.MB_drawStump      = Sprites.drawStump;
window.MB_drawRock       = Sprites.drawRock;
window.MB_drawSnowman    = Sprites.drawSnowman;
window.MB_drawBarrel     = Sprites.drawBarrel;
window.MB_drawCrate      = Sprites.drawCrate;
window.MB_drawBackpack   = Sprites.drawBackpack;
window.MB_drawToilet     = Sprites.drawToilet;
window.MB_drawSink       = Sprites.drawSink;
window.MB_drawFlag       = Sprites.drawFlag;
window.MB_drawTrashcan   = Sprites.drawTrashcan;
window.MB_drawFountain   = Sprites.drawFountain;
window.MB_drawBookshelf  = Sprites.drawBookshelf;
window.MB_drawBulletinboard = Sprites.drawBulletinboard;
window.MB_drawBasketball = Sprites.drawBasketball;
window.MB_drawHurdle     = Sprites.drawHurdle;
window.MB_drawDodgeball  = Sprites.drawDodgeball;
window.MB_drawSoccerball = Sprites.drawSoccerball;
window.MB_drawBaseball   = Sprites.drawBaseball;
window.MB_drawCone       = Sprites.drawCone;
window.MB_drawSportsbag  = Sprites.drawSportsbag;
window.MB_drawFlowerpatch = Sprites.drawFlowerpatch;
window.MB_drawSign       = Sprites.drawSign;
window.MB_drawCampfire   = Sprites.drawCampfire;
