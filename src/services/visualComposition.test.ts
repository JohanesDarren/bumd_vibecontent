import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapVisualText, visualExportDimensions } from './visualComposition.ts';

test('wrap preserves exact text while wrapping normal words and long tokens', () => {
  const lines = wrapVisualText('Daftar layanan sekarang!\nBUKTI-123456', 8, text => text.length);
  assert.equal(lines.join('\n'), 'Daftar\nlayanan\nsekarang\n!\nBUKTI-12\n3456');
});

test('portrait and landscape exports use requested pixel ratios', () => {
  assert.deepEqual(visualExportDimensions('9:16'), [1080, 1920]);
  assert.deepEqual(visualExportDimensions('16:9'), [1920, 1080]);
  assert.deepEqual(visualExportDimensions('1:1'), [1080, 1080]);
});

test('words wider than the panel are split instead of clipped', () => {
  const lines = wrapVisualText('ABCDEFG', 3, text => text.length);
  assert.equal(lines.join(''), 'ABCDEFG');
  assert.ok(lines.every(line => line.length <= 3));
});