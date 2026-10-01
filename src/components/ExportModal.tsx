import React, { useState } from 'react';
import { ContentDraft, Workspace } from '../types';
import { 
  FileText, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Award,
  BookOpen,
  Building,
  FileDown,
  Code
} from 'lucide-react';

interface ExportModalProps {
  draft: ContentDraft;
  activeWorkspace: Workspace;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  draft,
  activeWorkspace,
  onClose
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'disposition' | 'markdown' | 'plaintext' | 'json'>('disposition');

  const currentVer = draft.versions[0];
  const isApproved = draft.status === 'disetujui';

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const markdownContent = `# ${draft.title}
**Organisasi:** ${activeWorkspace.name}  
**Format:** ${draft.format}  
**Status:** ${draft.status.toUpperCase()}  
**Versi:** v${draft.currentVersionon}  
**Tanggal:** ${new Date(draft.updatedAt).toLocaleDateString('id-ID')}  
**Dibuat oleh:** ${draft.creatorName}  
${draft.approvalInfo ? `**Nomor Disposisi:** ${draft.approvalInfo.dispositionNumber}  
**Disetujui oleh:** ${draft.approvalInfo.approvedBy} (${new Date(draft.approvalInfo.approvedAt).toLocaleDateString('id-ID')})` : ''}

---

## Konten Draf

${currentVer?.content}

---

## Referensi Sumber Knowledge Base (RAG)
${currentVer?.citations.map(c => `- **${c.documentTitle}** (${c.section}) - Relevansi: ${c.relevanceScore}%`).join('\n') || 'Tidak ada referensi aktif.'}
`;

  const jsonContent = JSON.stringify(draft, null, 2);

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Ekspor Draf & Disposisi BUMD (PRD F-11)
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {draft.title}
            </h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>X</button>
        </div>

        {/* Tab Selection */}
        <div style={{ padding: '0 24px', paddingTop: '16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button 
            className={`btn btn-sm ${activeTab === 'disposition' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('disposition')}
          >
            <Building size={14} style={{ marginRight: '4px' }} /> Lembar Pengiriman Resmi
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('markdown')}
          >
            <FileText size={14} style={{ marginRight: '4px' }} /> Format Markdown (.md)
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'plaintext' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('plaintext')}
          >
            <FileDown size={14} style={{ marginRight: '4px' }} /> Teks Biasa (.txt)
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'json' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('json')}
          >
            <Code size={14} style={{ marginRight: '4px' }} /> Metadata Audit (JSON)
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* TAB 1: Official BUMD Disposition Print-Ready Sheet */}
          {activeTab === 'disposition' && (
            <div 
              style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '36px',
                borderRadius: '12px',
                fontFamily: 'serif',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #cbd5e1',
                lineHeight: 1.6
              }}
            >
              {/* Kop Surat BUMD Resmi */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  {activeWorkspace.name}
                </h4>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {activeWorkspace.sector} • {activeWorkspace.city}
                </div>
                <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>
                  "{activeWorkspace.tagline}"
                </div>
              </div>

              {/* Title & Metadata */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h5 style={{ fontSize: '1.05rem', fontWeight: 800, textDecoration: 'underline', margin: '0 0 4px' }}>
                  LEMBAR PUBLIKASI KORPORAT
                </h5>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Format: {draft.format.replace('_', ' ').toUpperCase()} • Versi: v{draft.currentVersionon} • Tanggal: {new Date(draft.updatedAt).toLocaleDateString('id-ID')}
                </div>
              </div>

              {/* Content Body */}
              <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: 1.8, marginBottom: '28px' }}>
                {currentVer?.content}
              </div>

              {/* Citations Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '0.78rem', color: '#64748b', fontFamily: 'sans-serif', marginBottom: '28px' }}>
                <strong>Referensi Sumber Knowledge Base (RAG):</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                  {currentVer?.citations.map((c, i) => (
                    <li key={i}>{c.documentTitle} ({c.section}) - Terverifikasi</li>
                  ))}
                </ul>
              </div>

              {/* Approval Disposition Box */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '14px', borderTop: '2px solid #0f172a' }}>
                <div style={{ fontSize: '0.78rem', fontFamily: 'sans-serif' }}>
                  <div>Disiapkan oleh: <strong>{draft.creatorName}</strong></div>
                  <div style={{ color: '#64748b' }}>Staf Komunikasi & Konten Kreatif</div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.78rem', fontFamily: 'sans-serif' }}>
                  <div>Disetujui oleh:</div>
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isApproved ? (
                      <span style={{ border: '2px solid #059669', color: '#059669', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem', transform: 'rotate(-4deg)' }}>
                        Status: DISETUJUI RESMI<br/>
                        {draft.approvalInfo?.dispositionNumber}
                      </span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 700, fontStyle: 'italic' }}>
                        [MENUNGGU PERSETUJUAN]
                      </span>
                    )}
                  </div>
                  <div><strong>{draft.approvalInfo?.approvedBy || 'Kepala Humas'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Markdown */}
          {activeTab === 'markdown' && (
            <pre style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {markdownContent}
            </pre>
          )}

          {/* TAB 3: Plain text */}
          {activeTab === 'plaintext' && (
            <pre style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {currentVer?.content}
            </pre>
          )}

          {/* TAB 4: JSON */}
          {activeTab === 'json' && (
            <pre style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', fontSize: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
              {jsonContent}
            </pre>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span>Cetak Dokumen</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => handleCopy(
                activeTab === 'markdown' ? markdownContent : (activeTab === 'json' ? jsonContent : (currentVer?.content || '')),
                activeTab
              )}
            >
              {copiedType === activeTab ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedType === activeTab ? 'Tersalin!' : 'Salin ke Clipboard'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => handleDownload(
                activeTab === 'markdown' ? markdownContent : (activeTab === 'json' ? jsonContent : (currentVer?.content || '')),
                `${draft.title.replace(/\s+/g, '_')}.${activeTab === 'markdown' ? 'md' : (activeTab === 'json' ? 'json' : 'txt')}`,
                activeTab === 'json' ? 'application/json' : 'text/plain'
              )}
            >
              <Download size={14} />
              <span>Unduh File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
