'use strict';
// Bombs, pianos, couches, projectiles and lightning

function drawBombs() {
  for (const b of bombs) {
    drawShadow(b.x, floorY() - b.y, 14);
    const blink = b.fuse < 40 && Math.floor(b.fuse / 4) % 2 === 0;
    circle(b.x, b.y, 14); ctx.fillStyle = blink ? '#c0392b' : '#222'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    circle(b.x - 5, b.y - 5, 4); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(b.x + 6, b.y - 11); ctx.quadraticCurveTo(b.x + 14, b.y - 22, b.x + 10, b.y - 26);
    ctx.strokeStyle = '#8b6b3d'; ctx.lineWidth = 3; ctx.stroke();
    star(b.x + 10, b.y - 27, rand(4, 7), Math.random() * 6); ctx.fillStyle = pick(['#ffd23f', '#ff7b00', '#fff']); ctx.fill();
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    if (pr.type === 'tomato') {
      ctx.rotate(pr.rot);
      circle(0, 0, pr.r); ctx.fillStyle = '#e8322a'; ctx.fill();
      ctx.strokeStyle = '#8a1510'; ctx.lineWidth = 2; ctx.stroke();
      star(0, -pr.r + 2, 6, 0); ctx.fillStyle = '#3c9a2e'; ctx.fill();
      circle(-3, -3, 3); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    } else if (pr.type === 'rocket') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-26, -13); ctx.lineTo(-12, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-26, 13); ctx.lineTo(-12, 6); ctx.fill();
      rr(-20, -6, 34, 12, 4); ctx.fillStyle = '#d9d9d9'; ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(26, 0); ctx.lineTo(14, 6); ctx.closePath();
      ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.stroke();
    } else if (pr.type === 'meteor') {
      ctx.rotate(pr.rot * 0.3);
      ctx.shadowColor = '#ff7b00'; ctx.shadowBlur = 30;
      circle(0, 0, pr.r); ctx.fillStyle = '#6b4a2b'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#4a321c';
      for (const [cx, cy, cr] of [[-8, -6, 6], [9, 4, 5], [-2, 12, 4]]) { circle(cx, cy, cr); ctx.fill(); }
    }
    ctx.restore();

    if (pr.type === 'meteor') {
      // Landing target on the floor
      const fy = floorY();
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.sin(pr.age * 0.4)})`;
      ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.ellipse(pr.tx, fy + 4, 90, 14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCouches() {
  for (const c of couches) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.strokeStyle = '#2b1240'; ctx.lineWidth = 3;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(-62, 18, 8, 9); ctx.fillRect(54, 18, 8, 9);
    rr(-66, -36, 132, 34, 10); ctx.fillStyle = '#6a2fa0'; ctx.fill(); ctx.stroke();
    rr(-66, -6, 132, 26, 6); ctx.fillStyle = '#8344c0'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 16); ctx.lineWidth = 2; ctx.stroke();
    for (const ax of [-78, 56]) { rr(ax, -24, 22, 46, 9); ctx.fillStyle = '#7438ad'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }
}

function drawBolt() {
  if (zapT <= 0 || !zapTarget) return;
  const tx = zapTarget.x, ty = zapTarget.y;
  ctx.save();
  ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 20;
  ctx.lineJoin = 'round';
  for (const [w, col] of [[7, 'rgba(140,210,255,0.6)'], [3, '#fff']]) {
    ctx.beginPath();
    let x = tx + rand(-80, 80), y = -10;
    ctx.moveTo(x, y);
    const segs = 10;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      x = x + (tx - x) * (1 / (segs - i + 1)) + (i < segs ? rand(-25, 25) : 0);
      y = -10 + (ty + 10) * t;
      ctx.lineTo(i === segs ? tx : x, y);
    }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  }
  ctx.restore();
}

function drawPianos() {
  for (const pn of pianos) {
    if (!pn.landed) {
      const warn = Math.max(0, Math.min(1, (pn.y + 300) / (floorY() + 300)));
      ctx.fillStyle = `rgba(0,0,0,${0.15 + warn * 0.25})`;
      ctx.beginPath(); ctx.ellipse(pn.x, floorY() + 4, pn.w / 2 * (0.4 + warn * 0.6), 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, pn.alpha);
    const x = pn.x - pn.w / 2, y = pn.y - pn.h / 2;
    ctx.fillStyle = '#111'; ctx.fillRect(x + 12, y + pn.h - 12, 10, 12); ctx.fillRect(x + pn.w - 22, y + pn.h - 12, 10, 12);
    rr(x, y, pn.w, pn.h - 10, 8); ctx.fillStyle = '#1a1a1a'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 8, y + 6, pn.w - 16, 8);
    const ky = y + pn.h * 0.5, kh = 22;
    ctx.fillStyle = '#f5f5f0'; ctx.fillRect(x + 6, ky, pn.w - 12, kh);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    const keys = 14, kw = (pn.w - 12) / keys;
    for (let i = 1; i < keys; i++) { ctx.beginPath(); ctx.moveTo(x + 6 + i * kw, ky); ctx.lineTo(x + 6 + i * kw, ky + kh); ctx.stroke(); }
    ctx.fillStyle = '#111';
    for (let i = 0; i < keys - 1; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(x + 6 + (i + 1) * kw - kw * 0.3, ky, kw * 0.6, kh * 0.6);
    ctx.restore();
  }
}
