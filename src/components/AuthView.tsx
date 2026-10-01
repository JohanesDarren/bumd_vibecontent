import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck, Sparkles, Mail, UserPlus, LogIn, Building2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuthUser { id:string; name:string; email:string; workspaces:{id:string;name:string;code:string;role:string}[] }

interface Props {
  onAuthed: (user:AuthUser) => void;
  onFirstRun: () => void;
  hasWorkspaces: boolean;
}

export const AuthView: React.FC<Props> = ({ onAuthed, onFirstRun, hasWorkspaces }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const user = await apiService.login(email.trim(), password);
        onAuthed(user);
      } else {
        await apiService.register({ name: name.trim(), email: email.trim(), password, workspaceCode: workspaceCode.trim() });
        const user = await apiService.login(email.trim(), password);
        onAuthed(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return <main className="login-shell">
    <section className="login-brand-panel">

      <p className="brand-tagline">Enterprise Content Workspace Powered by Verified Sources</p>
      <h1>Professional content.<br/>Facts stay under control.</h1>
      <p>VibeContent helps Creators, Reviewers, and Knowledge Owners work within a single, fully traceable workflow.</p>
      <div className="login-trust"><ShieldCheck size={18}/><span>RAG strictly uses active documents within your workspace.</span></div>
    </section>
    <section className="login-card card-panel">
      <span className="login-kicker">Workspace Access</span>
      <h2>{mode === 'login' ? 'Sign in to VibeContent' : 'Create your account'}</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button type="button" className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('login'); setError(''); }}><LogIn size={14}/><span>Sign In</span></button>
        <button type="button" className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('register'); setError(''); }}><UserPlus size={14}/><span>Register</span></button>
      </div>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label className="form-group"><span className="form-label">Full name</span>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required /></label>
        )}
        <label className="form-group"><span className="form-label">Email</span>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required /></label>
        <label className="form-group"><span className="form-label">Password{mode === 'register' ? ' (min 8 characters)' : ''}</span>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={mode === 'register' ? 8 : undefined} required /></label>
        {mode === 'register' && (
          <label className="form-group"><span className="form-label">Workspace code</span>
            <input className="form-input" value={workspaceCode} onChange={e => setWorkspaceCode(e.target.value)} placeholder="e.g. TIRTA" required /></label>
        )}
        {error && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', color: '#fb7185', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          <LockKeyhole size={17}/>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {hasWorkspaces && (
        <div className="login-workspace" style={{ marginTop: '14px' }}>
          <Building2 size={18}/>
          <div><small>New organization?</small>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '4px' }} onClick={onFirstRun}>Provision a new workspace</button>
          </div>
        </div>
      )}
      <small className="login-note">Credentials are verified against the secure tenant database. Passwords are stored salted &amp; hashed (scrypt).</small>
    </section>
  </main>;
};
