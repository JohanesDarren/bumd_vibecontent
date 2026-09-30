import React, { useState, useEffect } from 'react';
import { 
  ActiveTab, 
  Workspace, 
  User, 
  BrandProfile, 
  KnowledgeDocument, 
  ContentDraft, 
  AuditLog, 
  ContentBrief, 
  DraftVersion, 
  ApprovalInfo, 
  ReviewComment, 
  DocumentStatus 
} from './types';
import { storageService } from './services/storageService';
import { generateContentFromBrief } from './services/ragEngine';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BriefStudioView } from './components/BriefStudioView';
import { EditorWorkspaceView } from './components/EditorWorkspaceView';
import { VisualStudioView } from './components/VisualStudioView';
import { ReviewApprovalView } from './components/ReviewApprovalView';
import { LibraryView } from './components/LibraryView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { BrandProfileView } from './components/BrandProfileView';
import { AuditLogView } from './components/AuditLogView';
import { ExportModal } from './components/ExportModal';
import { LoginAccessView } from './components/LoginAccessView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsHelpView } from './components/SettingsHelpView';
import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './services/policies';

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Core App State
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selection & Modal States
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(undefined);
  const [exportModalDraft, setExportModalDraft] = useState<ContentDraft | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize and load data
  const loadData = () => {
    storageService.init();
    const wsList = storageService.getWorkspaces();
    const activeWs = storageService.getActiveWorkspace();
    const userList = storageService.getUsers();
    const curUser = storageService.getActiveUser();
    const profile = storageService.getActiveBrandProfile();
    const docs = storageService.getWorkspaceKnowledgeDocs(activeWs.id);
    const dfts = storageService.getWorkspaceDrafts(activeWs.id);
    const logs = storageService.getAuditLogs();

    setWorkspaces(wsList);
    setActiveWorkspace(activeWs);
    setUsers(userList);
    setActiveUser(curUser);
    setBrandProfile(profile);
    setDocuments(docs);
    setDrafts(dfts);
    setAuditLogs(logs);

    if (dfts.length > 0 && !selectedDraftId) {
      setSelectedDraftId(dfts[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update theme on root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Workspace Switcher
  const handleSelectWorkspace = (wsId: string) => {
    if (!activeUser || activeUser.workspaceId !== wsId) {
      showToast('Akses workspace ditolak. Akun tidak memiliki keanggotaan tenant tersebut.');
      return;
    }
    storageService.setActiveWorkspaceId(wsId);
    const newWs = workspaces.find(w => w.id === wsId) || activeWorkspace!;
    setActiveWorkspace(newWs);

    // Reload workspace-isolated resources
    const docs = storageService.getWorkspaceKnowledgeDocs(newWs.id);
    const dfts = storageService.getWorkspaceDrafts(newWs.id);
    const profiles = storageService.getBrandProfiles();
    const profile = profiles[newWs.id] || profiles['ws-tirta'];
    const logs = storageService.getAuditLogs();

    setDocuments(docs);
    setDrafts(dfts);
    setBrandProfile(profile);
    setAuditLogs(logs);
    setSelectedDraftId(dfts[0]?.id);

    showToast(`Beralih ke ruang kerja ${newWs.name}`);
  };

  // User Role Switcher
  const handleSelectUser = (userId: string) => {
    const allowedUser = users.find(usr => usr.id === userId && (!activeWorkspace || usr.workspaceId === activeWorkspace.id));
    if (!allowedUser) {
      showToast('Akses pengguna ditolak untuk workspace aktif.');
      return;
    }
    storageService.setActiveUserId(userId);
    const u = allowedUser;
    setActiveUser(u);
    setAuditLogs(storageService.getAuditLogs());
    if (!canAccessTab(u.role, currentTab)) setCurrentTab('dashboard');
    showToast(`Peran pengguna aktif: ${u.name} (${u.role.toUpperCase()})`);
  };

  // Reset Demo Data
  const handleResetData = () => {
    storageService.resetAll();
    loadData();
    showToast('Seluruh data demo BUMD telah direset ke kondisi awal.');
  };

  // Content Generation from Brief
  const handleGenerateDraft = (brief: ContentBrief) => {
    if (!brandProfile || !activeWorkspace || !activeUser) return;

    // Call RAG engine
    const output = generateContentFromBrief(brief, brandProfile, documents, activeWorkspace.id);

    const initialVersion: DraftVersion = {
      versionNumber: 1,
      content: output.content,
      scenes: output.scenes,
      citations: output.citations,
      unsupportedClaims: output.unsupportedClaims,
      qualityCheck: output.qualityCheck,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.name,
      changeSummary: 'Draf generasi awal berbasis RAG dokumen resmi.'
    };

    const newDraft: ContentDraft = {
      id: `dft-${activeWorkspace.code.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      workspaceId: activeWorkspace.id,
      briefId: brief.id,
      title: brief.title,
      format: brief.format,
      status: 'draft',
      currentVersion: 1,
      versions: [initialVersion],
      comments: [],
      visualAsset: output.visualAsset,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: activeUser.id,
      creatorName: activeUser.name
    };

    storageService.saveDraft(newDraft);

    // Refresh state
    const updatedDrafts = storageService.getWorkspaceDrafts(activeWorkspace.id);
    setDrafts(updatedDrafts);
    setAuditLogs(storageService.getAuditLogs());
    setSelectedDraftId(newDraft.id);

    // Transition directly to editor
    setCurrentTab('editor');
    showToast(`Naskah "${newDraft.title}" berhasil dibuat dengan ${output.citations.length} rujukan RAG!`);
  };

  // Save new draft version
  const handleSaveNewVersion = (draftId: string, version: DraftVersion, changeSummary: string) => {
    storageService.addDraftVersion(draftId, version, changeSummary);
    setDrafts(storageService.getWorkspaceDrafts(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast(`Versi ${version.versionNumber} berhasil disimpan dalam riwayat audit.`);
  };

  // Submit draft for review
  const handleSubmitForReview = (draftId: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'menunggu_review')) {
      showToast('Transisi status tidak diizinkan untuk peran ini.');
      return;
    }
    storageService.updateDraftStatus(draftId, 'menunggu_review');
    setDrafts(storageService.getWorkspaceDrafts(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast('Naskah berhasil dikirim ke antrean review Humas/Approver.');
  };

  // Approve draft
  const handleApproveDraft = (draftId: string, approvalInfo: ApprovalInfo) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'disetujui')) {
      showToast('Hanya Reviewer/Admin dapat menyetujui draft Menunggu Review.');
      return;
    }
    storageService.updateDraftStatus(draftId, 'disetujui', approvalInfo);
    setDrafts(storageService.getWorkspaceDrafts(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast(`Naskah resmi Disetujui! No Disposisi: ${approvalInfo.dispositionNumber}`);
  };

  // Request revision
  const handleRequestRevision = (draftId: string, commentText: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'revisi_diminta')) {
      showToast('Permintaan revisi tidak diizinkan untuk status/peran ini.');
      return;
    }
    const comment: ReviewComment = {
      id: `cmt-${Date.now()}`,
      authorName: activeUser!.name,
      authorRole: activeUser!.role,
      text: commentText,
      createdAt: new Date().toISOString(),
      resolved: false
    };
    storageService.addReviewComment(draftId, comment);
    storageService.updateDraftStatus(draftId, 'revisi_diminta');
    setDrafts(storageService.getWorkspaceDrafts(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast('Permintaan revisi berhasil dikirim ke pembuat konten.');
  };

  // Add review comment
  const handleAddComment = (draftId: string, comment: ReviewComment) => {
    storageService.addReviewComment(draftId, comment);
    setDrafts(storageService.getWorkspaceDrafts(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast('Catatan penelaahan berhasil ditambahkan.');
  };

  // Knowledge base document status toggle
  const handleUpdateDocStatus = (docId: string, status: DocumentStatus) => {
    storageService.updateDocStatus(docId, status);
    setDocuments(storageService.getWorkspaceKnowledgeDocs(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast(`Status dokumen diubah menjadi: ${status.toUpperCase()}`);
  };

  // Upload new knowledge doc
  const handleUploadDocument = (newDoc: KnowledgeDocument) => {
    storageService.saveKnowledgeDoc(newDoc);
    setDocuments(storageService.getWorkspaceKnowledgeDocs(activeWorkspace?.id));
    setAuditLogs(storageService.getAuditLogs());
    showToast(`Dokumen "${newDoc.title}" berhasil diindeks ke Knowledge Base.`);
  };

  // Save brand profile
  const handleSaveBrandProfile = (newProfile: BrandProfile) => {
    storageService.updateBrandProfile(newProfile);
    setBrandProfile(newProfile);
    setAuditLogs(storageService.getAuditLogs());
    showToast('Panduan merek dan profil BUMD berhasil diperbarui.');
  };

  const handleOpenExport = (draft: ContentDraft) => {
    storageService.addAuditLog({
      action: 'Ekspor Konten Dibuka', objectType: 'ekspor', objectId: draft.id,
      objectName: draft.title, details: `Ekspor dibuka pada status ${draft.status.toUpperCase()}; status tidak diubah.`
    });
    setAuditLogs(storageService.getAuditLogs());
    setExportModalDraft(draft);
  };

  if (!activeWorkspace || !activeUser || !brandProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        Memuat Workspace BUMD...
      </div>
    );
  }

  if (!authenticated) {
    return <LoginAccessView users={users} workspaces={workspaces} onLogin={(userId) => { handleSelectUser(userId); setAuthenticated(true); }} />;
  }

  const selectedDraft = drafts.find(d => d.id === selectedDraftId) || drafts[0];
  const pendingReviewCount = drafts.filter(d => d.status === 'menunggu_review').length;
  const activeDocCount = documents.filter(d => d.status === 'aktif').length;

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header 
        workspaces={workspaces.filter(workspace => workspace.id === activeUser.workspaceId)}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        users={filterUsersForWorkspace(users, activeWorkspace.id)}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onResetData={handleResetData}
      />

      <div className="main-layout">
        {/* Navigation Sidebar */}
        <Sidebar 
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingReviewCount={pendingReviewCount}
          activeDocCount={activeDocCount}
          userRole={activeUser.role}
          activeWorkspace={activeWorkspace}
        />

        {/* Dynamic Viewport */}
        <main className="content-viewport">
          {currentTab === 'dashboard' && (
            <DashboardView 
              drafts={drafts}
              documents={documents}
              brandProfile={brandProfile}
              activeUser={activeUser}
              activeWorkspace={activeWorkspace}
              onNavigate={setCurrentTab}
              onSelectDraft={(id) => setSelectedDraftId(id)}
            />
          )}

          {currentTab === 'brief_studio' && (
            <BriefStudioView 
              brandProfile={brandProfile}
              documents={documents}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onGenerateDraft={handleGenerateDraft}
            />
          )}

          {currentTab === 'editor' && selectedDraft && (
            <EditorWorkspaceView 
              draft={selectedDraft}
              brandProfile={brandProfile}
              activeUser={activeUser}
              onSaveNewVersion={handleSaveNewVersion}
              onSubmitForReview={handleSubmitForReview}
              onOpenExportModal={handleOpenExport}
            />
          )}

          {currentTab === 'visual_studio' && (
            <VisualStudioView 
              draft={selectedDraft}
              brandProfile={brandProfile}
              activeWorkspace={activeWorkspace}
            />
          )}

          {currentTab === 'review_approval' && (
            <ReviewApprovalView 
              drafts={drafts}
              selectedDraftId={selectedDraftId}
              onSelectDraft={(id) => setSelectedDraftId(id)}
              activeUser={activeUser}
              activeWorkspace={activeWorkspace}
              onApprove={handleApproveDraft}
              onRequestRevision={handleRequestRevision}
              onAddComment={handleAddComment}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView 
              drafts={drafts}
              activeWorkspace={activeWorkspace}
              onSelectDraft={(id) => setSelectedDraftId(id)}
              onOpenEditor={(id) => {
                setSelectedDraftId(id);
                setCurrentTab('editor');
              }}
              onOpenExportModal={handleOpenExport}
              onArchiveDraft={(id) => {
                storageService.updateDraftStatus(id, 'diarsipkan');
                setDrafts(storageService.getWorkspaceDrafts(activeWorkspace.id));
                showToast('Naskah berhasil dipindahkan ke arsip.');
              }}
            />
          )}

          {currentTab === 'knowledge_base' && (
            <KnowledgeBaseView 
              documents={documents}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onUpdateStatus={handleUpdateDocStatus}
              onUploadDocument={handleUploadDocument}
            />
          )}

          {currentTab === 'brand_profile' && (
            <BrandProfileView 
              brandProfile={brandProfile}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onSaveProfile={handleSaveBrandProfile}
            />
          )}

          {currentTab === 'audit_log' && (
            <AuditLogView 
              logs={auditLogs}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
            />
          )}

          {currentTab === 'user_management' && (
            <UserManagementView users={filterUsersForWorkspace(users, activeWorkspace.id)} activeWorkspace={activeWorkspace} />
          )}

          {currentTab === 'settings_help' && <SettingsHelpView />}
        </main>
      </div>

      {/* Export Modal */}
      {exportModalDraft && (
        <ExportModal 
          draft={exportModalDraft}
          activeWorkspace={activeWorkspace}
          onClose={() => setExportModalDraft(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
