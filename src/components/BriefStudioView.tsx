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
  CornerDownLeft,
  Zap,
  AlertTriangle
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
  const [targetAudience, setTargetAudience] = useState('');
  const [format, setFormat] = useState<ContentFormat>('copy_caption');
  const [channel, setChannel] = useState(brandProfile.approvedChannels[0] || '');
  const [tone, setTone] = useState(brandProfile.toneOfVoice[0] || '');
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



  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Content Brief & RAG Generation</h2>
          <p className="page-subtitle">
            Draft structured content guides. AI only uses facts from the official knowledge base of <strong>{activeWorkspace.name}</strong> without unrestricted web search.
          </p>
        </div>


      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(400px, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* ─── Left: Brief Form (preserved) ─── */}
        <form onSubmit={handleSubmit} className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>BUMD Content Brief Parameters</h3>
          </div>

          {/* Title & Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Initiative / Content Title *</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g.: New Water Connection Education Campaign 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Campaign / Program Name</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g.: Clean Water Prosperity Program"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
            </div>
          </div>

          {/* Format & Target Channel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Draft Output Format *</span>
              </label>
              <select 
                className="form-select"
                value={format}
                onChange={e => setFormat(e.target.value as ContentFormat)}
              >
                <option value="copy_caption">Copy & Social Media Caption (Feed / Carousel)</option>
                <option value="teks_promosi">Official Promotional & Press Release Text</option>
                <option value="naskah_singkat">Short Video Script 9:16 (Reels/TikTok/Shorts)</option>
                <option value="brief_visual">Visual Brief & Infographic Guide</option>
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Official Distribution Channel</span>
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
                <span>Target Audience</span>
              </label>
              <select
                className="form-select"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              >
                <option value="">Select target audience…</option>
                {(brandProfile.targetAudiences ?? []).map((aud, idx) => (
                  <option key={idx} value={aud}>{aud}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">
                <span>Tone of Voice (Brand Guidelines)</span>
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
              <span>RAG Knowledge Base Radar</span>
              {matchedDocsCount > 0 && (
                <span className="grounding-badge verified" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <CheckCircle2 size={10} /> {matchedDocsCount} Match
                </span>
              )}
              {unsupportedWarning.length > 0 && (
                <span className="grounding-badge warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <AlertCircle size={10} /> {unsupportedWarning.length} Warnings
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
                        {matchedDocsCount} sections matched from {matchedDocTitles.length} active documents
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
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    Type key message on the left to see relevant official documents in real-time.
                  </div>
                )}

                {/* Unsupported Claims Detection Warning (PRD F-04) */}
                {unsupportedWarning.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <AlertCircle size={13} />
                      <span>Grounding Warnings: Insufficient Sources</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {unsupportedWarning.map((w, idx) => (
                          <li key={idx} style={{ color: '#fb7185', fontWeight: 600 }}>{w}</li>
                        ))}
                      </ul>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block', marginTop: '4px' }}>
                        * The system will mark the draft as <code>[Needs Verification]</code> and reject false claims.
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
