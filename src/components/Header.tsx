import React, { useState } from 'react';
import { 
  Workspace, 
  User, 
  UserRole 
} from '../types';
import { 
  Building2, 
  ChevronDown,
  LogOut,
  ShieldCheck, 
  Sun, 
  Moon, 
  RotateCcw, 
  CheckCircle2,
  Sparkles,
  PenTool,
  ShieldAlert,
  Crown,
  Menu
} from 'lucide-react';

interface HeaderProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSelectWorkspace: (wsId: string) => void;
  users: User[];
  activeUser: User;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  users,
  activeUser,
  sidebarCollapsed,
  onToggleSidebar
}) => {
  const [showWsMenu, setShowWsMenu] = useState(false);

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Sidebar collapse toggle (icon-only rail) */}
        <button
          className="icon-btn sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          <Menu size={18} />
        </button>
        <div className="brand-logo-wrap" onClick={() => window.location.reload()}>
          <div className="brand-title-group">
            <h1>VibeContent <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>BUMD</span></h1>
            <div className="brand-tagline">AI Workspace • Knowledge Base Resmi</div>
            <div className="brand-tagline" style={{ marginTop: '2px', opacity: 0.8, fontSize: '0.7rem' }}>Mesin Konten Korporat</div>
          </div>
        </div>

        {/* Organization / Workspace Switcher */}
        <div style={{ position: 'relative' }}>
          <button 
            className="org-switcher-pill"
            onClick={() => setShowWsMenu(!showWsMenu)}
            title="Ganti Organisasi / BUMD"
          >
            <Building2 size={16} color="var(--primary)" />
            <span className="org-name-text">{activeWorkspace.name}</span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showWsMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                width: '320px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                zIndex: 100
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Pilih Workspace BUMD (Tenant Terisolasi)
              </div>
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setShowWsMenu(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: ws.id === activeWorkspace.id ? 'var(--bg-tertiary)' : 'transparent',
                    border: ws.id === activeWorkspace.id ? '1px solid var(--primary)' : '1px solid transparent',
                    marginBottom: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ws.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {ws.city} • {ws.sector}
                    </div>
                  </div>
                  {ws.id === activeWorkspace.id && (
                    <CheckCircle2 size={16} color="var(--primary)" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Signed-in user */}
        <div className="role-badge-selector" style={{ cursor: 'default' }}>
          {activeUser.avatar ? (
            <img 
              src={activeUser.avatar} 
              alt={activeUser.name} 
              className="role-avatar" 
            />
          ) : (
            <div className="role-avatar" style={{ display: 'grid', placeItems: 'center', fontWeight: 700, background: 'var(--primary)', color: '#fff' }}>
              {activeUser.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="user-meta-text">
            <span className="user-name-label">{activeUser.name}</span>
            <span className="user-role-tag">
              {activeUser.role === 'creator' && <span style={{display: 'flex', alignItems: 'center'}}><PenTool size={12} style={{ marginRight: '4px' }} /> Kreator</span>}
  
              {activeUser.role === 'admin' && <span style={{display: 'flex', alignItems: 'center'}}><Crown size={12} style={{ marginRight: '4px' }} /> Admin Pengetahuan</span>}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
