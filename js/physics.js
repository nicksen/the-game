// Physics constants, with a gravity-free variant for zero-g rooms

import { currentRoom } from './rooms.js';

export const GRAVITY = 0.6,
  DAMP = 0.99,
  BOUNCE = 0.4,
  FRICTION = 0.85,
  MAXV = 50,
  ITER = 8;
// Rooms flagged zeroG switch gravity off and make everything drift longer and bounce harder
const PHYS = {
  earth: { g: 1, damp: DAMP, bounce: BOUNCE, friction: FRICTION },
  space: { g: 0, damp: 0.998, bounce: 0.75, friction: 0.97 },
};
export const zeroG = () => !!currentRoom().zeroG;
export const phys = () => (zeroG() ? PHYS.space : PHYS.earth);
