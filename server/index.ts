import './env.ts';
import { describeStyle, generateVisual, VisualError } from './visual.ts';
import { chooseVisualReference } from './visualReferenceSelection.ts';
import { env, ragConfigured } from './env.ts';
import { knowledgeBaseIdFor, RagNotConfiguredError, ragDeleteDocument, ragIndexDocument, ragListDocuments, ragCompose, ragPlan, ragQuery, ragRefine, ragSearch, ragStatus } from './rag.ts';
import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { 
  createDraft, createUserMembership, deleteBrand, deleteDraft, deleteKnowledgeSource, getKnowledgeAssignments,
  addScheduleComment, deleteSchedule, deleteUserMembership, getWorkspaceSettings,
  listBootstrap, listSchedules, listWorkspaceDrafts, organizationExists, pool, 
  replaceDraft, runMigrations, saveBrand, saveKnowledgeSource, saveSchedule, 
  saveWorkspaceSettings, updateOrganization, ScheduleRuleError, getSchedulePostLink, 
  setScheduleCustomImage, setSchedulePostImage
} from './database.ts';
import { authenticate, login, logout, permitted, provisionSuperadmin, requireMember, requireWorkspace } from './security.ts';
import { randomUUID } from 'node:crypto';
import { assignCompanyUser, createCompanyUser, listCompanyUsers } from './companyUsers.ts';
import { publish, subscribe, unsubscribe, subscriberCount, resolveScope } from './events.ts';
import { PostImageError, fetchPostImage, validateImageDataUrl } from './postImage.ts';
import { buildPlanPrompt, cleanPlanRequest, parsePlanSlots } from './plan.ts';
import { markSourcesIndexed } from './ragSources.ts';
import { extractDocumentText } from './documentText.ts';
import { describeImage, visionConfig } from './vision.ts';
import Busboy from 'busboy';
import { kmsConfig, uploadKnowledgeFile, deleteKnowledgeFile, queryKnowledge, validateKnowledgeUpload, kmsServiceStatus } from './kms.ts';

const app = express();
const allowedOrigins=(process.env.API_ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',').map(origin=>origin.trim()).filter(Boolean);
if(process.env.NODE_ENV === 'production' && !allowedOrigins.length) throw new Error('API_ALLOWED_ORIGIN is required in production');
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true, exposedHeaders: ['X-Session-Idle-Seconds'] }));
app.use(express.json({ limit: '8mb' }));
const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
app.use(express.static(distDir,{setHeaders:(res,filePath)=>{if(filePath.endsWith('index.html'))res.setHeader('Cache-Control','no-store, must-revalidate');}}));
app.get(/.*/, (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(resolve(distDir, 'index.html')));
// ponytail: same-site cookie requires an Origin check on writes; configure API_ALLOWED_ORIGIN for deployments.
app.use('/api',(req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const origin=req.headers.origin;if(origin&&!allowedOrigins.includes(origin))return res.status(403).json({error:'Origin denied'});next();});

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const contentOnly=(req:express.Request<any>,res:express.Response,next:express.NextFunction)=>res.locals.user.role==='corporate'?res.status(403).json({error:'Corporate accounts cannot create or edit content'}):next();
// Corporate owns the company corpus; assignments determine which workspace RAG can retrieve it from.
const knowledgeManager=(req:express.Request<any>,res:express.Response,next:express.NextFunction)=>['corporate','superadmin'].includes(res.locals.user.role)?next():res.status(403).json({error:'Corporate account required to manage the knowledge base'});
const workspaceScopeFor=(workspaceId:string)=>workspaceId;



app.post('/api/visual/generate', authenticate, contentOnly, requireWorkspace(req=>req.body?.workspaceId), async (req, res) => {
  try {
    const {workspaceId,prompt,referenceId}=req.body||{};
    if(typeof workspaceId!=='string'||typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||referenceId!==undefined&&(typeof referenceId!=='string'||!/^[A-Za-z0-9_-]{1,190}$/.test(referenceId)))return res.status(400).json({error:'Invalid visual input'});
    const media=await pool.query(`SELECT k.id,k.title,k.vision_description AS "visionDescription" FROM kms_documents k JOIN kms_document_workspaces a ON a.document_id=k.id WHERE a.workspace_id=$1 AND k.media_type IN ('photo','video') ORDER BY k.created_at DESC LIMIT 100`,[workspaceId]);
    const selected=chooseVisualReference(prompt,media.rows,referenceId);
    const frame=selected?await pool.query(`SELECT k.style_frame FROM kms_documents k JOIN kms_document_workspaces a ON a.document_id=k.id WHERE a.workspace_id=$1 AND k.id=$2 AND k.media_type IN ('photo','video')`,[workspaceId,selected.id]):null;
    if(selected&&!frame?.rows[0]?.style_frame)return res.status(404).json({error:'Frame referensi tidak ditemukan'});
    // Prefer the stored vision reading of the chosen reference: it describes the
    // actual picture (content, colours, layout), not just generic aesthetics.
    const storedVision=selected?(media.rows.find((row:any)=>row.id===selected.id)?.visionDescription||''):'';
    const style=storedVision?`${storedVision}`:selected?await describeStyle(frame!.rows[0].style_frame):undefined;
    res.json({...await generateVisual(req.body,style),referenceId:selected?.id,referenceTitle:selected?.title});
  }catch(error){
    if(error instanceof Error&&/not authorized/.test(error.message))return res.status(404).json({error:'Referensi visual tidak ditemukan'});
    const e=error as VisualError;res.status(e.status||500).json({error:e.status?e.message:'Visual generation failed',code:e.code||'VISUAL_ERROR'});
  }
});
app.get('/api/visual/references',authenticate,contentOnly,requireWorkspace(req=>req.query.workspaceId),async(req,res,next)=>{try{
  const rows=await pool.query(`SELECT k.id,k.title,k.media_type AS "mediaType",k.vision_description AS "visionDescription" FROM kms_documents k JOIN kms_document_workspaces a ON a.document_id=k.id WHERE a.workspace_id=$1 AND k.media_type IN ('photo','video') ORDER BY k.created_at DESC LIMIT 100`,[req.query.workspaceId]);
  res.json(rows.rows);
}catch(error){next(error);}});

// ── RAG service integration (best-effort: the app must keep working when the service is down) ──
const knowledgeText = (doc: any): string => {
  const chunks = (doc.chunks || [])
    .map((chunk: any) => `${chunk.section || ''}\n${chunk.content || ''}`.trim())
    .filter(Boolean);
  return chunks.length ? chunks.join('\n\n') : (doc.summary || doc.title || '');
};

async function syncKnowledgeDocToRag(scopeId: string, doc: any): Promise<boolean> {
  try {
    if (doc.status === 'aktif') {
      await ragIndexDocument({
        scopeId,
        documentId: doc.id,
        documentName: doc.title,
        text: knowledgeText(doc),
        language: 'id',
        metadata: { category: doc.category, owner: doc.owner, version: doc.version, effectiveDate: doc.effectiveDate }
      });
    } else {
      // Inactive/pending documents must not be retrievable (anti-hallucination principle).
      await ragDeleteDocument(scopeId, doc.id);
    }
    return true;
  } catch (error) {
    console.warn('[rag] sync failed for', doc.id, error instanceof Error ? error.message : error);
    return false;
  }
}

async function removeKnowledgeDocFromRag(scopeId: string, documentId: string): Promise<boolean> {
  try {
    await ragDeleteDocument(scopeId, documentId);
    return true;
  } catch (error) {
    console.warn('[rag] delete failed for', documentId, error instanceof Error ? error.message : error);
    return false;
  }
}

app.get('/api/health', async (_req,res,next) => { try {
  const result=await pool.query("SELECT current_database() database, now() time, to_regclass('public.users') IS NOT NULL AS schema_ready");
  const admin=result.rows[0].schema_ready ? await pool.query("SELECT EXISTS(SELECT 1 FROM users WHERE global_role='superadmin') AS provisioned") : {rows:[{provisioned:false}]};
  const ready=result.rows[0].schema_ready && admin.rows[0].provisioned;
  res.status(ready?200:503).json({ok:ready,...result.rows[0],superadmin_provisioned:admin.rows[0].provisioned,liveListeners:subscriberCount()});
} catch(error){next(error);} });
const isEmail=(v:unknown):v is string=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
app.post('/api/auth/login',async(req,res,next)=>{try{const {email,password}=req.body||{};if(!isEmail(email)||typeof password!=='string')return res.status(400).json({error:'Valid email and password are required'});res.json(await login(email,password,req,res));}catch(error){if(error instanceof Error&&/Invalid email or password|LEGACY_CLAIM/.test(error.message))return res.status(401).json({error:'Invalid email or password'});next(error);}});
app.get('/api/auth/me',authenticate,(req,res)=>res.json(res.locals.user));
app.put('/api/auth/password',authenticate,async(req,res,next)=>{try{
  const {currentPassword,newPassword}=req.body||{};
  if(typeof currentPassword!=='string'||typeof newPassword!=='string'||newPassword.length<8)return res.status(400).json({error:'Current password and new password (at least 8 characters) required'});
  const {verifyPassword,hashPassword}=await import('./database.ts');
  const user=(await pool.query('SELECT password_hash FROM users WHERE id=$1',[res.locals.user.id])).rows[0];
  if(!user||!await verifyPassword(currentPassword,user.password_hash))return res.status(403).json({error:'Current password is incorrect'});
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await hashPassword(newPassword),res.locals.user.id]);
  res.json({ok:true});
}catch(e){next(e);}});
app.post('/api/auth/logout',async(req,res,next)=>{try{await logout(req,res);res.json({ok:true});}catch(error){next(error);}});
app.use('/api',authenticate);

// ---------------------------------------------------------------------------
// Live cross-role propagation.
// All roles read one PostgreSQL root, but each screen loads data once on mount,
// so a write on the admin side stays invisible to an already-open corporate or
// creator screen. After every successful mutation we fan a payload-free "change"
// nudge out over SSE; receivers re-read the same root. No tenant data travels.
// ---------------------------------------------------------------------------
app.get('/api/events',(req,res)=>{
  const user=res.locals.user;
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  const sub=subscribe({userId:user.id,role:user.role,companyId:user.companyId??null,workspaceIds:(user.workspaces||[]).map((w:any)=>w.id),write:chunk=>res.write(chunk)});
  res.write(`event: ready\ndata: ${JSON.stringify({userId:user.id,role:user.role,listeners:subscriberCount()})}\n\n`);
  const keepAlive=setInterval(()=>{try{res.write(': ping\n\n');}catch{/* socket gone; close handler cleans up */}},25000);
  const close=()=>{clearInterval(keepAlive);unsubscribe(sub);};
  req.on('close',close);req.on('error',close);res.on('error',close);
});
app.use('/api',(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const originalJson=res.json.bind(res);
  res.json=(body?:any)=>{
    if(res.statusCode>=200&&res.statusCode<300){
      const user=res.locals.user;
      if(user){
        // Scope the signal to the resource that actually changed, not to the
        // actor: a superadmin owns no company, so actor-scoping would notify
        // every tenant instead of the one that changed.
        const scope=resolveScope({params:req.params,body:req.body,result:body,actor:{role:user.role,companyId:user.companyId??null}});
        publish({kind:'change',at:new Date().toISOString(),actorId:user.id,actorRole:user.role,...scope,method:req.method,path:req.originalUrl.split('?')[0]});
      }
    }
    return originalJson(body);
  };
  next();
});
app.get('/api/users/:userId/workspaces',(req,res)=>req.params.userId===res.locals.user.id||res.locals.user.role==='superadmin'?res.json(res.locals.user.workspaces):res.status(403).json({error:'Access denied'}));
app.get('/api/bootstrap', async (req,res,next) => { try {const user=res.locals.user;const workspaceId=String(req.query.workspaceId||user.workspaces[0]?.id||'');if(!permitted(user,workspaceId))return res.status(403).json({error:'Workspace access denied'});const data=await listBootstrap(workspaceId);data.workspaces=data.workspaces.filter((w:any)=>permitted(user,w.id));if(user.role==='creator')data.documents=data.documents.filter((doc:any)=>doc.status==='aktif'&&doc.workspaceAssignments?.some((a:any)=>a.workspaceId===workspaceId&&a.enabled));res.json(data); } catch(error){next(error);} });
const globalOnly=(req:express.Request<any>,res:express.Response,next:express.NextFunction)=>res.locals.user.role==='superadmin'?next():res.status(403).json({error:'Superadmin required'});
const corporateOnly=(req:express.Request<any>,res:express.Response,next:express.NextFunction)=>['corporate','superadmin'].includes(res.locals.user.role)?next():res.status(403).json({error:'Corporate role required'});
app.get('/api/admin/overview',globalOnly,async(_req,res,next)=>{try{
  const [companies,workspaces,users,drafts,sources,audit]=await Promise.all([
    pool.query(`SELECT c.id,c.name,(SELECT count(*) FROM organizations o WHERE o.company_id=c.id)::int AS "workspaceCount",(SELECT count(*) FROM users u WHERE u.company_id=c.id OR EXISTS(SELECT 1 FROM memberships m JOIN organizations o2 ON o2.id=m.organization_id WHERE m.user_id=u.id AND o2.company_id=c.id))::int AS "userCount" FROM companies c ORDER BY c.name`),
    pool.query('SELECT count(*)::int AS count FROM organizations'),
    pool.query(`SELECT count(*)::int AS total,count(*) FILTER (WHERE global_role='creator')::int AS creators,count(*) FILTER (WHERE global_role='corporate')::int AS corporate,count(*) FILTER (WHERE global_role='superadmin')::int AS superadmins FROM users`),
    pool.query('SELECT count(*)::int AS count FROM content_drafts'),
    pool.query('SELECT count(*)::int AS count FROM knowledge_sources'),
    pool.query('SELECT count(*)::int AS count FROM audit_events')
  ]);
  res.json({companies:companies.rows,workspaces:workspaces.rows[0].count,users:users.rows[0],drafts:drafts.rows[0].count,knowledgeSources:sources.rows[0].count,auditEvents:audit.rows[0].count});
}catch(e){next(e);}});
app.get('/api/admin/companies',globalOnly,async(req,res,next)=>{try{res.json((await pool.query('SELECT id,name FROM companies ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/companies',globalOnly,async(req,res,next)=>{try{if(!isNonEmptyString(req.body?.name))return res.status(400).json({error:'name required'});res.status(201).json((await pool.query('INSERT INTO companies(id,name) VALUES($1,$2) RETURNING id,name',[`co-${randomUUID()}`,req.body.name])).rows[0]);}catch(e){next(e);}});
app.put('/api/admin/companies/:id',globalOnly,async(req,res,next)=>{try{if(!isNonEmptyString(req.body?.name))return res.status(400).json({error:'name required'});const result=await pool.query('UPDATE companies SET name=$1 WHERE id=$2 RETURNING id,name',[req.body.name.trim(),req.params.id]);if(!result.rowCount)return res.status(404).json({error:'Company not found'});res.json(result.rows[0]);}catch(e){next(e);}});
app.delete('/api/admin/companies/:id',globalOnly,async(req,res,next)=>{try{const result=await pool.query(`DELETE FROM companies c WHERE c.id=$1 AND NOT EXISTS(SELECT 1 FROM organizations WHERE company_id=c.id) AND NOT EXISTS(SELECT 1 FROM users WHERE company_id=c.id) RETURNING id`,[req.params.id]);if(result.rowCount)return res.json({ok:true});if(!(await pool.query('SELECT 1 FROM companies WHERE id=$1',[req.params.id])).rowCount)return res.status(404).json({error:'Company not found'});res.status(409).json({error:'Remove company workspaces and corporate accounts first'});}catch(e){next(e);}});
app.get('/api/admin/users',globalOnly,async(req,res,next)=>{try{res.json((await pool.query(`SELECT u.id,u.name,u.email,u.global_role AS role,u.company_id AS "companyId",COALESCE((SELECT array_agg(m.organization_id ORDER BY m.organization_id) FROM memberships m WHERE m.user_id=u.id AND m.active),'{}') AS "workspaceIds" FROM users u ORDER BY u.name`)).rows);}catch(e){next(e);}});
app.post('/api/admin/users',globalOnly,async(req,res,next)=>{try{const {name,email,password,role,companyId,workspaceIds}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||typeof password!=='string'||password.length<8||!['creator','corporate','superadmin'].includes(role))return res.status(400).json({error:'name, email, password (min 8 characters) and creator, corporate or superadmin role required'});if(role!=='superadmin'&&!isNonEmptyString(companyId))return res.status(400).json({error:'creator and corporate accounts require a companyId'});if(role==='creator'){if(!Array.isArray(workspaceIds)||!workspaceIds.length||!workspaceIds.every(isNonEmptyString))return res.status(400).json({error:'creator accounts require at least one workspaceId'});const created=await createCompanyUser(companyId,{name,email,password,workspaceIds});if(!created)return res.status(403).json({error:'Workspace outside company'});return res.status(201).json({...created,role:'creator',companyId});}const {hashPassword}=await import('./database.ts');res.status(201).json((await pool.query('INSERT INTO users(id,name,email,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,global_role AS role,company_id AS "companyId"',[`usr-${randomUUID()}`,name,email.toLowerCase(),await hashPassword(password),role,role==='corporate'?companyId:null])).rows[0]);}catch(e){next(e);}});
app.put('/api/admin/users/:id',globalOnly,async(req,res,next)=>{try{const {name,email,role,companyId,password}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||!['creator','corporate','superadmin'].includes(role)||role==='corporate'&&!isNonEmptyString(companyId)||password!==undefined&&(typeof password!=='string'||password.length<8))return res.status(400).json({error:'Valid name, email, role, corporate company and optional password required'});const current=(await pool.query('SELECT global_role FROM users WHERE id=$1',[req.params.id])).rows[0];if(!current)return res.status(404).json({error:'User not found'});if(req.params.id===res.locals.user.id&&role!=='superadmin')return res.status(409).json({error:'Cannot demote your own account'});if(current.global_role==='superadmin'&&role!=='superadmin'&&(await pool.query("SELECT count(*)::int AS count FROM users WHERE global_role='superadmin'")).rows[0].count<=1)return res.status(409).json({error:'At least one superadmin required'});if((current.global_role==='creator')!==(role==='creator'))return res.status(409).json({error:'Creator role cannot be changed; manage workspace assignments separately'});const {hashPassword}=await import('./database.ts');const result=await pool.query(`UPDATE users SET name=$1,email=$2,global_role=$3,company_id=CASE WHEN $3='superadmin' THEN NULL WHEN $3='corporate' THEN $4 ELSE company_id END,password_hash=coalesce($5,password_hash) WHERE id=$6 RETURNING id,name,email,global_role AS role,company_id AS "companyId"`,[name.trim(),email.trim().toLowerCase(),role,role==='corporate'?companyId:null,password===undefined?null:await hashPassword(password),req.params.id]);res.json(result.rows[0]);}catch(e){next(e);}});
app.delete('/api/admin/users/:id',globalOnly,async(req,res,next)=>{try{if(req.params.id===res.locals.user.id)return res.status(409).json({error:'Cannot delete your own account'});const result=await pool.query(`DELETE FROM users WHERE id=$1 AND (global_role<>'superadmin' OR (SELECT count(*) FROM users WHERE global_role='superadmin')>1) RETURNING id`,[req.params.id]);if(result.rowCount)return res.json({ok:true});if(!(await pool.query('SELECT 1 FROM users WHERE id=$1',[req.params.id])).rowCount)return res.status(404).json({error:'User not found'});res.status(409).json({error:'At least one superadmin required'});}catch(e){if((e as {code?:string}).code==='23503')return res.status(409).json({error:'User has authored content and cannot be deleted'});next(e);}});
app.get('/api/admin/memberships',globalOnly,async(req,res,next)=>{try{res.json((await pool.query(`SELECT m.organization_id AS "workspaceId",m.user_id AS "userId",m.role,m.active,u.name AS "userName",o.name AS "workspaceName",o.company_id AS "companyId" FROM memberships m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id ORDER BY o.name,u.name`)).rows);}catch(e){next(e);}});
app.post('/api/admin/memberships',globalOnly,async(req,res,next)=>{try{const {workspaceId,userId}=req.body||{};if(!isNonEmptyString(workspaceId)||!isNonEmptyString(userId))return res.status(400).json({error:'workspaceId and userId required'});const user=await pool.query('SELECT global_role FROM users WHERE id=$1',[userId]);const workspace=await pool.query('SELECT company_id FROM organizations WHERE id=$1',[workspaceId]);if(!user.rowCount||!workspace.rowCount)return res.status(404).json({error:'User or workspace not found'});if(user.rows[0].global_role!=='creator')return res.status(409).json({error:'Only creators can be assigned'});const foreign=await pool.query('SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.company_id<>$2 LIMIT 1',[userId,workspace.rows[0].company_id]);if(foreign.rowCount)return res.status(409).json({error:'Creator belongs to another company'});
      // Keep the two company links in sync: assigning a workspace must also
      // stamp users.company_id, otherwise the creator shows in the workspace but
      // not on the corporate screen (which filters by company).
      await pool.query('UPDATE users SET company_id=$2 WHERE id=$1 AND company_id IS NULL',[userId,workspace.rows[0].company_id]);
      await pool.query("INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'creator') ON CONFLICT (organization_id,user_id) DO UPDATE SET active=true,role='creator'",[workspaceId,userId]);res.status(201).json({ok:true});}catch(e){next(e);}});
app.delete('/api/admin/memberships/:workspaceId/:userId',globalOnly,async(req,res,next)=>{try{const {workspaceId,userId}=req.params;const membership=await pool.query('SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$2',[workspaceId,userId]);if(!membership.rowCount)return res.status(404).json({error:'Membership not found'});const other=await pool.query('SELECT 1 FROM memberships WHERE user_id=$1 AND organization_id<>$2 AND active LIMIT 1',[userId,workspaceId]);if(!other.rowCount)return res.status(409).json({error:'Last workspace assignment cannot be removed'});await pool.query('DELETE FROM memberships WHERE organization_id=$1 AND user_id=$2',[workspaceId,userId]);res.json({ok:true});}catch(e){next(e);}});
app.get('/api/admin/audit',globalOnly,async(req,res,next)=>{try{res.json((await pool.query(`SELECT a.id,a.created_at AS "createdAt",a.action,a.actor_name AS "actorName",a.object_type AS "objectType",a.object_name AS "objectName",o.name AS "workspaceName" FROM audit_events a JOIN organizations o ON o.id=a.organization_id ORDER BY a.created_at DESC LIMIT 100`)).rows);}catch(e){next(e);}});
app.get('/api/admin/workspaces',globalOnly,async(req,res,next)=>{try{res.json((await pool.query('SELECT id,name,code,sector,city,company_id AS "companyId" FROM organizations ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/workspaces',globalOnly,async(req,res,next)=>{try{const {companyId,name,code,sector,city}=req.body||{};if(![companyId,name,code,sector,city].every(isNonEmptyString))return res.status(400).json({error:'companyId, name, code, sector, city required'});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code,company_id AS "companyId"',[`org-${randomUUID()}`,companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
app.put('/api/admin/workspaces/:id',globalOnly,async(req,res,next)=>{try{const {companyId,name,code,sector,city}=req.body||{};if(![companyId,name,code,sector,city].every(isNonEmptyString))return res.status(400).json({error:'companyId, name, code, sector, city required'});const previous=(await pool.query('SELECT company_id FROM organizations WHERE id=$1',[req.params.id])).rows[0];if(!previous)return res.status(404).json({error:'Workspace not found'});if(previous.company_id!==companyId&&(await pool.query(`SELECT 1 FROM memberships WHERE organization_id=$1 UNION ALL SELECT 1 FROM content_drafts WHERE organization_id=$1 UNION ALL SELECT 1 FROM content_briefs WHERE organization_id=$1 UNION ALL SELECT 1 FROM knowledge_sources WHERE organization_id=$1 LIMIT 1`,[req.params.id])).rowCount)return res.status(409).json({error:'Remove workspace members and content before moving it to another company'});const result=await pool.query('UPDATE organizations SET company_id=$1,name=$2,code=$3,sector=$4,city=$5 WHERE id=$6 RETURNING id,name,code,sector,city,company_id AS "companyId"',[companyId,name.trim(),code.trim().toUpperCase(),sector.trim(),city.trim(),req.params.id]);res.json(result.rows[0]);}catch(e){next(e);}});
app.delete('/api/admin/workspaces/:id',globalOnly,async(req,res,next)=>{try{const result=await pool.query(`DELETE FROM organizations o WHERE o.id=$1 AND NOT EXISTS(SELECT 1 FROM memberships WHERE organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM content_briefs WHERE organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM knowledge_sources WHERE organization_id=o.id) RETURNING id`,[req.params.id]);if(result.rowCount)return res.json({ok:true});if(!(await pool.query('SELECT 1 FROM organizations WHERE id=$1',[req.params.id])).rowCount)return res.status(404).json({error:'Workspace not found'});res.status(409).json({error:'Remove workspace members and content first'});}catch(e){if((e as {code?:string}).code==='23503')return res.status(409).json({error:'Workspace has dependent data and cannot be deleted'});next(e);}});
app.put('/api/corporate/settings',corporateOnly,async(req,res,next)=>{try{
  const user=res.locals.user;
  if(user.role!=='corporate'||!user.companyId)return res.status(403).json({error:'Company account required'});
  const name=req.body?.name;
  if(!isNonEmptyString(name)||name.trim().length>120)return res.status(400).json({error:'Company name must be 1–120 characters'});
  const updated=await pool.query('UPDATE companies SET name=$1 WHERE id=$2 RETURNING id,name',[name.trim(),user.companyId]);
  if(!updated.rowCount)return res.status(404).json({error:'Company not found'});
  res.json(updated.rows[0]);
}catch(e){next(e);}});
app.get('/api/corporate/dashboard',corporateOnly,async(_req,res,next)=>{try{
  const user=res.locals.user;
  if(user.role!=='corporate'||!user.companyId)return res.status(403).json({error:'Company account required'});
  const companyId=user.companyId;
  const [company,workspaces,users,recentDrafts]=await Promise.all([
    pool.query('SELECT id,name FROM companies WHERE id=$1',[companyId]),
    pool.query(`SELECT o.id,o.name,o.code,o.sector,o.city,
      (SELECT count(*)::int FROM memberships m WHERE m.organization_id=o.id AND m.active) AS "creatorCount",
      (SELECT count(*)::int FROM content_drafts d WHERE d.organization_id=o.id) AS "draftCount",
      (SELECT count(*)::int FROM content_drafts d WHERE d.organization_id=o.id AND d.status='disetujui') AS "approvedCount",
      (SELECT count(*)::int FROM content_drafts d WHERE d.organization_id=o.id AND d.status='menunggu_review') AS "reviewCount",
      (SELECT count(*)::int FROM knowledge_sources k WHERE k.organization_id=o.id) AS "sourceCount",
      (SELECT count(*)::int FROM content_briefs b WHERE b.organization_id=o.id) AS "briefCount",
      (SELECT count(*)::int FROM audit_events a WHERE a.organization_id=o.id) AS "auditCount"
      FROM organizations o WHERE o.company_id=$1 ORDER BY o.name,o.id`,[companyId]),
    pool.query(`SELECT u.id,u.name,u.global_role AS role,
      COALESCE((SELECT array_agg(o.name ORDER BY o.name) FROM memberships m
        JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id AND m.active AND o.company_id=$1),'{}') AS workspaces
      FROM users u WHERE u.company_id=$1 OR EXISTS(
        SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id
        WHERE m.user_id=u.id AND m.active AND o.company_id=$1) ORDER BY u.name,u.id`,[companyId]),
    pool.query(`SELECT d.id,d.title,d.status,d.format,d.updated_at AS "updatedAt",o.id AS "workspaceId",o.name AS "workspaceName"
      FROM content_drafts d JOIN organizations o ON o.id=d.organization_id
      WHERE o.company_id=$1 ORDER BY d.updated_at DESC,d.id DESC`,[companyId])
  ]);
  if(!company.rowCount)return res.status(404).json({error:'Company not found'});
  res.json({company:company.rows[0],workspaces:workspaces.rows,users:users.rows,userCount:users.rows.length,recentDrafts:recentDrafts.rows});
}catch(e){next(e);}});
app.get('/api/corporate/users',corporateOnly,async(req,res,next)=>{try{if(res.locals.user.role!=='corporate')return res.status(403).json({error:'Company account required'});res.json(await listCompanyUsers(res.locals.user.companyId));}catch(e){next(e);}});
app.post('/api/corporate/users',corporateOnly,async(req,res,next)=>{try{if(res.locals.user.role!=='corporate')return res.status(403).json({error:'Company account required'});const {name,email,password}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||typeof password!=='string'||password.length<8)return res.status(400).json({error:'Valid name, email and password (at least 8 characters) required'});const {hashPassword}=await import('./database.ts');const result=await pool.query(`INSERT INTO users(id,name,email,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,'creator',$5) RETURNING id,name,email`,[`usr-${randomUUID()}`,name.trim(),email.trim().toLowerCase(),await hashPassword(password),res.locals.user.companyId]);res.status(201).json({...result.rows[0],workspaceIds:[]});}catch(e){if((e as {code?:string}).code==='23505')return res.status(409).json({error:'Email already in use'});next(e);}});
app.put('/api/corporate/users/:userId',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;if(u.role!=='corporate')return res.status(403).json({error:'Company account required'});const {name,email,password}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||password!==undefined&&(typeof password!=='string'||password.length<8))return res.status(400).json({error:'Valid name, email and optional password (at least 8 characters) required'});const {hashPassword}=await import('./database.ts');const result=await pool.query(`UPDATE users SET name=$1,email=$2,password_hash=COALESCE($3,password_hash) WHERE id=$4 AND global_role='creator' AND (company_id=$5 OR EXISTS(SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=users.id AND m.active AND o.company_id=$5)) RETURNING id,name,email`,[name.trim(),email.trim().toLowerCase(),password===undefined?null:await hashPassword(password),req.params.userId,u.companyId]);if(!result.rowCount)return res.status(404).json({error:'Creator not found in your company'});res.json(result.rows[0]);}catch(e){if((e as {code?:string}).code==='23505')return res.status(409).json({error:'Email already in use'});next(e);}});
app.delete('/api/corporate/users/:userId',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;if(u.role!=='corporate')return res.status(403).json({error:'Company account required'});const result=await pool.query(`DELETE FROM users WHERE id=$1 AND company_id=$2 AND global_role='creator' RETURNING id`,[req.params.userId,u.companyId]);if(!result.rowCount)return res.status(404).json({error:'Creator not found in your company'});res.json({ok:true});}catch(e){if((e as {code?:string}).code==='23503')return res.status(409).json({error:'Creator has authored content; account cannot be deleted'});next(e);}});
app.put('/api/corporate/users/:userId/workspaces',corporateOnly,async(req,res,next)=>{try{if(res.locals.user.role!=='corporate')return res.status(403).json({error:'Company account required'});const {workspaceIds}=req.body||{};if(!Array.isArray(workspaceIds)||!workspaceIds.every(isNonEmptyString))return res.status(400).json({error:'workspaceIds must be an array of workspace IDs'});const result=await assignCompanyUser(res.locals.user.companyId,req.params.userId,workspaceIds);if(result.status!==200)return res.status(result.status).json({error:result.status===404?'Creator not found in your company':'Workspace outside your company'});res.json(result);}catch(e){next(e);}});
app.get('/api/corporate/workspaces',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;res.json((await pool.query('SELECT id,name,code,sector,city FROM organizations WHERE $1=\'superadmin\' OR company_id=$2 ORDER BY name',[u.role,u.companyId])).rows);}catch(e){next(e);}});
app.post('/api/corporate/workspaces',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;const {name,code,sector,city,companyId}=req.body||{};if(![name,code,sector,city].every(isNonEmptyString)||u.role==='superadmin'&&!isNonEmptyString(companyId))return res.status(400).json({error:'name, code, sector, city, and companyId for superadmin required'});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code',[`org-${randomUUID()}`,u.role==='superadmin'?companyId:u.companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
app.put('/api/corporate/workspaces/:workspaceId',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;if(u.role!=='corporate')return res.status(403).json({error:'Company account required'});const {name,code,sector,city}=req.body||{};if(![name,code,sector,city].every(isNonEmptyString))return res.status(400).json({error:'name, code, sector and city required'});const result=await pool.query('UPDATE organizations SET name=$1,code=$2,sector=$3,city=$4 WHERE id=$5 AND company_id=$6 RETURNING id,name,code,sector,city',[name.trim(),code.trim().toUpperCase(),sector.trim(),city.trim(),req.params.workspaceId,u.companyId]);if(!result.rowCount)return res.status(404).json({error:'Workspace not found in your company'});res.json(result.rows[0]);}catch(e){if((e as {code?:string}).code==='23505')return res.status(409).json({error:'Workspace code already in use'});next(e);}});
app.delete('/api/corporate/workspaces/:workspaceId',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;if(u.role!=='corporate')return res.status(403).json({error:'Company account required'});const id=req.params.workspaceId;const result=await pool.query(`DELETE FROM organizations o WHERE o.id=$1 AND o.company_id=$2 AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM content_drafts d WHERE d.organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM content_briefs b WHERE b.organization_id=o.id) AND NOT EXISTS(SELECT 1 FROM knowledge_sources k WHERE k.organization_id=o.id) RETURNING id`,[id,u.companyId]);if(result.rowCount)return res.json({ok:true});if(!(await pool.query('SELECT 1 FROM organizations WHERE id=$1 AND company_id=$2',[id,u.companyId])).rowCount)return res.status(404).json({error:'Workspace not found in your company'});res.status(409).json({error:'Workspace has members or content; remove them first'});}catch(e){if((e as {code?:string}).code==='23503')return res.status(409).json({error:'Workspace has dependent data and cannot be deleted'});next(e);}});
app.post('/api/corporate/workspaces/:workspaceId/members',corporateOnly,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{const {name,email,role}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||role!=='creator')return res.status(400).json({error:'name, email, creator role required'});res.status(201).json(await createUserMembership(req.params.workspaceId,{...req.body,role:'creator'}));}catch(e){if(e instanceof Error&&['Only creator accounts can join a workspace','Creator belongs to another company'].includes(e.message))return res.status(409).json({error:e.message});next(e);}});
app.delete('/api/corporate/workspaces/:workspaceId/members/:userId',corporateOnly,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(e){next(e);}});
app.get('/api/workspaces/:workspaceId/drafts', requireWorkspace(req=>req.params.workspaceId), async (req,res,next) => { try { res.json(await listWorkspaceDrafts(req.params.workspaceId)); } catch(error){next(error);} });
app.post('/api/drafts', contentOnly, requireWorkspace(req=>req.body?.workspaceId), async (req,res,next) => { try { const {workspaceId,title,format,content}=req.body||{}; const creatorId=res.locals.user.id; if(!workspaceId||!title||!format||!content) return res.status(400).json({error:'workspaceId, title, format, and content are required'}); res.status(201).json(await createDraft({workspaceId,title,format,creatorId,content,sourceIds:req.body?.sourceIds})); } catch(error){next(error);} });
app.put('/api/drafts/:id',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Draft ID mismatch'});if(!isNonEmptyString(req.body.workspaceId))return res.status(400).json({error:'workspaceId is required'});const createdBy=res.locals.user.id;const draft={...req.body,createdBy,brief:req.body.brief&&{...req.body.brief,createdBy}};res.json(await replaceDraft(draft));}catch(error){next(error);}});
app.put('/api/brand-profile',contentOnly,requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{res.json(await saveBrand(req.body));}catch(error){next(error);}});
// All workspaces upload into the one dedicated KMS project; the workspace is retained only as local provenance.
app.get('/api/kms/documents',knowledgeManager,async(_req,res,next)=>{try{
  const user=res.locals.user;
  const rows=await pool.query(`SELECT k.id,k.workspace_id AS "workspaceId",k.title,k.filename,k.indexed,k.media_type AS "mediaType",k.created_at AS "createdAt", COALESCE(array_agg(a.workspace_id ORDER BY a.workspace_id) FILTER (WHERE a.workspace_id IS NOT NULL),'{}') AS "workspaceIds" FROM kms_documents k LEFT JOIN kms_document_workspaces a ON a.document_id=k.id WHERE $1='superadmin' OR k.company_id=$2 GROUP BY k.id ORDER BY k.created_at DESC`,[user.role,user.companyId]);
  // ponytail: KMS stores one corpus; this list shows only local assignments.
  res.json(rows.rows);
}catch(e){next(e);}});
app.post('/api/kms/documents',knowledgeManager,async(req,res,next)=>{
  const user=res.locals.user;
  let form:Busboy.Busboy;
  try{form=Busboy({headers:req.headers,limits:{files:2,fields:2,fileSize:50*1024*1024,parts:5,fieldSize:4096}});}catch{return res.status(400).json({error:'Multipart form diperlukan'});}
  const fields:Record<string,string>={};let filename='',fileData:Buffer|undefined,frame:Buffer|undefined,invalid=false;
  form.on('field',(name,value)=>{if(!['title','workspaceIds'].includes(name)||name in fields)invalid=true;else fields[name]=value;});
  form.on('file',(name,file,info)=>{
    if(!['file','styleFrame'].includes(name)||(name==='file'&&filename)||(name==='styleFrame'&&frame))invalid=true;
    if(name==='file')filename=info.filename||'';
    let size=0;const chunks:Buffer[]=[];
    file.on('data',(chunk:Buffer)=>{size+=chunk.length;if(name==='styleFrame'&&size>1024*1024){invalid=true;return;}chunks.push(chunk);});
    file.on('limit',()=>{invalid=true;});
    file.on('end',()=>{if(name==='file')fileData=Buffer.concat(chunks);else frame=Buffer.concat(chunks);});
  });
  form.on('filesLimit',()=>{invalid=true;});form.on('fieldsLimit',()=>{invalid=true;});form.on('partsLimit',()=>{invalid=true;});
  // Busboy emits partsLimit at the boundary; allow four parts plus one sentinel.
  try{await new Promise<void>((resolve,reject)=>{form.on('close',resolve);form.on('error',reject);req.pipe(form);});
    if(invalid||!fileData||!fields.title?.trim()||!fields.workspaceIds){console.warn('[kms] invalid multipart', {invalid,hasFile:!!fileData,fields:Object.keys(fields)});return res.status(400).json({error:'File, judul, dan workspace wajib diisi (maksimum 50 MB)'});}
    if(fields.title.length>200)return res.status(400).json({error:'Judul terlalu panjang'});
    const mime=validateKnowledgeUpload(filename,fileData);
    const mediaType=mime.startsWith('image/')?'photo':mime==='video/mp4'?'video':'document';
    if(mediaType==='photo'&&fileData.length>5*1024*1024)return res.status(400).json({error:'Foto maksimal 5 MB untuk analisis gaya'});
    if(mediaType!=='document'&&(!frame||frame.length>1024*1024||validateKnowledgeUpload('style.jpg',frame)!=='image/jpeg'))return res.status(400).json({error:'Foto/video membutuhkan frame referensi JPEG valid maksimal 1 MB'});
    if(mediaType==='document'&&frame)return res.status(400).json({error:'Frame hanya untuk foto/video'});
    let workspaceIds:unknown;
    try{workspaceIds=JSON.parse(fields.workspaceIds);}catch{return res.status(400).json({error:'Pilihan workspace tidak valid'});}
    if(!Array.isArray(workspaceIds)||!workspaceIds.length||workspaceIds.length>100||workspaceIds.some(id=>typeof id!=='string'||!id)||new Set(workspaceIds).size!==workspaceIds.length)return res.status(400).json({error:'Pilihan workspace tidak valid'});
    const workspaces=await pool.query('SELECT id,company_id FROM organizations WHERE id=ANY($1::text[])',[workspaceIds]);
    if(workspaces.rowCount!==workspaceIds.length||workspaces.rows.some(w=>w.company_id!==workspaces.rows[0].company_id)||user.role==='corporate'&&workspaces.rows[0].company_id!==user.companyId)return res.status(403).json({error:'Workspace tidak diizinkan'});
    const result=await uploadKnowledgeFile({name:filename,data:fileData,title:fields.title,category:mediaType==='document'?'Dokumen':'Referensi Visual'});
    let doc;
    let client:import('pg').PoolClient|undefined;
    try {
      client=await pool.connect();
      await client.query('BEGIN');
      doc=await client.query(`INSERT INTO kms_documents(id,company_id,workspace_id,title,category,filename,media_type,style_frame) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,title,filename,media_type AS "mediaType"`,[result.document.id,workspaces.rows[0].company_id,workspaceIds[0],fields.title.trim(),mediaType==='document'?'Dokumen':'Referensi Visual',filename,mediaType,frame||null]);
      for(const id of workspaceIds)await client.query('INSERT INTO kms_document_workspaces(document_id,workspace_id) VALUES($1,$2)',[result.document.id,id]);
      await client.query('COMMIT');
    }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});try{await deleteKnowledgeFile(result.document.id);}catch{console.warn('[kms] orphan document requires cleanup',result.document.id);}throw error;}
    finally{client?.release();}
    // Images are opaque to RAG. Read each uploaded picture with the vision model
    // now, so the image-generation LLM can use a real description as reference.
    if(mediaType==='photo'){
      try{
        const description=await describeImage(filename,fileData);
        await pool.query('UPDATE kms_documents SET vision_description=$2,vision_model=$3,vision_updated_at=now() WHERE id=$1',[result.document.id,description,visionConfig().model]);
        (doc.rows[0] as any).visionDescription=description;
      }catch(error){
        console.warn('[vision] describe failed for',result.document.id,error instanceof Error?error.message:error);
      }
    }
    // KMS is document storage only. RAG is the retrieval+generation engine, so a
    // corporate upload must also be indexed into the workspace knowledge base;
    // otherwise Brief/Editor can never retrieve it.
    let ragIndexed=false;
    if(mediaType==='document'){
      try{
        const indexedDoc=await ragIndexDocument({
          scopeId:workspaceIds[0],
          documentId:result.document.id,
          documentName:filename,
          text:await extractDocumentText(filename,fileData),
          language:'id',
          metadata:{title:fields.title,category:'Dokumen',source:'kms'}
        });
        ragIndexed=Boolean(indexedDoc);
        await pool.query('UPDATE kms_documents SET indexed=true WHERE id=$1',[result.document.id]);
      }catch(error){
        console.warn('[rag] index after KMS upload failed',error instanceof Error?error.message:error);
      }
    }
    res.status(201).json({...doc.rows[0],workspaceIds,indexed:ragIndexed});
  }catch(e){if(e instanceof Error&&/Hanya PDF|File harus berisi|Nama file tidak valid|Judul dan kategori wajib|Frame video|Frame hanya/.test(e.message))return res.status(400).json({error:e.message});console.error('[kms] upload failed',e instanceof Error?e.message:e);res.status(502).json({error:'Upload KMS gagal; coba lagi nanti'});}
});
app.delete('/api/kms/documents/:id',knowledgeManager,async(req,res,next)=>{try{
  const u=res.locals.user;
  const found=await pool.query(`SELECT k.id FROM kms_documents k JOIN organizations o ON o.id=k.workspace_id WHERE k.id=$1 AND ($2='superadmin' OR o.company_id=$3)`,[req.params.id,u.role,u.companyId]);
  if(!found.rowCount)return res.status(404).json({error:'Dokumen tidak ditemukan'});
  // Remove from RAG first: a deleted document must never remain citable.
  const scopes=await pool.query('SELECT workspace_id FROM kms_document_workspaces WHERE document_id=$1',[req.params.id]);
  for(const row of scopes.rows as Array<{workspace_id:string}>){
    await ragDeleteDocument(row.workspace_id,req.params.id).catch(error=>console.warn('[rag] delete failed',row.workspace_id,error instanceof Error?error.message:error));
  }
  await deleteKnowledgeFile(req.params.id);
  await pool.query('DELETE FROM kms_documents WHERE id=$1',[req.params.id]);res.json({ok:true});
}catch(e){console.error('[kms] delete failed',e instanceof Error?e.message:e);res.status(502).json({error:'Hapus KMS gagal; coba lagi nanti'});}});
app.put('/api/knowledge-sources/:id',knowledgeManager,requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Source ID mismatch'});const previous=await getKnowledgeAssignments(req.params.id);const saved=await saveKnowledgeSource(req.body);const nextAssignments=saved.workspaceAssignments||[];const touched=new Set([...previous.map((a:any)=>a.workspaceId),...nextAssignments.map((a:any)=>a.workspaceId)]);let ragSynced=true;for(const workspaceId of touched){const assignment=nextAssignments.find((a:any)=>a.workspaceId===workspaceId&&a.enabled);const ok=assignment&&saved.status==='aktif'?await syncKnowledgeDocToRag(workspaceScopeFor(workspaceId),saved):await removeKnowledgeDocFromRag(workspaceScopeFor(workspaceId),saved.id);ragSynced=ok&&ragSynced;}res.json({...saved,ragSynced});}catch(error){next(error);}});
app.put('/api/organizations/:id',requireWorkspace(req=>req.params.id,true),async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,code,sector,city}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(code)||!isNonEmptyString(sector)||!isNonEmptyString(city))return res.status(400).json({error:'name, code, sector, and city are required'});res.json(await updateOrganization(req.params.id,req.body));}catch(error){next(error);}});
app.post('/api/organizations/:id/users',requireWorkspace(req=>req.params.id,true),async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,email,role}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(email))return res.status(400).json({error:'name and email are required'});if(role!=='creator')return res.status(400).json({error:'role must be creator'});res.status(201).json(await createUserMembership(req.params.id,{...req.body,role:'creator'}));}catch(error){if(error instanceof Error&&['Only creator accounts can join a workspace','Creator belongs to another company'].includes(error.message))return res.status(409).json({error:error.message});next(error);}});
app.delete('/api/organizations/:workspaceId/users/:userId',requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/knowledge-sources/:id',knowledgeManager,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{const assignments=await getKnowledgeAssignments(req.params.id);await deleteKnowledgeSource(req.params.workspaceId,req.params.id);const results=await Promise.all(assignments.map((a:any)=>removeKnowledgeDocFromRag(workspaceScopeFor(a.workspaceId),req.params.id)));res.json({ok:true,ragSynced:results.every(Boolean)});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/brand-profile',contentOnly,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteBrand(req.params.workspaceId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/drafts/:id',contentOnly,requireWorkspace(req=>req.params.workspaceId),async(req,res,next)=>{try{await deleteDraft(req.params.workspaceId,req.params.id);res.json({ok:true});}catch(error){next(error);}});
app.get('/api/workspaces/:workspaceId/settings',requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{try{if(!(await organizationExists(req.params.workspaceId)))return res.status(404).json({error:'Organization not found'});res.json(await getWorkspaceSettings(req.params.workspaceId));}catch(error){next(error);}});
app.put('/api/workspaces/:workspaceId/settings',requireWorkspace(req=>String(req.params.workspaceId),true),async(req,res,next)=>{try{if(!(await organizationExists(req.params.workspaceId)))return res.status(404).json({error:'Organization not found'});const data=req.body;if(!data||typeof data!=='object'||Array.isArray(data))return res.status(400).json({error:'A settings object is required'});res.json(await saveWorkspaceSettings(req.params.workspaceId,data));}catch(error){next(error);}});
app.get('/api/workspaces/:workspaceId/schedules',requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{try{res.json(await listSchedules(req.params.workspaceId));}catch(error){next(error);}});
app.post('/api/schedules/:id/comments',corporateOnly,async(req,res,next)=>{try{const text=typeof req.body?.text==='string'?req.body.text.trim():'';if(!text||text.length>2000)return res.status(400).json({error:'Comment must be 1–2000 characters'});res.status(201).json(await addScheduleComment(req.params.id,text,res.locals.user));}catch(error){if(error instanceof Error&&error.message==='Schedule not available to this company')return res.status(404).json({error:'Schedule not found'});next(error);}});
app.put('/api/schedules/:id',contentOnly,requireMember(req=>req.body?.workspaceId),async(req,res,next)=>{try{const b=req.body||{};if(req.params.id!==b.id)return res.status(400).json({error:'Schedule ID mismatch'});if(!isNonEmptyString(b.workspaceId)||!isNonEmptyString(b.title))return res.status(400).json({error:'workspaceId and title are required'});if(!['instagram','facebook','twitter','linkedin','youtube'].includes(b.platform))return res.status(400).json({error:'Invalid platform'});if(!['draft','scheduled','published'].includes(b.status))return res.status(400).json({error:'Invalid status'});if(!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))||(b.time&&!/^\d{2}:\d{2}$/.test(String(b.time))))return res.status(400).json({error:'date must be YYYY-MM-DD and time HH:mm'});if(b.pillar&&!['edukasi','layanan','korporat'].includes(b.pillar))return res.status(400).json({error:'Invalid pillar'});if(b.postUrl&&!/^https?:\/\/\S+$/.test(String(b.postUrl).trim()))return res.status(400).json({error:'Link post harus diawali http:// atau https://'});const actorId=res.locals.user?.id||(req as any).user?.id||'usr-system';res.json(await saveSchedule(b,actorId));}catch(error){if(error instanceof ScheduleRuleError)return res.status(400).json({error:error.message});next(error);}});
app.post('/api/organizations/:workspaceId/schedules/:id/post-image',contentOnly,requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{try{const workspaceId=String(req.params.workspaceId),id=String(req.params.id);const link=await getSchedulePostLink(workspaceId,id);if(!link)return res.status(404).json({error:'Jadwal tidak ditemukan'});if(!link.postUrl)return res.status(400).json({error:'Jadwal belum punya link post.'});const image=await fetchPostImage(link.postUrl,link.platform);res.json(await setSchedulePostImage(workspaceId,id,image));}catch(error){if(error instanceof PostImageError)return res.status(422).json({error:error.message});if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))return res.status(504).json({error:'Platform tidak merespons dalam 10 detik.'});next(error);}});
app.put('/api/organizations/:workspaceId/schedules/:id/custom-image',contentOnly,requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{try{const{image,source}=req.body||{};if(image!==null&&!['upload','ai'].includes(source))return res.status(400).json({error:'source must be upload or ai'});const clean=image===null?null:validateImageDataUrl(image);const saved=await setScheduleCustomImage(String(req.params.workspaceId),String(req.params.id),clean,clean?source:null);if(!saved)return res.status(404).json({error:'Jadwal tidak ditemukan'});res.json(saved);}catch(error){if(error instanceof PostImageError)return res.status(400).json({error:error.message});next(error);}});
app.delete('/api/organizations/:workspaceId/schedules/:id',contentOnly,requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{try{const actorId=res.locals.user?.id||(req as any).user?.id||'usr-system';await deleteSchedule(String(req.params.workspaceId),String(req.params.id),actorId);res.json({ok:true});}catch(error){next(error);}});
// Only local workspace assignments may reach the shared provider; never accept document IDs from clients.
async function authorizedKmsIds(workspaceId:string){return (await pool.query('SELECT document_id FROM kms_document_workspaces WHERE workspace_id=$1',[workspaceId])).rows.map((r:{document_id:string})=>r.document_id);}

// Long provider calls must not hold an HTTP request open until a proxy timeout.
// Jobs live in PostgreSQL because the app runs on multiple PM2 workers: an
// in-memory map meant a poll could land on a worker that never saw the job.
const RAG_JOB_TTL_MS=10*60*1000;

// Finished jobs are deleted after the TTL so rag_jobs cannot grow without bound.
// The sweep is idempotent and safe to run on every worker.
async function sweepRagJobs(){
  try{await pool.query('DELETE FROM rag_jobs WHERE created_at<now()-make_interval(secs=>$1)',[Math.round(RAG_JOB_TTL_MS/1000)]);}
  catch(error){console.warn('[rag] job sweep failed',error instanceof Error?error.message:error);}
}

async function runRagJob(id:string,workspaceId:string,query:string){
  try{
    // Brief/Editor are RAG work, not KMS work: RAG retrieves matched knowledge
    // and writes the copy. KMS only stores corporate-uploaded documents.
    const answer=await ragQuery(workspaceId,query);
    if(answer.grounded)await markSourcesIndexed(answer.sources,ids=>pool.query('UPDATE kms_documents SET indexed=true WHERE id=ANY($1::text[])',[ids]),error=>console.warn('[rag] indexed metadata update failed',error instanceof Error?error.message:error));
    await pool.query("UPDATE rag_jobs SET status='done',answer=$2::jsonb WHERE id=$1",[id,JSON.stringify(answer)]);
  }catch(error){
    const message=error instanceof Error?error.message:'unknown error';
    console.error('[rag] job failed',{id,message});
    await pool.query("UPDATE rag_jobs SET status='error',error=$2 WHERE id=$1",[id,message]).catch(()=>{});
  }
}
// ── RAG service proxy routes ──
app.get('/api/rag/status',async(_req,res)=>{try{const status=await ragStatus();const deps=status?.dependencies||{};const ready=status?.status==='ready'&&['qdrant','embedding','reranker','llm'].every(name=>String((deps as any)[name]||'')==='ok');res.json({configured:true,ready,dependencies:deps,detail:status?.detail||{}});}catch(error){const message=error instanceof Error?error.message:'RAG status unavailable';res.json({configured:ragConfigured(),ready:false,detail:message});}});
app.post('/api/rag/search',contentOnly,requireWorkspace(req=>req.body?.workspaceId),(_req,res)=>res.status(410).json({error:'KMS tidak menyediakan pencarian kutipan terpisah; gunakan sumber dari jawaban RAG'}));
app.post('/api/rag/query',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res)=>{try{const{workspaceId,query}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});const answer=await ragQuery(workspaceId,query);if(answer.grounded){await markSourcesIndexed(answer.sources,ids=>pool.query('UPDATE kms_documents SET indexed=true WHERE id=ANY($1::text[])',[ids]),error=>console.warn('[rag] indexed metadata update failed',error instanceof Error?error.message:error));}res.json(answer);}catch(error){const message=error instanceof Error?error.message:'unknown error';console.error('[rag] query failed',{message,cause:error instanceof Error&&error.cause?String(error.cause):undefined});res.status(502).json({error:`KMS query gagal: ${message}`});}});
app.post('/api/rag/jobs',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res)=>{try{const{workspaceId,query}=req.body||{};if(!isNonEmptyString(workspaceId)||!isNonEmptyString(query))return res.status(400).json({error:'workspaceId and query are required'});const id=randomUUID();await pool.query("INSERT INTO rag_jobs(id,workspace_id,user_id,status) VALUES($1,$2,$3,'running')",[id,workspaceId,String(res.locals.user?.id||'')]);await sweepRagJobs();void runRagJob(id,workspaceId,query);res.status(202).json({jobId:id,status:'running'});}catch(error){next(error);}});
app.get('/api/rag/jobs/:id',async(req,res,next)=>{try{const result=await pool.query('SELECT workspace_id AS "workspaceId",status,answer,error FROM rag_jobs WHERE id=$1',[String(req.params.id)]);const job=result.rows[0];if(!job)return res.status(404).json({error:'Job not found or expired'});if(!permitted(res.locals.user,job.workspaceId))return res.status(403).json({error:'Workspace access denied'});if(job.status==='done')return res.json({status:'done',answer:job.answer});if(job.status==='error')return res.json({status:'error',error:job.error});res.json({status:'running'});}catch(error){next(error);}});
app.post('/api/rag/refine',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{draftContent,promptAction}=req.body||{};if(!isNonEmptyString(draftContent)||!isNonEmptyString(promptAction))return res.status(400).json({error:'draftContent and promptAction required'});res.json(await queryKnowledge(`Perbaiki draf berikut sesuai instruksi. Pertahankan fakta dan jangan tambahkan fakta di luar dokumen. Instruksi: ${promptAction}\nDraf: ${draftContent}`,kmsConfig(),fetch,await authorizedKmsIds(req.body.workspaceId)));}catch(error){next(error);}});
app.post('/api/rag/plan',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const plan=cleanPlanRequest(req.body);if(typeof plan==='string')return res.status(400).json({error:plan});const result=await queryKnowledge(buildPlanPrompt(plan),kmsConfig(),fetch,await authorizedKmsIds(String(req.body.workspaceId)));const slots=parsePlanSlots(result.answer||'',plan);if(!slots.length)return res.status(502).json({error:'AI belum menghasilkan rencana yang valid. Coba lagi atau ubah tema.'});const sources=[...new Set((result.sources||[]).map((s:any)=>s.document_name).filter(Boolean))];res.json({slots,sources,model:result.model});}catch(error){next(error);}});
app.post('/api/rag/compose',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{briefText,feedback}=req.body||{};if(!isNonEmptyString(briefText))return res.status(400).json({error:'briefText is required'});res.json(await queryKnowledge(`Tulis naskah baru berdasarkan brief dan dokumen resmi, tanpa fakta tambahan. ${briefText}${typeof feedback==='string'?`\nPerbaikan: ${feedback.slice(0,1000)}`:''}`,kmsConfig(),fetch,await authorizedKmsIds(req.body.workspaceId)));}catch(error){next(error);}});
// The former workspace-specific RAG service is intentionally not synced/pruned from the shared KMS corpus.
app.post(['/api/rag/sync','/api/rag/prune'],knowledgeManager,(_req,res)=>res.status(410).json({error:'Gunakan unggah dan hapus dokumen pada KMS bersama'}));
app.use('/api',(_req,res)=>{res.status(404).json({error:'Endpoint not found'});});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error);if((error as {code?:string}).code==='23505')return res.status(409).json({error:'A record with these unique values already exists (duplicate email or code)'});res.status(500).json({error:error instanceof Error?error.message:'Internal server error'});});

const port=Number(process.env.PORT||process.env.API_PORT||3005);
if(process.env.NODE_ENV!=='test') {
  runMigrations()
    .then(provisionSuperadmin)
    .then(() => app.listen(port, '0.0.0.0', () => {
      console.log(`VibeContent API listening on 0.0.0.0:${port}`);
      // Keep the job table bounded even when no new job is created.
      void sweepRagJobs();
      setInterval(()=>{void sweepRagJobs();},5*60*1000).unref();
    }))
    .catch(async error => {
      console.error('Database migrations failed; API server was not started.', error);
      await pool.end();
      process.exitCode = 1;
    });
}
export default app;
