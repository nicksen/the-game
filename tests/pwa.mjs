// Checks the installable app (PWA): Chrome considers it installable, the service worker caches every file
// the game uses, and after going offline the game still loads and plays.
//
//   bun tests/pwa.mjs              against the launcher, served locally
//   bun tests/pwa.mjs --url=<url>  against a deployed copy, e.g. the GitHub Pages site

import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const ROOT = new URL('..', import.meta.url);
const PORT = 41898;
const URL_ = process.argv.find((a) => a.startsWith('--url='))?.slice('--url='.length) ?? `http://127.0.0.1:${PORT}/`;
const BASE = new URL(URL_).pathname;
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failures.push(what);
};

const server = process.argv.some((a) => a.startsWith('--url='))
  ? null
  : Bun.spawn(['bun', fileURLToPath(new URL('launcher/server.ts', ROOT)), `--port=${PORT}`, '--no-open'], {
      stdout: 'ignore',
      stderr: 'inherit',
    });
// A persistent profile: Chrome treats Playwright's default throwaway profiles as incognito, where nothing is installable
const profile = mkdtempSync(`${tmpdir()}/pwa-test-`);
const VIEWPORT = { width: 852, height: 393 };
// Where the dummy's pelvis starts: centred, 80px above a floor that sits 110px up from the bottom
const DUMMY = { x: VIEWPORT.width / 2, y: VIEWPORT.height - 190 };
const savedCoins = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('smack-the-dummy-v1')).coins);
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: true,
  viewport: VIEWPORT,
  isMobile: true,
  hasTouch: true,
});
try {
  for (
    let i = 0;
    !(await fetch(URL_).then(
      (r) => r.ok,
      () => false,
    ));
    i++
  ) {
    if (i === 50) throw new Error(`The launcher didn't start serving on ${URL_}`);
    await Bun.sleep(100);
  }
  const page = context.pages()[0] ?? (await context.newPage());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL_);
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  check(
    installabilityErrors.length === 0,
    `Chrome considers the app installable${installabilityErrors.length ? ': ' + JSON.stringify(installabilityErrors) : ''}`,
  );
  const manifest = await cdp.send('Page.getAppManifest');
  check(
    manifest.errors.length === 0,
    `manifest has no errors${manifest.errors.length ? ': ' + JSON.stringify(manifest.errors) : ''}`,
  );

  const cached = await page.evaluate(async () => {
    const keys = await (await caches.open('smack-the-dummy')).keys();
    return keys.map((r) => new URL(r.url).pathname);
  });
  const scripts = await page.evaluate(() => [...document.scripts].map((s) => new URL(s.src).pathname));
  const needed = [
    ...[
      '',
      'style.css',
      'manifest.webmanifest',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/apple-touch-icon.png',
    ].map((p) => BASE + p),
    ...scripts,
  ];
  const missing = needed.filter((p) => !cached.includes(p));
  check(
    missing.length === 0,
    `service worker cached all ${needed.length} files${missing.length ? ', missing: ' + missing : ''}`,
  );

  // Offline for real: no network for the browser, and a local server is gone too
  if (server) {
    server.kill();
    await server.exited;
  }
  await context.setOffline(true);
  await page.reload();
  // An outside request (which the service worker doesn't handle) shows whether we're really offline. It runs in
  // its own tab so its expected network error isn't counted as a game error.
  const probe = await context.newPage();
  const reachable = await probe.evaluate(() =>
    fetch('https://example.com/', { mode: 'no-cors' }).then(
      () => true,
      () => false,
    ),
  );
  await probe.close();
  check(!reachable, 'the browser is really offline');
  await page.tap('#rooms .room:nth-child(1)');
  await page.waitForTimeout(1000);
  const before = await savedCoins(page);
  for (let i = 0; i < 3; i++) {
    await page.touchscreen.tap(DUMMY.x, DUMMY.y);
    await page.waitForTimeout(150);
  }
  const after = await savedCoins(page);
  check(after > before, `offline: the game loads and a few taps earn coins (${before} → ${after})`);
  check(errors.length === 0, `no errors in the page${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
  server?.kill();
}
process.exit(failures.length ? 1 : 0);
