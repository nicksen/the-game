import sdl from '@kmamal/sdl';
import { createCanvas } from '@napi-rs/canvas';
const win = sdl.video.createWindow({ title: 'SDL spike', width: 600, height: 300 });
console.log('window:', win.width, 'x', win.height, '| pixels:', win.pixelWidth, 'x', win.pixelHeight, '| display density:', win.display?.density ?? '?');
const c = createCanvas(win.pixelWidth, win.pixelHeight), ctx = c.getContext('2d');
const events = [];
for (const e of ['mouseMove', 'mouseButtonDown', 'keyDown', 'close']) win.on(e, ev => events.push(e));
let frames = 0; const t0 = performance.now();
while (performance.now() - t0 < 1500) {
  ctx.fillStyle = `hsl(${frames * 4 % 360} 70% 40%)`; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '60px "Apple Color Emoji"'; ctx.fillText('👊', 40 + frames * 3, 150);
  const px = c.data();
  win.render(c.width, c.height, c.width * 4, 'rgba32', Buffer.from(px.buffer, px.byteOffset, px.byteLength));
  frames++;
  await Bun.sleep(16);
}
console.log('frames rendered:', frames, `(~${Math.round(frames / 1.5)} fps)`, '| pixel buffer bytes:', c.data().byteLength, '| events seen:', events.length);
win.destroy();
