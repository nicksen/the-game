// Deterministic replay test.
//
// Plays a scripted session in headless Chrome: every room, every tool, grabbing and throwing, the airlock,
// healing. Randomness is seeded, the clock is fake, frames are stepped by hand and audio is off, so the same
// code always produces the same frames. Every 3rd frame the canvas pixels and HUD markup are hashed and
// compared with tests/replay-baseline.txt.
//
//   npm test               compare against the baseline
//   npm run test:update    re-record the baseline after an intended change in behavior or looks
//
// Pixel hashes depend on the browser's rendering and fonts, so a Chrome update or another OS can
// change them; re-record the baseline (and check the game still looks right) when that happens.

import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const ROOT = new URL('..', import.meta.url);
const GAME_URL = new URL('index.html', ROOT).href;
const BASELINE = fileURLToPath(new URL('tests/replay-baseline.txt', ROOT));
const ACTUAL = fileURLToPath(new URL('tests/replay-actual.txt', ROOT));
const ALL_TOOLS = ['grab', 'punch', 'chicken', 'fish', 'tomato', 'bat', 'hammer', 'bomb', 'zap', 'piano',
  'couch', 'rocket', 'vikings', 'meteor'];
const TOOL_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9', '0', 'c', '-', '=', 'v'];
const ROOM_COUNT = 6, SPACE_ROOM = 6;

// Runs in the page before the game loads
function freezeTheWorld({ tools }) {
  let seed = 12345;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let now = 0;
  performance.now = () => now;
  const RealDate = Date;
  window.Date = class extends RealDate {
    constructor(...a) { a.length ? super(...a) : super(1.7e12 + now); }
    static now() { return 1.7e12 + now; }
  };
  const frameCallbacks = [];
  window.requestAnimationFrame = cb => frameCallbacks.push(cb);
  window.AudioContext = undefined; window.webkitAudioContext = undefined;
  localStorage.setItem('smack-the-dummy-v1', JSON.stringify({ coins: 99999, total: 0, room: 'living', look: 'dummy', unlocked: tools }));

  const fnv = (h, v) => Math.imul(h ^ v, 16777619) >>> 0;
  // Advance one frame; optionally return a hash of the canvas and HUD
  window.__frame = hash => {
    now += 1000 / 60;
    frameCallbacks.splice(0).forEach(cb => cb(now));
    if (!hash) return null;
    const c = document.getElementById('game');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 4) h = fnv(h, d[i] | d[i + 1] << 8 | d[i + 2] << 16);
    // The toast fades on a real-time timer, so only its text is deterministic
    const ui = [...document.querySelectorAll('#hud, #toolbar, #menu')].map(e => e.outerHTML).join('|') +
      document.getElementById('toast').textContent;
    for (let i = 0; i < ui.length; i++) h = fnv(h, ui.charCodeAt(i));
    return h;
  };
}

async function record() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(freezeTheWorld, { tools: ALL_TOOLS });
  await page.goto(GAME_URL);

  const log = [];
  let frame = 0;
  const frames = async n => {
    for (let i = 0; i < n; i++) {
      const h = await page.evaluate(hash => window.__frame(hash), ++frame % 3 === 0);
      if (h !== null) log.push(`${frame}:${h}`);
    }
  };
  // Chrome delivers pointer events on its own (real) frame clock, so give each one time to land
  const mouse = async (action, ...args) => { await page.mouse[action](...args); await page.waitForTimeout(25); };
  const mark = async label => {
    const coins = await page.evaluate(() => JSON.parse(localStorage.getItem('smack-the-dummy-v1')).coins);
    log.push(`${label} coins=${coins}`);
  };
  const drag = async (x, y, dx, dy, moves) => {
    await mouse('move', x, y); await mouse('down'); await frames(2);
    for (let i = 0; i < moves; i++) { await mouse('move', x + i * dx, y + i * dy); await frames(1); }
    await mouse('up');
  };

  await frames(5);
  for (let room = 1; room <= ROOM_COUNT; room++) {
    if (room > 1) { await page.click('#roomBtn'); await frames(3); }
    if (room === 4) { await page.click('#looks .look:nth-child(2)'); await frames(3); }
    await page.click(`#rooms .room:nth-child(${room})`); await frames(40);

    for (const key of TOOL_KEYS) {
      await page.keyboard.press(key); await mouse('move', 600, 450); await frames(2);
      await mouse('click', 600, 450); await frames(45);
      await mouse('click', 560, 420); await frames(15);
      await mark(`room ${room}: tool key "${key}"`);
    }

    await page.keyboard.press('1'); await frames(60);
    await drag(600, 430, -40, -25, 8); await frames(80);
    await drag(250, 560, 60, -40, 6); await frames(60);

    if (room === SPACE_ROOM) {
      await page.keyboard.press('a'); await frames(300);
      await page.keyboard.press('a'); await frames(30);
      await page.click('#airlockBtn', { force: true }); await frames(30);
    }
    await page.click('#heal'); await frames(30);
    await page.click('#mute'); await frames(3);
    await mark(`room ${room}: grab, throw${room === SPACE_ROOM ? ', airlock' : ''}, heal`);
  }
  await page.keyboard.press('Escape'); await frames(3);
  await browser.close();
  return { log, errors, frame };
}

// Each step of the script ends with a "<label> coins=N" line; find the step a line belongs to, and the one before
function stepsAround(lines, i) {
  const labels = lines.map((l, k) => l.includes(' coins=') ? [k, l.split(' coins=')[0]] : null).filter(Boolean);
  const cur = labels.find(([k]) => k >= i), prev = [...labels].reverse().find(([k]) => k < i);
  return { cur: cur ? cur[1] : 'closing the menu', prev: prev ? prev[1] : 'start' };
}

const { log, errors, frame } = await record();
const text = log.join('\n') + '\n';

if (errors.length) {
  console.error('✗ The game threw errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, text);
  console.log(`✓ Recorded a new baseline: ${frame} frames, ${log.length} checkpoints.`);
  process.exit(0);
}
if (!existsSync(BASELINE)) {
  console.error('✗ No baseline yet. Record one with: npm run test:update');
  process.exit(1);
}

const expected = readFileSync(BASELINE, 'utf8').split('\n'), actual = text.split('\n');
const i = expected.findIndex((line, k) => line !== actual[k]);
if (i === -1 && expected.length === actual.length) {
  console.log(`✓ Replay matches the baseline: ${frame} frames, ${log.length} checkpoints.`);
} else {
  writeFileSync(ACTUAL, text);
  const at = i === -1 ? Math.min(expected.length, actual.length) : i;
  const { cur, prev } = stepsAround(expected, at);
  console.error(`✗ Replay differs from the baseline at line ${at + 1}, during step "${cur}" (previous step: "${prev}"):`);
  console.error(`    expected  ${expected[at] ?? '(nothing)'}\n    actual    ${actual[at] ?? '(nothing)'}`);
  console.error('  Full run written to tests/replay-actual.txt.');
  console.error('  If the change is intended, re-record with: npm run test:update');
  process.exit(1);
}
