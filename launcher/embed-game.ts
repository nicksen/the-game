// Bun macro: runs at build time and inlines the game's files into the bundle (base64, so images survive),
// keyed by URL path.
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
// Every file the game needs at runtime; also what tools/build-site.ts publishes to GitHub Pages
export const GAME_FILE_PATTERNS = [
  'index.html',
  'style.css',
  'build/game.js',
  'sw.js',
  'manifest.webmanifest',
  'icons/*.png',
];

export function gameFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const pattern of GAME_FILE_PATTERNS) {
    for (const path of new Bun.Glob(pattern).scanSync(ROOT)) {
      files['/' + path] = readFileSync(ROOT + path).toString('base64');
    }
  }
  return files;
}
