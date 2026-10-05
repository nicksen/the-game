import { AudioContext } from 'node-web-audio-api';
const ac = new AudioContext();
console.log('state:', ac.state, '| sampleRate:', ac.sampleRate);
// The same node types the game's sound effects use
const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
const t = ac.currentTime;
const o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(988, t);
const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.35);
const src = ac.createBufferSource(); src.buffer = buf;
const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.5);
const g2 = ac.createGain(); g2.gain.setValueAtTime(0.05, t);
src.connect(f).connect(g2).connect(ac.destination); src.start(t + 0.4); src.stop(t + 0.9);
await Bun.sleep(1200);
console.log('after 1.2s -> state:', ac.state, '| currentTime advanced to', ac.currentTime.toFixed(2), 's');
await ac.close();
