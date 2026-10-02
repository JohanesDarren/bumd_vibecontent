import type { AuditLog, BrandProfile, ContentDraft, KnowledgeDocument, User, Workspace } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3005';

type Bootstrap = { workspaces: Workspace[]; users: User[]; brandProfile: BrandProfile; documents: KnowledgeDocument[]; drafts: ContentDraft[]; auditLogs: AuditLog[] };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API ${response.status}`);}
  return response.json();
}

export type RagHit={document_id:string;chunk_id:string;content:string;score:number;page?:number|null;document_name?:string|null;section?:string|null;source_url?:string|null};
export type RagAnswer={answer:string;grounded:boolean;sources:RagHit[];model?:string;no_answer_reason?:string|null};
export type RagStatus={configured:boolean;ready:boolean;dependencies?:Record<string,string>;detail?:Record<string,unknown>;error?:string};

export const apiService={
  bootstrap:(workspaceId?:string)=>request<Bootstrap>(`/api/bootstrap${workspaceId?`?workspaceId=${encodeURIComponent(workspaceId)}`:''}`),
  clearAll:()=>request<{ok:boolean}>('/api/data',{method:'DELETE'}),
  onboard:(input:{organizationName:string;code:string;sector:string;city:string;adminName:string;adminEmail:string;adminPassword?:string})=>request<{workspace:Workspace;user:User}>('/api/onboarding',{method:'POST',body:JSON.stringify(input)}),
  register:(input:{name:string;email:string;password:string;workspaceCode?:string})=>request<{id:string;name:string;email:string;hasWorkspace:boolean}>('/api/auth/register',{method:'POST',body:JSON.stringify(input)}),
  login:(email:string,password:string)=>request<{id:string;name:string;email:string;workspaces:{id:string;name:string;code:string;role:string}[]}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  userWorkspaces:(userId:string)=>request<{id:string;name:string;code:string;role:string}[]>(`/api/users/${userId}/workspaces`),
  ragStatus:()=>request<RagStatus>('/api/rag/status'),
  ragSearch:(workspaceId:string,query:string,topK?:number)=>request<{results:RagHit[]}>(`/api/rag/search`,{method:'POST',body:JSON.stringify({workspaceId,query,topK})}),
  ragQuery:(workspaceId:string,query:string,topK?:number)=>request<RagAnswer>(`/api/rag/query`,{method:'POST',body:JSON.stringify({workspaceId,query,topK})}),
  generateVisual:(input:{prompt:string;providerPrompt?:string;aspectRatio:'1:1'|'9:16'|'16:9';headline?:string;subheadline?:string;badgeText?:string;ctaText?:string})=>request<{imageUrl:string;fallbackImageUrl:string;provider:string;model:string}>('/api/visual/generate',{method:'POST',body:JSON.stringify(input)}),
  saveDraft:(draft:ContentDraft)=>request<ContentDraft>(`/api/drafts/${draft.id}`,{method:'PUT',body:JSON.stringify(draft)}),
  saveBrand:(profile:BrandProfile)=>request<BrandProfile>('/api/brand-profile',{method:'PUT',body:JSON.stringify(profile)}),
  deleteBrand:(workspaceId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/brand-profile`,{method:'DELETE'}),

  createUser:(workspaceId:string,input:Omit<User,'id'|'workspaceId'|'avatar'> & { password?: string })=>request<User & { tempPassword?: string }>(`/api/organizations/${workspaceId}/users`,{method:'POST',body:JSON.stringify(input)}),
  deleteUser:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/users/${userId}`,{method:'DELETE'}),
  deleteDraft:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/drafts/${id}`,{method:'DELETE'})
};
