import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production API URL preserves HTTPS host and any non-default port', async () => {
  const source = await readFile(new URL('./apiService.ts', import.meta.url), 'utf8');
  assert.match(source, /window\.location\.protocol\}\/\/\$\{window\.location\.host\}/);
  assert.doesNotMatch(source, /window\.location\.hostname\}:\d+/);
  assert.ok(source.includes('configuredApiUrl && !/^https?:\\/\\/(127\\.0\\.0\\.1|localhost):\\d+$/.test(configuredApiUrl)'));
});

test('production API listener honors platform PORT and binds externally', async () => {
  const source = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  assert.match(source, /process\.env\.PORT\s*\|\|\s*process\.env\.API_PORT/);
  assert.match(source, /app\.listen\(port,\s*'0\.0\.0\.0'/);
});

test('production CORS requires an explicit origin', async () => {
  const source = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  assert.match(source, /NODE_ENV === 'production' \? ''/);
  assert.match(source, /API_ALLOWED_ORIGIN is required in production/);
});

// ponytail: source assertions guard deployment wiring only; upgrade to an HTTP smoke test when the host runtime is available.
