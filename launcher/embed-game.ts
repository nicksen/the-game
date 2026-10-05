// Bun macro: runs at build time and inlines the game's files into the bundle (base64, so images survive),
// keyed by URL path.
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const PATTERNS = ['index.html', 'style.css', 'js/*.js', 'sw.js', 'manifest.webmanifest', 'icons/*.png'];

export function gameFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const pattern of PATTERNS) {
    for (const path of new Bun.Glob(pattern).scanSync(ROOT)) {
      files['/' + path] = readFileSync(ROOT + path).toString('base64');
    }
  }
  return files;
}
