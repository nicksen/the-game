'use strict';
// The airlock in zero-g rooms

// Alarm for `warn` frames, then the hatch on the left wall opens for `open` frames and sucks everything toward it.
// After closing it needs `recharge` frames before it can be opened again.
const AIRLOCK = { warn: 60, open: 200, h: 200, recharge: 600, maxCoins: 150 };
const airlock = { t: -1, earned: 0, cooldown: 0 };
const hatchY = () => floorY() - 140;

function airlockOpenness() {
  const t = airlock.t - AIRLOCK.warn;
  if (airlock.t < 0 || t < 0) return 0;
  return Math.max(0, Math.min(1, t / 15, (AIRLOCK.open - t) / 20));
}

function openAirlock() {
  if (!zeroG() || airlock.t >= 0 || airlock.cooldown > 0) return;
  airlock.t = 0; airlock.earned = 0;
  say(LINES.airlock, true);
  updateAirlockBtn();
}

function stepAirlock() {
  if (airlock.cooldown > 0 && --airlock.cooldown % 60 === 0) updateAirlockBtn();
  if (airlock.t < 0) return;
  const t = airlock.t++;
  if (t % 20 === 0) sfx.alarm();
  if (t === AIRLOCK.warn) { sfx.thud(); sfx.whoosh(); }
  if (airlock.t >= AIRLOCK.warn + AIRLOCK.open) {
    airlock.t = -1; airlock.cooldown = AIRLOCK.recharge; sfx.thud(); updateAirlockBtn();
    return;
  }
  const o = airlockOpenness();
  if (!o) return;

  // Suction toward the hatch, a bit stronger up close
  const hy = hatchY(), half = AIRLOCK.h / 2 * o;
  const suck = (x, y, s) => {
    const dx = -x, dy = hy - y, d = Math.hypot(dx, dy) || 1;
    const f = s * o * (0.6 + 0.4 * Math.max(0, 1 - d / W));
    return [dx / d * f, dy / d * f];
  };
  // Small things that reach the opening are lost to space
  const gone = (x, y, r = 0) => x < 30 + r && Math.abs(y - hy) < half;

  for (const p of points) {
    if (p === drag) continue;
    const [ax, ay] = suck(p.x, p.y, 1.3);
    p.x += ax; p.y += ay;
  }
  for (const p of props) {
    if (p === heldProp) continue;
    const [ax, ay] = suck(p.x, p.y, 0.9);
    p.vx += ax / p.mass; p.vy += ay / p.mass;
  }
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i], [ax, ay] = suck(b.x, b.y, 1);
    b.vx += ax; b.vy += ay;
    if (gone(b.x, b.y)) bombs.splice(i, 1);
  }
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i], [ax, ay] = suck(c.x, c.y, 0.8);
    c.vx += ax; c.vy += ay;
    if (gone(c.x, c.y, 70)) couches.splice(i, 1);
  }
  for (const pr of projectiles) {
    const [ax, ay] = suck(pr.x, pr.y, 0.6);
    pr.vx += ax; pr.vy += ay;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], [ax, ay] = suck(p.x, p.y, 0.8);
    p.vx += ax; p.vy += ay;
    if (gone(p.x, p.y)) particles.splice(i, 1);
  }

  // Air rushing out
  for (let i = 0; i < 3; i++) {
    particles.push({ x: rand(W * 0.15, W), y: rand(20, floorY()), vx: -2, vy: 0, life: 0, max: 80,
      type: 'wind', size: 1, rot: 0, vr: 0, color: '#fff' });
  }
  shake = Math.max(shake, 4 * o);
}

const airlockBtn = document.getElementById('airlockBtn');
function updateAirlockBtn() {
  airlockBtn.style.display = zeroG() ? '' : 'none';
  airlockBtn.disabled = airlock.t >= 0 || airlock.cooldown > 0;
  // Show the seconds left while recharging
  airlockBtn.textContent = airlock.cooldown > 0 ? Math.ceil(airlock.cooldown / 60) : '🚪';
}
airlockBtn.onclick = () => { ac(); openAirlock(); };

function drawHatch() {
  const hy = hatchY(), h = AIRLOCK.h, top = hy - h / 2, o = airlockOpenness();
  box(-10, top - 16, 46, h + 32, '#5d6580', '#2f3446', 3);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(28, top - 10, 5, h + 20);

  // Open space behind the doors
  ctx.fillStyle = '#000'; ctx.fillRect(0, top, 26, h);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) { circle(4 + (i * 37 % 20), top + (i * 53 % h), 1); ctx.fill(); }

  // Two door halves slide apart
  const dh = h / 2 * (1 - o);
  box(0, top, 26, dh, '#8a93a8', '#3d4354', 2);
  box(0, hy + h / 2 - dh, 26, dh, '#8a93a8', '#3d4354', 2);

  // Warning light and label
  const blink = airlock.t >= 0 && Math.floor(airlock.t / 10) % 2 === 0;
  if (blink) {
    const glow = ctx.createRadialGradient(18, top - 34, 2, 18, top - 34, 40);
    glow.addColorStop(0, 'rgba(255,60,60,0.7)'); glow.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = glow; ctx.fillRect(-22, top - 74, 80, 80);
  }
  circle(18, top - 34, 8); ctx.fillStyle = blink ? '#ff3b3b' : '#5a1a1a'; ctx.fill();
  ctx.strokeStyle = '#2f3446'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillText('AIRLOCK', 32, top - 34);
}
