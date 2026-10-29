import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const app = () => readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const assetsDir = new URL('../../dist/assets/', import.meta.url);

test('every heavy view is loaded lazily, not imported at startup', async () => {
  const src = await app();
  const views = [
    'DashboardView', 'BriefStudioView', 'EditorWorkspaceView', 'VisualStudioView',
    'LibraryView', 'BrandProfileView', 'KnowledgeBaseView', 'AuditLogView',
    'ExportModal', 'UserManagementView', 'SettingsHelpView', 'ContentSchedulingView',
    'CorporateManagementView', 'CorporateDashboardView', 'WorkspaceMappingView',
    'CorporateUsersView', 'AdminDashboard'
  ];
  for (const v of views) {
    // A static import would put the whole view in the initial bundle.
    assert.doesNotMatch(
      src,
      new RegExp(`^import \\{ ${v} \\}`, 'm'),
      `${v} must not be statically imported`
    );
    assert.match(
      src,
      new RegExp(`const ${v} = lazy\\(`),
      `${v} must be declared with lazy()`
    );
  }
});

test('lazy views keep their named export', async () => {
  const src = await app();
  // Vite needs an explicit default mapping when the module uses named exports.
  assert.match(src, /import\('.*'\)\.then\(m => \(\{ default: m\.\w+ \}\)\)/);
});

test('the viewport is wrapped in Suspense with a skeleton fallback', async () => {
  const src = await app();
  assert.match(src, /<Suspense fallback=\{<ViewSkeleton \/>\}>/);
  assert.equal((src.match(/<Suspense/g) || []).length, (src.match(/<\/Suspense>/g) || []).length,
    'every Suspense must be closed');
});

test('the shell stays eager so the first paint is immediate', async () => {
  const src = await app();
  for (const shell of ['Header', 'Sidebar', 'AuthView', 'BriefHistoryRail']) {
    assert.match(src, new RegExp(`^import \\{ ${shell} \\}`, 'm'), `${shell} must load eagerly`);
  }
});

test('the built entry chunk is small and views are separate files', async () => {
  assert.ok(existsSync(assetsDir), 'run a build first');
  const files = await readdir(assetsDir);
  const entry = files.filter(f => /^index-[\w-]+\.js$/.test(f));
  assert.equal(entry.length, 1, 'expected exactly one entry chunk');
  const { statSync } = await import('node:fs');
  const kb = statSync(new URL(entry[0], assetsDir)).size / 1024;
  assert.ok(kb < 120, `entry chunk is ${kb.toFixed(0)} KB; code splitting regressed`);
  const viewChunks = files.filter(f => /(View|Dashboard|Modal)-[\w-]+\.js$/.test(f));
  assert.ok(viewChunks.length >= 10, `expected split view chunks, found ${viewChunks.length}`);
});

test('react and icons are split into their own cacheable chunks', async () => {
  const files = await readdir(assetsDir);
  assert.ok(files.some(f => f.startsWith('react-')), 'react chunk missing');
  assert.ok(files.some(f => f.startsWith('icons-')), 'icons chunk missing');
});
