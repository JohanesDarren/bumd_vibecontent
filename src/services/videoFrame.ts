// One small JPEG still per media item bounds storage and vision-model payload.
export async function imageFrame(file: File): Promise<Blob> {
  const image=await createImageBitmap(file);
  try {
    const canvas=document.createElement('canvas');const scale=Math.min(1,512/Math.max(image.width,image.height));
    canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);
    const frame=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('Foto gagal dibaca')),'image/jpeg',0.75));
    if(frame.size>1024*1024)throw new Error('Frame foto terlalu besar');
    return frame;
  } finally {image.close();}
}

export async function videoFrame(file: File): Promise<Blob> {
  const url=URL.createObjectURL(file);
  const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=url;
  const loaded=new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('Video tidak dapat dibaca'));});
  try {
    await Promise.race([loaded,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Video terlalu lama dimuat')),15000))]);
    if(!video.videoWidth||!video.videoHeight)throw new Error('Video tidak memiliki gambar');
    const canvas=document.createElement('canvas');const scale=Math.min(1,512/Math.max(video.videoWidth,video.videoHeight));
    canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
    canvas.getContext('2d')?.drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('Frame video gagal dibuat')),'image/jpeg',0.75));
    if(blob.size>1024*1024)throw new Error('Frame video terlalu besar');
    return blob;
  } finally {video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
