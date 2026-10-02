import { validateVisualInput } from '../src/services/visualScene.ts';
export class VisualError extends Error { status:number; code:string; constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;} }
const imageModel='@cf/black-forest-labs/flux-1-schnell';
const llmModel='@cf/meta/llama-3.1-8b-instruct';
async function designPrompt(account:string,token:string,input:Awaited<ReturnType<typeof validateVisualInput>>) {
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${llmModel}`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messages:[
      {role:'system',content:'You are an expert art director. Return only one detailed image-generation prompt in English. Describe a distinctive editorial illustration with specific composition, characters or objects, lighting, palette, textures, and visual depth. Never request words, letters, logos, UI or watermarks; leave uncluttered negative space for later typeset text.'},
      {role:'user',content:`Creative brief: ${input.prompt}\nAspect ratio: ${input.aspectRatio}\nPrimary color: ${input.primaryColor||'choose suitable'}\nAccent color: ${input.accentColor||'choose suitable'}`}
    ],max_tokens:220,temperature:0.8}),signal:AbortSignal.timeout(45000)
  });
  const data:any=await response.json().catch(()=>null);
  const text=data?.result?.response || data?.result?.choices?.[0]?.message?.content;
  if([402,429].includes(response.status)) throw new VisualError(429,'CLOUDFLARE_QUOTA_EXCEEDED','Cloudflare AI quota/rate limit reached.');
  if([401,403].includes(response.status)) throw new VisualError(502,'CLOUDFLARE_AUTH_ERROR','Cloudflare rejected the account/token.');
  if(!response.ok || typeof text!=='string' || !text.trim()) throw new VisualError(502,'CLOUDFLARE_LLM_ERROR',`Cloudflare LLM could not design the image prompt (HTTP ${response.status}).`);
  return text.trim();
}
export async function generateVisual(value:unknown) {
  let input;
  try { input=validateVisualInput(value); } catch(e) { throw new VisualError(400,'INVALID_INPUT',(e as Error).message); }
  const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
  if(!account || !token) throw new VisualError(503,'CLOUDFLARE_NOT_CONFIGURED','Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the server .env.local, then restart the API.');
  let prompt:string;
  try { prompt=await designPrompt(account,token,input); }
  catch(error) { if(error instanceof VisualError) throw error; throw new VisualError(502,'CLOUDFLARE_LLM_ERROR','Cloudflare LLM request failed or timed out.'); }
  prompt=[prompt,`Portrait/square/landscape composition: ${input.aspectRatio}.`, 'Absolutely no text, lettering, logos, or watermark.'].join('\\n');
  if(prompt.length>2048) throw new VisualError(502,'CLOUDFLARE_LLM_PROMPT_TOO_LONG','LLM-designed prompt exceeded the image model limit.');
  let response:Response;
  try {
    // ponytail: one request, no retries/fallback; quota remains under the user's control.
    response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${imageModel}`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({prompt,steps:4}),signal:AbortSignal.timeout(90000)
    });
  } catch { throw new VisualError(502,'CLOUDFLARE_UNAVAILABLE','Cloudflare request failed or timed out. No fallback image was generated.'); }
  let data:any;
  try {data=await response.json();} catch {data=null;}
  const failed=!response.ok || data?.success===false;
  const quota=[402,429].includes(response.status) || (failed && /quota|neurons|rate limit|daily.*limit|capacity.*exceed/i.test(JSON.stringify(data?.errors||[])));
  if(quota) throw new VisualError(429,'CLOUDFLARE_QUOTA_EXCEEDED','Cloudflare quota or rate limit reached. Wait for the limit to reset; no retry, paid upgrade, or fallback was attempted.');
  if([401,403].includes(response.status)) throw new VisualError(502,'CLOUDFLARE_AUTH_ERROR','Cloudflare rejected the account/token. Check Workers AI permissions.');
  if(failed) throw new VisualError(502,'CLOUDFLARE_PROVIDER_ERROR',`Cloudflare generation failed (HTTP ${response.status}). No fallback image was generated.`);
  const image=data?.result?.image;
  if(typeof image!=='string' || !image || image.length>30_000_000 || image.length%4!==0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new VisualError(502,'INVALID_CLOUDFLARE_IMAGE','Cloudflare returned missing or malformed image data.');
  const bytes=Buffer.from(image,'base64');
  if(bytes.length<8 || bytes[0]!==255 || bytes[1]!==216 || bytes[2]!==255 || bytes[bytes.length-2]!==255 || bytes[bytes.length-1]!==217) throw new VisualError(502,'INVALID_CLOUDFLARE_IMAGE','Cloudflare did not return the documented JPEG image.');
  return {imageUrl:`data:image/jpeg;base64,${image}`,provider:'Cloudflare Workers AI',model:imageModel,llmModel,fallback:false as const,format:'image/jpeg',prompt:input.prompt};
}
