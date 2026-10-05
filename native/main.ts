// Prototype: the game in a native SDL window, drawn by Skia, with native Web Audio. No browser, no server.
//
//   bun native/main.ts            play (keys pick tools as usual, Tab cycles rooms)
//   bun native/main.ts --demo     scripted run that saves screenshots to /tmp/native-spike and quits
//
// The HTML parts (HUD, toolbar, menu) aren't drawn yet: that's the planned UI rewrite.

import { loadSdl } from './load-sdl.ts';
// node-web-audio-api loads its addon through createRequire, which the bundler can't follow: embed it under its
// own name (build with --asset-naming="[name].[ext]") so that require finds it inside the executable
import '../node_modules/node-web-audio-api/node-web-audio-api.darwin-arm64.node' with { type: 'file' };
import { AudioContext } from 'node-web-audio-api';
import { mkdirSync } from 'fs';
import { gameFiles } from '../launcher/embed-game.ts' with { type: 'macro' };
import { tmpdir } from 'os';
import { FakeCanvas, makeDocument, addEmojiFallback, fileStorage } from './dom-shim.ts';

const DEMO = process.argv.includes('--demo');

const sdl = await loadSdl();
const win = sdl.video.createWindow({ title: 'Smack the Dummy', width: 1200, height: 750, resizable: true });
const gameCanvas = new FakeCanvas();
const windowListeners: Record<string, ((e: any) => void)[]> = {};
const frameCallbacks: ((t: number) => void)[] = [];

// ---------- The browser globals the game expects ----------
const g = globalThis as any;
addEmojiFallback();
Object.assign(g, {
  window: g,
  document: makeDocument(gameCanvas),
  innerWidth: win.width,
  innerHeight: win.height,
  devicePixelRatio: win.pixelWidth / win.width,
  localStorage: fileStorage(`${tmpdir()}/native-spike/save.json`),
  AudioContext,
  requestAnimationFrame: (cb: (t: number) => void) => frameCallbacks.push(cb),
  addEventListener: (type: string, fn: (e: any) => void) => (windowListeners[type] ??= []).push(fn),
});
const fireWindow = (type: string, e: any = {}) => windowListeners[type]?.forEach(fn => fn(e));

// The cursor: the game hides it (style.cursor = 'none') and draws the tool icon instead
Object.defineProperty(gameCanvas.style, 'cursor', { set: (v: string) => sdl.mouse.showCursor(v !== 'none') });

// ---------- Load the game ----------
// Same files and order as index.html, run as one script so they share scope the way classic scripts do
const FILES = gameFiles();
const order = [...FILES['/index.html'].matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => '/' + m[1]);
const code = order.map(f => FILES[f]).join('\n;\n') +
  '\n;globalThis.__game = { chooseRoom, ROOMS, get roomId() { return roomId; }, get tool() { return tool; }, get audio() { return AC; }, save };';
(0, eval)(code);
const game = g.__game;
game.chooseRoom('living');

// ---------- SDL input -> the DOM events the game listens for ----------
const pointer = (e: { x: number; y: number }) => ({ clientX: e.x, clientY: e.y, pointerId: 1 });
const input = {
  move: (e: { x: number; y: number }) => gameCanvas.dispatch('pointermove', pointer(e)),
  down: (e: { x: number; y: number }) => gameCanvas.dispatch('pointerdown', pointer(e)),
  up: () => fireWindow('pointerup'),
  key(key: string) {
    if (key === 'tab') {
      const i = game.ROOMS.findIndex((r: any) => r.id === game.roomId);
      return game.chooseRoom(game.ROOMS[(i + 1) % game.ROOMS.length].id);
    }
    fireWindow('keydown', { key: key === 'escape' ? 'Escape' : key });
  },
};
win.on('mouseMove', input.move);
win.on('mouseButtonDown', input.down);
win.on('mouseButtonUp', input.up);
win.on('leave', () => gameCanvas.dispatch('pointerleave', {}));
win.on('keyDown', e => { if (e.key && !e.repeat) input.key(e.key); });
win.on('resize', e => {
  Object.assign(g, { innerWidth: e.width, innerHeight: e.height, devicePixelRatio: e.pixelWidth / e.width });
  fireWindow('resize');
});
win.on('close', () => process.exit(0));

// ---------- Frame loop: run the game's frame, then show the canvas in the window ----------
let frames = 0;
function frame() {
  frameCallbacks.splice(0).forEach(cb => cb(performance.now()));
  const { width, height } = gameCanvas.skia, px = gameCanvas.skia.data();
  if (!win.destroyed) win.render(width, height, width * 4, 'rgba32', px);
  frames++;
}
setInterval(frame, 1000 / 60);

if (DEMO) await demo();

// Plays a little through the same input path as real SDL events, saving what the window shows
async function demo() {
  const out = `${tmpdir()}/native-spike`;
  mkdirSync(out, { recursive: true });
  const shot = async (name: string) => Bun.write(`${out}/${name}.png`, await gameCanvas.skia.encode('png'));
  const errors: string[] = [];
  process.on('uncaughtException', e => errors.push(String(e)));
  const t0 = performance.now(), f0 = frames;
  await Bun.sleep(800); await shot('1-idle');
  input.key('2'); input.move({ x: 600, y: 470 }); await Bun.sleep(100);
  for (let i = 0; i < 4; i++) { input.down({ x: 600, y: 470 }); input.up(); await Bun.sleep(180); }
  await shot('2-punched');
  input.key('8'); input.down({ x: 520, y: 400 }); input.up(); await Bun.sleep(2200); await shot('3-bomb');
  for (let i = 0; i < 5; i++) input.key('tab');
  input.key('a'); await Bun.sleep(2500); await shot('4-space-airlock');
  const fps = Math.round((frames - f0) / ((performance.now() - t0) / 1000));
  const audio = game.audio;
  console.log(JSON.stringify({ fps, room: game.roomId, coins: game.save.coins, audio: audio?.state ?? 'not started',
    window: `${win.width}x${win.height} (${win.pixelWidth}x${win.pixelHeight} px)`, errors }));
  process.exit(errors.length ? 1 : 0);
}
