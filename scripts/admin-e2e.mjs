// Browser end-to-end check of the admin control plane:
// login -> live overview -> company/workspace/account/creator CRUD -> membership toggles -> audit.
import puppeteer from 'puppeteer-core';

const APP = 'http://localhost:5173/';
const COMPANY = 'QA Browser Holding';
const WORKSPACE = 'QA Browser Unit Satu';
const WORKSPACE_TWO = 'QA Browser Unit Dua';
const CREATOR = 'QA Browser Creator';
const CREATOR_EMAIL = 'qa-browser-creator@local.test';

const results = [];
const failures = [];
const browserErrors = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!ok) failures.push(name);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── API helper: fixture setup/teardown and cross-checks ──
let cookie = '';
const api = async (method, path, body) => {
  const res = await fetch('http://127.0.0.1:3005' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  try { return await res.json(); } catch { return null; }
};

async function cleanupFixture() {
  await api('POST', '/api/auth/login', { email: 'qa-admin@local.test', password: 'QaAdminPass123' });
  for (const user of (await api('GET', '/api/admin/users') || []).filter(u => u.email.startsWith('qa-browser'))) {
    await api('DELETE', `/api/admin/users/${user.id}`);
  }
  for (const workspace of (await api('GET', '/api/admin/workspaces') || []).filter(w => w.name.startsWith('QA Browser'))) {
    await api('DELETE', `/api/admin/workspaces/${workspace.id}`);
  }
  for (const company of (await api('GET', '/api/admin/companies') || []).filter(c => c.name.startsWith('QA Browser'))) {
    await api('DELETE', `/api/admin/companies/${company.id}`);
  }
}

// ── UI helpers ──
const normalize = value => value.replace(/\s+/g, ' ').trim();

async function pageText(page) {
  return normalize(await page.evaluate(() => document.body.innerText));
}

async function waitText(page, text, timeout = 15000) {
  const target = normalize(text);
  await page.waitForFunction(t => document.body.innerText.replace(/\s+/g, ' ').includes(t), { timeout }, target);
}

async function clickButton(page, text) {
  const clicked = await page.evaluate(t => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t);
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`button not found: ${text}`);
  await sleep(300);
}

// Fills the control inside the first <label> whose text starts with `labelText`.
// For <select> controls the visible option text is matched, since option values
// are internal ids/slugs (a real user picks the company/peran by its name).
async function fillLabel(page, labelText, value) {
  const filled = await page.evaluate((t, v) => {
    const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(t));
    const field = label?.querySelector('input,select,textarea');
    if (!field) return false;
    if (field.tagName === 'SELECT') {
      const option = [...field.options].find(o => o.textContent.trim() === v);
      if (!option) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(field, option.value);
    } else {
      const setter = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value')?.set;
      setter?.call(field, v);
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, labelText, value);
  if (!filled) throw new Error(`field not found: ${labelText}`);
  await sleep(150);
}

async function toggleCheckbox(page, ariaLabel) {
  const found = await page.$(`input[type=checkbox][aria-label="${ariaLabel}"]`);
  if (!found) throw new Error(`checkbox not found: ${ariaLabel}`);
  await found.click();
  await sleep(600);
}

// ── run ──
console.log('Pre-run cleanup…');
await cleanupFixture();

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
let page;
try {
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('dialog', dialog => dialog.accept());
  page.on('console', msg => { if (msg.type() === 'error') browserErrors.push('console: ' + msg.text()); });

  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  check('app shell served on 5173', (await page.title()).length > 0, await page.title());

  // ── login ──
  await page.waitForSelector('input[type=email]', { timeout: 20000 });
  await page.type('input[type=email]', 'qa-admin@local.test');
  await page.type('input[type=password]', 'QaAdminPass123');
  await page.evaluate(() => [...document.querySelector('form').querySelectorAll('button')].pop().click());
  await waitText(page, 'Administrasi Sistem', 20000);
  check('superadmin sees the admin console', true);
  await waitText(page, 'Belum ada perusahaan terdaftar. Mulai dari menu Data Master BUMD.');
  check('overview is driven by the API, not static copy', true);

  // ── Data Master BUMD: create a company ──
  await clickButton(page, 'Data Master BUMD');
  await waitText(page, 'Data Master Entitas BUMD');
  await fillLabel(page, 'Nama perusahaan induk', COMPANY);
  await clickButton(page, 'Tambah Perusahaan');
  await waitText(page, `Menampilkan 1 dari 1 entitas — 0 workspace, 0 akun terhubung.`);
  check('company created and listed with live counts', true);

  // ── Manajemen Workspace: create through the UI ──
  await clickButton(page, 'Manajemen Workspace');
  await waitText(page, 'Buat, ubah, dan hapus unit kerja BUMD di seluruh perusahaan induk.');
  await fillLabel(page, 'Perusahaan induk', COMPANY);
  await fillLabel(page, 'Nama workspace', WORKSPACE);
  await fillLabel(page, 'Kode unit', 'QA-BRW');
  await fillLabel(page, 'Sektor', 'Air Minum');
  await fillLabel(page, 'Kota', 'Bandung');
  await clickButton(page, 'Simpan Workspace');
  await waitText(page, 'QA-BRW');
  check('workspace created through the UI', true);

  // Second workspace is fixture setup (the create path is already proven above).
  const companyId = (await api('GET', '/api/admin/companies')).find(c => c.name === COMPANY).id;
  await api('POST', '/api/admin/workspaces', { companyId, name: WORKSPACE_TWO, code: 'QA-BRW2', sector: 'Air Minum', city: 'Bandung' });

  // ── Pengguna & Peran: create a corporate account ──
  await clickButton(page, 'Pengguna & Peran (WS)');
  await waitText(page, 'Kelola akun superadmin, admin korporat, dan kreator beserta perusahaan induknya.');
  await fillLabel(page, 'Nama', 'QA Browser Corporate');
  await fillLabel(page, 'Email', 'qa-browser-corp@local.test');
  await fillLabel(page, 'Kata sandi (minimal 8 karakter)', 'QaBrowserPass123');
  await fillLabel(page, 'Peran', 'Admin Korporat');
  await fillLabel(page, 'Perusahaan induk', COMPANY);
  await clickButton(page, 'Tambah Akun');
  await waitText(page, 'Akun baru dibuat.');
  await waitText(page, 'qa-browser-corp@local.test');
  check('corporate account created through the UI', true);

  // ── Kreator Perusahaan: create a creator placed in both workspaces ──
  await clickButton(page, 'Kreator Perusahaan');
  await waitText(page, 'Kreator adalah anggota workspace. Kelola akun dan penempatan workspace mereka di sini.');
  await fillLabel(page, 'Nama', CREATOR);
  await fillLabel(page, 'Email', CREATOR_EMAIL);
  await fillLabel(page, 'Kata sandi (minimal 8 karakter)', 'QaBrowserPass123');
  await fillLabel(page, 'Perusahaan induk', COMPANY);
  await toggleCheckbox(page, `Penempatan baru ${WORKSPACE}`);
  await toggleCheckbox(page, `Penempatan baru ${WORKSPACE_TWO}`);
  await clickButton(page, 'Tambah Kreator');
  await waitText(page, 'Kreator baru dibuat.');
  await waitText(page, '1 kreator');
  check('creator created and grouped under its company', true);

  const placements = (await api('GET', '/api/admin/users')).find(u => u.email === CREATOR_EMAIL)?.workspaceIds || [];
  check('creator is placed in both workspaces', placements.length === 2, placements.length + ' placement(s)');

  // ── membership toggles hit the real API ──
  await toggleCheckbox(page, `Penempatan ${WORKSPACE_TWO} untuk ${CREATOR}`);
  await waitText(page, 'dikeluarkan dari workspace.');
  check('creator removed from one workspace via the UI', true);
  await toggleCheckbox(page, `Penempatan ${WORKSPACE_TWO} untuk ${CREATOR}`);
  await waitText(page, 'ditambahkan ke workspace.');
  check('creator re-added to a workspace via the UI', true);

  // ── Jejak Audit renders from /api/admin/audit ──
  await clickButton(page, 'Jejak Audit');
  await waitText(page, 'Jejak Audit Sistem');
  check('audit tab renders', (await pageText(page)).includes('aktivitas'));

  // ── reload keeps the session and shows live counters ──
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitText(page, 'Administrasi Sistem', 20000);
  // Wait for the overview request to resolve before reading the counters.
  await waitText(page, 'Total 1 entitas induk terdaftar.');
  // Stat labels are rendered with `text-transform: uppercase`, which innerText reflects.
  const text = (await pageText(page)).toLowerCase();
  check('session survives a full reload', true);
  check('overview counts one company', text.includes('total 1 entitas induk terdaftar.'));
  check('overview counts two workspaces', /total workspace 2\b/.test(text), (text.match(/total workspace \d+/) || [''])[0]);
  check('overview counts four accounts', /total pengguna 4\b/.test(text), (text.match(/total pengguna \d+/) || [''])[0]);

  await page.screenshot({ path: 'scripts/admin-e2e.png', fullPage: true });
  await cleanupFixture();
} catch (error) {
  const notices = page ? await page.evaluate(() => [...document.querySelectorAll('[role=alert],[role=status]')].map(n => n.innerText).join(' || ')).catch(() => '') : '';
  check('script completed without throwing', false, `${error.message}${notices ? ' | notices: ' + notices : ''}`);
} finally {
  await browser.close();
}

console.log(results.join('\n'));
const realErrors = [...new Set(browserErrors)].filter(entry => !/401 \(Unauthorized\)/.test(entry));
if (realErrors.length) {
  console.log('\nBrowser console errors:');
  for (const entry of realErrors.slice(0, 10)) console.log('  - ' + entry);
} else {
  console.log('\nNo browser console errors (the pre-login /api/auth/me 401 is expected).');
}
console.log(failures.length ? `\n${failures.length} UI CHECK(S) FAILED: ${failures.join(', ')}` : '\nALL UI CHECKS PASSED');
process.exit(failures.length ? 1 : 0);
