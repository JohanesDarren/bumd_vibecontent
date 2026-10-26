import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the server prefers the release layout over a stale dist folder', async () => {
  const server = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  // The zero-downtime deployer activates a release that holds the CONTENTS of
  // dist/. Resolving only ../dist served an old bundle after every deploy.
  assert.match(server, /STATIC_DIR/, 'an explicit override must be supported');
  assert.match(server, /existsSync\(resolve\(candidate, 'index\.html'\)\)/, 'candidates must be probed for index.html');
  const block = server.slice(server.indexOf('const distCandidates'), server.indexOf('const distDir'));
  assert.ok(block.includes("resolve(moduleDir, '..')"), 'release root must be a candidate');
  assert.ok(block.indexOf("resolve(moduleDir, '..')") < block.indexOf("resolve(moduleDir, '../dist')"),
    'release layout must be preferred over the legacy dist folder');
});
