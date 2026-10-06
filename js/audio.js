// Synthesized sound effects (no audio assets)

import { pick, rand } from './canvas.js';

let AC = null,
  noiseBuf = null,
  muted = false,
  lastHitSound = 0;
export function toggleMute() {
  muted = !muted;
  return muted;
}
export function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function envelope(g, t, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function noise(dur, type, freq, peak, freqEnd) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = a.createGain();
  envelope(g, t, peak, dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}
function tone(type, f0, f1, dur, peak, delay = 0) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.createGain();
  envelope(g, t, peak, dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export const sfx = {
  hit(i) {
    const now = performance.now();
    if (now - lastHitSound < 45) return;
    lastHitSound = now;
    i = Math.min(1, i);
    tone('sine', rand(160, 240), 45, 0.18, 0.15 + 0.45 * i);
    noise(0.08, 'lowpass', 1500 + i * 1500, 0.05 + 0.3 * i);
  },
  bonk() {
    tone('triangle', 650, 180, 0.15, 0.35);
  },
  swoosh() {
    noise(0.18, 'bandpass', 500, 0.12, 2500);
  },
  squeak() {
    const f = rand(700, 1000);
    tone('square', f, f * 1.8, 0.12, 0.07);
    tone('square', f * 1.8, f * 0.9, 0.15, 0.06, 0.12);
  },
  boom() {
    noise(1.2, 'lowpass', 900, 0.9, 60);
    tone('sine', 90, 25, 0.8, 0.8);
  },
  piano() {
    const notes = [130.8, 155.6, 185, 207.7, 261.6, 311.1, 370, 415.3, 523.3];
    for (let i = 0; i < 6; i++) tone('triangle', pick(notes), null, 1.4, 0.12, Math.random() * 0.04);
    noise(0.3, 'lowpass', 2000, 0.5);
    tone('sine', 70, 30, 0.5, 0.6);
  },
  slap() {
    noise(0.07, 'highpass', 900, 0.5);
    tone('sine', 320, 110, 0.12, 0.3);
  },
  splat() {
    noise(0.15, 'lowpass', 700, 0.5, 200);
    tone('sine', 140, 60, 0.12, 0.3);
  },
  clang() {
    tone('square', 520, 470, 0.35, 0.08);
    tone('square', 790, 760, 0.3, 0.05);
    sfx.hit(1);
  },
  zap() {
    tone('sawtooth', 90, 60, 0.8, 0.15);
    noise(0.8, 'bandpass', 3000, 0.12, 1500);
  },
  rocket() {
    noise(0.9, 'bandpass', 400, 0.25, 1600);
  },
  meteor() {
    noise(1.6, 'lowpass', 300, 0.3, 1200);
    tone('sine', 200, 60, 1.6, 0.2);
  },
  thud() {
    tone('sine', 110, 35, 0.4, 0.7);
    noise(0.3, 'lowpass', 600, 0.5, 150);
  },
  coin() {
    tone('square', 988, null, 0.08, 0.05);
    tone('square', 1319, null, 0.25, 0.05, 0.08);
  },
  tick() {
    tone('square', 1800, null, 0.03, 0.03);
  },
  alarm() {
    tone('square', 880, 620, 0.22, 0.06);
  },
  warcry() {
    for (let i = 0; i < 6; i++) tone('sawtooth', rand(150, 240), rand(90, 120), 0.9, 0.04, i * 0.04);
    noise(1, 'lowpass', 500, 0.25, 150);
  },
  stomp() {
    tone('sine', rand(70, 90), 40, 0.07, 0.12);
  },
  whoosh() {
    noise(3.4, 'bandpass', 250, 0.4, 1400);
  },
};
