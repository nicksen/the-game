// Throwable furniture: which props each room has and how they move

import { W, ctx, floorY, rand } from './canvas.ts';
import { sfx } from './audio.ts';
import { GRAVITY, phys } from './physics.ts';
import { damage, heldProp, pointer, screenFx } from './state.ts';
import { burst } from './effects.ts';
import { points } from './dummy.ts';
import { roomId } from './rooms.ts';
import {
  drawBed,
  drawBookshelf,
  drawChair,
  drawCrate,
  drawDesk,
  drawFilingCabinet,
  drawFridge,
  drawHelmet,
  drawLamp,
  drawNightstand,
  drawOxygenTank,
  drawPlant,
  drawTeddy,
  drawTires,
  drawToolbox,
  drawWaterCooler,
  drawWorkbench,
} from './furniture-art.ts';

export const PROPS = {
  living: () => [
    { x: W * 0.72, w: 120, h: 190, mass: 2.2, draw: drawBookshelf },
    { x: W * 0.9, w: 76, h: 232, mass: 0.8, draw: drawLamp },
    { x: W * 0.05, w: 60, h: 140, mass: 0.7, draw: drawPlant },
  ],
  office: () => [
    { x: W * 0.07, w: 52, h: 178, mass: 1.2, draw: drawWaterCooler },
    { x: W * 0.3, w: 72, h: 140, mass: 2, draw: drawFilingCabinet },
    { x: W * 0.8, w: 220, h: 176, mass: 2.6, draw: drawDesk },
  ],
  kitchen: () => [
    { x: W * 0.09, w: 100, h: 230, mass: 3, draw: drawFridge },
    { x: W * 0.36, w: 60, h: 110, mass: 0.8, draw: drawChair },
  ],
  garage: () => [
    { x: W * 0.78, w: 250, h: 124, mass: 2.6, draw: drawWorkbench },
    { x: Math.min(W - 50, W * 0.78 + 175), w: 90, h: 94, mass: 1.6, draw: drawTires },
    { x: W * 0.4, w: 70, h: 44, mass: 1, draw: drawToolbox },
  ],
  bedroom: () => [
    { x: W * 0.8, w: 270, h: 160, mass: 3, draw: drawBed },
    { x: W * 0.8 - 185, w: 64, h: 130, mass: 1.2, draw: drawNightstand },
    { x: W * 0.3, w: 52, h: 66, mass: 0.3, soft: true, draw: drawTeddy },
  ],
  // Floating mid-air with a slow tumble
  space: () => [
    { x: W * 0.18, y: floorY() * 0.55, w: 80, h: 80, mass: 1.8, a: 0.3, va: 0.006, vx: 0.2, draw: drawCrate },
    { x: W * 0.85, y: floorY() * 0.7, w: 40, h: 120, mass: 1, a: 0.6, va: -0.008, vy: -0.25, draw: drawOxygenTank },
    { x: W * 0.58, y: floorY() * 0.22, w: 60, h: 60, mass: 0.6, va: 0.015, vx: -0.3, draw: drawHelmet },
  ],
};

export let props = [];

// Specs give a floor position by default; `y`, `vx`, `vy`, `a` and `va` override the resting start.
export function makeProp(spec) {
  const x = Math.max(spec.w / 2, Math.min(W - spec.w / 2, spec.x));
  return {
    ...spec,
    x,
    y: spec.y ?? floorY() - spec.h / 2,
    vx: spec.vx || 0,
    vy: spec.vy || 0,
    a: spec.a || 0,
    va: spec.va || 0,
    cd: 0,
    landCd: 0,
  };
}
export function buildProps() {
  props = (PROPS[roomId] || (() => []))().map(makeProp);
}

function propCorners(p) {
  const c = Math.cos(p.a),
    s = Math.sin(p.a);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => ({
    x: p.x + ((sx * p.w) / 2) * c - ((sy * p.h) / 2) * s,
    y: p.y + ((sx * p.w) / 2) * s + ((sy * p.h) / 2) * c,
  }));
}
// Is (x, y) inside the rotated prop, grown by `pad`?
export function inProp(p, x, y, pad = 0) {
  const c = Math.cos(-p.a),
    s = Math.sin(-p.a),
    dx = x - p.x,
    dy = y - p.y;
  const lx = dx * c - dy * s,
    ly = dx * s + dy * c;
  return Math.abs(lx) < p.w / 2 + pad && Math.abs(ly) < p.h / 2 + pad;
}

export function stepProps(fy) {
  const g = phys().g,
    space = g === 0;
  for (const p of props) {
    if (p.cd > 0) p.cd--;
    if (p.landCd > 0) p.landCd--;
    moveProp(p, g);
    keepPropInRoom(p, fy, space);
    propHitDummy(p);
  }
}

// A held prop follows the pointer, tilting with its motion; a free one flies and spins.
function moveProp(p, g) {
  if (p === heldProp) {
    const tx = pointer.x + p.gx,
      ty = pointer.y + p.gy;
    p.vx = tx - p.x;
    p.vy = ty - p.y;
    p.x = tx;
    p.y = ty;
    p.a += (Math.max(-0.6, Math.min(0.6, pointer.vx * 0.03)) - p.a) * 0.15;
    p.va = 0;
  } else {
    p.vy += GRAVITY * g;
    p.vx *= 0.995;
    p.x += p.vx;
    p.y += p.vy;
    p.a += p.va;
    p.va *= 0.99;
  }
}

// Bounce off the floor, ceiling and walls using the rotated corners.
function keepPropInRoom(p, fy, space) {
  const cs = propCorners(p);
  const maxY = Math.max(...cs.map((c) => c.y)),
    minY = Math.min(...cs.map((c) => c.y));
  const minX = Math.min(...cs.map((c) => c.x)),
    maxX = Math.max(...cs.map((c) => c.x));
  if (maxY > fy) {
    p.y -= maxY - fy;
    if (p !== heldProp) {
      if (p.vy > 8 && p.landCd === 0) {
        p.landCd = 10;
        if (p.soft) sfx.squeak();
        else sfx.thud();
        screenFx.shake = Math.max(screenFx.shake, Math.min(15, p.vy * p.mass * 0.4));
        burst(p.x, fy - 5, 6, 'smoke', { speed: 2, life: 40, size: 10 });
      }
      if (space) {
        // Nothing holds it down, so it just bounces off the deck
        p.vy = -Math.abs(p.vy) * 0.7;
      } else {
        if (p.vy > 0) p.vy *= -0.25;
        p.vx *= 0.8;
        p.va *= 0.6;
        // Settle onto the nearest flat side
        const q = Math.round(p.a / (Math.PI / 2)) * (Math.PI / 2);
        p.a += (q - p.a) * 0.2;
      }
    }
  }
  const wb = space ? 0.7 : 0.4;
  if (minY < 0) {
    p.y -= minY;
    p.vy = Math.abs(p.vy) * (space ? 0.7 : 0.3);
  }
  if (minX < 0) {
    p.x -= minX;
    p.vx = Math.abs(p.vx) * wb;
  }
  if (maxX > W) {
    p.x -= maxX - W;
    p.vx = -Math.abs(p.vx) * wb;
  }
}

// A fast-moving prop smacks the dummy, harder the heavier it is.
function propHitDummy(p) {
  const speed = Math.hypot(p.vx, p.vy);
  if (speed <= 6 || p.cd !== 0) return;
  const hit = points.find((q) => inProp(p, q.x, q.y, q.r));
  if (!hit) return;
  p.cd = 15;
  const k = Math.min(1.3, 0.5 + p.mass * 0.3),
    s = Math.min(1, 40 / speed);
  const reach = Math.max(p.w, p.h) / 2 + 60;
  for (const q of points) {
    if (Math.hypot(q.x - p.x, q.y - p.y) < reach) {
      q.px -= p.vx * s * k;
      q.py -= p.vy * s * k - 3;
    }
  }
  damage(hit, Math.min(120, speed * s * p.mass * 0.9 + 3), 'furniture');
  if (p.soft) sfx.squeak();
  else {
    sfx.thud();
    sfx.hit(1);
  }
  if (p !== heldProp) {
    p.vx *= -0.3;
    p.vy *= 0.3;
    p.va += rand(-0.1, 0.1);
  }
}

export function drawProp(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  p.draw(p.w, p.h);
  ctx.restore();
}
// Moving props are drawn in front of the dummy
export const propMoving = (p) => p === heldProp || Math.hypot(p.vx, p.vy) > 2;
