import React, { useState, useMemo } from 'react';
import { KnowledgeDocument, Workspace, User, DocumentCategory, DocumentStatus, KnowledgeChunk } from '../types';
import { apiService } from '../services/apiService';
import { BookOpen, Plus, Search, Trash2, Edit, RefreshCw, AlertTriangle, ArrowLeft, Save, UploadCloud, Eye } from 'lucide-react';

interface Props {
  documents: KnowledgeDocument[];
  activeWorkspace: Workspace;
  activeUser: User;
  onNotify: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const KnowledgeBaseView: React.FC<Props> = ({ documents, activeWorkspace, activeUser, onNotify, onReload }) => {
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rawText, setRawText] = useState('');

  const filteredDocs = useMemo(() => {
    if (!search) return documents;
    const lower = search.toLowerCase();
    return documents.filter(d => 
      d.title.toLowerCase().includes(lower) || 
      d.summary.toLowerCase().includes(lower) ||
      d.category.toLowerCase().includes(lower)
    );
  }, [documents, search]);

  const handleSync = async () => {
    if (!window.confirm('Mulai sinkronisasi paksa ke RAG untuk workspace ini?')) return;
    setBusy(true);
    try {
      const res = await apiService.ragSync(activeWorkspace.id);
      onNotify(`Sinkronisasi selesai: ${res.indexed} berhasil, ${res.failed} gagal dari total ${res.total} dokumen.`);
      await onReload();
    } catch (err) {
      onNotify(`Gagal sinkronisasi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePrune = async () => {
    if (!window.confirm('Bersihkan dokumen yang tidak valid/usang di RAG?')) return;
    setBusy(true);
    try {
      const res = await apiService.ragPrune(activeWorkspace.id);
      onNotify(`Pembersihan selesai: ${res.removed} dihapus, ${res.failed} gagal.`);
    } catch (err) {
      onNotify(`Gagal prune: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (doc: KnowledgeDocument) => {
    if (!window.confirm(`Hapus dokumen "${doc.title}"? Ini akan menghapusnya dari database dan RAG.`)) return;
    setBusy(true);
    try {
      const res = await apiService.deleteKnowledgeSource(activeWorkspace.id, doc.id);
      onNotify(`Dokumen dihapus. Sinkronisasi RAG: ${res.ragSynced ? 'Berhasil' : 'Gagal'}`);
      await onReload();
    } catch (err) {
      onNotify(`Gagal menghapus: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (doc?: KnowledgeDocument) => {
    if (doc) {
      setEditingDoc(JSON.parse(JSON.stringify(doc))); // deep copy
      const text = (doc.chunks || []).map(c => `${c.section ? `[${c.section}]\n` : ''}${c.content}`).join('\n\n');
      setRawText(text);
      setIsCreating(false);
    } else {
      const newDoc: KnowledgeDocument = {
        id: `doc-${activeWorkspace.code.toLowerCase()}-${Date.now()}`,
        workspaceId: activeWorkspace.id,
        title: '',
        category: 'sk_direksi',
        owner: activeUser.name,
        version: '1.0',
        effectiveDate: new Date().toISOString().split('T')[0],
        status: 'menunggu_persetujuan',
        uploadDate: new Date().toISOString(),
        fileSize: '0 KB',
        summary: '',
        chunks: []
      };
      setEditingDoc(newDoc);
      setRawText('');
      setIsCreating(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    
    setBusy(true);
    try {
      // Very naive chunking strategy for text input.
      // In a real scenario we'd use PDF parsing or NLP chunking.
      const rawChunks = rawText.split('\n\n').filter(t => t.trim());
      const updatedChunks: KnowledgeChunk[] = rawChunks.map((content, idx) => ({
        id: `chk-${editingDoc.id}-${idx}`,
        documentId: editingDoc.id,
        section: `Bagian ${idx + 1}`,
        page: 1,
        content: content.trim(),
        keywords: []
      }));

      const docToSave = {
        ...editingDoc,
        chunks: updatedChunks,
        fileSize: `${Math.ceil(new Blob([rawText]).size / 1024)} KB`
      };

      const res = await apiService.saveKnowledgeSource(docToSave);
      onNotify(`Dokumen disimpan. Sinkronisasi RAG: ${res.ragSynced ? 'Berhasil' : 'Gagal'}`);
      setEditingDoc(null);
      await onReload();
    } catch (err) {
      onNotify(`Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  if (editingDoc) {
    return (
      <div className="card-panel" style={{ padding: '24px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditingDoc(null)} style={{ marginBottom: '16px' }} disabled={busy}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit size={20} /> {isCreating ? 'Tambah Dokumen Pengetahuan' : 'Edit Dokumen'}
        </h2>
        
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-group">
              <span className="form-label">Judul Dokumen</span>
              <input className="form-input" value={editingDoc.title} onChange={e => setEditingDoc({...editingDoc, title: e.target.value})} required disabled={busy}/>
            </label>
          </div>
          
          <label className="form-group">
            <span className="form-label">Kategori</span>
            <select className="form-select" value={editingDoc.category} onChange={e => setEditingDoc({...editingDoc, category: e.target.value as DocumentCategory})} disabled={busy}>
              <option value="sk_direksi">SK Direksi</option>
              <option value="sop_layanan">SOP Layanan</option>
              <option value="tarif_resmi">Tarif Resmi</option>
              <option value="laporan_tahunan">Laporan Tahunan</option>
              <option value="panduan_merek">Panduan Merek</option>
              <option value="siaran_pers">Siaran Pers</option>
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Status (Hanya Aktif yang diindeks RAG)</span>
            <select className="form-select" value={editingDoc.status} onChange={e => setEditingDoc({...editingDoc, status: e.target.value as DocumentStatus})} disabled={busy}>
              <option value="aktif">Aktif</option>
              <option value="menunggu_persetujuan">Menunggu Persetujuan</option>
              <option value="usang">Usang</option>
              <option value="gagal_diproses">Gagal Diproses</option>
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Versi</span>
            <input className="form-input" value={editingDoc.version} onChange={e => setEditingDoc({...editingDoc, version: e.target.value})} disabled={busy}/>
          </label>
          
          <label className="form-group">
            <span className="form-label">Tanggal Berlaku</span>
            <input type="date" className="form-input" value={editingDoc.effectiveDate} onChange={e => setEditingDoc({...editingDoc, effectiveDate: e.target.value})} disabled={busy}/>
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-group">
              <span className="form-label">Ringkasan Dokumen</span>
              <textarea className="form-input" rows={2} value={editingDoc.summary} onChange={e => setEditingDoc({...editingDoc, summary: e.target.value})} required disabled={busy}/>
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-group">
              <span className="form-label">Teks Dokumen (Pisahkan antar paragraf/bab dengan baris kosong untuk pemecahan chunk)</span>
              <textarea className="form-input" rows={12} value={rawText} onChange={e => setRawText(e.target.value)} required disabled={busy} placeholder="Masukkan teks dokumen mentah di sini..."/>
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingDoc(null)} disabled={busy}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Save size={16} /> {busy ? 'Menyimpan...' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} /> Knowledge Base Workspace
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Kelola sumber kebenaran (Source of Truth) untuk RAG BUMD Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrune} disabled={busy} title="Bersihkan dokumen tak terdaftar dari remote RAG">
            <AlertTriangle size={16} /> Prune
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={busy} title="Sinkronkan ulang semua dokumen ke RAG">
            <RefreshCw size={16} className={busy ? 'spin' : ''} /> Sync RAG
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openEditor()} disabled={busy}>
            <Plus size={16} /> Tambah Dokumen
          </button>
        </div>
      </div>

      <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari dokumen..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.95rem', color: 'var(--text-color)' }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Judul</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Kategori</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Versi</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Tidak ada dokumen yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{doc.summary.substring(0, 60)}...</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>{doc.category.replace('_', ' ')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: doc.status === 'aktif' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: doc.status === 'aktif' ? '#22c55e' : '#f59e0b' 
                      }}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>v{doc.version}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => openEditor(doc)} title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '6px', color: '#ef4444' }} onClick={() => handleDelete(doc)} title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
