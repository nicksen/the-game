// The viking horde

import { OUT, W, box, chain, circle, ctx, floorY, pick, rand, rr, seg } from './canvas.js';
import { sfx } from './audio.js';
import { LINES, WORDS, WORD_COLORS, damage, pointer, say, vikings } from './state.js';
import { addText, burst } from './effects.js';
import { points } from './dummy.js';

const HORDE_SIZE = 8,
  MAX_VIKINGS = 30;

// A horde charges in from the edge nearest the click and runs across the floor
export function spawnVikings() {
  const dir = pointer.x < W / 2 ? 1 : -1,
    x0 = dir > 0 ? -60 : W + 60;
  const n = Math.max(0, Math.min(HORDE_SIZE, MAX_VIKINGS - vikings.length));
  for (let i = 0, x = x0; i < n; i++, x -= dir * rand(45, 65)) {
    vikings.push({
      x,
      dir,
      speed: rand(5, 6.5),
      phase: rand(0, 6),
      depth: rand(-6, 10),
      scale: rand(0.85, 1.05),
      weapon: pick(['axe', 'sword', 'spear']),
      tunic: pick(['#8b3a2e', '#3b5f8a', '#4f7a3a', '#7a5a2e']),
      beard: pick(['#d9772b', '#e8c766', '#6b3f1f', '#b23a1a']),
      shield: pick(['#c0392b', '#2e6fb5', '#d4a017']),
      swing: 0,
      hit: false,
    });
  }
  if (n) {
    sfx.warcry();
    say(LINES.vikings, true);
  }
}

// Each viking runs along the floor and chops the first body part that comes within reach of its weapon, once.
let vikingStomp = 0;
export function stepVikings(fy) {
  for (let i = vikings.length - 1; i >= 0; i--) {
    const v = vikings[i];
    v.x += v.dir * v.speed;
    v.phase += v.speed * 0.06;
    v.swing *= 0.85;

    if (!v.hit) {
      const reachX = v.x + v.dir * 30;
      let target = null,
        bd = 40;
      for (const p of points) {
        const d = Math.abs(p.x - reachX);
        if (d < bd && p.y > fy - 150) {
          bd = d;
          target = p;
        }
      }
      if (target) {
        v.hit = true;
        v.swing = 1;
        for (const p of points) p.px -= v.dir * 2;
        target.px -= v.dir * 12;
        target.py += 8;
        damage(target, rand(6, 9), 'vikings');
        if (v.weapon === 'sword') sfx.clang();
        else {
          sfx.slap();
          sfx.hit(0.7);
        }
        burst(target.x, target.y, 5, 'star', { speed: 5, life: 30, size: 6 });
        // Chops are too weak for damage() to pop a word, so the viking shouts its own battle cry
        addText(v.x, fy - 140 * v.scale, pick(WORDS.vikings), pick(WORD_COLORS), 30, rand(-0.25, 0.25));
      }
    }
    if ((v.dir > 0 && v.x > W + 80) || (v.dir < 0 && v.x < -80)) vikings.splice(i, 1);
  }
  if (vikings.length && ++vikingStomp % 9 === 0) sfx.stomp();
}

// Drawn facing right in local coordinates with the feet at y = 0, then mirrored for left-runners
function drawViking(v) {
  const fy = floorY(),
    s = v.scale,
    run = v.phase;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(v.x, fy + v.depth + 2, 22 * s, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(v.x, fy + v.depth - Math.abs(Math.sin(run)) * 4);
  ctx.scale(v.dir * s, s);

  // Legs pumping, back leg darker
  const leg = (a, col) => {
    const foot = { x: Math.sin(a) * 20, y: -4 - Math.max(0, Math.cos(a)) * 8 };
    const knee = { x: Math.sin(a) * 10 + 6, y: -24 };
    chain([{ x: 0, y: -42 }, knee, foot], 8, col);
    circle(foot.x + 3, foot.y, 6);
    ctx.fillStyle = '#4a2c18';
    ctx.fill();
  };
  leg(run + Math.PI, '#4b3b2b');
  leg(run, '#6b5440');

  // Round shield on the back arm
  circle(-12, -60, 17);
  ctx.fillStyle = v.shield;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 4;
  seg(-12, -76, -12, -44);
  circle(-12, -60, 4);
  ctx.fillStyle = '#aaa';
  ctx.fill();

  // Tunic and belt
  rr(-14, -82, 28, 44, 8);
  ctx.fillStyle = v.tunic;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  box(-14, -48, 28, 5, '#4a2c18', null);

  // Head, beard and horned helmet
  circle(3, -95, 13);
  ctx.fillStyle = '#f1c7a1';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, -92);
  ctx.lineTo(16, -91);
  ctx.lineTo(10, -70);
  ctx.lineTo(0, -78);
  ctx.closePath();
  ctx.fillStyle = v.beard;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(10, -98, 2);
  ctx.fillStyle = OUT;
  ctx.fill();
  const horn = (bx, flip) => {
    ctx.beginPath();
    ctx.moveTo(bx - 3, -102);
    ctx.quadraticCurveTo(bx + flip * 14, -108, bx + flip * 12, -126);
    ctx.quadraticCurveTo(bx + flip * 5, -110, bx + 3, -102);
    ctx.closePath();
    ctx.fillStyle = '#f3e6c4';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  horn(-8, -1);
  horn(14, 1);
  ctx.beginPath();
  ctx.arc(3, -98, 14, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#9aa3ad';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  box(14, -100, 4, 12, '#9aa3ad', OUT, 1.5);

  // Weapon arm: held overhead while charging, chops forward on a hit
  const sh = { x: 4, y: -74 },
    ang = -1.9 + v.swing * 2.2;
  const hand = { x: sh.x + Math.cos(ang) * 24, y: sh.y + Math.sin(ang) * 24 };
  chain([sh, hand], 7, v.tunic);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  if (v.weapon === 'axe') {
    box(-4, -2.5, 40, 5, '#7a4f2a', null);
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(36, -13);
    ctx.quadraticCurveTo(46, 0, 36, 13);
    ctx.closePath();
    ctx.fillStyle = '#c9d1d9';
    ctx.fill();
    ctx.stroke();
  } else if (v.weapon === 'sword') {
    box(-4, -2.5, 8, 5, '#7a4f2a', null);
    box(4, -7, 4, 14, '#c9a227', null);
    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(42, -3);
    ctx.lineTo(48, 0);
    ctx.lineTo(42, 3);
    ctx.lineTo(8, 3);
    ctx.closePath();
    ctx.fillStyle = '#dfe6ec';
    ctx.fill();
    ctx.stroke();
  } else {
    box(-16, -2, 66, 4, '#7a4f2a', null);
    ctx.beginPath();
    ctx.moveTo(50, -6);
    ctx.lineTo(64, 0);
    ctx.lineTo(50, 6);
    ctx.closePath();
    ctx.fillStyle = '#c9d1d9';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  circle(hand.x, hand.y, 5);
  ctx.fillStyle = '#f1c7a1';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
export function drawVikings() {
  for (const v of [...vikings].sort((a, b) => a.depth - b.depth)) drawViking(v);
}
