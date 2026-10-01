import React, { useState } from 'react';
import type { User, Workspace } from '../types';
import { Building2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  users: User[];
  workspaces: Workspace[];
  onLogin: (userId: string) => void;
}

export const LoginAccessView: React.FC<Props> = ({ users, workspaces, onLogin }) => {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const selected = users.find(user => user.id === userId);
  const workspace = workspaces.find(item => item.id === selected?.workspaceId);

  return <main className="login-shell">
    <section className="login-brand-panel">

      <p className="brand-tagline">Enterprise Content Workspace Powered by Verified Sources</p>
      <h1>Professional content.<br/>Facts stay under control.</h1>
      <p>VibeContent helps Creators, Reviewers, and Knowledge Owners work within a single, fully traceable workflow.</p>
      <div className="login-trust"><ShieldCheck size={18}/><span>RAG strictly uses active documents within your workspace.</span></div>
    </section>
    <section className="login-card card-panel">
      <span className="login-kicker">Workspace Access</span>
      <h2>Sign in to VibeContent</h2>
      <p>Select your assigned enterprise role to access the workspace.</p>
      <label className="form-group"><span className="form-label">User account</span><select className="form-select" value={userId} onChange={event=>setUserId(event.target.value)}>{users.map(user=><option key={user.id} value={user.id}>{user.name} — {user.role.toUpperCase()}</option>)}</select></label>
      <div className="login-workspace"><Building2 size={18}/><div><small>Authorized workspace</small><strong>{workspace?.name || 'Not available'}</strong></div></div>
      <button className="btn btn-primary" disabled={!selected} onClick={()=>onLogin(userId)}><LockKeyhole size={17}/>Enter workspace</button>
      <small className="login-note">Enterprise Single Sign-On (SSO) active. Connected to secure tenant database.</small>
    </section>
  </main>;
};
