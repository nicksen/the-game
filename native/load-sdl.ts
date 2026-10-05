// The SDL addon links against libSDL2 sitting next to it. In a compiled executable Bun unpacks the addon on its
// own into the temp folder, so the library has to be put there first, before the addon is loaded.
import { tmpdir } from 'os';
import { existsSync, statSync, writeFileSync } from 'fs';
import libSdl from '../node_modules/@kmamal/sdl/dist/libSDL2-2.0.0.dylib' with { type: 'file' };

export async function loadSdl() {
  const compiled = libSdl.startsWith('/$bunfs/');
  if (compiled) {
    const bytes = await Bun.file(libSdl).bytes();
    const target = `${tmpdir()}/libSDL2-2.0.0.dylib`;
    if (!existsSync(target) || statSync(target).size !== bytes.length) writeFileSync(target, bytes);
  }
  return (await import('@kmamal/sdl')).default;
}
