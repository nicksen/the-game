import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
const c = createCanvas(600, 300), ctx = c.getContext('2d');
ctx.fillStyle = '#1b1b2f'; ctx.fillRect(0, 0, 600, 300); ctx.textBaseline = 'middle';
const fonts = ['44px serif', '44px "Apple Color Emoji"', '44px serif, "Apple Color Emoji"', '44px "Trebuchet MS", "Apple Color Emoji"'];
fonts.forEach((f, i) => {
  ctx.font = f; ctx.fillStyle = '#fff'; ctx.fillText('👊🪙⚔️🚀', 10, 35 + i * 70);
  const d = ctx.getImageData(0, i * 70, 260, 70).data; let colorful = 0;
  for (let k = 0; k < d.length; k += 4) if (Math.max(d[k], d[k+1], d[k+2]) - Math.min(d[k], d[k+1], d[k+2]) > 80) colorful++;
  console.log(JSON.stringify(f).padEnd(48), 'colorful pixels:', colorful, 'resolved font:', ctx.font);
});
await Bun.write('/tmp/spike-emoji.png', await c.encode('png'));
