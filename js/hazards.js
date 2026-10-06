'use strict';
// Things the tools throw, drop or fire: bombs, pianos, couches, projectiles and lightning

// ---------- Bombs ----------
function dropBomb() {
  bombs.push({
    x: pointer.x,
    y: Math.min(pointer.y, floorY() - 14),
    vx: pointer.vx * 0.5,
    vy: zeroG() ? pointer.vy * 0.5 : 0,
    fuse: 100,
  });
  sfx.tick();
}

function stepBombs(fy) {
  const g = phys().g;
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.vy += 0.6 * g;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > fy - 14) {
      b.y = fy - 14;
      b.vy *= -0.3;
      b.vx *= 0.85;
    }
    if (b.y < 14) {
      b.y = 14;
      b.vy = Math.abs(b.vy) * 0.5;
    }
    if (b.x < 14 || b.x > W - 14) {
      b.x = Math.max(14, Math.min(W - 14, b.x));
      b.vx *= -0.5;
    }
    b.fuse--;
    if (b.fuse % 15 === 0) sfx.tick();
    if (b.fuse <= 0) {
      bombs.splice(i, 1);
      explode(b);
    }
  }
}

function drawBombs() {
  for (const b of bombs) {
    drawShadow(b.x, floorY() - b.y, 14);
    const blink = b.fuse < 40 && Math.floor(b.fuse / 4) % 2 === 0;
    circle(b.x, b.y, 14);
    ctx.fillStyle = blink ? '#c0392b' : '#222';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    circle(b.x - 5, b.y - 5, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(b.x + 6, b.y - 11);
    ctx.quadraticCurveTo(b.x + 14, b.y - 22, b.x + 10, b.y - 26);
    ctx.strokeStyle = '#8b6b3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    star(b.x + 10, b.y - 27, rand(4, 7), Math.random() * 6);
    ctx.fillStyle = pick(['#ffd23f', '#ff7b00', '#fff']);
    ctx.fill();
  }
}

// Blasts the dummy and furniture away from `b`, and sets off other bombs in range.
function explode(b, R = 280, F = 42, kind = 'bomb') {
  let maxF = 0,
    closest = B.pelvis;
  for (const p of points) {
    const dx = p.x - b.x,
      dy = p.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    if (d < R) {
      const f = (1 - d / R) * F;
      p.px -= (dx / d) * f;
      p.py -= (dy / d) * f - f * 0.3;
      if (f > maxF) {
        maxF = f;
        closest = p;
      }
    }
  }
  if (maxF > 0) damage(closest, maxF * 1.6, kind);
  for (const p of props) {
    const dx = p.x - b.x,
      dy = p.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    if (d < R && p !== heldProp) {
      const f = ((1 - d / R) * F * 0.6) / p.mass;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f - f * 0.5;
      p.va += rand(-0.15, 0.15);
    }
  }
  for (const o of bombs) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < R) o.fuse = Math.min(o.fuse, 6);
  const scale = R / 280;
  burst(b.x, b.y, 40 * scale, 'fire', { speed: 9 * scale, life: 30, size: 14 * scale });
  burst(b.x, b.y, 18 * scale, 'smoke', { speed: 3 * scale, life: 70, size: 16 * scale, up: 1 });
  burst(b.x, b.y, 14 * scale, 'debris', { speed: 12 * scale, life: 60, size: 5, up: 4 });
  addText(
    b.x,
    b.y - 60,
    kind === 'meteor' ? 'KRAKOOM!' : 'KA-BOOM!',
    '#ff7b00',
    56 * Math.sqrt(scale),
    rand(-0.2, 0.2),
  );
  screenFx.shake = 35 * scale;
  screenFx.flash = Math.min(1, 0.8 * scale);
  sfx.boom();
}

// ---------- Pianos ----------
function dropPiano() {
  // Without gravity to speed it up, the piano gets a harder shove
  pianos.push({ x: pointer.x, y: -120, vy: zeroG() ? 10 : 2, w: 150, h: 100, hit: false, landed: 0, alpha: 1 });
  sfx.swoosh();
}

function stepPianos(fy) {
  const g = phys().g;
  for (let i = pianos.length - 1; i >= 0; i--) {
    const pn = pianos[i];
    if (!pn.landed) {
      pn.vy += 0.8 * g;
      pn.y += pn.vy;
    }
    if (!pn.hit) {
      const touching = points.some(
        (p) =>
          p.x > pn.x - pn.w / 2 - p.r &&
          p.x < pn.x + pn.w / 2 + p.r &&
          p.y > pn.y - pn.h / 2 - p.r &&
          p.y < pn.y + pn.h / 2 + p.r,
      );
      if (touching) {
        pn.hit = true;
        for (const p of points) {
          if (Math.abs(p.x - pn.x) < pn.w / 2 + 40 && p.y > pn.y - pn.h / 2 - 40) {
            const side = Math.sign(p.x - pn.x) || (Math.random() < 0.5 ? -1 : 1);
            p.px -= side * 14;
            p.py -= 22;
          }
        }
        damage(B.head, rand(50, 65), 'piano');
        sfx.piano();
        screenFx.shake = 30;
      }
    }
    if (!pn.landed && pn.y + pn.h / 2 >= fy) {
      pn.y = fy - pn.h / 2;
      pn.landed = 1;
      sfx.piano();
      screenFx.shake = Math.max(screenFx.shake, 15);
      burst(pn.x, fy - 10, 20, 'debris', { speed: 10, life: 60, size: 6, up: 5 });
      burst(pn.x, fy - 10, 10, 'smoke', { speed: 3, life: 60, size: 14 });
    }
    if (pn.landed) {
      pn.landed++;
      if (pn.landed > 60) pn.alpha -= 0.03;
      if (pn.alpha <= 0) pianos.splice(i, 1);
    }
  }
}

function drawPianos() {
  for (const pn of pianos) {
    if (!pn.landed) {
      const warn = Math.max(0, Math.min(1, (pn.y + 300) / (floorY() + 300)));
      ctx.fillStyle = `rgba(0,0,0,${0.15 + warn * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(pn.x, floorY() + 4, (pn.w / 2) * (0.4 + warn * 0.6), 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, pn.alpha);
    const x = pn.x - pn.w / 2,
      y = pn.y - pn.h / 2;
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 12, y + pn.h - 12, 10, 12);
    ctx.fillRect(x + pn.w - 22, y + pn.h - 12, 10, 12);
    rr(x, y, pn.w, pn.h - 10, 8);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 8, y + 6, pn.w - 16, 8);
    const ky = y + pn.h * 0.5,
      kh = 22;
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(x + 6, ky, pn.w - 12, kh);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    const keys = 14,
      kw = (pn.w - 12) / keys;
    for (let i = 1; i < keys; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6 + i * kw, ky);
      ctx.lineTo(x + 6 + i * kw, ky + kh);
      ctx.stroke();
    }
    ctx.fillStyle = '#111';
    for (let i = 0; i < keys - 1; i++)
      if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(x + 6 + (i + 1) * kw - kw * 0.3, ky, kw * 0.6, kh * 0.6);
    ctx.restore();
  }
}

// ---------- Couches ----------
function throwCouch() {
  // Heaved in from the nearest side, tumbling end over end
  const sx = pointer.x < W / 2 ? -90 : W + 90,
    sy = floorY() - 260,
    g = 0.5 * phys().g;
  const T = Math.max(25, Math.hypot(pointer.x - sx, pointer.y - sy) / 16);
  const vx = (pointer.x - sx) / T;
  couches.push({
    x: sx,
    y: sy,
    vx,
    vy: (pointer.y - sy) / T - 0.5 * g * T,
    g,
    rot: 0,
    vr: Math.sign(vx) * 0.09,
    hit: false,
    landed: 0,
    alpha: 1,
    age: 0,
  });
  sfx.swoosh();
}

function stepCouches(fy) {
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    c.age++;
    c.vy += c.g;
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.vr;
    if (!c.hit) {
      const inBox = (p) => Math.abs(p.x - c.x) < 75 + p.r && Math.abs(p.y - c.y) < 35 + p.r;
      if (points.some(inBox)) {
        c.hit = true;
        let closest = B.pelvis,
          bd = Infinity;
        for (const p of points) {
          const d = Math.hypot(p.x - c.x, p.y - c.y);
          if (d < bd) {
            bd = d;
            closest = p;
          }
          if (d < 160) {
            p.px -= c.vx * 0.9;
            p.py -= c.vy * 0.6 - 5;
          }
        }
        damage(closest, rand(30, 40), 'couch');
        sfx.thud();
        sfx.hit(1);
        burst(closest.x, closest.y, 10, 'debris', { speed: 7, life: 40, size: 4, color: '#c9a2e8' });
        c.vx *= 0.5;
        c.vy *= 0.5;
      }
    }
    if (c.age > 20) {
      if (c.x < 80) {
        c.x = 80;
        c.vx = Math.abs(c.vx) * 0.3;
      }
      if (c.x > W - 80) {
        c.x = W - 80;
        c.vx = -Math.abs(c.vx) * 0.3;
      }
      if (c.y < 40) {
        c.y = 40;
        c.vy = Math.abs(c.vy) * 0.3;
      }
    }
    if (c.y + 25 > fy) {
      c.y = fy - 25;
      if (!c.landed) {
        c.landed = 1;
        sfx.thud();
        screenFx.shake = Math.max(screenFx.shake, 18);
        burst(c.x, fy - 5, 12, 'smoke', { speed: 3, life: 50, size: 12 });
      }
      c.vy *= -0.25;
      c.vx *= 0.85;
      c.vr = 0;
      c.rot = Math.atan2(Math.sin(c.rot), Math.cos(c.rot)) * 0.8;
    }
    // A couch drifting in zero-g may never land, so fade it out after a while regardless
    if (c.landed) c.landed++;
    if (c.landed > 120 || c.age > 300) c.alpha -= 0.03;
    if (c.alpha <= 0) couches.splice(i, 1);
  }
}

function drawCouches() {
  for (const c of couches) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.strokeStyle = '#2b1240';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(-62, 18, 8, 9);
    ctx.fillRect(54, 18, 8, 9);
    rr(-66, -36, 132, 34, 10);
    ctx.fillStyle = '#6a2fa0';
    ctx.fill();
    ctx.stroke();
    rr(-66, -6, 132, 26, 6);
    ctx.fillStyle = '#8344c0';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, 16);
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const ax of [-78, 56]) {
      rr(ax, -24, 22, 46, 9);
      ctx.fillStyle = '#7438ad';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- Projectiles: tomatoes, rockets and meteors ----------
function launch(type, sx, sy, vx, vy, g, r, extra = {}) {
  projectiles.push({ type, x: sx, y: sy, vx, vy, g, r, age: 0, rot: 0, ...extra });
}

function throwTomato() {
  // Lobbed from the nearest side of the room toward the click
  const sx = pointer.x < W / 2 ? -20 : W + 20,
    sy = floorY() - 160,
    g = 0.4 * phys().g;
  const T = Math.max(20, Math.hypot(pointer.x - sx, pointer.y - sy) / 18);
  launch('tomato', sx, sy, (pointer.x - sx) / T, (pointer.y - sy) / T - 0.5 * g * T, g, 10);
  sfx.swoosh();
}

function fireRocket() {
  // Fired from the far side of the room at the click height
  const fromLeft = pointer.x > W / 2;
  launch('rocket', fromLeft ? -40 : W + 40, pointer.y, fromLeft ? 20 : -20, 0, 0, 10);
  sfx.rocket();
}

function dropMeteor() {
  const tx = pointer.x,
    ty = floorY(),
    sx = tx + (tx < W / 2 ? 350 : -350),
    sy = -120;
  const m = Math.hypot(tx - sx, ty - sy);
  launch('meteor', sx, sy, ((tx - sx) / m) * 16, ((ty - sy) / m) * 16, 0, 26, { tx });
  sfx.meteor();
}

function stepProjectiles(fy) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.vy += pr.g;
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.age++;
    pr.rot += 0.2;
    if (pr.type === 'rocket') {
      burst(pr.x - Math.sign(pr.vx) * 18, pr.y, 1, 'fire', { speed: 1, life: 15, size: 7 });
      if (pr.age % 3 === 0) burst(pr.x - Math.sign(pr.vx) * 22, pr.y, 1, 'smoke', { speed: 0.5, life: 40, size: 6 });
    } else if (pr.type === 'meteor') {
      burst(pr.x, pr.y, 2, 'fire', { speed: 1.5, life: 25, size: 14 });
      burst(pr.x, pr.y, 1, 'smoke', { speed: 0.5, life: 50, size: 12 });
    }
    const body = points.find((p) => Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + pr.r);
    const offscreen = pr.type !== 'meteor' && pr.age > 10 && (pr.x < -60 || pr.x > W + 60);
    const hitWorld =
      pr.y > fy - pr.r ||
      offscreen ||
      pr.age > 400 ||
      (pr.type !== 'meteor' && pr.age > 10 && (pr.x < pr.r || pr.x > W - pr.r));
    if (body || hitWorld) {
      projectiles.splice(i, 1);
      if (!offscreen) projectileHit(pr, body);
    }
  }
}

function projectileHit(pr, p) {
  switch (pr.type) {
    case 'tomato':
      if (p) {
        p.px -= pr.vx * 0.5;
        p.py -= pr.vy * 0.5;
        damage(p, 4, 'tomato');
      }
      burst(pr.x, pr.y, 16, 'drop', { speed: 5, life: 45, size: 4, up: 2, color: '#e8322a' });
      sfx.splat();
      break;
    case 'rocket':
      explode(pr, 260, 45, 'rocket');
      break;
    case 'meteor':
      explode(pr, 420, 60, 'meteor');
      break;
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    if (pr.type === 'tomato') {
      ctx.rotate(pr.rot);
      circle(0, 0, pr.r);
      ctx.fillStyle = '#e8322a';
      ctx.fill();
      ctx.strokeStyle = '#8a1510';
      ctx.lineWidth = 2;
      ctx.stroke();
      star(0, -pr.r + 2, 6, 0);
      ctx.fillStyle = '#3c9a2e';
      ctx.fill();
      circle(-3, -3, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    } else if (pr.type === 'rocket') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-18, -6);
      ctx.lineTo(-26, -13);
      ctx.lineTo(-12, -6);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-18, 6);
      ctx.lineTo(-26, 13);
      ctx.lineTo(-12, 6);
      ctx.fill();
      rr(-20, -6, 34, 12, 4);
      ctx.fillStyle = '#d9d9d9';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, -6);
      ctx.lineTo(26, 0);
      ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fillStyle = '#c0392b';
      ctx.fill();
      ctx.stroke();
    } else if (pr.type === 'meteor') {
      ctx.rotate(pr.rot * 0.3);
      ctx.shadowColor = '#ff7b00';
      ctx.shadowBlur = 30;
      circle(0, 0, pr.r);
      ctx.fillStyle = '#6b4a2b';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#4a321c';
      for (const [cx, cy, cr] of [
        [-8, -6, 6],
        [9, 4, 5],
        [-2, 12, 4],
      ]) {
        circle(cx, cy, cr);
        ctx.fill();
      }
    }
    ctx.restore();

    if (pr.type === 'meteor') {
      // Landing target on the floor
      const fy = floorY();
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.sin(pr.age * 0.4)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(pr.tx, fy + 4, 90, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------- Lightning ----------
let zapT = 0,
  zapTarget = null;
function stopZap() {
  zapT = 0;
}

// Electrocutes the body part near the pointer, or just strikes the floor if nothing is close.
function zap() {
  const { p, d } = nearestPoint(pointer.x, pointer.y);
  sfx.zap();
  if (p && d < 60) {
    zapT = 50;
    zapTarget = p;
  } else {
    zapT = 12;
    zapTarget = { x: pointer.x, y: floorY(), r: 0, fake: true };
  }
}

// Electrocution: twitch the whole body and tick damage
function stepZap() {
  if (zapT <= 0) return;
  zapT--;
  if (!zapTarget.fake) {
    for (const p of points) {
      p.px += rand(-3, 3);
      p.py += rand(-3, 3);
    }
    if (zapT % 8 === 0) damage(zapTarget, 4, 'zap');
    burst(zapTarget.x, zapTarget.y, 2, 'drop', { speed: 6, life: 15, size: 2, color: '#bfe9ff' });
  } else if (zapT === 11) {
    burst(zapTarget.x, zapTarget.y, 12, 'drop', { speed: 6, life: 20, size: 2, color: '#bfe9ff' });
  }
}

function drawBolt() {
  if (zapT <= 0 || !zapTarget) return;
  const tx = zapTarget.x,
    ty = zapTarget.y;
  ctx.save();
  ctx.shadowColor = '#8fd8ff';
  ctx.shadowBlur = 20;
  ctx.lineJoin = 'round';
  for (const [w, col] of [
    [7, 'rgba(140,210,255,0.6)'],
    [3, '#fff'],
  ]) {
    ctx.beginPath();
    let x = tx + rand(-80, 80),
      y = -10;
    ctx.moveTo(x, y);
    const segs = 10;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      x = x + (tx - x) * (1 / (segs - i + 1)) + (i < segs ? rand(-25, 25) : 0);
      y = -10 + (ty + 10) * t;
      ctx.lineTo(i === segs ? tx : x, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
}
