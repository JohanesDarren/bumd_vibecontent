import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = new URL('../../', import.meta.url);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);

test('the brief rail cannot squeeze the content column', async () => {
  const css = await readFile(new URL('src/index.css', root), 'utf8');
  // The rail is a fixed 264px column and the viewport keeps a usable minimum.
  assert.match(css, /\.brief-rail\s*\{[^}]*flex:\s*0 0 264px/s);
  // The viewport must be free to shrink inside the flex row (min-width: 0) and
  // must not carry a forced min-height that pushes the content down.
  assert.match(css, /\.content-viewport\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.main-layout\s*\{[^}]*min-height:\s*0/s);
  assert.ok(!/min-height:\s*calc\(100vh - 72px\)/.test(css.split('.main-layout {')[1].split('}')[0]),
    'main-layout must not force a viewport-height box');
  // Stacking on small screens must be driven by a real class, not :has().
  assert.ok(!/:has\(/.test(css), 'avoid :has() so older browsers cannot collapse the layout');
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.main-layout\.has-brief-rail\s*\{\s*flex-direction:\s*column/);
});

test('the app marks the layout when the rail is mounted', async () => {
  const app = await readFile(new URL('src/App.tsx', root), 'utf8');
  assert.match(app, /has-brief-rail/);
});

test('creator layout preserves flex row and does not crash with brief rail', async () => {
  const css = await readFile(new URL('src/index.css', root), 'utf8');
  // creator-layout must be display: flex, not display: block (which caused the rail and form to stack/crash)
  assert.match(css, /\.creator-layout\s*\{[^}]*display:\s*flex/s);
  assert.ok(!/\.creator-layout\s*\{[^}]*display:\s*block/s.test(css),
    'creator-layout must never be display: block');
  // creator-layout must not carry a forced min-height
  assert.match(css, /\.creator-layout\s*\{[^}]*min-height:\s*0/s);
  assert.ok(!/\.creator-layout\s*\{[^}]*min-height:\s*calc\(100vh - 54px\)/s.test(css),
    'creator-layout must not force a viewport height box');
  // creator rail sticks under the 56px creator top header
  assert.match(css, /\.creator-layout\s+\.brief-rail\s*\{[^}]*top:\s*56px/s);
});

test('creator brief page renders rail and form side-by-side with no collision', { skip: !chrome }, async () => {
  const css = await readFile(new URL('src/index.css', root), 'utf8');
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${css}</style></head>
    <body>
      <header class="top-header creator-top-header">
        <div style="height: 56px;">Header</div>
      </header>
      <div class="main-layout creator-layout has-brief-rail">
        <aside class="brief-rail">
          <div class="brief-rail-head">Riwayat Brief</div>
          <div class="brief-rail-list" style="height: 300px;">List</div>
        </aside>
        <main class="content-viewport creator-content">
          <div class="brief-workspace">
            <form style="height: 600px;">Brief Form</form>
            <div style="height: 600px;">AI Editor</div>
          </div>
        </main>
      </div>
    </body>
    </html>
  `;
  const browser = await puppeteer.launch({ executablePath: chrome!, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(html);

    const getBox = (sel: string) => page.$eval(sel, el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    });
    const rail = await getBox('.brief-rail');
    const viewport = await getBox('.content-viewport');
    const form = await getBox('form');

    // 1. Must sit side-by-side horizontally: rail on left, viewport on right
    assert.ok(rail.right <= viewport.left + 1, `rail (right=${rail.right}) must be to the left of viewport (left=${viewport.left})`);
    assert.ok(viewport.left <= form.left, `form must be inside the viewport column`);
    // 2. Viewport must not be pushed underneath the rail
    assert.equal(Math.round(rail.top), Math.round(viewport.top), 'rail and viewport top edges must align');

    // 3. Scrolling must not crash the form under the sticky rail
    await page.evaluate(() => window.scrollTo(0, 300));
    const railScrolled = await getBox('.brief-rail');
    const formScrolled = await getBox('form');
    assert.ok(railScrolled.right <= formScrolled.left + 1, 'rail must stay to the left of the form when scrolling');
  } finally {
    await browser.close();
  }
});
