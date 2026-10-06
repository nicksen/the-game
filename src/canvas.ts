// Canvas, screen size, random helpers and shared drawing primitives

import { byId } from './dom.ts';

export const canvas = byId('game', HTMLCanvasElement);
export let ctx = canvas.getContext('2d');
export let W = 0,
  H = 0;

export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
// Points the drawing globals at another canvas for the length of `draw`
export function drawingInto(context, width, height, draw) {
  const saved = { ctx, W, H };
  ctx = context;
  W = width;
  H = height;
  draw();
  ({ ctx, W, H } = saved);
}
export const floorY = () => H - 110;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- Colors ----------
export const OUT = '#1d1d1d';
export const YEL = [245, 196, 0],
  RED = [255, 80, 60];
// Blend two [r, g, b] colors; t = 0 gives a, t = 1 gives b
export const mix = (a, b, t) =>
  `rgb(${(a[0] + (b[0] - a[0]) * t) | 0},${(a[1] + (b[1] - a[1]) * t) | 0},${(a[2] + (b[2] - a[2]) * t) | 0})`;

// ---------- Drawing primitives ----------
// Rounded-rectangle path
export function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
// Five-pointed star path
export function star(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5,
      rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}
// Stroke a single line segment
export function seg(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
// Filled rectangle with an optional outline (pass stroke = null for none)
export function box(x, y, w, h, fill, stroke = 'rgba(0,0,0,0.45)', lw = 3) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(x, y, w, h);
  }
}

// Floor shadow that shrinks and fades the higher `height` above the floor the object is
export function drawShadow(x, height, w) {
  const fy = floorY();
  const s = Math.max(0.3, 1 - height / 500);
  ctx.fillStyle = `rgba(0,0,0,${0.3 * s})`;
  ctx.beginPath();
  ctx.ellipse(x, fy + 4, w * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Cartoon limb pieces: an outlined line through `pts`, a round outlined end, and a joint dot
export function chain(pts, w, col) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 6;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}
export function blob(p, r, col) {
  circle(p.x, p.y, r);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
}
export function joint(p) {
  circle(p.x, p.y, 3.5);
  ctx.fillStyle = OUT;
  ctx.fill();
}
