import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';
const db = new URL(process.env.DATABASE_URL || 'postgresql://127.0.0.1/vibecontent');
if (!db.pathname.endsWith('_test')) db.pathname = '/vibecontent_test';
process.env.NODE_ENV = 'test'; process.env.DATABASE_URL = db.toString();
const {default:app}=await import('./index.ts');
const {pool,runMigrations,hashPassword}=await import('./database.ts');
const {deleteKnowledgeFile}=await import('./kms.ts');

test('corporate file flow: permission, shared upload, query, deletion', {timeout:120000}, async()=>{
  const id=randomUUID().slice(0,10), co=`co-kms-${id}`,other=`co-other-${id}`,ws=`org-kms-${id}`,ws2=`org-second-${id}`,foreign=`org-other-${id}`;
  const user=`usr-kms-${id}`,creator=`usr-other-${id}`,password=randomUUID()+randomUUID();
  const server=app.listen(0);await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  let documentId:string|undefined; // Remote probe is cleaned in finally.
  const call=(path:string,init:RequestInit={})=>fetch(base+path,init);
  try {
    await runMigrations();
    await pool.query('INSERT INTO companies(id,name) VALUES($1,$2),($3,$4)',[co,'KMS Test',other,'KMS Other']);
    await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6),($7,$8,$9,$10,$11,$12),($13,$14,$15,$16,$17,$18)',[ws,co,'Workspace Test',`KT${id}`,'Content','Bandung',ws2,co,'Workspace Restricted',`KR${id}`,'Content','Bandung',foreign,other,'Foreign',`KO${id}`,'Content','Bandung']);
    const hash=await hashPassword(password);
    await pool.query("INSERT INTO users(id,name,email,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,'corporate',$5),($6,$7,$8,$9,'creator',$10)",[user,'KMS Tester',`${id}@test.invalid`,hash,co,creator,'Other',`${id}-other@test.invalid`,hash,other]);
    const logged=await call('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${id}@test.invalid`,password})});
    assert.equal(logged.status,200);
    const cookie=logged.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
    const body=(workspaceId:string,ids=[workspaceId])=>{const f=new FormData();f.set('workspaceIds',JSON.stringify(ids));f.set('title',`Test upload ${id}`);f.set('file',new Blob([`Kode unik demonstrasi: anggrek-${id}.`],{type:'text/markdown'}),'source.md');return f;};
    const forbidden=await call('/api/kms/documents',{method:'POST',headers:{Cookie:cookie},body:body(foreign)});
    assert.equal(forbidden.status,403,await forbidden.text());
    const forged=await call('/api/kms/documents',{method:'POST',headers:{Cookie:cookie},body:body(ws,[ws,foreign])});
    assert.equal(forged.status,403);
    const uploaded=await call('/api/kms/documents',{method:'POST',headers:{Cookie:cookie},body:body(ws)});
    assert.equal(uploaded.status,201);
    const created=await uploaded.json();documentId=created.id;assert.ok(documentId);
    assert.equal(created.indexed,false);
    const listed=await call('/api/kms/documents',{headers:{Cookie:cookie}});
    assert.equal(listed.status,200);assert.deepEqual((await listed.json()).find((x:{id:string})=>x.id===documentId)?.workspaceIds,[ws]);
    const assigned=await pool.query('SELECT workspace_id FROM kms_document_workspaces WHERE document_id=$1',[documentId]);assert.deepEqual(assigned.rows.map(x=>x.workspace_id),[ws]);
    const noAccess=await call('/api/rag/query',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:foreign,query:'secret'})});assert.equal(noAccess.status,403);
    const corporateQuery=await call('/api/rag/query',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:ws,query:'Test'})});
    assert.equal(corporateQuery.status,403);
    const creatorId=`usr-creator-${id}`;
    await pool.query("INSERT INTO users(id,name,email,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,'creator',$5)",[creatorId,'KMS Creator',`${id}-creator@test.invalid`,hash,co]);
    await pool.query("INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'creator'),($3,$2,'creator')",[ws,creatorId,ws2]);
    const restricted=await pool.query('SELECT document_id FROM kms_document_workspaces WHERE workspace_id=$1',[ws2]);assert.equal(restricted.rowCount,0); // Same-company workspace, no assignment.
    const creatorLogin=await call('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${id}-creator@test.invalid`,password})});
    assert.equal(creatorLogin.status,200);
    const creatorCookie=creatorLogin.headers.get('set-cookie')?.split(';')[0];assert.ok(creatorCookie);
    const creatorUpload=await call('/api/kms/documents',{method:'POST',headers:{Cookie:creatorCookie},body:body(ws)});
    assert.equal(creatorUpload.status,403);
    const foreignQuery=await call('/api/rag/query',{method:'POST',headers:{Cookie:creatorCookie,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:foreign,query:'Test'})});
    assert.equal(foreignQuery.status,403);
    const restrictedQuery=await call('/api/rag/query',{method:'POST',headers:{Cookie:creatorCookie,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:ws2,query:`anggrek-${id}`})});
    assert.equal(restrictedQuery.status,200);const restrictedAnswer=await restrictedQuery.json();assert.equal(restrictedAnswer.grounded,false);assert.deepEqual(restrictedAnswer.sources,[]);
    let answer:any;
    for(let attempt=0;attempt<6;attempt++){
      if(attempt)await new Promise(resolve=>setTimeout(resolve,2000));
      const query=await call('/api/rag/query',{method:'POST',headers:{Cookie:creatorCookie,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:ws,query:`Apa kode unik demonstrasi pada Test upload ${id}?`})});
      assert.equal(query.status,200);answer=await query.json();
      if(answer.grounded&&answer.sources?.some((x:{document_id:string})=>x.document_id===documentId)&&answer.answer.includes(`anggrek-${id}`))break;
    }
    assert.equal(answer.grounded,true,'KMS must ground the answer');
    assert.ok(answer.sources?.some((x:{document_id:string})=>x.document_id===documentId),'KMS must cite the uploaded document');
    assert.ok(answer.answer.includes(`anggrek-${id}`),'KMS must answer from uploaded text');
    const marked=await pool.query('SELECT indexed FROM kms_documents WHERE id=$1',[documentId]);assert.equal(marked.rows[0].indexed,true);
    const removed=await call(`/api/kms/documents/${encodeURIComponent(documentId!)}`,{method:'DELETE',headers:{Cookie:cookie}});
    assert.equal(removed.status,200);documentId=undefined;
  } finally {
    if(documentId) {try{await deleteKnowledgeFile(documentId);}catch{console.error('KMS cleanup requires attention',documentId);}}
    await pool.query('DELETE FROM kms_documents WHERE workspace_id=ANY($1::text[])',[[ws,ws2,foreign]]).catch(()=>{});
    await pool.query('DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE company_id=ANY($1::text[]))',[[co,other]]).catch(()=>{});
    await pool.query('DELETE FROM memberships WHERE organization_id=ANY($1::text[])',[[ws,ws2,foreign]]).catch(()=>{});
    await pool.query('DELETE FROM users WHERE company_id=ANY($1::text[])',[[co,other]]).catch(()=>{});
    await pool.query('DELETE FROM organizations WHERE id=ANY($1::text[])',[[ws,ws2,foreign]]).catch(()=>{});
    await pool.query('DELETE FROM companies WHERE id=ANY($1::text[])',[[co,other]]).catch(()=>{});
    await new Promise<void>(r=>server.close(()=>r()));await pool.end();
    // ponytail: isolated test DB only; remove only records created by this probe.
  }
});
