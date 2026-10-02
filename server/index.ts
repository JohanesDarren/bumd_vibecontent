import './env.ts';
import { generateVisual, VisualError } from './visual.ts';
import { ragConfigured } from './env.ts';
import { knowledgeBaseIdFor, ragDeleteDocument, ragIndexDocument, ragListDocuments, ragQuery, ragRefine, ragSearch, ragStatus } from './rag.ts';
import express from 'express';
import cors from 'cors';
import { authenticateUser, claimLegacyPassword, clearAllData, createDraft, createOrganizationWithAdmin, createUserMembership, deleteBrand, deleteDraft, deleteKnowledgeSource, deleteUserMembership, getUserWorkspaces, listBootstrap, listWorkspaceDrafts, organizationExists, pool, registerUser, replaceDraft, saveBrand, saveKnowledgeSource, updateOrganization } from './database.ts';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

app.post('/api/visual/generate', async (req, res) => {
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
app.delete('/api/data', async (_req,res,next) => { try { await clearAllData(); res.json({ok:true}); } catch(error){next(error);} });
app.post('/api/onboarding', async (req,res,next) => { try { const {organizationName,code,sector,city,adminName,adminEmail,adminPassword}=req.body||{}; if(!organizationName||!code||!sector||!city||!adminName||!adminEmail)return res.status(400).json({error:'Organization name, code, sector, city, admin name, and admin email are required'});res.status(201).json(await createOrganizationWithAdmin({organizationName,code,sector,city,adminName,adminEmail,adminPassword:typeof adminPassword==='string'&&adminPassword.length>=8?adminPassword:undefined})); } catch(error){next(error);} });
const isEmail=(v:unknown):v is string=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
app.post('/api/auth/register',async(req,res,next)=>{try{const {name,email,password,workspaceCode}=req.body||{};if(!isNonEmptyString(name)||!isEmail(email))return res.status(400).json({error:'Valid name and email are required'});if(typeof password!=='string'||password.length<8)return res.status(400).json({error:'Password must be at least 8 characters'});if(!isNonEmptyString(workspaceCode))return res.status(400).json({error:'Workspace code is required'});const result=await registerUser({name,email,password,workspaceCode});res.status(201).json(result);}catch(error){if(error instanceof Error&&/already exists|not found/.test(error.message))return res.status(409).json({error:error.message});next(error);}});
app.post('/api/auth/login',async(req,res,next)=>{try{const {email,password}=req.body||{};if(!isEmail(email)||typeof password!=='string')return res.status(400).json({error:'Valid email and password are required'});try{res.json(await authenticateUser(email,password));}catch(err){if(err instanceof Error&&err.message==='LEGACY_CLAIM'){res.json(await claimLegacyPassword(email,password));}else{throw err;}}}catch(error){next(error);}});
app.get('/api/users/:userId/workspaces',async(req,res,next)=>{try{res.json(await getUserWorkspaces(req.params.userId));}catch(error){next(error);}});
app.get('/api/bootstrap', async (req,res,next) => { try { res.json(await listBootstrap(req.query.workspaceId ? String(req.query.workspaceId) : undefined)); } catch(error){next(error);} });
app.get('/api/workspaces/:workspaceId/drafts', async (req,res,next) => { try { res.json(await listWorkspaceDrafts(req.params.workspaceId)); } catch(error){next(error);} });
app.post('/api/drafts', async (req,res,next) => { try { const {workspaceId,title,format,creatorId,content}=req.body||{}; if(!workspaceId||!title||!format||!creatorId||!content) return res.status(400).json({error:'workspaceId, title, format, creatorId, and content are required'}); res.status(201).json(await createDraft({workspaceId,title,format,creatorId,content,sourceIds:req.body?.sourceIds})); } catch(error){next(error);} });
app.put('/api/drafts/:id',async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Draft ID mismatch'});if(!isNonEmptyString(req.body.workspaceId))return res.status(400).json({error:'workspaceId is required'});res.json(await replaceDraft(req.body));}catch(error){next(error);}});
app.put('/api/brand-profile',async(req,res,next)=>{try{if(!isNonEmptyString(req.body?.workspaceId))return res.status(400).json({error:'workspaceId is required'});res.json(await saveBrand(req.body));}catch(error){next(error);}});
app.put('/api/knowledge-sources/:id',async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Source ID mismatch'});if(!isNonEmptyString(req.body.workspaceId))return res.status(400).json({error:'workspaceId is required'});const saved=await saveKnowledgeSource(req.body);const ragSynced=await syncKnowledgeDocToRag(req.body.workspaceId,saved);res.json({...saved,ragSynced});}catch(error){next(error);}});
app.put('/api/organizations/:id',async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,code,sector,city}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(code)||!isNonEmptyString(sector)||!isNonEmptyString(city))return res.status(400).json({error:'name, code, sector, and city are required'});res.json(await updateOrganization(req.params.id,req.body));}catch(error){next(error);}});
app.post('/api/organizations/:id/users',async(req,res,next)=>{try{if(!(await organizationExists(req.params.id)))return res.status(404).json({error:'Organization not found'});const {name,email,role}=req.body||{};if(!isNonEmptyString(name)||!isNonEmptyString(email))return res.status(400).json({error:'name and email are required'});if(!['creator','admin'].includes(role))return res.status(400).json({error:'role must be creator or admin'});res.status(201).json(await createUserMembership(req.params.id,req.body));}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/users/:userId',async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/knowledge-sources/:id',async(req,res,next)=>{try{await deleteKnowledgeSource(req.params.workspaceId,req.params.id);const ragSynced=await removeKnowledgeDocFromRag(req.params.workspaceId,req.params.id);res.json({ok:true,ragSynced});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/brand-profile',async(req,res,next)=>{try{await deleteBrand(req.params.workspaceId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/drafts/:id',async(req,res,next)=>{try{await deleteDraft(req.params.workspaceId,req.params.id);res.json({ok:true});}catch(error){next(error);}});
// ── RAG service proxy routes ──
app.get('/api/rag/status',async(_req,res,next)=>{try{if(!ragConfigured())return res.json({configured:false,ready:false});const status=await ragStatus();res.json({configured:true,ready:status.status==='ready',dependencies:status.dependencies,detail:status.detail});}catch(error){res.json({configured:true,ready:false,error:error instanceof Error?error.message:String(error)});}});
app.post('/api/rag/search',async(req,res,next)=>{try{const{workspaceId,query,topK}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});res.json(await ragSearch(workspaceId,query,Number(topK)||5));}catch(error){next(error);}});
app.post('/api/rag/query',async(req,res,next)=>{try{const{workspaceId,query,topK}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});res.json(await ragQuery(workspaceId,query,Number(topK)||5));}catch(error){next(error);}});
app.post('/api/rag/refine',async(req,res,next)=>{try{const{workspaceId,draftContent,promptAction}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(draftContent))return res.status(400).json({error:'draftContent is required'});if(!isNonEmptyString(promptAction))return res.status(400).json({error:'promptAction is required'});const result=await ragRefine(workspaceId,draftContent,promptAction);res.json(result);}catch(error){next(error);}});
app.post('/api/rag/sync',async(req,res,next)=>{try{const{workspaceId}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});const data=await listBootstrap(workspaceId);let indexed=0,failed=0;for(const doc of data.documents){const ok=doc.status==='aktif'?await syncKnowledgeDocToRag(workspaceId,doc):await removeKnowledgeDocFromRag(workspaceId,doc.id);if(ok)indexed++;else failed++;}res.json({knowledgeBaseId:knowledgeBaseIdFor(workspaceId),indexed,failed,total:data.documents.length});}catch(error){next(error);}});
// Remove remote-KB entries that no longer correspond to any DB document (e.g. after a demo reset).
app.post('/api/rag/prune',async(req,res,next)=>{try{const{workspaceId}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});const data=await listBootstrap(workspaceId);const validIds=new Set(data.documents.map((d:any)=>d.id));const listed=await ragListDocuments(workspaceId);const docs=(listed as any)?.documents||[];let removed=0,failed=0;for(const entry of docs){const id=entry?.document_id||entry?.id;if(id&&!validIds.has(String(id))){const ok=await removeKnowledgeDocFromRag(workspaceId,String(id));if(ok)removed++;else failed++;}}res.json({knowledgeBaseId:knowledgeBaseIdFor(workspaceId),removed,failed,total:docs.length});}catch(error){next(error);}});
app.use('/api',(_req,res)=>{res.status(404).json({error:'Endpoint not found'});});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error);res.status(500).json({error:error instanceof Error?error.message:'Internal server error'});});

const port=Number(process.env.API_PORT||3005);
if(process.env.NODE_ENV!=='test') app.listen(port,()=>console.log(`VibeContent API http://127.0.0.1:${port}`));
export default app;
