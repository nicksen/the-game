'use strict';
// Drawing a frame

// Back to front; everything inside the save/restore shakes with the screen.
function render() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(rand(-1, 1) * shake, rand(-1, 1) * shake);
  drawRoom();
  for (const p of props) if (!propMoving(p)) drawProp(p);
  drawShadow(B.pelvis.x, floorY() - B.pelvis.y, 50);
  drawBombs();
  // Flickers to an x-ray while electrocuted
  if (zapT > 0 && !zapTarget.fake && (zapT >> 2) % 2) drawSkeleton();
  else drawDummy();
  drawVikings();
  for (const p of props) if (propMoving(p)) drawProp(p);
  drawProjectiles();
  drawCouches();
  drawPianos();
  drawBolt();
  drawParticles();
  drawTexts();
  drawSpeech();
  drawCursor();
  ctx.restore();
  drawScreenTint();
  updateCombo();
}

// Explosion flash, and the red alarm pulse while the airlock cycles
function drawScreenTint() {
  if (flash > 0.01) { ctx.fillStyle = `rgba(255,240,200,${flash})`; ctx.fillRect(0, 0, W, H); }
  if (airlock.t >= 0) {
    ctx.fillStyle = `rgba(255,30,30,${0.07 + 0.06 * Math.sin(airlock.t * 0.3)})`; ctx.fillRect(0, 0, W, H);
  }
}

function drawSpeech() {
  if (!speech) return;
  const s = speech;
  ctx.save();
  ctx.globalAlpha = s.t < 8 ? s.t / 8 : s.t > 100 ? (120 - s.t) / 20 : 1;
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  const bw = ctx.measureText(s.text).width + 24, bh = 34;
  const hx = B.head.x, hy = B.head.y - B.head.r - 14;
  const bx = Math.max(8, Math.min(W - bw - 8, hx - bw / 2));
  const by = Math.max(8, hy - bh - 22);
  const tx = Math.max(bx + 14, Math.min(bx + bw - 14, hx));
  ctx.beginPath();
  ctx.moveTo(tx - 8, by + bh - 1); ctx.lineTo(hx, Math.max(by + bh + 4, hy)); ctx.lineTo(tx + 8, by + bh - 1);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  rr(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
  ctx.fillRect(tx - 6, by + bh - 4, 12, 4);
  ctx.fillStyle = OUT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.text, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
}

function drawCursor() {
  if (!pointer.inside || tool === 'grab') return;
  const t = TOOLS.find(t => t.id === tool);
  ctx.save();
  ctx.translate(pointer.x, pointer.y);
  ctx.rotate(-swingT * 0.9);
  ctx.scale(1 + swingT * 0.3, 1 + swingT * 0.3);
  ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t.icon, 0, 0);
  ctx.restore();
}
