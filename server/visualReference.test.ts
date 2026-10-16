import test from 'node:test';
import assert from 'node:assert/strict';
import { describeStyle, generateVisual } from './visual.ts';

test('visual planner receives bounded style derived from a reference frame',async()=>{
  const original=globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID='test-account';process.env.CLOUDFLARE_API_TOKEN='test-token';
  const calls:{model:string;body:any}[]=[];
  const image=Buffer.from([255,216,255,224,0,2,255,217]).toString('base64');
  globalThis.fetch=async (url,init)=>{
    const model=String(url).split('/ai/run/')[1];const body=JSON.parse(String(init?.body));calls.push({model,body});
    return new Response(JSON.stringify({success:true,result:model.includes('flux-1-schnell')?{image}:{response:'Teal editorial landscape, soft natural light; no text.'}}));
  };
  try{
    const result=await generateVisual({workspaceId:'org-a',prompt:'lake photography',aspectRatio:'1:1'},'Soft coral geometric composition.');
    assert.match(calls[0].body.messages[1].content,/Soft coral geometric composition/);
    assert.match(calls[1].body.prompt,/Teal editorial landscape/);
    assert.equal(result.referenceUsed,true);
  }finally{globalThis.fetch=original;delete process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_API_TOKEN;}
});


test('vision description reads authorized frame bytes; rejects empty output', async()=>{
  const image=Buffer.from([255,216,255,0,255,217]);
  const previous=globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID='account-test';process.env.CLOUDFLARE_API_TOKEN='token-test';
  try {
    globalThis.fetch=async (url,init)=>{
      assert.match(String(url),/llava-1\.5-7b-hf$/);
      const body=JSON.parse(String(init?.body));
      assert.deepEqual(body.image,[...image]);
      assert.match(body.prompt,/style/i);
      return new Response(JSON.stringify({success:true,result:{description:'Soft teal, coral circle, clean editorial style.'}}));
    };
    assert.match(await describeStyle(image),/Soft teal/);
    globalThis.fetch=async()=>new Response(JSON.stringify({success:true,result:{description:''}}));
    await assert.rejects(describeStyle(image),/vision|style/i);
  } finally {globalThis.fetch=previous;delete process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_API_TOKEN;}
});

test('reference ID validation rejects malformed IDs',async()=>{
  const {validateVisualInput}=await import('../src/services/visualScene.ts');
  assert.throws(()=>validateVisualInput({workspaceId:'org-a',prompt:'art',aspectRatio:'1:1',referenceId:'../another'}));
});
