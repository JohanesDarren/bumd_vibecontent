import React, { useState } from 'react';
import { 
  KnowledgeDocument, 
  KnowledgeChunk, 
  DocumentCategory, 
  DocumentStatus, 
  Workspace, 
  User 
} from '../types';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Archive, 
  Layers, 
  Eye, 
  ShieldCheck, 
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';

interface KnowledgeBaseViewProps {
  documents: KnowledgeDocument[];
  activeWorkspace: Workspace;
  activeUser: User;
  onUpdateStatus: (docId: string, status: DocumentStatus) => void;
  onUploadDocument: (newDoc: KnowledgeDocument) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  documents,
  activeWorkspace,
  activeUser,
  onUpdateStatus,
  onUploadDocument
}) => {
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New Document Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocumentCategory>('sop_layanan');
  const [newOwner, setNewOwner] = useState(activeUser.department);
  const [newVersionon, setNewVersionon] = useState('v1.0');
  const [newEffectiveDate, setNewEffectiveDate] = useState('2026');
  const [newInitialStatus, setNewInitialStatus] = useState<DocumentStatus>('aktif');
  const [newContent, setNewContent] = useState('');
  const [newSectionName, setNewSectionName] = useState('Bab 1 - Ketentuan Pokok Pelayanan');

  const isAdminOrOwner = activeUser.role === 'admin' || activeUser.role === 'reviewer';

  const handleConfirmUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Judul dan konten dokumen wajib diisi.');
      return;
    }

    const docId = `doc-${activeWorkspace.code.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    
    // Automatically chunk document
    const words = newContent.split(/\s+/);
    const keywords = Array.from(new Set(words.filter(w => w.length > 4).map(w => w.toLowerCase()))).slice(0, 8);

    const chunk: KnowledgeChunk = {
      id: `chk-${Date.now()}-1`,
      documentId: docId,
      section: newSectionName,
      page: 1,
      content: newContent,
      keywords
    };

    const newDoc: KnowledgeDocument = {
      id: docId,
      workspaceId: activeWorkspace.id,
      title: newTitle,
      category: newCategory,
      owner: newOwner,
      version: newVersionon,
      effectiveDate: newEffectiveDate,
      status: newInitialStatus,
      uploadDate: new Date().toISOString(),
      fileSize: '1.2 MB',
      summary: newContent.slice(0, 160) + '...',
      chunks: [chunk]
    };

    onUploadDocument(newDoc);
    setShowUploadModal(false);
    // Reset
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Basis Pengetahuan Resmi (RAG Knowledge Base)</h2>
          <p className="page-subtitle">
            Pusat dokumen resmi BUMD <strong>{activeWorkspace.name}</strong>. RAG hanya mengambil informasi dari dokumen yang berstatus <strong>Active</strong>.
          </p>
        </div>

        {isAdminOrOwner && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <UploadCloud size={16} />
            <span>Unggah Dokumen Baru</span>
          </button>
        )}
      </div>

      {/* Grounding Isolation Banner */}
      <div 
        style={{
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(2, 132, 199, 0.1)',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            <strong>Prinsip Anti-Halusinasi (PRD F-04):</strong> Hanya dokumen berstatus <strong>Active</strong> yang menjadi konteks retrieval AI. Dokumen <em>Menunggu Persetujuan</em> atau <em>Usang</em> diabaikan secara ketat oleh sistem.
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
          {documents.filter(d => d.status === 'aktif').length} Dokumen Active Terindeks
        </span>
      </div>

      {/* Documents Table */}
      <div className="card-panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Judul Dokumen Resmi</th>
                <th style={{ padding: '12px 14px' }}>Kategori</th>
                <th style={{ padding: '12px 14px' }}>Penanggung Jawab</th>
                <th style={{ padding: '12px 14px' }}>Version / Berlaku</th>
                <th style={{ padding: '12px 14px' }}>Status RAG</th>
                <th style={{ padding: '12px 14px' }}>Potongan (Chunks)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px', maxWidth: '340px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Ukuran: {doc.fileSize} • Diunggah: {new Date(doc.uploadDate).toLocaleDateString('id-ID')}
                    </div>
                  </td>

                  <td style={{ padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
                      {doc.category === 'sk_direksi' && 'SK Direksi'}
                      {doc.category === 'sop_layanan' && 'SOP Pelayanan'}
                      {doc.category === 'tarif_resmi' && 'Tarif Resmi'}
                      {doc.category === 'panduan_merek' && 'Panduan Merek'}
                      {doc.category === 'laporan_tahunan' && 'Laporan Tahunan'}
                    </span>
                  </td>

                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                    {doc.owner}
                  </td>

                  <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {doc.version} • {doc.effectiveDate}
                  </td>

                  {/* Status Toggle (PRD Acceptance Criteria) */}
                  <td style={{ padding: '14px' }}>
                    {isAdminOrOwner ? (
                      <select 
                        className="form-select"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          background: doc.status === 'aktif' 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : (doc.status === 'menunggu_persetujuan' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.2)'),
                          color: doc.status === 'aktif' ? '#34d399' : (doc.status === 'menunggu_persetujuan' ? '#fbbf24' : '#94a3b8'),
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        value={doc.status}
                        onChange={e => onUpdateStatus(doc.id, e.target.value as DocumentStatus)}
                      >
                        <option value="aktif">Status: Active (Dipakai RAG)</option>
                        <option value="menunggu_persetujuan"> Menunggu Persetujuan</option>
                        <option value="usang"> Usang / Nonaktif</option>
                      </select>
                    ) : (
                      <span className={`status-pill ${doc.status}`}>
                        {doc.status === 'aktif' ? 'Active' : (doc.status === 'menunggu_persetujuan' ? 'Menunggu' : 'Usang')}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {doc.chunks.length} Chunks
                  </td>

                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedDoc(doc)}
                      title="Lihat Potongan Teks Chunks"
                    >
                      <Eye size={12} />
                      <span>Detail</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Detail & Chunks Modal */}
      {selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Detail Indeks Knowledge Base Documents
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '2px' }}>
                  {selectedDoc.title}
                </h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDoc(null)}
              >
                X
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px', fontSize: '0.78rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{selectedDoc.status.toUpperCase()}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{selectedDoc.owner}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Masa Berlaku:</span> <strong>{selectedDoc.effectiveDate}</strong></div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>Ringkasan Isi</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedDoc.summary}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="var(--primary)" />
                  <span>Potongan Vektor Chunks ({selectedDoc.chunks.length})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedDoc.chunks.map(chunk => (
                    <div 
                      key={chunk.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'var(--bg-tertiary)',
                        borderLeft: '4px solid var(--primary)',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                        {chunk.section} {chunk.page ? `(Hal ${chunk.page})` : ''}
                      </div>
                      <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {chunk.content}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {chunk.keywords.map((kw, i) => (
                          <span key={i} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Document Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Unggah Dokumen Sumber Resmi Baru</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadModal(false)}>X</button>
            </div>
            <form onSubmit={handleConfirmUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Dokumen Resmi *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Contoh: SK Direksi No. 55/2026: Tarif Uji Laboratorium Air Bersih"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Kategori Dokumen</label>
                    <select 
                      className="form-select"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as DocumentCategory)}
                    >
                      <option value="sk_direksi">SK Direksi</option>
                      <option value="sop_layanan">SOP Layanan</option>
                      <option value="tarif_resmi">Tarif Resmi</option>
                      <option value="panduan_merek">Panduan Merek</option>
                      <option value="laporan_tahunan">Laporan Tahunan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Awal Dokumen</label>
                    <select 
                      className="form-select"
                      value={newInitialStatus}
                      onChange={e => setNewInitialStatus(e.target.value as DocumentStatus)}
                    >
                      <option value="aktif">Active (Langsung Bisa Dipakai RAG)</option>
                      <option value="menunggu_persetujuan">Menunggu Persetujuan (Pending)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bagian / Pasal / Section</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Konten Teks Dokumen Resmi *</label>
                  <textarea 
                    className="form-textarea" 
                    rows={5}
                    placeholder="Ketik atau tempel teks kutipan SK Direksi atau SOP resmi di sini..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Indeks & Simpan ke Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
