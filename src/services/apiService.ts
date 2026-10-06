import type { AuditLog, AuthUser, BrandProfile, ContentBrief, ContentDraft, KnowledgeDocument, User, Workspace } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL = typeof window === 'undefined' ? configuredApiUrl || 'http://127.0.0.1:3005'
  : configuredApiUrl && !/^http:\/\/(127\.0\.0\.1|localhost):3005$/.test(configuredApiUrl) ? configuredApiUrl
  : `${window.location.protocol}//${window.location.hostname}:3005`;

type Bootstrap = { workspaces: Workspace[]; users: User[]; brandProfile: BrandProfile; documents: KnowledgeDocument[]; drafts: ContentDraft[]; briefs: ContentBrief[]; auditLogs: AuditLog[] };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...init,credentials:'include',headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API ${response.status}`);}
  return response.json();
}

export type RagHit={document_id:string;chunk_id:string;content:string;score:number;page?:number|null;document_name?:string|null;section?:string|null;source_url?:string|null};
export type RagAnswer={answer:string;grounded:boolean;sources:RagHit[];model?:string;no_answer_reason?:string|null};
export type RagStatus={configured:boolean;ready:boolean;dependencies?:Record<string,string>;detail?:Record<string,unknown>;error?:string};

export const apiService={
  bootstrap:(workspaceId?:string)=>request<Bootstrap>(`/api/bootstrap${workspaceId?`?workspaceId=${encodeURIComponent(workspaceId)}`:''}`),
  login:(email:string,password:string)=>request<AuthUser>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  me:async()=>{const response=await fetch(`${API_URL}/api/auth/me`,{credentials:'include'});if(response.status===401)return null;if(!response.ok)throw new Error('Unable to restore session');return response.json() as Promise<AuthUser>;},
  logout:()=>request<{ok:boolean}>('/api/auth/logout',{method:'POST'}),
  corporateUsers:()=>request<{id:string;name:string;email:string;workspaceIds:string[]}[]>('/api/corporate/users'),
  createCorporateUser:(input:{name:string;email:string;password:string;workspaceIds:string[]})=>request<{id:string;workspaceIds:string[]}>('/api/corporate/users',{method:'POST',body:JSON.stringify(input)}),
  assignCorporateUser:(id:string,workspaceIds:string[])=>request<{workspaceIds:string[]}>(`/api/corporate/users/${encodeURIComponent(id)}/workspaces`,{method:'PUT',body:JSON.stringify({workspaceIds})}),
  corporateWorkspaces:()=>request<Workspace[]>('/api/corporate/workspaces'),
  createCorporateWorkspace:(input:{name:string;code:string;sector:string;city:string})=>request<Workspace>('/api/corporate/workspaces',{method:'POST',body:JSON.stringify(input)}),
  adminCompanies:()=>request<{id:string;name:string}[]>('/api/admin/companies'),
  adminUsers:()=>request<{id:string;name:string;email:string;role:string;companyId:string|null}[]>('/api/admin/users'),
  adminWorkspaces:()=>request<{id:string;name:string;code:string;companyId:string}[]>('/api/admin/workspaces'),
  createCompany:(name:string)=>request<{id:string;name:string}>('/api/admin/companies',{method:'POST',body:JSON.stringify({name})}),
  createAdminUser:(input:{name:string;email:string;password:string;role:'corporate'|'superadmin';companyId?:string})=>request<{id:string;name:string}>('/api/admin/users',{method:'POST',body:JSON.stringify(input)}),
  createAdminWorkspace:(input:{companyId:string;name:string;code:string;sector:string;city:string})=>request<Workspace>('/api/admin/workspaces',{method:'POST',body:JSON.stringify(input)}),
  userWorkspaces:(userId:string)=>request<{id:string;name:string;code:string;role:string}[]>(`/api/users/${userId}/workspaces`),
  ragStatus:()=>request<RagStatus>('/api/rag/status'),
  ragSearch:(workspaceId:string,query:string,topK?:number)=>request<{results:RagHit[]}>(`/api/rag/search`,{method:'POST',body:JSON.stringify({workspaceId,query,topK})}),
  ragQuery:(workspaceId:string,query:string,topK?:number)=>request<RagAnswer>(`/api/rag/query`,{method:'POST',body:JSON.stringify({workspaceId,query,topK})}),
  ragRefine:(workspaceId:string,draftContent:string,promptAction:string)=>request<{answer:string;model?:string}>(`/api/rag/refine`,{method:'POST',body:JSON.stringify({workspaceId,draftContent,promptAction})}),
  generateVisual:(input:import('./visualScene').VisualInput)=>request<{imageUrl:string;provider:string;model:string;llmModel:string;steps:number;fallback:false;format:string;prompt:string;imagePrompt:string;dimensions:string}>('/api/visual/generate',{method:'POST',body:JSON.stringify(input)}),
  saveDraft:(draft:ContentDraft,brief?:ContentBrief)=>request<ContentDraft>(`/api/drafts/${draft.id}`,{method:'PUT',body:JSON.stringify({...draft,brief})}),
  saveBrand:(profile:BrandProfile)=>request<BrandProfile>('/api/brand-profile',{method:'PUT',body:JSON.stringify(profile)}),
  deleteBrand:(workspaceId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/brand-profile`,{method:'DELETE'}),

  createUser:(workspaceId:string,input:Omit<User,'id'|'workspaceId'|'avatar'> & { password?: string })=>request<User & { tempPassword?: string }>(`/api/organizations/${workspaceId}/users`,{method:'POST',body:JSON.stringify(input)}),
  deleteUser:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/users/${userId}`,{method:'DELETE'}),
  deleteDraft:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/drafts/${id}`,{method:'DELETE'})
};
