// The toolbar weapons and what each one does when you click

import { canvas, rand } from './canvas.ts';
import { sfx } from './audio.ts';
import { zeroG } from './physics.ts';
import { LINES, damage, holdProp, pointer, say, screenFx, startDrag } from './state.ts';
import { burst } from './effects.ts';
import { B, points } from './dummy.ts';
import { inProp, props } from './furniture.ts';
import { dropBomb, dropMeteor, dropPiano, fireRocket, throwCouch, throwTomato, zap } from './hazards.ts';
import { spawnVikings } from './vikings.ts';

export const TOOLS = [
  { id: 'grab', icon: '✋', name: 'Grab', price: 0, key: '1', use: grab },
  { id: 'punch', icon: '👊', name: 'Punch', price: 0, key: '2', use: () => strike(30, 16, 7, 'punch') },
  { id: 'chicken', icon: '🐔', name: 'Chicken', price: 0, key: '3', use: () => strike(40, 9, 3, 'chicken') },
  { id: 'fish', icon: '🐟', name: 'Fish', price: 40, key: '4', use: () => strike(40, 14, 5, 'fish') },
  { id: 'tomato', icon: '🍅', name: 'Tomato', price: 75, key: '5', use: throwTomato },
  { id: 'bat', icon: '🏏', name: 'Bat', price: 100, key: '6', use: () => strike(50, 32, 16, 'bat') },
  {
    id: 'hammer',
    icon: '🔨',
    name: 'Hammer',
    price: 150,
    key: '7',
    use: () => strike(50, 30, 20, 'hammer', [rand(-0.2, 0.2), 1]),
  },
  { id: 'bomb', icon: '💣', name: 'Bomb', price: 250, key: '8', use: dropBomb },
  { id: 'zap', icon: '⚡', name: 'Zap', price: 350, key: '9', use: zap },
  { id: 'piano', icon: '🎹', name: 'Piano', price: 500, key: '0', use: dropPiano },
  { id: 'couch', icon: '🛋️', name: 'Couch', price: 600, key: 'c', use: throwCouch },
  { id: 'rocket', icon: '🚀', name: 'Rocket', price: 750, key: '-', use: fireRocket },
  { id: 'vikings', icon: '⚔️', name: 'Vikings', price: 900, key: 'v', use: spawnVikings, earthOnly: true },
  { id: 'meteor', icon: '☄️', name: 'Meteor', price: 1200, key: '=', use: dropMeteor },
];
export let tool = 'punch';
export function setTool(id) {
  tool = id;
}

export function useTool() {
  screenFx.swingT = 1;
  TOOLS.find((t) => t.id === tool).use();
}

// Some tools make no sense without gravity
export const offHere = (t) => t.earthOnly && zeroG();

export function nearestPoint(x, y) {
  let best = null,
    bd = Infinity;
  for (const p of points) {
    const d = Math.hypot(p.x - x, p.y - y) - p.r;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return { p: best, d: bd };
}

// Grab the body part under the pointer, or failing that the furniture under it.
function grab() {
  const { p, d } = nearestPoint(pointer.x, pointer.y);
  if (p && d < 30) {
    startDrag(p);
    canvas.style.cursor = 'grabbing';
    if (Math.random() < 0.5) say(LINES.grab);
  } else {
    const pr = [...props].reverse().find((o) => inProp(o, pointer.x, pointer.y, 6));
    if (pr) {
      holdProp(pr);
      pr.gx = pr.x - pointer.x;
      pr.gy = pr.y - pointer.y;
      canvas.style.cursor = 'grabbing';
    }
  }
}

// Hit the body part nearest the pointer, knocking it along `dir` (or away from the pointer).
function strike(reach, force, dmg, kind, dir = null) {
  const { p, d } = nearestPoint(pointer.x, pointer.y);
  if (!p || d > reach) {
    sfx.swoosh();
    return;
  }
  let dx, dy, m;
  if (dir) {
    [dx, dy] = dir;
  } else {
    const cx = (B.neck.x + B.pelvis.x) / 2,
      cy = (B.neck.y + B.pelvis.y) / 2;
    dx = p.x - pointer.x + (cx - pointer.x) * 0.5 + pointer.vx * 2;
    dy = p.y - pointer.y + (cy - pointer.y) * 0.5 + pointer.vy * 2;
    m = Math.hypot(dx, dy);
    if (m < 4) {
      dx = Math.random() < 0.5 ? -1 : 1;
      dy = 0;
      m = 1;
    }
    dx /= m;
    dy = dy / m - 0.35;
  }
  m = Math.hypot(dx, dy);
  dx /= m;
  dy /= m;

  for (const q of points) {
    q.px -= dx * force * 0.3;
    q.py -= dy * force * 0.3;
  }
  p.px -= dx * force;
  p.py -= dy * force;

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
