// Checks the dummy gets up and stays up, with its legs under it. Runs the real game, bundled with
// tests/stand-entry.ts so the test can read the dummy's pose, on a frozen clock and random seed.

import { chromium } from 'playwright-core';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FPS = 60;
// The pelvis is 80px up when standing straight; 70 allows a slight bend at the knees
const STRAIGHT_PELVIS = 80,
  STANDING_PELVIS = 70;
const MAX_KNEE_OFF_LINE = 12;
const MAX_ELBOW_INWARD = 4;
const IDLE_ACTIONS = ['breathe', 'wave', 'stretch', 'tap', 'look', 'watch'];
// Feet shuffle a little under the hips as it straightens up
const MAX_GET_UP_DRIFT = 30;
// Feet count as on the floor within 3px; reaching up for a stretch lifts it onto its toes a little more
const FOOT_ON_FLOOR = 3,
  STRETCH_LIFT = 10;
const TALLEST_PELVIS = STRAIGHT_PELVIS + STRETCH_LIFT;

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failures.push(what);
};

const dir = mkdtempSync(`${tmpdir()}/stand-test-`);
const build = Bun.spawnSync([
  'bun',
  'build',
  ROOT + 'tests/stand-entry.ts',
  '--format=iife',
  '--outfile',
  dir + '/stand.js',
]);
if (build.exitCode !== 0) throw new Error(build.stderr.toString());
writeFileSync(dir + '/index.html', readFileSync(ROOT + 'index.html', 'utf8').replace('build/game.js', 'stand.js'));
copyFileSync(ROOT + 'style.css', dir + '/style.css');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    let seed = 12345;
    Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    // Start the clock well past zero, so the dummy hasn't just "been hit" at time 0
    let now = 100000;
    performance.now = () => now;
    const frameCallbacks = [];
    window.requestAnimationFrame = (cb) => frameCallbacks.push(cb);
    window.AudioContext = undefined;
    window.__frame = () => {
      now += 1000 / 60;
      frameCallbacks.splice(0).forEach((cb) => cb(now));
    };
  });
  await page.goto('file://' + dir + '/index.html');
  await page.click('#rooms .room:nth-child(1)');

  // Advance `seconds`, returning the pose after every frame, measured up from the floor and across from the pelvis
  const run = (seconds) =>
    page.evaluate((frames) => {
      const poses = [];
      for (let i = 0; i < frames; i++) {
        window.__frame();
        const { standK, floorY, body: b, idleAction } = window.__pose();
        const up = (p) => floorY - p.y;
        // How far a knee is from the straight line between the pelvis and its foot
        const offLine = (knee, foot) => {
          const dx = foot.x - b.pelvis.x,
            dy = foot.y - b.pelvis.y;
          return Math.abs(dy * (knee.x - b.pelvis.x) - dx * (knee.y - b.pelvis.y)) / Math.hypot(dx, dy);
        };
        // Which side of the line from the neck to its hand an elbow is on: positive is to the left (outwards for
        // the left arm), negative to the right
        const sideOfArm = (elbow, hand) => {
          const dx = hand.x - b.neck.x,
            dy = hand.y - b.neck.y;
          return (dx * (elbow.y - b.neck.y) - dy * (elbow.x - b.neck.x)) / Math.hypot(dx, dy);
        };
        poses.push({
          standK,
          pelvisX: b.pelvis.x,
          feetX: (b.lFoot.x + b.rFoot.x) / 2,
          idleAction,
          pelvis: up(b.pelvis),
          leftFootLift: up(b.lFoot) - b.lFoot.r,
          rightFootLift: up(b.rFoot) - b.rFoot.r,
          feetInOrder: b.lFoot.x < b.pelvis.x && b.pelvis.x < b.rFoot.x,
          kneesInOrder: b.lKnee.x < b.rKnee.x,
          kneeOffLine: Math.max(offLine(b.lKnee, b.lFoot), offLine(b.rKnee, b.rFoot)),
          elbowInward: Math.max(-sideOfArm(b.lElbow, b.lHand), sideOfArm(b.rElbow, b.rHand)),
        });
      }
      return poses;
    }, seconds * FPS);

  const firstSecond = await run(1);
  const nextFive = await run(5);
  const lowest = Math.min(...[firstSecond.at(-1), ...nextFive].map((p) => p.pelvis));
  check(
    lowest >= STANDING_PELVIS,
    `stands within 1s of spawning and stays up for 5s (lowest pelvis ${lowest.toFixed(0)}px)`,
  );

  // Knock it down the way a player does: a few punches (the starting tool) to the body
  for (let i = 0; i < 5; i++) {
    const { x, y } = await page.evaluate(() => window.__pose().body.pelvis);
    await page.mouse.click(x, y);
    await run(0.1);
  }
  const afterShove = await run(15);
  const fell = afterShove.some((p) => p.pelvis < STANDING_PELVIS);
  // Recovery counts from when it's allowed to stand again; if the fall never stopped it, from the shove
  const allowedAgain = afterShove.findIndex((p, i) => i > 0 && p.standK > 0 && afterShove[i - 1].standK === 0);
  const allowedAt = Math.max(0, allowedAgain);
  const recovered = afterShove.slice(allowedAt + 4 * FPS, allowedAt + 9 * FPS);
  const lowestAfter = Math.min(...recovered.map((p) => p.pelvis));
  check(
    fell && recovered.length === 5 * FPS && lowestAfter >= STANDING_PELVIS,
    `after a knockdown${fell ? '' : ' (but it never fell)'}, stands within 4s of being allowed to and stays up for 5s (lowest pelvis ${lowestAfter.toFixed(0)}px)`,
  );

  // Getting up means rising over its feet, not sliding across the floor
  const startsUp = afterShove[allowedAt];
  const drift = Math.abs(afterShove[allowedAt + 4 * FPS].pelvisX - startsUp.feetX);
  check(drift <= MAX_GET_UP_DRIFT, `gets up over its feet (ends ${drift.toFixed(0)}px from where its feet were)`);

  // Legs that end up crossed in a heap, as they can after a tumble, should uncross as it gets up
  await page.evaluate(() => {
    const b = window.__pose().body;
    for (const [l, r] of [
      [b.lKnee, b.rKnee],
      [b.lFoot, b.rFoot],
    ]) {
      for (const p of [l, r]) {
        p.x = 2 * b.pelvis.x - p.x;
        p.px = p.x;
      }
    }
  });
  const uncrossing = await run(4);
  check(uncrossing.at(-1).feetInOrder && uncrossing.at(-1).kneesInOrder, 'crossed legs uncross within 4s');

  // Idle long enough to go through every idle animation
  const idling = await run(60);
  const played = new Set(idling.map((p) => p.idleAction));
  const idleLowest = Math.min(...idling.map((p) => p.pelvis)),
    idleHighest = Math.max(...idling.map((p) => p.pelvis));
  // Feet stay down, except going up on tiptoe for a stretch and the left foot tapping
  const feetDown = (p) =>
    p.idleAction === 'stretch'
      ? Math.max(p.leftFootLift, p.rightFootLift) <= STRETCH_LIFT
      : p.idleAction === 'tap'
        ? p.rightFootLift <= FOOT_ON_FLOOR
        : Math.max(p.leftFootLift, p.rightFootLift) <= FOOT_ON_FLOOR;
  const liftedAt = idling.find((p) => !feetDown(p));
  check(
    played.size === IDLE_ACTIONS.length && !liftedAt && idleLowest >= STANDING_PELVIS && idleHighest <= TALLEST_PELVIS,
    `stays standing through 60s of idling (played ${[...played].join(', ')}; pelvis ${idleLowest.toFixed(0)}–${idleHighest.toFixed(0)}px${liftedAt ? `; a foot lifted during ${liftedAt.idleAction}` : ''})`,
  );

  const worstElbow = Math.max(...idling.map((p) => p.elbowInward));
  check(
    worstElbow <= MAX_ELBOW_INWARD,
    `while idling, the elbows bend outwards (worst elbow ${worstElbow.toFixed(0)}px inwards)`,
  );

  const standing = [...nextFive, ...recovered, ...idling];
  const worstKnee = Math.max(...standing.map((p) => p.kneeOffLine));
  check(
    standing.every((p) => p.feetInOrder) && worstKnee <= MAX_KNEE_OFF_LINE,
    `while standing, the feet stay on their own sides and the knees near straight (worst knee ${worstKnee.toFixed(0)}px off)`,
  );

  // The space room has no gravity, so it should float, not stand
  await page.click('#roomBtn');
  await page.click('#rooms .room:last-child');
  const floating = await run(10);
  const standingInSpace =
    floating.filter(
      (p) =>
        p.pelvis >= STANDING_PELVIS &&
        p.pelvis <= TALLEST_PELVIS &&
        Math.max(p.leftFootLift, p.rightFootLift) <= FOOT_ON_FLOOR,
    ).length / floating.length;
  // It drifts and may bump into the floor, but shouldn't hold a standing pose
  check(
    standingInSpace <= 0.1,
    `doesn't stand in zero-g (standing ${(standingInSpace * 100).toFixed(0)}% of the time)`,
  );

  check(errors.length === 0, `no errors in the page${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failures.length ? 1 : 0);
