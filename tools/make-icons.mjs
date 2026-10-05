// Draws the app icons (the crash-test dummy's head on a comic starburst) and saves them to icons/.
//
//   bun tools/make-icons.mjs
//
// Icons are full-bleed squares with the art inside the central 80%, so they work both as normal icons
// and as "maskable" ones that Android crops to a circle or rounded square.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));
const SIZES = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180 };

function draw(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.scale(size / 100, size / 100);

  const bg = ctx.createRadialGradient(50, 42, 5, 50, 50, 75);
  bg.addColorStop(0, '#45456b'); bg.addColorStop(1, '#1b1b2f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 100, 100);

  // Jagged comic "POW" burst: red outside, yellow inside
  const burst = (scale, fill) => {
    ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const a = i * Math.PI / 11 - 0.3, r = (i % 2 ? 26 : 34 + (i % 4 === 0 ? 6 : 0)) * scale;
      ctx.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d1d1d'; ctx.stroke();
  };
  burst(1, '#e8322a');
  burst(0.8, '#ffd23f');

  // Head
  ctx.beginPath(); ctx.arc(50, 52, 23, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c400'; ctx.fill(); ctx.lineWidth = 3.5; ctx.stroke();

  // Crash-test marker
  const mx = 62, my = 39, mr = 6;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fillStyle = '#ffe14d'; ctx.fill();
  ctx.fillStyle = '#1d1d1d';
  for (const start of [0, Math.PI]) {
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, mr, start, start + Math.PI / 2); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.stroke();

  // Band-aid
  ctx.save(); ctx.translate(37, 37);
  for (const rot of [0.6, 0.6 + Math.PI / 2]) {
    ctx.save(); ctx.rotate(rot);
    ctx.beginPath(); ctx.roundRect(-9, -3, 18, 6, 3);
    ctx.fillStyle = '#f2c9a0'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#b5835a'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = '#1d1d1d';

  // Dazed spiral eyes and a wobbly mouth
  ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (const ex of [41, 57]) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.2) {
      const rad = t * 0.45;
      ctx.lineTo(ex + Math.cos(t) * rad, 50 + Math.sin(t) * rad);
    }
    ctx.stroke();
  }
  ctx.beginPath(); ctx.lineWidth = 2.4;
  for (let x = 40; x <= 60; x += 1) ctx.lineTo(x, 64 + Math.sin(x * 0.9) * 1.6);
  ctx.stroke();

  return c.toDataURL('image/png');
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
mkdirSync(OUT, { recursive: true });
for (const [name, size] of Object.entries(SIZES)) {
  const url = await page.evaluate(draw, size);
  writeFileSync(OUT + name, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`icons/${name} (${size}x${size})`);
}
await browser.close();
