import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { AuthUser } from '../types';

export const AuthView: React.FC<{ onAuthed: (user: AuthUser) => Promise<void> }> = ({ onAuthed }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onAuthed(await apiService.login(email.trim(), password)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal masuk'); }
    finally { setBusy(false); }
  };

  return <main className="login-shell">
    <section className="login-brand-panel">
      <p className="brand-tagline">Workspace Konten Korporat Berbasis Sumber Terverifikasi</p>
      <h1>Konten profesional.<br/>Fakta tetap terkendali.</h1>
      <p>VibeContent membantu tim membuat dan mengelola konten dalam workspace mereka.</p>
      <div className="login-trust"><ShieldCheck size={18}/><span>Akses sesuai peran: Kreator, Korporat, atau Superadmin.</span></div>
    </section>
    <section className="login-card card-panel">
      <span className="login-kicker">Akses Akun</span>
      <h2>Masuk ke VibeContent</h2>
      <form onSubmit={submit}>
        <label className="form-group"><span className="form-label">Email</span>
          <input className="form-input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label className="form-group"><span className="form-label">Kata sandi</span>
          <input className="form-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.12)', color: '#fb7185', marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}><LockKeyhole size={17}/>{busy ? 'Mohon tunggu…' : 'Masuk'}</button>
      </form>
      <small className="login-note">Akun dibuat oleh admin korporat atau superadmin. Hubungi pengelola Anda jika belum memiliki akses.</small>
    </section>
  </main>;
};
