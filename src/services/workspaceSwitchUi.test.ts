import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
test('workspace switch replaces the mounted brand profile form data', {skip: !chrome}, async () => {
  const html = new URL('../../workspace-switch-check.html', import.meta.url);
  const entry = new URL('../../workspace-switch-check.tsx', import.meta.url);
  await writeFile(html, '<div id="root"></div><script type="module" src="/workspace-switch-check.tsx"></script>');
  await writeFile(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{BrandProfileView}from'./src/components/BrandProfileView';const make=(name)=>({organizationName:name,unitDepartment:name,defaultLanguage:'id',targetAudiences:[],toneOfVoice:[],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:[],brandGuidelinesSummary:'',officialDisclaimer:''});function Harness(){const [second,setSecond]=useState(false);const name=second?'Workspace Beta':'Workspace Alpha';return <><button onClick={()=>setSecond(true)}>Switch workspace</button><main key={second?'b':'a'}><BrandProfileView brandProfile={make(name)} activeWorkspace={{id:second?'b':'a',name} as any} activeUser={{role:'corporate'} as any} onSaveProfile={()=>{}}/></main></>}createRoot(document.getElementById('root')!).render(<Harness/>);`);
  const server=await createServer({server:{host:'127.0.0.1',port:0}});let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try{
    await server.listen();browser=await puppeteer.launch({executablePath:chrome!,headless:true,args:['--no-sandbox']});const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${(server.httpServer!.address() as import('node:net').AddressInfo).port}/workspace-switch-check.html`);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('input')).some(input=>input.value==='Workspace Alpha'));
    await page.click('button');await page.waitForFunction(()=>document.body.innerText.includes('Workspace Beta'));
    assert.ok(await page.$eval('input.form-input',el=>(el as HTMLInputElement).value==='Workspace Beta'),'brand form must reflect the selected workspace');
  }finally{await browser?.close();await server.close();await unlink(html);await unlink(entry);}
});
