import React from 'react';
import { ActiveTab, UserRole, Workspace } from '../types';
import { 
  LayoutDashboard, 
  PenTool, 
  FileEdit, 
  Image as ImageIcon, 
  CalendarDays,
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
      <span>{label}</span>{badge}
    </button>;
  };
  return (
    <aside className="app-sidebar">
      <div>
        {/* Creation & Content Section */}
        <div className="nav-section-title">Content Production</div>
        <div className="nav-group">
          {navButton('dashboard', 'Dashboard', LayoutDashboard)}
          {navButton('brief_studio', 'Brief & Generation', PenTool)}
          {navButton('editor', 'Editor & Versions', FileEdit)}
          {navButton('visual_studio', 'Visual Studio', ImageIcon)}
          {navButton('content_scheduling', 'Content Scheduling', CalendarDays)}

        </div>

        {/* Governance & Review Section */}
        <div className="nav-section-title">Governance & Review</div>
        <div className="nav-group">
          {navButton('review_approval', 'Review & Approval', CheckSquare, pendingReviewCount > 0 ? <span className="nav-badge alert">{pendingReviewCount}</span> : null)}
          {navButton('library', 'Library & Export', FolderArchive)}
        </div>

        {/* Knowledge & Administration Section */}
        <div className="nav-section-title">Knowledge & Settings</div>
        <div className="nav-group">
          {navButton('knowledge_base', 'RAG Knowledge Base', BookOpen, <span className="nav-badge">{activeDocCount} Active</span>)}
          {navButton('brand_profile', 'Profile & Brand', Sparkles)}
          {navButton('user_management', 'Users & Roles', Users)}
          {navButton('audit_log', 'Audit Trail', ShieldAlert)}
          {navButton('settings_help', 'Settings & Help', CircleHelp)}
        </div>
      </div>

      {/* Tenant Status Footer */}
      <div className="tenant-status-box">
        <div className="tenant-status-header">
          <span>Active Tenant Isolation</span>
        </div>
        <div className="tenant-status-body">
          Data bound to <strong>{activeWorkspace.code}</strong>. Documents and drafts are securely isolated.
        </div>
      </div>
    </aside>
  );
};
