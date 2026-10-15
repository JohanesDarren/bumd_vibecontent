import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AtSign
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { AuthUser } from '../types';
import { IsometricContentMotherboard } from './IsometricContentMotherboard';

interface AuthViewProps {
  onAuthed: (user: AuthUser) => Promise<void>;
  onFirstRun?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthed }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setBusy(true);
    try {
      const user = await apiService.login(email.trim(), password);
      await onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email atau kata sandi tidak sesuai');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row items-center justify-between overflow-hidden bg-[#f1f5fd] font-sans selection:bg-[#1815d8] selection:text-white">
      {/* ── 3D ISOMETRIC CONTENT-ENGINE MOTHERBOARD BACKGROUND ── */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <IsometricContentMotherboard className="w-full h-full" />
      </div>

      <div className="absolute top-6 left-6 sm:top-9 sm:left-10 z-20" title="VibeContent">
        <img src="/favicon.svg?v=2" alt="VibeContent" width="42" height="42" />
      </div>

      {/* Left empty spacer to allow the 3D isometric processor chip to shine freely */}
      <div className="hidden lg:block lg:flex-1 h-full pointer-events-none" />

      {/* ── RIGHT PANEL: ULTRA-PREMIUM FROSTED GLASS LOGIN FORM ── */}
      <section className="relative z-20 w-full lg:w-[480px] xl:w-[500px] flex items-center justify-center p-6 sm:p-10 lg:p-12 lg:mr-8 xl:mr-16 my-auto">
        <div 
          className="w-full max-w-[420px] rounded-3xl p-7 sm:p-9 border border-white/70 shadow-2xl transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.62)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            boxShadow: '0 24px 60px -12px rgba(13, 12, 189, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
          }}
        >
          {/* Welcoming Text */}
          <div className="mb-7 text-left">
            <h2 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight mb-2">
              Masuk ke Akun Anda
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-medium">
              Selamat datang, selamat mencoba VibeContent!
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div 
              role="alert" 
              className="mb-5 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Input Email */}
            <div>
              <label 
                htmlFor="login-email" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Email
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <AtSign size={18} />
                </span>
                <input 
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder=""
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300/80 focus:border-[#1815d8] focus:ring-2 focus:ring-[#1815d8]/20 outline-none font-medium text-sm text-slate-900 transition-all shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.72)',
                  }}
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div>
              <label 
                htmlFor="login-password" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder=""
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-11 rounded-xl border border-slate-300/80 focus:border-[#1815d8] focus:ring-2 focus:ring-[#1815d8]/20 outline-none font-medium text-sm text-slate-900 transition-all shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.72)',
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button with Royal Blue Gradient */}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full h-12 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: 'radial-gradient(circle at 20% 25%, #1815d8 0%, #0d0cbd 50%, #050466 100%)',
              }}
            >
              <span>{busy ? 'Memproses Masuk…' : 'Masuk ke Akun'}</span>
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Footer Meta */}
          <div className="mt-6 pt-5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Enterprise Content System</span>
            <span>v4.2.0 • Secured</span>
          </div>
        </div>
      </section>
    </div>
  );
};
