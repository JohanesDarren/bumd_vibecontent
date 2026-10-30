import './env.ts';
import { describeStyle, generateImageFromReference, generateVisual, visualModels, VisualError } from './visual.ts';
import { buildCorePlan, type ReferenceUpload } from './visualCore.ts';
import { REFERENCE_SLOTS, REQUIRED_SLOTS, hasAcceptedExtension, normalizePublication, type VisualMode } from './corePrompt.ts';
import { chooseVisualReference } from './visualReferenceSelection.ts';
import { env, ragConfigured } from './env.ts';
import { knowledgeBaseIdFor, RagNotConfiguredError, ragDeleteDocument, ragIndexDocument, ragListDocuments, ragCompose, ragPlan, ragQuery, ragRefine, ragSearch, ragSuggestSchedule, ragStatus } from './rag.ts';
import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

// The framework advertises itself in every response; that is free information
// for an attacker and is not needed by any client.
app.disable('x-powered-by');

/**
 * Baseline security headers.
 *
 * nginx already sets a few of these at the edge, but the app must not depend on
 * the proxy: a direct hit on the Node port, or a different deployment, would
 * otherwise ship without them. Existing values are preserved, missing ones are
 * filled in.
 */
app.use((_req, res, next) => {
  const set = (name: string, value: string) => {
    if (!res.getHeader(name)) res.setHeader(name, value);
  };
  set('X-Content-Type-Options', 'nosniff');
  set('X-Frame-Options', 'SAMEORIGIN');
  set('Referrer-Policy', 'strict-origin-when-cross-origin');
  set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS only makes sense over TLS; sending it on plain HTTP is ignored anyway.
  if (_req.secure || _req.headers['x-forwarded-proto'] === 'https') {
    set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // A conservative CSP: the app loads its own bundle, Google Fonts, and inline
  // styles injected by React/Tailwind. 'unsafe-inline' for style-src is required
  // by the current styling approach; scripts stay restricted to same-origin.
  set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Cloudflare injects its analytics beacon at the edge; blocking it produced
      // a console error on every page load without adding any security value.
      "script-src 'self' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://cloudflareinsights.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
});

const allowedOrigins=(process.env.API_ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',').map(origin=>origin.trim()).filter(Boolean);
if(process.env.NODE_ENV === 'production' && !allowedOrigins.length) throw new Error('API_ALLOWED_ORIGIN is required in production');
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true, exposedHeaders: ['X-Session-Idle-Seconds'] }));
app.use(express.json({ limit: '8mb' }));
// Resolve the built shell defensively.
//
// The zero-downtime deployer activates a release directory that contains the
// *contents* of dist/ (index.html + assets/), not a dist/ folder. Running from
// the release therefore found a stale ../dist and served an old bundle even
// though the release had switched. Prefer an explicitly configured directory,
// then the release layout, then the classic ../dist.
const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * A directory only counts as the built shell if its index.html is a PRODUCTION
 * build. The repository also contains a source index.html whose entry is
 * `/src/main.tsx`; serving that to a browser yields a blank page because Vite's
 * dev entry does not exist on the server. Checking for built assets prevents the
 * source file from ever winning the race.
 */
function isBuiltShell(dir: string): boolean {
  const file = resolve(dir, 'index.html');
  if (!existsSync(file)) return false;
  try {
    const html = readFileSync(file, 'utf8');
    if (/\/src\/main\.tsx/.test(html)) return false;
    return /\/assets\/[^"']+\.(js|css)/.test(html);
  } catch {
    return false;
  }
}

// The zero-downtime deployer activates a release directory holding the built
// shell (index.html + assets/). A stale ./dist next to the sources can also look
// like a valid build, so the release must win: it is the one the deployer just
// wrote. STATIC_DIR remains the explicit escape hatch for other layouts.
const releaseDir = resolve(moduleDir, '..');
const distCandidates = [
  process.env['STATIC_DIR'],
  // The deployer activates `current -> releases/<stamp>` and puts the built shell
  // there. The project root also holds the source index.html, so `current` must be
  // probed explicitly; the root itself only qualifies when it really is a build.
  resolve(releaseDir, 'current'),
  releaseDir,
  resolve(moduleDir, '../dist'),
  resolve(process.cwd(), 'dist'),
  resolve(process.cwd(), 'current'),
  process.cwd()
].filter((value): value is string => typeof value === 'string' && value.length > 0);

// Prefer a candidate whose shell is the freshest: the release is written last,
// so when several directories qualify the newest index.html wins.
function shellMtime(dir: string): number {
  try { return statSync(resolve(dir, 'index.html')).mtimeMs; } catch { return 0; }
}
const usable = distCandidates.filter(isBuiltShell);
const distDir = usable.length
  ? usable.sort((a, b) => shellMtime(b) - shellMtime(a))[0]!
  : resolve(moduleDir, '../dist');
// Hashed assets may be cached forever, but the shell must always be revalidated so
// a new deploy is picked up. A stale shell was serving an old bundle to the user
// even though the release had already switched.
app.use(express.static(distDir,{setHeaders:(res,filePath)=>{
  if(filePath.endsWith('index.html')){
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
  }
}}));
app.get(/.*/, (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(resolve(distDir, 'index.html'), {
  headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' }
}));
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
/**
 * Core-prompt generation (Developer Prompt Strategy).
 *
 * Flow: brief choices + references → vision analysis (layer 1) → fill the hidden
 * core prompt → image model (layer 2). The core prompt is NEVER returned to the
 * client; only the resulting image and non-secret metadata are.
 *
 * Body: { workspaceId, mode, remark?, aspectRatio, references: [{slot, filename, dataUrl}] }
 */
app.post('/api/visual/core', authenticate, contentOnly, requireWorkspace(req=>req.body?.workspaceId), async (req, res) => {
  try {
    const body = req.body || {};
    const workspaceId = body.workspaceId;
    const mode: VisualMode = body.mode === 'human' ? 'human' : 'product';
    // Social feed post or persuasive poster/banner: the document makes this a
    // first-class choice, and it changes the whole visual language.
    const publication = normalizePublication(body.publication);
    const aspectRatio = ['1:1', '9:16', '16:9'].includes(body.aspectRatio) ? body.aspectRatio : '1:1';
    const remark = typeof body.remark === 'string' ? body.remark.slice(0, 600) : '';

    if (typeof workspaceId !== 'string' || !/^[\w-]{1,180}$/.test(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace' });
    }

    // ── References: either an uploaded .png/.jpg/.jpeg or a picture already in
    // the knowledge base. Both paths converge on validated bytes, so the vision
    // layer never cares where the reference came from.
    const rawRefs = Array.isArray(body.references) ? body.references : [];
    const references: ReferenceUpload[] = [];
    const seen = new Set<string>();
    for (const item of rawRefs) {
      if (!item || typeof item !== 'object') continue;
      const slot = String(item.slot || '');
      // REQUIRED_SLOTS is a per-mode map, not a list: validate the slot against
      // the full slot set, then check presence against the mode's requirements.
      if (!(REFERENCE_SLOTS as readonly string[]).includes(slot)) {
        return res.status(400).json({ error: `Unknown reference slot: ${slot}` });
      }
      if (seen.has(slot)) return res.status(400).json({ error: `Duplicate reference for ${slot}` });

      // Source A — a picture already stored in the workspace knowledge base.
      if (typeof item.kmsId === 'string' && item.kmsId) {
        if (!/^[A-Za-z0-9_-]{1,190}$/.test(item.kmsId)) {
          return res.status(400).json({ error: `Invalid knowledge base reference for ${slot}` });
        }
        const row = await pool.query(
          `SELECT k.style_frame FROM kms_documents k
             JOIN kms_document_workspaces a ON a.document_id = k.id
            WHERE a.workspace_id = $1 AND k.id = $2
              AND k.media_type IN ('photo','video') AND k.style_frame IS NOT NULL`,
          [workspaceId, item.kmsId]
        );
        const frame = row.rows[0]?.style_frame as Buffer | undefined;
        if (!frame || !frame.length) {
          return res.status(404).json({ error: `Referensi knowledge base untuk ${slot} tidak ditemukan` });
        }
        if (frame.length > 8 * 1024 * 1024) {
          return res.status(413).json({ error: `Reference ${slot} exceeds 8 MB` });
        }
        seen.add(slot);
        references.push({ slot: slot as ReferenceUpload['slot'], mime: 'jpeg', bytes: Buffer.from(frame) });
        continue;
      }

      // Source B — a file the user just picked.
      const filename = typeof item.filename === 'string' ? item.filename : '';
      if (!hasAcceptedExtension(filename)) {
        return res.status(415).json({ error: 'Reference must be a .png, .jpg or .jpeg file' });
      }
      const dataUrl = typeof item.dataUrl === 'string' ? item.dataUrl : '';
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return res.status(415).json({ error: `Reference ${slot} is not a base64 PNG/JPEG` });
      const bytes = Buffer.from(match[2]!, 'base64');
      if (bytes.length < 1024) return res.status(413).json({ error: `Reference ${slot} is too small to be a photo` });
      if (bytes.length > 8 * 1024 * 1024) return res.status(413).json({ error: `Reference ${slot} exceeds 8 MB` });
      seen.add(slot);
      references.push({ slot: slot as ReferenceUpload['slot'], mime: match[1]!, bytes });
    }

    const required = REQUIRED_SLOTS[mode];
    const missing = required.filter(slot => !seen.has(slot));
    if (missing.length) {
      return res.status(400).json({
        error: mode === 'human'
          ? `Mode human model butuh semua referensi. Belum ada: ${missing.join(', ')}.`
          : `Mode product only butuh referensi: ${required.join(', ')}. Belum ada: ${missing.join(', ')}.`,
        missing
      });
    }

    // The document asks which topic the visual serves, whether it is commercial,
    // and which kind of company publishes it.
    const briefContext = {
      topic: typeof body.topic === 'string' ? body.topic : (typeof body.draftTitle === 'string' ? body.draftTitle : ''),
      companyType: typeof body.companyType === 'string' ? body.companyType : '',
      commercial: body.commercial === true
    };
    // Poster design system: the client may name a theme/layout/size, otherwise
    // the publication context picks a sensible archetype.
    const design = {
      theme: body.theme,
      layout: body.layout ?? (publication === 'poster' ? 'hero' : 'product'),
      size: body.size ?? (aspectRatio === '9:16' ? 'story' : aspectRatio === '1:1' ? 'square' : 'portrait'),
      accent: body.primaryColor,
      accent2: body.accentColor
    };
    const plan = await buildCorePlan({ mode, remark, references, publication, briefContext, design });

    // Layer 2 — the image model receives the filled core prompt plus exact copy.
    const copyLines = [
      body.headline ? `Headline text (exact): ${JSON.stringify(String(body.headline).slice(0, 200))}` : '',
      body.ctaText ? `CTA text (exact): ${JSON.stringify(String(body.ctaText).slice(0, 120))}` : '',
      body.disclaimer ? `Disclaimer text (exact): ${JSON.stringify(String(body.disclaimer).slice(0, 200))}` : ''
    ].filter(Boolean).join('\n');

    // The copy fields are *optional decoration* on the artwork, not the request
    // itself. A long draft title must never fail the whole generation: clamp each
    // field to the model limit instead of rejecting the call.
    const clampCopy = (value: unknown, limit: number): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const text = value.trim();
      if (!text) return undefined;
      return text.length > limit ? text.slice(0, limit) : text;
    };

    // Layer 2 — the image model. When a reference exists it is sent as an actual
    // image (FLUX.2 image-to-image), not merely described in words: the document
    // requires every reference to be used in the result. If the provider cannot
    // serve image-to-image we degrade to text-to-image rather than failing.
    // Every reference must be used, so all of them travel to the image model.
    const referenceImages = references.map(item => item.bytes);
    let result;
    let usedReferenceImage = false;
    if (referenceImages.length) {
      try {
        const accounts = (await import('./visual.ts')).configuredAccountsForGeneration();
        const generated = await generateImageFromReference(accounts, 0, plan.prompt, referenceImages);
        result = {
          imageUrl: `data:image/jpeg;base64,${generated.image}`,
          format: 'image/jpeg',
          provider: 'Cloudflare Workers AI',
          model: '@cf/black-forest-labs/flux-2-klein-4b',
          dimensions: aspectRatio
        };
        usedReferenceImage = true;
      } catch (error) {
        console.warn('[visual/core] image-to-image unavailable, falling back to text-to-image',
          error instanceof Error ? error.message : error);
      }
    }
    if (!result) {
      result = await generateVisual(
        {
          workspaceId,
          prompt: plan.prompt,
          aspectRatio,
          headline: clampCopy(body.headline, 200),
          ctaText: clampCopy(body.ctaText, 120),
          disclaimer: clampCopy(body.disclaimer, 200),
          primaryColor: body.primaryColor,
          accentColor: body.accentColor
        },
        undefined
      );
    }

    res.json({
      imageUrl: result.imageUrl,
      format: result.format,
      provider: result.provider,
      model: result.model,
      dimensions: aspectRatio,
      mode,
      publication,
      design: { theme: plan.prompt.includes('Design system:') ? design.theme ?? null : null, layout: design.layout, size: design.size },
      usedReferenceImage,
      referencesUsed: usedReferenceImage ? references.length : 0,
      // Non-secret diagnostics only. The core prompt itself is intentionally absent.
      referencesAnalyzed: plan.referencesAnalyzed,
      referenceFailures: plan.referenceFailures,
      slotsFromHuman: plan.filledFromHuman,
      slotsDefaulted: plan.usedDefaults,
      hasCopy: Boolean(copyLines)
    });
  } catch (error) {
    const e = error as VisualError;
    // Log the real cause: a bare 500 with no trace made this failure
    // undiagnosable from the browser console alone.
    console.error('[visual/core] generation failed', {
      status: e.status,
      code: e.code,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 4).join(' | ') : undefined
    });
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Visual generation failed', code: e.code || 'VISUAL_ERROR' });
  }
});

app.get('/api/visual/references',authenticate,contentOnly,requireWorkspace(req=>req.query.workspaceId),async(req,res,next)=>{try{
  // Only pictures can be a visual reference, and only ones that carry a frame we
  // can actually show. Returning an entry without a thumbnail would give the user
  // a blank card they cannot judge before choosing it.
  const rows=await pool.query(
    `SELECT k.id,k.title,k.media_type AS "mediaType",k.vision_description AS "visionDescription",
            k.filename,k.created_at AS "createdAt"
       FROM kms_documents k
       JOIN kms_document_workspaces a ON a.document_id=k.id
      WHERE a.workspace_id=$1 AND k.media_type IN ('photo','video')
        AND k.style_frame IS NOT NULL
      ORDER BY k.created_at DESC LIMIT 100`,
    [req.query.workspaceId]
  );
  res.json(rows.rows);
}catch(error){next(error);}});

// Thumbnail for a knowledge-base picture, used by the reference picker.
// Kept separate from the list so the grid stays light on large corpora.
app.get('/api/visual/references/:id/thumbnail',authenticate,contentOnly,requireWorkspace(req=>req.query.workspaceId),async(req,res,next)=>{try{
  const rows=await pool.query(
    `SELECT k.style_frame FROM kms_documents k
       JOIN kms_document_workspaces a ON a.document_id=k.id
      WHERE a.workspace_id=$1 AND k.id=$2 AND k.style_frame IS NOT NULL`,
    [req.query.workspaceId,String(req.params.id)]
  );
  const frame=rows.rows[0]?.style_frame as Buffer|undefined;
  if(!frame?.length)return res.status(404).json({error:'Referensi tidak ditemukan'});
  res.setHeader('Content-Type','image/jpeg');
  res.setHeader('Cache-Control','private, max-age=300');
  res.end(frame);
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
    pool.query('SELECT count(*)::int AS count FROM kms_documents'),
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
/**
 * Workspace field rules.
 *
 * The UI labels the code as "3-6 characters", but the API accepted 1 and 26,
 * and accepted 5000-character names that broke the table layout. The server is
 * the authority, so the same rules apply to every caller.
 */
const WORKSPACE_CODE = /^[A-Z0-9][A-Z0-9-]{2,5}$/;
function validateWorkspaceFields(input: { name?: unknown; code?: unknown; sector?: unknown; city?: unknown }):
  { error: string } | { name: string; code: string; sector: string; city: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  const sector = typeof input.sector === 'string' ? input.sector.trim() : '';
  const city = typeof input.city === 'string' ? input.city.trim() : '';

  if (!name) return { error: 'Nama workspace wajib diisi.' };
  if (name.length > 120) return { error: 'Nama workspace maksimal 120 karakter.' };
  if (!code) return { error: 'Kode unit wajib diisi.' };
  if (!WORKSPACE_CODE.test(code)) return { error: 'Kode unit harus 3-6 karakter: huruf, angka, atau tanda hubung.' };
  if (!sector) return { error: 'Sektor wajib diisi.' };
  if (sector.length > 80) return { error: 'Sektor maksimal 80 karakter.' };
  if (!city) return { error: 'Kota wajib diisi.' };
  if (city.length > 80) return { error: 'Kota maksimal 80 karakter.' };
  return { name, code, sector, city };
}

app.post('/api/admin/workspaces',globalOnly,async(req,res,next)=>{try{const {companyId,name,code,sector,city}=req.body||{};if(!isNonEmptyString(companyId))return res.status(400).json({error:'companyId wajib diisi'});const v=validateWorkspaceFields({name,code,sector,city});if('error' in v)return res.status(400).json({error:v.error});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code,company_id AS "companyId"',[`org-${randomUUID()}`,companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
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
      (SELECT count(*)::int FROM kms_documents k WHERE k.workspace_id=o.id) AS "sourceCount",
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
app.post('/api/corporate/workspaces',corporateOnly,async(req,res,next)=>{try{const u=res.locals.user;const {name,code,sector,city,companyId}=req.body||{};if(u.role==='superadmin'&&!isNonEmptyString(companyId))return res.status(400).json({error:'companyId wajib diisi'});const v=validateWorkspaceFields({name,code,sector,city});if('error' in v)return res.status(400).json({error:v.error});res.status(201).json((await pool.query('INSERT INTO organizations(id,company_id,name,code,sector,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,code',[`org-${randomUUID()}`,u.role==='superadmin'?companyId:u.companyId,name,code.toUpperCase(),sector,city])).rows[0]);}catch(e){next(e);}});
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
/**
 * Deterministic free-slot search used only when the model cannot answer.
 * Mirrors the client rules: prefer platform weekdays, one post per day.
 */
function freeScheduleSlot(platform:string,todayStr:string,booked:Array<{date:string;time:string}>){
  const WEEKDAYS:Record<string,number[]>={instagram:[2,3,4],facebook:[3,4,5],twitter:[1,2,3],linkedin:[2,3,4],youtube:[5,6,0]};
  const TIMES:Record<string,string>={instagram:'19:00',facebook:'12:00',twitter:'12:00',linkedin:'08:00',youtube:'17:00'};
  const preferred=WEEKDAYS[platform]||[2,3,4];
  const baseTime=TIMES[platform]||'19:00';
  const times=[baseTime,'12:00','09:00','20:00','17:00','08:00'];
  const taken=new Set(booked.map(b=>`${b.date}T${b.time}`));
  const busyDates=new Set(booked.map(b=>b.date));
  const base=new Date(`${todayStr}T00:00:00`);
  const labels=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  let fallback:{date:string;time:string;reason:string}|null=null;
  for(let offset=1;offset<=30;offset++){
    const day=new Date(base);day.setDate(base.getDate()+offset);
    const date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    const good=preferred.includes(day.getDay());
    for(const time of times){
      if(taken.has(`${date}T${time}`))continue;
      const slot={date,time,reason:`${labels[day.getDay()]} ${date} pukul ${time} WIB masih kosong untuk ${platform}.`};
      if(good&&!busyDates.has(date))return slot;
      if(!fallback)fallback=slot;
    }
  }
  return fallback||{date:todayStr,time:baseTime,reason:'Semua slot mendekati penuh; pilih manual.'};
}

/**
 * Two backup slots on different days, so the UI always has alternatives to show
 * even when the model is unavailable and we fall back to deterministic search.
 */
function freeScheduleAlternatives(platform:string,todayStr:string,booked:Array<{date:string;time:string}>,chosen:{date:string;time:string}){
  const out:Array<{date:string;time:string;reason:string}>=[];
  const taken=[...booked,{date:chosen.date,time:chosen.time}];
  let cursor=todayStr;
  while(out.length<2){
    const slot=freeScheduleSlot(platform,cursor,taken);
    if(!slot||out.some(o=>o.date===slot.date)||slot.date===chosen.date)break;
    out.push(slot);
    taken.push({date:slot.date,time:slot.time});
    // move the cursor past the found day so the next slot lands on a new date
    cursor=slot.date;
  }
  return out;
}

app.post('/api/workspaces/:workspaceId/schedule-suggestion',requireMember(req=>String(req.params.workspaceId)),async(req,res,next)=>{
  try{
    const workspaceId=String(req.params.workspaceId);
    const body=req.body||{};
    const platform=typeof body.platform==='string'?body.platform:'instagram';
    const todayStr=typeof body.today==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(body.today)?body.today:new Date().toISOString().slice(0,10);
    const existing=await listSchedules(workspaceId);
    const booked=existing
      .filter(item=>item.status!=='draft')
      .map(item=>({date:item.date,time:item.time,platform:item.platform,title:item.title}));
    try{
      const suggestion=await ragSuggestSchedule({
        platform,
        title:typeof body.title==='string'?body.title:'',
        pillar:typeof body.pillar==='string'?body.pillar:undefined,
        campaign:typeof body.campaign==='string'?body.campaign:undefined,
        caption:typeof body.caption==='string'?body.caption:undefined,
        audience:typeof body.audience==='string'?body.audience:undefined,
        todayStr,
        booked
      });
      res.json({...suggestion,source:'model'});
    }catch(error){
      // The model is the primary planner, but a scheduling UI must still work when
      // the provider is throttled. Deterministic free-slot search is the fallback.
      console.warn('[schedule] model suggestion failed:',error instanceof Error?error.message:error);
      const slot=freeScheduleSlot(platform,todayStr,booked);
      // The client renders alternatives.map(); never return a shape without it.
      const alternatives=freeScheduleAlternatives(platform,todayStr,booked,slot);
      res.json({...slot,alternatives,source:'fallback'});
    }
  }catch(error){next(error);}
});
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
    const answer=await ragQuery(workspaceId,query,undefined,await authorizedKmsIds(String(workspaceId)));
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
app.post('/api/rag/query',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res)=>{try{const{workspaceId,query}=req.body||{};if(!isNonEmptyString(workspaceId))return res.status(400).json({error:'workspaceId is required'});if(!isNonEmptyString(query))return res.status(400).json({error:'query is required'});const answer=await ragQuery(workspaceId,query,undefined,await authorizedKmsIds(String(workspaceId)));if(answer.grounded){await markSourcesIndexed(answer.sources,ids=>pool.query('UPDATE kms_documents SET indexed=true WHERE id=ANY($1::text[])',[ids]),error=>console.warn('[rag] indexed metadata update failed',error instanceof Error?error.message:error));}res.json(answer);}catch(error){const message=error instanceof Error?error.message:'unknown error';console.error('[rag] query failed',{message,cause:error instanceof Error&&error.cause?String(error.cause):undefined});res.status(502).json({error:`KMS query gagal: ${message}`});}});
app.post('/api/rag/jobs',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res)=>{try{const{workspaceId,query}=req.body||{};if(!isNonEmptyString(workspaceId)||!isNonEmptyString(query))return res.status(400).json({error:'workspaceId and query are required'});const id=randomUUID();await pool.query("INSERT INTO rag_jobs(id,workspace_id,user_id,status) VALUES($1,$2,$3,'running')",[id,workspaceId,String(res.locals.user?.id||'')]);await sweepRagJobs();void runRagJob(id,workspaceId,query);res.status(202).json({jobId:id,status:'running'});}catch(error){next(error);}});
app.get('/api/rag/jobs/:id',async(req,res,next)=>{try{const result=await pool.query('SELECT workspace_id AS "workspaceId",status,answer,error FROM rag_jobs WHERE id=$1',[String(req.params.id)]);const job=result.rows[0];if(!job)return res.status(404).json({error:'Job not found or expired'});if(!permitted(res.locals.user,job.workspaceId))return res.status(403).json({error:'Workspace access denied'});if(job.status==='done')return res.json({status:'done',answer:job.answer});if(job.status==='error')return res.json({status:'error',error:job.error});res.json({status:'running'});}catch(error){next(error);}});
app.post('/api/rag/refine',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{draftContent,promptAction,kind}=req.body||{};if(!isNonEmptyString(draftContent)||!isNonEmptyString(promptAction))return res.status(400).json({error:'draftContent and promptAction required'});res.json(await ragRefine(String(req.body.workspaceId),draftContent,promptAction,typeof kind==='string'?kind:undefined));}catch(error){next(error);}});
app.post('/api/rag/plan',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const plan=cleanPlanRequest(req.body);if(typeof plan==='string')return res.status(400).json({error:plan});const result=await queryKnowledge(buildPlanPrompt(plan),kmsConfig(),fetch,await authorizedKmsIds(String(req.body.workspaceId)));const slots=parsePlanSlots(result.answer||'',plan);if(!slots.length)return res.status(502).json({error:'AI belum menghasilkan rencana yang valid. Coba lagi atau ubah tema.'});const sources=[...new Set((result.sources||[]).map((s:any)=>s.document_name).filter(Boolean))];res.json({slots,sources,model:result.model});}catch(error){next(error);}});
app.post('/api/rag/compose',contentOnly,requireWorkspace(req=>req.body?.workspaceId),async(req,res,next)=>{try{const{briefText,feedback}=req.body||{};if(!isNonEmptyString(briefText))return res.status(400).json({error:'briefText is required'});res.json(await queryKnowledge(`Tulis naskah baru berdasarkan brief dan dokumen resmi, tanpa fakta tambahan. ${briefText}${typeof feedback==='string'?`\nPerbaikan: ${feedback.slice(0,1000)}`:''}`,kmsConfig(),fetch,await authorizedKmsIds(req.body.workspaceId)));}catch(error){next(error);}});
// The former workspace-specific RAG service is intentionally not synced/pruned from the shared KMS corpus.
app.post(['/api/rag/sync','/api/rag/prune'],knowledgeManager,(_req,res)=>res.status(410).json({error:'Gunakan unggah dan hapus dokumen pada KMS bersama'}));
app.use('/api',(_req,res)=>{res.status(404).json({error:'Endpoint not found'});});
/**
 * Error mapping.
 *
 * Raw driver messages used to reach the browser ("violates foreign key
 * constraint \"organizations_company_id_fkey\""), which leaks schema names and
 * confuses users. Postgres codes are translated into a small, honest set of
 * responses; anything unrecognised becomes a generic 500 and is logged server-side
 * only.
 */
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const code = (error as { code?: string }).code;
  const constraint = String((error as { constraint?: string }).constraint || '');

  if (code === '23505') {
    if (constraint.includes('code')) return res.status(409).json({ error: 'Kode tersebut sudah dipakai. Gunakan kode lain.' });
    if (constraint.includes('email')) return res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
    return res.status(409).json({ error: 'Data dengan nilai unik tersebut sudah ada.' });
  }
  if (code === '23503') {
    return res.status(422).json({ error: 'Data induk yang dirujuk tidak ditemukan. Periksa pilihan Anda.' });
  }
  if (code === '23502') {
    return res.status(422).json({ error: 'Ada kolom wajib yang belum diisi.' });
  }
  if (code === '22P02') {
    return res.status(400).json({ error: 'Format data tidak valid.' });
  }
  // Application-level errors that deliberately carry a user-facing message.
  const status = (error as { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 500 && error instanceof Error) {
    return res.status(status).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Terjadi kesalahan pada server. Coba lagi atau hubungi administrator.' });
});

const port=Number(process.env.PORT||process.env.API_PORT||3005);
if(process.env.NODE_ENV!=='test') {
  runMigrations()
    .then(provisionSuperadmin)
    .then(() => app.listen(port, '0.0.0.0', () => {
      console.log(`VibeContent API listening on 0.0.0.0:${port}`);
      // Startup fingerprint: booleans only, never the secret values. This makes
      // "is the key actually loaded in this process?" answerable from logs.
      console.log('[config] rag=%s kms=%s vision=%s image=%s kb=%s',
        ragConfigured(),
        Boolean(process.env.KMS_API_URL && process.env.KMS_API_KEY),
        Boolean(process.env['9ROUTER_BASE_URL'] && process.env['9ROUTER_API_KEY']),
        Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
        process.env.RAG_KNOWLEDGE_BASE_ID || 'kb_vibecontent');
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
