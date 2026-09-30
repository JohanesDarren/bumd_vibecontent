import React from 'react';
import { ActiveTab, UserRole, Workspace } from '../types';
import { 
  LayoutDashboard, 
  PenTool, 
  FileEdit, 
  Image as ImageIcon, 
  CheckSquare, 
  FolderArchive, 
  BookOpen, 
  Sparkles, 
  ShieldAlert, 
  Database,
  Users,
  CircleHelp
} from 'lucide-react';
import { canAccessTab } from '../services/policies';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingReviewCount: number;
  activeDocCount: number;
  userRole: UserRole;
  activeWorkspace: Workspace;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewCount,
  activeDocCount,
  userRole,
  activeWorkspace
}) => {
  const navButton = (tab: ActiveTab, label: string, Icon: React.ComponentType<{size?: number}>, badge?: React.ReactNode) => {
    if (!canAccessTab(userRole, tab)) return null;
    return <button className={`nav-item-btn ${currentTab === tab ? 'active' : ''}`} onClick={() => onSelectTab(tab)}>
      <Icon size={18}/><span>{label}</span>{badge}
    </button>;
  };
  return (
    <aside className="app-sidebar">
      <div>
        {/* Creation & Content Section */}
        <div className="nav-section-title">Produksi Konten</div>
        <div className="nav-group">
          {navButton('dashboard', 'Dashboard', LayoutDashboard)}
          {navButton('brief_studio', 'Brief & Generasi', PenTool)}
          {navButton('editor', 'Editor & Versi', FileEdit)}
          {navButton('visual_studio', 'Studio Visual', ImageIcon)}
        </div>

        {/* Governance & Review Section */}
        <div className="nav-section-title">Tata Kelola & Review</div>
        <div className="nav-group">
          {navButton('review_approval', 'Review & Approval', CheckSquare, pendingReviewCount > 0 ? <span className="nav-badge alert">{pendingReviewCount}</span> : null)}
          {navButton('library', 'Pustaka & Ekspor', FolderArchive)}
        </div>

        {/* Knowledge & Administration Section */}
        <div className="nav-section-title">Knowledge & Pengaturan</div>
        <div className="nav-group">
          {navButton('knowledge_base', 'Knowledge Base RAG', BookOpen, <span className="nav-badge">{activeDocCount} Aktif</span>)}
          {navButton('brand_profile', 'Profil & Brand', Sparkles)}
          {navButton('user_management', 'Pengguna & Peran', Users)}
          {navButton('audit_log', 'Audit Trail', ShieldAlert)}
          {navButton('settings_help', 'Pengaturan & Bantuan', CircleHelp)}
        </div>
      </div>

      {/* Tenant Status Footer */}
      <div className="tenant-status-box">
        <div className="tenant-status-header">
          <Database size={14} />
          <span>Isolasi Tenant Aktif</span>
        </div>
        <div className="tenant-status-body">
          Data terikat pada <strong>{activeWorkspace.code}</strong>. Dokumen dan naskah terisolasi aman.
        </div>
      </div>
    </aside>
  );
};
