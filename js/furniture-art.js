'use strict';
// Drawing the throwable furniture

// Each draw function works in local coordinates: centered on the prop, floor at y = h / 2.
function drawBookshelf(w, h) {
  const L = -w / 2, T = -h / 2;
  box(L, T, w, h, '#6b4423', '#3b2412');
  const bookCols = ['#c0392b', '#2e86de', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22'];
  for (let s = 0; s < 3; s++) {
    const sy = T + 12 + s * 60;
    box(L + 6, sy + 48, w - 12, 5, '#3b2412', null);
    for (let i = 0, x = L + 10; x < -L - 18; i++) {
      const bw = 10 + ((i * 7 + s * 3) % 3) * 3, bh = 34 + ((i * 5 + s) % 3) * 5;
      box(x, sy + 48 - bh, bw, bh, bookCols[(i * 3 + s) % bookCols.length], 'rgba(0,0,0,0.3)', 1);
      x += bw + 2;
    }
  }
}

function drawLamp(w, h) {
  const F = h / 2, T = -h / 2;
  const glow = ctx.createRadialGradient(0, T + 50, 5, 0, T + 50, 140);
  glow.addColorStop(0, 'rgba(255,230,150,0.45)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = glow; ctx.fillRect(-140, T - 90, 280, 280);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 5; seg(0, F - 6, 0, T + 50);
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0, F - 4, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f6e3b4'; ctx.beginPath();
  ctx.moveTo(-22, T); ctx.lineTo(22, T); ctx.lineTo(38, T + 50); ctx.lineTo(-38, T + 50);
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a88b4a'; ctx.lineWidth = 2; ctx.stroke();
}

function drawPlant(w, h) {
  const F = h / 2;
  ctx.fillStyle = '#3f8f3f';
  for (const [a, l] of [[-0.6, 60], [-0.2, 75], [0.2, 70], [0.6, 55], [0, 85]]) {
    ctx.save(); ctx.translate(0, F - 50); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -l / 2, 10, l / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#c0663a'; ctx.beginPath();
  ctx.moveTo(-26, F - 55); ctx.lineTo(26, F - 55); ctx.lineTo(18, F); ctx.lineTo(-18, F);
  ctx.closePath(); ctx.fill();
}

function drawWaterCooler(w, h) {
  const F = h / 2;
  box(-26, F - 110, 52, 110, '#e8e8e8', '#999');
  box(-6, F - 80, 12, 8, '#3b82f6', null);
  rr(-22, F - 178, 44, 66, 14); ctx.fillStyle = 'rgba(120,190,255,0.75)'; ctx.fill();
  ctx.strokeStyle = '#5a9bd8'; ctx.lineWidth = 2; ctx.stroke();
}

function drawFilingCabinet(w, h) {
  const F = h / 2;
  box(-36, F - 140, 72, 140, '#8a929e', '#4b525c');
  for (let i = 0; i < 3; i++) {
    box(-30, F - 134 + i * 45, 60, 39, '#9aa2ae', '#4b525c', 2);
    box(-10, F - 120 + i * 45, 20, 5, '#4b525c', null);
  }
}

function drawDesk(w, h) {
  const F = h / 2;
  box(-110, F - 92, 220, 14, '#7a5230', '#3f2a17');
  box(-102, F - 78, 10, 78, '#3f2a17', null);
  box(40, F - 78, 62, 78, '#7a5230', '#3f2a17');
  box(64, F - 64, 14, 4, '#3f2a17', null);
  box(-8, F - 110, 16, 18, '#333', null);
  rr(-50, F - 175, 100, 66, 6); ctx.fillStyle = '#222'; ctx.fill();
  box(-44, F - 169, 88, 54, '#1e3a5f', null);
  ctx.fillStyle = '#7dd3fc';
  for (let i = 0; i < 5; i++) ctx.fillRect(-38 + (i % 2) * 8, F - 162 + i * 9, 30 + ((i * 13) % 35), 4);
  box(-95, F - 112, 18, 20, '#fff', '#888', 2);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-76, F - 102, 6, -Math.PI / 2, Math.PI / 2); ctx.stroke();
}

function drawFridge(w, h) {
  const F = h / 2;
  rr(-50, F - 230, 100, 230, 10); ctx.fillStyle = '#f4f4f4'; ctx.fill();
  ctx.strokeStyle = '#9aa'; ctx.lineWidth = 3; ctx.stroke();
  seg(-50, F - 150, 50, F - 150);
  box(34, F - 200, 6, 36, '#bbb', null); box(34, F - 135, 6, 50, '#bbb', null);
  for (const [mx, my, c] of [[-25, -195, '#e74c3c'], [-5, -175, '#f1c40f'], [-30, -120, '#3498db'], [5, -100, '#2ecc71']]) {
    circle(mx, F + my, 6); ctx.fillStyle = c; ctx.fill();
  }
}

function drawChair(w, h) {
  const F = h / 2, wood = '#9c6b3f', dark = '#5a3a1e';
  box(-26, F - 43, 6, 43, dark, null); box(20, F - 43, 6, 43, dark, null);
  box(-28, F - 52, 56, 9, wood, dark, 2);
  box(14, F - 110, 14, 58, wood, dark, 2);
  box(14, F - 96, 14, 4, dark, null); box(14, F - 80, 14, 4, dark, null);
}

function drawWorkbench(w, h) {
  const F = h / 2;
  box(-125, F - 100, 250, 16, '#8b5a2b', '#4f3218');
  box(-115, F - 84, 12, 84, '#4f3218', null); box(103, F - 84, 12, 84, '#4f3218', null);
  box(-115, F - 30, 230, 8, '#4f3218', null);
  box(60, F - 124, 40, 24, '#3d5a80', '#223', 2);
}

function drawTires(w, h) {
  const F = h / 2;
  for (let i = 0; i < 3; i++) {
    const y = F - 18 - i * 30;
    rr(-45, y - 15, 90, 30, 12); ctx.fillStyle = '#222'; ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.stroke();
  }
}

function drawToolbox(w, h) {
  const F = h / 2;
  rr(-35, F - 34, 70, 34, 5); ctx.fillStyle = '#c0392b'; ctx.fill();
  ctx.strokeStyle = '#7a1f16'; ctx.lineWidth = 2; ctx.stroke();
  box(-35, F - 24, 70, 4, '#7a1f16', null);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-14, F - 34); ctx.lineTo(-14, F - 42); ctx.lineTo(14, F - 42); ctx.lineTo(14, F - 34); ctx.stroke();
  box(-5, F - 28, 10, 8, '#ddd', null);
}

function drawBed(w, h) {
  const F = h / 2, bw = 250;
  rr(-bw / 2 - 10, F - 160, 26, 160, 8); ctx.fillStyle = '#6b4423'; ctx.fill();
  ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3; ctx.stroke();
  box(bw / 2 - 14, F - 90, 18, 90, '#6b4423', '#3b2412');
  box(-bw / 2 + 10, F - 30, bw - 10, 30, '#6b4423', '#3b2412');
  rr(-bw / 2 + 12, F - 72, bw - 14, 42, 12); ctx.fillStyle = '#fafafa'; ctx.fill(); ctx.stroke();
  rr(-bw / 2 + 80, F - 80, bw - 82, 50, 12); ctx.fillStyle = '#4a6fd1'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-bw / 2 + 46, F - 80, 32, 14, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawNightstand(w, h) {
  const F = h / 2;
  box(-32, F - 70, 64, 70, '#8a5a3b', '#3b2412');
  box(-6, F - 45, 12, 5, '#3b2412', null);
  box(-3, F - 105, 6, 35, '#555', null);
  ctx.fillStyle = '#ffd88a'; ctx.beginPath();
  ctx.moveTo(-14, F - 130); ctx.lineTo(14, F - 130); ctx.lineTo(24, F - 100); ctx.lineTo(-24, F - 100);
  ctx.closePath(); ctx.fill();
}

function drawTeddy(w, h) {
  const F = h / 2, fur = '#a0703f', dark = '#6b4423', light = '#d9b38c';
  const ball = (x, y, r, c, outline = true) => {
    circle(x, F + y, r); ctx.fillStyle = c; ctx.fill();
    if (outline) { ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke(); }
  };
  ball(-12, -8, 9, fur); ball(12, -8, 9, fur);
  ball(0, -24, 18, fur); ball(0, -22, 10, light, false);
  ball(-17, -28, 7, fur); ball(17, -28, 7, fur);
  ball(-11, -60, 6, fur); ball(11, -60, 6, fur);
  ball(0, -48, 14, fur); ball(0, -44, 6, light, false);
  ball(0, -46, 2.5, '#222', false); ball(-5, -52, 2, '#222', false); ball(5, -52, 2, '#222', false);
}

function drawCrate(w, h) {
  box(-w / 2, -h / 2, w, h, '#8a93a8', '#3d4354');
  ctx.strokeStyle = '#3d4354'; ctx.lineWidth = 4;
  seg(-w / 2, -h / 2, w / 2, h / 2); seg(w / 2, -h / 2, -w / 2, h / 2);
  box(-w / 2 + 10, -9, w - 20, 18, '#ffd23f', '#1d1d1d', 2);
  ctx.fillStyle = '#1d1d1d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.fillText('SUPPLIES', 0, 1);
}

function drawOxygenTank(w, h) {
  rr(-w / 2, -h / 2 + 16, w, h - 16, w / 2); ctx.fillStyle = '#f0f0f0'; ctx.fill();
  ctx.strokeStyle = '#777'; ctx.lineWidth = 2; ctx.stroke();
  box(-w / 2, -h / 2 + 46, w, 14, '#e67e22', null);
  box(-6, -h / 2 + 4, 12, 14, '#555', null);
  box(-12, -h / 2, 24, 6, '#333', null);
  circle(0, 18, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke();
  ctx.strokeStyle = '#c0392b'; seg(0, 18, 5, 13);
}

function drawHelmet(w, h) {
  const r = w / 2;
  circle(0, 0, r); ctx.fillStyle = '#f4f4f4'; ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.stroke();
  const visor = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.5);
  visor.addColorStop(0, '#ffe08a'); visor.addColorStop(1, '#c47a12');
  ctx.beginPath(); ctx.ellipse(0, -2, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = visor; ctx.fill(); ctx.strokeStyle = '#555'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.18, r * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
  box(-r * 0.55, r * 0.62, r * 1.1, r * 0.3, '#bbb', '#777', 2);
}
