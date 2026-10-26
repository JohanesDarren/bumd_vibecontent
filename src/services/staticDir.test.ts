import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the server prefers the release layout over a stale dist folder', async () => {
  const server = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  // The zero-downtime deployer activates a release that holds the CONTENTS of
  // dist/. Resolving only ../dist served an old bundle after every deploy.
  assert.match(server, /STATIC_DIR/, 'an explicit override must be supported');
  assert.match(server, /distCandidates\.find\(isBuiltShell\)/, 'candidates must be probed for a built shell');
  const block = server.slice(server.indexOf('const distCandidates'), server.indexOf('const distDir'));
  assert.ok(block.includes("resolve(moduleDir, '..')"), 'release root must be a candidate');
});

test('the source index.html can never be served as the built shell', async () => {
  const server = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  // The repo ships an index.html whose entry is /src/main.tsx (Vite dev). Serving
  // it produced a blank page: the browser asked for a file that does not exist.
  assert.match(server, /function isBuiltShell/, 'must validate the shell before serving');
  assert.ok(server.includes('main\\.tsx') || server.includes('/src/main'), 'must reject the dev entry');
  assert.ok(server.includes('assets') && server.includes('js|css'), 'must require built assets');
  const list = server.slice(server.indexOf('const distCandidates'), server.indexOf('const distDir'));
  assert.ok(
    list.indexOf("resolve(moduleDir, '../dist')") < list.indexOf("resolve(moduleDir, '..')"),
    'dist must be tried before the project root'
  );
});
