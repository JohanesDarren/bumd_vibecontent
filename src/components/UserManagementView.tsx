import React, { useState, useMemo } from 'react';
import type { User, UserRole, Workspace } from '../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Briefcase, 
  Building2 
} from 'lucide-react';

type Props = {
  users: User[];
  activeWorkspace: Workspace;
  onCreate: (input: { name: string; email: string; role: UserRole; title: string; department: string; password?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export const UserManagementView: React.FC<Props> = ({ users, activeWorkspace, onCreate, onDelete }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', title: '', department: '' });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      u.title?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); 
    setError(''); 
    setNotice('');
    setBusy(true);
    try {
      await onCreate({ ...form, role: 'creator' });
      setForm({ name: '', email: '', password: '', title: '', department: '' });
      setShowForm(false);
      setNotice(`Pengguna baru berhasil ditambahkan ke workspace ${activeWorkspace.name}.`);
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Gagal membuat pengguna'); 
    } finally { 
      setBusy(false); 
    }
  };

  const remove = async (user: User) => {
    if (!window.confirm(`Hapus akses ${user.name} dari workspace ${activeWorkspace.name}?`)) return;
    setError(''); 
    setNotice('');
    setBusy(true);
    try { 
      await onDelete(user.id); 
      setNotice(`Akses untuk ${user.name} berhasil dihapus.`);
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Gagal menghapus akses'); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              {activeWorkspace.code} • MANAJEMEN PENGGUNA WORKSPACE
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} style={{ color: 'var(--primary)' }} />
            Pengguna &amp; Hak Akses
          </h2>
          <p className="page-subtitle">
            Tata kelola keanggotaan staf, peran, dan departemen operasional untuk workspace <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        <button 
          className="btn btn-primary scheduling-add-btn" 
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Pengguna Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '260px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama, email, jabatan..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#38bdf8' }} />
            <span style={{ color: '#0284c7' }}>{users.length} Staf Terdaftar</span>
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

      {/* ── Add User Form ── */}
      {showForm && (
        <form onSubmit={submit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Anggota Workspace</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pengguna baru akan diberikan hak akses sebagai Kreator pada {activeWorkspace.name}.</p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Lengkap *</label>
              <input 
                className="form-input" 
                required 
                placeholder="cth. Dian Sastro"
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Alamat Email *</label>
              <input 
                className="form-input" 
                type="email" 
                required 
                placeholder="dian@bumd.co.id"
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kata Sandi Akun Baru</label>
              <input 
                className="form-input" 
                type="password" 
                minLength={8} 
                placeholder="Minimal 8 karakter"
                value={form.password} 
                onChange={e => setForm({ ...form, password: e.target.value })} 
                autoComplete="new-password" 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Jabatan / Posisi</label>
              <input 
                className="form-input" 
                placeholder="cth. Content Strategist"
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Departemen</label>
              <input 
                className="form-input" 
                placeholder="cth. Humas &amp; Komunikasi Publik"
                value={form.department} 
                onChange={e => setForm({ ...form, department: e.target.value })} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Menyimpan Pengguna…' : 'Simpan Pengguna'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ── Users Table Card ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <span>Daftar Pengguna Workspace</span>
            </div>
            <p className="corporate-table-subtitle">
              Staf yang memiliki kredensial aktif untuk mengakses workspace {activeWorkspace.name}.
            </p>
          </div>
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>Belum ada pengguna terdaftar pada workspace ini.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada pengguna yang cocok dengan pencarian "{search}".</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Nama Staf &amp; Jabatan</th>
                  <th>Email</th>
                  <th>Departemen</th>
                  <th>Peran Sistem</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="corporate-avatar-box">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                            {u.name}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {u.title || 'Staf BUMD'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {u.department || 'Operasional'}
                      </span>
                    </td>
                    <td>
                      <span className={`corporate-role-pill ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        type="button" 
                        disabled={busy || u.role !== 'creator'} 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => void remove(u)}
                        title={u.role !== 'creator' ? 'Akun korporat/superadmin tidak dapat dihapus dari workspace' : 'Hapus akses'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={13} />
                        <span>Hapus Akses</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="corporate-table-footer">
          <span>Menampilkan {filtered.length} dari {users.length} pengguna</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            Workspace ID: {activeWorkspace.id}
          </span>
        </div>
      </div>
    </div>
  );
};
