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

      {/* Login Form Panel */}
      <section className="flex flex-col justify-center items-center w-full md:w-1/2 p-8 lg:p-24">
        <div className="w-full max-w-md bg-surface-container-lowest p-10 rounded-2xl shadow-lg border border-outline">
          <div className="mb-8 text-center md:text-left">
            <span className="text-primary font-label-sm uppercase tracking-widest font-bold mb-2 block">Akses Akun</span>
            <h2 className="font-headline-lg text-2xl font-bold text-on-surface">Masuk ke VibeContent</h2>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="font-label-md font-semibold text-on-surface-variant">Email</span>
              <input
                className="w-full bg-surface-container px-4 py-3 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-on-surface"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-label-md font-semibold text-on-surface-variant">Kata sandi</span>
              <input
                className="w-full bg-surface-container px-4 py-3 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-on-surface"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>

            {error && (
              <div role="alert" className="px-4 py-3 rounded-lg bg-error-container text-error font-body-sm font-medium">
                {error}
              </div>
            )}

            <button
              className="mt-2 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-label-md font-bold px-6 py-3.5 rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={busy}
            >
              <LockKeyhole size={18} />
              {busy ? 'Mohon tunggu…' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-outline text-center md:text-left">
            <small className="font-body-sm text-on-surface-variant block">
              Akun dibuat oleh admin korporat atau superadmin. Hubungi pengelola Anda jika belum memiliki akses.
            </small>
          </div>
        </div>
      </section>
    </main>
  );
};
