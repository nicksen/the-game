'use strict';
// Particles and floating comic text

// ---------- Particles ----------
function burst(x, y, n, type, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (o.speed || 5) * rand(0.3, 1.3);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0),
      life: 0, max: (o.life || 40) * rand(0.6, 1.2), type,
      size: (o.size || 6) * rand(0.6, 1.4), rot: Math.random() * 6, vr: rand(-0.15, 0.15),
      color: o.color || pick(['#222', '#eee', '#8b4513']),
    });
  }
}

function stepParticles(fy) {
  const g = phys().g;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    switch (p.type) {
      case 'star': p.vy += 0.25 * g; p.vx *= 0.97; break;
      case 'feather': p.vy = p.vy * 0.9 + 0.08 * g; p.vx *= 0.95; p.x += Math.sin(p.life * 0.2) * 0.8 * g; break;
      case 'smoke': p.vx *= 0.95; p.vy = p.vy * 0.95 - 0.05 * g; p.size += 0.4; break;
      case 'fire': p.vx *= 0.9; p.vy = p.vy * 0.9 - 0.1 * g; break;
      case 'debris':
        p.vy += 0.5 * g;
        if (p.y > fy) { p.y = fy; p.vy *= -0.4; p.vx *= 0.7; }
        break;
      case 'drop':
        p.vy += 0.35 * g;
        if (p.y > fy) { p.y = fy; p.vy = 0; p.vx *= 0.5; }
        break;
    }
    if (p.life >= p.max) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, 1 - p.life / p.max);
    ctx.globalAlpha = a;
    switch (p.type) {
      case 'star':
        star(p.x, p.y, p.size, p.rot); ctx.fillStyle = '#ffe14d'; ctx.fill();
        ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.5; ctx.stroke(); break;
      case 'feather':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore(); break;
      case 'smoke':
        ctx.globalAlpha = a * 0.45; circle(p.x, p.y, p.size); ctx.fillStyle = '#777'; ctx.fill(); break;
      case 'fire': {
        const t = p.life / p.max;
        circle(p.x, p.y, p.size * (1 - t * 0.5));
        ctx.fillStyle = mix([255, 230, 80], [220, 40, 20], t); ctx.fill(); break;
      }
      case 'debris':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        ctx.restore(); break;
      case 'drop':
        circle(p.x, p.y, p.size); ctx.fillStyle = p.color; ctx.fill(); break;
      case 'wind':
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2;
        seg(p.x, p.y, p.x - p.vx * 4, p.y - p.vy * 4); break;
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- Comic text ----------
function addText(x, y, text, color, size, rot = 0) {
  texts.push({ x, y, text, color, size, rot, life: 0, max: 50 });
}

function stepTexts() {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life++; t.y -= 1.2;
    if (t.life >= t.max) texts.splice(i, 1);
  }
}

function drawTexts() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const t of texts) {
    const pop = t.life < 6 ? 0.6 + t.life / 6 * 0.6 : 1.2 - Math.min(0.2, (t.life - 6) / 30);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (t.max - t.life) / 15);
    ctx.translate(t.x, t.y); ctx.rotate(t.rot); ctx.scale(pop, pop);
    ctx.font = `900 ${t.size}px Impact, "Arial Black", sans-serif`;
    ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(3, t.size / 7); ctx.strokeText(t.text, 0, 0);
    ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
}
