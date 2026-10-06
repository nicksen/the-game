// Wall and floor patterns and the decor painted in each room

import { H, W, box, circle, ctx, rr, seg, star } from './canvas.ts';
import { drawHatch } from './airlock.ts';

export function drawWallPattern(type, fy) {
  ctx.save();
  if (type === 'stripes') {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < W; x += 64) ctx.fillRect(x, -60, 32, fy + 60);
  } else if (type === 'tiles') {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W + 40; x += 40) seg(x, -60, x, fy);
    for (let y = fy; y > -60; y -= 40) seg(-60, y, W + 60, y);
  } else if (type === 'bricks') {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let row = 0, y = fy; y > -60; row++, y -= 26) {
      seg(-60, y, W + 60, y);
      for (let x = row % 2 ? -30 : -60; x < W + 60; x += 60) seg(x, y, x, y - 26);
    }
  } else if (type === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let y = 30, row = 0; y < fy; y += 50, row++)
      for (let x = row % 2 ? 25 : 0; x < W + 50; x += 50) {
        star(x, y, 5, 0);
        ctx.fill();
      }
  } else if (type === 'starfield') {
    // Fixed pseudo-random stars that twinkle
    const t = performance.now() / 700;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 140; i++) {
      const x = (((i * 7919) % 1000) / 1000) * W,
        y = (((i * 104729) % 997) / 997) * fy;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t + i * 1.7));
      circle(x, y, i % 7 === 0 ? 2 : 1.1);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFloorPattern(type, fy) {
  ctx.save();
  if (type === 'planks') {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let y = fy + 24, row = 0; y < H + 60; y += 24, row++) {
      seg(-60, y, W + 60, y);
      for (let x = ((row * 97) % 180) - 60; x < W + 60; x += 180) seg(x, y - 24, x, y);
    }
  } else if (type === 'checker') {
    ctx.fillStyle = '#2f2f2f';
    for (let y = fy, row = 0; y < H + 60; y += 30, row++)
      for (let x = -60 + (row % 2) * 30; x < W + 60; x += 60) ctx.fillRect(x, y, 30, 30);
  } else if (type === 'carpet') {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = fy + 6; y < H + 60; y += 12) for (let x = (y % 24) - 60; x < W + 60; x += 24) ctx.fillRect(x, y, 6, 3);
  } else if (type === 'concrete') {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W + 60; x += 240) seg(x, fy, x - 60, H + 60);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.6, fy + 10);
    ctx.lineTo(W * 0.63, fy + 30);
    ctx.lineTo(W * 0.61, fy + 50);
    ctx.lineTo(W * 0.66, fy + 80);
    ctx.stroke();
  } else if (type === 'grating') {
    // Riveted deck plates
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    for (let y = fy + 36; y < H + 60; y += 36) seg(-60, y, W + 60, y);
    for (let x = 0; x < W + 60; x += 120) seg(x, fy, x, H + 60);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = fy + 6; y < H + 60; y += 36)
      for (let x = 6; x < W + 60; x += 120) {
        circle(x, y, 2);
        ctx.fill();
        circle(x + 108, y, 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

function windowFrame(x, y, w, h, sky) {
  ctx.fillStyle = sky;
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.strokeStyle = '#f5f0e6';
  ctx.lineWidth = 8;
  ctx.strokeRect(x - w / 2, y, w, h);
  ctx.lineWidth = 5;
  seg(x, y, x, y + h);
  seg(x - w / 2, y + h / 2, x + w / 2, y + h / 2);
}

export function decorLiving(fy) {
  // Window with curtains
  const wx = W * 0.16,
    wy = fy * 0.16,
    ww = 170,
    wh = 160;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#6fbfff');
  sky.addColorStop(1, '#d8f0ff');
  windowFrame(wx, wy, ww, wh, sky);
  ctx.fillStyle = '#fff';
  for (const [cx, cy, r] of [
    [-30, 40, 14],
    [-12, 34, 18],
    [8, 40, 13],
  ]) {
    circle(wx + cx, wy + cy, r);
    ctx.fill();
  }
  box(wx - ww / 2 - 34, wy - 18, ww + 68, 7, '#5a3a1e', null);
  ctx.fillStyle = '#b83b3b';
  for (const side of [-1, 1]) {
    const ox = wx + side * (ww / 2 + 30),
      ix = wx + side * (ww / 2 - 22);
    ctx.beginPath();
    ctx.moveTo(ox, wy - 12);
    ctx.lineTo(ix, wy - 12);
    ctx.quadraticCurveTo(wx + side * (ww / 2 - 2), wy + wh * 0.55, wx + side * (ww / 2 - 12), wy + wh + 24);
    ctx.lineTo(ox, wy + wh + 24);
    ctx.closePath();
    ctx.fill();
  }

  // Painting
  const px = W * 0.5,
    py = fy * 0.18;
  box(px - 70, py, 140, 92, '#c9a227', '#7a5c10');
  const art = ctx.createLinearGradient(0, py + 8, 0, py + 84);
  art.addColorStop(0, '#ffcf8a');
  art.addColorStop(1, '#ff8f6b');
  ctx.fillStyle = art;
  ctx.fillRect(px - 60, py + 10, 120, 72);
  circle(px + 25, py + 40, 12);
  ctx.fillStyle = '#fff3b0';
  ctx.fill();
  ctx.fillStyle = '#4f8a3a';
  ctx.beginPath();
  ctx.ellipse(px - 15, py + 82, 70, 28, 0, Math.PI, 0);
  ctx.fill();
}

export function rugLiving(fy) {
  ctx.fillStyle = '#9c2f3f';
  ctx.beginPath();
  ctx.ellipse(W / 2, fy + 38, 280, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e2b04a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(W / 2, fy + 38, 250, 22, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function decorOffice(fy) {
  // Window with blinds
  const wx = W * 0.2,
    wy = fy * 0.14,
    ww = 190,
    wh = 150;
  box(wx - ww / 2, wy, ww, wh, '#cfe8ff', '#e6e6e6', 8);
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 6;
  for (let y = wy + 8; y < wy + wh - 4; y += 11) seg(wx - ww / 2 + 4, y, wx + ww / 2 - 4, y);

  // Wall clock showing the real time
  const cx = W * 0.5,
    cy = fy * 0.17,
    now = new Date();
  circle(cx, cy, 34);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 5;
  ctx.stroke();
  const hand = (a, l, w) => {
    ctx.lineWidth = w;
    seg(cx, cy, cx + Math.sin(a) * l, cy - Math.cos(a) * l);
  };
  ctx.lineCap = 'round';
  hand((((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2, 16, 4);
  hand((now.getMinutes() / 60) * Math.PI * 2, 25, 3);
  ctx.strokeStyle = '#c0392b';
  hand((now.getSeconds() / 60) * Math.PI * 2, 27, 1.5);

  // Motivational poster
  const px = W * 0.8,
    py = fy * 0.24;
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(px - 70, py - 50, 140, 100);
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(px - 62, py - 42, 124, 84);
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('NO PAIN', px, py - 12);
  ctx.fillText('NO GAIN', px, py + 12);
}

export function decorKitchen(fy) {
  // Window above the sink
  const sx = W * 0.74;
  const sky = ctx.createLinearGradient(0, fy - 330, 0, fy - 210);
  sky.addColorStop(0, '#7cc6ff');
  sky.addColorStop(1, '#e0f4ff');
  windowFrame(sx, fy - 330, 150, 120, sky);

  // Upper cabinets
  for (let x = W * 0.86; x < W + 60; x += 80) {
    box(x, fy - 340, 76, 110, '#c58a55', '#7a4f2a');
    circle(x + 10, fy - 245, 3);
    ctx.fillStyle = '#555';
    ctx.fill();
  }

  // Counter with base cabinets, sink and toaster
  const cx0 = W * 0.55;
  for (let x = cx0; x < W + 60; x += 80) {
    box(x, fy - 90, 80, 90, '#c58a55', '#7a4f2a');
    box(x + 30, fy - 70, 20, 5, '#555', null);
  }
  box(cx0 - 6, fy - 102, W - cx0 + 70, 14, '#5d6670', '#3a4048');
  box(sx - 40, fy - 102, 80, 6, '#2b3036', null);
  ctx.strokeStyle = '#aab';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, fy - 102);
  ctx.lineTo(sx, fy - 130);
  ctx.quadraticCurveTo(sx, fy - 140, sx + 14, fy - 134);
  ctx.stroke();
  const tx = cx0 + 50;
  rr(tx - 26, fy - 138, 52, 36, 10);
  ctx.fillStyle = '#c9cdd2';
  ctx.fill();
  ctx.strokeStyle = '#7a7f86';
  ctx.lineWidth = 2;
  ctx.stroke();
  box(tx - 16, fy - 140, 10, 5, '#333', null);
  box(tx + 6, fy - 140, 10, 5, '#333', null);
}

export function decorGarage(fy) {
  // Roll-up door
  const dw = Math.min(W * 0.32, 380),
    dtop = fy - 300;
  box(-60, dtop, dw + 60, fy - dtop, '#d4d4d4', '#888');
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 3;
  for (let y = dtop + 30; y < fy; y += 30) seg(-60, y, dw, y);
  box(dw / 2 - 20, fy - 40, 40, 8, '#666', null);

  // Hanging bulb with light cone
  const bx = W * 0.5;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  seg(bx, -60, bx, fy * 0.2);
  ctx.fillStyle = 'rgba(255,240,180,0.12)';
  ctx.beginPath();
  ctx.moveTo(bx - 10, fy * 0.2);
  ctx.lineTo(bx + 10, fy * 0.2);
  ctx.lineTo(bx + 260, fy);
  ctx.lineTo(bx - 260, fy);
  ctx.closePath();
  ctx.fill();
  circle(bx, fy * 0.2 + 10, 11);
  ctx.fillStyle = '#fff6c2';
  ctx.fill();

  // Pegboard with tools
  const px = W * 0.78,
    py = fy - 300,
    pw = 230,
    ph = 130;
  box(px - pw / 2, py, pw, ph, '#c49a6c', '#8a6a44');
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = py + 12; y < py + ph; y += 16)
    for (let x = px - pw / 2 + 12; x < px + pw / 2; x += 16) {
      circle(x, y, 1.6);
      ctx.fill();
    }
  box(px - 85, py + 30, 8, 70, '#8b5a2b', null);
  box(px - 97, py + 22, 32, 14, '#555', null);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  seg(px - 30, py + 30, px - 30, py + 100);
  circle(px - 30, py + 26, 10);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#9aa';
  ctx.beginPath();
  ctx.moveTo(px + 20, py + 30);
  ctx.lineTo(px + 90, py + 30);
  ctx.lineTo(px + 20, py + 60);
  ctx.closePath();
  ctx.fill();
  box(px + 4, py + 26, 18, 30, '#c0392b', null);
}

export function garageFloor(fy) {
  ctx.fillStyle = 'rgba(20,20,30,0.35)';
  ctx.beginPath();
  ctx.ellipse(W * 0.36, fy + 45, 70, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c33a';
  for (let x = 0; x < W; x += 90) ctx.fillRect(x, fy + 70, 50, 6);
}

export function decorBedroom(fy) {
  // Night window with moon and stars
  const wx = W * 0.2,
    wy = fy * 0.16,
    ww = 170,
    wh = 150;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#0d1b3e');
  sky.addColorStop(1, '#2c3e78');
  windowFrame(wx, wy, ww, wh, sky);
  ctx.fillStyle = '#fff';
  for (const [sx, sy] of [
    [-60, 20],
    [-30, 55],
    [40, 25],
    [62, 60],
    [-55, 110],
    [20, 120],
    [55, 100],
  ]) {
    star(wx + sx, wy + sy, 3, 0);
    ctx.fill();
  }
  circle(wx - 30, wy + 100, 18);
  ctx.fillStyle = '#fdf3c0';
  ctx.fill();
  circle(wx - 22, wy + 94, 16);
  ctx.fillStyle = '#1f2f60';
  ctx.fill();

  // Framed heart
  const hx = W * 0.5,
    hy = fy * 0.2;
  box(hx - 45, hy, 90, 80, '#f7f1ff', '#6a5a99', 6);
  ctx.fillStyle = '#e84a7f';
  ctx.beginPath();
  ctx.moveTo(hx, hy + 62);
  ctx.bezierCurveTo(hx - 40, hy + 36, hx - 22, hy + 6, hx, hy + 24);
  ctx.bezierCurveTo(hx + 22, hy + 6, hx + 40, hy + 36, hx, hy + 62);
  ctx.fill();
}

export function rugBedroom(fy) {
  ctx.fillStyle = '#f2d4e0';
  ctx.beginPath();
  ctx.ellipse(W / 2, fy + 38, 220, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0b3c6';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.ellipse(W / 2, fy + 38, 196, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function decorSpace(fy) {
  // Ringed planet
  const px = W * 0.78,
    py = fy * 0.36,
    pr = Math.min(W, fy) * 0.17;
  const ring = (start, end) => {
    ctx.beginPath();
    ctx.ellipse(px, py, pr * 1.9, pr * 0.42, -0.35, start, end);
    ctx.strokeStyle = 'rgba(240,200,140,0.85)';
    ctx.lineWidth = pr * 0.14;
    ctx.stroke();
  };
  ring(Math.PI, Math.PI * 2);
  const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
  pg.addColorStop(0, '#ffb36b');
  pg.addColorStop(1, '#a8434f');
  circle(px, py, pr);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.save();
  circle(px, py, pr);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (const dy of [-0.45, 0.05, 0.5]) ctx.fillRect(px - pr, py + dy * pr, pr * 2, pr * 0.16);
  ctx.restore();
  ring(0, Math.PI);

  // Cratered moon
  const mx = W * 0.14,
    my = fy * 0.2;
  circle(mx, my, 30);
  ctx.fillStyle = '#cfd3dc';
  ctx.fill();
  ctx.fillStyle = '#a9aebb';
  for (const [cx, cy, r] of [
    [-10, -8, 7],
    [11, 5, 5],
    [-3, 14, 4],
  ]) {
    circle(mx + cx, my + cy, r);
    ctx.fill();
  }

  // Window struts of the observation deck, with a blinking warning light
  for (const x of [W * 0.34, W * 0.66]) {
    box(x - 10, -60, 20, fy + 60, '#5d6580', '#2f3446', 3);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x - 6, -60, 4, fy + 60);
  }
  box(-60, -60, W + 120, 82, '#5d6580', '#2f3446', 3);
  const on = Math.floor(performance.now() / 600) % 2 === 0;
  circle(W * 0.34, 36, 7);
  ctx.fillStyle = on ? '#ff3b3b' : '#5a1a1a';
  ctx.fill();

  // ZERO-G sign
  const sx = W * 0.66,
    sy = fy * 0.42;
  box(sx - 46, sy - 16, 92, 32, '#ffd23f', '#1d1d1d', 3);
  ctx.fillStyle = '#1d1d1d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('⚠ ZERO-G', sx, sy + 1);

  drawHatch();
}

export function spaceFloor(fy) {
  // Hazard stripes along the edge of the deck and a glowing guide light
  ctx.save();
  ctx.beginPath();
  ctx.rect(-60, fy, W + 120, 12);
  ctx.clip();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-60, fy, W + 120, 12);
  ctx.fillStyle = '#1d1d1d';
  for (let x = -60; x < W + 60; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, fy + 12);
    ctx.lineTo(x + 12, fy);
    ctx.lineTo(x + 24, fy);
    ctx.lineTo(x + 12, fy + 12);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(90,220,255,0.55)';
  ctx.fillRect(-60, fy + 60, W + 120, 4);
}
