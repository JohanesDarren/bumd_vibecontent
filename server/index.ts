import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clearAllData, createDraft, createOrganizationWithAdmin, createUserMembership, deleteBrand, deleteDraft, deleteKnowledgeSource, deleteUserMembership, listBootstrap, listWorkspaceDrafts, pool, replaceDraft, saveBrand, saveKnowledgeSource, updateOrganization } from './database.ts';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req,res,next) => { try { const result=await pool.query('SELECT current_database() database, now() time'); res.json({ok:true,...result.rows[0]}); } catch(error){next(error);} });
app.delete('/api/data', async (_req,res,next) => { try { await clearAllData(); res.json({ok:true}); } catch(error){next(error);} });
app.post('/api/onboarding', async (req,res,next) => { try { const {organizationName,code,sector,city,adminName,adminEmail}=req.body||{}; if(!organizationName||!code||!sector||!city||!adminName||!adminEmail)return res.status(400).json({error:'Semua data organisasi dan admin wajib diisi'});res.status(201).json(await createOrganizationWithAdmin({organizationName,code,sector,city,adminName,adminEmail})); } catch(error){next(error);} });
app.get('/api/bootstrap', async (req,res,next) => { try { res.json(await listBootstrap(req.query.workspaceId ? String(req.query.workspaceId) : undefined)); } catch(error){next(error);} });
app.get('/api/workspaces/:workspaceId/drafts', async (req,res,next) => { try { res.json(await listWorkspaceDrafts(req.params.workspaceId)); } catch(error){next(error);} });
app.post('/api/drafts', async (req,res,next) => { try { const {workspaceId,title,format,creatorId,content,sourceIds}=req.body||{}; if(!workspaceId||!title||!format||!creatorId||!content) return res.status(400).json({error:'workspaceId, title, format, creatorId, content wajib diisi'}); res.status(201).json(await createDraft({workspaceId,title,format,creatorId,content,sourceIds})); } catch(error){next(error);} });
app.put('/api/drafts/:id',async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Draft ID mismatch'});res.json(await replaceDraft(req.body));}catch(error){next(error);}});
app.put('/api/brand-profile',async(req,res,next)=>{try{res.json(await saveBrand(req.body));}catch(error){next(error);}});
app.put('/api/knowledge-sources/:id',async(req,res,next)=>{try{if(req.params.id!==req.body?.id)return res.status(400).json({error:'Source ID mismatch'});res.json(await saveKnowledgeSource(req.body));}catch(error){next(error);}});
app.put('/api/organizations/:id',async(req,res,next)=>{try{res.json(await updateOrganization(req.params.id,req.body));}catch(error){next(error);}});
app.post('/api/organizations/:id/users',async(req,res,next)=>{try{res.status(201).json(await createUserMembership(req.params.id,req.body));}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/users/:userId',async(req,res,next)=>{try{await deleteUserMembership(req.params.workspaceId,req.params.userId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/knowledge-sources/:id',async(req,res,next)=>{try{await deleteKnowledgeSource(req.params.workspaceId,req.params.id);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/brand-profile',async(req,res,next)=>{try{await deleteBrand(req.params.workspaceId);res.json({ok:true});}catch(error){next(error);}});
app.delete('/api/organizations/:workspaceId/drafts/:id',async(req,res,next)=>{try{await deleteDraft(req.params.workspaceId,req.params.id);res.json({ok:true});}catch(error){next(error);}});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error);res.status(500).json({error:error instanceof Error?error.message:'Internal server error'});});

const port=Number(process.env.API_PORT||3005);
if(process.env.NODE_ENV!=='test') app.listen(port,()=>console.log(`VibeContent API http://127.0.0.1:${port}`));
export default app;
