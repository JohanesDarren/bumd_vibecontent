import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_SETTINGS, normalizeSettings, DEFAULT_COMPANY_POLICY } from './appSettings.ts';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── Company policy model ────────────────────────────────────────────────── */

test('company policy has safe defaults', () => {
  assert.equal(DEFAULT_SETTINGS.companyPolicy.allowedLanguages, 'both');
  assert.equal(DEFAULT_SETTINGS.companyPolicy.allowToneOverride, true);
  assert.equal(DEFAULT_SETTINGS.companyPolicy.requireBrandIdentity, false);
});

test('company policy survives a round trip and rejects junk', () => {
  const clean = normalizeSettings({
    companyPolicy: { allowedLanguages: 'id', allowToneOverride: false, requireBrandIdentity: true }
  });
  assert.equal(clean.companyPolicy.allowedLanguages, 'id');
  assert.equal(clean.companyPolicy.allowToneOverride, false);
  assert.equal(clean.companyPolicy.requireBrandIdentity, true);

  const junk = normalizeSettings({ companyPolicy: { allowedLanguages: 'fr', allowToneOverride: 'yes' } });
  assert.equal(junk.companyPolicy.allowedLanguages, DEFAULT_COMPANY_POLICY.allowedLanguages);
  assert.equal(junk.companyPolicy.allowToneOverride, DEFAULT_COMPANY_POLICY.allowToneOverride);
});

test('older stored settings without the policy still load', () => {
  const legacy = normalizeSettings({ defaultLanguage: 'id' });
  assert.equal(legacy.companyPolicy.allowedLanguages, 'both');
});

/* ── Corporate keeps its own settings, scoped to the company ─────────────── */

test('corporate settings are stored per company, not per workspace', async () => {
  const db = await read('../../server/database.ts');
  const block = db.slice(db.indexOf('function saveWorkspaceSettings'), db.indexOf('function saveWorkspaceSettings') + 700);
  assert.match(block, /company_settings/, 'settings must persist at company level');
  assert.match(block, /SELECT company_id/, 'the workspace maps to its company');
});

test('the corporate settings page still exists and is reachable', async () => {
  const policies = await read('./policies.ts');
  assert.match(policies, /corporate:[^\]]*settings_help/);
  const settings = await read('../components/SettingsHelpView.tsx');
  assert.match(settings, /Bahasa &amp; Output|Bahasa & Output/);
  assert.match(settings, /Kebijakan Konten Perusahaan/);
});

test('corporate can set language, tone and brand-identity policy', async () => {
  const settings = await read('../components/SettingsHelpView.tsx');
  assert.match(settings, /allowedLanguages/);
  assert.match(settings, /allowToneOverride/);
  assert.match(settings, /requireBrandIdentity/);
});

test('the tone lock is enforced in the brief form', async () => {
  const brief = await read('../components/BriefStudioView.tsx');
  assert.match(brief, /allowToneOverride === false/, 'the control must be disabled by policy');
  assert.match(brief, /Dikunci oleh kebijakan perusahaan/);
});

/* ── Superadmin page is clearly platform-level ───────────────────────────── */

test('each settings surface states its scope', async () => {
  const settings = await read('../components/SettingsHelpView.tsx');
  assert.match(settings, /Pengaturan tingkat perusahaan/);
  assert.match(settings, /Administrasi Aplikasi/);
  const admin = await read('../components/AdminMaintenanceView.tsx');
  assert.match(admin, /Pengaturan tingkat aplikasi/);
  assert.match(admin, /seluruh perusahaan, seluruh workspace, dan seluruh peran/);
});

test('platform upkeep stays out of the company page', async () => {
  const settings = await read('../components/SettingsHelpView.tsx');
  assert.doesNotMatch(settings, /ragPurgeOrphans/);
  assert.doesNotMatch(settings, /Bersihkan Vektor Yatim/);
});
