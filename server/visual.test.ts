import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVisual } from './visual.ts';
const input = { workspaceId: 'test', prompt: 'A lake at sunrise', aspectRatio: '1:1' };
// Isolated tests: no .env, no real provider. Fixtures are mocks, not generated images.
delete process.env.CLOUDFLARE_ACCOUNT_ID;
delete process.env.CLOUDFLARE_API_TOKEN;
test('missing Cloudflare credentials fails explicitly', async () => {
  await assert.rejects(generateVisual(input), { status: 503, code: 'CLOUDFLARE_NOT_CONFIGURED' });
});
test('mock provider contract: errors, malformed results, success, no retries', async () => {
  process.env.CLOUDFLARE_ACCOUNT_ID='mock-account';
  process.env.CLOUDFLARE_API_TOKEN='mock-secret';
  const original=globalThis.fetch;
  let calls=0;
  let status=429;
  let body:unknown={success:false,errors:[{message:'quota exceeded mock-secret'}]};
  globalThis.fetch=async (url, options) => {
    calls++;
    assert.equal(String(url),'https://api.cloudflare.com/client/v4/accounts/mock-account/ai/run/@cf/black-forest-labs/flux-1-schnell');
    assert.equal(options?.method,'POST');
    assert.deepEqual(Object.keys(JSON.parse(String(options?.body))).sort(),['prompt','steps']);
    return new Response(JSON.stringify(body),{status});
  };
  try {
    await assert.rejects(generateVisual(input),{status:429,code:'CLOUDFLARE_QUOTA_EXCEEDED'});
    assert.equal(calls,1,'no retries burn quota');
    status=401;body={success:false,errors:[{message:'unauthorized mock-secret'}]};
    await assert.rejects(generateVisual(input),{status:502,code:'CLOUDFLARE_AUTH_ERROR'});
    status=500;
    await assert.rejects(generateVisual(input),{status:502,code:'CLOUDFLARE_PROVIDER_ERROR'});
    status=200;body={success:false,errors:[{message:'daily neuron quota exceeded'}]};
    await assert.rejects(generateVisual(input),{status:429,code:'CLOUDFLARE_QUOTA_EXCEEDED'});
    for(const image of [undefined,'not base64','PHN2Zz48L3N2Zz4=']) {
      body={success:true,result:{image}};
      await assert.rejects(generateVisual(input),{status:502,code:'INVALID_CLOUDFLARE_IMAGE'});
    }
    // Synthetic JPEG signature fixture only; not a browser-decodable/live generated image.
    const image=Buffer.from([255,216,255,224,0,2,255,217]).toString('base64');
    body={success:true,result:{image}};
    const result=await generateVisual(input);
    assert.equal(result.imageUrl,`data:image/jpeg;base64,${image}`);
    assert.equal(result.provider,'Cloudflare Workers AI');
    assert.equal(result.fallback,false);
    assert.equal('scene' in result,false);
    const before=calls;
    await assert.rejects(generateVisual({...input,prompt:'x'.repeat(2049)}),{status:400,code:'INPUT_TOO_LONG'});
    assert.equal(calls,before);
    globalThis.fetch=async()=>{throw new Error('mock-secret network failure');};
    await assert.rejects(generateVisual(input),{status:502,code:'CLOUDFLARE_UNAVAILABLE'});
  } finally {globalThis.fetch=original;delete process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_API_TOKEN;}
});
