import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── R8: the misspelled field is gone everywhere ─────────────────────────── */

test('currentVersion is spelled correctly across the codebase', async () => {
  const { readdir } = await import('node:fs/promises');
  const roots = ['../', '../../server/'];
  for (const root of roots) {
    const dir = new URL(root, import.meta.url);
    for (const file of await readdir(dir, { recursive: true })) {
      const name = String(file);
      if (!/\.(ts|tsx)$/.test(name)) continue;
      // Skip test files: this assertion quotes the typo it is looking for.
      if (/\.test\.tsx?$/.test(name)) continue;
      const src = await readFile(new URL(name, dir), 'utf8');
      assert.doesNotMatch(src, /currentVersionon/, `${name} still has the typo`);
    }
  }
});

/* ── S9: deleting a draft also removes the orphaned brief ────────────────── */

test('deleteDraft removes the brief when nothing else uses it', async () => {
  const db = await read('../../server/database.ts');
  const block = db.slice(db.indexOf('export async function deleteDraft'), db.indexOf('export async function deleteDraft') + 1400);
  assert.match(block, /content_briefs/, 'the brief must be cleaned up');
  assert.match(block, /BEGIN/, 'deletion must be transactional');
  assert.match(block, /used\.rowCount/, 'a shared brief must be kept');
});

test('briefs can be deleted through the API', async () => {
  const s = await read('../../server/index.ts');
  assert.match(s, /app\.delete\('\/api\/briefs\/:id'/);
  const api = await read('../services/apiService.ts');
  assert.match(api, /deleteBrief:/);
});

/* ── S8: version summary is required, rollback is an in-app dialog ───────── */

test('a version cannot be saved without a real summary', async () => {
  const view = await read('../components/EditorWorkspaceView.tsx');
  assert.doesNotMatch(view, /useState\('Editorial draft revision'\)/, 'the field must start empty');
  assert.match(view, /Ringkasan perubahan wajib diisi/);
});

test('rollback no longer uses window.confirm', async () => {
  const view = await read('../components/EditorWorkspaceView.tsx');
  const block = view.slice(view.indexOf('const handleRollback'), view.indexOf('const handleRollback') + 900);
  assert.doesNotMatch(block, /window\.confirm/, 'rollback must use the in-app dialog');
  assert.match(view, /rollbackTarget/, 'a dialog state is required');
});

/* ── R4: consistent labels and punctuation ───────────────────────────────── */

test('the menu label matches the page it opens', async () => {
  const sidebar = await read('../components/Sidebar.tsx');
  assert.doesNotMatch(sidebar, /'Pengguna & Peran'/);
  assert.match(sidebar, /'Pengguna & Hak Akses'/);
});

test('the workflow heading matches the number of steps', async () => {
  const help = await read('../components/SettingsHelpView.tsx');
  assert.doesNotMatch(help, /Sepuluh Langkah/, 'nine steps were labelled ten');
  assert.match(help, /Sembilan Langkah/);
});

test('no prose has a space before punctuation', async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = new URL('../components/', import.meta.url);
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.tsx')) continue;
    const src = await readFile(new URL(file, dir), 'utf8');
    for (const [i, line] of src.split('\n').entries()) {
      const s = line.trim();
      if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) continue;
      if (/[a-z]{2,}\s+[.,;](\s|$)/.test(s) && !/[{}()=<>]/.test(s.replace('</', ''))) {
        assert.fail(`${file}:${i + 1} has a space before punctuation -> ${s.slice(0, 80)}`);
      }
    }
  }
});

/* ── R9: one sidebar width ───────────────────────────────────────────────── */

test('the sidebar rail has a single width token', async () => {
  const css = await read('../index.css');
  assert.match(css, /--sidebar-rail-width:\s*\d+px/, 'a width token is required');
  assert.doesNotMatch(css, /\.app-sidebar\s*\{\s*width:\s*68px/, 'the conflicting override must be gone');
  const widths = [...css.matchAll(/\.app-sidebar\s*\{[^}]*width:\s*(\d+)px/g)].map(m => m[1]);
  assert.equal(widths.length, 0, `literal widths must not remain: ${widths.join(',')}`);
});

/* ── R7: a superadmin cannot delete their own account ────────────────────── */

test('self-deletion is blocked in the accounts view', async () => {
  const view = await read('../components/AdminAccountsView.tsx');
  assert.match(view, /selfId/, 'the current account must be identified');
  assert.match(view, /tidak dapat menghapus akun Anda sendiri/);
  assert.match(view, /u\.id === selfId/, 'the row must be disabled for the current user');
});

/* ── R3 / R6: layout and required marker ─────────────────────────────────── */

test('the library action row wraps inside the card', async () => {
  const css = await read('../styles/form-controls.css');
  assert.match(css, /\.library-card-actions\s*\{[^}]*flex-wrap:\s*wrap/);
  const view = await read('../components/LibraryView.tsx');
  assert.match(view, /library-card-actions/);
});

test('the KB title field shows that it is required', async () => {
  const view = await read('../components/KnowledgeBaseView.tsx');
  assert.match(view, /aria-required/, 'the required state must be announced');
});
