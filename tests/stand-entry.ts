// Test-only entry: the game, plus a read-only view of the dummy's pose for tests/stand.mjs
import '../src/main.ts';
import { B, standK } from '../src/dummy.ts';
import { floorY } from '../src/canvas.ts';
import { idle } from '../src/state.ts';

declare global {
  interface Window {
    __pose: () => { standK: number; floorY: number; body: typeof B; idleAction: string };
  }
}
window.__pose = () => ({ standK, floorY: floorY(), body: B, idleAction: idle.action });
