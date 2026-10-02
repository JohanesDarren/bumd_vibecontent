import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
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
  drafts: ContentDraft[];
  onSelectDraft: (draftId: string) => void;
  brandProfile: BrandProfile;
  activeWorkspace: Workspace;
}

export const VisualStudioView: React.FC<VisualStudioViewProps> = ({
  draft,
  drafts,
  onSelectDraft,
  brandProfile,
  activeWorkspace
}) => {
  const defaultVisual: VisualAsset = draft?.visualAsset || {
    id: `vis-${draft?.id || 'new'}-${Date.now()}`,
    headline: draft?.title || '',
    subheadline: '',
    aspectRatio: '1:1',
    primaryColor: activeWorkspace.primaryColor,
    accentColor: activeWorkspace.accentColor,
    badgeText: '',
    ctaText: '',
    disclaimer: brandProfile.officialDisclaimer || '',
    visualPrompt: `High quality corporate graphic design for ${activeWorkspace.name}, modern minimalist aesthetic, clean typography, official color accents`,
    templateStyle: 'corporate'
  };

  const [visual, setVisual] = useState<VisualAsset>(defaultVisual);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(draft?.visualAsset?.generatedImageUrl || null);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const approvedDrafts = drafts.filter(item => item.status === 'disetujui');

  useEffect(() => {
    setVisual({
      ...defaultVisual,
      id: `vis-${draft?.id || 'new'}-${Date.now()}`,
      headline: '',
      subheadline: '',
      badgeText: '',
      ctaText: '',
      visualPrompt: ''
    });
    setGeneratedImageUrl(null);
    setFallbackImageUrl(null);
    setImageLoaded(false);
    setGenerationError('');
    setMediaError('');
  }, [draft?.id]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(visual.visualPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handlePreviewError = () => {
    if (fallbackImageUrl && generatedImageUrl !== fallbackImageUrl) {
      setGeneratedImageUrl(fallbackImageUrl);
      setImageLoaded(false);
      return;
    }
    setMediaError('Generated image could not be loaded.');
    setImageLoaded(false);
  };

  const handleGenerate = async () => {
    const activeDraft = draft;
    if (!activeDraft) return;
    setIsGenerating(true);
    setGenerationError('');
    setMediaError('');
    setImageLoaded(false);
    const clip = (value: string) => value.trim().slice(0, 120);
    const textParts = [
      visual.headline && `HEADLINE: "${clip(visual.headline)}"`,
      visual.subheadline && `SUBHEADLINE: "${clip(visual.subheadline)}"`,
      visual.badgeText && `BADGE: "${clip(visual.badgeText)}"`,
      visual.ctaText && `CTA: "${clip(visual.ctaText)}"`
    ].filter(Boolean);
    const textInstruction = textParts.length
      ? `Render these exact text elements visibly in the artwork; do not omit them: ${textParts.join(' | ')}.`
      : 'Do not render any text in the artwork.';
    const creativeDirection = visual.visualPrompt.trim().slice(0, 700);
    const prompt = `${creativeDirection}. Brand colors: ${visual.primaryColor}, ${visual.accentColor}. ${textInstruction}`;
    try {
      const providerPrompt = `${creativeDirection}. ${textParts.length ? `${textInstruction} editorial poster typography layout` : 'editorial visual composition'}. High-quality composition, clear subject, coherent lighting, strong focal point, visually faithful to the creative direction.`.slice(0, 900);
      const result = await apiService.generateVisual({ prompt, providerPrompt, aspectRatio: visual.aspectRatio, headline: visual.headline, subheadline: visual.subheadline, badgeText: visual.badgeText, ctaText: visual.ctaText });
      if (!result.imageUrl || !result.imageUrl.startsWith('http')) throw new Error('Image provider returned no valid preview URL.');
      // Render immediately. The <img> element owns load/error state; do not block the UI on a second preload request.
      setFallbackImageUrl(result.fallbackImageUrl || null);
      setGeneratedImageUrl(result.imageUrl);
      setImageLoaded(false);
      const nextVisual = { ...visual, generatedImageUrl: result.imageUrl };
      setVisual(nextVisual);
      try {
        await apiService.saveDraft({ ...activeDraft, visualAsset: nextVisual, updatedAt: new Date().toISOString() });
      } catch (saveError) {
        console.warn('Generated image preview succeeded, but draft save failed:', saveError);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Image generation failed');
    } finally {
      setIsGenerating(false);
    }
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

  if (!draft || draft.status !== 'disetujui') {
    return <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <FileCheck size={42} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
      <h2 className="page-title">Perlu Konten Disetujui</h2>
      <p className="page-subtitle">Pilih konten yang telah menyelesaikan review dan persetujuan sebelum membuat aset visual.</p>
      {approvedDrafts.length > 0 ? (
        <select className="form-select" style={{ maxWidth: '420px', margin: '18px auto 0' }} defaultValue="" onChange={event => event.target.value && onSelectDraft(event.target.value)}>
          <option value="" disabled>Pilih konten yang disetujui</option>
          {approvedDrafts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      ) : (
        <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Belum ada konten yang disetujui. Ajukan draf hasil generasi untuk review terlebih dahulu.</p>
      )}
    </div>;
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Studio Grafis & Aset Visual Korporat</h2>
          <p className="page-subtitle">
            Buat materi infografis dan banner promosi yang sesuai dengan panduan warna, penempatan logo resmi, dan disclaimer <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>

      </div>

      <div className="card-panel" style={{ marginBottom: '20px', padding: '14px' }}>
        <label className="form-label">Konten Disetujui</label>
        <select className="form-select" value={draft.id} onChange={event => onSelectDraft(event.target.value)}>
          {approvedDrafts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
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
            <label className="form-label">Aspect Ratio</label>
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
            <label className="form-label">Headline Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input 
              type="text" 
              className="form-input" 
              value={visual.headline}
              onChange={e => setVisual({ ...visual, headline: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sub-headline Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
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
              <label className="form-label">Badge Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input 
                type="text" 
                className="form-input" 
                value={visual.badgeText}
                onChange={e => setVisual({ ...visual, badgeText: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CTA Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input 
                type="text" 
                className="form-input" 
                value={visual.ctaText}
                onChange={e => setVisual({ ...visual, ctaText: e.target.value })}
              />
            </div>
          </div>

          {/* Free-form creative direction */}
          <div className="form-group">
            <label className="form-label">Creative Direction</label>
            <textarea
              className="form-textarea"
              rows={5}
              value={visual.visualPrompt}
              onChange={e => setVisual({ ...visual, visualPrompt: e.target.value })}
              placeholder="Describe the visual you want: mood, composition, subject, lighting, art direction, camera angle, materials, and colors…"
            />
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Free-form prompt. The app adds approved brief and brand context automatically.
            </div>
          </div>

          {/* Brand Compliance Checklist */}
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={16} />
              <span>Brand Asset Compliance:</span>
            </div>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
              <li>The official BUMD logo is placed in the top-right corner at original proportions.</li>
              <li>Dominant colors use the official palette ({activeWorkspace.primaryColor}).</li>
              <li>A legal disclaimer is displayed at the bottom of the graphic.</li>
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
              backgroundColor: visual.primaryColor || '#0f172a',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {generatedImageUrl && <img src={generatedImageUrl} alt="Generated visual preview" onLoad={() => setImageLoaded(true)} onError={() => { if (fallbackImageUrl && generatedImageUrl !== fallbackImageUrl) { setGeneratedImageUrl(fallbackImageUrl); setImageLoaded(false); } else { setMediaError('Generated image could not be loaded.'); setImageLoaded(false); } }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
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

            {!generatedImageUrl && <div style={{ position: 'relative', zIndex: 2, margin: 'auto', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>Preview appears after generation.</div>}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleCopyPrompt}>
              <Copy size={16} />
              <span>{copiedPrompt ? 'Prompt Tersalin!' : 'Salin Prompt AI'}</span>
            </button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={16} />
              <span>{isGenerating ? 'Membuat gambar…' : generatedImageUrl ? 'Regenerasi Gambar' : 'Buat Gambar Gratis'}</span>
            </button>
          </div>
          {generationError && <div style={{ color: '#fb7185', fontSize: '0.8rem' }}>{generationError}</div>}
          {mediaError && <div style={{ color: '#fb7185', fontSize: '0.8rem' }}>{mediaError}</div>}
          {generatedImageUrl && !imageLoaded && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading preview…</div>}
          {generatedImageUrl && imageLoaded && <a className="btn btn-secondary" href={generatedImageUrl} target="_blank" rel="noreferrer" download>
            <Download size={16} /> Download Generated Image
          </a>}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Preview first. Download unlocks after the image loads. Free MVP generation via Pollinations.AI / FLUX.
          </div>
        </div>
      </div>
    </div>
  );
};
