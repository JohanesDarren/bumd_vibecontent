import { validateVisualInput } from '../src/services/visualScene.ts';
export class VisualError extends Error { status:number; code:string; constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;} }
const model='@cf/black-forest-labs/flux-1-schnell';
export async function generateVisual(value:unknown) {
  let input;
  try { input=validateVisualInput(value); } catch(e) { throw new VisualError(400,'INVALID_INPUT',(e as Error).message); }
  const prompt=[input.prompt,`Composition: ${input.aspectRatio}.`,input.primaryColor && `Primary color: ${input.primaryColor}.`,input.accentColor && `Accent color: ${input.accentColor}.`,...(['headline','subheadline','badgeText','ctaText','disclaimer'] as const).map(key=>input[key] ? `${key} (exact text requested): ${JSON.stringify(input[key])}` : '')].filter(Boolean).join('\n');
  if(prompt.length>2048) throw new VisualError(400,'INPUT_TOO_LONG','FLUX.1 schnell allows 2048 characters total, including copy and color instructions. Shorten the input; nothing was truncated.');
  const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
  if(!account || !token) throw new VisualError(503,'CLOUDFLARE_NOT_CONFIGURED','Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the server .env.local, then restart the API. No fallback image was generated.');
  let response:Response;
  try {
    // ponytail: one request, no retries/fallback; quota remains under the user's control.
    response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model}`,{
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
  return {imageUrl:`data:image/jpeg;base64,${image}`,provider:'Cloudflare Workers AI',model,fallback:false as const,format:'image/jpeg',prompt:input.prompt};
}
