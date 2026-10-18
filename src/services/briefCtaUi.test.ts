import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync); // ponytail: browser regression runs where Chrome/Edge exists; other hosts skip.

// Exercise the real controlled select + state effect, not an isolated handler.
test('creator can switch from official CTA to custom and enter free text', {skip: !chrome}, async () => {
  const html = new URL('../../brief-cta-check.html', import.meta.url);
  const entry = new URL('../../brief-cta-check.tsx', import.meta.url);
  await writeFile(html, '<div id="root"></div><script type="module" src="/brief-cta-check.tsx"></script>');
  await writeFile(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{BriefStudioView}from'./src/components/BriefStudioView';import{DEFAULT_SETTINGS}from'./src/services/appSettings';const brand={organizationName:'Demo',unitDepartment:'Humas',defaultLanguage:'id',targetAudiences:[],toneOfVoice:['Formal'],terminology:[],bannedWords:[],officialCTAs:[{id:'cta-1',label:'Call Center',text:'Hubungi Call Center'}],approvedChannels:['Instagram'],brandGuidelinesSummary:'',officialDisclaimer:''};createRoot(document.getElementById('root')).render(<BriefStudioView brandProfile={brand} activeWorkspace={{id:'ws',name:'Demo'}} activeUser={{id:'creator',role:'creator'}} drafts={[]} settings={DEFAULT_SETTINGS} onOpenEditor={()=>{}} onGenerateDraft={()=>''}/>);`);
  const server=await createServer({server:{host:'127.0.0.1',port:0}});
  let browser: Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try {
    await server.listen();
    browser=await puppeteer.launch({executablePath:chrome!,headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${(server.httpServer!.address() as import('node:net').AddressInfo).port}/brief-cta-check.html`);  // Vite bound TCP address.
    await page.waitForSelector('select');
    const selector='select[aria-label="Pilihan CTA"]'; const input='input[aria-label="CTA kustom"]';  // ponytail: semantic selectors, no CSS path coupling.
    await page.select(selector,'');
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal(await page.$eval(selector,el=>(el as HTMLSelectElement).value),'');
    assert.equal(await page.$eval('input[placeholder="Atau tulis Call to Action kustom..."]',el=>(el as HTMLInputElement).value),'');
    await page.type('input[placeholder="Atau tulis Call to Action kustom..."]','Kunjungi loket hari ini');
    assert.equal(await page.$eval(selector,el=>(el as HTMLSelectElement).value),'');
    assert.equal(await page.$eval(input,el=>(el as HTMLInputElement).value),'Kunjungi loket hari ini');
    await page.select(selector,'Hubungi Call Center');
    assert.equal(await page.$eval(selector,el=>(el as HTMLSelectElement).value),'Hubungi Call Center');
    await page.click(input);
    assert.equal(await page.$eval(input,el=>(el as HTMLInputElement).value),'', 'typing a fresh custom CTA should not inherit official text');
    await page.type(input,'Datang ke kantor');
    assert.equal(await page.$eval(input,el=>(el as HTMLInputElement).value),'Datang ke kantor');
    assert.equal(await page.$eval(selector,el=>(el as HTMLSelectElement).value),'');
  } finally {
    await browser?.close();await server.close();await unlink(html);await unlink(entry);
  }
});
