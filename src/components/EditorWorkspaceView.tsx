import React, { useState, useEffect, useRef } from 'react';
import { 
  ContentDraft, 
  BrandProfile, 
  User, 
  DraftVersionon, 
  GroundedCitation, 
  QualityCheck 
} from '../types';
import { 
  refineDraftContent,
  runQualityCheck 
} from '../services/ragEngine';
import { apiService } from '../services/apiService';
import { 
  Save, 
  Send, 
  RotateCcw, 
  FileCheck, 
  History, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  Columns,
  MessageSquare,
  Share2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Scissors,
  Building,
  Lightbulb,
  MoreHorizontal
} from 'lucide-react';
import { ClipLoader } from 'react-spinners';

interface EditorWorkspaceViewProps {
  draft: ContentDraft;
  brandProfile: BrandProfile;
  activeUser: User;
  onSaveNewVersionon: (draftId: string, version: DraftVersionon, changeSummary: string) => void;
  onApproveDraft: (draftId: string) => void;
  onOpenExportModal: (draft: ContentDraft) => void;
}

// ── Variation definitions ──────────────────────────────────────────────
interface VariationOption {
  id: string;
  label: string;
  promptAction: string;
  group: 'primary' | 'format' | 'tone' | 'rag';
}

const VARIATIONS: VariationOption[] = [
  // Primary (always visible as buttons)
  {
    id: 'concise',
    label: 'Lebih Ringkas',
    group: 'primary',
    promptAction: 'Ringkas teks ini agar lebih padat tanpa menghilangkan fakta atau data penting. Kurangi pengulangan kata dan kalimat, pertahankan makna inti dari setiap paragraf.'
  },
  {
    id: 'broadcast_wa',
    label: 'Broadcast WA',
    group: 'primary',
    promptAction: 'Format ulang teks ini menjadi pesan siaran WhatsApp (Broadcast). Gunakan sapaan yang ramah, buat kalimatnya to-the-point, berikan jarak antar paragraf (whitespace), dan tambahkan emoji yang relevan secukupnya.'
  },
  {
    id: 'caption_ig',
    label: 'Caption IG',
    group: 'primary',
    promptAction: 'Ubah teks ini menjadi caption Instagram. Mulai dengan kalimat pembuka (hook) yang menarik, gunakan nada bicara santai tapi informatif, dan tambahkan 5 hashtag relevan di akhir teks.'
  },
  {
    id: 'formal',
    label: 'Formal Korporat',
    group: 'primary',
    promptAction: 'Tulis ulang teks ini menggunakan gaya bahasa formal korporat yang baku, sesuai dengan standar surat resmi BUMD. Gunakan diksi yang presisi dan profesional.'
  },
  // Format Distribusi (in overflow)
  {
    id: 'bullet_points',
    label: 'Jadikan Poin-poin',
    group: 'format',
    promptAction: 'Ekstrak informasi penting dari teks ini dan susun ulang menjadi format bullet points atau daftar bernomor (numbered list) agar lebih mudah dipindai oleh pembaca.'
  },
  {
    id: 'x_thread',
    label: 'Ubah ke Format Thread',
    group: 'format',
    promptAction: 'Pecah teks ini menjadi format thread media sosial (X/Twitter). Setiap bagian thread tidak boleh lebih dari 280 karakter, gunakan penomoran 1/N di awal setiap bagian.'
  },
  // Gaya Bahasa & Nada (in overflow)
  {
    id: 'friendly_edu',
    label: 'Lebih Ramah & Edukatif',
    group: 'tone',
    promptAction: 'Tulis ulang teks ini dengan mengurangi nada birokratis. Gunakan gaya bahasa yang hangat, empatik, dan berfokus pada edukasi pelanggan layaknya seorang rekan.'
  },
  // Koreksi RAG (in overflow)
  {
    id: 'expand',
    label: 'Perluas Penjelasan',
    group: 'rag',
    promptAction: 'Kembangkan teks ini menjadi lebih detail. Tambahkan konteks, contoh konkret, atau penjelasan lebih lanjut tanpa mengubah makna dari draf aslinya.'
  },
  {
    id: 'rewrite_no_rag',
    label: 'Tulis Ulang (Tanpa RAG)',
    group: 'rag',
    promptAction: 'Abaikan dokumen referensi (RAG context) sebelumnya jika ada. Tulis ulang draf ini murni berdasarkan brief awal menggunakan pengetahuan umum (General Knowledge) Anda tentang topik ini.'
  }
];

const PRIMARY_IDS = ['concise', 'broadcast_wa', 'caption_ig', 'formal'];

export const EditorWorkspaceView: React.FC<EditorWorkspaceViewProps> = ({
  draft,
  brandProfile,
  activeUser,
  onSaveNewVersionon,
  onApproveDraft,
  onOpenExportModal
}) => {
  const currentVer = draft.versions[0];
  const [editedContent, setEditedContent] = useState(currentVer?.content || '');
  const [activeTabSide, setActiveTabSide] = useState<'grounding' | 'scorecard' | 'history' | 'diff'>('grounding');
  const [selectedCitation, setSelectedCitation] = useState<GroundedCitation | null>(null);
  const [compareVersiononNumber, setCompareVersiononNumber] = useState<number>(draft.versions[1]?.versionNumber || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeNote, setChangeNote] = useState('Editorial draft revision');

  // Quick Variation state
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  // Base text variations are applied to: always the pre-variation draft (or the
  // user's manual edits), never the output of a previous variation. This keeps
  // switching variations clean instead of stacking one format inside another.
  const [variationBase, setVariationBase] = useState(currentVer?.content || '');
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null);

  // Keep state updated if selected draft changes
  useEffect(() => {
    setEditedContent(draft.versions[0]?.content || '');
    setVariationBase(draft.versions[0]?.content || '');
    setActiveVariationId(null);
    if (draft.versions[0]?.citations?.[0]) {
      setSelectedCitation(draft.versions[0].citations[0]);
    }
  }, [draft]);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    if (showOverflowMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOverflowMenu]);

  // Live quality check over the current edited text
  const liveCheck: QualityCheck = runQualityCheck(
    editedContent,
    {
      id: draft.briefId,
      workspaceId: draft.workspaceId,
      title: draft.title,
      targetAudience: '',
      format: draft.format,
      channel: '',
      tone: '',
      keyMessage: draft.title,
      cta: brandProfile.officialCTAs[0]?.text || '',
      language: brandProfile.defaultLanguage,
      createdAt: draft.createdAt,
      createdBy: draft.createdBy
    },
    brandProfile,
    currentVer?.citations || [],
    currentVer?.unsupportedClaims || []
  );

  // Quick Refinements (F-08) — Simulated logic to avoid remote RAG proxy timeouts
  const handleRefine = async (variation: VariationOption) => {
    if (refiningId) return; // prevent concurrent refinements
    setRefiningId(variation.id);
    setShowOverflowMenu(false);
    try {
      // Simulate network request delay (loading state requirement)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Always transform the pre-variation base text so switching variations
      // fully replaces the previous style instead of nesting inside it.
      const result = refineDraftContent(variationBase, variation.id, brandProfile);
      setEditedContent(result.newContent);
      setActiveVariationId(variation.id);
    } catch (error) {
      console.error('Refine failed:', error);
      alert(`Gagal memproses variasi "${variation.label}". Silakan coba lagi.`);
    } finally {
      setRefiningId(null);
    }
  };

  // Reset the editor back to the pre-variation base text
  const handleResetVariation = () => {
    setEditedContent(variationBase);
    setActiveVariationId(null);
  };

  // Save new version
  const handleConfirmSave = () => {
    const newVerNumber = draft.versions.length + 1;
    const newVersionon: DraftVersionon = {
      versionNumber: newVerNumber,
      content: editedContent,
      scenes: currentVer?.scenes,
      citations: currentVer?.citations || [],
      unsupportedClaims: currentVer?.unsupportedClaims || [],
      qualityCheck: liveCheck,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.name,
      changeSummary: changeNote || `Version ${newVerNumber} saved by ${activeUser.name}`
    };

    onSaveNewVersionon(draft.id, newVersionon, changeNote);
    setShowSaveModal(false);
  };

  // Rollback to previous version
  const handleRollback = (ver: DraftVersionon) => {
    if (window.confirm(`Pulihkan konten draf ke Versi ${ver.versionNumber}?`)) {
      setEditedContent(ver.content);
      const rollbackVer: DraftVersionon = {
        versionNumber: draft.versions.length + 1,
        content: ver.content,
        scenes: ver.scenes,
        citations: ver.citations,
        unsupportedClaims: ver.unsupportedClaims,
        qualityCheck: ver.qualityCheck,
        createdAt: new Date().toISOString(),
        createdBy: activeUser.name,
        changeSummary: `Rolled draft back to Version ${ver.versionNumber}`
      };
      onSaveNewVersionon(draft.id, rollbackVer, `Rollback ke Version ${ver.versionNumber}`);
    }
  };

  const comparedVer = draft.versions.find(v => v.versionNumber === compareVersiononNumber) || draft.versions[1] || currentVer;

  const primaryVariations = VARIATIONS.filter(v => PRIMARY_IDS.includes(v.id));
  const overflowVariations = VARIATIONS.filter(v => !PRIMARY_IDS.includes(v.id));

  // Group labels for overflow menu sections
  const overflowGroups: { label: string; items: VariationOption[] }[] = [
    { label: 'Format Distribusi', items: overflowVariations.filter(v => v.group === 'format') },
    { label: 'Gaya Bahasa & Nada', items: overflowVariations.filter(v => v.group === 'tone') },
    { label: 'Koreksi RAG', items: overflowVariations.filter(v => v.group === 'rag') },
  ];

  return (
    <div>
      {/* Top Header with Status and Actions */}
      <div className="page-header-row" style={{ alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className={`status-pill ${draft.status}`}>
              {draft.status === 'draft' && 'Draf'}
              {draft.status === 'menunggu_review' && 'Menunggu Review'}
              {draft.status === 'revisi_diminta' && 'Revisi Diminta'}
              {draft.status === 'disetujui' && 'Disetujui'}
              {draft.status === 'diarsipkan' && 'Diarsipkan'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Versi: <strong>v{draft.currentVersionon}</strong> ({draft.versions.length} versi tersimpan)
            </span>
          </div>
          <h2 className="page-title">{draft.title}</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => onOpenExportModal(draft)}
          >
            <Share2 size={16} />
            <span>Ekspor & Salin</span>
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => setShowSaveModal(true)}
          >
            <Save size={16} />
            <span>Simpan Versi Baru</span>
          </button>

          {draft.status !== 'disetujui' && (
            <button 
              className="btn btn-primary"
              onClick={() => onApproveDraft(draft.id)}
            >
              <CheckCircle2 size={16} />
              <span>Setujui Brief & Lanjutkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Watermark Banner if Draft (PRD F-06 / F-08 requirement) */}
      <div className="draft-watermark" style={{ marginBottom: '20px' }}>
        <AlertTriangle size={16} />
        <span>
          STATUS: <strong>DRAF</strong> — Sempurnakan brief ini, lalu setujui untuk membuka Studio Visual.
        </span>
      </div>

      {/* Main Split View: Left (Editor + Quick Refinements) | Right (Grounding, Scorecard, Versionon Diff) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Refinements Toolbar */}
          <div className="card-panel" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                <Sparkles size={14} />
                <span>Variasi Cepat (F-08):</span>
                {activeVariationId && (
                  <button
                    type="button"
                    onClick={handleResetVariation}
                    title="Kembali ke draf sebelum variasi diterapkan"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'var(--accent-cyan)',
                      background: 'transparent',
                      border: '1px solid var(--accent-cyan)',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={10} />
                    <span>Reset variasi</span>
                  </button>
                )}
              </div>
              {refiningId && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  <ClipLoader size={12} color="currentColor" speedMultiplier={0.8} />
                  Memproses variasi...
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Primary variation buttons */}
              {primaryVariations.map(v => (
                <button 
                  key={v.id}
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRefine(v)}
                  disabled={refiningId !== null}
                  title={v.promptAction}
                  style={{ 
                    opacity: refiningId && refiningId !== v.id ? 0.55 : 1,
                    position: 'relative',
                    minWidth: refiningId === v.id ? '120px' : undefined
                  }}
                >
                  {refiningId === v.id ? (
                    <>
                      <ClipLoader size={13} color="currentColor" speedMultiplier={0.8} />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>{v.label}</span>
                  )}
                </button>
              ))}

              {/* Overflow dropdown trigger */}
              <div ref={overflowRef} style={{ position: 'relative' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                  disabled={refiningId !== null}
                  title="Variasi Lainnya"
                  style={{ 
                    opacity: refiningId ? 0.55 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MoreHorizontal size={14} />
                  <span>Variasi Lainnya</span>
                  <ChevronDown size={12} />
                </button>

                {showOverflowMenu && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    zIndex: 50,
                    minWidth: '260px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px 0',
                    backdropFilter: 'blur(12px)'
                  }}>
                    {overflowGroups.map((group, gIdx) => (
                      <div key={group.label}>
                        {gIdx > 0 && (
                          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 12px' }} />
                        )}
                        <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {group.label}
                        </div>
                        {group.items.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleRefine(v)}
                            disabled={refiningId !== null}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 14px',
                              background: 'transparent',
                              border: 'none',
                              cursor: refiningId ? 'not-allowed' : 'pointer',
                              fontSize: '0.82rem',
                              color: 'var(--text-primary)',
                              textAlign: 'left',
                              borderRadius: '0',
                              transition: 'background var(--transition-fast)'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {refiningId === v.id ? (
                              <>
                                <ClipLoader size={13} color="currentColor" speedMultiplier={0.8} />
                                <span>Memproses...</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                                <span>{v.label}</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Textarea Editor */}
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Editor Draf ({editedContent.length} karakter)
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Diperiksa otomatis
              </span>
            </div>

            <textarea 
              className="form-textarea"
              style={{ minHeight: '380px', fontSize: '0.92rem', lineHeight: 1.7, fontFamily: 'var(--font-sans)', border: 'none', background: 'transparent', padding: '8px 0' }}
              value={editedContent}
              onChange={e => {
                // Manual edits become the new base for future variations.
                setEditedContent(e.target.value);
                setVariationBase(e.target.value);
                setActiveVariationId(null);
              }}
              placeholder="Draft script text..."
            />

            {/* If video script format, show interactive scene breakdown table */}
            {draft.format === 'naskah_singkat' && currentVer?.scenes && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Video Script Storyboard</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentVer.scenes.map((scene, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'grid',
                        gridTemplateColumns: '60px 1.2fr 1.4fr 1fr',
                        gap: '12px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                        Scene {scene.sceneNumber}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>VISUAL</span>
                        {scene.visualDirection}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>AUDIO / DIALOG</span>
                        {scene.audioNarration}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TEXT ON SCREEN</span>
                        <code>{scene.textOnScreen}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grounding Citations, Scorecard, Versionon Diff */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-tabs switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button 
              className={`btn btn-sm ${activeTabSide === 'grounding' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('grounding')}
            >
              <BookOpen size={14} />
              <span>Sumber Dokumen</span>
            </button>
            <button 
              className={`btn btn-sm ${activeTabSide === 'scorecard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('scorecard')}
            >
              <FileCheck size={14} />
              <span>Skor Kualitas</span>
            </button>
            <button 
              className={`btn btn-sm ${activeTabSide === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('history')}
            >
              <History size={14} />
              <span>Riwayat</span>
            </button>
            <button 
              className={`btn btn-sm ${activeTabSide === 'diff' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('diff')}
            >
              <Columns size={14} />
              <span>Bandingkan</span>
            </button>
          </div>

          {/* TAB 1: Grounding & Citations Inspector */}
          {activeTabSide === 'grounding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Dokumen Sumber yang Ditemukan</h4>
                <span className="grounding-badge verified">
                  <ShieldCheck size={12} /> Berbasis Dokumen
                </span>
              </div>

              {!currentVer?.citations?.length ? (
                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-tertiary)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Tidak ada dokumen sumber yang ditemukan untuk draf ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {currentVer.citations.map((c, idx) => (
                    <div 
                      key={c.id || idx}
                      onClick={() => setSelectedCitation(c)}
                      className="citation-drawer-card"
                      style={{ 
                        cursor: 'pointer',
                        borderColor: selectedCitation?.id === c.id ? 'var(--accent-cyan)' : 'var(--primary)',
                        background: selectedCitation?.id === c.id ? 'var(--bg-card-hover)' : 'var(--bg-tertiary)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                           {c.documentTitle}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(13, 12, 189, 0.2)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {c.relevanceScore}% Relevan
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>
                        {c.section} {c.page ? `• Page ${c.page}` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                        "{c.excerpt}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unsupported Claims Gap Notice (PRD F-04 Acceptance Criteria) */}
              {currentVer?.unsupportedClaims && currentVer.unsupportedClaims.length > 0 && (
                <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    <AlertTriangle size={14} />
                    <span>Yang Perlu Dicek Sebelum Terbit</span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    Beberapa bagian berikut belum ditemukan di dokumen resmi. Mohon dicek dan dicocokkan dengan dokumen sumber sebelum konten diterbitkan.
                  </p>
                  <ul style={{ paddingLeft: '16px', marginTop: '8px', fontSize: '0.76rem' }}>
                    {currentVer.unsupportedClaims.map((claim, idx) => (
                      <li key={idx} style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>{claim}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Cocokkan poin di atas dengan dokumen resmi di panel ini. Kalau semua sudah sesuai, konten siap diterbitkan.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pre-Flight Scorecard (PRD F-09) */}
          {activeTabSide === 'scorecard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Automated Quality Check (F-09)</h4>
                <span className={`status-pill ${liveCheck.overallStatus}`}>
                  {liveCheck.overallStatus === 'siap_review' ? 'Ready to Submit' : 'Needs Verification'}
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Kepatuhan Brief & Pesan</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.briefCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.briefCompliance.score >= 80 ? 'score-high' : 'score-med'}`}>
                  {liveCheck.briefCompliance.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Kepatuhan Tone & Gaya BUMD</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.toneCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.toneCompliance.score >= 80 ? 'score-high' : 'score-low'}`}>
                  {liveCheck.toneCompliance.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Dukungan Fakta</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {liveCheck.factualGrounding.passed
                      ? 'Dokumen sumber sudah tersedia. Tetap cocokkan tiap klaim dengan isi dokumennya ya.'
                      : `${liveCheck.factualGrounding.ungroundedClaims.length} hal perlu Anda cek. Dokumen yang terlampir belum tentu cocok dengan semua klaim.`}
                  </div>
                </div>
                <span className={`score-badge ${liveCheck.factualGrounding.passed ? 'score-high' : 'score-low'}`}>
                  {liveCheck.factualGrounding.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Call to Action Completeness</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.ctaCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.ctaCompliance.hasCta ? 'score-high' : 'score-med'}`}>
                  {liveCheck.ctaCompliance.hasCta ? 'COMPLETE' : 'MISSING'}
                </span>
              </div>

              {liveCheck.bannedWordsFound.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: 700, marginBottom: '4px' }}>
                    🚨 Kata Terlarang Terdeteksi:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    The terms "{liveCheck.bannedWordsFound.join(', ')}" violate BUMD brand guidelines. Please replace them with measured, formal language.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Versionon History (PRD F-08) */}
          {activeTabSide === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Riwayat Versi (F-08)</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{draft.versions.length} Versions Saved</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {draft.versions.map(ver => (
                  <div 
                    key={ver.versionNumber}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-tertiary)',
                      border: ver.versionNumber === draft.currentVersionon ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Version {ver.versionNumber} {ver.versionNumber === draft.currentVersionon ? '(Active)' : ''}
                      </span>
                      {ver.versionNumber !== draft.currentVersionon && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                          onClick={() => handleRollback(ver)}
                        >
                          <RotateCcw size={12} />
                          <span>Rollback</span>
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      By: <strong>{ver.createdBy}</strong> • {new Date(ver.createdAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      "{ver.changeSummary}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Versionon Comparison Diff (PRD F-08) */}
          {activeTabSide === 'diff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Perbandingan Versi (Diff)</h4>
                <select 
                  className="form-select"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                  value={compareVersiononNumber}
                  onChange={e => setCompareVersiononNumber(Number(e.target.value))}
                >
                  {draft.versions.map(v => (
                    <option key={v.versionNumber} value={v.versionNumber}>
                      Compare with v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                <div style={{ padding: '10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.25)', maxHeight: '350px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#fb7185', marginBottom: '6px' }}>
                    Version {comparedVer?.versionNumber ?? '-'} ({comparedVer?.createdBy ?? '-'})
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
                    {comparedVer?.content ?? ''}
                  </pre>
                </div>

                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', maxHeight: '350px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                    Current Draft (Editor)
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-primary)' }}>
                    {editedContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Versionon Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Simpan Versi Baru (v{draft.versions.length + 1})</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Versi baru akan disimpan dalam riwayat audit draf BUMD. Mohon sertakan ringkasan perubahan Anda.
              </p>
              <div className="form-group">
                <label className="form-label">Ringkasan Perubahan *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                  placeholder="cth.: Meringkas poin persyaratan agar lebih padat"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleConfirmSave}
              >
                Simpan Versi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
