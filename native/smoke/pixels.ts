import { createCanvas } from '@napi-rs/canvas';
const c = createCanvas(4, 1), ctx = c.getContext('2d');
ctx.fillStyle = 'rgb(255,0,0)'; ctx.fillRect(0, 0, 1, 1);
ctx.fillStyle = 'rgb(0,0,255)'; ctx.fillRect(1, 0, 1, 1);
console.log('data() first 2 px:', [...c.data().subarray(0, 8)].join(','), '(red then blue)');
const sameCtx = ctx; c.width = 8; c.height = 2;
console.log('after resize: same ctx object:', c.getContext('2d') === sameCtx, '| size:', c.width, 'x', c.height, '| data bytes:', c.data().byteLength);
sameCtx.fillStyle = '#0f0'; sameCtx.fillRect(0, 0, 8, 2);
console.log('old ctx still draws on resized canvas:', [...c.data().subarray(0, 4)].join(','));
