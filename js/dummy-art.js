'use strict';
// Drawing the dummy in its different looks

// Crash-test-dummy target marker
function marker(x, y, r) {
  circle(x, y, r);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, 0, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  circle(x, y, r);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
}

const LOOKS = {
  dummy: {
    name: 'Crash Dummy',
    icon: '🟡',
    arm: YEL,
    leg: YEL,
    torso: YEL,
    hand: YEL,
    foot: YEL,
    head: YEL,
    armW: 16,
    legW: 18,
  },
  suit: {
    name: 'Suit Guy',
    icon: '👔',
    arm: [126, 84, 50],
    leg: [46, 50, 56],
    torso: [126, 84, 50],
    hand: [241, 199, 161],
    foot: [26, 26, 26],
    head: [241, 199, 161],
    armW: 13,
    legW: 15,
  },
};
let lookId = LOOKS[save.look] ? save.look : 'dummy';
const shadeRGB = (c) => c.map((v) => v * 0.84);

function drawDummy() {
  const look = LOOKS[lookId],
    t = bodyFlash * 0.7;
  const c = (part, back = false) => mix(back ? shadeRGB(look[part]) : look[part], RED, t);
  const n = B.neck,
    pv = B.pelvis;
  const dx = pv.x - n.x,
    dy = pv.y - n.y,
    L = Math.hypot(dx, dy) || 1;
  const ux = dx / L,
    uy = dy / L,
    nx = -uy,
    ny = ux;
  const shoulder = (side) => ({ x: n.x + nx * 18 * side + ux * 6, y: n.y + ny * 18 * side + uy * 6 });
  const hip = (side) => ({ x: pv.x + nx * 10 * side, y: pv.y + ny * 10 * side });

  // Back limbs
  chain([shoulder(-1), B.rElbow, B.rHand], look.armW, c('arm', true));
  joint(B.rElbow);
  blob(B.rHand, 11, c('hand', true));
  chain([hip(-1), B.rKnee, B.rFoot], look.legW, c('leg', true));
  joint(B.rKnee);
  blob(B.rFoot, 12, c('foot', true));

  // Torso
  const top = { x: n.x - ux * 10, y: n.y - uy * 10 },
    bot = { x: pv.x + ux * 12, y: pv.y + uy * 12 };
  const tw = lookId === 'suit' ? 23 : 26,
    bw = lookId === 'suit' ? 19 : 21;
  ctx.beginPath();
  ctx.moveTo(top.x + nx * tw, top.y + ny * tw);
  ctx.lineTo(bot.x + nx * bw, bot.y + ny * bw);
  ctx.lineTo(bot.x - nx * bw, bot.y - ny * bw);
  ctx.lineTo(top.x - nx * tw, top.y - ny * tw);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.fillStyle = c('torso');
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.stroke();

  const at = (f, side = 0) => ({ x: n.x + dx * f + nx * side, y: n.y + dy * f + ny * side });
  if (lookId === 'suit') {
    // Shirt V, tie, lapels and a button
    const vl = at(-0.12, 11),
      vr = at(-0.12, -11),
      vb = at(0.5);
    ctx.beginPath();
    ctx.moveTo(vl.x, vl.y);
    ctx.lineTo(vb.x, vb.y);
    ctx.lineTo(vr.x, vr.y);
    ctx.closePath();
    ctx.fillStyle = '#f7f7f7';
    ctx.fill();
    const k1 = at(-0.08, 3),
      k2 = at(-0.08, -3),
      t1 = at(0.42, 4),
      t2 = at(0.42, -4),
      tp = at(0.5);
    ctx.beginPath();
    ctx.moveTo(k1.x, k1.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(k2.x, k2.y);
    ctx.closePath();
    ctx.fillStyle = '#c0392b';
    ctx.fill();
    ctx.strokeStyle = '#4a2f1a';
    ctx.lineWidth = 3;
    seg(vl.x, vl.y, vb.x, vb.y);
    seg(vr.x, vr.y, vb.x, vb.y);
    const btn = at(0.68);
    circle(btn.x, btn.y, 2.5);
    ctx.fillStyle = '#4a2f1a';
    ctx.fill();
  } else {
    // Belt and crash-test marker
    ctx.beginPath();
    ctx.moveTo(pv.x + nx * 20 - ux * 4, pv.y + ny * 20 - uy * 4);
    ctx.lineTo(pv.x - nx * 20 - ux * 4, pv.y - ny * 20 - uy * 4);
    ctx.lineWidth = 6;
    ctx.stroke();
    marker(n.x + dx * 0.4, n.y + dy * 0.4, 9);
  }

  // Front limbs
  chain([hip(1), B.lKnee, B.lFoot], look.legW, c('leg'));
  joint(B.lKnee);
  blob(B.lFoot, 12, c('foot'));
  chain([shoulder(1), B.lElbow, B.lHand], look.armW, c('arm'));
  joint(B.lElbow);
  blob(B.lHand, 11, c('hand'));

  drawHead(c('head'));
}

// Drawn in head-local coordinates, rotated so "up" points away from the neck.
function drawHead(col) {
  const h = B.head,
    n = B.neck,
    r = h.r,
    suit = lookId === 'suit';
  const ang = Math.atan2(h.y - n.y, h.x - n.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(ang);

  if (suit) drawHairBack(r);
  circle(0, 0, r);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = suit ? 3 : 5;
  ctx.stroke();
  if (!suit) marker(16, -15, 7);
  if (suit) drawHairFront(r);
  drawBandAids();

  ctx.strokeStyle = OUT;
  ctx.fillStyle = OUT;
  ctx.lineCap = 'round';
  const dizzy = isDizzy();
  if (dizzy) drawDizzyFace();
  else if (hurtT > 0) drawHurtFace();
  else drawCalmFace(h, ang);
  ctx.restore();

  if (dizzy) drawCirclingStars(h);
}

const HAIR = '#7a4a2a',
  HAIR_D = '#4a2c18';

// Back of the hair, down to about ear level
function drawHairBack(r) {
  rr(-r - 4, -r - 4, r * 2 + 8, r + 12, 12);
  ctx.fillStyle = HAIR;
  ctx.fill();
  ctx.strokeStyle = HAIR_D;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Top of the hair with side-swept bangs
function drawHairFront(r) {
  ctx.beginPath();
  ctx.arc(0, 0, r + 3, Math.PI * 0.97, Math.PI * 2.03);
  ctx.lineTo(r - 4, 2);
  ctx.quadraticCurveTo(r - 2, -12, 10, -16);
  ctx.quadraticCurveTo(-4, -10, -14, -18);
  ctx.quadraticCurveTo(-r + 2, -10, -r + 3, 2);
  ctx.closePath();
  ctx.fillStyle = HAIR;
  ctx.fill();
  ctx.strokeStyle = HAIR_D;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -r + 2);
  ctx.quadraticCurveTo(4, -22, 14, -20);
  ctx.stroke();
}

// Band-aids pile up as the session goes on
function drawBandAids() {
  const aids = [
    [-14, -15, 0.6],
    [17, 9, -0.7],
    [-8, 15, 0.3],
    [4, -22, -0.2],
  ];
  const count = Math.min(aids.length, Math.floor(sessionDmg / 250));
  for (let i = 0; i < count; i++) {
    const [x, y, r] = aids[i];
    for (const rot of [r, r + Math.PI / 2]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      rr(-10, -3.5, 20, 7, 3);
      ctx.fillStyle = '#f2c9a0';
      ctx.fill();
      ctx.strokeStyle = '#b5835a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Spiral eyes, wobbly mouth and tongue out
function drawDizzyFace() {
  for (const ex of [-10, 10]) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.3) {
      const rad = t * 0.6,
        a = t + performance.now() / 150;
      ctx.lineTo(ex + Math.cos(a) * rad, -4 + Math.sin(a) * rad);
    }
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.lineWidth = 3;
  for (let x = -10; x <= 10; x += 2) ctx.lineTo(x, 13 + Math.sin(x * 0.8) * 2);
  ctx.stroke();
  rr(1, 13, 7, 9, 3.5);
  ctx.fillStyle = '#ff6b8a';
  ctx.fill();
}

// Squeezed-shut >< eyes and an open, yelling mouth
function drawHurtFace() {
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, -9);
  ctx.lineTo(-7, -4);
  ctx.lineTo(-15, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, -9);
  ctx.lineTo(7, -4);
  ctx.lineTo(15, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 13, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 17, 5, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b8a';
  ctx.fill();
}

// Smiling, blinking, yawning, and eyes that follow the pointer or wander while idling
function drawCalmFace(h, ang) {
  const yawning = idling && idle.action === 'stretch' && idle.t > 20 && idle.t < idle.dur - 20;
  if (yawning || blinkT > 0) {
    ctx.lineWidth = 3;
    for (const ex of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(ex, -6, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else {
    let ox, oy;
    if (idling && idle.action === 'look') {
      ox = Math.sin(idle.t * 0.04) * 3;
      oy = 0;
    } else if (idling && idle.action === 'watch') {
      ox = -2;
      oy = 2.5;
    } else {
      const wx = pointer.x - h.x,
        wy = pointer.y - h.y;
      const lx = wx * Math.cos(-ang) - wy * Math.sin(-ang),
        ly = wx * Math.sin(-ang) + wy * Math.cos(-ang);
      const lm = Math.hypot(lx, ly) || 1;
      ox = (lx / lm) * 3;
      oy = (ly / lm) * 3;
    }
    for (const ex of [-10, 10]) {
      circle(ex, -4, 7);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(ex + ox, -4 + oy, 3.2);
      ctx.fillStyle = OUT;
      ctx.fill();
    }
  }
  if (yawning) {
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = OUT;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 8, 9, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawCirclingStars(h) {
  for (let i = 0; i < 3; i++) {
    const a = performance.now() / 300 + (i * Math.PI * 2) / 3;
    star(h.x + Math.cos(a) * 36, h.y - 30 + Math.sin(a) * 8, 7, a);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.strokeStyle = '#a07800';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// Cartoon x-ray flash while being electrocuted
function drawSkeleton() {
  const bones = [
    [B.neck, B.pelvis],
    [B.neck, B.lElbow, B.lHand],
    [B.neck, B.rElbow, B.rHand],
    [B.pelvis, B.lKnee, B.lFoot],
    [B.pelvis, B.rKnee, B.rFoot],
  ];
  for (const b of bones) chain(b, 22, '#222');
  circle(B.head.x, B.head.y, B.head.r);
  ctx.fillStyle = '#222';
  ctx.fill();
  for (const b of bones) {
    ctx.beginPath();
    ctx.moveTo(b[0].x, b[0].y);
    for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y);
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  const pv = B.pelvis,
    n = B.neck;
  for (let i = 1; i <= 3; i++) {
    const x = n.x + ((pv.x - n.x) * i) / 4,
      y = n.y + ((pv.y - n.y) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  circle(B.head.x, B.head.y, 18);
  ctx.fillStyle = '#f4f4f4';
  ctx.fill();
  ctx.fillStyle = '#222';
  circle(B.head.x - 7, B.head.y - 3, 5);
  ctx.fill();
  circle(B.head.x + 7, B.head.y - 3, 5);
  ctx.fill();
  ctx.fillRect(B.head.x - 6, B.head.y + 8, 12, 3);
}
