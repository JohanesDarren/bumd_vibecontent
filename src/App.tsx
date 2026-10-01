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
  DraftVersionon, 
  ApprovalInfo, 
  ReviewComment, 
  DocumentStatus 
} from './types';
import { apiService } from './services/apiService';
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

import { FirstRunSetupView } from './components/FirstRunSetupView';
import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './services/policies';

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Initialize and load data from PostgreSQL API
  const loadData = async (workspaceId = activeWorkspace?.id) => {
    const data = await apiService.bootstrap(workspaceId);
    const activeWs = data.workspaces.find(workspace => workspace.id === workspaceId) || data.workspaces[0];
    const curUser = data.users.find(user => user.id === activeUser?.id) || data.users[0];

    setWorkspaces(data.workspaces);
    setActiveWorkspace(activeWs || null);
    setUsers(data.users);
    setActiveUser(curUser);
    setBrandProfile(data.brandProfile);
    setDocuments(data.documents);
    setDrafts(data.drafts);
    setAuditLogs(data.auditLogs);

    if (data.drafts.length > 0 && !selectedDraftId) setSelectedDraftId(data.drafts[0].id);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch(error => { setToastMessage(`Database gagal dimuat: ${error.message}`); setLoading(false); });
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
  const handleSelectWorkspace = async (wsId: string) => {
    if (!activeUser || activeUser.workspaceId !== wsId) {
      showToast('Akses workspace ditolak. Akun tidak memiliki keanggotaan tenant tersebut.');
      return;
    }
    await loadData(wsId);
    showToast(`Beralih ke ruang kerja ${workspaces.find(w => w.id === wsId)?.name}`);
  };

  // User Role Switcher
  const handleSelectUser = (userId: string) => {
    const allowedUser = users.find(usr => usr.id === userId && (!activeWorkspace || usr.workspaceId === activeWorkspace.id));
    if (!allowedUser) {
      showToast('Akses pengguna ditolak untuk workspace aktif.');
      return;
    }
    const u = allowedUser;
    setActiveUser(u);
    if (!canAccessTab(u.role, currentTab)) setCurrentTab('dashboard');
    showToast(`Peran pengguna aktif: ${u.name} (${u.role.toUpperCase()})`);
  };

  // Reset Demo Data
  const handleResetData = async () => {
    await apiService.clearAll();
    setAuthenticated(false);
    await loadData();
    showToast('Seluruh data aplikasi telah dihapus.');
  };

  // Content Generation from Brief
  const handleGenerateDraft = async (brief: ContentBrief) => {
    if (!brandProfile || !activeWorkspace || !activeUser) return;

    // Call RAG engine
    const output = generateContentFromBrief(brief, brandProfile, documents, activeWorkspace.id);

    const initialVersionon: DraftVersionon = {
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
      currentVersionon: 1,
      versions: [initialVersionon],
      comments: [],
      visualAsset: output.visualAsset,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: activeUser.id,
      creatorName: activeUser.name
    };

    await apiService.saveDraft(newDraft);
    const refreshed = await apiService.bootstrap(activeWorkspace.id);
    setDrafts(refreshed.drafts);
    setAuditLogs(refreshed.auditLogs);
    setSelectedDraftId(newDraft.id);

    // Transition directly to editor
    setCurrentTab('editor');
    showToast(`Naskah "${newDraft.title}" berhasil dibuat dengan ${output.citations.length} rujukan RAG!`);
  };

  // Save new draft version
  const handleSaveNewVersionon = async (draftId: string, version: DraftVersionon, changeSummary: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, versions: [version, ...draft.versions], currentVersionon: version.versionNumber, updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast(`Version ${version.versionNumber} berhasil disimpan dalam riwayat audit.`);
  };

  // Submit draft for review
  const handleSubmitForReview = async (draftId: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'menunggu_review')) {
      showToast('Transisi status tidak diizinkan untuk peran ini.');
      return;
    }
    await apiService.saveDraft({ ...draft, status: 'menunggu_review', updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast('Naskah berhasil dikirim ke antrean review Humas/Approver.');
  };

  // Approve draft
  const handleApproveDraft = async (draftId: string, approvalInfo: ApprovalInfo) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'disetujui')) {
      showToast('Hanya Reviewer/Admin dapat menyetujui draft Pending Review.');
      return;
    }
    await apiService.saveDraft({ ...draft, status: 'disetujui', approvalInfo, updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast(`Naskah resmi Approved! No Dispositions: ${approvalInfo.dispositionNumber}`);
  };

  // Request revision
  const handleRequestRevision = async (draftId: string, commentText: string) => {
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
    await apiService.saveDraft({ ...draft, comments: [...draft.comments, comment], status: 'revisi_diminta', updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast('Permintaan revisi berhasil dikirim ke pembuat konten.');
  };

  // Add review comment
  const handleAddComment = async (draftId: string, comment: ReviewComment) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, comments: [...draft.comments, comment], updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast('Catatan penelaahan berhasil ditambahkan.');
  };

  // Knowledge base document status toggle
  const handleUpdateDocStatus = async (docId: string, status: DocumentStatus) => {
    const document = documents.find(item => item.id === docId);
    if (!document || !activeWorkspace) return;
    await apiService.saveKnowledge({ ...document, status });
    await loadData(activeWorkspace.id);
    showToast(`Status dokumen diubah menjadi: ${status.toUpperCase()}`);
  };

  // Upload new knowledge doc
  const handleUploadDocument = async (newDoc: KnowledgeDocument) => {
    await apiService.saveKnowledge(newDoc);
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast(`Dokumen "${newDoc.title}" berhasil diindeks ke Knowledge Base.`);
  };

  // Save brand profile
  const handleSaveBrandProfile = async (newProfile: BrandProfile) => {
    await apiService.saveBrand(newProfile);
    setBrandProfile(newProfile);
    showToast('Panduan merek dan profil BUMD berhasil diperbarui.');
  };

  const handleOpenExport = (draft: ContentDraft) => setExportModalDraft(draft);

  if (loading) return <div style={{display:'grid',placeItems:'center',height:'100vh'}}>Memuat PostgreSQL…</div>;

  if (workspaces.length === 0) return <FirstRunSetupView onSubmit={async input=>{const created=await apiService.onboard(input);await loadData(created.workspace.id);}}/>;

  if (!activeWorkspace || !activeUser) return <div className="empty-state">Workspace atau pengguna belum tersedia.</div>;

  const effectiveBrandProfile: BrandProfile = brandProfile || {workspaceId:activeWorkspace.id,organizationName:activeWorkspace.name,unitDepartment:'',defaultLanguage:'Bahasa Indonesia',toneOfVoice:[],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:[],brandGuidelinesSummary:'',officialDisclaimer:''};

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
              brandProfile={effectiveBrandProfile}
              activeUser={activeUser}
              activeWorkspace={activeWorkspace}
              onNavigate={setCurrentTab}
              onSelectDraft={(id) => setSelectedDraftId(id)}
            />
          )}

          {currentTab === 'brief_studio' && (
            <BriefStudioView 
              brandProfile={effectiveBrandProfile}
              documents={documents}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onGenerateDraft={handleGenerateDraft}
            />
          )}

          {currentTab === 'editor' && selectedDraft && (
            <EditorWorkspaceView 
              draft={selectedDraft}
              brandProfile={effectiveBrandProfile}
              activeUser={activeUser}
              onSaveNewVersionon={handleSaveNewVersionon}
              onSubmitForReview={handleSubmitForReview}
              onOpenExportModal={handleOpenExport}
            />
          )}

          {currentTab === 'visual_studio' && (
            <VisualStudioView 
              draft={selectedDraft}
              brandProfile={effectiveBrandProfile}
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
              onArchiveDraft={async (id) => {
                const draft = drafts.find(item => item.id === id);
                if (!draft) return;
                await apiService.saveDraft({ ...draft, status: 'diarsipkan', updatedAt: new Date().toISOString() });
                await loadData(activeWorkspace.id);
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
              brandProfile={effectiveBrandProfile}
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
