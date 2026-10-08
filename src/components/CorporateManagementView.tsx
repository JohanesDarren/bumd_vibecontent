import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import type { Workspace } from '../types';
import { 
  Building2, 
  Plus, 
  Search, 
  ExternalLink, 
  X, 
  MapPin, 
  ShieldCheck, 
  AlertCircle,
  Edit3,
  Trash2,
  Check
} from 'lucide-react';

const emptyForm = { name: '', code: '', sector: '', city: '' };

export const CorporateManagementView: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try { 
      setWorkspaces(await apiService.corporateWorkspaces()); 
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Gagal memuat workspace'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { void load(); }, []);
  useRealtimeSignal(load);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setNotice('');
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), sector: form.sector.trim(), city: form.city.trim() };
      if (editing) {
        const updated = await apiService.updateCorporateWorkspace(editing.id, payload);
        setWorkspaces(previous => previous.map(w => w.id === updated.id ? { ...w, ...updated } : w));
        setNotice('Workspace berhasil diperbarui.');
      } else {
        const created = await apiService.createCorporateWorkspace(payload);
        setWorkspaces(previous => [...previous, created]);
        setNotice('Workspace baru berhasil dibuat.');
      }
      setEditing(null);
      setForm(emptyForm);
      setShowForm(false);
    } catch (e) { 
      setError(e instanceof Error ? e.message : editing ? 'Gagal memperbarui workspace' : 'Gagal membuat workspace'); 
    } finally { 
      setBusy(false); 
    }
  };

  const startEdit = (workspace: Workspace) => {
    setEditing(workspace);
    setForm({ name: workspace.name, code: workspace.code, sector: workspace.sector, city: workspace.city });
    setShowForm(true);
    setError(''); setNotice('');
  };

  const remove = async (workspace: Workspace) => {
    if (!window.confirm(`Hapus workspace "${workspace.name}"? Workspace dengan anggota atau konten tidak dapat dihapus.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiService.deleteCorporateWorkspace(workspace.id);
      setWorkspaces(previous => previous.filter(w => w.id !== workspace.id));
      setNotice(`Workspace "${workspace.name}" dihapus.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus workspace');
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(() => {
    if (!query.trim()) return workspaces;
    const q = query.toLowerCase();
    return workspaces.filter(workspace =>
      [workspace.name, workspace.code, workspace.sector, workspace.city].some(value => 
        value?.toLowerCase().includes(q)
      )
    );
  }, [workspaces, query]);

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              ENTITAS KORPORAT • UNIT KERJA BUMD
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={28} style={{ color: 'var(--primary)' }} />
            Workspace Perusahaan
          </h2>
          <p className="page-subtitle">
            Daftar, konfigurasi, dan isolasi lingkungan kerja untuk setiap unit atau anak perusahaan BUMD.
          </p>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        <button 
          className="btn btn-primary scheduling-add-btn"
          type="button" 
          onClick={() => { setShowForm(prev => !prev); setEditing(null); setForm(emptyForm); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Workspace Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '260px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama, kode, sektor, atau kota..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#38bdf8' }} />
            <span style={{ color: '#0d0cbd' }}>{workspaces.length} Terdaftar</span>
          </div>
        </div>
      </div>

      {/* ── Notice Banner ── */}
      {notice && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-emerald)' }}>
          <Check size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{notice}</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Coba lagi</button>
        </div>
      )}

      {/* ── Add Workspace Form Panel ── */}
      {showForm && (
        <form onSubmit={submit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                {editing ? <Edit3 size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? `Perbarui Workspace: ${editing.name}` : 'Registrasi Workspace Baru'}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{editing ? 'Ubah identitas unit kerja. Kode harus unik di seluruh sistem.' : 'Buat lingkungan kerja baru dengan isolasi data dan profil merek terpisah.'}</p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Workspace *</label>
              <input 
                required 
                placeholder="cth. Perumda Air Minum Tirta Kahuripan"
                value={form.name} 
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} 
                className="form-input" 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kode Unit (3-6 Karakter) *</label>
              <input 
                required 
                maxLength={8}
                placeholder="cth. PDAM-BGR"
                value={form.code} 
                onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} 
                className="form-input" 
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Sektor BUMD *</label>
              <input 
                required 
                placeholder="cth. Utilitas Air Bersih / Transportasi"
                value={form.sector} 
                onChange={e => setForm(prev => ({ ...prev, sector: e.target.value }))} 
                className="form-input" 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kota / Wilayah *</label>
              <input 
                required 
                placeholder="cth. Kabupaten Bogor"
                value={form.city} 
                onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} 
                className="form-input" 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? (editing ? 'Menyimpan Perubahan…' : 'Menyimpan Workspace…') : (editing ? 'Simpan Perubahan' : 'Simpan & Buat Workspace')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); setEditing(null); }}>
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ── Workspaces Table ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Building2 size={20} style={{ color: 'var(--primary)' }} />
              <span>Daftar Unit Kerja Terdaftar</span>
            </div>
            <p className="corporate-table-subtitle">Unit kerja yang memiliki akses terhadap basis pengetahuan dan studio konten mandiri.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
            <span>Memuat data workspace…</span>
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Workspace Terdaftar</p>
            <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>Klik tombol Tambah Workspace Baru untuk mendaftarkan unit kerja pertama.</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada workspace yang sesuai dengan kata kunci "{query}".</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Nama Workspace &amp; Unit</th>
                  <th>Kode Sistem</th>
                  <th>Sektor BUMD</th>
                  <th>Kota / Lokasi</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(workspace => (
                  <tr key={workspace.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="corporate-avatar-box">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                            {workspace.name}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ID: {workspace.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.78rem', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--accent-cyan)',
                        fontWeight: 700
                      }}>
                        {workspace.code}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {workspace.sector || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{workspace.city || '—'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => startEdit(workspace)}
                          disabled={busy}
                          className="btn btn-outline-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(workspace)}
                          disabled={busy}
                          className="btn btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.4)' }}
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => onOpen(workspace.id)} 
                          className="btn btn-outline-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>Buka Workspace</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="corporate-table-footer">
          <span>Menampilkan {visible.length} dari {workspaces.length} workspace BUMD</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            Isolasi Tenant Terverifikasi
          </span>
        </div>
      </div>
    </div>
  );
};
