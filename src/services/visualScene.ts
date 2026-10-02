export type VisualInput = { workspaceId: string; prompt: string; aspectRatio: '1:1'|'9:16'|'16:9'; headline?: string; subheadline?: string; badgeText?: string; ctaText?: string; disclaimer?: string; primaryColor?: string; accentColor?: string };
export type Scene = { width:number; height:number; background:string; concept:string; shapes:{path:string;fill:string;motion:'none'|'float'|'sway'|'pulse'}[]; copy:string[] };
const color = (v:unknown):string => { if(typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('Invalid scene color'); return v; };
export function validateVisualInput(value:unknown):VisualInput {
  if(!value || typeof value !== 'object') throw new Error('Visual input is required');
  const v=value as Record<string,unknown>;
  if(typeof v.workspaceId !== 'string' || !/^[\w-]{1,180}$/.test(v.workspaceId)) throw new Error('workspaceId is required');
  if(typeof v.prompt !== 'string' || !v.prompt.trim() || v.prompt.length>4000) throw new Error('Creative direction must contain 1–4000 characters (not truncated)');
  if(!['1:1','9:16','16:9'].includes(String(v.aspectRatio))) throw new Error('Invalid aspect ratio');
  const result:VisualInput={workspaceId:v.workspaceId,prompt:v.prompt,aspectRatio:v.aspectRatio as VisualInput['aspectRatio']};
  for(const key of ['headline','subheadline','badgeText','ctaText','disclaimer'] as const){
    if(v[key]!==undefined && (typeof v[key] !== 'string' || v[key].length>500)) throw new Error(`${key} must be at most 500 characters (not truncated)`);
    result[key]=(v[key] as string|undefined)||'';
  }
  for(const key of ['primaryColor','accentColor'] as const) if(v[key]!==undefined) result[key]=color(v[key]);
  return result;
}
export function validateScene(value:unknown,input:VisualInput):Scene {
  if(!value || typeof value !== 'object') throw new Error('Invalid scene JSON');
  const v=value as Record<string,unknown>;
  if(typeof v.concept !== 'string' || !v.concept.trim() || v.concept.length>1000) throw new Error('Invalid scene concept');
  if(!Array.isArray(v.shapes) || v.shapes.length<1 || v.shapes.length>60) throw new Error('Scene needs 1–60 illustration paths');
  const shapes=v.shapes.map((s:unknown)=>{
    if(!s || typeof s!=='object') throw new Error('Invalid shape');
    const p=s as Record<string,unknown>;
    if(typeof p.path!=='string' || p.path.length>3000 || !/^[Mm][\s\d.,+\-MLHVCSQTAZmlhvcsqtazEe]+$/.test(p.path)) throw new Error('Invalid illustration path');
    const numbers=p.path.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)||[];
    if(numbers.some(n=>!Number.isFinite(Number(n)) || Math.abs(Number(n))>1000)) throw new Error('Path coordinates out of bounds');
    if(!['none','float','sway','pulse'].includes(String(p.motion))) throw new Error('Invalid motion');
    return {path:p.path,fill:color(p.fill),motion:p.motion as Scene['shapes'][number]['motion']};
  });
  const [width,height]=input.aspectRatio==='9:16'?[576,1024]:input.aspectRatio==='16:9'?[1024,576]:[768,768];
  return {width,height,background:color(v.background),concept:v.concept,shapes,copy:[input.badgeText||'',input.headline||'',input.subheadline||'',input.ctaText||'',input.disclaimer||'']};
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
// ponytail: illustration occupies upper 58%; trusted text layout below, never model-generated markup/code.
export function renderSceneSvg(scene:Scene,time=0):string {
  const {width:w,height:h}=scene;
  const paths=scene.shapes.map((s,i)=>{
    const phase=Math.sin(time*Math.PI*2/6+i*.4);
    const transform=s.motion==='float'?`translate(0 ${phase*2})`:s.motion==='sway'?`rotate(${phase*3} 50 50)`:s.motion==='pulse'?`translate(50 50) scale(${1+phase*.035}) translate(-50 -50)`:'';
    return `<path d="${escape(s.path)}" fill="${s.fill}" transform="${transform}"/>`;
  }).join('');
  const maxChars=Math.max(30,Math.floor(w/12));
  const blocks=scene.copy.filter(Boolean).map(text=>text.split('\n').flatMap(line=>{
    const chars=Array.from(line);const lines:string[]=[];while(chars.length) lines.push(chars.splice(0,maxChars).join(''));return lines.length?lines:[''];
  }));
  const count=blocks.reduce((n,b)=>n+b.length,0);
  const size=Math.min(w/30,(h*.34)/Math.max(1,count+blocks.length*.4));
  let y=h*.64;
  const texts=blocks.map(lines=>{const out=lines.map(line=>{y+=size*1.15;return `<text x="${w*.06}" y="${y}" font-size="${size}" xml:space="preserve">${escape(line)}</text>`;}).join('');y+=size*.4;return out;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${escape(scene.concept)}</title><rect width="${w}" height="${h}" fill="${scene.background}"/><svg x="${w*.05}" y="${h*.025}" width="${w*.9}" height="${h*.56}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${paths}</svg><rect y="${h*.61}" width="${w}" height="${h*.39}" fill="#101827"/><g fill="#ffffff" font-family="Arial, sans-serif">${texts}</g></svg>`;
}
