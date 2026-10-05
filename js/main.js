'use strict';
// Simulation step, boot and the game loop

function step() {
  const now = performance.now();
  const fy = floorY(), { g: G, damp } = phys();

  pointer.vx += ((pointer.x - pointer.lastX) - pointer.vx) * 0.5;
  pointer.vy += ((pointer.y - pointer.lastY) - pointer.vy) * 0.5;
  pointer.lastX = pointer.x; pointer.lastY = pointer.y;

  // Get back up when not too beaten up
  const dizzy = pain > 70;
  const canStand = !drag && !dizzy && pain < 35 && now - lastHit > 1500;
  standK = canStand ? Math.min(1, standK + 0.02) : 0;
  if (standK > 0 && G) {
    const footOnFloor = B.lFoot.y > fy - B.lFoot.r - 3 || B.rFoot.y > fy - B.rFoot.r - 3;
    if (footOnFloor) {
      const fx = (B.lFoot.x + B.rFoot.x) / 2, fyy = Math.max(B.lFoot.y, B.rFoot.y);
      pull(B.pelvis, fx, fyy - 70, 0.12 * standK);
      pull(B.neck, B.pelvis.x, B.pelvis.y - 65, 0.08 * standK);
      pull(B.head, B.pelvis.x, B.pelvis.y - 105, 0.12 * standK);
    }
  }

  idling = standK >= 1 && !drag && !heldProp && zapT <= 0 && airlock.t < 0 && now - lastHit > 3000;
  if (idling) stepIdle(fy);
  else { idle.action = 'breathe'; idle.t = 0; idle.dur = 120; }
  if (blinkT > 0) blinkT--; else if (Math.random() < 0.006) blinkT = 7;

  // Integrate
  for (const p of points) {
    if (p.cd > 0) p.cd--;
    if (p === drag) {
      p.px = p.x; p.py = p.y;
      p.x = pointer.x; p.y = pointer.y;
      collideBounds(p, false);
      continue;
    }
    let vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
    const sp = Math.hypot(vx, vy);
    if (sp > MAXV) { vx *= MAXV / sp; vy *= MAXV / sp; }
    p.px = p.x; p.py = p.y;
    p.x += vx; p.y += vy + GRAVITY * G;
  }

  stepAirlock();

  // Wall impacts hurt
  for (const p of points) {
    if (p === drag) continue;
    const imp = collideBounds(p, true);
    if (imp > 9 && p.cd === 0) {
      p.cd = 12;
      const mult = p === B.head ? 1.5 : 1;
      damage(p, (imp - 7) * 1.3 * mult, 'impact');
      sfx.hit(imp / 30);
      burst(p.x, Math.min(p.y + p.r, fy), 4, 'smoke', { speed: 2, life: 30, size: 8 });
    }
  }

  for (let i = 0; i < ITER; i++) {
    for (const s of sticks) solveStick(s);
    for (const p of points) collideBounds(p, false);
  }

  // Bombs
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.vy += 0.6 * G; b.x += b.vx; b.y += b.vy;
    if (b.y > fy - 14) { b.y = fy - 14; b.vy *= -0.3; b.vx *= 0.85; }
    if (b.y < 14) { b.y = 14; b.vy = Math.abs(b.vy) * 0.5; }
    if (b.x < 14 || b.x > W - 14) { b.x = Math.max(14, Math.min(W - 14, b.x)); b.vx *= -0.5; }
    b.fuse--;
    if (b.fuse % 15 === 0) sfx.tick();
    if (b.fuse <= 0) { bombs.splice(i, 1); explode(b); }
  }

  // Pianos
  for (let i = pianos.length - 1; i >= 0; i--) {
    const pn = pianos[i];
    if (!pn.landed) { pn.vy += 0.8 * G; pn.y += pn.vy; }
    if (!pn.hit) {
      const touching = points.some(p =>
        p.x > pn.x - pn.w / 2 - p.r && p.x < pn.x + pn.w / 2 + p.r &&
        p.y > pn.y - pn.h / 2 - p.r && p.y < pn.y + pn.h / 2 + p.r);
      if (touching) {
        pn.hit = true;
        for (const p of points) {
          if (Math.abs(p.x - pn.x) < pn.w / 2 + 40 && p.y > pn.y - pn.h / 2 - 40) {
            const side = Math.sign(p.x - pn.x) || (Math.random() < 0.5 ? -1 : 1);
            p.px -= side * 14; p.py -= 22;
          }
        }
        damage(B.head, rand(50, 65), 'piano');
        sfx.piano(); shake = 30;
      }
    }
    if (!pn.landed && pn.y + pn.h / 2 >= fy) {
      pn.y = fy - pn.h / 2; pn.landed = 1;
      sfx.piano(); shake = Math.max(shake, 15);
      burst(pn.x, fy - 10, 20, 'debris', { speed: 10, life: 60, size: 6, up: 5 });
      burst(pn.x, fy - 10, 10, 'smoke', { speed: 3, life: 60, size: 14 });
    }
    if (pn.landed) {
      pn.landed++;
      if (pn.landed > 60) pn.alpha -= 0.03;
      if (pn.alpha <= 0) pianos.splice(i, 1);
    }
  }

  stepProps(fy);
  stepVikings(fy);

  // Couches
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    c.age++;
    c.vy += c.g; c.x += c.vx; c.y += c.vy; c.rot += c.vr;
    if (!c.hit) {
      const inBox = p => Math.abs(p.x - c.x) < 75 + p.r && Math.abs(p.y - c.y) < 35 + p.r;
      if (points.some(inBox)) {
        c.hit = true;
        let closest = B.pelvis, bd = Infinity;
        for (const p of points) {
          const d = Math.hypot(p.x - c.x, p.y - c.y);
          if (d < bd) { bd = d; closest = p; }
          if (d < 160) { p.px -= c.vx * 0.9; p.py -= c.vy * 0.6 - 5; }
        }
        damage(closest, rand(30, 40), 'couch');
        sfx.thud(); sfx.hit(1);
        burst(closest.x, closest.y, 10, 'debris', { speed: 7, life: 40, size: 4, color: '#c9a2e8' });
        c.vx *= 0.5; c.vy *= 0.5;
      }
    }
    if (c.age > 20) {
      if (c.x < 80) { c.x = 80; c.vx = Math.abs(c.vx) * 0.3; }
      if (c.x > W - 80) { c.x = W - 80; c.vx = -Math.abs(c.vx) * 0.3; }
      if (c.y < 40) { c.y = 40; c.vy = Math.abs(c.vy) * 0.3; }
    }
    if (c.y + 25 > fy) {
      c.y = fy - 25;
      if (!c.landed) {
        c.landed = 1;
        sfx.thud(); shake = Math.max(shake, 18);
        burst(c.x, fy - 5, 12, 'smoke', { speed: 3, life: 50, size: 12 });
      }
      c.vy *= -0.25; c.vx *= 0.85; c.vr = 0;
      c.rot = Math.atan2(Math.sin(c.rot), Math.cos(c.rot)) * 0.8;
    }
    // A couch drifting in zero-g may never land, so fade it out after a while regardless
    if (c.landed) c.landed++;
    if (c.landed > 120 || c.age > 300) c.alpha -= 0.03;
    if (c.alpha <= 0) couches.splice(i, 1);
  }

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.vy += pr.g; pr.x += pr.vx; pr.y += pr.vy; pr.age++; pr.rot += 0.2;
    if (pr.type === 'rocket') {
      burst(pr.x - Math.sign(pr.vx) * 18, pr.y, 1, 'fire', { speed: 1, life: 15, size: 7 });
      if (pr.age % 3 === 0) burst(pr.x - Math.sign(pr.vx) * 22, pr.y, 1, 'smoke', { speed: 0.5, life: 40, size: 6 });
    } else if (pr.type === 'meteor') {
      burst(pr.x, pr.y, 2, 'fire', { speed: 1.5, life: 25, size: 14 });
      burst(pr.x, pr.y, 1, 'smoke', { speed: 0.5, life: 50, size: 12 });
    }
    const body = points.find(p => Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + pr.r);
    const offscreen = pr.type !== 'meteor' && pr.age > 10 && (pr.x < -60 || pr.x > W + 60);
    const hitWorld = pr.y > fy - pr.r || offscreen || pr.age > 400 ||
      (pr.type !== 'meteor' && pr.age > 10 && (pr.x < pr.r || pr.x > W - pr.r));
    if (body || hitWorld) {
      projectiles.splice(i, 1);
      if (!offscreen) projectileHit(pr, body);
    }
  }

  // Electrocution: twitch the whole body and tick damage
  if (zapT > 0) {
    zapT--;
    if (!zapTarget.fake) {
      for (const p of points) { p.px += rand(-3, 3); p.py += rand(-3, 3); }
      if (zapT % 8 === 0) damage(zapTarget, 4, 'zap');
      burst(zapTarget.x, zapTarget.y, 2, 'drop', { speed: 6, life: 15, size: 2, color: '#bfe9ff' });
    } else if (zapT === 11) {
      burst(zapTarget.x, zapTarget.y, 12, 'drop', { speed: 6, life: 20, size: 2, color: '#bfe9ff' });
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    switch (p.type) {
      case 'star': p.vy += 0.25 * G; p.vx *= 0.97; break;
      case 'feather': p.vy = p.vy * 0.9 + 0.08 * G; p.vx *= 0.95; p.x += Math.sin(p.life * 0.2) * 0.8 * G; break;
      case 'smoke': p.vx *= 0.95; p.vy = p.vy * 0.95 - 0.05 * G; p.size += 0.4; break;
      case 'fire': p.vx *= 0.9; p.vy = p.vy * 0.9 - 0.1 * G; break;
      case 'debris':
        p.vy += 0.5 * G;
        if (p.y > fy) { p.y = fy; p.vy *= -0.4; p.vx *= 0.7; }
        break;
      case 'drop':
        p.vy += 0.35 * G;
        if (p.y > fy) { p.y = fy; p.vy = 0; p.vx *= 0.5; }
        break;
    }
    if (p.life >= p.max) particles.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life++; t.y -= 1.2;
    if (t.life >= t.max) texts.splice(i, 1);
  }

  // Timers
  pain = Math.max(0, pain * 0.996 - 0.25);
  if (hurtT > 0) hurtT--;
  bodyFlash *= 0.85; flash *= 0.88; swingT *= 0.8;
  shake = shake < 0.3 ? 0 : shake * 0.85;
  if (speech && ++speech.t > 120) speech = null;

  const isDizzy = pain > 70;
  if (isDizzy && !wasDizzy) say(LINES.dizzy, true);
  wasDizzy = isDizzy;

  if (now - lastHit > 7000 && now - lastIdle > 7000) { lastIdle = now; say(zeroG() ? LINES.space : LINES.idle); }
}

resize();
buildDummy();
buildProps();
updateHud();
updateAirlockBtn();
renderTools();
canvas.style.cursor = 'none';
openMenu();

let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  let n = 0;
  while (acc >= 1000 / 60 && n < 5) { step(); acc -= 1000 / 60; n++; }
  if (n === 5) acc = 0;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
