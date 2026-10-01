import React, { useState } from 'react';
import { 
  ContentDraft, 
  ContentFormat, 
  DraftStatus, 
  Workspace 
} from '../types';
import { 
  Search, 
  Filter, 
  Eye, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Archive, 
  Calendar, 
  User as UserIcon,
  Tag
} from 'lucide-react';

interface LibraryViewProps {
  drafts: ContentDraft[];
  activeWorkspace: Workspace;
  onSelectDraft: (draftId: string) => void;
  onOpenEditor: (draftId: string) => void;
  onOpenExportModal: (draft: ContentDraft) => void;
  onArchiveDraft: (draftId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  drafts,
  activeWorkspace,
  onSelectDraft,
  onOpenEditor,
  onOpenExportModal,
  onArchiveDraft
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<ContentFormat | 'all'>('all');

  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = 
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.versions[0]?.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || draft.status === statusFilter;
    const matchesFormat = formatFilter === 'all' || draft.format === formatFilter;

    return matchesSearch && matchesStatus && matchesFormat;
  });

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Pustaka Konten</h2>
          <p className="page-subtitle">
            Kumpulan semua draf resmi, siaran pers, dan naskah video milik <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              placeholder="Cari berdasarkan judul, kata kunci, atau topik..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <select 
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Semua Status Persetujuan</option>
              <option value="draft">Draf</option>
              <option value="menunggu_review">Menunggu Review</option>
              <option value="revisi_diminta">Revisi Diminta</option>
              <option value="disetujui">Disetujui</option>
              <option value="diarsipkan">Diarsipkan</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <select 
              className="form-select"
              value={formatFilter}
              onChange={e => setFormatFilter(e.target.value as any)}
            >
              <option value="all">Semua Format Konten</option>
              <option value="copy_caption">Caption Media Sosial</option>
              <option value="teks_promosi">Teks Siaran Pers</option>
              <option value="naskah_singkat">Naskah Video 9:16</option>
              <option value="brief_visual">Panduan Grafis Visual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Draft Cards Grid */}
      {filteredDrafts.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tidak Ada Draf</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sesuaikan kata kunci pencarian atau ubah filter status di atas.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredDrafts.map(draft => {
            const latestVer = draft.versions[0];
            return (
              <div 
                key={draft.id} 
                className="card-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '20px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`status-pill ${draft.status}`}>
                      {draft.status === 'draft' && 'Draf'}
                      {draft.status === 'menunggu_review' && 'Menunggu Review'}
                      {draft.status === 'revisi_diminta' && 'Revisi Diminta'}
                      {draft.status === 'disetujui' && 'Disetujui'}
                      {draft.status === 'diarsipkan' && 'Diarsipkan'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      v{draft.currentVersionon}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {draft.title}
                  </h3>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {latestVer?.content}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Oleh: <strong>{draft.creatorName}</strong></span>
                    <span>{new Date(draft.updatedAt).toLocaleDateString('en-US')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    {latestVer?.citations?.length > 0 ? (
                      <span className="grounding-badge verified">
                        <CheckCircle2 size={12} /> {latestVer.citations.length} Referensi
                      </span>
                    ) : (
                      <span className="grounding-badge warning">
                        <AlertTriangle size={12} /> Perlu Verifikasi
                      </span>
                    )}

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenEditor(draft.id)}
                        title="Buka di Editor"
                      >
                        <Eye size={14} />
                        <span>Buka</span>
                      </button>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => onOpenExportModal(draft)}
                        title="Ekspor Draf"
                      >
                        <Share2 size={14} />
                        <span>Ekspor</span>
                      </button>
                      {draft.status !== 'diarsipkan' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => onArchiveDraft(draft.id)} title="Arsipkan draf">
                          <Archive size={14}/><span>Arsipkan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
