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
  LogOut
} from 'lucide-react';
import { canAccessTab } from '../services/policies';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;

  userRole: UserRole;
  activeWorkspace: Workspace;
  collapsed?: boolean;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,

  userRole,
  activeWorkspace,
  collapsed = false,
  onLogout
}) => {
  const navButton = (tab: ActiveTab, label: string, Icon: React.ComponentType<{ size?: number }>, badge?: React.ReactNode) => {
    if (!canAccessTab(userRole, tab)) return null;
    return <button
      className={`nav-item-btn ${currentTab === tab ? 'active' : ''}`}
      onClick={() => onSelectTab(tab)}
      title={collapsed ? label : undefined}
      aria-label={label}
    >
      <span className="nav-item-icon"><Icon size={18} /></span>
      <span className="nav-item-label">{label}</span>
      {collapsed ? (badge ? <span className="nav-dot" aria-hidden /> : null) : badge}
    </button>;
  };
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        {/* Creation & Content Section */}
        {collapsed ? <div className="nav-divider" aria-hidden /> : <div className="nav-section-title">Produksi Konten</div>}
        <div className="nav-group">
          {navButton('dashboard', 'Dasbor', LayoutDashboard)}
          {navButton('brief_studio', 'Brief & Generasi', PenTool)}
          {navButton('editor', 'Editor & Versi', FileEdit)}
          {navButton('visual_studio', 'Studio Visual', ImageIcon)}
          {navButton('content_scheduling', 'Penjadwalan Konten', CalendarDays)}
        </div>

        {collapsed ? <div className="nav-divider" aria-hidden /> : <div className="nav-section-title">Tata Kelola & Review</div>}
        <div className="nav-group">
          {navButton('library', 'Pustaka & Ekspor', FolderArchive)}
        </div>

        {/* Knowledge & Administration Section */}
        {collapsed ? <div className="nav-divider" aria-hidden /> : <div className="nav-section-title">Pengetahuan & Pengaturan</div>}
        <div className="nav-group">

          {navButton('brand_profile', 'Profil & Merek', Building2)}
          {navButton('corporate_users', 'Kreator Perusahaan', Users)}
          {navButton('corporate_management', 'Workspace Korporat', Building2)}
          {navButton('user_management', 'Pengguna & Peran', Users)}
          {navButton('admin_management', 'Administrasi Aplikasi', ShieldAlert)}
          {navButton('audit_log', 'Jejak Audit', ShieldAlert)}
          {navButton('settings_help', 'Pengaturan & Bantuan', CircleHelp)}
        </div>
      </div>

      {/* Tenant Status Footer (hidden in icon-only mode) */}
      {!collapsed && (
        <div className="tenant-status-box">
          <div className="tenant-status-header">
            <span>Isolasi Tenant Aktif</span>
          </div>
          <div className="tenant-status-body">
            Data terikat pada <strong>{activeWorkspace.code}</strong>. Dokumen dan draf terisolasi dengan aman.
          </div>
        </div>
      )}

      {onLogout && (
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '8px', padding: '10px' }}
            onClick={onLogout}
            title="Keluar"
          >
            <LogOut size={18} />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
