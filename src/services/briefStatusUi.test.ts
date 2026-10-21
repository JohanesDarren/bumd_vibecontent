import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8');

test('a failed RAG status probe never claims the key is missing', () => {
  // Regression: any network error (ERR_HTTP2_PROTOCOL_ERROR, connection reset)
  // made the UI report "RAG_API_KEY belum terkonfigurasi", which was false and
  // sent users chasing an env problem that did not exist.
  assert.ok(
    !/setRagService\(\{\s*configured:\s*false/.test(src),
    'status probe failure must not assert configured:false'
  );
  assert.match(src, /setRagService\(null\)/);
});

test('generation only blocks when the server explicitly reports unconfigured', () => {
  assert.match(src, /if \(ragService && !ragService\.configured\)/);
});

test('the misleading env-restart instruction is gone', () => {
  assert.ok(!/periksa \.env\.local lalu mulai ulang server/.test(src));
});
