import { 
  Workspace, 
  User, 
  KnowledgeDocument, 
  BrandProfile, 
  ContentDraft, 
  AuditLog, 
  UserRole,
  DraftStatus,
  ApprovalInfo,
  ReviewComment,
  DraftVersion
} from '../types';
import { 
  initialWorkspaces, 
  initialUsers, 
  initialBrandProfiles, 
  initialKnowledgeDocuments, 
  initialDrafts, 
  initialAuditLogs 
} from '../data/mockData';

const STORAGE_KEYS = {
  WORKSPACES: 'vibecontent_workspaces',
  USERS: 'vibecontent_users',
  ACTIVE_WORKSPACE_ID: 'vibecontent_active_ws',
  ACTIVE_USER_ID: 'vibecontent_active_user',
  BRAND_PROFILES: 'vibecontent_brand_profiles',
  KNOWLEDGE_DOCS: 'vibecontent_knowledge_docs',
  DRAFTS: 'vibecontent_drafts',
  AUDIT_LOGS: 'vibecontent_audit_logs'
};

export const storageService = {
  // Initialize storage if empty
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.WORKSPACES)) {
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(initialWorkspaces));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, 'ws-tirta');
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, 'usr-creator');
    }
    if (!localStorage.getItem(STORAGE_KEYS.BRAND_PROFILES)) {
      localStorage.setItem(STORAGE_KEYS.BRAND_PROFILES, JSON.stringify(initialBrandProfiles));
    }
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_DOCS)) {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(initialKnowledgeDocuments));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRAFTS)) {
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(initialDrafts));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
    }
  },

  resetAll() {
    localStorage.clear();
    this.init();
  },

  // Workspaces
  getWorkspaces(): Workspace[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKSPACES) || '[]');
  },

  getActiveWorkspace(): Workspace {
    const list = this.getWorkspaces();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID) || 'ws-tirta';
    return list.find(w => w.id === activeId) || list[0];
  },

  setActiveWorkspaceId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, id);
    this.addAuditLog({
      action: 'Beralih Workspace Organisasi',
      objectType: 'dokumen',
      objectId: id,
      objectName: `Workspace ${id}`,
      details: `Pengguna beralih ke ruang kerja ${id}`
    });
  },

  // Users & Roles
  getUsers(): User[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  getActiveUser(): User {
    const users = this.getUsers();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || 'usr-creator';
    return users.find(u => u.id === activeId) || users[0];
  },

  setActiveUserId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
    const user = this.getUsers().find(u => u.id === id);
    if (user) {
      this.addAuditLog({
        action: 'Ganti Peran Pengguna Aktif',
        objectType: 'review',
        objectId: user.id,
        objectName: user.name,
        details: `Sesi berganti ke peran ${user.role.toUpperCase()} (${user.title})`
      });
    }
  },

  // Brand Profiles
  getBrandProfiles(): Record<string, BrandProfile> {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAND_PROFILES) || '{}');
  },

  getActiveBrandProfile(): BrandProfile {
    const ws = this.getActiveWorkspace();
    const profiles = this.getBrandProfiles();
    return profiles[ws.id] || profiles['ws-tirta'];
  },

  updateBrandProfile(profile: BrandProfile) {
    const profiles = this.getBrandProfiles();
    profiles[profile.workspaceId] = profile;
    localStorage.setItem(STORAGE_KEYS.BRAND_PROFILES, JSON.stringify(profiles));
    this.addAuditLog({
      action: 'Pembaruan Panduan Merek',
      objectType: 'brand_profile',
      objectId: profile.workspaceId,
      objectName: profile.organizationName,
      details: 'Admin memperbarui pedoman tone, terminologi, atau Call to Action resmi.'
    });
  },

  // Knowledge Documents
  getKnowledgeDocs(): KnowledgeDocument[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_DOCS) || '[]');
  },

  getWorkspaceKnowledgeDocs(workspaceId?: string): KnowledgeDocument[] {
    const targetWs = workspaceId || this.getActiveWorkspace().id;
    return this.getKnowledgeDocs().filter(d => d.workspaceId === targetWs);
  },

  saveKnowledgeDoc(doc: KnowledgeDocument) {
    const docs = this.getKnowledgeDocs();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index >= 0) {
      docs[index] = doc;
    } else {
      docs.unshift(doc);
    }
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(docs));
    this.addAuditLog({
      action: index >= 0 ? 'Pembaruan Dokumen Sumber' : 'Unggah Dokumen Knowledge Base',
      objectType: 'dokumen',
      objectId: doc.id,
      objectName: doc.title,
      details: `Status dokumen: ${doc.status.toUpperCase()}, ${doc.chunks.length} potongan indeks tersimpan.`
    });
  },

  updateDocStatus(docId: string, status: KnowledgeDocument['status']) {
    const docs = this.getKnowledgeDocs();
    const doc = docs.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(docs));
      this.addAuditLog({
        action: 'Perubahan Status Dokumen RAG',
        objectType: 'dokumen',
        objectId: doc.id,
        objectName: doc.title,
        details: `Knowledge Owner mengubah status dokumen menjadi ${status.toUpperCase()}. Dokumen ${status === 'aktif' ? 'kini AKTIF' : 'TIDAK AKTIF'} untuk retrieval.`
      });
    }
  },

  // Drafts & Workflow
  getDrafts(): ContentDraft[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFTS) || '[]');
  },

  getWorkspaceDrafts(workspaceId?: string): ContentDraft[] {
    const targetWs = workspaceId || this.getActiveWorkspace().id;
    return this.getDrafts().filter(d => d.workspaceId === targetWs);
  },

  saveDraft(draft: ContentDraft) {
    const drafts = this.getDrafts();
    const index = drafts.findIndex(d => d.id === draft.id);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.unshift(draft);
    }
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
    this.addAuditLog({
      action: index >= 0 ? `Pembaruan Draft (v${draft.currentVersion})` : 'Pembuatan Draft Baru',
      objectType: 'draft',
      objectId: draft.id,
      objectName: draft.title,
      details: `Status saat ini: ${draft.status.toUpperCase()}. Format: ${draft.format}.`
    });
  },

  addDraftVersion(draftId: string, version: DraftVersion, changeSummary: string) {
    const drafts = this.getDrafts();
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      draft.versions.unshift(version);
      draft.currentVersion = version.versionNumber;
      draft.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
      this.addAuditLog({
        action: `Penyimpanan Versi ${version.versionNumber}`,
        objectType: 'draft',
        objectId: draft.id,
        objectName: draft.title,
        details: changeSummary
      });
    }
  },

  updateDraftStatus(draftId: string, status: DraftStatus, approvalInfo?: ApprovalInfo) {
    const drafts = this.getDrafts();
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      draft.status = status;
      draft.updatedAt = new Date().toISOString();
      if (approvalInfo) {
        draft.approvalInfo = approvalInfo;
      }
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
      this.addAuditLog({
        action: `Transisi Status Konten -> ${status.toUpperCase()}`,
        objectType: 'review',
        objectId: draft.id,
        objectName: draft.title,
        details: approvalInfo 
          ? `Disposisi: ${approvalInfo.dispositionNumber}. Oleh: ${approvalInfo.approvedBy}. Catatan: ${approvalInfo.notes}`
          : `Status draft diubah menjadi ${status.toUpperCase()}`
      });
    }
  },

  addReviewComment(draftId: string, comment: ReviewComment) {
    const drafts = this.getDrafts();
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      draft.comments.push(comment);
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
      this.addAuditLog({
        action: 'Komentar Penelaahan Konten',
        objectType: 'review',
        objectId: draft.id,
        objectName: draft.title,
        details: `${comment.authorName} (${comment.authorRole}): "${comment.text.slice(0, 60)}..."`
      });
    }
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
  },

  addAuditLog(item: Omit<AuditLog, 'id' | 'workspaceId' | 'timestamp' | 'actorName' | 'actorRole'>) {
    const logs = this.getAuditLogs();
    const user = this.getActiveUser();
    const ws = this.getActiveWorkspace();
    const newLog: AuditLog = {
      id: `adt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workspaceId: ws.id,
      timestamp: new Date().toISOString(),
      actorName: user.name,
      actorRole: user.role,
      ...item
    };
    logs.unshift(newLog);
    // Keep last 150 logs
    const trimmed = logs.slice(0, 150);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
  }
};
