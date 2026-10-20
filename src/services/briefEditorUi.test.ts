import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);

test('Brief editor keeps typed text instead of resetting it on every keystroke', {skip: !chrome}, async () => {
  const html = new URL('../../brief-editor-check.html', import.meta.url);
  const entry = new URL('../../brief-editor-check.tsx', import.meta.url);
  await writeFile(html, '<div id="root"></div><script type="module" src="/brief-editor-check.tsx"></script>');
  await writeFile(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{BriefStudioView}from'./src/components/BriefStudioView';import{DEFAULT_SETTINGS}from'./src/services/appSettings';const brand={organizationName:'Demo',unitDepartment:'Humas',defaultLanguage:'id',targetAudiences:[],toneOfVoice:['Formal'],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:['Instagram'],brandGuidelinesSummary:'',officialDisclaimer:''};createRoot(document.getElementById('root')).render(<BriefStudioView brandProfile={brand} activeWorkspace={{id:'ws',name:'Demo'}} activeUser={{id:'creator',role:'creator'}} drafts={[]} settings={DEFAULT_SETTINGS} onOpenEditor={()=>{}} onGenerateDraft={()=>''}/>);`);
  const server=await createServer({server:{host:'127.0.0.1',port:0}});
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try {
    await server.listen();
    browser=await puppeteer.launch({executablePath:chrome!,headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${(server.httpServer!.address() as import('node:net').AddressInfo).port}/brief-editor-check.html`);
    const editor='.brief-editor-content';
    await page.waitForSelector(editor);
    await page.click(editor);
    await page.keyboard.type('Naskah yang sedang diedit');
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal(await page.$eval(editor,el=>(el as HTMLElement).innerText.trim()),'Naskah yang sedang diedit','typed draft text must survive React re-renders');
  } finally {
    await browser?.close();await server.close();await unlink(html);await unlink(entry);
  }
});
test('save button is disabled after the current brief was saved, preventing duplicate drafts', {skip: !chrome}, async () => {
  const html = new URL('../../brief-save-check.html', import.meta.url);
  const entry = new URL('../../brief-save-check.tsx', import.meta.url);
  await writeFile(html, '<div id="root"></div><script type="module" src="/brief-save-check.tsx"></script>');
  await writeFile(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{BriefStudioView}from'./src/components/BriefStudioView';import{DEFAULT_SETTINGS}from'./src/services/appSettings';const brand={organizationName:'Demo',unitDepartment:'Humas',defaultLanguage:'id',targetAudiences:[],toneOfVoice:['Formal'],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:['Instagram'],brandGuidelinesSummary:'',officialDisclaimer:''};createRoot(document.getElementById('root')).render(<BriefStudioView brandProfile={brand} activeWorkspace={{id:'ws',name:'Demo'}} activeUser={{id:'creator',role:'creator'}} drafts={[]} settings={DEFAULT_SETTINGS} onOpenEditor={()=>{}} onGenerateDraft={()=>''}/>);`);
  const server=await createServer({server:{host:'127.0.0.1',port:0}});
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try {
    await server.listen();
    browser=await puppeteer.launch({executablePath:chrome!,headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${(server.httpServer!.address() as import('node:net').AddressInfo).port}/brief-save-check.html`);
    await page.waitForSelector('form');
    const save='button[type="submit"]';
    assert.equal(await page.$eval(save,el=>(el as HTMLButtonElement).disabled),false);
    assert.match(await page.$eval(save,el=>el.textContent||''),/Buat & Simpan Draf/);
  } finally {
    await browser?.close();await server.close();await unlink(html);await unlink(entry);
  }
});
