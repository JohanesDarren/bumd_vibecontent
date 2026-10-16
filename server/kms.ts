import { basename, extname } from 'node:path';
import { inflateRawSync } from 'node:zlib';

export type KmsConfig = { url:string; key:string; organizationId:string };
export const kmsConfig = ():KmsConfig => ({url:process.env.KMS_API_URL||'',key:process.env.KMS_API_KEY||'',organizationId:process.env.KMS_ORGANIZATION_ID||''});
const MAX_FILE = 50 * 1024 * 1024;

export function validateKnowledgeUpload(name:string,data:Buffer):string {
  if (!data.length || data.length > MAX_FILE) throw new Error('File harus berisi data dan maksimal 50 MB');
  if (name !== basename(name) || /[\\/\0]/.test(name)) throw new Error('Nama file tidak valid');
  const ext=extname(name).toLowerCase();
  if (ext==='.pdf' && data.subarray(0,5).toString()==='%PDF-' && data.includes(Buffer.from('%%EOF'))) return 'application/pdf';
  if (ext==='.md' && !data.includes(0) && new TextDecoder('utf-8',{fatal:true}).decode(data).trim()) return 'text/markdown';
  if (ext==='.docx' && data.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])) && validDocx(data)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if ((ext==='.jpg'||ext==='.jpeg')&&validJpeg(data))return 'image/jpeg';
  if (ext==='.png'&&validPng(data))return 'image/png';
  if (ext==='.webp'&&validWebp(data))return 'image/webp';
  if (ext==='.mp4'&&validMp4(data))return 'video/mp4';
  throw new Error('Hanya PDF, DOCX, MD, JPG, PNG, WebP, atau MP4 yang valid diterima');
}

// ponytail: check format framing and dimensions; use a dedicated decoder if pixel-level sanitization becomes necessary.
function validJpeg(data:Buffer):boolean {
  if(data.length<32||data.readUInt16BE(0)!==0xffd8||data.readUInt16BE(data.length-2)!==0xffd9)return false;
  let offset=2,frame=false;
  while(offset+4<data.length){
    if(data[offset]!==255)return false;
    const marker=data[offset+1];if(marker===0xda)return frame&&offset+4<data.length-2;
    const size=data.readUInt16BE(offset+2);
    if(size<2||offset+size+2>data.length-2)return false;
    if([0xc0,0xc1,0xc2,0xc3].includes(marker)){if(size<7||!data.readUInt16BE(offset+5)||!data.readUInt16BE(offset+7))return false;frame=true;}
    offset+=size+2;
  }
  return false;
}
function validPng(data:Buffer):boolean {
  if(data.length<57||!data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||data.readUInt32BE(8)!==13||data.toString('ascii',12,16)!=='IHDR'||!data.readUInt32BE(16)||!data.readUInt32BE(20))return false;
  let offset=8,hasPixels=false;
  while(offset+12<=data.length){
    const size=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);
    if(size>data.length-offset-12)return false;
    if(kind==='IDAT'&&size)hasPixels=true;
    offset+=size+12;
    if(kind==='IEND')return hasPixels&&size===0&&offset===data.length;
  }
  return false;
}
function validWebp(data:Buffer):boolean {
  return data.length>=30&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'&&data.readUInt32LE(4)+8===data.length&&['VP8 ','VP8L','VP8X'].includes(data.toString('ascii',12,16))&&data.readUInt32LE(16)>0&&data.readUInt32LE(16)+20<=data.length;
}

function validMp4(data:Buffer):boolean {
  if(data.length<32||data.toString('ascii',4,8)!=='ftyp')return false;
  let offset=0,hasMedia=false,hasMovie=false;
  while(offset+8<=data.length){
    const size=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);
    if(size<8||size>data.length-offset)return false;
    if(kind==='mdat'&&size>8)hasMedia=true;
    if(kind==='moov'&&size>8)hasMovie=true;
    offset+=size;
  }
  return offset===data.length&&hasMedia&&hasMovie;
}

// ponytail: validate Word's core XML through ZIP central directory (incl. data descriptors); full OOXML validation belongs in a dedicated parser if needed.
function validDocx(data:Buffer):boolean {
  const eocd=data.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  if(eocd<0||eocd+22>data.length||eocd+22+data.readUInt16LE(eocd+20)!==data.length)return false;
  const count=data.readUInt16LE(eocd+10),end=data.readUInt32LE(eocd+16)+data.readUInt32LE(eocd+12);
  let offset=data.readUInt32LE(eocd+16);
  if(count>10000||end>eocd)return false;
  for(let i=0;i<count;i++){
    if(offset+46>end||data.readUInt32LE(offset)!==0x02014b50)return false;
    const method=data.readUInt16LE(offset+10),size=data.readUInt32LE(offset+20),uncompressed=data.readUInt32LE(offset+24);
    const nameLength=data.readUInt16LE(offset+28),extra=data.readUInt16LE(offset+30),comment=data.readUInt16LE(offset+32);
    const next=offset+46+nameLength+extra+comment;
    if(next>end||size>MAX_FILE||uncompressed>MAX_FILE)return false;
    const name=data.subarray(offset+46,offset+46+nameLength).toString();
    if(name==='word/document.xml'){
      const local=data.readUInt32LE(offset+42);
      if(local+30>data.length||data.readUInt32LE(local)!==0x04034b50||data.readUInt16LE(local+8)!==method)return false;
      const start=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28);
      if(start+size>offset)return false;
      try {const xml=method===8?inflateRawSync(data.subarray(start,start+size),{maxOutputLength:MAX_FILE}):method===0?data.subarray(start,start+size):Buffer.alloc(0);return xml.length===uncompressed&&xml.includes(Buffer.from('<w:document'));}catch{return false;}
    }
    offset=next;
  }
  return false;
}

async function call(path:string,config:KmsConfig,init:RequestInit,fetcher:typeof fetch=fetch){
  if(!config.url || !config.key || !config.organizationId) throw new Error('KMS belum dikonfigurasi');
  const response=await fetcher(`${config.url.replace(/\/+$/,'')}/api${path}`,{...init,headers:{'X-API-Key':config.key,...init.headers},signal:AbortSignal.timeout(90000)});
  const text=await response.text();let body:any;
  try{body=JSON.parse(text);}catch{throw new Error(`KMS mengembalikan respons tidak valid (HTTP ${response.status})`);}
  if(!response.ok || body?.success!==true) throw new Error(`KMS menolak permintaan (HTTP ${response.status})`);
  return body;
}

export async function uploadKnowledgeFile(file:{name:string;data:Buffer;title:string;category:string},config=kmsConfig(),fetcher:typeof fetch=fetch){
  const mime=validateKnowledgeUpload(file.name,file.data);
  if(!file.title.trim() || !file.category.trim()) throw new Error('Judul dan kategori wajib diisi');
  const form=new FormData();
  form.set('title',file.title.trim());form.set('category',file.category.trim());form.set('repositoryType',mime.startsWith('image/')||mime.startsWith('video/')?'photo':'document');form.set('organizationId',config.organizationId);
  // KMS accepts TXT but does not document MD; preserve Markdown text and send it as .txt for indexing.
  form.set('file',new Blob([new Uint8Array(file.data)],{type:mime==='text/markdown'?'text/plain':mime}),mime==='text/markdown'?file.name.replace(/\.md$/i,'.txt'):file.name);
  const result=await call('/documents/upload',config,{method:'POST',body:form},fetcher);
  if(!result.document?.id) throw new Error('KMS tidak mengembalikan ID dokumen');
  return result;
}

export async function queryKnowledge(query:string,config=kmsConfig(),fetcher:typeof fetch=fetch,documentIds?:string[]){
  if(documentIds && !documentIds.length)return {answer:'Tidak ada dokumen yang diizinkan untuk workspace ini.',grounded:false,sources:[],model:undefined};
  const result=await call('/chat/query',config,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,organizationId:config.organizationId,...(documentIds?{documentIds}:{})})},fetcher);
  const allowed=documentIds?new Set(documentIds):null;
  const sources=(Array.isArray(result.sources)?result.sources:[]).filter((s:any)=>!allowed||allowed.has(s.document_id));
  // A provider response outside the requested filter must never reach another workspace.
  if(allowed && (!result.grounded || !sources.length || !Array.isArray(result.sources) || sources.length!==result.sources.length))return {answer:'Jawaban KMS tidak dapat diverifikasi untuk workspace ini.',grounded:false,sources:[],model:result.model};
  return {answer:result.answer||'',grounded:result.grounded===true,sources,model:result.model};
}

export async function searchKnowledge(query:string,config=kmsConfig(),fetcher:typeof fetch=fetch,documentIds?:string[]){
  const answer=await queryKnowledge(query,config,fetcher,documentIds);
  return {results:answer.grounded?answer.sources:[]};
}

export async function listKnowledgeFiles(config=kmsConfig(),fetcher:typeof fetch=fetch){
  return call(`/documents?organizationId=${encodeURIComponent(config.organizationId)}`,config,{method:'GET'},fetcher);
}

export async function deleteKnowledgeFile(id:string,config=kmsConfig(),fetcher:typeof fetch=fetch){
  return call(`/documents/${encodeURIComponent(id)}`,config,{method:'DELETE'},fetcher);
}
