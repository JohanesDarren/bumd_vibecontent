import './env.ts';
import { generateVisual, VisualError } from './visual.ts';
import { ragConfigured } from './env.ts';
import { knowledgeBaseIdFor, ragDeleteDocument, ragIndexDocument, ragListDocuments, ragQuery, ragRefine, ragSearch, ragStatus } from './rag.ts';
import express from 'express';
import cors from 'cors';
import { createDraft, createUserMembership, deleteBrand, deleteDraft, deleteKnowledgeSource, deleteUserMembership, listBootstrap, listWorkspaceDrafts, organizationExists, pool, replaceDraft, saveBrand, saveKnowledgeSource, updateOrganization } from './database.ts';
import { authenticate, login, logout, permitted, provisionSuperadmin, requireWorkspace } from './security.ts';
import { randomUUID } from 'node:crypto';

const app = express();
const allowedOrigins=(process.env.API_ALLOWED_ORIGIN||'http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '1mb' }));
// ponytail: same-site cookie requires an Origin check on writes; configure API_ALLOWED_ORIGIN for deployments.
app.use('/api',(req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const origin=req.headers.origin;if(origin&&!allowedOrigins.includes(origin))return res.status(403).json({error:'Origin denied'});next();});

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

app.post('/api/visual/generate', authenticate, requireWorkspace(req=>req.body?.workspaceId), async (req, res) => {
  try { res.json(await generateVisual(req.body)); }
  catch (error) { const e = error as VisualError; res.status(e.status || 500).json({ error: e.message, code: e.code || 'VISUAL_ERROR' }); }
});

// ── RAG service integration (best-effort: the app must keep working when the service is down) ──
const knowledgeText = (doc: any): string => {
  const chunks = (doc.chunks || [])
    .map((chunk: any) => `${chunk.section || ''}\n${chunk.content || ''}`.trim())
    .filter(Boolean);
  return chunks.length ? chunks.join('\n\n') : (doc.summary || doc.title || '');
};

async function syncKnowledgeDocToRag(workspaceId: string, doc: any): Promise<boolean> {
  try {
    if (doc.status === 'aktif') {
      await ragIndexDocument({
        workspaceId,
        documentId: doc.id,
        documentName: doc.title,
        text: knowledgeText(doc),
        language: 'id',
        metadata: { category: doc.category, owner: doc.owner, version: doc.version, effectiveDate: doc.effectiveDate }
      });
    } else {
      // Inactive/pending documents must not be retrievable (anti-hallucination principle).
      await ragDeleteDocument(workspaceId, doc.id);
    }
    return true;
  } catch (error) {
    console.warn('[rag] sync failed for', doc.id, error instanceof Error ? error.message : error);
    return false;
  }
}

async function removeKnowledgeDocFromRag(workspaceId: string, documentId: string): Promise<boolean> {
  try {
    await ragDeleteDocument(workspaceId, documentId);
    return true;
  } catch (error) {
    console.warn('[rag] delete failed for', documentId, error instanceof Error ? error.message : error);
    return false;
  }
}

app.get('/api/health', async (_req,res,next) => { try { const result=await pool.query('SELECT current_database() database, now() time'); res.json({ok:true,...result.rows[0]}); } catch(error){next(error);} });
const isEmail=(v:unknown):v is string=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
app.post('/api/auth/login',async(req,res,next)=>{try{const {email,password}=req.body||{};if(!isEmail(email)||typeof password!=='string')return res.status(400).json({error:'Valid email and password are required'});res.json(await login(email,password,req,res));}catch(error){if(error instanceof Error&&/Invalid email or password|LEGACY_CLAIM/.test(error.message))return res.status(401).json({error:'Invalid email or password'});next(error);}});
app.get('/api/auth/me',authenticate,(req,res)=>res.json(res.locals.user));
app.post('/api/auth/logout',authenticate,async(req,res,next)=>{try{await logout(req,res);res.json({ok:true});}catch(error){next(error);}});
app.use('/api',authenticate);
app.get('/api/users/:userId/workspaces',(req,res)=>req.params.userId===res.locals.user.id||res.locals.user.role==='superadmin'?res.json(res.locals.user.workspaces):res.status(403).json({error:'Access denied'}));
app.get('/api/bootstrap', async (req,res,next) => { try {const user=res.locals.user;const workspaceId=String(req.query.workspaceId||user.workspaces[0]?.id||'');if(!permitted(user,workspaceId))return res.status(403).json({error:'Workspace access denied'});const data=await listBootstrap(workspaceId);data.workspaces=data.workspaces.filter((w:any)=>permitted(user,w.id));res.json(data); } catch(error){next(error);} });
const globalOnly=(req:express.Request,res:express.Response,next:express.NextFunction)=>res.locals.user.role==='superadmin'?next():res.status(403).json({error:'Superadmin required'});
const corporateOnly=(req:express.Request,res:express.Response,next:express.NextFunction)=>['corporate','superadmin'].includes(res.locals.user.role)?next():res.status(403).json({error:'Corporate role required'});
app.get('/api/admin/companies',globalOnly,async(req,res,next)=>{try{res.json((await pool.query('SELECT id,name FROM companies ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/companies',globalOnly,async(req,res,next)=>{try{if(!isNonEmptyString(req.body?.name))return res.status(400).json({error:'name required'});res.status(201).json((await pool.query('INSERT INTO companies(id,name) VALUES($1,$2) RETURNING id,name',[`co-${randomUUID()}`,req.body.name])).rows[0]);}catch(e){next(e);}});
app.get('/api/admin/users',globalOnly,async(req,res,next)=>{try{res.json((await pool.query('SELECT id,name,email,global_role AS role,company_id AS "companyId" FROM users ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/users',globalOnly,async(req,res,next)=>{try{const {name,email,password,role,companyId}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||typeof password!=='string'||password.length<8||!['corporate','superadmin'].includes(role)||role==='corporate'&&!isNonEmptyString(companyId))return res.status(400).json({error:'name, email, password, corporate or superadmin role, and corporate companyId required'});const {hashPassword}=await import('./database.ts');res.status(201).json((await pool.query('INSERT INTO users(id,name,email,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,global_role AS role,company_id AS "companyId"',[`usr-${randomUUID()}`,name,email.toLowerCase(),await hashPassword(password),role,role==='corporate'?companyId:null])).rows[0]);}catch(e){next(e);}});
app.get('/api/admin/workspaces',globalOnly,async(req,res,next)=>{try{res.json((await pool.query('SELECT id,name,code,company_id AS "companyId" FROM organizations ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/workspaces',globalOnly,async(req,res,next)=>{try{const {companyId,name,code,sector,city}=req.body||{};if(![companyId,name,code,sector,city].every(isNonEmptyString))return res.status(400).json({error:'companyId, name, code, sector, city required'});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code,company_id AS "companyId"',[`org-${randomUUID()}`,companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
app.get('/api/corporate/workspaces',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;res.json((await pool.query('SELECT id,name,code,sector,city FROM organizations WHERE $1=\'superadmin\' OR company_id=$2 ORDER BY name',[u.role,u.companyId])).rows);}catch(e){next(e);}});
app.post('/api/corporate/workspaces',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;const {name,code,sector,city,companyId}=req.body||{};if(![name,code,sector,city].every(isNonEmptyString)||u.role==='superadmin'&&!isNonEmptyString(companyId))return res.status(400).json({error:'name, code, sector, city, and companyId for superadmin required'});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code',[`org-${randomUUID()}`,u.role==='superadmin'?companyId:u.companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
app.post('/api/corporate/workspaces/:workspaceId/members',corporateOnly,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{const {name,email,role}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email)||role!=='creator')return res.status(400).json({error:'name, email, creator role required'});res.status(201).json(await createUserMembership(req.params.workspaceId,{...req.body,role:'creator'}));}catch(e){if(e instanceof Error&&e.message==='Only creator accounts can join a workspace')return res.status(409).json({error:e.message});next(e);}});
app.delete('/api/corporate/workspaces/:workspaceId/members/:userId',corporateOnly,requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(e){next(e);}});
app.get('/api/workspaces/:workspaceId/drafts', requireWorkspace(req=>req.params.workspaceId), async (req,res,next) => { try { res.json(await listWorkspaceDrafts(req.params.workspaceId)); } catch(error){next(error);} });
app.post('/api/drafts', requireWorkspace(req=>req.body?.workspaceId), async (req,res,next) => { try { const {workspaceId,title,format,content}=req.body||{}; const creatorId=res.locals.user.id; if(!workspaceId||!title||!format||!content) return res.status(400).json({error:'workspaceId, title, format, and content are required'}); res.status(201).json(await createDraft({workspaceId,title,format,creatorId,content,sourceIds:req.body?.sourceIds})); } catch(error){next(error);} });
app.put('/api/drafts/:id',requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Draft ID mismatch'});if(!isNonEmptyString(req.body.workspaceId))return res.status(400).json({error:'workspaceId is required'});const draft={...req.body,createdBy:res.locals.user.id};res.json(await replaceDraft(draft));}catch(error){next(error);}});
app.put('/api/brand-profile',requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{res.json(await saveBrand(req.body));}catch(error){next(error);}});
app.put('/api/knowledge-sources/:id',requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Source ID mismatch'});const saved=await saveKnowledgeSource(req.body);const ragSynced=await syncKnowledgeDocToRag(req.body.workspaceId,saved);res.json({...saved,ragSynced});}catch(error){next(error);}});
app.put('/api/organizations/:id',requireWorkspace(req=>req.params.id,true),async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,code,sector,city}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(code)||!isNonEmptyString(sector)||!isNonEmptyString(city))return res.status(400).json({error:'name, code, sector, and city are required'});res.json(await updateOrganization(req.params.id,req.body));}catch(error){next(error);}});
app.post('/api/organizations/:id/users',requireWorkspace(req=>req.params.id,true),async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,email,role}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(email))return res.status(400).json({error:'name and email are required'});if(role!=='creator')return res.status(400).json({error:'role must be creator'});res.status(201).json(await createUserMembership(req.params.id,{...req.body,role:'creator'}));}catch(error){if(error instanceof Error&&error.message==='Only creator accounts can join a workspace')return res.status(409).json({error:error.message});next(error);}});
app.delete('/api/organizations/:workspaceId/users/:userId',requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/knowledge-sources/:id',requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteKnowledgeSource(req.params.workspaceId,req.params.id);const ragSynced=await removeKnowledgeDocFromRag(req.params.workspaceId,req.params.id);res.json({ok:true,ragSynced});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/brand-profile',requireWorkspace(req=>req.params.workspaceId,true),async(req,res,next)=>{try{await deleteBrand(req.params.workspaceId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/drafts/:id',requireWorkspace(req=>req.params.workspaceId),async(req,res,next)=>{try{await deleteDraft(req.params.workspaceId,req.params.id);res.json({ok:true});}catch(error){next(error);}});
// ── RAG service proxy routes ──
app.get('/api/rag/status',async(_req,res,next)=>{try{if(!ragConfigured())return res.json({configured:false,ready:false});const status=await ragStatus();res.json({configured:true,ready:status.status==='ready',dependencies:status.dependencies,detail:status.detail});}catch(error){res.json({configured:true,ready:false,error:error instanceof Error?error.message:String(error)});}});
app.post('/api/rag/search',requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{workspaceId,query,topK}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});res.json(await ragSearch(workspaceId,query,Number(topK)||5));}catch(error){next(error);}});
app.post('/api/rag/query',requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{workspaceId,query,topK}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});res.json(await ragQuery(workspaceId,query,Number(topK)||5));}catch(error){next(error);}});
app.post('/api/rag/refine',requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{workspaceId,draftContent,promptAction}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(draftContent))return res.status(400).json({error:'draftContent is required'});if(!isNonEmptyString(promptAction))return res.status(400).json({error:'promptAction is required'});const result=await ragRefine(workspaceId,draftContent,promptAction);res.json(result);}catch(error){next(error);}});
app.post('/api/rag/sync',requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{const{workspaceId}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});const data=await listBootstrap(workspaceId);let indexed=0,failed=0;for(const doc of data.documents){const ok=doc.status==='aktif'?await syncKnowledgeDocToRag(workspaceId,doc):await removeKnowledgeDocFromRag(workspaceId,doc.id);if(ok)indexed++;else failed++;}res.json({knowledgeBaseId:knowledgeBaseIdFor(workspaceId),indexed,failed,total:data.documents.length});}catch(error){next(error);}});
// Remove remote-KB entries that no longer correspond to any DB document (e.g. after a demo reset).
app.post('/api/rag/prune',requireWorkspace(req=>req.body?.workspaceId,true),async(req,res,next)=>{try{const{workspaceId}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});const data=await listBootstrap(workspaceId);const validIds=new Set(data.documents.map((d:any)=>d.id));const listed=await ragListDocuments(workspaceId);const docs=(listed as any)?.documents||[];let removed=0,failed=0;for(const entry of docs){const id=entry?.document_id||entry?.id;if(id&&!validIds.has(String(id))){const ok=await removeKnowledgeDocFromRag(workspaceId,String(id));if(ok)removed++;else failed++;}}res.json({knowledgeBaseId:knowledgeBaseIdFor(workspaceId),removed,failed,total:docs.length});}catch(error){next(error);}});
app.use('/api',(_req,res)=>{res.status(404).json({error:'Endpoint not found'});});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error);res.status(500).json({error:error instanceof Error?error.message:'Internal server error'});});

const port=Number(process.env.API_PORT||3005);
if(process.env.NODE_ENV!=='test') provisionSuperadmin().then(()=>app.listen(port,()=>console.log(`VibeContent API http://127.0.0.1:${port}`))).catch(error=>{console.error(error);process.exitCode=1;pool.end();});
export default app;
