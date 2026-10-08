import type { AuditLog, BrandProfile, ContentBrief, ContentDraft, KnowledgeDocument, ScheduledContent, SchedulePillar, SchedulePlatform, User, Workspace, AuthUser } from '../types';
import type { AppSettings, RagOptionsPayload } from './appSettings';

export type PlanSlot={date:string;time:string;platform:SchedulePlatform;pillar:SchedulePillar|null;title:string;angle:string;source:string};
export type PlanRequestBody={workspaceId:string;mode:'plan'|'gap';monthLabel:string;theme:string;count:number;dates:string[];platforms:SchedulePlatform[];pillars:SchedulePillar[];moments:string[];existingTitles:string[]};

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL = typeof window === 'undefined' ? configuredApiUrl || 'http://127.0.0.1:3005'
  : configuredApiUrl && !/^http:\/\/(127\.0\.0\.1|localhost):3005$/.test(configuredApiUrl) ? configuredApiUrl
  : `${window.location.protocol}//${window.location.hostname}:3005`;

let authToken = typeof localStorage !== 'undefined' ? (localStorage.getItem('vibecontent_token') || '') : '';

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('vibecontent_token', token);
    else localStorage.removeItem('vibecontent_token');
  }
}

type Bootstrap = { workspaces: Workspace[]; users: User[]; brandProfile: BrandProfile; documents: KnowledgeDocument[]; drafts: ContentDraft[]; briefs: ContentBrief[]; auditLogs: AuditLog[]; settings: AppSettings | null };

// Fired whenever the API rejects a request as unauthenticated (expired/idle session),
// so the app can drop straight back to the login screen instead of silently failing.
let unauthorizedHandler: (() => void) | null = null;
export const onUnauthorized = (handler: (() => void) | null) => { unauthorizedHandler = handler; };

// The server is the source of truth for the idle window; it advertises it on every
// authenticated response so the client timer can never drift from the real policy.
let idleMs = 30 * 60 * 1000;
const captureIdle = (response: Response) => {
  const seconds = Number(response.headers.get('X-Session-Idle-Seconds'));
  if (Number.isFinite(seconds) && seconds > 0) idleMs = seconds * 1000;
};
export const sessionIdleMs = () => idleMs;

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const headers: Record<string, string> = { 'Content-Type':'application/json', ...(init?.headers as any || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response=await fetch(`${API_URL}${path}`,{...init,credentials:'include',headers});
  captureIdle(response);
  if(response.status===401 && path!=='/api/auth/login' && path!=='/api/auth/logout') {
    unauthorizedHandler?.();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('vibecontent_logout'));
  }
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API ${response.status}`);}
  return response.json();
}

export type AdminOverview={
  companies:{id:string;name:string;workspaceCount:number;userCount:number}[];
  workspaces:number;
  users:{total:number;creators:number;corporate:number;superadmins:number};
  drafts:number;
  knowledgeSources:number;
  auditEvents:number;
};
export type CompanyDashboard = {
  company: {id:string;name:string};
  workspaces: {id:string;name:string;code:string;sector:string;city:string;creatorCount:number;draftCount:number;approvedCount:number;reviewCount:number;sourceCount:number;briefCount:number;auditCount:number}[];
  users: {id:string;name:string;role:string;workspaces:string[]}[];
  userCount: number;
  recentDrafts: {id:string;title:string;status:string;format:string;updatedAt:string;workspaceId:string;workspaceName:string}[];
};
export type AdminUser={id:string;name:string;email:string;role:string;companyId:string|null;workspaceIds:string[]};

export type RagHit={document_id:string;chunk_id:string;content:string;score:number;page?:number|null;document_name?:string|null;section?:string|null;source_url?:string|null};
export type RagAnswer={answer:string;grounded:boolean;sources:RagHit[];model?:string;no_answer_reason?:string|null};
export type RagStatus={configured:boolean;ready:boolean;dependencies?:Record<string,string>;detail?:Record<string,unknown>;error?:string};

export const apiService={
  bootstrap:(workspaceId?:string)=>request<Bootstrap>(`/api/bootstrap${workspaceId?`?workspaceId=${encodeURIComponent(workspaceId)}`:''}`),
  login: async (email: string, password: string) => {
    const res = await request<AuthUser & { token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },
  me:async()=>{const response=await fetch(`${API_URL}/api/auth/me`,{credentials:'include'});captureIdle(response);if(response.status===401)return null;if(!response.ok)throw new Error('Unable to restore session');return response.json() as Promise<AuthUser>;},
  logout: async () => {
    setAuthToken('');
    return request<{ok:boolean}>('/api/auth/logout',{method:'POST'});
  },
  clearAll:()=>request<{ok:boolean}>('/api/data',{method:'DELETE'}),
  onboard: async (input:{organizationName:string;code:string;sector:string;city:string;adminName:string;adminEmail:string;adminPassword?:string}) => {
    const res = await request<{workspace:Workspace;user:User & {token?: string}}>('/api/onboarding',{method:'POST',body:JSON.stringify(input)});
    if (res.user.token) setAuthToken(res.user.token);
    return res;
  },
  register:(input:{name:string;email:string;password:string;workspaceCode?:string})=>request<{id:string;name:string;email:string;hasWorkspace:boolean}>('/api/auth/register',{method:'POST',body:JSON.stringify(input)}),
  corporateDashboard:()=>request<CompanyDashboard>('/api/corporate/dashboard'),
  updateCorporateSettings:(name:string)=>request<{id:string;name:string}>('/api/corporate/settings',{method:'PUT',body:JSON.stringify({name})}),
  changePassword:(currentPassword:string,newPassword:string)=>request<{ok:boolean}>('/api/auth/password',{method:'PUT',body:JSON.stringify({currentPassword,newPassword})}),
  corporateUsers:()=>request<{id:string;name:string;email:string;workspaceIds:string[]}[]>('/api/corporate/users'),
  createCorporateUser:(input:{name:string;email:string;password:string})=>request<{id:string;name:string;email:string;workspaceIds:string[]}>('/api/corporate/users',{method:'POST',body:JSON.stringify(input)}),
  updateCorporateUser:(id:string,input:{name:string;email:string;password?:string})=>request<{id:string;name:string;email:string}>(`/api/corporate/users/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(input)}),
  deleteCorporateUser:(id:string)=>request<{ok:boolean}>(`/api/corporate/users/${encodeURIComponent(id)}`,{method:'DELETE'}),
  assignCorporateUser:(id:string,workspaceIds:string[])=>request<{workspaceIds:string[]}>(`/api/corporate/users/${encodeURIComponent(id)}/workspaces`,{method:'PUT',body:JSON.stringify({workspaceIds})}),
  corporateWorkspaces:()=>request<Workspace[]>('/api/corporate/workspaces'),
  createCorporateWorkspace:(input:{name:string;code:string;sector:string;city:string})=>request<Workspace>('/api/corporate/workspaces',{method:'POST',body:JSON.stringify(input)}),
  updateCorporateWorkspace:(id:string,input:{name:string;code:string;sector:string;city:string})=>request<Workspace>(`/api/corporate/workspaces/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(input)}),
  deleteCorporateWorkspace:(id:string)=>request<{ok:boolean}>(`/api/corporate/workspaces/${encodeURIComponent(id)}`,{method:'DELETE'}),
  adminOverview:()=>request<AdminOverview>('/api/admin/overview'),
  adminCompanies:()=>request<{id:string;name:string}[]>('/api/admin/companies'),
  adminUsers:()=>request<AdminUser[]>('/api/admin/users'),
  adminWorkspaces:()=>request<{id:string;name:string;code:string;sector:string;city:string;companyId:string}[]>('/api/admin/workspaces'),
  adminMemberships:()=>request<{workspaceId:string;userId:string;role:string;active:boolean;userName:string;workspaceName:string;companyId:string}[]>('/api/admin/memberships'),
  assignAdminMembership:(userId:string,workspaceId:string)=>request<{ok:boolean}>('/api/admin/memberships',{method:'POST',body:JSON.stringify({userId,workspaceId})}),
  removeAdminMembership:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/admin/memberships/${encodeURIComponent(workspaceId)}/${encodeURIComponent(userId)}`,{method:'DELETE'}),
  adminAudit:()=>request<{id:string;createdAt:string;action:string;actorName:string;objectType:string;objectName:string;workspaceName:string}[]>('/api/admin/audit'),
  createCompany:(name:string)=>request<{id:string;name:string}>('/api/admin/companies',{method:'POST',body:JSON.stringify({name})}),
  createAdminUser:(input:{name:string;email:string;password:string;role:'creator'|'corporate'|'superadmin';companyId?:string;workspaceIds?:string[]})=>request<{id:string;name:string}>('/api/admin/users',{method:'POST',body:JSON.stringify(input)}),
  createAdminWorkspace:(input:{companyId:string;name:string;code:string;sector:string;city:string})=>request<Workspace>('/api/admin/workspaces',{method:'POST',body:JSON.stringify(input)}),
  updateAdminCompany:(id:string,name:string)=>request<{id:string;name:string}>(`/api/admin/companies/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({name})}),
  deleteAdminCompany:(id:string)=>request<{ok:boolean}>(`/api/admin/companies/${encodeURIComponent(id)}`,{method:'DELETE'}),
  updateAdminUser:(id:string,input:{name:string;email:string;role:'creator'|'corporate'|'superadmin';companyId?:string|null;password?:string})=>request<{id:string;name:string;email:string;role:string;companyId:string|null}>(`/api/admin/users/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(input)}),
  deleteAdminUser:(id:string)=>request<{ok:boolean}>(`/api/admin/users/${encodeURIComponent(id)}`,{method:'DELETE'}),
  updateAdminWorkspace:(id:string,input:{companyId:string;name:string;code:string;sector:string;city:string})=>request<Workspace>(`/api/admin/workspaces/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(input)}),
  deleteAdminWorkspace:(id:string)=>request<{ok:boolean}>(`/api/admin/workspaces/${encodeURIComponent(id)}`,{method:'DELETE'}),
  userWorkspaces:(userId:string)=>request<{id:string;name:string;code:string;role:string}[]>(`/api/users/${userId}/workspaces`),
  ragStatus:()=>request<RagStatus>('/api/rag/status'),
  ragSearch:(workspaceId:string,query:string,options?:RagOptionsPayload|number)=>request<{results:RagHit[]}>(`/api/rag/search`,{method:'POST',body:JSON.stringify({workspaceId,query,...(typeof options === 'number' ? {topK:options} : {options})})}),
  ragQuery:(workspaceId:string,query:string,options?:RagOptionsPayload|number)=>request<RagAnswer>(`/api/rag/query`,{method:'POST',body:JSON.stringify({workspaceId,query,...(typeof options === 'number' ? {topK:options} : {options})})}),
  ragRefine:(workspaceId:string,draftContent:string,promptAction:string)=>request<{answer:string;model?:string}>(`/api/rag/refine`,{method:'POST',body:JSON.stringify({workspaceId,draftContent,promptAction})}),
  generateVisual:(input:import('./visualScene').VisualInput)=>request<{imageUrl:string;provider:string;model:string;llmModel:string;steps:number;fallback:false;format:string;prompt:string;imagePrompt:string;dimensions:string}>('/api/visual/generate',{method:'POST',body:JSON.stringify(input)}),
  saveDraft:(draft:ContentDraft,brief?:ContentBrief)=>request<ContentDraft>(`/api/drafts/${draft.id}`,{method:'PUT',body:JSON.stringify({...draft,brief})}),
  fetchPostImage:(workspaceId:string,id:string)=>request<ScheduledContent>(`/api/organizations/${workspaceId}/schedules/${id}/post-image`,{method:'POST'}),
  setScheduleImage:(workspaceId:string,id:string,image:string|null,source?:'upload'|'ai')=>request<ScheduledContent>(`/api/organizations/${workspaceId}/schedules/${id}/custom-image`,{method:'PUT',body:JSON.stringify({image,source})}),
  ragPlan:(body:PlanRequestBody)=>request<{slots:PlanSlot[];sources:string[];model?:string}>('/api/rag/plan',{method:'POST',body:JSON.stringify(body)}),
  ragCompose:(workspaceId:string,briefText:string,feedback?:string)=>request<{answer:string;model?:string}>(`/api/rag/compose`,{method:'POST',body:JSON.stringify({workspaceId,briefText,feedback})}),
  ragSync:(workspaceId:string)=>request<{knowledgeBaseId:string;indexed:number;failed:number;total:number}>(`/api/rag/sync`,{method:'POST',body:JSON.stringify({workspaceId})}),
  ragPrune:(workspaceId:string)=>request<{knowledgeBaseId:string;removed:number;failed:number;total:number}>(`/api/rag/prune`,{method:'POST',body:JSON.stringify({workspaceId})}),
  saveBrand:(profile:BrandProfile)=>request<BrandProfile>('/api/brand-profile',{method:'PUT',body:JSON.stringify(profile)}),
  deleteBrand:(workspaceId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/brand-profile`,{method:'DELETE'}),
  getSettings:(workspaceId:string)=>request<AppSettings|null>(`/api/workspaces/${workspaceId}/settings`),
  saveSettings:(workspaceId:string,settings:AppSettings)=>request<AppSettings>(`/api/workspaces/${workspaceId}/settings`,{method:'PUT',body:JSON.stringify(settings)}),

  createUser:(workspaceId:string,input:Omit<User,'id'|'workspaceId'|'avatar'> & { password?: string })=>request<User & { tempPassword?: string }>(`/api/organizations/${workspaceId}/users`,{method:'POST',body:JSON.stringify(input)}),
  deleteUser:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/users/${userId}`,{method:'DELETE'}),
  listSchedules:(workspaceId:string)=>request<ScheduledContent[]>(`/api/workspaces/${workspaceId}/schedules`),
  saveSchedule:(item:ScheduledContent)=>request<ScheduledContent>(`/api/schedules/${item.id}`,{method:'PUT',body:JSON.stringify(item)}),
  deleteSchedule:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/schedules/${id}`,{method:'DELETE'}),
  deleteDraft:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/drafts/${id}`,{method:'DELETE'}),

  saveKnowledgeSource: (source: KnowledgeDocument) => request<KnowledgeDocument & {ragSynced?: boolean}>(`/api/knowledge-sources/${source.id}`, { method: 'PUT', body: JSON.stringify(source) }),
  deleteKnowledgeSource: (workspaceId: string, id: string) => request<{ok: boolean, ragSynced?: boolean}>(`/api/organizations/${workspaceId}/knowledge-sources/${id}`, { method: 'DELETE' })
};

// ---------------------------------------------------------------------------
// Live cross-role propagation.
// The server publishes a payload-free "change" nudge after every successful
// mutation. Screens subscribe here and simply re-read the same root, so a write
// on the admin side appears immediately on an already-open corporate/creator
// screen. Auto-reconnects with capped exponential backoff; safe to call twice.
// ---------------------------------------------------------------------------
export type ChangeSignal = { kind:'change'; at:string; actorId:string; actorRole:string; companyId:string|null; workspaceIds:string[]; userIds:string[]; method:string; path:string };
export const eventsUrl = () => `${API_URL}/api/events`;
export const subscribeToEvents = (onChange: (signal: ChangeSignal) => void): (() => void) => {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return () => {};
  let source: EventSource | null = null;
  let closed = false;
  let backoff = 1000;
  const connect = () => {
    if (closed) return;
    source = new EventSource(eventsUrl(), { withCredentials: true });
    source.addEventListener('ready', () => { backoff = 1000; });
    source.addEventListener('change', (event) => {
      try { onChange(JSON.parse((event as MessageEvent).data) as ChangeSignal); } catch { /* ignore malformed frame */ }
    });
    source.onerror = () => {
      source?.close();
      if (closed) return;
      // EventSource retries on its own, but a closed/failed stream needs a manual
      // reconnect after a backoff so a downed API can't hammer the server.
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 30000);
    };
  };
  connect();
  return () => { closed = true; source?.close(); };
};
