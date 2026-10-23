import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

test('the fallback schedule response always carries alternatives', async () => {
  const server = await readFile(new URL('server/index.ts', root), 'utf8');
  // The fallback branch used to return {...slot, source} with no alternatives,
  // which made the client crash on alternatives.map().
  assert.match(server, /freeScheduleAlternatives\(/, 'fallback must build alternatives');
  assert.match(server, /res\.json\(\{\.\.\.slot,alternatives,source:'fallback'\}\)/);
});

test('the scheduling view never maps an unchecked alternatives array', async () => {
  const view = await readFile(new URL('src/components/ContentSchedulingView.tsx', root), 'utf8');
  assert.match(view, /Array\.isArray\(result\?\.alternatives\)/);
  assert.match(view, /\(suggestion\.alternatives \?\? \[\]\)\.map\(/);
  assert.ok(!/suggestion\.alternatives\.map\(/.test(view), 'must not map alternatives directly');
});

test('a render error cannot blank the whole app', async () => {
  const main = await readFile(new URL('src/main.tsx', root), 'utf8');
  assert.match(main, /<ErrorBoundary>/);
  const boundary = await readFile(new URL('src/components/ErrorBoundary.tsx', root), 'utf8');
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /Halaman gagal ditampilkan/);
});
