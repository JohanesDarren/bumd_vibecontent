import React from 'react';
import { ActiveTab, UserRole, Workspace } from '../types';
import {
  LayoutDashboard,
  PenTool,
  FileEdit,
  Image as ImageIcon,
  CalendarDays,
  FolderArchive,
  Building2,
  ShieldAlert,
  Users,
  CircleHelp,
  LogOut,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { canAccessTab } from '../services/policies';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  activeWorkspace: Workspace;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  activeWorkspace,
  onLogout
}) => {
  // Icon-only ("sandwich") rail. Every destination is a single icon carrying an
  // accessible label; there is intentionally no text / expanded mode.
  const navButton = (tab: ActiveTab, label: string, Icon: React.ComponentType<{ size?: number }>, badge?: React.ReactNode) => {
    if (!canAccessTab(userRole, tab)) return null;
    return <button
      className={`nav-item-btn ${currentTab === tab ? 'active' : ''}`}
      onClick={() => onSelectTab(tab)}
      title={label}
      aria-label={label}
    >
      <span className="nav-item-icon"><Icon size={22} /></span>
      <span className="nav-item-label">{label}</span>
      {badge ? <span className="nav-dot" aria-hidden /> : null}
    </button>;
  };
  return (
    <aside className="app-sidebar">
      <div>
        {/* Creation & Content Section */}
        <div className="nav-divider" aria-hidden />
        <div className="nav-group">
          {navButton('dashboard', 'Dasbor', LayoutDashboard)}
          {navButton('brief_studio', 'Brief & Generasi', PenTool)}
          {navButton('editor', 'Editor & Versi', FileEdit)}
          {navButton('visual_studio', 'Studio Visual', ImageIcon)}
          {navButton('content_scheduling', 'Penjadwalan Konten', CalendarDays)}
        </div>

        {userRole !== 'corporate' && <>
          <div className="nav-divider" aria-hidden />
          <div className="nav-group">
            {navButton('library', 'Pustaka & Ekspor', FolderArchive)}
          </div>
        </>}

        {/* Knowledge & Administration Section */}
        <div className="nav-divider" aria-hidden />
        <div className="nav-group">
          {navButton('knowledge_base', 'Knowledge Base', BookOpen)}
          {navButton('brand_profile', 'Profil & Merek', Building2)}
          {navButton('corporate_management', 'Workspace Perusahaan', Building2)}
          {navButton('corporate_users', 'Kreator Perusahaan', Users)}
          {navButton('user_management', 'Pengguna & Peran', Users)}
          {navButton('audit_log', 'Jejak Audit', ShieldAlert)}
          {navButton('admin_management', 'Administrasi Aplikasi', ShieldAlert)}
          {navButton('settings_help', 'Pengaturan & Bantuan', CircleHelp)}
        </div>
      </div>

      {/* Tenant-isolation status chip (icon-only footer) */}
      <div
        className="sidebar-rail-status"
        title={`Isolasi tenant aktif — data terikat pada ${activeWorkspace.code}`}
        aria-label={`Isolasi tenant aktif. Data terikat pada workspace ${activeWorkspace.code}.`}
      >
        <ShieldCheck size={22} />
      </div>

      {onLogout && (
        <div style={{ marginTop: '12px' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            onClick={onLogout}
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut size={22} />
          </button>
        </div>
      )}
    </aside>
  );
};
