import type { AuditLog, BrandProfile, ContentBrief, ContentDraft, KnowledgeDocument, User, Workspace } from '../types';
import type { AppSettings, RagOptionsPayload } from './appSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3005';

let authToken = localStorage.getItem('vibecontent_token') || '';

export function setAuthToken(token: string) {
  authToken = token;
  if (token) localStorage.setItem('vibecontent_token', token);
  else localStorage.removeItem('vibecontent_token');
}

type Bootstrap = { workspaces: Workspace[]; users: User[]; brandProfile: BrandProfile; documents: KnowledgeDocument[]; drafts: ContentDraft[]; briefs: ContentBrief[]; auditLogs: AuditLog[]; settings: AppSettings | null };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const headers: Record<string, string> = { 'Content-Type':'application/json', ...(init?.headers as any || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response=await fetch(`${API_URL}${path}`,{...init,headers});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API ${response.status}`);}
  return response.json();
}

export type RagHit={document_id:string;chunk_id:string;content:string;score:number;page?:number|null;document_name?:string|null;section?:string|null;source_url?:string|null};
export type RagAnswer={answer:string;grounded:boolean;sources:RagHit[];model?:string;no_answer_reason?:string|null};
export type RagStatus={configured:boolean;ready:boolean;dependencies?:Record<string,string>;detail?:Record<string,unknown>;error?:string};

export const apiService={
  bootstrap:(workspaceId?:string)=>request<Bootstrap>(`/api/bootstrap${workspaceId?`?workspaceId=${encodeURIComponent(workspaceId)}`:''}`),
  clearAll:()=>request<{ok:boolean}>('/api/data',{method:'DELETE'}),
  onboard: async (input:{organizationName:string;code:string;sector:string;city:string;adminName:string;adminEmail:string;adminPassword?:string}) => {
    const res = await request<{workspace:Workspace;user:User & {token?: string}}>('/api/onboarding',{method:'POST',body:JSON.stringify(input)});
    // Onboarding automatically logs the user in if the backend supports it, wait, currently my /api/onboarding doesn't return a token.
    // I should modify backend /api/onboarding to return a token too.
    if (res.user.token) setAuthToken(res.user.token);
    return res;
  },
  register:(input:{name:string;email:string;password:string;workspaceCode?:string})=>request<{id:string;name:string;email:string;hasWorkspace:boolean}>('/api/auth/register',{method:'POST',body:JSON.stringify(input)}),
  login: async (email:string,password:string) => {
    const res = await request<{id:string;name:string;email:string;workspaces:{id:string;name:string;code:string;role:string}[];token?:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});
    if (res.token) setAuthToken(res.token);
    return res;
  },
  userWorkspaces:(userId:string)=>request<{id:string;name:string;code:string;role:string}[]>(`/api/users/${userId}/workspaces`),
  ragStatus:()=>request<RagStatus>('/api/rag/status'),
  ragSearch:(workspaceId:string,query:string,options?:RagOptionsPayload|number)=>request<{results:RagHit[]}>(`/api/rag/search`,{method:'POST',body:JSON.stringify({workspaceId,query,...(typeof options === 'number' ? {topK:options} : {options})})}),
  ragQuery:(workspaceId:string,query:string,options?:RagOptionsPayload|number)=>request<RagAnswer>(`/api/rag/query`,{method:'POST',body:JSON.stringify({workspaceId,query,...(typeof options === 'number' ? {topK:options} : {options})})}),
  ragRefine:(workspaceId:string,draftContent:string,promptAction:string)=>request<{answer:string;model?:string}>(`/api/rag/refine`,{method:'POST',body:JSON.stringify({workspaceId,draftContent,promptAction})}),
  saveDraft:(draft:ContentDraft,brief?:ContentBrief)=>request<ContentDraft>(`/api/drafts/${draft.id}`,{method:'PUT',body:JSON.stringify({...draft,brief})}),
  ragCompose:(workspaceId:string,briefText:string)=>request<{answer:string;model?:string}>(`/api/rag/compose`,{method:'POST',body:JSON.stringify({workspaceId,briefText})}),
  ragSync:(workspaceId:string)=>request<{knowledgeBaseId:string;indexed:number;failed:number;total:number}>(`/api/rag/sync`,{method:'POST',body:JSON.stringify({workspaceId})}),
  ragPrune:(workspaceId:string)=>request<{knowledgeBaseId:string;removed:number;failed:number;total:number}>(`/api/rag/prune`,{method:'POST',body:JSON.stringify({workspaceId})}),
  generateVisual:(input:import('./visualScene').VisualInput)=>request<{imageUrl:string;provider:string;model:string;fallback:false;format:string}>('/api/visual/generate',{method:'POST',body:JSON.stringify(input)}),
  saveBrand:(profile:BrandProfile)=>request<BrandProfile>('/api/brand-profile',{method:'PUT',body:JSON.stringify(profile)}),
  deleteBrand:(workspaceId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/brand-profile`,{method:'DELETE'}),
  getSettings:(workspaceId:string)=>request<AppSettings|null>(`/api/workspaces/${workspaceId}/settings`),
  saveSettings:(workspaceId:string,settings:AppSettings)=>request<AppSettings>(`/api/workspaces/${workspaceId}/settings`,{method:'PUT',body:JSON.stringify(settings)}),

  createUser:(workspaceId:string,input:Omit<User,'id'|'workspaceId'|'avatar'> & { password?: string })=>request<User & { tempPassword?: string }>(`/api/organizations/${workspaceId}/users`,{method:'POST',body:JSON.stringify(input)}),
  deleteUser:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/users/${userId}`,{method:'DELETE'}),
  deleteDraft:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/drafts/${id}`,{method:'DELETE'}),

  saveKnowledgeSource: (source: KnowledgeDocument) => request<KnowledgeDocument & {ragSynced?: boolean}>(`/api/knowledge-sources/${source.id}`, { method: 'PUT', body: JSON.stringify(source) }),
  deleteKnowledgeSource: (workspaceId: string, id: string) => request<{ok: boolean, ragSynced?: boolean}>(`/api/organizations/${workspaceId}/knowledge-sources/${id}`, { method: 'DELETE' })
};
