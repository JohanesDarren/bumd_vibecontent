import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { AuthUser } from '../types';

interface AuthUser { id:string; name:string; email:string; workspaces:{id:string;name:string;code:string;role:string}[] }

interface Props {
  onAuthed: (user:AuthUser) => void;
  onFirstRun: () => void;
}

export const AuthView: React.FC<Props> = ({ onAuthed, onFirstRun }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface">
      {/* Brand Panel */}
      <section className="hidden md:flex flex-col justify-center w-full md:w-1/2 p-12 lg:p-24 bg-primary text-on-primary">
        <p className="text-primary-container font-label-md uppercase tracking-wider mb-6 font-semibold">
          Workspace Konten Korporat Berbasis Sumber Terverifikasi
        </p>
        <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight mb-6">
          Konten profesional.<br/>Fakta tetap terkendali.
        </h1>
        <p className="text-primary-container font-body-lg text-lg mb-12 max-w-lg">
          VibeContent membantu tim membuat dan mengelola konten dalam workspace mereka secara terstruktur dan aman.
        </p>
        <div className="flex items-center gap-3 text-primary-container font-label-md bg-white/10 w-max px-4 py-3 rounded-xl border border-white/20">
          <ShieldCheck size={20} className="text-accent-emerald" />
          <span>Akses sesuai peran: Kreator, Korporat, atau Superadmin.</span>
        </div>
      </section>

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
      </section>
    </main>
  );
};
