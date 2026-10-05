// Runs the replay test against the compiled executable instead of index.html.
// The executable serves the same files, so it must match the same baseline.

import { fileURLToPath } from 'url';

const ROOT = new URL('..', import.meta.url);
const EXE = fileURLToPath(new URL(process.platform === 'win32' ? 'dist/smack-the-dummy.exe' : 'dist/smack-the-dummy', ROOT));
// Not the default port, so a copy of the game you're playing is left alone
const PORT = 41899;
const URL_ = `http://127.0.0.1:${PORT}/`;

const server = Bun.spawn([EXE, `--port=${PORT}`, '--no-open'], { stdout: 'inherit', stderr: 'inherit' });
try {
  for (let i = 0; ; i++) {
    if (await fetch(URL_).then(r => r.ok, () => false)) break;
    if (i === 50 || server.exitCode !== null) throw new Error(`The executable didn't start serving on ${URL_}`);
    await Bun.sleep(100);
  }
  const replay = Bun.spawn(['bun', fileURLToPath(new URL('tests/replay.mjs', ROOT)), `--url=${URL_}`],
    { stdout: 'inherit', stderr: 'inherit' });
  process.exitCode = await replay.exited;
} finally {
  server.kill();
}
