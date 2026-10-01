import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import nodeCrypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const defaultDatabaseUrl = process.env.NODE_ENV === 'test'
  ? 'postgresql://vibecontent:vibecontent_dev@127.0.0.1:5435/vibecontent_test'
  : 'postgresql://vibecontent:vibecontent_dev@127.0.0.1:5435/vibecontent';
const connectionString = process.env.DATABASE_URL || defaultDatabaseUrl;
if (process.env.NODE_ENV === 'test' && !new URL(connectionString).pathname.endsWith('_test')) {
  throw new Error('Refusing to run tests against a non-test database');
}
export const pool = new Pool({ connectionString });
const here = dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const sql = await readFile(join(here, 'migrations', '001_initial.sql'), 'utf8');
  await pool.query(sql);
  await pool.query(`INSERT INTO schema_migrations(name) VALUES ('001_initial') ON CONFLICT DO NOTHING`);
  const auth = await readFile(join(here, 'migrations', '002_auth.sql'), 'utf8');
  await pool.query(auth);
}

const scrypt = promisify(nodeCrypto.scrypt);
export async function hashPassword(password:string):Promise<string> {
  const salt = nodeCrypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64) as Buffer).toString('hex');
  return `${salt}:${hash}`;
}
export async function verifyPassword(password:string, stored:string):Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = (await scrypt(password, salt, 64) as Buffer);
  return nodeCrypto.timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
}

export async function organizationExists(id:string){const result=await pool.query('SELECT 1 FROM organizations WHERE id=$1',[id]);return (result.rowCount||0)>0;}

export async function clearAllData() {
  await pool.query('TRUNCATE audit_events, review_comments, draft_citations, draft_versions, content_drafts, content_briefs, knowledge_chunks, knowledge_sources, brand_profiles, memberships, users, organizations RESTART IDENTITY CASCADE');
}

export async function createOrganizationWithAdmin(input:{organizationName:string;code:string;sector:string;city:string;adminName:string;adminEmail:string;adminPassword?:string}) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const workspaceId=`org-${nodeCrypto.randomUUID()}`;
    const userId=`usr-${crypto.randomUUID()}`;
    const passwordHash=input.adminPassword?await hashPassword(input.adminPassword):'';
    const workspace={id:workspaceId,name:input.organizationName,code:input.code.toUpperCase(),sector:input.sector,city:input.city,tagline:'',primaryColor:'#0284c7',accentColor:'#0ea5e9',description:''};
    const user={id:userId,name:input.adminName,email:input.adminEmail,avatar:'',title:'Administrator',department:'',workspaceId,role:'admin'};
    await client.query('INSERT INTO organizations(id,name,code,sector,city,tagline,primary_color,accent_color,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',Object.values(workspace));
    await client.query('INSERT INTO users(id,name,email,avatar,title,department,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.id,user.name,user.email,user.avatar,user.title,user.department,passwordHash]);
    await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'admin')`,[workspaceId,userId]);
    await client.query('COMMIT');
    return {workspace,user};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export async function createDraft(input: { workspaceId:string; title:string; format:string; creatorId:string; content:string; sourceIds?:string[] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const member = await client.query('SELECT u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2 AND m.active',[input.workspaceId,input.creatorId]);
    if (!member.rowCount) throw new Error('Creator is not a member of this workspace');
    const id = `dft-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    await client.query(`INSERT INTO content_drafts(id,organization_id,title,format,status,current_version,created_by,creator_name) VALUES($1,$2,$3,$4,'draft',1,$5,$6)`,[id,input.workspaceId,input.title,input.format,input.creatorId,member.rows[0].name]);
    await client.query(`INSERT INTO draft_versions(draft_id,version_number,content,created_by,change_summary) VALUES($1,1,$2,$3,'Initial version')`,[id,input.content,member.rows[0].name]);
    for (const sourceId of input.sourceIds || []) {
      const source = await client.query(`SELECT id,title FROM knowledge_sources WHERE id=$1 AND organization_id=$2 AND status='aktif'`,[sourceId,input.workspaceId]);
      if (!source.rowCount) continue;
      await client.query(`INSERT INTO draft_citations(id,draft_id,version_number,source_id,data) VALUES($1,$2,1,$3,$4::jsonb)`,[`cit-${id}-${sourceId}`,id,sourceId,JSON.stringify({documentId:sourceId,documentTitle:source.rows[0].title,section:'Sumber aktif',excerpt:'Rujukan tersimpan',relevanceScore:100,verified:true,claimExcerpt:''})]);
    }      await client.query(`INSERT INTO audit_events(organization_id,actor_id,actor_name,actor_role,action,object_type,object_id,object_name,details) VALUES($1,$2,$3,'creator','New Draft Created','draft',$4,$5,'Saved to PostgreSQL')`,[input.workspaceId,input.creatorId,member.rows[0].name,id,input.title]);
    await client.query('COMMIT');
    return { id };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function listWorkspaceDrafts(workspaceId:string) {
  const result = await pool.query(`SELECT d.*, COALESCE(jsonb_agg(DISTINCT jsonb_build_object('versionNumber',v.version_number,'content',v.content,'scenes',v.scenes,'citations',COALESCE((SELECT jsonb_agg(c.data) FROM draft_citations c WHERE c.draft_id=v.draft_id AND c.version_number=v.version_number),'[]'::jsonb),'unsupportedClaims',v.unsupported_claims,'qualityCheck',v.quality_check,'createdAt',v.created_at,'createdBy',v.created_by,'changeSummary',v.change_summary)) FILTER (WHERE v.draft_id IS NOT NULL),'[]') versions, COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'authorName',r.author_name,'authorRole',r.author_role,'text',r.text,'targetSnippet',r.target_snippet,'createdAt',r.created_at,'resolved',r.resolved) ORDER BY r.created_at) FROM review_comments r WHERE r.draft_id=d.id),'[]') comments FROM content_drafts d LEFT JOIN draft_versions v ON v.draft_id=d.id WHERE d.organization_id=$1 GROUP BY d.id ORDER BY d.updated_at DESC`,[workspaceId]);
  return result.rows.map(row => ({ id:row.id, workspaceId:row.organization_id, briefId:row.brief_id || '', title:row.title, format:row.format, status:row.status, currentVersionon:row.current_version, versions:row.versions.sort((a:any,b:any)=>b.versionNumber-a.versionNumber), comments:row.comments, approvalInfo:row.approval_info, visualAsset:row.visual_asset, createdAt:row.created_at, updatedAt:row.updated_at, createdBy:row.created_by, creatorName:row.creator_name }));
}

export async function listBootstrap(workspaceId?:string) {
  const workspacesResult=await pool.query('SELECT id,name,code,sector,city,tagline,primary_color AS "primaryColor",accent_color AS "accentColor",description FROM organizations ORDER BY created_at');
  const targetWorkspaceId=workspaceId || workspacesResult.rows[0]?.id;
  if(!targetWorkspaceId) return {workspaces:[],users:[],documents:[],drafts:[],auditLogs:[],brandProfile:null};
  const [users,documents,drafts,auditLogs,brand] = await Promise.all([
    pool.query('SELECT u.id,u.name,u.email,u.avatar,u.title,u.department,m.organization_id AS "workspaceId",m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=$1 AND m.active',[targetWorkspaceId]),
    pool.query(`SELECT s.id,s.organization_id AS "workspaceId",s.title,s.category,s.owner,s.version,s.effective_date AS "effectiveDate",s.status,s.upload_date AS "uploadDate",s.file_size AS "fileSize",s.summary,COALESCE(jsonb_agg(jsonb_build_object('id',c.id,'documentId',c.source_id,'section',c.section,'page',c.page,'content',c.content,'keywords',c.keywords)) FILTER (WHERE c.id IS NOT NULL),'[]') chunks FROM knowledge_sources s LEFT JOIN knowledge_chunks c ON c.source_id=s.id WHERE s.organization_id=$1 GROUP BY s.id`,[targetWorkspaceId]),
    listWorkspaceDrafts(targetWorkspaceId),
    pool.query('SELECT id::text,organization_id AS "workspaceId",created_at AS timestamp,actor_name AS "actorName",actor_role AS "actorRole",action,object_type AS "objectType",object_id AS "objectId",object_name AS "objectName",details FROM audit_events WHERE organization_id=$1 ORDER BY created_at DESC',[targetWorkspaceId]),
    pool.query('SELECT data FROM brand_profiles WHERE organization_id=$1',[targetWorkspaceId])
  ]);
  return { workspaces:workspacesResult.rows, users:users.rows, documents:documents.rows, drafts, auditLogs:auditLogs.rows, brandProfile:brand.rows[0]?.data ?? null };
}

export async function replaceDraft(draft:any) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const member=await client.query('SELECT u.name,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2 AND m.active',[draft.workspaceId,draft.createdBy]);
    if(!member.rowCount) throw new Error('Creator is not a member of this workspace');
    await client.query(`INSERT INTO content_drafts(id,organization_id,brief_id,title,format,status,current_version,created_by,creator_name,visual_asset,approval_info,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,current_version=EXCLUDED.current_version,visual_asset=EXCLUDED.visual_asset,approval_info=EXCLUDED.approval_info,updated_at=EXCLUDED.updated_at`,[draft.id,draft.workspaceId,draft.briefId||null,draft.title,draft.format,draft.status,draft.currentVersionon,draft.createdBy,draft.creatorName,JSON.stringify(draft.visualAsset||null),JSON.stringify(draft.approvalInfo||null),draft.createdAt,draft.updatedAt]);
    await client.query('DELETE FROM draft_versions WHERE draft_id=$1',[draft.id]);
    for(const version of draft.versions){
      await client.query('INSERT INTO draft_versions(draft_id,version_number,content,scenes,unsupported_claims,quality_check,created_at,created_by,change_summary) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8,$9)',[draft.id,version.versionNumber,version.content,JSON.stringify(version.scenes||null),JSON.stringify(version.unsupportedClaims||[]),JSON.stringify(version.qualityCheck||{}),version.createdAt,version.createdBy,version.changeSummary||'']);
      for(const citation of version.citations||[]) await client.query('INSERT INTO draft_citations(id,draft_id,version_number,source_id,data) VALUES($1,$2,$3,$4,$5::jsonb)',[`${draft.id}-${version.versionNumber}-${citation.id}`,draft.id,version.versionNumber,citation.documentId,JSON.stringify(citation)]);
    }
    await client.query('DELETE FROM review_comments WHERE draft_id=$1',[draft.id]);
    for(const comment of draft.comments||[]) await client.query('INSERT INTO review_comments(id,draft_id,author_id,author_name,author_role,text,target_snippet,resolved,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[comment.id,draft.id,draft.createdBy,comment.authorName,comment.authorRole,comment.text,comment.targetSnippet||null,comment.resolved,comment.createdAt]);
    await client.query(`INSERT INTO audit_events(organization_id,actor_id,actor_name,actor_role,action,object_type,object_id,object_name,details) VALUES($1,$2,$3,$4,'Draft saved','draft',$5,$6,'Persisted by API')`,[draft.workspaceId,draft.createdBy,member.rows[0].name,member.rows[0].role,draft.id,draft.title]);
    await client.query('COMMIT');
    return (await listWorkspaceDrafts(draft.workspaceId)).find(item=>item.id===draft.id);
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export async function saveBrand(profile:any){await pool.query('INSERT INTO brand_profiles(organization_id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(organization_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()',[profile.workspaceId,JSON.stringify(profile)]);return profile;}

export async function saveKnowledgeSource(source:any){
  const client=await pool.connect();try{await client.query('BEGIN');await client.query(`INSERT INTO knowledge_sources(id,organization_id,title,category,owner,version,effective_date,status,upload_date,file_size,summary) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,owner=EXCLUDED.owner,version=EXCLUDED.version,effective_date=EXCLUDED.effective_date,status=EXCLUDED.status,file_size=EXCLUDED.file_size,summary=EXCLUDED.summary`,[source.id,source.workspaceId,source.title,source.category,source.owner,source.version,source.effectiveDate,source.status,source.uploadDate,source.fileSize,source.summary]);await client.query('DELETE FROM knowledge_chunks WHERE source_id=$1',[source.id]);for(const chunk of source.chunks||[]) await client.query('INSERT INTO knowledge_chunks(id,source_id,section,page,content,keywords) VALUES($1,$2,$3,$4,$5,$6)',[chunk.id,source.id,chunk.section,chunk.page||null,chunk.content,chunk.keywords||[]]);await client.query('COMMIT');return source;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function updateOrganization(id:string,input:any){const result=await pool.query('UPDATE organizations SET name=$2,code=$3,sector=$4,city=$5,tagline=$6,primary_color=$7,accent_color=$8,description=$9 WHERE id=$1 RETURNING id,name,code,sector,city,tagline,primary_color AS "primaryColor",accent_color AS "accentColor",description',[id,input.name,input.code.toUpperCase(),input.sector,input.city,input.tagline||'',input.primaryColor||'#0284c7',input.accentColor||'#0ea5e9',input.description||'']);if(!result.rowCount)throw new Error('Organization not found');return result.rows[0];}

export async function createUserMembership(workspaceId:string,input:any){const client=await pool.connect();try{await client.query('BEGIN');
  // Re-use an existing account (e.g. registered via /api/auth/register but not yet a member) or create a fresh one.
  const existing=await client.query('SELECT id FROM users WHERE email=$1',[String(input.email||'').toLowerCase().trim()]);
  let userId:string; let tempPassword:string|undefined;
  if(existing.rowCount){ userId=existing.rows[0].id; }
  else {
    // password_hash is NOT NULL (migration 002): use the admin-supplied password or generate a temporary one.
    const adminPassword = typeof input.password === 'string' && input.password.length >= 8 ? input.password : undefined;
    tempPassword = adminPassword ?? nodeCrypto.randomBytes(4).toString('hex');
    const passwordHash = await hashPassword(tempPassword);
    const id=`usr-${nodeCrypto.randomUUID()}`;
    await client.query('INSERT INTO users(id,name,email,avatar,title,department,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,input.name,String(input.email||'').toLowerCase().trim(),input.avatar||'',input.title||'',input.department||'',passwordHash]);
    userId=id;
  }
  await client.query('INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT (organization_id,user_id) DO UPDATE SET role=EXCLUDED.role, active=true',[workspaceId,userId,input.role]);
  await client.query('COMMIT');
  // Only surface auto-generated passwords; never echo one the admin chose.
  return{id:userId,workspaceId,...input,avatar:input.avatar||'',tempPassword: adminPassword ? undefined : tempPassword};
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}

export async function deleteUserMembership(workspaceId:string,userId:string){const client=await pool.connect();try{await client.query('BEGIN');await client.query('DELETE FROM memberships WHERE organization_id=$1 AND user_id=$2',[workspaceId,userId]);await client.query('DELETE FROM users u WHERE u.id=$1 AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id)',[userId]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
export async function deleteKnowledgeSource(workspaceId:string,id:string){await pool.query('DELETE FROM knowledge_sources WHERE organization_id=$1 AND id=$2',[workspaceId,id]);}
export async function deleteBrand(workspaceId:string){await pool.query('DELETE FROM brand_profiles WHERE organization_id=$1',[workspaceId]);}
export async function deleteDraft(workspaceId:string,id:string){await pool.query('DELETE FROM content_drafts WHERE organization_id=$1 AND id=$2',[workspaceId,id]);}

export async function registerUser(input:{name:string;email:string;password:string;workspaceCode?:string}) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const existing=await client.query('SELECT id FROM users WHERE email=$1',[input.email.toLowerCase()]);
    if(existing.rowCount) throw new Error('An account with this email already exists');
    let orgId:string|null=null;
    if(input.workspaceCode) {
      const org=await client.query('SELECT id FROM organizations WHERE code=$1',[input.workspaceCode.toUpperCase()]);
      if(!org.rowCount) throw new Error('Workspace code not found');
      orgId=org.rows[0].id;
    }
    const id=`usr-${nodeCrypto.randomUUID()}`;
    const passwordHash=await hashPassword(input.password);
    await client.query('INSERT INTO users(id,name,email,avatar,title,department,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,input.name,input.email.toLowerCase(),'', '', '',passwordHash]);
    if(orgId) await client.query('INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,$3)',[orgId,id,input.workspaceCode && input.workspaceCode.toUpperCase()==='ADMIN'?'admin':'creator']);
    await client.query('COMMIT');
    return {id,name:input.name,email:input.email.toLowerCase(),hasWorkspace:Boolean(orgId)};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export async function authenticateUser(email:string,password:string) {
  const result=await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=$1',[email.toLowerCase()]);
  const user=result.rows[0];
  if(!user) throw new Error('Invalid email or password');
  if(!user.password_hash) throw new Error('LEGACY_CLAIM');
  const ok=await verifyPassword(password,user.password_hash);
  if(!ok) throw new Error('Invalid email or password');
  const orgs=await pool.query('SELECT o.id,o.name,o.code,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.active ORDER BY o.created_at',[user.id]);
  return {id:user.id,name:user.name,email:user.email,workspaces:orgs.rows};
}

export async function claimLegacyPassword(email:string,password:string) {
  const result=await pool.query('SELECT id,password_hash FROM users WHERE email=$1',[email.toLowerCase()]);
  const user=result.rows[0];
  if(!user) throw new Error('Invalid email or password');
  if(user.password_hash) throw new Error('Account already has a password. Please sign in.');
  const passwordHash=await hashPassword(password);
  await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1',[user.id,passwordHash]);
  const orgs=await pool.query('SELECT o.id,o.name,o.code,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.active ORDER BY o.created_at',[user.id]);
  return {id:user.id,name:user.name,email:email.toLowerCase(),workspaces:orgs.rows};
}

export async function getUserWorkspaces(userId:string) {
  const orgs=await pool.query('SELECT o.id,o.name,o.code,o.sector,o.city,o.tagline,o.primary_color AS "primaryColor",o.accent_color AS "accentColor",o.description,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.active ORDER BY o.created_at',[userId]);
  return orgs.rows;
}