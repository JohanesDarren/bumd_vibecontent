import React, { useEffect, useRef, useState } from 'react';
import { CoreVisualStudio } from './CoreVisualStudio';
import { DraftPicker } from './ui/DraftPicker';


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
  // The newest version is always the one visualised — the version picker is gone,
  // so there is nothing to select here.
  const selectedVersion = draft?.versions.find(item => item.versionNumber === draft?.currentVersion) || draft?.versions[0];

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
        <div style={{ maxWidth: '420px', margin: '18px auto 0', textAlign: 'left' }}>
          <DraftPicker
            drafts={availableDrafts}
            value={null}
            onChange={onSelectDraft}
            label=""
            placeholder="Pilih draf konten"
            excludeArchived={false}
          />
        </div>
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
        {/* Only the brief is a choice here: the version and its copy are picked in
            the editor, so repeating them made this page ask twice. */}
        <DraftPicker
          drafts={availableDrafts}
          value={draft.id}
          onChange={onSelectDraft}
          label="Brief yang akan divisualkan"
          excludeArchived={false}
        />
      </div>

      <CoreVisualStudio
          workspaceId={activeWorkspace.id}
          draftTitle={draft.title}
          headline={visual.headline}
          ctaText={visual.ctaText}
          companyType={activeWorkspace.sector}
          onSave={async imageUrl => {
            setGeneratedImageUrl(imageUrl);
            // Persist for real: writing only to local state made the "saved"
            // message a lie, and Scheduling kept saying "belum ada gambar".
            if (!onSaveVisual) {
              setMetadata('Gambar dihasilkan, tetapi penyimpanan tidak tersedia.');
              return;
            }
            await onSaveVisual(draft.id, {
              ...visual,
              generatedImageUrl: imageUrl
            });
            setMetadata('Gambar tersimpan ke draf.');
          }}
        />
      {metadata && <p style={{ fontSize: 12 }}>{metadata}</p>}
    </div>
  );
};
