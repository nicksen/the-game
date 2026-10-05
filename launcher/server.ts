// Serves the game from files embedded at build time and opens it in the default browser.
//
//   smack-the-dummy [--port=N] [--no-open]

import { gameFiles } from './embed-game.ts' with { type: 'macro' };

const FILES = gameFiles();
const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
};
// Browsers keep saves per origin, so a fixed port keeps coins and unlocks between runs.
const DEFAULT_PORT = 41817;
const APP_HEADER = 'x-smack-the-dummy';

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const port = Number(arg('port') ?? DEFAULT_PORT);
const url = `http://127.0.0.1:${port}/`;

function openBrowser() {
  if (process.argv.includes('--no-open')) return;
  const cmd = process.platform === 'darwin' ? ['open', url]
    : process.platform === 'win32' ? ['cmd', '/c', 'start', '', url]
    : ['xdg-open', url];
  try {
    Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' });
  } catch {
    console.log(`Couldn't open a browser automatically. Open ${url} in your browser to play.`);
  }
}

function serve() {
  return Bun.serve({
    hostname: '127.0.0.1',
    port,
    fetch(req) {
      const path = new URL(req.url).pathname;
      const file = path === '/' ? '/index.html' : path;
      const body = FILES[file];
      if (body === undefined) return new Response('Not found', { status: 404 });
      return new Response(body, {
        headers: { 'content-type': TYPES[file.split('.').pop()!], [APP_HEADER]: '1' },
      });
    },
  });
}

try {
  serve();
} catch (e: any) {
  if (e?.code !== 'EADDRINUSE') throw e;
  // Probably the game is already running; if so just open another tab of it
  const running = await fetch(url).then(r => r.headers.has(APP_HEADER), () => false);
  if (!running) {
    console.error(`Port ${port} is used by another program. Try: smack-the-dummy --port=${port + 1}`);
    process.exit(1);
  }
  console.log(`Smack the Dummy is already running at ${url}`);
  openBrowser();
  process.exit(0);
}

console.log(`Smack the Dummy is running at ${url}`);
console.log('Close this window or press Ctrl+C to quit.');
openBrowser();
