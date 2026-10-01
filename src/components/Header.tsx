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
  Crown
} from 'lucide-react';

interface HeaderProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSelectWorkspace: (wsId: string) => void;
  users: User[];
  activeUser: User;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  users,
  activeUser,
  onLogout,
  theme,
  onToggleTheme,
  onResetData
}) => {
  const [showWsMenu, setShowWsMenu] = useState(false);

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="brand-logo-wrap" onClick={() => window.location.reload()}>
          <div className="brand-title-group">
            <h1>VibeContent <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>BUMD</span></h1>
            <div className="brand-tagline">AI Workspace • Grounded RAG Knowledge Base</div>
            <div className="brand-tagline" style={{ marginTop: '2px', opacity: 0.8, fontSize: '0.7rem' }}>Enterprise Content Engine</div>
          </div>
        </div>

        {/* Organization / Workspace Switcher */}
        <div style={{ position: 'relative' }}>
          <button 
            className="org-switcher-pill"
            onClick={() => setShowWsMenu(!showWsMenu)}
            title="Switch Organization / BUMD"
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
                Select BUMD Workspace (Isolated Tenant)
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
        {/* Grounding Safety Status */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}
          title="BUMD facts are only pulled from active official documents (RAG-Only Grounding)"
        >
          <ShieldCheck size={14} />
          <span>RAG-Grounded Only</span>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={onToggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Destructive data clear */}
        <button 
          onClick={() => {
            if (window.confirm('Delete all application data? This action cannot be undone.')) {
              onResetData();
            }
          }}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px' }}
          title="Delete all data"
        >
          <RotateCcw size={16} />
        </button>

        {/* Signed-in user + Logout */}
        <div className="role-badge-selector" style={{ cursor: 'default' }}>
          <img 
            src={activeUser.avatar} 
            alt={activeUser.name} 
            className="role-avatar" 
          />
          <div className="user-meta-text">
            <span className="user-name-label">{activeUser.name}</span>
            <span className="user-role-tag">
              {activeUser.role === 'creator' && <span style={{display: 'flex', alignItems: 'center'}}><PenTool size={12} style={{ marginRight: '4px' }} /> Creator</span>}
              {activeUser.role === 'reviewer' && <span style={{display: 'flex', alignItems: 'center'}}><ShieldAlert size={12} style={{ marginRight: '4px' }} /> Reviewer / Approver</span>}
              {activeUser.role === 'admin' && <span style={{display: 'flex', alignItems: 'center'}}><Crown size={12} style={{ marginRight: '4px' }} /> Knowledge Admin</span>}
            </span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Sign out"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
