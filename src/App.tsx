import React, { useState, useEffect } from 'react';
import { 
  ActiveTab, 
  Workspace, 
  User, 
  UserRole, 
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
import { generateContentFromBrief, GeneratedOutput } from './services/ragEngine';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BriefStudioView } from './components/BriefStudioView';
import { EditorWorkspaceView } from './components/EditorWorkspaceView';
import { AuthView } from './components/AuthView';
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
import { ContentSchedulingView } from './components/ContentSchedulingView';
import { Building2 } from 'lucide-react';

import { FirstRunSetupView } from './components/FirstRunSetupView';
import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './services/policies';

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<{id:string;name:string;email:string;workspaces:{id:string;name:string;code:string;role:string}[]} | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);
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
    loadData().catch(error => { setToastMessage(`Failed to load database: ${error.message}`); setLoading(false); });
  }, []);

  // Update theme on root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // After email login: activate workspace by id and set the authenticated user as active
  // `user` is passed explicitly because React state (authUser) is not yet updated in the same tick.
  const setActiveWorkspaceById = async (wsId: string, user?: { id: string }) => {
    const data = await apiService.bootstrap(wsId);
    const ws = data.workspaces.find(item => item.id === wsId);
    if (!ws) return;
    setWorkspaces(data.workspaces);
    setActiveWorkspace(ws);
    setUsers(data.users);
    const me = data.users.find(u => u.id === (user?.id ?? authUser?.id));
    setActiveUser(me ?? null);
    setBrandProfile(data.brandProfile);
    setDocuments(data.documents);
    setDrafts(data.drafts);
    setAuditLogs(data.auditLogs);
    if (data.drafts.length > 0) setSelectedDraftId(data.drafts[0].id);
    setLoading(false);
  };

  // Logout
  const handleLogout = () => {
    setAuthenticated(false);
    setAuthUser(null);
    setActiveUser(null);
    setCurrentTab('dashboard');
    showToast('Signed out.');
  };

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Workspace Switcher
  const handleSelectWorkspace = async (wsId: string) => {
    if (!activeUser || activeUser.workspaceId !== wsId) {
      showToast('Workspace access denied. This account is not a member of that tenant.');
      return;
    }
    await loadData(wsId);
    showToast(`Switched to workspace ${workspaces.find(w => w.id === wsId)?.name}`);
  };


  // Reset Demo Data
  const handleResetData = async () => {
    await apiService.clearAll();
    setAuthenticated(false);
    setAuthUser(null);
    setShowFirstRun(false);
    setActiveUser(null);
    setActiveWorkspace(null);
    await loadData();
    showToast('All application data has been deleted.');
  };

  // Content Generation from Brief
  // `output` is supplied by the Brief Studio (grounded live against the RAG service);
  // otherwise we fall back to the local engine for callers that only pass a brief.
  const handleGenerateDraft = async (brief: ContentBrief, output?: GeneratedOutput) => {
    if (!brandProfile || !activeWorkspace || !activeUser) return;

    const generated = output ?? generateContentFromBrief(brief, brandProfile, documents, activeWorkspace.id);

    const initialVersionon: DraftVersionon = {
      versionNumber: 1,
      content: generated.content,
      scenes: generated.scenes,
      citations: generated.citations,
      unsupportedClaims: generated.unsupportedClaims,
      qualityCheck: generated.qualityCheck,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.name,
      changeSummary: 'Initial RAG-grounded draft generated from official documents.'
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
      visualAsset: generated.visualAsset,
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
    showToast(`Draft "${newDraft.title}" created with ${generated.citations.length} RAG citations!`);
  };

  // Save new draft version
  const handleSaveNewVersionon = async (draftId: string, version: DraftVersionon, changeSummary: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, versions: [version, ...draft.versions], currentVersionon: version.versionNumber, updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast(`Version ${version.versionNumber} saved to the audit history.`);
  };

  // Submit draft for review
  const handleSubmitForReview = async (draftId: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'menunggu_review')) {
      showToast('Status transition not allowed for this role.');
      return;
    }
    await apiService.saveDraft({ ...draft, status: 'menunggu_review', updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast('Draft successfully submitted to the PR/Approver review queue.');
  };

  // Approve draft
  const handleApproveDraft = async (draftId: string, approvalInfo: ApprovalInfo) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'disetujui')) {
      showToast('Only Reviewer/Admin can approve drafts Pending Review.');
      return;
    }
    await apiService.saveDraft({ ...draft, status: 'disetujui', approvalInfo, updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast(`Draft officially Approved! Disposition No.: ${approvalInfo.dispositionNumber}`);
  };

  // Request revision
  const handleRequestRevision = async (draftId: string, commentText: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'revisi_diminta')) {
      showToast('Revision request not allowed for this status/role.');
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
    showToast('Revision request successfully sent to the content creator.');
  };

  // Add review comment
  const handleAddComment = async (draftId: string, comment: ReviewComment) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, comments: [...draft.comments, comment], updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast('Review note successfully added.');
  };

  // Knowledge base document status toggle
  const handleUpdateDocStatus = async (docId: string, status: DocumentStatus) => {
    const document = documents.find(item => item.id === docId);
    if (!document || !activeWorkspace) return;
    await apiService.saveKnowledge({ ...document, status });
    await loadData(activeWorkspace.id);
    showToast(`Document status changed to: ${status.toUpperCase()}`);
  };

  // Upload new knowledge doc
  const handleUploadDocument = async (newDoc: KnowledgeDocument) => {
    await apiService.saveKnowledge(newDoc);
    if (activeWorkspace) await loadData(activeWorkspace.id);
    showToast(`Document "${newDoc.title}" successfully indexed to the Knowledge Base.`);
  };

  // Save brand profile
  const handleSaveBrandProfile = async (newProfile: BrandProfile) => {
    await apiService.saveBrand(newProfile);
    setBrandProfile(newProfile);
    showToast('Brand guidelines and BUMD profile successfully updated.');
  };

  const handleOpenExport = (draft: ContentDraft) => setExportModalDraft(draft);

  // Create user membership
  const handleCreateUser = async (input: { name: string; email: string; role: UserRole; title: string; department: string }) => {
    if (!activeWorkspace) return;
    await apiService.createUser(activeWorkspace.id, input);
    await loadData(activeWorkspace.id);
    showToast(`User "${input.name}" successfully added to the workspace.`);
  };

  // Delete user membership
  const handleDeleteUser = async (userId: string) => {
    if (!activeWorkspace) return;
    await apiService.deleteUser(activeWorkspace.id, userId);
    await loadData(activeWorkspace.id);
    showToast('User membership successfully removed.');
  };

  if (loading) return <div style={{display:'grid',placeItems:'center',height:'100vh'}}>Loading PostgreSQL…</div>;

    // 1. Auth gate — must come before workspace picker
    if (!authenticated || !authUser) {
      if (showFirstRun || workspaces.length === 0) {
        return <FirstRunSetupView onSubmit={async input=>{const created=await apiService.onboard(input);await loadData(created.workspace.id);setShowFirstRun(false);setAuthenticated(true);}}/>;
      }
      return <AuthView
        hasWorkspaces={workspaces.length > 0}
        onFirstRun={() => setShowFirstRun(true)}
        onAuthed={async (user) => {
          setAuthUser(user);
          const memberships = user.workspaces || [];
          if (memberships.length === 1) {
            const ws = memberships[0];
            await setActiveWorkspaceById(ws.id, user);
          }
          setAuthenticated(true);
        }}
      />;
    }

    // 2. Workspace picker — authenticated but no workspace selected yet
    if (!activeWorkspace || !activeUser) {
      const memberships = authUser?.workspaces || [];
      return <main className="login-shell">
        <section className="login-card card-panel" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <span className="login-kicker">Choose Workspace</span>
          <h2>Welcome, {authUser?.name}</h2>
          <p>Select which workspace to open.</p>
          {memberships.length === 0 ? (
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>You are not a member of any workspace yet.</p>
              <button className="btn btn-primary" onClick={() => setShowFirstRun(true)}>Provision a new workspace</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memberships.map(ws => (
                <button key={ws.id} className="btn btn-secondary" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onClick={async () => { await setActiveWorkspaceById(ws.id); }}>
                  <Building2 size={16}/><span>{ws.name} ({ws.code}) — {ws.role}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>;
    }

  const effectiveBrandProfile: BrandProfile = brandProfile || {workspaceId:activeWorkspace.id,organizationName:activeWorkspace.name,unitDepartment:'',defaultLanguage:'English',targetAudiences:[],toneOfVoice:[],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:[],brandGuidelinesSummary:'',officialDisclaimer:''};

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
        onLogout={handleLogout}
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
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'editor' && (
            selectedDraft ? (
              <EditorWorkspaceView 
                draft={selectedDraft}
                brandProfile={effectiveBrandProfile}
                activeUser={activeUser}
                onSaveNewVersionon={handleSaveNewVersionon}
                onSubmitForReview={handleSubmitForReview}
                onOpenExportModal={handleOpenExport}
              />
            ) : (
              <div className="card-panel" style={{ textAlign: 'center', padding: '56px 24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>No Draft Selected</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '18px' }}>
                  There are no drafts in this workspace yet, or none is selected. Create a new draft in Brief &amp; Generation, or open one from the Library.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setCurrentTab('brief_studio')}>Create New Content</button>
                  <button className="btn btn-secondary" onClick={() => setCurrentTab('library')}>Open Library</button>
                </div>
              </div>
            )
          )}

          {currentTab === 'visual_studio' && (
            <VisualStudioView 
              draft={selectedDraft}
              brandProfile={effectiveBrandProfile}
              activeWorkspace={activeWorkspace}
            />
          )}


          {currentTab === 'content_scheduling' && (
            <ContentSchedulingView 
              drafts={drafts}
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
                showToast('Draft successfully moved to the archive.');
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
            <UserManagementView users={filterUsersForWorkspace(users, activeWorkspace.id)} activeWorkspace={activeWorkspace} onCreate={handleCreateUser} onDelete={handleDeleteUser} />
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