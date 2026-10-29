const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generateVariants() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1060 });

  const variants = [
    {
      source: 'hospital_poster.jpg',
      output: 'poster_red_emergency.jpg',
      filter: 'hue-rotate(150deg) saturate(1.5) contrast(1.08)',
      overlay: 'linear-gradient(135deg, rgba(225, 29, 72, 0.22), rgba(244, 63, 94, 0.08))'
    },
    {
      source: 'hotel_poster.jpg',
      output: 'poster_amber_hotel.jpg',
      filter: 'hue-rotate(25deg) saturate(1.4) contrast(1.05)',
      overlay: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))'
    },
    {
      source: 'water_poster.jpg',
      output: 'poster_green_eco.jpg',
      filter: 'hue-rotate(245deg) saturate(1.5) brightness(1.04)',
      overlay: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.1))'
    },
    {
      source: 'hospital_poster.jpg',
      output: 'poster_purple_smartcity.jpg',
      filter: 'hue-rotate(85deg) saturate(1.5) contrast(1.08)',
      overlay: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(126, 34, 206, 0.08))'
    },
    {
      source: 'hotel_poster.jpg',
      output: 'poster_orange_market.jpg',
      filter: 'hue-rotate(190deg) saturate(1.55) contrast(1.08)',
      overlay: 'linear-gradient(135deg, rgba(249, 115, 22, 0.22), rgba(234, 88, 12, 0.1))'
    },
    {
      source: 'water_poster.jpg',
      output: 'poster_teal_clinic.jpg',
      filter: 'hue-rotate(330deg) saturate(1.35) contrast(1.04)',
      overlay: 'linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(13, 148, 136, 0.08))'
    },
    {
      source: 'hotel_poster.jpg',
      output: 'poster_gold_heritage.jpg',
      filter: 'hue-rotate(358deg) saturate(1.4) contrast(1.05)',
      overlay: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1))'
    },
    {
      source: 'water_poster.jpg',
      output: 'poster_blue_water.jpg',
      filter: 'saturate(1.3) contrast(1.05)',
      overlay: 'transparent'
    },
    {
      source: 'hospital_poster.jpg',
      output: 'poster_rose_community.jpg',
      filter: 'hue-rotate(125deg) saturate(1.45) contrast(1.08)',
      overlay: 'linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(225, 29, 72, 0.1))'
    }
  ];

  for (const v of variants) {
    const srcPath = path.resolve('public/showcase', v.source);
    const base64Data = fs.readFileSync(srcPath).toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Data}`;
    const outPath = path.resolve('public/showcase', v.output);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 800px; height: 1060px; overflow: hidden; background: #0f172a; }
          .container { position: relative; width: 800px; height: 1060px; overflow: hidden; }
          img {
            width: 800px;
            height: 1060px;
            object-fit: cover;
            filter: ${v.filter};
            display: block;
          }
          .overlay {
            position: absolute;
            inset: 0;
            background: ${v.overlay};
            mix-blend-mode: overlay;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${dataUri}" />
          <div class="overlay"></div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 92 });
    const stat = fs.statSync(outPath);
    console.log(`Saved ${v.output}: ${stat.size} bytes`);
  }

  await browser.close();
  console.log('Done!');
}

generateVariants().catch(err => {
  console.error(err);
  process.exit(1);
});
