import type { AuditLog, BrandProfile, ContentDraft, KnowledgeDocument, User, Workspace } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3005';

type Bootstrap = { workspaces: Workspace[]; users: User[]; brandProfile: BrandProfile; documents: KnowledgeDocument[]; drafts: ContentDraft[]; auditLogs: AuditLog[] };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API ${response.status}`);}
  return response.json();
}

export const apiService={
  bootstrap:(workspaceId?:string)=>request<Bootstrap>(`/api/bootstrap${workspaceId?`?workspaceId=${encodeURIComponent(workspaceId)}`:''}`),
  clearAll:()=>request<{ok:boolean}>('/api/data',{method:'DELETE'}),
  onboard:(input:{organizationName:string;code:string;sector:string;city:string;adminName:string;adminEmail:string})=>request<{workspace:Workspace;user:User}>('/api/onboarding',{method:'POST',body:JSON.stringify(input)}),
  saveDraft:(draft:ContentDraft)=>request<ContentDraft>(`/api/drafts/${draft.id}`,{method:'PUT',body:JSON.stringify(draft)}),
  saveBrand:(profile:BrandProfile)=>request<BrandProfile>('/api/brand-profile',{method:'PUT',body:JSON.stringify(profile)}),
  deleteBrand:(workspaceId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/brand-profile`,{method:'DELETE'}),
  saveKnowledge:(document:KnowledgeDocument)=>request<KnowledgeDocument>(`/api/knowledge-sources/${document.id}`,{method:'PUT',body:JSON.stringify(document)}),
  deleteKnowledge:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/knowledge-sources/${id}`,{method:'DELETE'}),
  createUser:(workspaceId:string,input:Omit<User,'id'|'workspaceId'|'avatar'>)=>request<User>(`/api/organizations/${workspaceId}/users`,{method:'POST',body:JSON.stringify(input)}),
  deleteUser:(workspaceId:string,userId:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/users/${userId}`,{method:'DELETE'}),
  deleteDraft:(workspaceId:string,id:string)=>request<{ok:boolean}>(`/api/organizations/${workspaceId}/drafts/${id}`,{method:'DELETE'})
};
