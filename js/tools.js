'use strict';
// The toolbar weapons and what happens when you use them

const TOOLS = [
  { id: 'grab', icon: '✋', name: 'Grab', price: 0, key: '1' },
  { id: 'punch', icon: '👊', name: 'Punch', price: 0, key: '2' },
  { id: 'chicken', icon: '🐔', name: 'Chicken', price: 0, key: '3' },
  { id: 'fish', icon: '🐟', name: 'Fish', price: 40, key: '4' },
  { id: 'tomato', icon: '🍅', name: 'Tomato', price: 75, key: '5' },
  { id: 'bat', icon: '🏏', name: 'Bat', price: 100, key: '6' },
  { id: 'hammer', icon: '🔨', name: 'Hammer', price: 150, key: '7' },
  { id: 'bomb', icon: '💣', name: 'Bomb', price: 250, key: '8' },
  { id: 'zap', icon: '⚡', name: 'Zap', price: 350, key: '9' },
  { id: 'piano', icon: '🎹', name: 'Piano', price: 500, key: '0' },
  { id: 'couch', icon: '🛋️', name: 'Couch', price: 600, key: 'c' },
  { id: 'rocket', icon: '🚀', name: 'Rocket', price: 750, key: '-' },
  { id: 'vikings', icon: '⚔️', name: 'Vikings', price: 900, key: 'v', earthOnly: true },
  { id: 'meteor', icon: '☄️', name: 'Meteor', price: 1200, key: '=' },
];
function nearestPoint(x, y) {
  let best = null, bd = Infinity;
  for (const p of points) {
    const d = Math.hypot(p.x - x, p.y - y) - p.r;
    if (d < bd) { bd = d; best = p; }
  }
  return { p: best, d: bd };
}

function strike(reach, force, dmg, kind, dir = null) {
  const { p, d } = nearestPoint(pointer.x, pointer.y);
  if (!p || d > reach) { sfx.swoosh(); return; }
  let dx, dy, m;
  if (dir) {
    [dx, dy] = dir;
  } else {
    const cx = (B.neck.x + B.pelvis.x) / 2, cy = (B.neck.y + B.pelvis.y) / 2;
    dx = (p.x - pointer.x) + (cx - pointer.x) * 0.5 + pointer.vx * 2;
    dy = (p.y - pointer.y) + (cy - pointer.y) * 0.5 + pointer.vy * 2;
    m = Math.hypot(dx, dy);
    if (m < 4) { dx = Math.random() < 0.5 ? -1 : 1; dy = 0; m = 1; }
    dx /= m; dy = dy / m - 0.35;
  }
  m = Math.hypot(dx, dy); dx /= m; dy /= m;

  for (const q of points) { q.px -= dx * force * 0.3; q.py -= dy * force * 0.3; }
  p.px -= dx * force; p.py -= dy * force;

  const mult = p === B.head ? 1.5 : 1;
  damage(p, dmg * mult * rand(0.8, 1.2), kind);
  if (kind === 'chicken') {
    sfx.squeak();
    burst(p.x, p.y, 8, 'feather', { speed: 4, life: 70, size: 6 });
  } else if (kind === 'fish') {
    sfx.slap();
    burst(p.x, p.y, 12, 'drop', { speed: 5, life: 40, size: 3, up: 2, color: '#7fd4ff' });
  } else if (kind === 'hammer') {
    sfx.clang();
  } else {
    sfx.hit(kind === 'bat' ? 1 : 0.6);
    if (kind === 'bat') sfx.bonk();
  }
}

function launch(type, sx, sy, vx, vy, g, r, extra = {}) {
  projectiles.push({ type, x: sx, y: sy, vx, vy, g, r, age: 0, rot: 0, ...extra });
}

function zap() {
  const { p, d } = nearestPoint(pointer.x, pointer.y);
  sfx.zap();
  if (p && d < 60) {
    zapT = 50; zapTarget = p;
  } else {
    zapT = 12; zapTarget = { x: pointer.x, y: floorY(), r: 0, fake: true };
  }
}

function useTool() {
  swingT = 1;
  switch (tool) {
    case 'grab': {
      const { p, d } = nearestPoint(pointer.x, pointer.y);
      if (p && d < 30) {
        drag = p;
        canvas.style.cursor = 'grabbing';
        if (Math.random() < 0.5) say(LINES.grab);
      } else {
        const pr = [...props].reverse().find(o => inProp(o, pointer.x, pointer.y, 6));
        if (pr) {
          heldProp = pr; pr.gx = pr.x - pointer.x; pr.gy = pr.y - pointer.y;
          canvas.style.cursor = 'grabbing';
        }
      }
      break;
    }
    case 'punch': strike(30, 16, 7, 'punch'); break;
    case 'bat': strike(50, 32, 16, 'bat'); break;
    case 'chicken': strike(40, 9, 3, 'chicken'); break;
    case 'fish': strike(40, 14, 5, 'fish'); break;
    case 'hammer': strike(50, 30, 20, 'hammer', [rand(-0.2, 0.2), 1]); break;
    case 'zap': zap(); break;
    case 'tomato': {
      // Lobbed from the nearest side of the room toward the click
      const sx = pointer.x < W / 2 ? -20 : W + 20, sy = floorY() - 160, g = 0.4 * phys().g;
      const T = Math.max(20, Math.hypot(pointer.x - sx, pointer.y - sy) / 18);
      launch('tomato', sx, sy, (pointer.x - sx) / T, (pointer.y - sy) / T - 0.5 * g * T, g, 10);
      sfx.swoosh();
      break;
    }
    case 'couch': {
      // Heaved in from the nearest side, tumbling end over end
      const sx = pointer.x < W / 2 ? -90 : W + 90, sy = floorY() - 260, g = 0.5 * phys().g;
      const T = Math.max(25, Math.hypot(pointer.x - sx, pointer.y - sy) / 16);
      const vx = (pointer.x - sx) / T;
      couches.push({ x: sx, y: sy, vx, vy: (pointer.y - sy) / T - 0.5 * g * T, g,
        rot: 0, vr: Math.sign(vx) * 0.09, hit: false, landed: 0, alpha: 1, age: 0 });
      sfx.swoosh();
      break;
    }
    case 'rocket': {
      // Fired from the far side of the room at the click height
      const fromLeft = pointer.x > W / 2;
      launch('rocket', fromLeft ? -40 : W + 40, pointer.y, fromLeft ? 20 : -20, 0, 0, 10);
      sfx.rocket();
      break;
    }
    case 'meteor': {
      const tx = pointer.x, ty = floorY(), sx = tx + (tx < W / 2 ? 350 : -350), sy = -120;
      const m = Math.hypot(tx - sx, ty - sy);
      launch('meteor', sx, sy, (tx - sx) / m * 16, (ty - sy) / m * 16, 0, 26, { tx });
      sfx.meteor();
      break;
    }
    case 'vikings': {
      // A horde charges in from the edge nearest the click and runs across the floor
      const dir = pointer.x < W / 2 ? 1 : -1, x0 = dir > 0 ? -60 : W + 60;
      const n = Math.max(0, Math.min(8, 30 - vikings.length));
      for (let i = 0, x = x0; i < n; i++, x -= dir * rand(45, 65)) {
        vikings.push({ x, dir, speed: rand(5, 6.5), phase: rand(0, 6), depth: rand(-6, 10), scale: rand(0.85, 1.05),
          weapon: pick(['axe', 'sword', 'spear']), tunic: pick(['#8b3a2e', '#3b5f8a', '#4f7a3a', '#7a5a2e']),
          beard: pick(['#d9772b', '#e8c766', '#6b3f1f', '#b23a1a']), shield: pick(['#c0392b', '#2e6fb5', '#d4a017']),
          swing: 0, hit: false });
      }
      if (n) { sfx.warcry(); say(LINES.vikings, true); }
      break;
    }
    case 'bomb':
      bombs.push({ x: pointer.x, y: Math.min(pointer.y, floorY() - 14), vx: pointer.vx * 0.5,
        vy: zeroG() ? pointer.vy * 0.5 : 0, fuse: 100 });
      sfx.tick();
      break;
    case 'piano':
      // Without gravity to speed it up, the piano gets a harder shove
      pianos.push({ x: pointer.x, y: -120, vy: zeroG() ? 10 : 2, w: 150, h: 100, hit: false, landed: 0, alpha: 1 });
      sfx.swoosh();
      break;
  }
}

function explode(b, R = 280, F = 42, kind = 'bomb') {
  let maxF = 0, closest = B.pelvis;
  for (const p of points) {
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d < R) {
      const f = (1 - d / R) * F;
      p.px -= dx / d * f;
      p.py -= dy / d * f - f * 0.3;
      if (f > maxF) { maxF = f; closest = p; }
    }
  }
  if (maxF > 0) damage(closest, maxF * 1.6, kind);
  for (const p of props) {
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d < R && p !== heldProp) {
      const f = (1 - d / R) * F * 0.6 / p.mass;
      p.vx += dx / d * f; p.vy += dy / d * f - f * 0.5; p.va += rand(-0.15, 0.15);
    }
  }
  for (const o of bombs) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < R) o.fuse = Math.min(o.fuse, 6);
  const scale = R / 280;
  burst(b.x, b.y, 40 * scale, 'fire', { speed: 9 * scale, life: 30, size: 14 * scale });
  burst(b.x, b.y, 18 * scale, 'smoke', { speed: 3 * scale, life: 70, size: 16 * scale, up: 1 });
  burst(b.x, b.y, 14 * scale, 'debris', { speed: 12 * scale, life: 60, size: 5, up: 4 });
  addText(b.x, b.y - 60, kind === 'meteor' ? 'KRAKOOM!' : 'KA-BOOM!', '#ff7b00', 56 * Math.sqrt(scale), rand(-0.2, 0.2));
  shake = 35 * scale; flash = Math.min(1, 0.8 * scale);
  sfx.boom();
}

function projectileHit(pr, p) {
  switch (pr.type) {
    case 'tomato':
      if (p) {
        p.px -= pr.vx * 0.5; p.py -= pr.vy * 0.5;
        damage(p, 4, 'tomato');
      }
      burst(pr.x, pr.y, 16, 'drop', { speed: 5, life: 45, size: 4, up: 2, color: '#e8322a' });
      sfx.splat();
      break;
    case 'rocket': explode(pr, 260, 45, 'rocket'); break;
    case 'meteor': explode(pr, 420, 60, 'meteor'); break;
  }
}

// Some tools make no sense without gravity
const offHere = t => t.earthOnly && zeroG();
