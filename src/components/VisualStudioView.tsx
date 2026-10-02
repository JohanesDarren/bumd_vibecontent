import React, { useEffect, useRef, useState } from 'react';


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

  const [metadata, setMetadata] = useState('');



  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const clearOutput = () => { version.current++; setGeneratedImageUrl(null); setImageLoaded(false); setMetadata(''); };
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
    clearOutput();
    setImageLoaded(false);
    setGenerationError('');
    setMediaError('');
  }, [draft?.id, activeWorkspace.id]);

  const updateVisual = (patch: Partial<VisualAsset>) => {
    setVisual(current => ({ ...current, ...patch }));
    clearOutput();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(visual.visualPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleGenerate = async () => {
    if (!draft) return;
    clearOutput();
    const requestVersion=version.current;
    setIsGenerating(true);setGenerationError('');setMediaError('');
    try {
      const result=await apiService.generateVisual({workspaceId:activeWorkspace.id,prompt:visual.visualPrompt,aspectRatio:visual.aspectRatio,headline:visual.headline,subheadline:visual.subheadline,badgeText:visual.badgeText,ctaText:visual.ctaText,disclaimer:visual.disclaimer,primaryColor:visual.primaryColor,accentColor:visual.accentColor});
      if(requestVersion!==version.current)return;
      setGeneratedImageUrl(result.imageUrl);
      setMetadata(`${result.provider} · ${result.model} · JPEG`);
    } catch(error) {if(requestVersion===version.current)setGenerationError(error instanceof Error?error.message:'Visual design failed');}
    finally {setIsGenerating(false);}
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
                onClick={() => updateVisual({ aspectRatio: '1:1' })}
              >
                <Square size={14} />
                <span>1:1 Feed</span>
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${visual.aspectRatio === '9:16' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateVisual({ aspectRatio: '9:16' })}
              >
                <Smartphone size={14} />
                <span>9:16 Story</span>
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${visual.aspectRatio === '16:9' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateVisual({ aspectRatio: '16:9' })}
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
              onChange={e => updateVisual({ headline: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sub-headline Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea 
              className="form-textarea" 
              rows={2}
              value={visual.subheadline}
              onChange={e => updateVisual({ subheadline: e.target.value })}
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
                onChange={e => updateVisual({ badgeText: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CTA Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input 
                type="text" 
                className="form-input" 
                value={visual.ctaText}
                onChange={e => updateVisual({ ctaText: e.target.value })}
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
              onChange={e => updateVisual({ visualPrompt: e.target.value })}
              placeholder="Describe the visual you want: mood, composition, subject, lighting, art direction, camera angle, materials, and colors…"
            />
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Cloudflare FLUX.1 schnell: 2048 characters total including copy and palette. Text accuracy is not guaranteed; review before publishing.
            </div>
          </div>

          {/* Brand Compliance Checklist */}
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={16} />
              <span>Brand Asset Compliance:</span>
            </div>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
              <li>AI-generated raster image; no automatic official logo placement.</li>
              <li>FLUX receives the requested palette ({activeWorkspace.primaryColor}).</li>
              <li>Copy and disclaimer are requested in the image, not typeset. Verify spelling and brand compliance.</li>
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
            {generatedImageUrl ? <img src={generatedImageUrl} alt={visual.visualPrompt || 'Cloudflare FLUX generated image'} onLoad={() => setImageLoaded(true)} onError={() => {setMediaError('Image preview could not be loaded.');setImageLoaded(false);}} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}} /> : <p style={{color:'#fff'}}>No generated artwork. Enter creative direction, then generate an image.</p>}

          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleCopyPrompt}>
              <Copy size={16} />
              <span>{copiedPrompt ? 'Prompt Tersalin!' : 'Salin Prompt AI'}</span>
            </button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={16} />
              <span>{isGenerating ? 'FLUX membuat gambar…' : generatedImageUrl ? 'Desain Ulang' : 'Buat Gambar AI'}</span>
            </button>
          </div>
          {generationError && <div style={{ color: '#fb7185', fontSize: '0.8rem' }}>{generationError}</div>}
          {mediaError && <div style={{ color: '#fb7185', fontSize: '0.8rem' }}>{mediaError}</div>}
          {generatedImageUrl && !imageLoaded && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading preview…</div>}
          {generatedImageUrl && imageLoaded && <a className="btn btn-secondary" href={generatedImageUrl} download="flux-image.jpg"><Download size={16}/> Download Image JPEG</a>}
          <p role="status">Video unavailable: FLUX.1 schnell generates still images only.</p>
          {metadata && <p style={{fontSize:12}}>{metadata}</p>}
          <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Cloudflare Workers AI · FLUX.1 schnell. Free-tier quota applies; no automatic retry or plan upgrade. Aspect ratio requests guide composition; the downloaded JPEG retains the model’s native dimensions. Downloads unlock after preview loads. Outputs stay in this session; download to retain them.</div>

        </div>
      </div>
    </div>
  );
};
