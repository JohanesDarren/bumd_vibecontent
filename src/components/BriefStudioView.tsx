import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BrandProfile, 

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
  ExternalLink
} from 'lucide-react';

interface BriefStudioViewProps {
  brandProfile: BrandProfile;

  activeWorkspace: Workspace;
  activeUser: User;
  onGenerateDraft: (brief: ContentBrief, output: GeneratedOutput) => Promise<void> | void;
  onNavigate?: (tab: ActiveTab) => void;
}

/** Map a live RAG search hit to the citation shape the workspace expects. */
function toCitation(hit: RagHit, index: number): GroundedCitation {
  const content = typeof hit.content === 'string' ? hit.content : '';
  const rawScore = typeof hit.score === 'number' ? hit.score : 0;
  const relevanceScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
  return {
    id: `cit-${index}`,
    documentId: hit.document_id || `unknown-${index}`,
    documentTitle: hit.document_name || hit.document_id || 'Knowledge Base Source',
    section: hit.section || 'Knowledge Base',
    page: hit.page ?? undefined,
    excerpt: content,
    relevanceScore: Math.min(99, Math.max(60, relevanceScore)),
    verified: true,
    claimExcerpt: content.slice(0, 80) + (content.length > 80 ? '...' : '')
  };
}

export const BriefStudioView: React.FC<BriefStudioViewProps> = ({
  brandProfile,

  activeWorkspace,
  activeUser,
  onGenerateDraft,
  onNavigate
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

  useEffect(() => {
    let active = true;
    apiService.ragStatus()
      .then(s => { if (active) setRagService(s); })
      .catch(error => { console.error('ragStatus failed:', error); if (active) setRagService({ configured: false, ready: false }); });
    return () => { active = false; };
  }, []);




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
      alert('Content title and key message are required.');
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

    // The remote RAG API is the only knowledge source.
    let remote: RemoteGrounding;
    try {
      const rag = await apiService.ragQuery(activeWorkspace.id, `${title} ${keyMessage}`, 5);
      const citations = (rag.sources || []).map(toCitation);
      const unsupported = rag.grounded
        ? []
        : [rag.no_answer_reason
            ? `The knowledge base could not ground this claim (${rag.no_answer_reason}).`
            : 'Specific factual claims in the brief were not found in the active documents.'];
      remote = { answer: rag.answer || '', citations, unsupportedClaims: unsupported, grounded: Boolean(rag.grounded), model: rag.model };
      setRagModel(rag.model || null);
      setUsedRemoteRag(true);
    } catch (error) {
      console.error('ragQuery failed:', error);
      setUsedRemoteRag(false);
      setRagModel(null);
      setIsGenerating(false);
      alert('Content generation is unavailable because the RAG service could not be reached. Please try again later.');
      return;
    }

    const output = generateContentFromBrief(brief, brandProfile, [], activeWorkspace.id, remote);
    setIsGenerating(false);
    streamText(output.content);

    // Persist the grounded draft so it lands in the Editor / Library.
    try {
      await onGenerateDraft(brief, output);
    } catch (error) {
      console.error('Failed to save generated draft', error);
    }
  };



  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Content Brief Generation</h2>
          <p className="page-subtitle">
            Susun panduan konten yang terstruktur. Sistem hanya menggunakan fakta dari knowledge base resmi <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
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
              <span>Key Message & Facts to Convey *</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>RAG matches these facts to active documents</span>
            </label>
            <textarea 
              className="form-textarea" 
              rows={4}
              placeholder="Write key info. E.g., new connection rate Rp 1,250,000 with 3x installments and ID/Tax requirements..."
              value={keyMessage}
              onChange={e => setKeyMessage(e.target.value)}
              required
            />
          </div>

          {/* Call to Action */}
          <div className="form-group">
            <label className="form-label">
              <span>Official Call to Action (CTA) Choice</span>
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
              <option value="">-- Custom CTA --</option>
            </select>
            <input 
              type="text"
              className="form-input"
              placeholder="Or type a custom Call to Action..."
              value={selectedCta}
              onChange={e => setSelectedCta(e.target.value)}
            />
          </div>

          {/* Limitations */}
          <div className="form-group">
            <label className="form-label">
              <span>Limitations, Conditions & Important Warnings (Optional)</span>
            </label>
            <input 
              type="text" 
              className="form-input"
              placeholder="E.g., Only valid for customers with up to 900 VA electrical capacity"
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
                  <span>Processing RAG & Generating Draft...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Run RAG-Based Generation</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ─── Right: Editor Canvas ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'sticky', top: '92px' }}>
          {/* ─── Rich Text Editor Canvas ─── */}
          <div className="brief-editor-canvas-wrapper">
            {/* Editor Toolbar */}
            <div className="brief-editor-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>AI Draft Editor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isStreaming && (
                  <span className="brief-streaming-indicator">
                    <Loader2 size={12} className="brief-spin-icon" />
                    <span>AI is writing...</span>
                  </span>
                )}
                {streamingDone && (
                  <span className="brief-done-indicator">
                    <CheckCircle2 size={12} />
                    <span>Generation complete</span>
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
                    <span>Open in Editor</span>
                  </button>
                )}
                {editorContent && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {editorContent.length} characters
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
              data-placeholder="AI draft result will appear here. You can edit it directly..."
            />


          </div>
        </div>
      </div>
    </div>
  );
};
