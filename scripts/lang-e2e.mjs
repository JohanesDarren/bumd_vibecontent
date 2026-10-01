import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const results = [];
const ok = (n, c, e = '') => { results.push({ n, c: !!c }); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' — ' + e : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = await b.newPage();
await page.setViewport({ width: 1560, height: 950 });

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 20000 });

// Auth page in Indonesian
let body = await page.evaluate(() => document.body.innerText);
ok('login: "Masuk ke VibeContent"', body.includes('Masuk ke VibeContent'));
ok('login: no "Sign in to VibeContent"', !body.includes('Sign in to VibeContent'));

await page.type('input[type="email"]', 'admin@tirta.demo');
await page.type('input[type="password"]', 'DemoPass123');
await page.evaluate(() => { const btns = document.querySelectorAll('.login-card form button'); btns[btns.length - 1]?.click(); });
await page.waitForSelector('.app-sidebar', { timeout: 20000 });
await sleep(800);

// Sidebar Indonesian
body = await page.evaluate(() => document.body.innerText);
ok('sidebar: "Produksi Konten"', /produksi konten/i.test(body));
ok('sidebar: "Brief & Generasi"', body.includes('Brief & Generasi'));
ok('sidebar: "Pustaka & Ekspor"', body.includes('Pustaka & Ekspor'));
ok('sidebar: "Pengguna & Peran"', body.includes('Pengguna & Peran'));
ok('sidebar: "Jejak Audit"', body.includes('Jejak Audit'));
ok('sidebar: "Keluar"', body.includes('Keluar'));
ok('sidebar: no "Content Production"', !body.includes('Content Production'));

// Header
ok('header: "Ganti Organisasi" tooltip', await page.evaluate(() => document.querySelector('.org-switcher-pill')?.getAttribute('title') === 'Ganti Organisasi / BUMD'));

// Dashboard
ok('dash: "Selamat datang"', body.includes('Selamat datang'));
ok('dash: "Total Draf"', body.includes('Total Draf'));
ok('dash: "Menunggu Review"', body.includes('Menunggu Review'));
ok('dash: "Buat Konten Baru"', body.includes('Buat Konten Baru'));
ok('dash: status "Menunggu Review" pill', body.includes('Disetujui') || body.includes('Menunggu Review'));

// Click through each tab and check page title Indonesian
const tabs = [
  ['Brief & Generasi', 'Brief & Generasi Konten'],
  ['Editor & Versi', 'Brief Hasil Generasi'],
  ['Studio Visual', 'Perlu Konten Disetujui'],
  ['Penjadwalan Konten', 'Penjadwalan Konten'],
  ['Pustaka & Ekspor', 'Pustaka Konten'],
  ['Profil & Merek', 'Profil Organisasi & Panduan Merek'],
  ['Pengguna & Peran', 'Pengguna & Peran'],
  ['Jejak Audit', 'Jejak Audit Aktivitas'],
  ['Pengaturan & Bantuan', 'Pengaturan & Bantuan']
];
for (const [tab, expected] of tabs) {
  await page.evaluate((t) => Array.from(document.querySelectorAll('.app-sidebar button')).find(x => x.textContent.includes(t))?.click(), tab);
  await sleep(700);
  const txt = await page.evaluate(() => document.body.innerText);
  ok(`tab ${tab}: "${expected}"`, txt.includes(expected));
}

// Users page Indonesian form
await page.evaluate(() => Array.from(document.querySelectorAll('.app-sidebar button')).find(x => x.textContent.includes('Pengguna'))?.click());
await sleep(700);
body = await page.evaluate(() => document.body.innerText);
ok('users: "Nama lengkap" placeholder', await page.evaluate(() => !!Array.from(document.querySelectorAll('input')).find(i => i.placeholder === 'Nama lengkap')));
ok('users: "Tambah Pengguna"', body.includes('Tambah Pengguna'));

// Scheduling modal Indonesian
await page.evaluate(() => Array.from(document.querySelectorAll('.app-sidebar button')).find(x => x.textContent.includes('Penjadwalan'))?.click());
await sleep(700);
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Tambah Jadwal Baru'))?.click());
await sleep(400);
body = await page.evaluate(() => document.body.innerText);
ok('schedule modal: "Judul Konten *"', body.includes('Judul Konten *'));
ok('schedule modal: "Simpan Jadwal"', body.includes('Simpan Jadwal'));
ok('schedule modal: no "Add New Schedule"', !body.includes('Add New Schedule'));


console.log(`\n${results.filter(r => r.c).length}/${results.length} passed`);
const fails = results.filter(r => !r.c);
if (fails.length) { console.log('FAILED:'); fails.forEach(f => console.log(' -', f.n)); }
await b.close();
process.exit(fails.length ? 1 : 0);
