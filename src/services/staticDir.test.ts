import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');

test('the server prefers the release layout over a stale dist folder', () => {
  const block = server.slice(server.indexOf('const distCandidates'), server.indexOf('const distDir'));
  assert.ok(block.includes('releaseDir'), 'the release root must be a candidate');
  assert.ok(block.includes("resolve(releaseDir, 'current')"), 'the activated release symlink must be probed');
  assert.ok(server.includes("const releaseDir = resolve(moduleDir, '..')"), 'release dir is the project root');
  assert.ok(block.includes("resolve(moduleDir, '../dist')"), 'legacy dist must remain a fallback');
  assert.ok(block.includes('process.env'), 'an explicit STATIC_DIR escape hatch must exist');
});

test('the source index.html can never be served as the built shell', () => {
  // The repo ships an index.html whose entry is /src/main.tsx (Vite dev). Serving
  // it produced a blank page: the browser asked for a file that does not exist.
  assert.match(server, /function isBuiltShell/, 'must validate the shell before serving');
  assert.ok(server.includes('main'), 'must detect the dev entry');
  assert.match(server, /assets/, 'must require built assets');
});

test('when several directories qualify the freshest shell wins', () => {
  // A stale ./dist next to the sources also looks like a valid build. The release
  // is written last by the deployer, so mtime is the tie-breaker that keeps the
  // newly activated release from losing to an old folder.
  assert.match(server, /function shellMtime/, 'must compare shell freshness');
  assert.match(server, /statSync\(resolve\(dir, 'index\.html'\)\)\.mtimeMs/, 'mtime is the signal');
  assert.match(server, /usable\.sort/, 'candidates must be ordered by freshness');
});
