import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck, Sparkles, Mail, UserPlus, LogIn, Building2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuthUser { id:string; name:string; email:string; workspaces:{id:string;name:string;code:string;role:string}[] }

interface Props {
  onAuthed: (user:AuthUser) => void;
  onFirstRun: () => void;
}

export const AuthView: React.FC<Props> = ({ onAuthed, onFirstRun }) => {
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
      setError(err instanceof Error ? err.message : 'Autentikasi gagal');
    } finally {
      setBusy(false);
    }
  };

  return <main className="login-shell">
    <section className="login-brand-panel">

      <p className="brand-tagline">Workspace Konten Korporat Berbasis Sumber Terverifikasi</p>
      <h1>Konten profesional.<br/>Fakta tetap terkendali.</h1>
      <p>VibeContent membantu pengguna membuat, menyempurnakan, menyetujui, dan memproduksi konten visual dalam satu alur kerja.</p>
      <div className="login-trust"><ShieldCheck size={18}/><span>RAG hanya menggunakan dokumen aktif di workspace Anda.</span></div>
    </section>
    <section className="login-card card-panel">
      <span className="login-kicker">Workspace Access</span>
      <h2>{mode === 'login' ? 'Masuk ke VibeContent' : 'Buat akun Anda'}</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button type="button" className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('login'); setError(''); }}><LogIn size={14}/><span>Masuk</span></button>
        <button type="button" className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('register'); setError(''); }}><UserPlus size={14}/><span>Daftar</span></button>
      </div>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label className="form-group"><span className="form-label">Nama lengkap</span>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required /></label>
        )}
        <label className="form-group"><span className="form-label">Email</span>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required /></label>
        <label className="form-group"><span className="form-label">Kata sandi{mode === 'register' ? ' (min. 8 karakter)' : ''}</span>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={mode === 'register' ? 8 : undefined} required /></label>
        {mode === 'register' && (
          <label className="form-group"><span className="form-label">Kode workspace</span>
            <input className="form-input" value={workspaceCode} onChange={e => setWorkspaceCode(e.target.value)} placeholder="e.g. TIRTA" required /></label>
        )}
        {error && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', color: '#fb7185', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          <LockKeyhole size={17}/>{busy ? 'Mohon tunggu…' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
        </button>
      </form>
      {(
        <div className="login-workspace" style={{ marginTop: '14px' }}>
          <Building2 size={18}/>
          <div><small>Organisasi baru?</small>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '4px' }} onClick={onFirstRun}>Buat workspace baru</button>
          </div>
        </div>
      )}
      <small className="login-note">Kredensial diverifikasi terhadap basis data tenant yang aman. Kata sandi disimpan dengan salt &amp; hash (scrypt).</small>
    </section>
  </main>;
};
