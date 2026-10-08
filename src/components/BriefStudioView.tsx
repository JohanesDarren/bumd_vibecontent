import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BrandProfile, 
  ContentDraft,

  ContentFormat, 
  ContentBrief, 
  Workspace,
  User,
  GroundedCitation,
  ActiveTab
} from '../types';
import { 
  generateContentFromBrief, 
  RemoteGrounding, 
  GeneratedOutput 
} from '../services/ragEngine';
import { apiService, RagHit, RagStatus } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { 
  Sparkles, 

  AlertCircle, 
  CheckCircle2, 
  Send,

  Type,
  Minus,
  Plus,
  MessageSquare,
  Wand2,
  Loader2,
  CornerDownLeft,
  Zap,
  AlertTriangle,
  ExternalLink,
  MoreVertical
} from 'lucide-react';

interface BriefStudioViewProps {
  brandProfile: BrandProfile;

  activeWorkspace: Workspace;
  activeUser: User;
  drafts: ContentDraft[];
  onOpenEditor: (draftId: string) => void;
  onGenerateDraft: (brief: ContentBrief, output: GeneratedOutput) => Promise<void> | void;
  onNavigate?: (tab: ActiveTab) => void;
  onDeleteDraft?: (draftId: string) => void;
}

/** Map a live RAG search hit to the citation shape the workspace expects. */
function toCitation(hit: RagHit, index: number): GroundedCitation {
  const content = typeof hit.content === 'string' ? hit.content.trim() : '';
  const rawScore = typeof hit.score === 'number' ? hit.score : 0;
  const relevanceScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
  return {
    id: `cit-${index}`,
    documentId: hit.document_id || `unknown-${index}`,
    documentTitle: hit.document_name || hit.document_id || 'Knowledge Base Source',
    section: hit.section || 'Knowledge Base',
    page: hit.page ?? undefined,
    excerpt: content,
    relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
    verified: false,
    claimExcerpt: content.slice(0, 80) + (content.length > 80 ? '...' : '')
  };
}

export const BriefStudioView: React.FC<BriefStudioViewProps> = ({
  brandProfile,

  activeWorkspace,
  activeUser,
  drafts,
  onOpenEditor,
  onGenerateDraft,
  onNavigate,
  onDeleteDraft
}) => {
  const [title, setTitle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [format, setFormat] = useState<ContentFormat>('copy_caption');
  const [channel, setChannel] = useState(brandProfile.approvedChannels[0] || '');
  const [tone, setTone] = useState(brandProfile.toneOfVoice[0] || '');
  const [keyMessage, setKeyMessage] = useState('');
  const [selectedCta, setSelectedCta] = useState(brandProfile.officialCTAs[0]?.text || '');
  const [limitations, setLimitations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);



  // Editor & Streaming state
  const [editorContent, setEditorContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDone, setStreamingDone] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Live remote RAG service + latest grounding metadata
  const [ragService, setRagService] = useState<RagStatus | null>(null);
  const [ragModel, setRagModel] = useState<string | null>(null);
  const [usedRemoteRag, setUsedRemoteRag] = useState(false);

  const loadRagStatus = useCallback(() => {
    apiService.ragStatus()
      .then(s => setRagService(s))
      .catch(error => { console.error('ragStatus failed:', error); setRagService({ configured: false, ready: false }); });
  }, []);

  useEffect(() => { loadRagStatus(); }, [loadRagStatus]);
  useRealtimeSignal(loadRagStatus);




  // Streaming text simulation
  const streamText = useCallback((fullText: string) => {
    setEditorContent('');
    setIsStreaming(true);
    setStreamingDone(false);
    let idx = 0;
    const chunkSize = () => Math.floor(Math.random() * 4) + 1; // 1-4 chars

    const tick = () => {
      if (idx >= fullText.length) {
        setIsStreaming(false);
        setStreamingDone(true);
        return;
      }
      const cs = chunkSize();
      const next = Math.min(idx + cs, fullText.length);
      const chunk = fullText.slice(0, next);
      setEditorContent(chunk);
      idx = next;

      // Variable speed for realistic effect
      const delay = fullText[idx - 1] === '\n' ? 80 : (Math.random() * 18 + 8);
      streamTimerRef.current = setTimeout(tick, delay);
    };

    streamTimerRef.current = setTimeout(tick, 300);
  }, []);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !keyMessage.trim()) {
      alert('Judul konten dan pesan kunci wajib diisi.');
      return;
    }

    setIsGenerating(true);

    const brief: ContentBrief = {
      id: `brf-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      title,
      campaign,
      targetAudience,
      format,
      channel,
      tone,
      keyMessage,
      cta: selectedCta,
      limitations,
      language: brandProfile.defaultLanguage,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.id
    };

    setGenerationError(null);
    const structuredQuery = [
      `Judul: ${title}`,
      campaign ? `Kampanye/Program: ${campaign}` : '',
      `Format Output: ${format}`,
      channel ? `Kanal Distribusi: ${channel}` : '',
      targetAudience ? `Target Audiens: ${targetAudience}` : '',
      tone ? `Nada Suara: ${tone}` : '',
      selectedCta ? `Call to Action (CTA): ${selectedCta}` : '',
      limitations ? `Batasan/Syarat Penting: ${limitations}` : '',
      `Pesan Kunci & Fakta:\n${keyMessage}`
    ].filter(Boolean).join('\n');
    const retrievalQuery = [
      campaign,
      title,
      keyMessage,
      limitations
    ].filter(Boolean).join('\n');

    let remote: RemoteGrounding = {
      answer: '',
      citations: [],
      unsupportedClaims: [],
      grounded: false
    };
    if (ragService && (!ragService.configured || !ragService.ready)) {
      const reason = ragService.error || 'Layanan RAG belum siap.';
      remote.unsupportedClaims = [`${reason} Isi brief disimpan sebagai draf yang perlu diverifikasi.`];
      setUsedRemoteRag(false);
      setRagModel(null);
      setGenerationError('Layanan RAG belum siap. Draf cadangan tetap dibuat dari brief dan ditandai untuk verifikasi.');
    } else {
      try {
        const [rag, retrieval] = await Promise.all([
          apiService.ragQuery(activeWorkspace.id, structuredQuery, 5),
          apiService.ragSearch(activeWorkspace.id, retrievalQuery, 5)
        ]);
        const querySources = (rag.sources || [])
          .filter(hit => typeof hit.content === 'string' && hit.content.trim())
          .map(toCitation);
        const searchSources = (retrieval.results || [])
          .filter(hit => typeof hit.content === 'string' && hit.content.trim())
          .map(toCitation);
        const citations = querySources.length ? querySources : searchSources;
        const unsupported = rag.grounded
          ? []
          : [rag.no_answer_reason
              ? `Knowledge base belum dapat mem-grounding klaim ini (${rag.no_answer_reason}).`
              : 'Klaim faktual dalam brief belum ditemukan pada dokumen aktif.'];
        if (rag.grounded && !citations.length) {
          unsupported.push('Layanan RAG menyatakan grounded, tetapi tidak mengembalikan sumber resmi dari query maupun pencarian. Periksa indexing dan sinkronisasi knowledge base.');
        }
        remote = { answer: rag.answer || '', citations, unsupportedClaims: unsupported, grounded: Boolean(rag.grounded), model: rag.model };
        setRagModel(rag.model || null);
        setUsedRemoteRag(true);
        if (!rag.grounded || !citations.length) {
          const reason = rag.no_answer_reason || (!citations.length
            ? 'Pencarian tidak menemukan potongan sumber resmi yang dapat ditampilkan.'
            : 'Jawaban tidak memperoleh dukungan yang cukup dari dokumen resmi.');
          setGenerationError(`Copy belum dapat dianggap berbasis fakta resmi: ${reason} Draf akan disusun dari input Anda dan ditandai untuk verifikasi. Pastikan dokumen terkait berstatus aktif dan sudah tersinkron ke knowledge base workspace ini.`);
        }
      } catch (error) {
        console.error('ragQuery failed:', error);
        const reason = error instanceof Error ? error.message : 'Layanan RAG tidak dapat dihubungi.';
        remote.unsupportedClaims = [`${reason} Isi brief disimpan sebagai draf yang perlu diverifikasi.`];
        setUsedRemoteRag(false);
        setRagModel(null);
        setGenerationError('Layanan RAG gagal. Draf cadangan dibuat dari brief, tanpa mengarang fakta, dan perlu diverifikasi sebelum dipublikasikan.');
      }
    }

    const output = generateContentFromBrief(brief, brandProfile, [], activeWorkspace.id, remote);
    if (remote.grounded && output.qualityCheck.briefCompliance.details !== 'Pesan kunci dan CTA sesuai dengan brief.') {
      setGenerationError(`Jawaban RAG tidak lolos pemeriksaan kualitas dan tidak digunakan. ${output.qualityCheck.briefCompliance.details} Draf pengganti berasal dari brief dan perlu diverifikasi.`);
    }

    try {
      await onGenerateDraft(brief, output);
    } catch (error) {
      console.error('Failed to save generated draft', error);
      setGenerationError(`Draf tidak berhasil disimpan: ${error instanceof Error ? error.message : 'kesalahan tidak diketahui'}. Salin teks dari editor sebelum meninggalkan halaman.`);
    }
    setIsGenerating(false);
    streamText(output.content);
  };



  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Brief & Generasi Konten</h2>
          <p className="page-subtitle">
            Susun panduan konten yang terstruktur. Sistem hanya menggunakan fakta dari knowledge base resmi <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
      </div>

      <div className="card-panel" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Konten Hasil Generasi</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{drafts.length} tersimpan</span>
        </div>
        {drafts.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada konten hasil generasi. Lengkapi brief di bawah untuk membuatnya.</p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {drafts.map(draft => (
              <div key={draft.id} style={{ minWidth: '220px', padding: '10px', border: '1px solid var(--border-subtle)', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, paddingRight: '8px' }}>{draft.title}</div>
                  <div style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                      onClick={() => setOpenDropdownId(openDropdownId === draft.id ? null : draft.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openDropdownId === draft.id && (
                      <div style={{ 
                        position: 'absolute', right: 0, top: '24px', background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px', 
                        display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 50, minWidth: '130px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm" 
                          style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }} 
                          onClick={() => { setOpenDropdownId(null); onOpenEditor(draft.id); }}
                        >
                          Buka di Editor
                        </button>
                        {draft.status === 'draft' && onDeleteDraft && (
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--accent-red)' }} 
                            onClick={() => { setOpenDropdownId(null); onDeleteDraft(draft.id); }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`status-pill ${draft.status}`} style={{ fontSize: '0.62rem' }}>{draft.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(400px, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* ─── Left: Brief Form (preserved) ─── */}
        <form onSubmit={handleSubmit} className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Parameter Brief Konten BUMD</h3>
          </div>

          {/* Title & Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Judul Inisiatif / Konten *</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="cth.: Kampanye Edukasi Sambungan Air Baru 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Nama Kampanye / Program</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="cth.: Program Kesejahteraan Air Bersih"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
            </div>
          </div>

          {/* Format & Target Channel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Format Output Draf *</span>
              </label>
              <select 
                className="form-select"
                value={format}
                onChange={e => setFormat(e.target.value as ContentFormat)}
              >
                <option value="copy_caption">Copy & Caption Media Sosial (Feed / Carousel)</option>
                <option value="teks_promosi">Teks Promosi Resmi & Siaran Pers</option>
                <option value="naskah_singkat">Naskah Video Pendek 9:16 (Reels/TikTok/Shorts)</option>
                <option value="brief_visual">Brief Visual & Panduan Infografis</option>
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Kanal Distribusi Resmi</span>
              </label>
              <select 
                className="form-select"
                value={channel}
                onChange={e => setChannel(e.target.value)}
              >
                {brandProfile.approvedChannels.map((ch, idx) => (
                  <option key={idx} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience & Tone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Target Audiens</span>
              </label>
              <select
                className="form-select"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              >
                <option value="">Pilih target audiens…</option>
                {(brandProfile.targetAudiences ?? []).map((aud, idx) => (
                  <option key={idx} value={aud}>{aud}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Nada Suara (Panduan Merek)</span>
              </label>
              <select 
                className="form-select"
                value={tone}
                onChange={e => setTone(e.target.value)}
              >
                {brandProfile.toneOfVoice.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Message */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
              <span>Pesan Kunci & Fakta yang Disampaikan *</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>RAG mencocokkan fakta ini dengan dokumen aktif</span>
            </label>
            <textarea 
              className="form-textarea" 
              rows={4}
              placeholder="Tulis info kunci. Cth.: tarif sambungan baru Rp 1.250.000 dengan 3x cicilan dan persyaratan KTP/PBB..."
              value={keyMessage}
              onChange={e => setKeyMessage(e.target.value)}
              required
            />
          </div>

          {/* Call to Action */}
          <div className="form-group">
            <label className="form-label">
              <span>Pilihan Call to Action (CTA) Resmi</span>
            </label>
            <select 
              className="form-select"
              value={selectedCta}
              onChange={e => setSelectedCta(e.target.value)}
              style={{ marginBottom: '8px' }}
            >
              {brandProfile.officialCTAs.map(c => (
                <option key={c.id} value={c.text}>
                  [{c.label}] {c.text}
                </option>
              ))}
              <option value="">-- CTA Kustom --</option>
            </select>
            <input 
              type="text"
              className="form-input"
              placeholder="Atau tulis Call to Action kustom..."
              value={selectedCta}
              onChange={e => setSelectedCta(e.target.value)}
            />
          </div>

          {/* Limitations */}
          <div className="form-group">
            <label className="form-label">
              <span>Batasan, Syarat & Peringatan Penting (Opsional)</span>
            </label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Cth.: Hanya berlaku untuk pelanggan dengan daya listrik maksimal 900 VA"
              value={limitations}
              onChange={e => setLimitations(e.target.value)}
            />
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isGenerating || isStreaming}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="brief-spin-icon" />
                  <span>Memproses RAG & Membuat Draf...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Jalankan Generasi Berbasis RAG</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ─── Right: Editor Canvas ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'sticky', top: '92px' }}>
          {generationError && (
            <div role="alert" className="card-panel" style={{ marginBottom: '12px', padding: '12px 16px', color: 'var(--status-warning-text, #92400e)', borderColor: 'var(--status-warning-border, #f59e0b)' }}>
              {generationError}
            </div>
          )}
          {/* ─── Rich Text Editor Canvas ─── */}
          <div className="brief-editor-canvas-wrapper">
            {/* Editor Toolbar */}
            <div className="brief-editor-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Editor Draf AI</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isStreaming && (
                  <span className="brief-streaming-indicator">
                    <Loader2 size={12} className="brief-spin-icon" />
                    <span>AI sedang menulis...</span>
                  </span>
                )}
                {streamingDone && (
                  <span className="brief-done-indicator">
                    <CheckCircle2 size={12} />
                    <span>Generasi selesai</span>
                  </span>
                )}
                {streamingDone && onNavigate && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', marginLeft: '6px' }}
                    onClick={() => onNavigate('editor')}
                  >
                    <ExternalLink size={12} />
                    <span>Buka di Editor</span>
                  </button>
                )}
                {editorContent && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {editorContent.length} karakter
                  </span>
                )}
              </div>
            </div>

            {/* Editor Content Area */}
            <div
              ref={editorRef}
              className={`brief-editor-content ${isStreaming ? 'brief-editor-streaming' : ''} ${!editorContent ? 'brief-editor-empty' : ''}`}
              contentEditable={!isStreaming}
              suppressContentEditableWarning

              onInput={(e) => {
                if (!isStreaming) {
                  setEditorContent((e.target as HTMLDivElement).innerText);
                }
              }}
              dangerouslySetInnerHTML={{
                __html: editorContent
                  ? editorContent
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/\n/g, '<br/>')
                      // Highlight grounding markers
                      .replace(/\[References:([^\]]+)\]/g, '<span class="brief-citation-tag">[References:$1]</span>')
                      .replace(/\[(?:Perlu Verifikasi|Needs Verification)([^\]]*)\]/g, '<span class="brief-warning-tag">[Needs Verification$1]</span>')
                      .replace(/\[DRAFT[^\]]*\]/g, '<span class="brief-draft-tag">[CORPORATE DRAFT - NOT YET APPROVED]</span>')
                      + (isStreaming ? '<span class="brief-cursor-blink">▊</span>' : '')
                  : ''
              }}
              data-placeholder="Hasil draf AI akan muncul di sini. Anda dapat mengeditnya langsung..."
            />


          </div>
        </div>
      </div>
    </div>
  );
};
