import React, { useState, useEffect } from 'react';
import { 
  ContentDraft, 
  BrandProfile, 
  User, 
  DraftVersion, 
  GroundedCitation, 
  QualityCheck 
} from '../types';
import { 
  refineDraftContent, 
  runQualityCheck 
} from '../services/ragEngine';
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
  BookOpen
} from 'lucide-react';

interface EditorWorkspaceViewProps {
  draft: ContentDraft;
  brandProfile: BrandProfile;
  activeUser: User;
  onSaveNewVersion: (draftId: string, version: DraftVersion, changeSummary: string) => void;
  onSubmitForReview: (draftId: string) => void;
  onOpenExportModal: (draft: ContentDraft) => void;
}

export const EditorWorkspaceView: React.FC<EditorWorkspaceViewProps> = ({
  draft,
  brandProfile,
  activeUser,
  onSaveNewVersion,
  onSubmitForReview,
  onOpenExportModal
}) => {
  const currentVer = draft.versions[0];
  const [editedContent, setEditedContent] = useState(currentVer?.content || '');
  const [activeTabSide, setActiveTabSide] = useState<'grounding' | 'scorecard' | 'history' | 'diff'>('grounding');
  const [selectedCitation, setSelectedCitation] = useState<GroundedCitation | null>(null);
  const [compareVersionNumber, setCompareVersionNumber] = useState<number>(draft.versions[1]?.versionNumber || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeNote, setChangeNote] = useState('Penyuntingan redaksi naskah');

  // Keep state updated if selected draft changes
  useEffect(() => {
    setEditedContent(draft.versions[0]?.content || '');
    if (draft.versions[0]?.citations[0]) {
      setSelectedCitation(draft.versions[0].citations[0]);
    }
  }, [draft]);

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

  // Quick Refinements (F-08)
  const handleRefine = (type: 'concise' | 'formal' | 'persuasive' | 'x_thread') => {
    const result = refineDraftContent(editedContent, type, brandProfile);
    setEditedContent(result.newContent);
  };

  // Save new version
  const handleConfirmSave = () => {
    const newVerNumber = draft.versions.length + 1;
    const newVersion: DraftVersion = {
      versionNumber: newVerNumber,
      content: editedContent,
      scenes: currentVer?.scenes,
      citations: currentVer?.citations || [],
      unsupportedClaims: currentVer?.unsupportedClaims || [],
      qualityCheck: liveCheck,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.name,
      changeSummary: changeNote || `Versi ${newVerNumber} disimpan oleh ${activeUser.name}`
    };

    onSaveNewVersion(draft.id, newVersion, changeNote);
    setShowSaveModal(false);
  };

  // Rollback to previous version
  const handleRollback = (ver: DraftVersion) => {
    if (window.confirm(`Kembalikan isi naskah ke Versi ${ver.versionNumber}?`)) {
      setEditedContent(ver.content);
      const rollbackVer: DraftVersion = {
        versionNumber: draft.versions.length + 1,
        content: ver.content,
        scenes: ver.scenes,
        citations: ver.citations,
        unsupportedClaims: ver.unsupportedClaims,
        qualityCheck: ver.qualityCheck,
        createdAt: new Date().toISOString(),
        createdBy: activeUser.name,
        changeSummary: `Rollback naskah kembali ke Versi ${ver.versionNumber}`
      };
      onSaveNewVersion(draft.id, rollbackVer, `Rollback ke Versi ${ver.versionNumber}`);
    }
  };

  const comparedVer = draft.versions.find(v => v.versionNumber === compareVersionNumber) || draft.versions[1] || currentVer;

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
              Versi Terkini: <strong>v{draft.currentVersion}</strong> ({draft.versions.length} riwayat versi tersimpan)
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

          {draft.status !== 'menunggu_review' && draft.status !== 'disetujui' && (
            <button 
              className="btn btn-primary"
              onClick={() => onSubmitForReview(draft.id)}
            >
              <Send size={16} />
              <span>Kirim untuk Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Watermark Banner if Draft (PRD F-06 / F-08 requirement) */}
      <div className="draft-watermark" style={{ marginBottom: '20px' }}>
        <AlertTriangle size={16} />
        <span>
          STATUS: <strong>DRAFT KORPORAT</strong> — Naskah belum melalui persetujuan akhir Kepala Bagian Humas / Approver. Dilarang mendistribusikan ke kanal eksternal sebelum berstatus Disetujui.
        </span>
      </div>

      {/* Main Split View: Left (Editor + Quick Refinements) | Right (Grounding, Scorecard, Version Diff) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Refinements Toolbar */}
          <div className="card-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <Sparkles size={14} color="var(--primary)" />
              <span>Variasi Cepat (F-08):</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => handleRefine('concise')}
                title="Persingkat kalimat tanpa menghilangkan fakta"
              >
                ✂️ Lebih Ringkas
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => handleRefine('formal')}
                title="Tingkatkan kesantunan tata naskah BUMD"
              >
                🏛️ Formalitas Korporat
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => handleRefine('persuasive')}
                title="Lebih hangat dan persuasif mengajak"
              >
                💡 Lebih Persuasif
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => handleRefine('x_thread')}
                title="Bagi menjadi utas ringkas"
              >
                🧵 Utas X (Thread)
              </button>
            </div>
          </div>

          {/* Textarea Editor */}
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Editor Langsung Naskah ({editedContent.length} karakter)
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Auto-checked live
              </span>
            </div>

            <textarea 
              className="form-textarea"
              style={{ minHeight: '380px', fontSize: '0.92rem', lineHeight: 1.7, fontFamily: 'var(--font-sans)', border: 'none', background: 'transparent', padding: '8px 0' }}
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              placeholder="Teks naskah draft..."
            />

            {/* If video script format, show interactive scene breakdown table */}
            {draft.format === 'naskah_singkat' && currentVer?.scenes && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Papan Adegan Naskah Video (Storyboard)</h4>
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

        {/* Right Column: Grounding Citations, Scorecard, Version Diff */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-tabs switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button 
              className={`btn btn-sm ${activeTabSide === 'grounding' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('grounding')}
            >
              <BookOpen size={14} />
              <span>Rujukan RAG</span>
            </button>
            <button 
              className={`btn btn-sm ${activeTabSide === 'scorecard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 8px' }}
              onClick={() => setActiveTabSide('scorecard')}
            >
              <FileCheck size={14} />
              <span>Skor Mutu</span>
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
              <span>Diff</span>
            </button>
          </div>

          {/* TAB 1: Grounding & Citations Inspector */}
          {activeTabSide === 'grounding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Rujukan Sumber Terverifikasi</h4>
                <span className="grounding-badge verified">
                  <ShieldCheck size={12} /> RAG Only
                </span>
              </div>

              {currentVer?.citations?.length === 0 ? (
                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-tertiary)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Tidak ada rujukan sumber resmi yang terasosiasi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                          📑 {c.documentTitle}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.2)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {c.relevanceScore}% Relevan
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>
                        {c.section} {c.page ? `• Hal ${c.page}` : ''}
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
                <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    <AlertTriangle size={14} />
                    <span>Klaim Belum Didukung Knowledge Base</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    Sistem mendeteksi klaim berikut tidak memiliki rujukan pada dokumen aktif:
                  </p>
                  <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '0.75rem', color: '#fb7185' }}>
                    {currentVer.unsupportedClaims.map((claim, idx) => (
                      <li key={idx}><strong>{claim}</strong></li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    * Reviewer akan melihat tanda peringatan ini saat pemeriksaan naskah.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pre-Flight Scorecard (PRD F-09) */}
          {activeTabSide === 'scorecard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Pemeriksaan Mutu Otomatis (F-09)</h4>
                <span className={`status-pill ${liveCheck.overallStatus}`}>
                  {liveCheck.overallStatus === 'siap_review' ? 'Siap Dikirim' : 'Perlu Verifikasi'}
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Kesesuaian Brief & Pesan</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.briefCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.briefCompliance.score >= 80 ? 'score-high' : 'score-med'}`}>
                  {liveCheck.briefCompliance.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Kepatuhan Gaya & Tone BUMD</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.toneCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.toneCompliance.score >= 80 ? 'score-high' : 'score-low'}`}>
                  {liveCheck.toneCompliance.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Dukungan Fakta / Grounding</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {liveCheck.factualGrounding.groundedClaims} klaim berdasar sumber dari {liveCheck.factualGrounding.totalClaims} total.
                  </div>
                </div>
                <span className={`score-badge ${liveCheck.factualGrounding.passed ? 'score-high' : 'score-low'}`}>
                  {liveCheck.factualGrounding.score}%
                </span>
              </div>

              <div className="scorecard-item">
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Kelengkapan Call to Action</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liveCheck.ctaCompliance.details}</div>
                </div>
                <span className={`score-badge ${liveCheck.ctaCompliance.hasCta ? 'score-high' : 'score-med'}`}>
                  {liveCheck.ctaCompliance.hasCta ? 'LENGKAP' : 'BELUM'}
                </span>
              </div>

              {liveCheck.bannedWordsFound.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: 700, marginBottom: '4px' }}>
                    🚨 Istilah Terlarang Terdeteksi:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    Kata "{liveCheck.bannedWordsFound.join(', ')}" melanggar pedoman merek BUMD. Harap ganti dengan bahasa baku yang terukur.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Version History (PRD F-08) */}
          {activeTabSide === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Riwayat Versi (F-08)</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{draft.versions.length} Versi Tersimpan</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {draft.versions.map(ver => (
                  <div 
                    key={ver.versionNumber}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-tertiary)',
                      border: ver.versionNumber === draft.currentVersion ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Versi {ver.versionNumber} {ver.versionNumber === draft.currentVersion ? '(Aktif)' : ''}
                      </span>
                      {ver.versionNumber !== draft.currentVersion && (
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
                      Oleh: <strong>{ver.createdBy}</strong> • {new Date(ver.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      "{ver.changeSummary}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Version Comparison Diff (PRD F-08) */}
          {activeTabSide === 'diff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Perbandingan Versi (Diff)</h4>
                <select 
                  className="form-select"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                  value={compareVersionNumber}
                  onChange={e => setCompareVersionNumber(Number(e.target.value))}
                >
                  {draft.versions.map(v => (
                    <option key={v.versionNumber} value={v.versionNumber}>
                      Bandingkan dengan v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                <div style={{ padding: '10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.25)', maxHeight: '350px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#fb7185', marginBottom: '6px' }}>
                    Versi {comparedVer.versionNumber} ({comparedVer.createdBy})
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
                    {comparedVer.content}
                  </pre>
                </div>

                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', maxHeight: '350px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                    Naskah Terkini (Editor)
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

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Simpan Versi Baru (v{draft.versions.length + 1})</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Versi baru akan disimpan dalam riwayat audit naskah BUMD. Silakan berikan ringkasan perubahan yang Anda lakukan.
              </p>
              <div className="form-group">
                <label className="form-label">Ringkasan Perubahan *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                  placeholder="Contoh: Menyesuaikan butir persyaratan agar lebih ringkas"
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
