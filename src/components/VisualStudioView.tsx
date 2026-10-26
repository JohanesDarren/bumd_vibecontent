import React, { useEffect, useRef, useState } from 'react';
import { CoreVisualStudio } from './CoreVisualStudio';


import { apiService } from '../services/apiService';
import { normalizeHexColor } from '../services/visualScene';
import { 
  ContentDraft, 
  BrandProfile, 
  Workspace, 
  VisualAsset 
} from '../types';
import { 
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
  /** Persists the visual (with the generated JPEG) on the draft so Scheduling can show it. */
  onSaveVisual?: (draftId: string, visual: VisualAsset) => Promise<void>;
}

export const VisualStudioView: React.FC<VisualStudioViewProps> = ({
  draft,
  drafts,
  onSelectDraft,
  brandProfile,
  activeWorkspace,
  onSaveVisual
}) => {
  const [savingVisual, setSavingVisual] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(draft?.currentVersionon || 1);
  const draftVisual = draft?.visualAsset;
  const defaultVisual: VisualAsset = {
    ...(draftVisual || {
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
    }),
    primaryColor: normalizeHexColor(draftVisual?.primaryColor) || normalizeHexColor(activeWorkspace.primaryColor) || '#0284c7',
    accentColor: normalizeHexColor(draftVisual?.accentColor) || normalizeHexColor(activeWorkspace.accentColor) || '#0ea5e9'
  };

  const [visual, setVisual] = useState<VisualAsset>(defaultVisual);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(draft?.visualAsset?.generatedImageUrl || null);

  const [metadata, setMetadata] = useState('');
  const [references, setReferences] = useState<Array<{id:string;title:string;mediaType:'photo'|'video'}>>([]);
  const [referenceId, setReferenceId] = useState('');
  const [referenceError, setReferenceError] = useState('');
  useEffect(()=>{let active=true;setReferences([]);setReferenceId('');setReferenceError('');
    apiService.listVisualReferences(activeWorkspace.id).then(items=>{if(active)setReferences(items);}).catch(()=>{if(active)setReferenceError('Referensi visual tidak dapat dimuat');});
    return ()=>{active=false;};
  },[activeWorkspace.id]);
  // ponytail: automatic title overlap is server-side; manual choice overrides it when titles are ambiguous.



  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const clearOutput = () => { version.current++; setGeneratedImageUrl(null); setImageLoaded(false); setMetadata(''); };
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const availableDrafts = drafts.filter(item => item.status !== 'diarsipkan');
  const selectedVersion = draft?.versions.find(item => item.versionNumber === selectedVersionNumber) || draft?.versions[0];

  useEffect(() => {
    setSelectedVersionNumber(draft?.currentVersionon || 1);
  }, [draft?.id, draft?.currentVersionon]);

  useEffect(() => {
    setVisual({
      ...defaultVisual,
      id: `vis-${draft?.id || 'new'}-${Date.now()}`,
      headline: draft?.title || '',
      subheadline: '',
      badgeText: '',
      ctaText: '',
      visualPrompt: selectedVersion?.content ? `Create a visual inspired by this edited copy: ${selectedVersion.content.slice(0, 500)}` : ''
    });
    setGeneratedImageUrl(null);
    clearOutput();
    setImageLoaded(false);
    setGenerationError('');
    setMediaError('');
  }, [draft?.id, selectedVersion?.versionNumber, activeWorkspace.id]);

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
      const result=await apiService.generateVisual({workspaceId:activeWorkspace.id,prompt:visual.visualPrompt,referenceId:referenceId||undefined,aspectRatio:visual.aspectRatio,headline:visual.headline,subheadline:visual.subheadline,badgeText:visual.badgeText,ctaText:visual.ctaText,disclaimer:visual.disclaimer,primaryColor:visual.primaryColor,accentColor:visual.accentColor});
      if(requestVersion!==version.current)return;
      setGeneratedImageUrl(result.imageUrl);
      setMetadata(`${result.provider} · ${result.llmModel} → ${result.model} · JPEG${result.referenceUsed?` · gaya: ${result.referenceTitle}`:''}`);
      if(references.length&&!result.referenceUsed&&!referenceId)setReferenceError('Tidak ada judul referensi yang cocok; pilih foto/video secara manual bila ingin memakai gaya tertentu.');
      else setReferenceError('');
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

  if (!draft) {
    return <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <FileCheck size={42} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
      <h2 className="page-title">Pilih Draf Konten</h2>
      <p className="page-subtitle">Pilih draf untuk melanjutkan pembuatan aset visual.</p>
      {availableDrafts.length > 0 ? (
        <select className="form-select" style={{ maxWidth: '420px', margin: '18px auto 0' }} defaultValue="" onChange={event => event.target.value && onSelectDraft(event.target.value)}>
          <option value="" disabled>Pilih draf konten</option>
          {availableDrafts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      ) : (
        <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Belum ada draf. Buat draf dari Brief &amp; Generasi terlebih dahulu.</p>
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
        <label className="form-label">Brief / Konten</label>
        <select className="form-select" value={draft.id} onChange={event => onSelectDraft(event.target.value)}>
          {availableDrafts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <label className="form-label" style={{ marginTop: '12px' }}>Versi konten yang divisualisasikan</label>
        <select className="form-select" value={selectedVersion?.versionNumber ?? ''} onChange={event => setSelectedVersionNumber(Number(event.target.value))}>
          {draft.versions.map(item => <option key={item.versionNumber} value={item.versionNumber}>v{item.versionNumber}{item.versionNumber === draft.currentVersionon ? ' · Terbaru' : ''}</option>)}
        </select>
        <label className="form-label" style={{ marginTop: '12px' }}>Konten versi terpilih</label>
        <textarea className="form-textarea" rows={4} value={selectedVersion?.content ?? ''} readOnly aria-label="Isi versi konten yang dipilih" />
      </div>

      <CoreVisualStudio
          workspaceId={activeWorkspace.id}
          draftTitle={draft.title}
          headline={visual.headline}
          ctaText={visual.ctaText}
          onSave={async imageUrl => {
            setGeneratedImageUrl(imageUrl);
            setMetadata('Visual inti · disimpan ke draf');
          }}
        />
      {metadata && <p style={{ fontSize: 12 }}>{metadata}</p>}
    </div>
  );
};
