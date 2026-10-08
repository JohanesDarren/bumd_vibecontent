import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService, type AdminUser } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  Building2, 
  Layers, 
  ShieldCheck, 
  Key 
} from 'lucide-react';

type Role = 'creator' | 'corporate' | 'superadmin';
type Company = { id: string; name: string };
type Workspace = { id: string; name: string; code: string; companyId: string };

const emptyForm = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'corporate' as Role,
  companyId: '',
  workspaceIds: [] as string[],
};

export const AdminAccountsView: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userList, companyList, workspaceList] = await Promise.all([
        apiService.adminUsers(),
        apiService.adminCompanies(),
        apiService.adminWorkspaces(),
      ]);
      setUsers(userList);
      setCompanies(companyList);
      setWorkspaces(workspaceList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeSignal(load);

  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || '—';
  const workspaceName = (id: string) => workspaces.find(w => w.id === id)?.name || id;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); 
    setError(''); 
    setNotice('');
    try {
      if (form.id) {
        await apiService.updateAdminUser(form.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          companyId: form.role === 'superadmin' ? null : form.companyId,
          password: form.password ? form.password : undefined,
        });
        setNotice('Akun berhasil diperbarui.');
      } else {
        await apiService.createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          companyId: form.role === 'superadmin' ? undefined : form.companyId,
          workspaceIds: form.role === 'creator' ? form.workspaceIds : undefined,
        });
        setNotice('Akun baru berhasil dibuat.');
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan akun');
    } finally {
      setBusy(false);
    }
  };

  const edit = (user: AdminUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: (user.role as Role) || 'corporate',
      companyId: user.companyId || '',
      workspaceIds: user.workspaceIds || [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (user: AdminUser) => {
    if (!window.confirm(`Hapus akun pengguna ${user.name}?`)) return;
    setBusy(true); 
    setError(''); 
    setNotice('');
    try {
      await apiService.deleteAdminUser(user.id);
      setNotice(`Akun ${user.name} dihapus.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus akun');
    } finally {
      setBusy(false);
    }
  };

  const toggleWorkspace = (id: string) => setForm(prev => ({
    ...prev,
    workspaceIds: prev.workspaceIds.includes(id)
      ? prev.workspaceIds.filter(item => item !== id)
      : [...prev.workspaceIds, id],
  }));

  const companyWorkspaces = workspaces.filter(w => w.companyId === form.companyId);

  const visible = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || [user.name, user.email, user.role, companyName(user.companyId)].some(v => v?.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }, [users, roleFilter, query, companies]);

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              SUPERADMIN • HAK AKSES DAN PERAN
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} style={{ color: 'var(--primary)' }} />
            Pengguna &amp; Peran Sistem
          </h2>
          <p className="page-subtitle">
            Kelola akun superadmin, admin korporat BUMD, dan kreator beserta hak akses entitas holding.
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
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Akun Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '220px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama, email, perusahaan..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="scheduling-filter-select"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as 'all' | Role)}
          >
            <option value="all">Semua Peran</option>
            <option value="superadmin">Superadmin</option>
            <option value="corporate">Admin Korporat</option>
            <option value="creator">Kreator</option>
          </select>
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#818cf8' }} />
            <span style={{ color: '#6366f1' }}>{users.length} Akun</span>
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
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {form.id ? `Ubah Akun: ${form.name}` : 'Buat Akun Pengguna Baru'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Tentukan peran sistem, kata sandi, dan entitas holding BUMD yang terhubung.
                </p>
              </div>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Nama Lengkap *</label>
              <input 
                required 
                className="form-input"
                placeholder="cth. Anita Wijaya"
                value={form.name} 
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Alamat Email *</label>
              <input 
                required 
                type="email"
                className="form-input"
                placeholder="anita@bumd.co.id"
                value={form.email} 
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>
                <span>Kata Sandi {form.id ? '(Opsional)' : '*'}</span>
              </label>
              <input 
                type="password" 
                minLength={form.id ? 0 : 8}
                required={!form.id}
                placeholder={form.id ? 'Biarkan kosong jika tidak diubah' : 'Minimal 8 karakter'}
                className="form-input"
                value={form.password} 
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} 
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Peran Sistem *</label>
              <select 
                className="form-select"
                value={form.role} 
                onChange={e => setForm(prev => ({ ...prev, role: e.target.value as Role }))}
              >
                <option value="corporate">Admin Korporat (Pengawas Holding)</option>
                <option value="creator">Kreator (Produksi Konten)</option>
                <option value="superadmin">Superadmin (Akses Penuh Sistem)</option>
              </select>
            </div>

            {form.role !== 'superadmin' && (
              <div>
                <label className="form-label" style={{ marginBottom: '6px' }}>Perusahaan Induk BUMD *</label>
                <select 
                  required 
                  className="form-select"
                  value={form.companyId} 
                  onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value, workspaceIds: [] }))}
                >
                  <option value="">Pilih Perusahaan Induk</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* If creator, workspace selection */}
          {form.role === 'creator' && form.companyId && (
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>
                <span>Penugasan Workspace Unit Kerja</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pilih unit kerja untuk kreator ini</span>
              </label>
              {companyWorkspaces.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--accent-amber)' }}>
                  Perusahaan ini belum memiliki workspace terdaftar.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {companyWorkspaces.map(w => {
                    const selected = form.workspaceIds.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWorkspace(w.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: selected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                          background: selected ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                          color: selected ? 'var(--primary)' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Layers size={13} />
                        <span>{w.name} ({w.code})</span>
                        {selected && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Menyimpan…' : form.id ? 'Simpan Perubahan' : 'Buat Akun Pengguna'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
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
              <span>Daftar Seluruh Akun Pengguna</span>
            </div>
            <p className="corporate-table-subtitle">Akun terdaftar dengan hak akses di tingkat platform atau entitas perusahaan.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
            <span>Memuat data pengguna…</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Pengguna Terdaftar</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada pengguna yang cocok dengan filter atau pencarian Anda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Nama &amp; Kredensial</th>
                  <th>Peran Sistem</th>
                  <th>Perusahaan Induk</th>
                  <th>Unit Kerja Ditugaskan</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(u => (
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
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`corporate-role-pill ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {companyName(u.companyId)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {u.role === 'superadmin' ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Akses Global (Semua Workspace)</span>
                        ) : u.role === 'corporate' ? (
                          <span style={{ color: 'var(--accent-cyan)' }}>Semua Workspace Perusahaan</span>
                        ) : u.workspaceIds?.length ? (
                          u.workspaceIds.map(id => workspaceName(id)).join(', ')
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Belum ditempatkan</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => edit(u)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 size={12} />
                          <span>Ubah</span>
                        </button>
                        <button 
                          type="button" 
                          disabled={busy}
                          className="btn btn-secondary btn-sm"
                          onClick={() => void remove(u)}
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
          <span>Menampilkan {visible.length} dari {users.length} akun pengguna</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            RBAC &amp; Tenant Authentication
          </span>
        </div>
      </div>
    </div>
  );
};
