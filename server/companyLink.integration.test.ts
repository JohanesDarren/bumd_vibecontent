import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
const { default: app } = await import('./index.ts');
const { pool, runMigrations, clearAllData, hashPassword } = await import('./database.ts');
const server = app.listen(0);
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
async function api(method:string,path:string,body?:unknown,cookie?:string) {
  const response=await fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',Origin:'http://localhost:5173',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
test.before(async()=>{await runMigrations();await clearAllData();await pool.query('DELETE FROM companies');});
test.after(async()=>{await clearAllData();await pool.query('DELETE FROM companies');server.close();await pool.end();});

// The corporate screen used to filter creators by users.company_id alone. A
// creator whose company link only existed via memberships -> organizations was
// therefore invisible: the admin panel (which counts all users) said "2 users"
// while the corporate screen showed none. These tests pin the fix from both
// directions: legacy NULL rows must still be listed, and new writes must keep
// both links in sync.
test('creator linked only through memberships still appears to corporate',async()=>{
  const pass=`longpass-${randomUUID()}`;
  const rootEmail=`root-${randomUUID()}@test.dev`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Root',$2,$3,'superadmin')",[`usr-${randomUUID()}`,rootEmail,await hashPassword(pass)]);
  const root=await api('POST','/api/auth/login',{email:rootEmail,password:pass});
  assert.equal(root.status,200);

  const co=await api('POST','/api/admin/companies',{name:'KoLab'},root.cookie);
  assert.equal(co.status,201);
  const corpEmail=`corp-${randomUUID()}@test.dev`;
  const corp=await api('POST','/api/admin/users',{name:'Salman',email:corpEmail,password:pass,role:'corporate',companyId:co.data.id},root.cookie);
  assert.equal(corp.status,201);
  const manager=await api('POST','/api/auth/login',{email:corpEmail,password:pass});
  assert.equal(manager.data.companyId,co.data.id);

  const wsA=await api('POST','/api/admin/workspaces',{companyId:co.data.id,name:'Kroombox',code:`K${randomUUID().slice(0,8)}`,sector:'Media',city:'Bandung'},root.cookie);
  const wsB=await api('POST','/api/admin/workspaces',{companyId:co.data.id,name:'UniInside',code:`U${randomUUID().slice(0,8)}`,sector:'Media',city:'Bandung'},root.cookie);
  assert.equal(wsA.status,201);assert.equal(wsB.status,201);

  // Two creators created through the corporate screen, then simulate the legacy
  // state: membership rows exist but users.company_id was never stamped.
  const c1=await api('POST','/api/corporate/users',{name:'Afdik',email:`afdik-${randomUUID()}@test.dev`,password:pass},manager.cookie);
  const c2=await api('POST','/api/corporate/users',{name:'Dey',email:`dey-${randomUUID()}@test.dev`,password:pass},manager.cookie);
  assert.equal(c1.status,201);assert.equal(c2.status,201);
  assert.equal((await api('PUT',`/api/corporate/users/${c1.data.id}/workspaces`,{workspaceIds:[wsA.data.id]},manager.cookie)).status,200);
  assert.equal((await api('PUT',`/api/corporate/users/${c2.data.id}/workspaces`,{workspaceIds:[wsB.data.id]},manager.cookie)).status,200);

  // Force the historical bad state directly, bypassing the API's repair path.
  await pool.query('UPDATE users SET company_id=NULL WHERE id=ANY($1::text[])',[[c1.data.id,c2.data.id]]);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM users WHERE id=ANY($1::text[]) AND company_id IS NULL',[[c1.data.id,c2.data.id]])).rows[0].n,2);

  const listed=await api('GET','/api/corporate/users',undefined,manager.cookie);
  assert.equal(listed.status,200);
  const ids=new Set(listed.data.map((u:{id:string})=>u.id));
  assert.ok(ids.has(c1.data.id),'creator linked only via memberships must still be listed');
  assert.ok(ids.has(c2.data.id),'creator linked only via memberships must still be listed');
  assert.deepEqual(new Set(listed.data.find((u:{id:string})=>u.id===c1.data.id).workspaceIds),new Set([wsA.data.id]));

  // A superadmin editing the creator's profile must not silently null the link.
  const edited=await api('PUT',`/api/admin/users/${c1.data.id}`,{name:'Afdik Renamed',email:listed.data.find((u:{id:string})=>u.id===c1.data.id).email,role:'creator'},root.cookie);
  assert.equal(edited.status,200);
  const stillListed=await api('GET','/api/corporate/users',undefined,manager.cookie);
  assert.ok(new Set(stillListed.data.map((u:{id:string})=>u.id)).has(c1.data.id),'admin profile edit must not drop the creator from the company');

  // And a fresh assignment must stamp company_id going forward.
  const c3=await api('POST','/api/corporate/users',{name:'New',email:`new-${randomUUID()}@test.dev`,password:pass},manager.cookie);
  await api('PUT',`/api/corporate/users/${c3.data.id}/workspaces`,{workspaceIds:[wsA.data.id]},manager.cookie);
  assert.equal((await pool.query('SELECT company_id FROM users WHERE id=$1',[c3.data.id])).rows[0].company_id,co.data.id);
});
