import React, { useState } from 'react';
import { 
  ContentDraft, 
  BrandProfile, 
  Workspace, 
  VisualAsset 
} from '../types';
import { 
  Sparkles, 
  Download, 
  Copy, 
  ShieldCheck, 
  CheckCircle2, 
  Layout, 
  Smartphone, 
  Monitor, 
  Square,
  FileCheck
} from 'lucide-react';

interface VisualStudioViewProps {
  draft?: ContentDraft;
  brandProfile: BrandProfile;
  activeWorkspace: Workspace;
}

export const VisualStudioView: React.FC<VisualStudioViewProps> = ({
  draft,
  brandProfile,
  activeWorkspace
}) => {
  const defaultVisual: VisualAsset = draft?.visualAsset || {
    id: 'vis-default',
    headline: draft?.title || 'PELAYANAN PUBLIK BUMD MODERN & TERPERCAYA',
    subheadline: 'Mengutamakan Kualitas, Kecepatan, dan Transparansi Layanan Daerah',
    aspectRatio: '1:1',
    primaryColor: activeWorkspace.primaryColor,
    accentColor: activeWorkspace.accentColor,
    badgeText: 'PUBLIKASI RESMI BUMD',
    ctaText: brandProfile.officialCTAs[0]?.label || 'Kunjungi Portal Resmi',
    disclaimer: brandProfile.officialDisclaimer || 'Berdasarkan SK Direksi yang telah disahkan secara hukum.',
    visualPrompt: `High quality Indonesian corporate graphic design for ${activeWorkspace.name}, modern minimalist aesthetic, verified ISO certification stamp, clean typography, official color accents`,
    templateStyle: 'corporate'
  };

  const [visual, setVisual] = useState<VisualAsset>(defaultVisual);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(visual.visualPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Dimension helpers for preview
  const getPreviewDimensions = () => {
    if (visual.aspectRatio === '9:16') {
      return { width: '270px', height: '480px' };
    } else if (visual.aspectRatio === '16:9') {
      return { width: '480px', height: '270px' };
    } else {
      return { width: '380px', height: '380px' };
    }
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Studio Grafis & Aset Visual Korporat</h2>
          <p className="page-subtitle">
            Buat materi grafis informasi dan banner promosi yang mematuhi panduan warna, penempatan logo resmi, dan penafian (disclaimer) <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleCopyPrompt}
          >
            <Copy size={16} />
            <span>{copiedPrompt ? 'Prompt Disalin!' : 'Salin Prompt AI'}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Visual Customizer Form */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Layout size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pengaturan Tata Letak & Elemen</h3>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="form-group">
            <label className="form-label">Rasio Format (Aspect Ratio)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button 
                type="button"
                className={`btn btn-sm ${visual.aspectRatio === '1:1' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVisual({ ...visual, aspectRatio: '1:1' })}
              >
                <Square size={14} />
                <span>1:1 Feed</span>
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${visual.aspectRatio === '9:16' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVisual({ ...visual, aspectRatio: '9:16' })}
              >
                <Smartphone size={14} />
                <span>9:16 Story</span>
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${visual.aspectRatio === '16:9' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVisual({ ...visual, aspectRatio: '16:9' })}
              >
                <Monitor size={14} />
                <span>16:9 Banner</span>
              </button>
            </div>
          </div>

          {/* Headline & Subheadline */}
          <div className="form-group">
            <label className="form-label">Teks Judul Utama (Headline)</label>
            <input 
              type="text" 
              className="form-input" 
              value={visual.headline}
              onChange={e => setVisual({ ...visual, headline: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teks Penjelas (Sub-headline)</label>
            <textarea 
              className="form-textarea" 
              rows={2}
              value={visual.subheadline}
              onChange={e => setVisual({ ...visual, subheadline: e.target.value })}
            />
          </div>

          {/* Badge & CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Teks Pita Label (Badge)</label>
              <input 
                type="text" 
                className="form-input" 
                value={visual.badgeText}
                onChange={e => setVisual({ ...visual, badgeText: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teks Tombol CTA</label>
              <input 
                type="text" 
                className="form-input" 
                value={visual.ctaText}
                onChange={e => setVisual({ ...visual, ctaText: e.target.value })}
              />
            </div>
          </div>

          {/* Style Template */}
          <div className="form-group">
            <label className="form-label">Tema Gaya Visual</label>
            <select 
              className="form-select"
              value={visual.templateStyle}
              onChange={e => setVisual({ ...visual, templateStyle: e.target.value as any })}
            >
              <option value="corporate">🏛️ Corporate BUMD (Navy & Cyan)</option>
              <option value="modern_bold">⚡ Modern Bold (Emerald & Lime)</option>
              <option value="clean_service">💧 Clean Public Service (Sky Blue)</option>
              <option value="infographic">📊 Infografis Data Terverifikasi</option>
            </select>
          </div>

          {/* Brand Compliance Checklist */}
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={16} />
              <span>Kepatuhan Aset Merek (Brand Compliance):</span>
            </div>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
              <li>Logo resmi BUMD diletakkan pada pojok kanan atas dengan proporsi asli.</li>
              <li>Warna dominan menggunakan palet resmi ({activeWorkspace.primaryColor}).</li>
              <li>Mencantumkan penafian (disclaimer) legal di bagian bawah grafis.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Visual Canvas Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div 
            style={{
              ...getPreviewDimensions(),
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
              border: '2px solid rgba(255,255,255,0.15)',
              background: visual.templateStyle === 'modern_bold'
                ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)'
                : (visual.templateStyle === 'clean_service'
                  ? 'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'),
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Background Decorative Rings */}
            <div 
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${activeWorkspace.primaryColor} 0%, transparent 70%)`,
                opacity: 0.4
              }}
            />

            {/* Header: Badge & Organization Logo Placeholder */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <span 
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: activeWorkspace.primaryColor,
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {visual.badgeText}
              </span>

              {/* Official BUMD Logo Badge */}
              <div 
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                <span>{activeWorkspace.code}</span>
              </div>
            </div>

            {/* Middle: Headline & Subheadline */}
            <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0' }}>
              <h3 
                style={{
                  fontSize: visual.aspectRatio === '9:16' ? '1.4rem' : (visual.aspectRatio === '16:9' ? '1.5rem' : '1.35rem'),
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  marginBottom: '10px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {visual.headline}
              </h3>
              <p 
                style={{
                  fontSize: visual.aspectRatio === '9:16' ? '0.85rem' : '0.82rem',
                  color: '#cbd5e1',
                  lineHeight: 1.5
                }}
              >
                {visual.subheadline}
              </p>
            </div>

            {/* Footer: CTA & Disclaimer */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                }}
              >
                {visual.ctaText}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                {visual.disclaimer}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Pratinjau grafis otomatis tersinkronisasi dengan palet merek <strong>{activeWorkspace.name}</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};
