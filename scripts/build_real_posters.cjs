const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function buildRealPosters() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1000 });

  const posters = [
    // 1. Hospital Health & Blood Donation (Red & White, NATURAL skin tone)
    {
      filename: 'poster_hospital_natural.jpg',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { width:800px; height:1000px; background:#fff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; }
            .hero-img { position:absolute; top:0; left:0; width:800px; height:600px; object-fit:cover; object-position:center top; }
            .gradient-fade { position:absolute; top:420px; left:0; width:800px; height:200px; background:linear-gradient(to bottom, transparent, #fff); }
            .top-bar { position:relative; z-index:10; padding:32px 40px; display:flex; justify-content:space-between; align-items:center; }
            .tag { background:rgba(225, 29, 72, 0.9); color:#fff; font-weight:800; font-size:14px; padding:6px 16px; border-radius:9999px; letter-spacing:1px; text-transform:uppercase; }
            .badge-right { background:rgba(255,255,255,0.95); color:#0f172a; font-weight:700; font-size:14px; padding:6px 16px; border-radius:9999px; }
            .content { position:relative; z-index:10; padding:40px 48px; background:#fff; }
            .category { color:#e11d48; font-weight:800; font-size:16px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
            h1 { font-size:46px; font-weight:900; line-height:1.05; color:#0f172a; letter-spacing:-1px; text-transform:uppercase; }
            p { font-size:18px; color:#64748b; margin-top:12px; line-height:1.4; font-weight:500; }
            .footer { display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:2px solid #f1f5f9; font-size:15px; font-weight:700; color:#334155; }
            .phone { color:#e11d48; font-size:22px; font-weight:900; }
          </style>
        </head>
        <body>
          <img class="hero-img" src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=85" />
          <div class="gradient-fade"></div>
          <div class="top-bar">
            <span class="tag">RSUD REGIONAL</span>
            <span class="badge-right">LAYANAN PUBLIK</span>
          </div>
          <div class="content">
            <div class="category">Pusat Pelayanan Medis Terpadu</div>
            <h1>Layanan Kesehatan Prima & Cepat</h1>
            <p>Pemeriksaan Kesehatan Rutin, Poliklinik Spesialis, dan Ambulans Gawat Darurat Siaga 24 Jam.</p>
            <div class="footer">
              <span>LOKASI: JL. KESEHATAN NO. 12</span>
              <span class="phone">HOTLINE: 119</span>
            </div>
          </div>
        </body>
        </html>
      `
    },

    // 2. Clean Water & Municipal Infrastructure (Cobalt Royal Blue)
    {
      filename: 'poster_water_natural.jpg',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { width:800px; height:1000px; background:#0b1d3a; color:#fff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; }
            .hero-img { position:absolute; top:0; left:0; width:800px; height:620px; object-fit:cover; opacity:0.85; }
            .gradient-fade { position:absolute; top:380px; left:0; width:800px; height:240px; background:linear-gradient(to bottom, transparent, #0b1d3a); }
            .top-bar { position:relative; z-index:10; padding:32px 40px; display:flex; justify-content:space-between; align-items:center; }
            .tag { background:#0284c7; color:#fff; font-weight:800; font-size:14px; padding:6px 16px; border-radius:9999px; letter-spacing:1px; text-transform:uppercase; }
            .content { position:relative; z-index:10; padding:40px 48px; background:#0b1d3a; }
            .category { color:#38bdf8; font-weight:800; font-size:15px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
            h1 { font-size:48px; font-weight:900; line-height:1.05; color:#fff; letter-spacing:-1px; text-transform:uppercase; }
            p { font-size:18px; color:#94a3b8; margin-top:12px; line-height:1.4; font-weight:500; }
            .footer { display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid #1e293b; font-size:15px; font-weight:700; color:#cbd5e1; }
            .highlight { color:#38bdf8; font-weight:900; font-size:20px; }
          </style>
        </head>
        <body>
          <img class="hero-img" src="https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1200&q=85" />
          <div class="gradient-fade"></div>
          <div class="top-bar">
            <span class="tag">PERUMDA AIR MINUM TIRTA</span>
            <span style="font-weight:700; font-size:14px; color:#38bdf8;">STANDAR SNI 01-3553</span>
          </div>
          <div class="content">
            <div class="category">Jaminan Pasokan Air Bersih & Sehat</div>
            <h1>Air Bersih Higienis Untuk Seluruh Warga</h1>
            <p>Sistem Filtrasi Modern Berkelanjutan Melayani Kebutuhan Air Bersih Rumah Tangga dan Industri Daerah.</p>
            <div class="footer">
              <span>CALL CENTER 24 JAM</span>
              <span class="highlight">HOTLINE 1500-112</span>
            </div>
          </div>
        </body>
        </html>
      `
    },

    // 3. Green City & Eco Transit (Emerald Green)
    {
      filename: 'poster_eco_natural.jpg',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { width:800px; height:1000px; background:#062315; color:#fff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; }
            .hero-img { position:absolute; top:0; left:0; width:800px; height:600px; object-fit:cover; opacity:0.85; }
            .gradient-fade { position:absolute; top:360px; left:0; width:800px; height:240px; background:linear-gradient(to bottom, transparent, #062315); }
            .top-bar { position:relative; z-index:10; padding:32px 40px; display:flex; justify-content:space-between; align-items:center; }
            .tag { background:#10b981; color:#062315; font-weight:900; font-size:14px; padding:6px 16px; border-radius:9999px; letter-spacing:1px; text-transform:uppercase; }
            .content { position:relative; z-index:10; padding:40px 48px; background:#062315; }
            .category { color:#34d399; font-weight:800; font-size:15px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
            h1 { font-size:48px; font-weight:900; line-height:1.05; color:#fff; letter-spacing:-1px; text-transform:uppercase; }
            p { font-size:18px; color:#a7f3d0; margin-top:12px; line-height:1.4; font-weight:500; }
            .footer { display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid #064e3b; font-size:15px; font-weight:700; color:#a7f3d0; }
            .badge-sub { background:#047857; color:#fff; padding:6px 14px; border-radius:8px; }
          </style>
        </head>
        <body>
          <img class="hero-img" src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85" />
          <div class="gradient-fade"></div>
          <div class="top-bar">
            <span class="tag">NET ZERO 2026</span>
            <span style="font-weight:700; font-size:14px; color:#6ee7b7;">BUMD ENERGI HIJAU</span>
          </div>
          <div class="content">
            <div class="category">Transportasi Ramah Lingkungan</div>
            <h1>Kota Bersih & Armada Bus Listrik</h1>
            <p>100% Bebas Emisi Karbon. Menghubungkan Kawasan Hunian, Sentra Bisnis, dan Ruang Publik Terbuka Hijau.</p>
            <div class="footer">
              <span>INTEGRASI TRANSIT KORIDOR KOTA</span>
              <span class="badge-sub">TARIF SUBSIDI</span>
            </div>
          </div>
        </body>
        </html>
      `
    },

    // 4. Luxury Hotel & Resort Staycation (Warm Sunset Gold, natural skin tones)
    {
      filename: 'poster_hotel_natural.jpg',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: "Playfair Display", Georgia, serif; }
            body { width:800px; height:1000px; background:#18130c; color:#fff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; }
            .hero-img { position:absolute; top:0; left:0; width:800px; height:620px; object-fit:cover; opacity:0.85; }
            .gradient-fade { position:absolute; top:360px; left:0; width:800px; height:260px; background:linear-gradient(to bottom, transparent, #18130c); }
            .top-bar { position:relative; z-index:10; padding:32px 40px; display:flex; justify-content:space-between; align-items:center; font-family:-apple-system, sans-serif; }
            .tag { background:#f59e0b; color:#000; font-weight:800; font-size:13px; padding:6px 14px; border-radius:9999px; letter-spacing:1px; text-transform:uppercase; }
            .content { position:relative; z-index:10; padding:40px 48px; background:#18130c; }
            .category { font-family:-apple-system, sans-serif; color:#fbbf24; font-weight:700; font-size:14px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
            h1 { font-size:46px; font-weight:400; line-height:1.1; color:#fff; letter-spacing:0; }
            p { font-family:-apple-system, sans-serif; font-size:17px; color:#d4d4d8; margin-top:12px; line-height:1.45; }
            .footer { font-family:-apple-system, sans-serif; display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid #27272a; font-size:15px; font-weight:700; color:#fbbf24; }
          </style>
        </head>
        <body>
          <img class="hero-img" src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85" />
          <div class="gradient-fade"></div>
          <div class="top-bar">
            <span class="tag">GRANDE HERITAGE HOTEL</span>
            <span style="color:#fde68a; font-size:14px; font-weight:600;">★★★★★ BINTANG LIMA</span>
          </div>
          <div class="content">
            <div class="category">Paket Menginap Istimewa</div>
            <h1>Staycation Eksklusif & Fine Dining</h1>
            <p>Nikmati Keindahan Panorama Senja, Kamar Presidential Suite, dan Kuliner Nusantara Kelas Dunia.</p>
            <div class="footer">
              <span>MULAI DARI RP 1.250.000 / MALAM</span>
              <span style="color:#fff;">RESERVASI RESMI</span>
            </div>
          </div>
        </body>
        </html>
      `
    },

    // 5. Smart City & Digital Services (Deep Royal Purple)
    {
      filename: 'poster_smartcity_natural.jpg',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { width:800px; height:1000px; background:#120722; color:#fff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; }
            .hero-img { position:absolute; top:0; left:0; width:800px; height:600px; object-fit:cover; opacity:0.8; }
            .gradient-fade { position:absolute; top:360px; left:0; width:800px; height:240px; background:linear-gradient(to bottom, transparent, #120722); }
            .top-bar { position:relative; z-index:10; padding:32px 40px; display:flex; justify-content:space-between; align-items:center; }
            .tag { background:#a855f7; color:#fff; font-weight:900; font-size:14px; padding:6px 16px; border-radius:9999px; letter-spacing:1px; text-transform:uppercase; }
            .content { position:relative; z-index:10; padding:40px 48px; background:#120722; }
            .category { color:#c084fc; font-weight:800; font-size:15px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
            h1 { font-size:46px; font-weight:900; line-height:1.05; color:#fff; letter-spacing:-1px; text-transform:uppercase; }
            p { font-size:18px; color:#d8b4fe; margin-top:12px; line-height:1.4; font-weight:500; }
            .footer { display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid #3b0764; font-size:15px; font-weight:700; color:#c084fc; }
          </style>
        </head>
        <body>
          <img class="hero-img" src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85" />
          <div class="gradient-fade"></div>
          <div class="top-bar">
            <span class="tag">PORTAL SATU PINTU</span>
            <span style="font-weight:700; font-size:14px; color:#c084fc;">SMART GOVERNANCE</span>
          </div>
          <div class="content">
            <div class="category">Digitalisasi Layanan Publik</div>
            <h1>Semua Layanan Warga Dalam Genggaman</h1>
            <p>Pajak Daerah, Kependudukan, Izin Usaha, dan Laporan Warga Terintegrasi Cepat & Transparan.</p>
            <div class="footer">
              <span>UNDUH DI GOOGLE PLAY & APP STORE</span>
              <span style="color:#fff; font-weight:900;">GRATIS</span>
            </div>
          </div>
        </body>
        </html>
      `
    }
  ];

  for (const p of posters) {
    const outPath = path.resolve('public/showcase', p.filename);
    await page.setContent(p.html, { waitUntil: 'networkidle0', timeout: 15000 }).catch(async () => {
      await page.setContent(p.html, { waitUntil: 'load' });
    });
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 95 });
    const stat = fs.statSync(outPath);
    console.log(`Generated ${p.filename} (${stat.size} bytes)`);
  }

  await browser.close();
  console.log('All authentic posters generated successfully!');
}

buildRealPosters().catch(console.error);
