// Checks the dummy gets up and stays up, with its legs under it. Runs the real game, bundled with
// tests/stand-entry.ts so the test can read the dummy's pose, on a frozen clock and random seed.

import { chromium } from 'playwright-core';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FPS = 60;
const SPACE_ROOM = 6,
  // Long enough to go through the idle animations it has in space
  SPACE_SECONDS = 60;
// The pelvis is 80px up when standing straight; 70 allows a slight bend at the knees
const STRAIGHT_PELVIS = 80,
  STANDING_PELVIS = 70;
const MAX_KNEE_OFF_LINE = 12;
// It pops back up rather than clambering
const GET_UP_TIME = 0.5,
  UNCROSS_TIME = 2;
const MAX_ELBOW_INWARD = 4;
// Walks stay this far from the walls
const WALL_MARGIN = 120,
  WALL_CLEARANCE = 100;
// Long enough for every idle animation, including a few whole walks
const IDLE_SECONDS = 90;
// A step lifts a foot clear of the floor; a planted foot barely moves
const STEP_LIFT = 6,
  MAX_FOOT_SLIDE = 2;
// Too narrow to walk at least 150px from the middle and stay 120px clear of the walls
const NARROW_ROOM = 500;
const MIN_WALK = 100,
  ARRIVE_WITHIN = 20;
const IDLE_ACTIONS = ['breathe', 'wave', 'stretch', 'tap', 'look', 'watch', 'walk'];
// A little sway while it straightens up
const MAX_GET_UP_DRIFT = 15;
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
const errors = [];

// A fresh game in the given room (1 is the living room), on a frozen clock and the same random seed every time, so
// each scenario is repeatable and none can affect another
async function freshGame(room = 1, width = 1200) {
  const page = await browser.newPage({ viewport: { width, height: 750 } });
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
  await page.click(`#rooms .room:nth-child(${room})`);

  // Advance `seconds`, returning the pose after every frame, measured up from the floor and across from the pelvis
  const run = (seconds) =>
    page.evaluate((frames) => {
      const poses = [];
      for (let i = 0; i < frames; i++) {
        window.__frame();
        const { standK, floorY, body: b, idleAction, walkTo, roomWidth, steppingFoot } = window.__pose();
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
          footX: [b.lFoot.x, b.rFoot.x],
          idleAction,
          walkTo,
          steppingFoot,
          roomWidth,
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
  return { page, run };
}

try {
  let { page, run } = await freshGame();
  const firstSecond = await run(1);
  const nextFive = await run(5);
  const lowest = Math.min(...[firstSecond.at(-1), ...nextFive].map((p) => p.pelvis));
  check(
    lowest >= STANDING_PELVIS,
    `stands within 1s of spawning and stays up for 5s (lowest pelvis ${lowest.toFixed(0)}px)`,
  );

  await page.close();

  // Knock it down the way a player does: a few punches (the starting tool) to the body
  ({ page, run } = await freshGame());
  await run(1);
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
  const recovered = afterShove.slice(allowedAt + GET_UP_TIME * FPS, allowedAt + (GET_UP_TIME + 5) * FPS);
  const lowestAfter = Math.min(...recovered.map((p) => p.pelvis));
  check(
    fell && recovered.length === 5 * FPS && lowestAfter >= STANDING_PELVIS,
    `after a knockdown${fell ? '' : ' (but it never fell)'}, stands within ${GET_UP_TIME}s of being allowed to and stays up for 5s (lowest pelvis ${lowestAfter.toFixed(0)}px)`,
  );

  // It gets up where it lies: the feet come in under it, rather than the body moving over to the feet or swaying
  const startsUp = afterShove[allowedAt];
  const drift = Math.max(
    ...afterShove.slice(allowedAt, allowedAt + 2 * FPS).map((p) => Math.abs(p.pelvisX - startsUp.pelvisX)),
  );
  check(drift <= MAX_GET_UP_DRIFT, `gets up in place (pelvis moves up to ${drift.toFixed(0)}px sideways)`);

  await page.close();

  // Legs that end up crossed in a heap, as they can after a tumble, should uncross as it gets up. Checked within
  // its first idle animation (breathing), before it could start walking.
  ({ page, run } = await freshGame());
  await run(1);
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
  const uncrossing = await run(UNCROSS_TIME);
  check(
    uncrossing.at(-1).feetInOrder && uncrossing.at(-1).kneesInOrder,
    `crossed legs uncross within ${UNCROSS_TIME}s`,
  );

  await page.close();

  // Idle long enough to go through every idle animation
  ({ page, run } = await freshGame());
  // Let it settle out of its spawn pose first
  await run(1);
  const idling = await run(IDLE_SECONDS);
  const played = new Set(idling.map((p) => p.idleAction));
  const idleLowest = Math.min(...idling.map((p) => p.pelvis)),
    idleHighest = Math.max(...idling.map((p) => p.pelvis));
  // Feet stay down, except going up on tiptoe for a stretch, the left foot tapping, and the stepping foot walking
  const feetDown = (p) =>
    p.idleAction === 'stretch'
      ? Math.max(p.leftFootLift, p.rightFootLift) <= STRETCH_LIFT
      : p.idleAction === 'tap'
        ? p.rightFootLift <= FOOT_ON_FLOOR
        : p.idleAction === 'walk'
          ? [p.leftFootLift, p.rightFootLift][1 - p.steppingFoot] <= FOOT_ON_FLOOR
          : Math.max(p.leftFootLift, p.rightFootLift) <= FOOT_ON_FLOOR;
  const liftedAt = idling.find((p) => !feetDown(p));
  check(
    played.size === IDLE_ACTIONS.length && !liftedAt && idleLowest >= STANDING_PELVIS && idleHighest <= TALLEST_PELVIS,
    `stays standing through ${IDLE_SECONDS}s of idling (played ${[...played].join(', ')}; pelvis ${idleLowest.toFixed(0)}–${idleHighest.toFixed(0)}px${liftedAt ? `; a foot lifted during ${liftedAt.idleAction}` : ''})`,
  );

  const walking = idling.filter((p) => p.idleAction === 'walk');
  const badTarget = walking.find(
    (p) => p.walkTo === null || p.walkTo < WALL_MARGIN || p.walkTo > p.roomWidth - WALL_MARGIN,
  );
  check(
    walking.length > 0 && !badTarget,
    `every walk heads for a spot inside the room, ${WALL_MARGIN}px clear of the walls${badTarget ? ` (but one headed for ${badTarget.walkTo})` : ''}`,
  );

  // Each whole walk on its own, from the frame it starts to the frame the next action begins. Walks already under
  // way when the recording starts, or still going when it ends, are left out.
  const walks = [];
  idling.forEach((p, i) => {
    if (p.idleAction !== 'walk' || i === 0) return;
    if (idling[i - 1].idleAction !== 'walk') walks.push([]);
    walks.at(-1)?.push(p);
  });
  if (idling.at(-1).idleAction === 'walk') walks.pop();
  const shortOrOff = walks.find((w) => {
    const covered = Math.abs(w.at(-1).pelvisX - w[0].pelvisX),
      miss = Math.abs(w.at(-1).pelvisX - w.at(-1).walkTo);
    return covered < MIN_WALK || miss > ARRIVE_WITHIN;
  });
  check(
    walks.length > 0 && !shortOrOff,
    `each of ${walks.length} walks covers at least ${MIN_WALK}px and ends within ${ARRIVE_WITHIN}px of its target` +
      (shortOrOff
        ? ` (one went from ${shortOrOff[0].pelvisX.toFixed(0)} to ${shortOrOff.at(-1).pelvisX.toFixed(0)}, aiming for ${shortOrOff.at(-1).walkTo.toFixed(0)})`
        : ''),
  );

  const nearestWall = Math.min(...walking.map((p) => Math.min(p.pelvisX, p.roomWidth - p.pelvisX)));
  check(
    nearestWall >= WALL_CLEARANCE,
    `walking never takes it within ${WALL_CLEARANCE}px of a wall (closest ${nearestWall.toFixed(0)}px)`,
  );

  // Stepping, not sliding: each foot lifts in turn, never both at once, and a foot on the floor stays put
  const steps = walks.flat();
  const bothUp = steps.filter((p) => Math.min(p.leftFootLift, p.rightFootLift) > FOOT_ON_FLOOR).length;
  // The planted foot is the one not stepping; judged while it stays planted across both frames
  const slide = Math.max(
    0,
    ...walks.flatMap((w) =>
      w.slice(1).map((p, i) => {
        const planted = 1 - p.steppingFoot;
        return w[i].steppingFoot === p.steppingFoot ? Math.abs(p.footX[planted] - w[i].footX[planted]) : 0;
      }),
    ),
  );
  const highest = (f) => Math.max(...steps.map((p) => [p.leftFootLift, p.rightFootLift][f]));
  check(
    steps.length > 0 &&
      highest(0) > STEP_LIFT &&
      highest(1) > STEP_LIFT &&
      bothUp === 0 &&
      slide < MAX_FOOT_SLIDE &&
      steps.every((p) => p.feetInOrder),
    `walking steps (feet lift ${highest(0).toFixed(0)}/${highest(1).toFixed(0)}px, both up in ${bothUp} frames, planted foot slides up to ${slide.toFixed(1)}px a frame)`,
  );

  const worstElbow = Math.max(...idling.map((p) => p.elbowInward));
  check(
    worstElbow <= MAX_ELBOW_INWARD,
    `while idling, the elbows bend outwards (worst elbow ${worstElbow.toFixed(0)}px inwards)`,
  );

  // After a knockdown, judged once it's had as long to sort its legs out as the crossed-legs check allows
  const settled = afterShove.slice(allowedAt + UNCROSS_TIME * FPS, allowedAt + (GET_UP_TIME + 5) * FPS);
  const standing = [...nextFive, ...settled, ...idling];
  const worstKnee = Math.max(...standing.map((p) => p.kneeOffLine));
  check(
    standing.every((p) => p.feetInOrder) && worstKnee <= MAX_KNEE_OFF_LINE,
    `while standing, the feet stay on their own sides and the knees near straight (worst knee ${worstKnee.toFixed(0)}px off)`,
  );

  await page.close();

  // A hit mid-walk knocks it down like any other time, and it gets up where it lands
  ({ page, run } = await freshGame());
  let pose;
  for (let i = 0; i < IDLE_SECONDS * FPS && pose?.idleAction !== 'walk'; i += 30) pose = (await run(0.5)).at(-1);
  await run(0.5);
  for (let i = 0; i < 5; i++) {
    const { x, y } = await page.evaluate(() => window.__pose().body.pelvis);
    await page.mouse.click(x, y);
    await run(0.1);
  }
  const afterHit = await run(8);
  const hitDown = afterHit.some((p) => p.pelvis < STANDING_PELVIS);
  const upAgain = afterHit.findIndex((p, i) => i > 0 && p.standK > 0 && afterHit[i - 1].standK === 0);
  const hitDrift = Math.max(
    ...afterHit.slice(upAgain, upAgain + 2 * FPS).map((p) => Math.abs(p.pelvisX - afterHit[upAgain].pelvisX)),
  );
  const upInTime = afterHit[upAgain + GET_UP_TIME * FPS]?.pelvis >= STANDING_PELVIS;
  check(
    pose?.idleAction === 'walk' && hitDown && upAgain > 0 && upInTime && hitDrift <= MAX_GET_UP_DRIFT,
    `a hit mid-walk knocks it down, and it gets up in place (moves up to ${hitDrift.toFixed(0)}px)`,
  );
  await page.close();

  // In a room too narrow for a proper stroll (like a phone held upright), it doesn't walk
  ({ page, run } = await freshGame(1, NARROW_ROOM));
  await run(1);
  const narrowActions = new Set((await run(IDLE_SECONDS)).map((p) => p.idleAction));
  check(
    !narrowActions.has('walk'),
    `doesn't walk in a ${NARROW_ROOM}px-wide room (idled: ${[...narrowActions].join(', ')})`,
  );
  await page.close();

  // The space room has no gravity, so it should float, not stand
  ({ page, run } = await freshGame(SPACE_ROOM));
  const floating = await run(SPACE_SECONDS);
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

  const spaceActions = new Set(floating.map((p) => p.idleAction));
  check(!spaceActions.has('walk'), `never walks in zero-g (idled: ${[...spaceActions].join(', ')})`);
  await page.close();

  check(errors.length === 0, `no errors in the page${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failures.length ? 1 : 0);
