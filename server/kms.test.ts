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
