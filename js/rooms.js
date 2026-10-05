'use strict';
// The rooms you can play in

const ROOMS = [
  { id: 'living', name: 'Living Room', wall: ['#c9a37a', '#e3c7a0'], pattern: 'stripes',
    floor: ['#8a5a3b', '#4e3020'], floorPattern: 'planks', decor: decorLiving, floorDecor: rugLiving },
  { id: 'office', name: 'Office', wall: ['#34405e', '#55668e'], pattern: 'stripes',
    floor: ['#626a78', '#3c414a'], floorPattern: 'carpet', decor: decorOffice },
  { id: 'kitchen', name: 'Kitchen', wall: ['#bfe3dc', '#dcf2ed'], pattern: 'tiles',
    floor: ['#eeeeee', '#cfcfcf'], floorPattern: 'checker', decor: decorKitchen },
  { id: 'garage', name: 'Garage', wall: ['#7d7d7d', '#9c9c9c'], pattern: 'bricks',
    floor: ['#8c8c8c', '#5c5c5c'], floorPattern: 'concrete', decor: decorGarage, floorDecor: garageFloor },
  { id: 'bedroom', name: 'Bedroom', wall: ['#8d7bb8', '#b3a3d9'], pattern: 'dots',
    floor: ['#d9a5b5', '#a8778a'], floorPattern: 'carpet', decor: decorBedroom, floorDecor: rugBedroom },
  { id: 'space', name: 'Space Station', zeroG: true, wall: ['#04051a', '#1b1550'], pattern: 'starfield',
    floor: ['#565d75', '#2b2f40'], floorPattern: 'grating', decor: decorSpace, floorDecor: spaceFloor },
];
let roomId = ROOMS.some(r => r.id === save.room) ? save.room : 'living';
const currentRoom = () => ROOMS.find(r => r.id === roomId);

function drawRoom() {
  const fy = floorY(), room = currentRoom();
  const g = ctx.createLinearGradient(0, 0, 0, fy);
  g.addColorStop(0, room.wall[0]); g.addColorStop(1, room.wall[1]);
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, fy + 60);
  drawWallPattern(room.pattern, fy);

  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-60, fy - 16, W + 120, 16);
  const g2 = ctx.createLinearGradient(0, fy, 0, H);
  g2.addColorStop(0, room.floor[0]); g2.addColorStop(1, room.floor[1]);
  ctx.fillStyle = g2; ctx.fillRect(-60, fy, W + 120, H - fy + 60);
  drawFloorPattern(room.floorPattern, fy);
  if (room.floorDecor) room.floorDecor(fy);
  room.decor(fy);
}

// Render a room preview into a small canvas by temporarily redirecting the drawing globals
function renderThumb(room, cv) {
  const tw = 248, th = 160;
  cv.width = tw; cv.height = th;
  const saved = [ctx, W, H, roomId];
  ctx = cv.getContext('2d'); W = 1000; H = 1000 * th / tw; roomId = room.id;
  ctx.setTransform(tw / W, 0, 0, tw / W, 0, 0);
  drawRoom();
  for (const spec of PROPS[room.id]()) drawProp(makeProp(spec));
  [ctx, W, H, roomId] = saved;
}
