import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AtSign
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { AuthUser } from '../types';

interface AuthViewProps {
  onAuthed: (user: AuthUser) => Promise<void>;
}

const WELCOME_SLIDES = [
  {
    kicker: 'Platform Komunikasi AI BUMD',
    title: 'Satu Akun, Seluruh Perjalanan Konten AI Anda',
    description: 'Rancang, optimalkan, dan publikasikan materi komunikasi publik terintegrasi berbasis knowledge base resmi perusahaan daerah.'
  },
  {
    kicker: 'Efisiensi & Produktivitas Cerdas',
    title: 'Transformasi Publikasi Digital Lebih Cepat',
    description: 'Hasilkan variasi konten berkualitas tinggi yang selaras dengan nilai, regulasi, dan identitas korporasi secara konsisten.'
  },
  {
    kicker: 'Kolaborasi & Tata Kelola Terpadu',
    title: 'Kendali Penuh Alur Kerja Multi-Kanal',
    description: 'Tinjau persetujuan, jadwalkan distribusi, dan pantau performa publikasi dalam satu lingkungan kerja yang aman dan terstruktur.'
  }
];

export const AuthView: React.FC<AuthViewProps> = ({ onAuthed }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  // Ganti teks per 3 detik secara otomatis
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % WELCOME_SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

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

  const currentSlide = WELCOME_SLIDES[activeSlide];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* ── LEFT PANEL: Welcoming Text Saja (Berganti per 3 Detik dengan Animasi Sliding) ── */}
      <section 
        className="relative w-full lg:w-[48%] xl:w-[46%] shrink-0 flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white min-h-[480px] lg:min-h-screen z-20"
      >
        {/* Seamless Background: Single-Path Organic Wave with Continuous Radial Gradient (No dividing line) */}
        <div 
          className="absolute inset-0 lg:w-[calc(100%+96px)] xl:w-[calc(100%+128px)] pointer-events-none z-0"
          aria-hidden="true"
        >
          {/* Mobile straight gradient fallback */}
          <div 
            className="lg:hidden w-full h-full"
            style={{
              background: 'radial-gradient(circle at 20% 25%, #1815d8 0%, #0d0cbd 45%, #050466 100%)',
            }}
          />

          {/* Desktop single continuous vector path - completely seamless */}
          <svg 
            viewBox="0 0 600 1000" 
            preserveAspectRatio="none" 
            className="hidden lg:block w-full h-full"
          >
            <defs>
              <radialGradient id="royalGrad" cx="20%" cy="25%" r="85%" fx="20%" fy="25%">
                <stop offset="0%" stopColor="#1815d8" />
                <stop offset="45%" stopColor="#0d0cbd" />
                <stop offset="100%" stopColor="#050466" />
              </radialGradient>
            </defs>
            <path 
              d="M 0,0 
                 L 500,0 
                 C 550,160 595,270 595,430 
                 C 595,590 518,690 538,820 
                 C 555,900 580,960 500,1000 
                 L 0,1000 Z" 
              fill="url(#royalGrad)" 
            />
          </svg>
        </div>

        {/* Top Spacer */}
        <div className="relative z-20" />

        {/* Center: Welcoming Text Carousel dengan Animasi Sliding Sederhana */}
        <div className="relative z-20 my-auto py-10 max-w-lg">
          <div 
            key={activeSlide} 
            className="slide-in-text flex flex-col"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-cyan-300 text-xs font-semibold w-fit mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{currentSlide.kicker}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.18] mb-5 text-white">
              {currentSlide.title}
            </h1>

            <p className="text-blue-100/90 text-base sm:text-lg font-normal leading-relaxed">
              {currentSlide.description}
            </p>
          </div>

          {/* Indikator Titik Slide */}
          <div className="flex items-center gap-2 mt-8">
            {WELCOME_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx 
                    ? 'w-8 bg-cyan-400' 
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Pindah ke slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Identity */}
        <div className="relative z-20 text-xs text-blue-200/60 font-medium">
          © {new Date().getFullYear()} JagoAI • Enterprise Content Workspace
        </div>
      </section>

      {/* ── RIGHT PANEL: Judul Kecil & Form Login Bersih (Tanpa Elemen Ekstra) ── */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 xl:p-20 bg-white min-h-[480px] lg:min-h-screen relative z-10">
        <div className="w-full max-w-[390px]">
          {/* Judul kecil untuk mengajak login */}
          <div className="mb-8 text-left">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Masuk ke Akun Anda
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Silakan masukkan email dan kata sandi Anda untuk melanjutkan.
            </p>
          </div>

          {/* Pesan Error Jika Login Gagal */}
          {error && (
            <div 
              role="alert" 
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5"
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Login: Hanya Email & Kata Sandi Dengan Placeholder Kosong */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 focus:border-[#0d0cbd] focus:ring-2 focus:ring-[#0d0cbd]/15 outline-none font-medium text-sm text-slate-900 transition-all bg-white shadow-sm"
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
                  className="w-full h-12 pl-11 pr-11 rounded-xl border border-slate-300 focus:border-[#0d0cbd] focus:ring-2 focus:ring-[#0d0cbd]/15 outline-none font-medium text-sm text-slate-900 transition-all bg-white shadow-sm"
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

            {/* Tombol Login */}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full h-12 rounded-xl bg-[#0d0cbd] hover:bg-[#090899] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-800/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{busy ? 'Memproses Masuk…' : 'Masuk ke Akun'}</span>
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
