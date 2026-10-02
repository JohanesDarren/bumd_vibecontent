import { renderSceneSvg } from './visualScene';
import type { Scene } from './visualScene';
export function reelMimeType():string|null {
  if(typeof MediaRecorder==='undefined') return null;
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||null;
}
export async function renderReel(scene:Scene,signal?:AbortSignal):Promise<Blob> {
  const mimeType=reelMimeType();
  if(!mimeType) throw new Error('Browser does not support native video recording. Download the SVG poster instead.');
  const canvas=document.createElement('canvas');canvas.width=scene.width;canvas.height=scene.height;
  if(!canvas.captureStream) throw new Error('Canvas video capture is unavailable in this browser.');
  const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Canvas is unavailable.');
  const stream=canvas.captureStream(30);
  const chunks:Blob[]=[];
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:3000000});
  let recordingError:Error|null=null;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=()=>{recordingError=new Error('Browser video encoding failed.');};
  const stopped=new Promise<void>(resolve=>{recorder.onstop=()=>resolve();});
  try {
    recorder.start();
    const start=performance.now();
    do {
      if(signal?.aborted) throw new Error('Reel rendering cancelled.');
      if(recordingError) throw recordingError;
      if(document.hidden) throw new Error('Keep this tab visible while rendering the reel.');
      const url=URL.createObjectURL(new Blob([renderSceneSvg(scene,(performance.now()-start)/1000)],{type:'image/svg+xml'}));
      try {const image=new Image();image.src=url;await image.decode();ctx.drawImage(image,0,0);} finally {URL.revokeObjectURL(url);}
      await new Promise(resolve=>setTimeout(resolve,1000/30));
    }while(performance.now()-start<6000);
    recorder.stop();await stopped;
    if(recordingError) throw recordingError;
    const blob=new Blob(chunks,{type:recorder.mimeType||mimeType});
    if(!blob.size) throw new Error('Browser produced an empty video.');
    return blob;
  } finally {
    if(recorder.state!=='inactive') recorder.stop();
    stream.getTracks().forEach(track=>track.stop());
  }
}
