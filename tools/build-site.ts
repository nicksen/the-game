// Copies the game's files into _site/ for publishing to GitHub Pages.
import { GAME_FILE_PATTERNS } from '../launcher/embed-game.ts';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { dirname } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = ROOT + '_site/';

rmSync(OUT, { recursive: true, force: true });
let count = 0;
for (const pattern of GAME_FILE_PATTERNS) {
  for (const path of new Bun.Glob(pattern).scanSync(ROOT)) {
    mkdirSync(dirname(OUT + path), { recursive: true });
    cpSync(ROOT + path, OUT + path);
    count++;
  }
}
console.log(`Copied ${count} files to _site/`);
