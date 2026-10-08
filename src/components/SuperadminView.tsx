import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService, type AdminOverview } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Building 
} from 'lucide-react';

export const SuperadminView: React.FC = () => {
  const [companies, setCompanies] = useState<AdminOverview['companies']>([]);
  const [form, setForm] = useState({ id: '', name: '' });
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await apiService.adminOverview();
      setCompanies(overview.companies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data perusahaan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeSignal(load);

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
    const name = form.name.trim();
    if (!name) return;
    const action = form.id
      ? () => apiService.updateAdminCompany(form.id, name)
      : () => apiService.createCompany(name);
    const ok = await run(action, form.id ? 'Nama perusahaan berhasil diperbarui.' : 'Perusahaan baru berhasil ditambahkan.');
    if (ok) {
      setForm({ id: '', name: '' });
      setShowForm(false);
    }
  };

  const edit = (company: AdminOverview['companies'][number]) => {
    setForm({ id: company.id, name: company.name });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (company: AdminOverview['companies'][number]) => {
    if (!window.confirm(`Hapus entitas perusahaan ${company.name}? Semua data terkait akan ikut terhapus.`)) return;
    void run(() => apiService.deleteAdminCompany(company.id), `Perusahaan ${company.name} berhasil dihapus.`);
  };

  const visible = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [companies, query]);

  const totalWorkspaces = companies.reduce((sum, company) => sum + company.workspaceCount, 0);
  const totalUsers = companies.reduce((sum, company) => sum + company.userCount, 0);

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              DATA MASTER • ENTITAS INDUK BUMD
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={28} style={{ color: 'var(--primary)' }} />
            Data Master BUMD
          </h2>
          <p className="page-subtitle">
            Daftar instansi holding induk yang menaungi berbagai unit kerja dan akun kreator pada platform.
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
              setForm({ id: '', name: '' });
              setShowForm(true);
            } else {
              setShowForm(false);
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Entitas BUMD'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '260px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama perusahaan induk..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#38bdf8' }} />
            <span style={{ color: '#0d0cbd' }}>{companies.length} Entitas</span>
          </div>
          <div className="stat-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#818cf8' }} />
            <span style={{ color: '#6366f1' }}>{totalWorkspaces} Workspace</span>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <Building2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {form.id ? `Ubah Entitas: ${form.name}` : 'Tambah Entitas Induk BUMD Baru'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Entitas induk menaungi satu atau beberapa workspace unit kerja daerah.
                </p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => { setShowForm(false); setForm({ id: '', name: '' }); }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Perusahaan Induk / BUMD *</label>
              <input 
                required 
                className="form-input"
                placeholder="Contoh: Perumda Air Minum Tirta Jaya Mandiri"
                value={form.name} 
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Menyimpan…' : form.id ? 'Simpan Perubahan' : 'Simpan Entitas BUMD'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm({ id: '', name: '' }); }}>
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ── Companies Table Card ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Building2 size={20} style={{ color: 'var(--primary)' }} />
              <span>Daftar Perusahaan Induk Terdaftar</span>
            </div>
            <p className="corporate-table-subtitle">Master entitas yang memiliki hak pembentukan unit kerja dan pendelegasian admin korporat.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
            <span>Memuat data perusahaan…</span>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Perusahaan Terdaftar</p>
            <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>Tambahkan perusahaan induk pertama untuk mulai membentuk workspace.</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada perusahaan yang cocok dengan kata kunci "{query}".</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Nama Perusahaan Induk</th>
                  <th>Total Workspace</th>
                  <th>Akun Terhubung</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(company => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="corporate-avatar-box">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                            {company.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ID: {company.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.workspaceCount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>workspace</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.userCount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>pengguna</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => edit(company)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 size={13} />
                          <span>Ubah</span>
                        </button>
                        <button 
                          type="button" 
                          disabled={busy}
                          className="btn btn-secondary btn-sm"
                          onClick={() => remove(company)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={13} />
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
          <span>Menampilkan {visible.length} dari {companies.length} entitas — {totalWorkspaces} workspace, {totalUsers} akun</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            Master Tenant Holding
          </span>
        </div>
      </div>
    </div>
  );
};
