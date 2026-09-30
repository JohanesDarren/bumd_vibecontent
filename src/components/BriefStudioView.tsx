import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BrandProfile, 
  KnowledgeDocument, 
  ContentFormat, 
  ContentBrief, 
  Workspace,
  User
} from '../types';
import { 
  retrieveKnowledge, 
  generateContentFromBrief 
} from '../services/ragEngine';
import { 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  ChevronDown,
  ChevronUp,
  Type,
  Minus,
  Plus,
  MessageSquare,
  Wand2,
  Loader2,
  CornerDownLeft
} from 'lucide-react';

interface BriefStudioViewProps {
  brandProfile: BrandProfile;
  documents: KnowledgeDocument[];
  activeWorkspace: Workspace;
  activeUser: User;
  onGenerateDraft: (brief: ContentBrief) => void;
}

export const BriefStudioView: React.FC<BriefStudioViewProps> = ({
  brandProfile,
  documents,
  activeWorkspace,
  activeUser,
  onGenerateDraft
}) => {
  const [title, setTitle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [targetAudience, setTargetAudience] = useState('Masyarakat Kota dan Pelanggan BUMD');
  const [format, setFormat] = useState<ContentFormat>('copy_caption');
  const [channel, setChannel] = useState(brandProfile.approvedChannels[0] || 'Instagram Feed & Reels');
  const [tone, setTone] = useState(brandProfile.toneOfVoice[0] || 'Formal Korporat Ramah');
  const [keyMessage, setKeyMessage] = useState('');
  const [selectedCta, setSelectedCta] = useState(brandProfile.officialCTAs[0]?.text || '');
  const [limitations, setLimitations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Live Grounding Preview
  const [matchedDocsCount, setMatchedDocsCount] = useState<number>(0);
  const [matchedDocTitles, setMatchedDocTitles] = useState<string[]>([]);
  const [unsupportedWarning, setUnsupportedWarning] = useState<string[]>([]);

  // Editor & Streaming state
  const [editorContent, setEditorContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDone, setStreamingDone] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // RAG Radar collapsible state
  const [ragRadarOpen, setRagRadarOpen] = useState(false);

  // Inline AI popup state
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [inlineAIPos, setInlineAIPos] = useState({ top: 0, left: 0 });
  const [inlineAIInput, setInlineAIInput] = useState('');
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    if (keyMessage.trim().length > 3 || title.trim().length > 3) {
      const query = `${title} ${keyMessage}`;
      const rag = retrieveKnowledge(query, documents, activeWorkspace.id);
      setMatchedDocsCount(rag.matchedChunks.length);
      const uniqueDocs = Array.from(new Set(rag.matchedChunks.map(c => c.document.title)));
      setMatchedDocTitles(uniqueDocs);
      setUnsupportedWarning(rag.unsupportedClaims);
    } else {
      setMatchedDocsCount(0);
      setMatchedDocTitles([]);
      setUnsupportedWarning([]);
    }
  }, [title, keyMessage, documents, activeWorkspace.id]);

  // Preset Template Loader
  const loadPreset = (type: 'sambungan_baru' | 'tarif_subsidi' | 'unsupported_test') => {
    if (type === 'sambungan_baru') {
      setTitle('Pendaftaran Sambungan Rumah Baru Cicilan 0% 2026');
      setCampaign('Air Bersih Menjangkau Semua');
      setTargetAudience('Masyarakat Kota Metro, Penghuni Rumah Baru & UMKM');
      setFormat('copy_caption');
      setKeyMessage('Perumda Air Minum Tirta Sejahtera membuka pendaftaran sambungan rumah baru biaya Rp 1.250.000 dengan kemudahan cicilan 3x tanpa bunga dan instalasi selesai dalam 3 hari kerja.');
      setLimitations('Persyaratan wajib melampirkan Fotokopi KTP, Bukti PBB, dan rekening listrik.');
      setSelectedCta(brandProfile.officialCTAs[0]?.text || 'Daftar melalui portal resmi pasang.tirtasejahtera.co.id');
    } else if (type === 'tarif_subsidi') {
      setTitle('Sosialisasi Tarif Khusus Rp 0 Pelajar, Lansia dan Disabilitas');
      setCampaign('Konektivitas Inklusif Ramah Publik');
      setTargetAudience('Pelajar SD/SMP/SMA, Warga Senior Lansia, dan Disabilitas');
      setFormat('teks_promosi');
      setKeyMessage('Pengoperasian Koridor 7 bus listrik ramah disabilitas dengan jaminan tarif Rp 0 (gratis) bagi pelajar terdaftar, lansia di atas 60 tahun, dan penyandang disabilitas.');
      setLimitations('Pendaftaran kartu wajib membawa KTP/Kartu Pelajar di loket halte utama.');
      setSelectedCta('Unduh aplikasi TransGo untuk pantauan jadwal bus terintegrasi.');
    } else {
      // Test Unsupported Claim (PRD F-04 Acceptance Criteria: Knowledge base does not contain the answer)
      setTitle('Program Diskon Tiket Liburan Akhir Pekan 50% & Hadiah Undian Mobil');
      setCampaign('Promo Spesial Liburan');
      setTargetAudience('Wisatawan Umum');
      setFormat('copy_caption');
      setKeyMessage('Dapatkan diskon 50% tiket liburan serta kesempatan memenangkan hadiah undian mobil gratis seumur hidup.');
      setLimitations('Tidak ada pembatasan kuota.');
      setSelectedCta('Kunjungi loket wisata terdekat.');
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !keyMessage.trim()) {
      alert('Judul konten dan pesan utama wajib diisi.');
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

    // Generate content then stream it into editor
    setTimeout(() => {
      const output = generateContentFromBrief(brief, brandProfile, documents, activeWorkspace.id);
      setIsGenerating(false);
      streamText(output.content);

      // Auto-open RAG radar if results found
      if (matchedDocsCount > 0 || unsupportedWarning.length > 0) {
        setRagRadarOpen(true);
      }
    }, 600);
  };

  // Track text selection in editor for inline AI popup
  const handleEditorMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 2 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setSelectedText(selection.toString());
      setInlineAIPos({
        top: rect.top - editorRect.top - 52,
        left: Math.max(0, Math.min(rect.left - editorRect.left + rect.width / 2 - 140, editorRect.width - 290)),
      });
      setShowInlineAI(true);
    } else {
      // Only hide if we click away without selection
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.toString().trim().length < 3) {
          setShowInlineAI(false);
        }
      }, 200);
    }
  }, []);

  // Handle inline AI action (mockup)
  const handleInlineAction = (action: string) => {
    if (!selectedText) return;
    // This is a UI mockup - show a brief visual feedback
    setShowInlineAI(false);

    // Simulate brief processing then replace selection
    const mockReplacement = action === 'shorten'
      ? selectedText.split(' ').slice(0, Math.ceil(selectedText.split(' ').length * 0.6)).join(' ') + '...'
      : action === 'extend'
        ? selectedText + ' Hal ini sejalan dengan kebijakan resmi yang telah ditetapkan oleh direksi, guna memastikan transparansi dan akuntabilitas kepada masyarakat.'
        : selectedText; // for custom AI, just keep same

    // Replace in editor content
    setEditorContent(prev => prev.replace(selectedText, mockReplacement));
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Brief Konten & RAG Generasi</h2>
          <p className="page-subtitle">
            Susun panduan konten terstruktur. AI hanya menggunakan fakta dari knowledge base resmi <strong>{activeWorkspace.name}</strong> tanpa pencarian web bebas.
          </p>
        </div>

        {/* Quick Presets for Demo */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset('sambungan_baru')}
            title="Muat preset pasang sambungan air baru"
          >
            ⚡ Contoh: Pasang Baru
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset('tarif_subsidi')}
            title="Muat preset tarif khusus subsidi"
          >
            ⚡ Contoh: Tarif Subsidi
          </button>
          <button 
            type="button" 
            className="btn btn-warning btn-sm"
            onClick={() => loadPreset('unsupported_test')}
            title="Uji skenario PRD: Klaim tanpa dukungan sumber resmi"
          >
            ⚠️ Uji Coba: Klaim Tanpa Sumber (PRD F-04)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(400px, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* ─── Left: Brief Form (preserved) ─── */}
        <form onSubmit={handleSubmit} className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <Sparkles size={20} color="var(--primary)" />
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
                placeholder="Contoh: Edukasi Pasang Baru Sambungan Air 2026"
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
                placeholder="Contoh: Program Air Bersih Sejahtera"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
            </div>
          </div>

          {/* Format & Target Channel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Format Output Naskah *</span>
              </label>
              <select 
                className="form-select"
                value={format}
                onChange={e => setFormat(e.target.value as ContentFormat)}
              >
                <option value="copy_caption">📱 Copy & Caption Media Sosial (Feed / Carousel)</option>
                <option value="teks_promosi">📰 Teks Promosi & Siaran Pers Resmi</option>
                <option value="naskah_singkat">🎬 Naskah Video Singkat 9:16 (Reels/TikTok/Shorts)</option>
                <option value="brief_visual">🎨 Panduan Brief Visual & Grafis Informasi</option>
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
              <input 
                type="text" 
                className="form-input"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Tone of Voice (Panduan Merek)</span>
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
              <span>Pesan Utama & Fakta yang Ingin Disampaikan *</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>RAG mencocokkan fakta ini ke dokumen aktif</span>
            </label>
            <textarea 
              className="form-textarea" 
              rows={4}
              placeholder="Tuliskan pokok informasi. Misalnya: tarif sambungan baru Rp 1.250.000 dengan cicilan 3x dan syarat KTP/PBB..."
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
              <option value="">-- Kustom CTA Sendiri --</option>
            </select>
            <input 
              type="text"
              className="form-input"
              placeholder="Atau ketik Call to Action khusus..."
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
              placeholder="Contoh: Hanya berlaku untuk pelanggan daya listrik hingga 900 VA"
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
                  <span>Memproses RAG & Membuat Naskah...</span>
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

        {/* ─── Right: Editor Canvas + Collapsible RAG Radar ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'sticky', top: '92px' }}>

          {/* RAG Radar Toggle Button / Collapsible */}
          <div className="rag-radar-toggle-bar">
            <button
              className="rag-radar-toggle-btn"
              onClick={() => setRagRadarOpen(!ragRadarOpen)}
              type="button"
            >
              <BookOpen size={14} />
              <span>Radar RAG Knowledge Base</span>
              {matchedDocsCount > 0 && (
                <span className="grounding-badge verified" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <CheckCircle2 size={10} /> {matchedDocsCount} Cocok
                </span>
              )}
              {unsupportedWarning.length > 0 && (
                <span className="grounding-badge warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <AlertCircle size={10} /> {unsupportedWarning.length} Peringatan
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                {ragRadarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {ragRadarOpen && (
              <div className="rag-radar-content">
                {matchedDocsCount > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {matchedDocsCount} bagian cocok dari {matchedDocTitles.length} dokumen aktif
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {matchedDocTitles.map((t, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '6px 10px', 
                            borderRadius: '6px', 
                            background: 'var(--bg-primary)', 
                            fontSize: '0.72rem', 
                            borderLeft: '3px solid var(--accent-emerald)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          📑 {t}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    Ketikkan pesan utama di sebelah kiri untuk melihat dokumen resmi yang relevan secara real-time.
                  </div>
                )}

                {/* Unsupported Claims Detection Warning (PRD F-04) */}
                {unsupportedWarning.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <AlertCircle size={13} />
                      <span>Peringatan Grounding: Sumber Belum Cukup</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {unsupportedWarning.map((w, idx) => (
                          <li key={idx} style={{ color: '#fb7185', fontWeight: 600 }}>{w}</li>
                        ))}
                      </ul>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block', marginTop: '4px' }}>
                        * Sistem akan menandai draf sebagai <code>[Perlu Verifikasi]</code> dan menolak klaim palsu.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Rich Text Editor Canvas ─── */}
          <div className="brief-editor-canvas-wrapper">
            {/* Editor Toolbar */}
            <div className="brief-editor-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Editor Naskah AI</span>
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
              onMouseUp={handleEditorMouseUp}
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
                      .replace(/\[Rujukan:([^\]]+)\]/g, '<span class="brief-citation-tag">[Rujukan:$1]</span>')
                      .replace(/\[Perlu Verifikasi([^\]]*)\]/g, '<span class="brief-warning-tag">[Perlu Verifikasi$1]</span>')
                      .replace(/\[DRAFT[^\]]*\]/g, '<span class="brief-draft-tag">[DRAFT KORPORAT - BELUM DISETUJUI]</span>')
                      + (isStreaming ? '<span class="brief-cursor-blink">▊</span>' : '')
                  : ''
              }}
              data-placeholder="Hasil naskah AI akan muncul di sini. Anda dapat langsung mengeditnya..."
            />

            {/* ─── Inline AI Floating Popup (Notion-style) ─── */}
            {showInlineAI && editorContent && !isStreaming && (
              <div
                className="brief-inline-ai-popup"
                style={{ top: `${inlineAIPos.top}px`, left: `${inlineAIPos.left}px` }}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
              >
                <button
                  className="brief-inline-ai-btn"
                  onClick={() => handleInlineAction('shorten')}
                  title="Perpendek teks yang dipilih"
                >
                  <Minus size={13} />
                  <span>Perpendek</span>
                </button>
                <div className="brief-inline-ai-divider" />
                <button
                  className="brief-inline-ai-btn"
                  onClick={() => handleInlineAction('extend')}
                  title="Perpanjang teks yang dipilih"
                >
                  <Plus size={13} />
                  <span>Perpanjang</span>
                </button>
                <div className="brief-inline-ai-divider" />
                <div className="brief-inline-ai-input-wrap">
                  <Wand2 size={12} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <input
                    className="brief-inline-ai-input"
                    placeholder="Ask AI to edit..."
                    value={inlineAIInput}
                    onChange={(e) => setInlineAIInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInlineAction('custom');
                        setInlineAIInput('');
                      }
                    }}
                  />
                  <CornerDownLeft size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </div>
            )}

            {/* Editor footer hint */}
            <div className="brief-editor-footer">
              <MessageSquare size={12} />
              <span>Sorot/select teks di atas untuk memunculkan menu AI inline editing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
