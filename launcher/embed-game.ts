// Bun macro: runs at build time and inlines the game's files into the bundle as strings, keyed by URL path.
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const PATTERNS = ['index.html', 'style.css', 'js/*.js'];

export function gameFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const pattern of PATTERNS) {
    for (const path of new Bun.Glob(pattern).scanSync(ROOT)) {
      files['/' + path] = readFileSync(ROOT + path, 'utf8');
    }
  }
  return files;
}
