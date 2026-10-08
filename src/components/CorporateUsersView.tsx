import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { 
  Users, 
  Search, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  UserPlus,
  Edit3,
  Trash2
} from 'lucide-react';

type Creator = { id: string; name: string; email: string; workspaceIds: string[] };

const emptyForm = { name: '', email: '', password: '' };

export const CorporateUsersView: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setError('');
    setCreators(await apiService.corporateUsers());
  };

  const reload = useCallback(() => {
    void refresh().catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat kreator'));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useRealtimeSignal(reload);

  const startEdit = (creator: Creator) => {
    setEditing(creator);
    setEditForm({ name: creator.name, email: creator.email, password: '' });
    setShowForm(false);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await apiService.createCorporateUser(form);
      setForm(emptyForm);
      setShowForm(false);
      setNotice('Kreator baru berhasil ditambahkan.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kreator');
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { name: editForm.name, email: editForm.email, ...(editForm.password ? { password: editForm.password } : {}) };
      await apiService.updateCorporateUser(editing.id, payload);
      setEditing(null);
      setNotice('Data kreator berhasil diperbarui.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui kreator');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (creator: Creator) => {
    if (!window.confirm(`Hapus akun kreator "${creator.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiService.deleteCorporateUser(creator.id);
      setNotice(`Kreator "${creator.name}" dihapus.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kreator');
    } finally {
      setBusy(false);
    }
  };

  const visibleCreators = useMemo(() => {
    if (!search.trim()) return creators;
    const q = search.toLowerCase();
    return creators.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [creators, search]);

  return (
    <div className="corporate-view-container">
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              BUMD HOLDING • MANAJEMEN SDM KREATOR
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} style={{ color: 'var(--primary)' }} />
            Kreator Perusahaan
          </h2>
          <p className="page-subtitle">
            Kelola akun kreator: daftarkan, perbarui data, atau hapus. Penugasan akses ke workspace diatur pada menu Pengguna Workspace.
          </p>
        </div>
      </div>

      <div className="scheduling-action-bar">
        <button 
          className="btn btn-primary scheduling-add-btn" 
          type="button"
          onClick={() => { setShowForm(prev => !prev); setEditing(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Kreator Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '260px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama atau email kreator..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#818cf8' }} />
            <span style={{ color: '#6366f1' }}>{creators.length} Kreator Aktif</span>
          </div>
        </div>
      </div>

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

      {showForm && (
        <form onSubmit={submit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Akun Kreator Baru</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Akun dibuat tanpa penugasan; atur aksesnya lewat Pengguna Workspace.</p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Lengkap *</label>
              <input className="form-input" required placeholder="cth. Budi Pratama" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Alamat Email *</label>
              <input className="form-input" type="email" required placeholder="budi@bumd.co.id" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kata Sandi (Minimal 8 Karakter) *</label>
              <input className="form-input" type="password" minLength={8} required placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Menyimpan Kreator…' : 'Simpan Akun Kreator'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Batal
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={submitEdit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Perbarui Kreator</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kosongkan kata sandi jika tidak ingin mengubahnya.</p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => setEditing(null)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Lengkap *</label>
              <input className="form-input" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Alamat Email *</label>
              <input className="form-input" type="email" required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kata Sandi Baru <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span></label>
              <input className="form-input" type="password" minLength={8} placeholder="Kosongkan jika tetap" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} autoComplete="new-password" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <span>Daftar Kreator Perusahaan</span>
            </div>
            <p className="corporate-table-subtitle">
              Semua akun kreator milik perusahaan. Penugasan unit kerja diatur melalui menu Pengguna Workspace.
            </p>
          </div>
        </div>

        {visibleCreators.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>{search ? `Tidak ada kreator yang cocok dengan "${search}".` : 'Belum ada kreator terdaftar.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visibleCreators.map(person => (
              <div key={person.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="corporate-avatar-box">
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>{person.name}</span>
                      <span className="corporate-role-pill creator">Kreator</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{person.email}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {person.workspaceIds.length} workspace ditugaskan
                  </span>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => startEdit(person)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void remove(person)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.4)' }}>
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="corporate-table-footer">
          <span>Menampilkan {visibleCreators.length} dari {creators.length} kreator</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            Otentikasi &amp; RBAC Terenkripsi
          </span>
        </div>
      </div>
    </div>
  );
};