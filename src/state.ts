// Shared game state, the dummy's dialogue, and damage/coin bookkeeping

import { pick, rand } from './canvas.ts';
import { persist, save } from './save.ts';
import { zeroG } from './physics.ts';
import { addText, burst } from './effects.ts';
import { AIRLOCK, airlock } from './airlock.ts';
import { updateHud } from './ui.ts';

// ---------- Input ----------
export const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0, inside: false };
export let drag = null,
  heldProp = null;
export function startDrag(p) {
  drag = p;
}
export function endDrag() {
  drag = null;
}
export function holdProp(pr) {
  heldProp = pr;
}
export function dropProp() {
  heldProp = null;
}

// ---------- How the dummy is doing ----------
const DIZZY_PAIN = 70;
export let pain = 0,
  hurtT = 0,
  bodyFlash = 0;
export let combo = 0,
  lastHit = 0,
  lastIdle = performance.now(),
  sessionDmg = 0,
  wasDizzy = false;
export const idle = { action: 'breathe', t: 0, dur: 200 };
export let speech = null;
export const isDizzy = () => pain > DIZZY_PAIN;
export function resetDummyCondition() {
  pain = 0;
  sessionDmg = 0;
  hurtT = 0;
}

// ---------- Screen effects ----------
export const screenFx = { shake: 0, flash: 0, swingT: 0 };

// ---------- Things in the room ----------
export const particles = [],
  texts = [],
  bombs = [],
  pianos = [],
  projectiles = [],
  couches = [],
  vikings = [];

// ---------- Dialogue ----------
export const LINES = {
  hit: [
    'Ow!',
    'Not the face!',
    'Hey!',
    'Rude!',
    'My spleen!',
    'I felt that!',
    'Ouchie!',
    'Was that necessary?',
    "I'm telling HR!",
    'Mommy!',
    'Ugh!',
    'Why me?',
  ],
  big: ['AAAAARGH!', 'WHY?!', 'MY WARRANTY!', 'I SEE MY ANCESTORS', 'OKAY THAT ONE HURT'],
  chicken: ['...a chicken?', 'Bawk?!', 'This is humiliating.', 'Is that... rubber?'],
  grab: ['Put me down!', 'Wheee!', 'Not again!', 'Careful, I bruise easily!'],
  idle: [
    "Is that all you've got?",
    "I'm bored...",
    'Hellooo?',
    "Bet you can't hit me!",
    '*whistles*',
    'Did you forget about me?',
    'I could do this all day.',
  ],
  wave: ['Hi there!', 'Hellooo!', 'Yoo-hoo!'],
  watch: ['Any time now...', 'Tick tock...', 'I have a meeting at three.'],
  stretch: ['*yaaawn*', "Ahh, that's the spot."],
  dizzy: ['I see stars...', 'Wh-where am I?', 'Is it Tuesday?', 'Mama, the birds...'],
  heal: ['Good as new!', 'Ready for round two!', 'I feel fantastic!'],
  fish: ['Did you just slap me with a FISH?', 'Smells like low tide.', 'Something smells fishy!'],
  tomato: ["I'm a dummy, not a salad!", 'Now I need a shower.', 'Is this ketchup?!'],
  zap: ['I can see my bones!', 'Shocking!', 'My circuits!', 'That tickles... A LOT!'],
  hammer: ['My head is not a nail!', 'Stop hammering me!', "I'm shorter now."],
  furniture: ['Put that back!', 'Watch the furniture!', 'Who decorates like this?!', 'That was an heirloom!'],
  couch: ['Not the furniture!', 'I just wanted to sit down!', 'Who throws a COUCH?!', 'Comfy... but OW!'],
  vikings: ['VIKINGS?!', 'I come in peace!', 'Not the pillaging!', 'Is it Ragnarök already?!', 'Valhalla can wait!'],
  airlock: [
    'NOT THE AIRLOCK!',
    'Hold the door!',
    "I'm too young to be space junk!",
    'Who pressed the big red button?!',
  ],
  space: [
    'Houston, I have a problem.',
    'In space, no one can hear me scream.',
    'Which way is up?!',
    'I think I left my stomach on Earth.',
    'One small smack for man...',
    'Wheee... slowly.',
  ],
};

export function say(lines, force = false) {
  if (!force && speech && speech.t < 70) return;
  speech = { text: pick(lines), t: 0 };
}

// Comic sound-effect words popped up on big hits, by damage kind
export const WORDS = {
  punch: ['POW!', 'BAM!', 'WHAM!', 'SMACK!'],
  bat: ['WHACK!', 'BONK!', 'CRACK!'],
  chicken: ['SQUEAK!', 'BAWK!'],
  impact: ['THUD!', 'SPLAT!', 'CRUNCH!'],
  bomb: ['KA-BOOM!'],
  piano: ['CRASH!'],
  fish: ['SLAP!', 'SPLOSH!'],
  tomato: ['SPLAT!'],
  hammer: ['CLANG!', 'BONK!', 'THWACK!'],
  zap: ['BZZZT!', 'ZAP!'],
  rocket: ['KA-BOOM!'],
  meteor: ['KRAKOOM!'],
  vikings: ['CHOP!', 'HACK!', 'SKÅL!', 'RAAAH!'],
  couch: ['WHUMP!', 'CRASH!', 'SOFA SLAM!'],
  furniture: ['CRASH!', 'WHAM!', 'KER-SMASH!'],
};
export const WORD_COLORS = ['#ff3b3b', '#ffd23f', '#3bd1ff', '#ff7bd5', '#7dff6b'];

// ---------- Damage ----------
// Hurts the dummy at body point `p`, pays out coins (more during a combo) and reacts.
export function damage(p, amount, kind = 'impact') {
  amount = Math.max(1, Math.round(amount));
  const now = performance.now();
  combo = now - lastHit < 1300 ? combo + 1 : 1;
  lastHit = now;
  let earned = Math.max(1, Math.round(amount * 0.5 * (1 + Math.min(combo, 20) * 0.1)));
  // A free airlock blast only pays out so much, or furniture crushing the dummy would print coins
  if (airlock.t >= 0) {
    earned = Math.min(earned, AIRLOCK.maxCoins - airlock.earned);
    airlock.earned += earned;
  }
  save.coins += earned;
  save.total += amount;
  sessionDmg += amount;
  persist();
  updateHud();

  pain += amount;
  hurtT = 35;
  bodyFlash = 1;
  screenFx.shake = Math.min(30, screenFx.shake + amount * 0.5);
  if (earned > 0) addText(p.x + rand(-10, 10), p.y - p.r - 10, '+' + earned + ' 🪙', '#ffd23f', 18);
  if (amount >= 6) burst(p.x, p.y, Math.min(12, 2 + amount / 4), 'star', { speed: 6, life: 35, size: 7 });
  if (amount >= 10 && Math.random() < 0.7) {
    addText(
      p.x + rand(-40, 40),
      p.y - 50,
      pick(WORDS[kind] || WORDS.impact),
      pick(WORD_COLORS),
      38 + Math.min(amount, 40) * 0.5,
      rand(-0.3, 0.3),
    );
  }
  if (kind === 'chicken') say(LINES.chicken);
  else if (LINES[kind] && Math.random() < 0.5) say(LINES[kind]);
  else if (amount >= 30) say(LINES.big, true);
  else if (Math.random() < 0.35) say(LINES.hit);
}

// Pain and flashes fade, speech bubbles expire, and the dummy pipes up when dizzy or bored.
export function stepTimers(now) {
  pain = Math.max(0, pain * 0.996 - 0.25);
  if (hurtT > 0) hurtT--;
  bodyFlash *= 0.85;
  screenFx.flash *= 0.88;
  screenFx.swingT *= 0.8;
  screenFx.shake = screenFx.shake < 0.3 ? 0 : screenFx.shake * 0.85;
  if (speech && ++speech.t > 120) speech = null;

  const dizzy = isDizzy();
  if (dizzy && !wasDizzy) say(LINES.dizzy, true);
  wasDizzy = dizzy;

  if (now - lastHit > 7000 && now - lastIdle > 7000) {
    lastIdle = now;
    say(zeroG() ? LINES.space : LINES.idle);
  }
}
