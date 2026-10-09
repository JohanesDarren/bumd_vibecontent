import React, { useState, useEffect, useRef } from 'react';
import { 
  ActiveTab, 
  Workspace, 
  User, 
  UserRole, 
  AuthUser,
  BrandProfile, 
  KnowledgeDocument, 
  ContentDraft, 
  AuditLog, 
  ContentBrief, 
  DraftVersionon, 
  ReviewComment,
  VisualAsset
} from './types';
import { apiService, onUnauthorized, sessionIdleMs, setAuthToken } from './services/apiService';
import { useRealtimeSignal } from './services/realtime';
import { generateContentFromBrief, GeneratedOutput } from './services/ragEngine';
import { AppSettings, DEFAULT_SETTINGS, normalizeSettings } from './services/appSettings';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BriefStudioView } from './components/BriefStudioView';
import { EditorWorkspaceView } from './components/EditorWorkspaceView';
import { AuthView } from './components/AuthView';
import { VisualStudioView } from './components/VisualStudioView';

import { LibraryView } from './components/LibraryView';

import { BrandProfileView } from './components/BrandProfileView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { AuditLogView } from './components/AuditLogView';
import { ExportModal } from './components/ExportModal';

import { UserManagementView } from './components/UserManagementView';
import { SettingsHelpView } from './components/SettingsHelpView';
import { ContentSchedulingView } from './components/ContentSchedulingView';
import { CorporateManagementView } from './components/CorporateManagementView';
import { CorporateDashboardView } from './components/CorporateDashboardView';
import { WorkspaceMappingView } from './components/WorkspaceMappingView';
import { CorporateUsersView } from './components/CorporateUsersView';

import { AdminDashboard } from './components/AdminDashboard';

import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './services/policies';

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
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
  // Company-wide settings are owned by the server and shared across its workspaces.
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Selection & Modal States
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(undefined);
  const [exportModalDraft, setExportModalDraft] = useState<ContentDraft | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize and load data from PostgreSQL API
  const loadData = async (workspaceId = activeWorkspace?.id) => {
    const data = await apiService.bootstrap(workspaceId);
    const activeWs = workspaceId ? data.workspaces.find(workspace => workspace.id === workspaceId) : undefined;
    const curUser = activeUser ? data.users.find(user => user.id === activeUser.id) : undefined;

    setWorkspaces(data.workspaces);
    setActiveWorkspace(activeWs || null);
    setUsers(data.users);
    setActiveUser(curUser ? { ...curUser, role: authUser?.role ?? curUser.role } : activeUser?.workspaceId === workspaceId ? activeUser : null);
    setBrandProfile(data.brandProfile);
    setDocuments(data.documents);
    setDrafts(data.drafts);
    setAuditLogs(data.auditLogs);
    setAppSettings(normalizeSettings(data.settings));

    if (data.drafts.length > 0 && !selectedDraftId) setSelectedDraftId(data.drafts[0].id);
    setLoading(false);
  };

  useEffect(() => {
    apiService.me().then(user => { if (user) void handleAuthed(user).catch(() => { setAuthUser(null); setAuthenticated(false); }); }).catch(() => {});
  }, []);

  // Session guards. The server enforces the idle window; these keep the UI honest:
  //  1. any 401 from the API drops us to the login screen immediately;
  //  2. returning to a tab after the idle window re-checks the session at once;
  //  3. an in-tab timer logs out at the same boundary even without any API call.
  useEffect(() => {
    if (!authenticated) return;
    onUnauthorized(() => { setAuthenticated(false); setAuthUser(null); setActiveWorkspace(null); setActiveUser(null); showToast('Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.'); });
    return () => onUnauthorized(null);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => { void apiService.logout().catch(() => {}); setAuthenticated(false); setAuthUser(null); setActiveWorkspace(null); setActiveUser(null); setCurrentTab('dashboard'); showToast('Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.'); };
    const reset = () => { clearTimeout(timer); timer = setTimeout(expire, sessionIdleMs()); };
    const onVisible = () => { if (document.visibilityState === 'visible') { void apiService.me().then(user => { if (!user) expire(); else reset(); }).catch(() => {}); } };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, reset, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    reset();
    return () => { clearTimeout(timer); events.forEach(event => window.removeEventListener(event, reset)); document.removeEventListener('visibilitychange', onVisible); };
  }, [authenticated]);

  // Update theme on root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Live cross-role propagation: when another role (or another of your own
  // sessions) changes data, silently re-read the shared root so this screen
  // never shows a stale copy. Coalesced so a burst of writes = one refetch.
  const reloadRef = useRef<() => void>(() => {});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { reloadRef.current = () => { void loadData().catch(() => {}); }; });
  useRealtimeSignal(() => {
    if (!authenticated) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => reloadRef.current(), 250);
  });

  // After email login: activate workspace by id and set the authenticated user as active
  // `user` is passed explicitly because React state (authUser) is not yet updated in the same tick.
  const setActiveWorkspaceById = async (wsId: string, user?: AuthUser) => {
    const data = await apiService.bootstrap(wsId);
    const ws = data.workspaces.find(item => item.id === wsId);
    if (!ws) return;
    setWorkspaces(data.workspaces);
    setActiveWorkspace(ws);
    setUsers(data.users);
    const me = data.users.find(u => u.id === (user?.id ?? authUser?.id));
    const account = user ?? authUser;
    const manager = account?.role === 'corporate' || account?.role === 'superadmin' ? account : null;
    setActiveUser(me ? { ...me, role: account?.role ?? me.role } : manager ? {id:manager.id,name:manager.name,email:manager.email,role:manager.role,workspaceId:wsId,avatar:'',title:'',department:''} : null);
    setBrandProfile(data.brandProfile);
    setDocuments(data.documents);
    setDrafts(data.drafts);
    setAuditLogs(data.auditLogs);
    setAppSettings(normalizeSettings(data.settings));
    if (data.drafts.length > 0) setSelectedDraftId(data.drafts[0].id);
    localStorage.setItem('vibecontent_active_ws', wsId);
    setLoading(false);
  };

  const handleAuthed = async (user: AuthUser) => {
    if (user.role === 'superadmin') {
      setAuthUser(user); setAuthenticated(true); setCurrentTab('admin_management');
      setActiveWorkspace(null); setActiveUser(null);
      return;
    }
    // Any user with at least one workspace lands straight in the dashboard — no
    // intermediate picker screen. Switching tenants afterwards is done from the
    // header workspace switcher, which is available on every workspace screen.
    if (user.workspaces.length) await setActiveWorkspaceById(user.workspaces[0].id, user);
    setAuthUser(user); setAuthenticated(true);
  };

  // Logout
  const handleLogout = (msg?: string | React.MouseEvent | React.FormEvent) => {
    // Revoke the server session too; the HttpOnly cookie would otherwise restore it on refresh.
    void apiService.logout().catch(() => {});
    setAuthenticated(false);
    setAuthUser(null);
    setActiveWorkspace(null);
    setActiveUser(null);
    setCurrentTab('dashboard');
    setAuthToken('');
    localStorage.removeItem('vibecontent_active_ws');
    showToast(typeof msg === 'string' ? msg : 'Anda telah keluar.');
  };

  // Idle Timeout (30 minutes of inactivity)
  useEffect(() => {
    if (!authenticated) return;
    
    let activityInterval: ReturnType<typeof setInterval>;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    
    const updateActivity = () => {
      localStorage.setItem('vc_last_activity', Date.now().toString());
    };

    const handleActivity = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity();
          throttleTimer = null;
        }, 2000); // Throttle writes to localStorage
      }
    };

    const checkInactivity = () => {
      const lastActivityStr = localStorage.getItem('vc_last_activity');
      if (!lastActivityStr) return;
      
      const lastActivity = parseInt(lastActivityStr, 10);
      // 30 minutes idle timeout
      if (Date.now() - lastActivity > 30 * 60 * 1000) {
        handleLogout('Sesi berakhir otomatis karena 30 menit tidak ada aktivitas.');
      }
    };

    updateActivity();
    events.forEach(event => window.addEventListener(event, handleActivity));
    activityInterval = setInterval(checkInactivity, 60000); // Check every minute

    const handleForceLogout = () => {
      handleLogout('Sesi berakhir atau token kedaluwarsa. Silakan masuk kembali.');
    };
    window.addEventListener('vibecontent_logout', handleForceLogout);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('vibecontent_logout', handleForceLogout);
      clearInterval(activityInterval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [authenticated]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Workspace Switcher
  const handleSelectWorkspace = async (wsId: string) => {
    const account = authUser?.workspaces.some(w => w.id === wsId) ? authUser : await apiService.me();
    if (!account?.workspaces.some(w => w.id === wsId)) {
      showToast('Akses workspace ditolak. Akun ini bukan anggota tenant tersebut.');
      return;
    }
    setAuthUser(account);
    await setActiveWorkspaceById(wsId, account);
    showToast(`Beralih ke workspace ${account.workspaces.find(w => w.id === wsId)?.name}`);
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

    await apiService.saveDraft(newDraft, brief);
    const refreshed = await apiService.bootstrap(activeWorkspace.id);
    setDrafts(refreshed.drafts);
    setAuditLogs(refreshed.auditLogs);
    setSelectedDraftId(newDraft.id);
    showToast(`Draf "${newDraft.title}" dibuat dengan ${generated.citations.length} sitasi RAG!`);
  };

  // Save new draft version
  const handleSaveNewVersionon = async (draftId: string, version: DraftVersionon, changeSummary: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, versions: [version, ...draft.versions], currentVersionon: version.versionNumber, updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast(`Versi ${version.versionNumber} disimpan ke riwayat audit.`);
  };

  const handleSaveVisual = async (draftId: string, visual: VisualAsset) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, visualAsset: visual, updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast('Gambar disimpan ke draf dan tampil di Penjadwalan Konten.');
  };

  // User confirms the brief is final; Visual Studio unlocks immediately.
  const handleSelfApprove = async (draftId: string) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!activeUser || !draft || !canTransitionDraft(activeUser.role, draft.status, 'disetujui')) {
      showToast('Transisi status tidak diizinkan untuk peran ini.');
      return;
    }
    await apiService.saveDraft({ ...draft, status: 'disetujui', approvalInfo: undefined, updatedAt: new Date().toISOString() });
    if (activeWorkspace) await loadData(activeWorkspace.id);
    setCurrentTab('visual_studio');
    showToast('Brief disetujui. Studio Visual kini tersedia.');
  };

  // Add review comment
  const handleAddComment = async (draftId: string, comment: ReviewComment) => {
    const draft = drafts.find(item => item.id === draftId);
    if (!draft || !activeWorkspace) return;
    await apiService.saveDraft({ ...draft, comments: [...draft.comments, comment], updatedAt: new Date().toISOString() });
    await loadData(activeWorkspace.id);
    showToast('Catatan review berhasil ditambahkan.');
  };


  // Save brand profile
  const handleSaveBrandProfile = async (newProfile: BrandProfile) => {
    await apiService.saveBrand(newProfile);
    setBrandProfile(newProfile);
    showToast('Panduan merek dan profil BUMD berhasil diperbarui.');
  };

  // Persist company-wide grounding/privacy settings; the server derives company from workspace.
  const handleSaveSettings = async (next: AppSettings) => {
    if (!activeWorkspace) return;
    try {
      const saved = await apiService.saveSettings(activeWorkspace.id, next);
      setAppSettings(normalizeSettings(saved));
    } catch (error) {
      showToast(`Gagal menyimpan pengaturan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const handleOpenExport = (draft: ContentDraft) => setExportModalDraft(draft);

  // Create user membership
  const handleCreateUser = async (input: { name: string; email: string; role: UserRole; title: string; department: string; password?: string }) => {
    if (!activeWorkspace) return;
    const created = await apiService.createUser(activeWorkspace.id, input);
    await loadData(activeWorkspace.id);
    showToast(created?.tempPassword
      ? `Pengguna "${input.name}" ditambahkan. Kata sandi sementara: ${created.tempPassword}`
      : `Pengguna "${input.name}" berhasil ditambahkan ke workspace.`);
  };

  // Delete user membership
  const handleDeleteUser = async (userId: string) => {
    if (!activeWorkspace) return;
    await apiService.deleteUser(activeWorkspace.id, userId);
    await loadData(activeWorkspace.id);
    showToast('Keanggotaan pengguna berhasil dihapus.');
  };

  if (!authenticated || !authUser) return <AuthView onAuthed={handleAuthed} />;
  if (loading) return <div style={{display:'grid',placeItems:'center',height:'100vh'}}>Memuat workspace…</div>;
  if (authUser.role === 'superadmin' && !activeWorkspace) {
    return (
      <AdminDashboard
        onOpen={(id: string) => { void handleSelectWorkspace(id).then(() => setCurrentTab('dashboard')).catch(e => showToast(e.message)); }}
        onLogout={handleLogout}
      />
    );
  }
  if (authUser.role === 'corporate' && authUser.workspaces.length === 0) {
    return (
      <div className="app-container">
        <header className="top-header">
          <div className="header-left">
            <div className="brand-logo-wrap">
              <div className="brand-icon-gem">V</div>
              <div className="brand-title-group">
                <h1>VibeContent</h1>
                <span className="brand-tagline">Holding Korporat BUMD</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="role-badge-selector">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {authUser.name.charAt(0)}
              </div>
              <div className="user-meta-text">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{authUser.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admin Korporat</span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <div className="main-layout" style={{ padding: '0 24px', width: '100%' }}>
          <main className="content-viewport" style={{ padding: 0 }}>
            <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setCurrentTab('dashboard')}
              >
                Ringkasan Korporat
              </button>
              <button 
                className={`btn ${currentTab === 'corporate_management' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setCurrentTab('corporate_management')}
              >
                Workspace Perusahaan
              </button>
              <button 
                className={`btn ${currentTab === 'corporate_users' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setCurrentTab('corporate_users')}
              >
                Kreator Perusahaan
              </button>
            </nav>

            {currentTab === 'corporate_management' ? (
              <CorporateManagementView onOpen={id => { void handleSelectWorkspace(id).then(() => setCurrentTab('dashboard')).catch(e => showToast(e.message)); }} />
            ) : currentTab === 'corporate_users' ? (
              <CorporateUsersView />
            ) : (
              <CorporateDashboardView onNavigate={setCurrentTab} onOpenWorkspace={id => { void handleSelectWorkspace(id).catch(e => showToast(e.message)); }} />
            )}
          </main>
        </div>
      </div>
    );
  }

  // No workspace at all (e.g. a creator whose memberships were revoked): there
  // is nothing to open, so show a minimal notice rather than an empty picker.
  if (!activeWorkspace || !activeUser) {
    return <main className="login-shell">
      <section className="login-card card-panel" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <span className="login-kicker">Tidak Ada Workspace</span>
        <h2>Selamat datang, {authUser?.name}</h2>
        <p>Akun Anda belum terhubung ke workspace mana pun.</p>
        <button className="btn btn-secondary" onClick={handleLogout}>Kembali ke halaman masuk</button>
      </section>
    </main>;
  }

  const baseBrand = brandProfile || {
    workspaceId: activeWorkspace.id,
    organizationName: activeWorkspace.name,
    unitDepartment: '',
    defaultLanguage: 'Indonesian',
    targetAudiences: [],
    toneOfVoice: [],
    terminology: [],
    bannedWords: [],
    officialCTAs: [],
    approvedChannels: [],
    brandGuidelinesSummary: '',
    officialDisclaimer: ''
  };

  const effectiveBrandProfile: BrandProfile = {
    ...baseBrand,
    targetAudiences: baseBrand.targetAudiences?.length ? baseBrand.targetAudiences : ['Pelanggan / Masyarakat Umum', 'Instansi Pemerintah', 'Media / Pers', 'Karyawan Internal'],
    toneOfVoice: baseBrand.toneOfVoice?.length ? baseBrand.toneOfVoice : ['Ramah & Solutif', 'Korporat Formal', 'Informatif & Edukatif', 'Tegas & Jelas'],
    officialCTAs: baseBrand.officialCTAs?.length ? baseBrand.officialCTAs : [{ id: 'cta-default', channel: 'Call Center', label: 'Call Center', text: 'Info lebih lanjut hubungi Call Center 1500-xxx' }],
    approvedChannels: baseBrand.approvedChannels?.length ? baseBrand.approvedChannels : ['Instagram Feed & Reels', 'X / Twitter', 'LinkedIn Page', 'Facebook Fanpage', 'Website Portal BUMD', 'Aplikasi Mobile (Push Notif)', 'WhatsApp Blast']
  };
  const selectedDraft = drafts.find(d => d.id === selectedDraftId) || drafts[0];



  const safeTab = canAccessTab(authUser.role, currentTab) ? currentTab : 'dashboard';

    return (
      <div className="app-container">
      {/* Top Header */}
      <Header 
        workspaces={workspaces.filter(workspace => authUser.workspaces.some(member => member.id === workspace.id))}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        users={filterUsersForWorkspace(users, activeWorkspace.id)}
        activeUser={activeUser}
      />

      <div className="main-layout">
        {/* Navigation Sidebar */}
        <Sidebar 
          currentTab={currentTab}
          onSelectTab={setCurrentTab}

          userRole={activeUser.role}
          activeWorkspace={activeWorkspace}
          onLogout={handleLogout}
        />

        {/* Dynamic Viewport */}
        <main className="content-viewport">
          {safeTab === 'dashboard' && authUser.role === 'corporate' && <CorporateDashboardView onNavigate={setCurrentTab} onOpenWorkspace={id => { void handleSelectWorkspace(id).then(() => setCurrentTab('user_management')).catch(e => showToast(e.message)); }} />}
                    {safeTab === 'dashboard' && authUser.role !== 'corporate' && (
                      <DashboardView
              drafts={drafts}
              brandProfile={effectiveBrandProfile}
              activeUser={activeUser}
              activeWorkspace={activeWorkspace}
              onNavigate={setCurrentTab}
              onSelectDraft={(id) => { setSelectedDraftId(id); setCurrentTab('editor'); }}
            />
          )}

          {safeTab === 'brief_studio' && (
            <BriefStudioView 
              brandProfile={effectiveBrandProfile}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              drafts={drafts}
              documents={documents}
              settings={appSettings}
              onOpenEditor={(id) => { setSelectedDraftId(id); setCurrentTab('editor'); }}
              onGenerateDraft={handleGenerateDraft}
              onNavigate={setCurrentTab}
              onDeleteDraft={async (id) => {
                if (window.confirm('Apakah Anda yakin ingin menghapus draf ini?')) {
                  await apiService.deleteDraft(activeWorkspace.id, id);
                  await loadData(activeWorkspace.id);
                  showToast('Draf berhasil dihapus.');
                }
              }}
            />
          )}

          {safeTab === 'editor' && (
            selectedDraft ? (
              <div>
                <div className="card-panel" style={{ marginBottom: '18px', padding: '14px' }}>
                  <label className="form-label">Brief Hasil Generasi</label>
                  <select className="form-select" value={selectedDraft.id} onChange={event => setSelectedDraftId(event.target.value)}>
                    {drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.title} — {draft.status.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <EditorWorkspaceView 
                  draft={selectedDraft}
                  brandProfile={effectiveBrandProfile}
                  activeUser={activeUser}
                  onSaveNewVersionon={handleSaveNewVersionon}
                  onApproveDraft={handleSelfApprove}
                  onOpenExportModal={handleOpenExport}
                />
              </div>
            ) : (
              <div className="card-panel" style={{ textAlign: 'center', padding: '56px 24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Belum Ada Draf Dipilih</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '18px' }}>
                  Belum ada draf di workspace ini, atau belum ada yang dipilih. Buat draf baru di Brief &amp; Generasi, atau buka dari Pustaka.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setCurrentTab('brief_studio')}>Buat Konten Baru</button>
                  <button className="btn btn-secondary" onClick={() => setCurrentTab('library')}>Buka Pustaka</button>
                </div>
              </div>
            )
          )}

          {safeTab === 'visual_studio' && (
            <VisualStudioView 
              draft={selectedDraft?.status === 'disetujui' ? selectedDraft : undefined}
              drafts={drafts}
              onSelectDraft={setSelectedDraftId}
              brandProfile={effectiveBrandProfile}
              activeWorkspace={activeWorkspace}
              onSaveVisual={handleSaveVisual}
            />
          )}


          {safeTab === 'content_scheduling' && (
            <ContentSchedulingView 
              drafts={drafts}
              documents={documents}
              activeWorkspace={activeWorkspace}
              onOpenEditorDraft={(id) => { setSelectedDraftId(id); setCurrentTab('editor'); }}
            />
          )}


          {safeTab === 'library' && (
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
                showToast('Draf berhasil dipindahkan ke arsip.');
              }}
            />
          )}


          {safeTab === 'brand_profile' && (
            <BrandProfileView 
              brandProfile={effectiveBrandProfile}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onSaveProfile={handleSaveBrandProfile}
            />
          )}

          {safeTab === 'corporate_management' && <CorporateManagementView onOpen={(id: string) => { void handleSelectWorkspace(id).then(() => setCurrentTab('dashboard')).catch(e => showToast(e.message)); }} />}
          {safeTab === 'corporate_users' && <CorporateUsersView />}
          {safeTab === 'admin_management' && <AdminDashboard embedded onOpen={(id: string) => { void handleSelectWorkspace(id).then(() => setCurrentTab('dashboard')).catch(e => showToast(e.message)); }} onLogout={handleLogout} />}
          {safeTab === 'knowledge_base' && (
            <KnowledgeBaseView 
              documents={documents}
              workspaces={workspaces.filter(workspace => workspace.companyId === activeWorkspace.companyId)}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
              onNotify={showToast}
              onReload={async () => {
                if (activeWorkspace) await loadData(activeWorkspace.id);
              }}
            />
          )}

          {safeTab === 'audit_log' && (
            <AuditLogView 
              logs={auditLogs}
              activeWorkspace={activeWorkspace}
              activeUser={activeUser}
            />
          )}

          {safeTab === 'user_management' && (
            authUser.role === 'corporate' 
              ? <WorkspaceMappingView /> 
              : <UserManagementView users={filterUsersForWorkspace(users, activeWorkspace.id)} activeWorkspace={activeWorkspace} onCreate={handleCreateUser} onDelete={handleDeleteUser} />
          )}

          {safeTab === 'settings_help' && (
            <SettingsHelpView
              activeWorkspace={activeWorkspace}
              settings={appSettings}
              onSaveSettings={handleSaveSettings}
              onNotify={showToast}
            />
          )}
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