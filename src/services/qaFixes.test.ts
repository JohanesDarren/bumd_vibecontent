import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── K1: RAG must not read documents outside the workspace ────────────────── */

test('ragQuery accepts and enforces a document allow-list', async () => {
  const rag = await read('../../server/rag.ts');
  assert.match(rag, /allowedDocumentIds\?: string\[\]/, 'ragQuery must take an allow-list');
  // An empty list must deny, not skip filtering.
  assert.match(rag, /allowedDocumentIds\.length === 0/, 'empty allow-list must deny');
  assert.match(rag, /const allow = allowedDocumentIds \? new Set/, 'hits must be filtered');
  assert.match(rag, /filter\(hit => !allow \|\| allow\.has/, 'non-allowed chunks must be dropped');
});

test('the RAG query endpoint passes the workspace document list', async () => {
  const server = await read('../../server/index.ts');
  const m = /ragQuery\(workspaceId,query,undefined,await authorizedKmsIds/.exec(server);
  assert.ok(m, 'the query endpoint must pass authorizedKmsIds');
});

/* ── K3: no demo credentials in the bundle ────────────────────────────────── */

test('the login page ships no demo credentials', async () => {
  const auth = await read('../components/AuthView.tsx');
  assert.doesNotMatch(auth, /admin@tirta\.demo/, 'demo email must not be in the source');
  assert.doesNotMatch(auth, /DemoPass123/, 'demo password must not be in the source');
  assert.doesNotMatch(auth, /handleDemoFill/, 'the demo filler must be gone');
});

test('the forgot-password control does something honest', async () => {
  const auth = await read('../components/AuthView.tsx');
  // It must not silently fill credentials; it must tell the user the real path.
  assert.match(auth, /RESET_NOTICE/);
  assert.match(auth, /Hubungi administrator/, 'the notice must point at a real channel');
});

/* ── T8: banned words must match each alternative ─────────────────────────── */

test('banned words are split on slashes and matched individually', async () => {
  const engine = await read('../services/ragEngine.ts');
  assert.match(engine, /split\(\/\[\\\/\|,;\]/, 'entries must be split into variants');
  assert.match(engine, /variants\.find/, 'each variant must be tested');
  assert.doesNotMatch(engine, /normalizedContent\.includes\(b\.word\.toLowerCase\(\)\)/,
    'raw includes() missed alternatives');
});

/* ── T1: source warnings must resolve by id and title, without duplicates ─── */

test('fact conflicts resolve citations by id then title and deduplicate', async () => {
  const sched = await read('../services/scheduling.ts');
  assert.match(sched, /byTitle/, 'title fallback is required');
  assert.match(sched, /seen\.has\(key\)/, 'warnings must be deduplicated');
});

/* ── S2: database errors must not leak schema names ───────────────────────── */

test('the error handler maps Postgres codes instead of echoing messages', async () => {
  const server = await read('../../server/index.ts');
  assert.match(server, /23505/, 'unique violation must be mapped');
  assert.match(server, /23503/, 'foreign key violation must be mapped');
  assert.doesNotMatch(server, /res\.status\(500\)\.json\(\{error:error instanceof Error\?error\.message/,
    'raw error messages must not be returned');
  assert.match(server, /Terjadi kesalahan pada server/, 'a generic message must be used');
});

/* ── S1: workspace validation is enforced server-side ─────────────────────── */

test('workspace fields are validated on the server', async () => {
  const server = await read('../../server/index.ts');
  assert.match(server, /validateWorkspaceFields/);
  assert.match(server, /3-6 karakter/, 'code length must be enforced');
  assert.match(server, /maksimal 120 karakter/, 'name length must be capped');
});

/* ── S10: security headers ────────────────────────────────────────────────── */

test('security headers are set by the app, not only the proxy', async () => {
  const server = await read('../../server/index.ts');
  assert.match(server, /app\.disable\('x-powered-by'\)/);
  // The edge-injected analytics beacon must be allowed, or every page logs a CSP error.
  assert.match(server, /static\.cloudflareinsights\.com/);
  for (const h of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options']) {
    assert.ok(server.includes(h), `${h} must be set`);
  }
});

/* ── T3 / T5: destructive actions ask first ───────────────────────────────── */

test('marking content published requires a URL and confirmation', async () => {
  const view = await read('../components/ContentSchedulingView.tsx');
  assert.match(view, /Isi link postingan sebelum menandai terbit/);
  assert.match(view, /window\.confirm/, 'publishing must confirm');
});

test('archiving a draft confirms, and drafts can be restored', async () => {
  const lib = await read('../components/LibraryView.tsx');
  assert.match(lib, /Arsipkan "\$\{draft\.title\}"/);
  assert.match(lib, /onRestoreDraft/, 'a restore path must exist');
  assert.match(lib, /Pulihkan/);
});

/* ── S4: no browser alerts, honest labels ─────────────────────────────────── */

test('the brief form reports validation inline instead of with alert()', async () => {
  const view = await read('../components/BriefStudioView.tsx');
  assert.doesNotMatch(view, /\balert\(/, 'browser alerts are not used');
  assert.match(view, /wajib diisi sebelum generate/);
});

test('the generate button says what it does', async () => {
  const view = await read('../components/BriefStudioView.tsx');
  assert.match(view, /Generate & Buka Editor/);
  assert.doesNotMatch(view, /'Lanjut ke Editor'\}<\/span>/, 'the old misleading label is gone');
});

/* ── R1 / R2: language and date consistency ───────────────────────────────── */

test('no en-US date formatting remains', async () => {
  for (const f of ['../components/LibraryView.tsx', '../components/EditorWorkspaceView.tsx']) {
    const src = await read(f);
    assert.doesNotMatch(src, /en-US/, `${f} must use the Indonesian locale`);
  }
});

test('visible UI strings are Indonesian', async () => {
  const editor = await read('../components/EditorWorkspaceView.tsx');
  for (const en of ['Ready to Submit', 'Needs Verification', 'Versions Saved']) {
    assert.ok(!editor.includes(`>${en}<`) && !editor.includes(`'${en}'`), `${en} must be translated`);
  }
});

/* ── S11: internal identifiers are hidden ─────────────────────────────────── */

test('internal document codes are not shown to users', async () => {
  for (const f of ['../components/EditorWorkspaceView.tsx', '../components/ExportModal.tsx', '../components/AuditLogView.tsx']) {
    const src = await read(f);
    // Look only inside JSX text nodes: strip comments, then inspect the strings
    // that sit between a tag close and the next tag open.
    const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const textNodes = [...withoutComments.matchAll(/>([^<>{}]+)</g)].map(m => m[1]).join(' ');
    assert.doesNotMatch(textNodes, /\(F-\d\d\)/, `${f} shows an internal code in visible text`);
    assert.doesNotMatch(textNodes, /PRD F-\d\d/, `${f} shows a PRD reference in visible text`);
  }
});

/* ── R5: icon-only buttons need accessible names ──────────────────────────── */

test('icon-only buttons carry an accessible name', async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = new URL('../components/', import.meta.url);
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.tsx')) continue;
    const src = await readFile(new URL(file, dir), 'utf8');
    const re = /<button\b([^>]*)>\s*<[A-Z][A-Za-z0-9]*[^>]*\/>\s*<\/button>/g;
    for (const m of src.matchAll(re)) {
      const attrs = m[1];
      assert.ok(
        attrs.includes('aria-label') || attrs.includes('title='),
        `${file}: icon-only button without accessible name -> ${attrs.slice(0, 80)}`
      );
    }
  }
});
