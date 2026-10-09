// The dummy: a verlet ragdoll that stands itself back up and idles

import { W, floorY, pick, rand } from './canvas.ts';
import { sfx } from './audio.ts';
import { GRAVITY, ITER, MAXV, phys, zeroG } from './physics.ts';
import { LINES, damage, drag, heldProp, idle, isDizzy, lastHit, pain, pointer, say } from './state.ts';
import { burst } from './effects.ts';
import { zapT } from './hazards.ts';
import { airlock } from './airlock.ts';

export interface Point {
  x: number;
  y: number;
  // Where the point was last step; verlet integration takes the velocity from x - px, y - py
  px: number;
  py: number;
  r: number;
  cd: number;
}
interface Stick {
  a: Point;
  b: Point;
  len: number;
  stiff: number;
  min: boolean;
}
type BodyPart =
  'head' | 'neck' | 'pelvis' | 'lElbow' | 'lHand' | 'rElbow' | 'rHand' | 'lKnee' | 'lFoot' | 'rKnee' | 'rFoot';

export let points: Point[] = [],
  sticks: Stick[] = [];
export let standK = 0,
  idling = false,
  blinkT = 0;
// Where it's walking to, while it walks
export let walkTo: number | null = null;
// Where the pelvis was when it started getting up, once a foot was on the floor
let getUpX: number | null = null;
// Filled in by buildDummy(), which runs before anything reads it
export const B = {} as Record<BodyPart, Point>;

export function buildDummy() {
  points = [];
  sticks = [];
  // In zero-g the dummy starts floating mid-room with a lazy drift
  const float = zeroG(),
    cx = W / 2,
    fy = floorY() - (float ? 160 : 0);
  const mk = (name: BodyPart, dx: number, dy: number, r: number) => {
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
  const s = (a: BodyPart, b: BodyPart, stiff = 1, minRatio = 0) => {
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
}

// Clamp inside the room; with bounce=true also reflect velocity and report impact speed.
function collideBounds(p: Point, bounce: boolean) {
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

function solveStick(s: Stick) {
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
const IDLE_ACTIONS = ['breathe', 'wave', 'stretch', 'tap', 'look', 'watch', 'walk'];
const NEEDS_FLOOR = ['tap', 'walk'];
// A spot a short stroll away, on a side with room for it, clear of the walls; null if neither side has room
function pickWalkTarget() {
  const x = B.pelvis.x;
  const sides = [
    { dir: -1, room: x - WALL_MARGIN },
    { dir: 1, room: W - WALL_MARGIN - x },
  ].filter((s) => s.room >= SHORTEST_WALK);
  if (!sides.length) return null;
  const { dir, room } = pick(sides);
  return x + dir * rand(SHORTEST_WALK, Math.min(LONGEST_WALK, room));
}

// The arm on the other side from the stepping foot swings out a little with each step. Sideways only: lifting a
// hand would lift the whole dummy.
function swingArm(n: Point) {
  const side = gait.stepping === 0 ? 1 : -1,
    swing = Math.sin((Math.PI * gait.t) / STEP_FRAMES),
    hand = side < 0 ? B.lHand : B.rHand;
  pull(hand, n.x + side * (28 + swing * ARM_SWING), hand.y, 0.03);
}

function stepIdle(fy: number) {
  if (++idle.t > idle.dur) {
    // No foot tapping or walking when there's no floor under your feet
    const allowed = IDLE_ACTIONS.filter((a) => a !== idle.action && !(NEEDS_FLOOR.includes(a) && zeroG()));
    idle.action = pick(allowed);
    walkTo = idle.action === 'walk' ? pickWalkTarget() : null;
    // No room for a stroll, so something else instead
    if (idle.action === 'walk' && walkTo === null) idle.action = pick(allowed.filter((a) => a !== 'walk'));
    idle.t = 0;
    idle.dur = idle.action === 'breathe' ? rand(180, 300) : rand(150, 220);
    if (walkTo !== null) {
      startGait(walkTo);
      // A walk ends when it arrives, not on a timer
      idle.dur = Infinity;
    }
    const lines = { wave: LINES.wave, watch: LINES.watch, stretch: LINES.stretch, walk: LINES.walk }[idle.action];
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
  // Elbows out to the sides, so the arms bend away from the body
  pull(B.lElbow, n.x - 32, n.y + 30, 0.03);
  pull(B.rElbow, n.x + 32, n.y + 30, 0.03);
  pull(B.head, pv.x + Math.sin(t * 0.015) * 3, pv.y - 105 + Math.sin(t * 0.05) * 2, 0.05);

  switch (idle.action) {
    case 'walk':
      if (walkTo === null || getUpX === null) break;
      getUpX += Math.sign(walkTo - getUpX) * Math.min(WALK_SPEED, Math.abs(walkTo - getUpX));
      stepGait();
      // Arrived, and the foot that was stepping has just landed
      if (getUpX === walkTo && gait.t === 0) idle.dur = idle.t;
      swingArm(n);
      break;
    case 'wave':
      pull(B.lElbow, n.x - 40, n.y - 5, k);
      pull(B.lHand, n.x - 45 + Math.sin(t * 0.3) * 15, n.y - 50, k);
      break;
    case 'stretch':
      // Gently: pulling the arms up any harder lifts the whole dummy off the floor
      pull(B.lElbow, n.x - 30, n.y - 35, k * 0.5);
      pull(B.lHand, n.x - 20, n.y - 75, k * 0.5);
      pull(B.rElbow, n.x + 30, n.y - 35, k * 0.5);
      pull(B.rHand, n.x + 20, n.y - 75, k * 0.5);
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
function pull(p: Point, tx: number, ty: number, k: number) {
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
  p.py += (p.y - p.py) * 0.12;
}

const HIP_HALF_WIDTH = 16;
const WALK_SPEED = 1.2,
  SHORTEST_WALK = 150,
  LONGEST_WALK = 350,
  STEP_FRAMES = 15,
  STEP_HEIGHT = 12,
  STRIDE_AHEAD = 10,
  ARM_SWING = 14,
  FOOT_GRIP = 0.5,
  WALL_MARGIN = 120;
const SWAY_DAMPING = 0.5,
  HIP_HOLD = 0.4;
// Pelvis height above the floor when standing, and low enough that it's still getting up
const STANDING_PELVIS = 80,
  LOW_PELVIS = 40;
// How high a foot can lift and still count as standing on the floor, e.g. on tiptoe for a stretch
const TIPTOE = 10;
// 0 while the pelvis is still low, rising to 1 once it's at standing height
function uprightness(fy: number) {
  return Math.min(1, Math.max(0, (fy - B.pelvis.y - LOW_PELVIS) / (STANDING_PELVIS - LOW_PELVIS)));
}

// Foot on the floor under its hip, knee on the line from hip to foot. `side` is -1 for the left leg, 1 for the right.
// The feet stay planted while it rises over them, and only shuffle under the hips once it's nearly up; moving
// them sooner drags the whole body across the floor.
function placeLeg(knee: Point, foot: Point, side: number, fy: number) {
  const pv = B.pelvis;
  if (walking() && walkTo !== null && getUpX !== null) stepFoot(foot, side, fy, getUpX, walkTo);
  else pull(foot, pv.x + side * HIP_HALF_WIDTH, fy - foot.r, 0.1 * standK * uprightness(fy));
  pull(knee, (pv.x + foot.x) / 2, (pv.y + foot.y) / 2, 0.3 * standK);
}

const walking = () => idling && idle.action === 'walk';

// The walk cycle: which foot is stepping (0 left, 1 right), how far through its step, where it lifted off, and
// where each foot was last put down
export const gait = { stepping: 0, t: 0, liftedAt: 0, plantedAt: [0, 0] };
// The leading foot steps first, so the hips never pass over it
function startGait(towards: number) {
  gait.stepping = towards < B.pelvis.x ? 0 : 1;
  gait.t = 0;
  gait.liftedAt = gait.stepping === 0 ? B.lFoot.x : B.rFoot.x;
  gait.plantedAt = [B.lFoot.x, B.rFoot.x];
}
function stepGait() {
  if (++gait.t <= STEP_FRAMES) return;
  const feet = [B.lFoot, B.rFoot];
  gait.plantedAt[gait.stepping] = feet[gait.stepping].x;
  gait.stepping = 1 - gait.stepping;
  gait.t = 0;
  gait.liftedAt = feet[gait.stepping].x;
}
// It faces us, so walking is a side-step: the leading foot reaches out ahead of its hip and the trailing foot
// closes in under its own, so the feet never cross. The planted foot stays put; the stepping foot arcs from where
// it lifted off to its spot beside where the hips will be when the step ends.
function stepFoot(foot: Point, side: number, fy: number, hips: number, target: number) {
  const i = side < 0 ? 0 : 1,
    floor = fy - foot.r;
  if (i !== gait.stepping) {
    pull(foot, gait.plantedAt[i], floor, FOOT_GRIP);
    return;
  }
  const dir = Math.sign(target - hips),
    s = gait.t / STEP_FRAMES;
  const hipsAtLanding = hips + dir * WALK_SPEED * (STEP_FRAMES - gait.t);
  const leading = side === dir;
  const landing = hipsAtLanding + side * HIP_HALF_WIDTH + (leading ? dir * STRIDE_AHEAD : 0);
  // Eased sideways, so the foot lifts before it travels and lands before it stops, rather than scraping the floor
  const across = s * s * (3 - 2 * s);
  pull(
    foot,
    gait.liftedAt + (landing - gait.liftedAt) * across,
    floor - Math.sin(Math.PI * s) * STEP_HEIGHT,
    FOOT_GRIP,
  );
}

// Get back up when not too beaten up, idle when left alone, and blink now and then.
export function steerDummy(now: number, fy: number) {
  const dizzy = isDizzy();
  const canStand = !drag && !dizzy && pain < 35 && now - lastHit > 1500;
  standK = canStand ? Math.min(1, standK + 0.1) : 0;
  if (standK === 0) getUpX = null;
  if (standK > 0 && phys().g) {
    const footOnFloor = B.lFoot.y > fy - B.lFoot.r - TIPTOE || B.rFoot.y > fy - B.rFoot.r - TIPTOE;
    if (!footOnFloor) getUpX = null;
    else {
      getUpX ??= B.pelvis.x;
      // It stands up where it was lying, and the feet come in under it. Its height is measured from the floor, not
      // the feet, so going up on tiptoe doesn't lift it further.
      pull(B.pelvis, getUpX, fy - B.lFoot.r - 70, 0.12 * standK);
      // Hips stay put on the floor while the upper body swings up over them
      pull(B.pelvis, getUpX, B.pelvis.y, HIP_HOLD * standK);
      // Soak up sideways swing while it stands, so it settles instead of swaying; hits stop it standing, so they still
      // knock it flying
      for (const p of [B.pelvis, B.neck]) p.px += (p.x - p.px) * SWAY_DAMPING * standK;
      pull(B.neck, B.pelvis.x, B.pelvis.y - 65, 0.08 * standK);
      pull(B.head, B.pelvis.x, B.pelvis.y - 105, 0.12 * standK);
      placeLeg(B.lKnee, B.lFoot, -1, fy);
      placeLeg(B.rKnee, B.rFoot, 1, fy);
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
export function collideDummy(fy: number) {
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
