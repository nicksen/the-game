'use strict';
// The game loop: a fixed 60 Hz simulation step, then a render

// The order matters: e.g. the airlock pulls on the dummy after it moves but before it collides.
function step() {
  const now = performance.now(),
    fy = floorY();
  trackPointer();
  steerDummy(now, fy);
  moveDummy();
  stepAirlock();
  collideDummy(fy);
  stepBombs(fy);
  stepPianos(fy);
  stepProps(fy);
  stepVikings(fy);
  stepCouches(fy);
  stepProjectiles(fy);
  stepZap();
  stepParticles(fy);
  stepTexts();
  stepTimers(now);
}

const STEP_MS = 1000 / 60,
  MAX_STEPS_PER_FRAME = 5;
let acc = 0,
  last = 0;

function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  let n = 0;
  while (acc >= STEP_MS && n < MAX_STEPS_PER_FRAME) {
    step();
    acc -= STEP_MS;
    n++;
  }
  if (n === MAX_STEPS_PER_FRAME) acc = 0;
  render();
  requestAnimationFrame(loop);
}

// A fresh dummy and furniture, with everything thrown so far cleared away
function resetScene() {
  buildDummy();
  buildProps();
  heldProp = null;
  pain = 0;
  sessionDmg = 0;
  hurtT = 0;
  drag = null;
  bombs.length = 0;
  pianos.length = 0;
  projectiles.length = 0;
  couches.length = 0;
  vikings.length = 0;
  zapT = 0;
  airlock.t = -1;
  airlock.cooldown = 0;
  updateAirlockBtn();
}

function boot() {
  resize();
  buildDummy();
  buildProps();
  updateHud();
  updateAirlockBtn();
  renderTools();
  canvas.style.cursor = 'none';
  openMenu();
  last = performance.now();
  requestAnimationFrame(loop);
}

boot();
