import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { AuthUser } from '../types';
import { CarouselShowcase } from './CarouselShowcase';

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

  const handleDemoFill = () => {
    setEmail('admin@tirta.demo');
    setPassword('DemoPass123');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-white font-sans selection:bg-[#0d0cbd] selection:text-white">
      {/* ── LEFT PANEL: 3-LINE VERTICAL SLIDING CAROUSEL SHOWCASE ── */}
      <section className="hidden md:block w-full md:w-[48%] lg:w-[54%] xl:w-[56%] h-[40vh] md:h-screen relative overflow-hidden bg-white">
        <CarouselShowcase className="h-full w-full" />
      </section>

      {/* ── RIGHT PANEL: CLEAN LOGIN FORM WITHOUT CARD ── */}
      <section className="w-full md:w-[52%] lg:w-[46%] xl:w-[44%] min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-white relative">
        <div className="w-full max-w-[360px] sm:max-w-[390px] flex flex-col items-center">
          {/* Brand mark, centred above the welcome heading */}
          <img
            src="/favicon.svg?v=2"
            alt="VibeContent"
            width={56}
            height={56}
            className="mb-6 h-14 w-14 rounded-2xl shadow-[0_6px_20px_-6px_rgba(13,12,189,0.35)]"
          />

          {/* Heading in High-Contrast Editorial Serif */}
          <h1 className="font-serif text-[38px] sm:text-[45px] leading-[1.12] text-slate-900 tracking-tight text-center mb-2 font-normal">
            Selamat datang<br />kembali
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-xs sm:text-[13px] text-center mb-8 font-normal">
            Masukkan email untuk masuk ke akun Anda
          </p>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="w-full mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col">
            {/* Input Email */}
            <div className="mb-4">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-slate-200/90 bg-[#f8fafc] focus:bg-white focus:border-[#0d0cbd] focus:ring-1 focus:ring-[#0d0cbd]/20 outline-none font-normal text-sm text-slate-800 placeholder:text-slate-300 transition-all"
              />
            </div>

            {/* Input Kata Sandi */}
            <div className="mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-500 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-10 rounded-lg border border-slate-200/90 bg-[#f8fafc] focus:bg-white focus:border-[#0d0cbd] focus:ring-1 focus:ring-[#0d0cbd]/20 outline-none font-normal text-sm text-slate-800 placeholder:text-slate-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lupa Kata Sandi */}
            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-xs text-slate-400 hover:text-[#0d0cbd] transition-colors cursor-pointer"
                title="Klik untuk mengisi akun demo"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg border border-[#0d0cbd] text-[#0d0cbd] hover:bg-[#0d0cbd] hover:text-white active:scale-[0.99] font-semibold text-sm transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {busy ? 'Memproses…' : 'Masuk'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
