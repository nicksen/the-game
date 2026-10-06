// The dummy: a verlet ragdoll that stands itself back up and idles

import { W, floorY, pick, rand } from './canvas.ts';
import { sfx } from './audio.ts';
import { GRAVITY, ITER, MAXV, phys, zeroG } from './physics.ts';
import { LINES, damage, drag, heldProp, idle, isDizzy, lastHit, pain, pointer, say } from './state.ts';
import { burst } from './effects.ts';
import { zapT } from './hazards.ts';
import { airlock } from './airlock.ts';

export let points = [],
  sticks = [];
export let standK = 0,
  idling = false,
  blinkT = 0;
export const B = {};

export function buildDummy() {
  points = [];
  sticks = [];
  // In zero-g the dummy starts floating mid-room with a lazy drift
  const float = zeroG(),
    cx = W / 2,
    fy = floorY() - (float ? 160 : 0);
  const mk = (name, dx, dy, r) => {
    const p = { x: cx + dx, y: fy + dy, px: cx + dx + (float ? 0.5 : 0), py: fy + dy - (float ? 0.2 : 0), r, cd: 0 };
    points.push(p);
    B[name] = p;
  };
  mk('head', 0, -185, 28);
  mk('neck', 0, -145, 16);
  mk('pelvis', 0, -80, 18);
  mk('lElbow', -32, -115, 9);
  mk('lHand', -42, -82, 11);
  mk('rElbow', 32, -115, 9);
  mk('rHand', 42, -82, 11);
  mk('lKnee', -14, -42, 10);
  mk('lFoot', -16, -11, 11);
  mk('rKnee', 14, -42, 10);
  mk('rFoot', 16, -11, 11);

  // minRatio: only push apart when closer than len * minRatio (keeps limbs from folding flat)
  const s = (a, b, stiff = 1, minRatio = 0) => {
    const len = Math.hypot(B[a].x - B[b].x, B[a].y - B[b].y);
    sticks.push({ a: B[a], b: B[b], len: minRatio ? len * minRatio : len, stiff, min: !!minRatio });
  };
  s('head', 'neck');
  s('neck', 'pelvis');
  s('head', 'pelvis', 0.6);
  s('neck', 'lElbow');
  s('lElbow', 'lHand');
  s('neck', 'rElbow');
  s('rElbow', 'rHand');
  s('pelvis', 'lKnee');
  s('lKnee', 'lFoot');
  s('pelvis', 'rKnee');
  s('rKnee', 'rFoot');
  s('neck', 'lHand', 0.3, 0.6);
  s('neck', 'rHand', 0.3, 0.6);
  s('pelvis', 'lFoot', 0.3, 0.6);
  s('pelvis', 'rFoot', 0.3, 0.6);
  s('lKnee', 'rKnee', 0.2, 0.8);
}

// Clamp inside the room; with bounce=true also reflect velocity and report impact speed.
function collideBounds(p, bounce) {
  const fy = floorY(),
    { bounce: BNC, friction } = phys();
  let impact = 0;
  if (p.y > fy - p.r) {
    const vy = p.y - p.py,
      vx = p.x - p.px;
    p.y = fy - p.r;
    if (bounce) {
      p.py = p.y + vy * BNC;
      p.px = p.x - vx * friction;
      impact = Math.max(impact, vy);
    }
  }
  if (p.y < p.r) {
    const vy = p.y - p.py;
    p.y = p.r;
    if (bounce) {
      p.py = p.y + vy * BNC;
      impact = Math.max(impact, -vy);
    }
  }
  if (p.x < p.r) {
    const vx = p.x - p.px;
    p.x = p.r;
    if (bounce) {
      p.px = p.x + vx * BNC;
      impact = Math.max(impact, -vx);
    }
  }
  if (p.x > W - p.r) {
    const vx = p.x - p.px;
    p.x = W - p.r;
    if (bounce) {
      p.px = p.x + vx * BNC;
      impact = Math.max(impact, vx);
    }
  }
  return impact;
}

function solveStick(s) {
  const { a, b } = s;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.0001;
  if (s.min && d >= s.len) return;
  const wa = a === drag ? 0 : 1,
    wb = b === drag ? 0 : 1;
  if (wa + wb === 0) return;
  const diff = (((d - s.len) / d) * s.stiff) / (wa + wb);
  a.x += dx * diff * wa;
  a.y += dy * diff * wa;
  b.x -= dx * diff * wb;
  b.y -= dy * diff * wb;
}

// Little routines the dummy plays when left alone.
const IDLE_ACTIONS = ['breathe', 'wave', 'stretch', 'tap', 'look', 'watch'];
function stepIdle(fy) {
  if (++idle.t > idle.dur) {
    // No foot tapping when there's no floor under your feet
    idle.action = pick(IDLE_ACTIONS.filter((a) => a !== idle.action && !(a === 'tap' && zeroG())));
    idle.t = 0;
    idle.dur = idle.action === 'breathe' ? rand(180, 300) : rand(150, 220);
    const lines = { wave: LINES.wave, watch: LINES.watch, stretch: LINES.stretch }[idle.action];
    if (lines && Math.random() < 0.5) say(lines);
  }
  const t = idle.t,
    n = B.neck,
    pv = B.pelvis;
  const e = Math.min(1, t / 20, (idle.dur - t) / 20); // ease in and out
  const k = 0.1 * e;

  // Relaxed arms and a gentle breathing sway
  pull(B.lHand, n.x - 28, n.y + 65, 0.03);
  pull(B.rHand, n.x + 28, n.y + 65, 0.03);
  pull(B.head, pv.x + Math.sin(t * 0.015) * 3, pv.y - 105 + Math.sin(t * 0.05) * 2, 0.05);

  switch (idle.action) {
    case 'wave':
      pull(B.lElbow, n.x - 40, n.y - 5, k);
      pull(B.lHand, n.x - 45 + Math.sin(t * 0.3) * 15, n.y - 50, k);
      break;
    case 'stretch':
      pull(B.lElbow, n.x - 30, n.y - 35, k);
      pull(B.lHand, n.x - 20, n.y - 75, k);
      pull(B.rElbow, n.x + 30, n.y - 35, k);
      pull(B.rHand, n.x + 20, n.y - 75, k);
      break;
    case 'tap':
      pull(B.lHand, n.x + 14, n.y + 30, k);
      pull(B.rHand, n.x - 14, n.y + 30, k);
      pull(B.lFoot, B.lFoot.x, fy - 11 - Math.max(0, Math.sin(t * 0.25)) * 14, 0.15 * e);
      break;
    case 'look':
      pull(B.head, pv.x + Math.sin(t * 0.04) * 8, pv.y - 104, 0.06 * e);
      break;
    case 'watch':
      pull(B.lElbow, n.x - 22, n.y + 25, k);
      pull(B.lHand, n.x + 6, n.y + 20, k);
      pull(B.head, pv.x - 6, pv.y - 102, 0.06 * e);
      break;
  }
}

// Puppet-string force that makes the dummy wobble back onto its feet.
function pull(p, tx, ty, k) {
  let dx = (tx - p.x) * k,
    dy = (ty - p.y) * k;
  const m = Math.hypot(dx, dy),
    MAX = 3;
  if (m > MAX) {
    dx *= MAX / m;
    dy *= MAX / m;
  }
  p.x += dx;
  p.y += dy;
  p.px += (p.x - p.px) * 0.12;
}

// Get back up when not too beaten up, idle when left alone, and blink now and then.
export function steerDummy(now, fy) {
  const dizzy = isDizzy();
  const canStand = !drag && !dizzy && pain < 35 && now - lastHit > 1500;
  standK = canStand ? Math.min(1, standK + 0.02) : 0;
  if (standK > 0 && phys().g) {
    const footOnFloor = B.lFoot.y > fy - B.lFoot.r - 3 || B.rFoot.y > fy - B.rFoot.r - 3;
    if (footOnFloor) {
      const fx = (B.lFoot.x + B.rFoot.x) / 2,
        fyy = Math.max(B.lFoot.y, B.rFoot.y);
      pull(B.pelvis, fx, fyy - 70, 0.12 * standK);
      pull(B.neck, B.pelvis.x, B.pelvis.y - 65, 0.08 * standK);
      pull(B.head, B.pelvis.x, B.pelvis.y - 105, 0.12 * standK);
    }
  }

  idling = standK >= 1 && !drag && !heldProp && zapT <= 0 && airlock.t < 0 && now - lastHit > 3000;
  if (idling) stepIdle(fy);
  else {
    idle.action = 'breathe';
    idle.t = 0;
    idle.dur = 120;
  }
  if (blinkT > 0) blinkT--;
  else if (Math.random() < 0.006) blinkT = 7;
}

// Verlet integration; a grabbed point just follows the pointer.
export function moveDummy() {
  const { g, damp } = phys();
  for (const p of points) {
    if (p.cd > 0) p.cd--;
    if (p === drag) {
      p.px = p.x;
      p.py = p.y;
      p.x = pointer.x;
      p.y = pointer.y;
      collideBounds(p, false);
      continue;
    }
    let vx = (p.x - p.px) * damp,
      vy = (p.y - p.py) * damp;
    const sp = Math.hypot(vx, vy);
    if (sp > MAXV) {
      vx *= MAXV / sp;
      vy *= MAXV / sp;
    }
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY * g;
  }
}

// Hard wall impacts hurt, then the sticks are relaxed to hold the body together.
export function collideDummy(fy) {
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
}
