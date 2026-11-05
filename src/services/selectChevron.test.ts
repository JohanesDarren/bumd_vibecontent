import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssFiles = [
  resolve(here, '../styles/form-controls.css'),
  resolve(here, '../index.css')
];

/**
 * The select chevron is a background-image. A `background` shorthand anywhere
 * in the cascade resets background-repeat to `repeat`, so the 14px chevron
 * tiles across the whole control — which is exactly what users saw on the
 * focused "Target Audiens" field. Guard the rule for good.
 */
test('no background shorthand in any .form-select rule', () => {
  const offenders: string[] = [];

  for (const file of cssFiles) {
    const css = readFileSync(file, 'utf8');
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g);

    for (const block of blocks) {
      const selector = block[1].replace(/\s+/g, ' ').trim();
      const body = block[2];
      if (!selector.includes('.form-select')) continue;
      if (/(^|[\s;])background\s*:/.test(body)) {
        offenders.push(`${file}: ${selector}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `background shorthand resets the chevron tiling guard: ${offenders.join(', ')}`);
});

test('focused select re-declares chevron repeat and position', () => {
  const css = readFileSync(cssFiles[0], 'utf8');
  const focusRule = css.match(/\.form-select:focus\s*\{([^}]*)\}/);
  assert.ok(focusRule, '.form-select:focus rule must exist');
  const body = focusRule![1];
  assert.match(body, /background-repeat:\s*no-repeat/, 'focus rule must restate no-repeat');
  assert.match(body, /background-position:\s*right 11px center/, 'focus rule must restate the arrow position');
});
