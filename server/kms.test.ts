import { test } from 'node:test';
import { spawnSync } from 'node:child_process';

test('accepts standard DOCX ZIP data descriptors', () => {
  const script=`import io,zipfile,sys
class NonSeekable(io.BytesIO):
 def seek(self,*args): raise OSError('not seekable')
b=NonSeekable()
with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z: z.writestr('word/document.xml','<w:document xmlns:w="x">hello</w:document>')
sys.stdout.buffer.write(b.getvalue())`;
  const data=spawnSync('python',['-c',script]);
  assert.equal(data.status,0,data.stderr.toString());
  assert.equal(data.stdout.readUInt16LE(6)&8,8);
  assert.equal(validateKnowledgeUpload('valid.docx',data.stdout),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

import assert from 'node:assert/strict';
import { validateKnowledgeUpload, uploadKnowledgeFile, queryKnowledge, searchKnowledge } from './kms.ts';

test('query sends only authorized document IDs to shared KMS', async () => {
  const fetcher:typeof fetch=async (_url,init) => {
    assert.deepEqual(JSON.parse(String(init?.body)).documentIds,['doc-allowed']);
    return new Response(JSON.stringify({success:true,grounded:true,answer:'ok',sources:[{document_id:'doc-foreign'},{document_id:'doc-allowed'}]}),{status:200});
  };
  const result=await queryKnowledge('q',{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher,['doc-allowed']);
  assert.equal(result.grounded,false);
  assert.deepEqual(result.sources,[]);
  assert.ok(!result.answer.includes('ok'));
});


test('searches shared corpus using provider citations without invented excerpts', async () => {
  const fetcher:typeof fetch=async (_url,init) => {
    assert.deepEqual(JSON.parse(String(init?.body)),{query:'Policy?',organizationId:'org-shared'});
    return new Response(JSON.stringify({success:true,grounded:true,answer:'Policy text',sources:[{document_id:'doc-1',document_name:'Policy',score:0.9}]}),{status:200});
  };
  const result=await searchKnowledge('Policy?',{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher);
  assert.equal(result.results[0].document_id,'doc-1');
  assert.equal(result.results[0].content,undefined);
});



test('rejects unsupported and spoofed files before provider call', () => {
  assert.throws(() => validateKnowledgeUpload('bad.exe', Buffer.from('hello')));
  assert.throws(() => validateKnowledgeUpload('bad.pdf', Buffer.from('not a pdf')));
  assert.throws(() => validateKnowledgeUpload('empty.md', Buffer.alloc(0)));
  assert.throws(() => validateKnowledgeUpload('bad.docx', Buffer.from('PK\x03\x04')));
  assert.throws(() => validateKnowledgeUpload('bad.md', Buffer.from([0xff,0xfe])));
  assert.equal(validateKnowledgeUpload('notes.md', Buffer.from('# Valid notes')), 'text/markdown');
  assert.equal(validateKnowledgeUpload('photo.jpg', Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDp6KKK8Q+tP//Z','base64')), 'image/jpeg');
  assert.equal(validateKnowledgeUpload('photo.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGN831vEwMDAxAAGABfPAfJjif7XAAAAAElFTkSuQmCC','base64')), 'image/png');
  assert.equal(validateKnowledgeUpload('photo.webp', Buffer.from('UklGRjoAAABXRUJQVlA4IC4AAADwAQCdASoCAAIAAUAmJaACdLoB+AAETAAA/u+sV/vvQG8n//Qk/BJ+CT+AYAAA','base64')), 'image/webp');
  assert.throws(() => validateKnowledgeUpload('fake.jpg', Buffer.from('not an image')));
  assert.throws(() => validateKnowledgeUpload('fake.mp4', Buffer.from('not a video')));
});

test('photo upload uses KMS photo repository and shared project', async () => {
  const fetcher:typeof fetch=async (_url,init) => {
    const form=init?.body as FormData;
    assert.equal(form.get('repositoryType'),'photo');
    assert.equal(form.get('organizationId'),'org-shared');
    assert.equal((form.get('file') as File).type,'image/jpeg');
    return new Response(JSON.stringify({success:true,document:{id:'photo-1'}}),{status:201});
  };
  await uploadKnowledgeFile({name:'photo.jpg',data:Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDp6KKK8Q+tP//Z','base64'),title:'Style',category:'Foto'}, {url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher);
});

test('uploads to fixed shared project with server-only key', async () => {
  const calls: {url:string; init:RequestInit}[]=[];
  const fetcher:typeof fetch=async (url,init) => {
    calls.push({url:String(url),init:init!});
    return new Response(JSON.stringify({success:true,document:{id:'doc-1',status:'indexed'}}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const result=await uploadKnowledgeFile({name:'notes.md',data:Buffer.from('# Test'),title:'Test',category:'SOP'}, {url:'https://kms.test/',key:'secret',organizationId:'org-shared'},fetcher);
  assert.equal(result.document.id,'doc-1');
  assert.equal(calls[0].url,'https://kms.test/api/documents/upload');
  assert.equal((calls[0].init.headers as Record<string,string>)['X-API-Key'],'secret');
  const form=calls[0].init.body as FormData;
  assert.equal(form.get('organizationId'),'org-shared');
  assert.equal(form.get('notes'),null); // Workspace assignment stays in app DB, not KMS.
  assert.equal(form.get('file') instanceof File,true);
  assert.equal((form.get('file') as File).name,'notes.txt');
  assert.equal((form.get('file') as File).type,'text/plain');
  assert.equal(await (form.get('file') as File).text(),'# Test');
  assert.equal(form.get('repositoryType'),'document');
  assert.equal(form.get('workspaceId'),null); // scope comes only from server config
  assert.equal(result.document.status,'indexed');
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('queries same shared project and preserves grounded sources', async () => {
  const fetcher:typeof fetch=async (_url,init) => {
    assert.deepEqual(JSON.parse(String(init?.body)),{query:'Pertanyaan?',organizationId:'org-shared'});
    return new Response(JSON.stringify({success:true,answer:'Jawaban',grounded:true,sources:[{document_id:'doc-1'}]}),{status:200});
  };
  const result=await queryKnowledge('Pertanyaan?',{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher);
  assert.equal(result.grounded,true);
  assert.equal(result.sources[0].document_id,'doc-1');
});

test('does not claim success on provider failure', async () => {
  const fetcher:typeof fetch=async()=>new Response(JSON.stringify({success:false,message:'Failed'}),{status:200});
  await assert.rejects(uploadKnowledgeFile({name:'notes.md',data:Buffer.from('# Test'),title:'Test',category:'SOP'},{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher));
});
test('propagates KMS HTTP failures with provider detail', async () => {
  const fetcher:typeof fetch=async()=>new Response(JSON.stringify({success:false,error:'LLM connection lost'}),{status:502});
  await assert.rejects(
    queryKnowledge('Pertanyaan?',{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher,['doc-1']),
    /KMS menolak permintaan \(HTTP 502\): LLM connection lost/
  );
});

test('propagates KMS network failures instead of a blind 502', async () => {
  const fetcher:typeof fetch=async()=>{throw new TypeError('fetch failed');};
  await assert.rejects(
    queryKnowledge('Pertanyaan?',{url:'https://kms.test',key:'secret',organizationId:'org-shared'},fetcher,['doc-1']),
    /fetch failed/
  );
});
