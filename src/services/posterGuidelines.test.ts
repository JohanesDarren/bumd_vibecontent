import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES,
  themePalettePhrase,
  LAYOUTS,
  SIZES,
  THEME_KEYS,
  LAYOUT_KEYS,
  SIZE_KEYS,
  normalizeTheme,
  normalizeLayout,
  normalizeSize,
  posterGuidelineBlock
} from '../../server/posterGuidelines.ts';

test('all eight themes from the poster system are present', () => {
  assert.deepEqual(THEME_KEYS, ['korporat', 'gelap', 'editorial', 'aurora', 'alam', 'blueprint', 'ceria', 'swiss']);
  for (const key of THEME_KEYS) {
    const theme = THEMES[key];
    // Every colour must be a concrete value: the image model cannot resolve CSS.
    for (const colour of [theme.background, theme.ink, theme.accent, theme.accent2]) {
      assert.match(colour, /^#[0-9a-f]{3,8}$/i, `${key}: ${colour} must be a real hex colour`);
    }
    assert.ok(theme.ramp.length >= 4, `${key}: data ramp must have entries`);
    for (const c of theme.ramp) assert.match(c, /^#[0-9a-f]{3,8}$/i, `${key}: ramp ${c} must be hex`);
    assert.ok(theme.headingFont.length > 2, `${key}: heading font must be named`);
    assert.ok(theme.ornament.length > 20, `${key}: ornament must be described`);
  }
});

test('all thirteen layouts from the poster system are present', () => {
  assert.equal(LAYOUT_KEYS.length, 13);
  for (const key of LAYOUT_KEYS) {
    const layout = LAYOUTS[key];
    assert.ok(layout.purpose.length > 15, `${key}: purpose must be described`);
    assert.ok(layout.slots.length > 0, `${key}: slots must be listed`);
    assert.ok(['person', 'product', 'scene', 'none', 'collage'].includes(layout.subject), `${key}: subject type`);
  }
});

test('the four canvas sizes carry real pixel dimensions', () => {
  assert.deepEqual(SIZE_KEYS, ['portrait', 'square', 'story', 'a4']);
  assert.deepEqual([SIZES.portrait.w, SIZES.portrait.h], [1080, 1350]);
  assert.deepEqual([SIZES.square.w, SIZES.square.h], [1080, 1080]);
  assert.deepEqual([SIZES.story.w, SIZES.story.h], [1080, 1920]);
  assert.deepEqual([SIZES.a4.w, SIZES.a4.h], [1080, 1527]);
});

test('unknown values fall back to safe defaults', () => {
  assert.equal(normalizeTheme('neon'), 'korporat');
  assert.equal(normalizeTheme(undefined), 'korporat');
  assert.equal(normalizeLayout('billboard'), 'hero');
  assert.equal(normalizeSize('A3'), 'portrait');
});

test('the guideline block states palette, type, ornament, layout and canvas', () => {
  const block = posterGuidelineBlock({ theme: 'aurora', layout: 'event', size: 'story' });
  assert.match(block, /aurora theme/);
  assert.match(block, /#7c3aed/, 'accent must appear');
  assert.match(block, /Bricolage Grotesque/, 'typeface must appear');
  assert.match(block, /radial glows/, 'ornament must appear');
  assert.match(block, /Layout event/);
  assert.match(block, /1080x1920/);
  assert.ok(block.length < 700, 'block must stay compact for the prompt budget');
});

test('a dark theme demands a dark background', () => {
  // Image models default to light backgrounds, so "gelap" must be a requirement.
  const dark = posterGuidelineBlock({ theme: 'gelap', layout: 'hero' });
  assert.match(dark, /MUST be dark/);
  assert.match(dark, /not white/i);
  const light = posterGuidelineBlock({ theme: 'swiss', layout: 'stats' });
  assert.doesNotMatch(light, /MUST be dark/);
});

test('a brand accent overrides the theme accent', () => {
  const block = posterGuidelineBlock({ theme: 'korporat', layout: 'product', accent: '#0284c7' });
  assert.match(block, /#0284c7/);
  assert.doesNotMatch(block, /#c8962e/, 'the theme accent must be replaced');
});

test('the layout archetype decides whether a person appears', () => {
  const stats = posterGuidelineBlock({ theme: 'korporat', layout: 'stats' });
  assert.match(stats, /no photographic subject/i);
  const hero = posterGuidelineBlock({ theme: 'korporat', layout: 'hero' });
  assert.match(hero, /one person/i);
  const product = posterGuidelineBlock({ theme: 'korporat', layout: 'product' });
  assert.match(product, /product alone/i);
});

test('the guidelines reach the generation prompt', async () => {
  const { readFile } = await import('node:fs/promises');
  const core = await readFile(new URL('../../server/visualCore.ts', import.meta.url), 'utf8');
  assert.ok(core.includes('posterGuidelineBlock'), 'the plan must append the design block');
  assert.ok(core.includes('design?'), 'the plan must accept a design argument');
  const server = await readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  assert.ok(server.includes('briefContext, design }'), 'the endpoint must pass the design through');
  assert.ok(server.includes("theme: body.theme"), 'the client may pick a theme');
  assert.ok(server.includes("layout: body.layout"), 'the client may pick a layout');
});

test('the chosen theme owns the colour slot', () => {
  // A reference photograph used to win over the theme because the colour blank
  // was filled from the reference. The theme palette must now be the value.
  const phrase = themePalettePhrase({ theme: 'swiss' });
  assert.match(phrase, /swiss system palette/);
  assert.match(phrase, /#fff/, 'background must be the theme background');
  assert.match(phrase, /#e3000f/, 'accent must be the theme accent');
  assert.doesNotMatch(phrase, /#7c3aed/, 'no reference colours may leak in');
});

test('a brand accent still overrides the theme palette phrase', () => {
  const phrase = themePalettePhrase({ theme: 'korporat', accent: '#0284c7' });
  assert.match(phrase, /#0284c7/);
  assert.doesNotMatch(phrase, /#c8962e/);
});

test('the palette is declared authoritative over references', () => {
  const block = posterGuidelineBlock({ theme: 'swiss', layout: 'stats' });
  assert.match(block, /authoritative/i);
  assert.match(block, /must not replace these colours/i);
});

test('the colour blank no longer claims it always comes from the reference', async () => {
  const { readFile } = await import('node:fs/promises');
  const core = await readFile(new URL('../../server/corePrompt.ts', import.meta.url), 'utf8');
  assert.ok(
    core.includes('from the design system when a theme is set'),
    'the blank must state the theme takes precedence'
  );
});

test('the plan applies the theme palette when a design is supplied', async () => {
  const { readFile } = await import('node:fs/promises');
  const plan = await readFile(new URL('../../server/visualCore.ts', import.meta.url), 'utf8');
  assert.ok(plan.includes('themePalettePhrase'), 'the plan must use the theme palette');
  assert.match(plan, /merged\.color = themePalettePhrase/, 'the colour slot must be overwritten');
});
