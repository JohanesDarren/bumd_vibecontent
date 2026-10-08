import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  Building2, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';

type Workspace = { id: string; name: string; code: string; sector: string; city: string; companyId: string };

const emptyForm = { id: '', companyId: '', name: '', code: '', sector: '', city: '' };

export const AdminWorkspacesView: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, companyList] = await Promise.all([
        apiService.adminWorkspaces(), 
        apiService.adminCompanies()
      ]);
      setWorkspaces(list);
      setCompanies(companyList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeSignal(load);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name || '—';

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true); 
    setError(''); 
    setNotice('');
    try { 
      await action(); 
      await load(); 
      setNotice(done); 
      return true; 
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Aksi gagal'); 
      return false; 
    } finally { 
      setBusy(false); 
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      companyId: form.companyId,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      sector: form.sector.trim(),
      city: form.city.trim(),
    };
    const ok = form.id
      ? await run(() => apiService.updateAdminWorkspace(form.id, payload), 'Workspace berhasil diperbarui.')
      : await run(() => apiService.createAdminWorkspace(payload), 'Workspace baru berhasil dibuat.');
    if (ok) {
      setForm(emptyForm);
      setShowForm(false);
    }
  };

  const edit = (ws: Workspace) => {
    setForm({
      id: ws.id,
      companyId: ws.companyId,
      name: ws.name,
      code: ws.code,
      sector: ws.sector,
      city: ws.city,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (workspace: Workspace) => {
    if (!window.confirm(`Hapus workspace ${workspace.name}? Semua draf dan data di dalamnya akan terhapus.`)) return;
    void run(() => apiService.deleteAdminWorkspace(workspace.id), `Workspace ${workspace.name} dihapus.`);
  };

  const visible = useMemo(() => {
    return workspaces.filter(workspace => {
      const matchesCompany = selectedCompanyFilter === 'all' || workspace.companyId === selectedCompanyFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || [
        workspace.name, 
        workspace.code, 
        workspace.sector, 
        workspace.city, 
        companyName(workspace.companyId)
      ].some(val => val?.toLowerCase().includes(q));

      return matchesCompany && matchesQuery;
    });
  }, [workspaces, companies, query, selectedCompanyFilter]);

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              SUPERADMIN • MANAJEMEN UNIT KERJA
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layers size={28} style={{ color: 'var(--primary)' }} />
            Manajemen Workspace
          </h2>
          <p className="page-subtitle">
            Buat, konfigurasi, dan kelola alokasi unit kerja BUMD di seluruh entitas holding perusahaan terdaftar.
          </p>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        <button 
          className="btn btn-primary scheduling-add-btn" 
          type="button"
          onClick={() => {
            if (!showForm) {
              setForm(emptyForm);
              setShowForm(true);
            } else {
              setShowForm(false);
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Workspace Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '220px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari workspace, kode, kota..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="scheduling-filter-select"
            value={selectedCompanyFilter}
            onChange={e => setSelectedCompanyFilter(e.target.value)}
          >
            <option value="all">Semua Perusahaan</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#38bdf8' }} />
            <span style={{ color: '#0d0cbd' }}>{workspaces.length} Workspace</span>
          </div>
        </div>
      </div>

      {/* ── Status Alerts ── */}
      {notice && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-emerald)' }}>
          <Check size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{notice}</span>
        </div>
      )}

      {error && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* ── Add / Edit Form Panel ── */}
      {showForm && (
        <form onSubmit={submit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <Layers size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {form.id ? `Ubah Workspace: ${form.name}` : 'Tambah Workspace Unit Kerja Baru'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Workspace memiliki brand profile, repositori dokumen pengetahuan, dan timeline konten sendiri.
                </p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
              <X size={16} />
            </button>
          </div>

          {!companies.length && (
            <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', color: '#d97706', fontSize: '0.85rem', marginBottom: '16px' }}>
              Peringatan: Belum ada perusahaan induk terdaftar. Silakan buat perusahaan terlebih dahulu di menu Data Master BUMD.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Perusahaan Induk (Holding) *</label>
              <select 
                required 
                className="form-select"
                value={form.companyId} 
                onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value }))}
              >
                <option value="">Pilih Perusahaan Induk</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Workspace *</label>
              <input 
                required 
                className="form-input"
                placeholder="cth. Perumda Pasar Tohaga"
                value={form.name} 
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kode Unit (3-6 Karakter) *</label>
              <input 
                required 
                maxLength={8}
                className="form-input"
                placeholder="cth. PSR-BOGOR"
                value={form.code} 
                onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} 
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Sektor BUMD *</label>
              <input 
                required 
                className="form-input"
                placeholder="cth. Perdagangan &amp; Pasar"
                value={form.sector} 
                onChange={e => setForm(prev => ({ ...prev, sector: e.target.value }))} 
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kota / Wilayah *</label>
              <input 
                required 
                className="form-input"
                placeholder="cth. Kabupaten Bogor"
                value={form.city} 
                onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="submit" disabled={busy || !companies.length} className="btn btn-primary">
              {busy ? 'Menyimpan…' : form.id ? 'Simpan Perubahan' : 'Simpan Workspace'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ── Workspaces Table Card ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Layers size={20} style={{ color: 'var(--primary)' }} />
              <span>Daftar Seluruh Workspace Unit Kerja</span>
            </div>
            <p className="corporate-table-subtitle">Unit kerja operasional yang dikelompokkan berdasarkan entitas induk BUMD.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
            <span>Memuat data workspace…</span>
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Layers size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Workspace Terdaftar</p>
            <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>Tambahkan workspace pertama untuk mulai menggunakan fitur konten.</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada workspace yang cocok dengan filter atau pencarian Anda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Workspace &amp; Unit</th>
                  <th>Perusahaan Induk</th>
                  <th>Sektor</th>
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
                          <Layers size={18} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                            {workspace.name}
                          </span>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '0.74rem', 
                            color: 'var(--accent-cyan)',
                            fontWeight: 700
                          }}>
                            {workspace.code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {companyName(workspace.companyId)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {workspace.sector || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{workspace.city || '—'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          type="button" 
                          onClick={() => onOpen(workspace.id)} 
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <span>Buka</span>
                          <ExternalLink size={12} />
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => edit(workspace)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 size={12} />
                          <span>Ubah</span>
                        </button>
                        <button 
                          type="button" 
                          disabled={busy}
                          className="btn btn-secondary btn-sm"
                          onClick={() => remove(workspace)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
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
          <span>Menampilkan {visible.length} dari {workspaces.length} workspace terdaftar</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            Ruang Lingkup Global
          </span>
        </div>
      </div>
    </div>
  );
};
