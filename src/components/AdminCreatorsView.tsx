import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService, type AdminUser } from '../services/apiService';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Building2, 
  Layers, 
  Check, 
  Trash2, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  UserPlus, 
  Building 
} from 'lucide-react';

type Company = { id: string; name: string };
type Workspace = { id: string; name: string; code: string; companyId: string };

const emptyForm = { name: '', email: '', password: '', companyId: '', workspaceIds: [] as string[] };

export const AdminCreatorsView: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [form, setForm] = useState(emptyForm);
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
      const [userList, companyList, workspaceList] = await Promise.all([
        apiService.adminUsers(),
        apiService.adminCompanies(),
        apiService.adminWorkspaces(),
      ]);
      setUsers(userList);
      setCompanies(companyList);
      setWorkspaces(workspaceList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar kreator');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
    if (!form.workspaceIds.length) { 
      setError('Pilih minimal satu workspace untuk kreator baru.'); 
      return; 
    }
    const ok = await run(
      () => apiService.createAdminUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'creator',
        companyId: form.companyId,
        workspaceIds: form.workspaceIds,
      }),
      'Kreator baru berhasil dibuat.'
    );
    if (ok) {
      setForm(emptyForm);
      setShowForm(false);
    }
  };

  const toggle = (workspaceId: string) => setForm(prev => ({
    ...prev,
    workspaceIds: prev.workspaceIds.includes(workspaceId)
      ? prev.workspaceIds.filter(id => id !== workspaceId)
      : [...prev.workspaceIds, workspaceId],
  }));

  const place = (user: AdminUser, workspaceId: string, assigned: boolean) => {
    void run(
      () => assigned
        ? apiService.removeAdminMembership(workspaceId, user.id)
        : apiService.assignAdminMembership(user.id, workspaceId),
      assigned ? `${user.name} dikeluarkan dari workspace.` : `${user.name} ditugaskan ke workspace.`
    );
  };

  const removeAccount = (user: AdminUser) => {
    if (!window.confirm(`Hapus akun kreator ${user.name}?`)) return;
    void run(() => apiService.deleteAdminUser(user.id), `Akun kreator ${user.name} dihapus.`);
  };

  const companyOf = (user: AdminUser) => 
    user.companyId || workspaces.find(w => user.workspaceIds.includes(w.id))?.companyId || '';

  const creators = useMemo(() => {
    return users.filter(u => u.role === 'creator');
  }, [users]);

  const filteredCreators = useMemo(() => {
    if (!query.trim()) return creators;
    const q = query.toLowerCase();
    return creators.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [creators, query]);

  const formWorkspaces = workspaces.filter(w => w.companyId === form.companyId);

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              SUPERADMIN • DISTRIBUSI KREATOR BUMD
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserCheck size={28} style={{ color: 'var(--primary)' }} />
            Kreator Perusahaan
          </h2>
          <p className="page-subtitle">
            Kreator dikelompokkan berdasarkan perusahaan induk holding dengan penugasan ke unit kerja operasional.
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
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Kreator Baru'}</span>
        </button>

        <div className="filter-group" style={{ minWidth: '260px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari nama atau email kreator..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#10b981' }} />
            <span style={{ color: '#059669' }}>{creators.length} Kreator Aktif</span>
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

      {/* ── Add Creator Form Panel ── */}
      {showForm && (
        <form onSubmit={submit} className="card-panel" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="corporate-avatar-box">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Registrasi Kreator BUMD Baru
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Kreator ditugaskan secara spesifik pada unit kerja workspace di perusahaan induk yang dipilih.
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
                placeholder="cth. Rama Danuarta"
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
                placeholder="rama@bumd.co.id"
                value={form.email} 
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Kata Sandi (Minimal 8 Karakter) *</label>
              <input 
                required 
                type="password" 
                minLength={8}
                className="form-input"
                placeholder="••••••••"
                value={form.password} 
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} 
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Perusahaan Induk BUMD *</label>
              <select 
                required 
                className="form-select"
                value={form.companyId} 
                onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value, workspaceIds: [] }))}
              >
                <option value="">Pilih Perusahaan</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Workspace Placement Checkboxes */}
          {form.companyId && (
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>
                <span>Penempatan Unit Kerja Workspace *</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pilih minimal satu</span>
              </label>
              {formWorkspaces.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--accent-amber)' }}>
                  Perusahaan ini belum memiliki workspace unit kerja. Silakan buat workspace terlebih dahulu.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formWorkspaces.map(w => {
                    const selected = form.workspaceIds.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggle(w.id)}
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
            <button type="submit" disabled={busy || !form.companyId || !form.workspaceIds.length} className="btn btn-primary">
              {busy ? 'Menyimpan…' : 'Simpan Akun Kreator'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ── Creators Grouped by Company ── */}
      {loading ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
          <span>Memuat data kreator…</span>
        </div>
      ) : creators.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          <UserCheck size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Kreator Terdaftar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {companies.map(company => {
            const companyCreators = filteredCreators.filter(u => companyOf(u) === company.id);
            if (!companyCreators.length) return null;
            const companyWs = workspaces.filter(w => w.companyId === company.id);

            return (
              <div key={company.id} className="corporate-table-card">
                <div className="corporate-table-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="corporate-avatar-box">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="corporate-table-title">{company.name}</div>
                      <p className="corporate-table-subtitle">{companyWs.length} Unit Kerja Workspace</p>
                    </div>
                  </div>
                  <span className="stat-pill" style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)' }}>
                    <span className="stat-dot" style={{ background: '#06b6d4' }} />
                    <span style={{ color: '#06b6d4' }}>{companyCreators.length} Kreator</span>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {companyCreators.map(user => (
                    <div 
                      key={user.id}
                      style={{ 
                        padding: '18px 24px', 
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {user.name}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {user.email}
                            </span>
                          </div>
                        </div>

                        <button 
                          type="button" 
                          disabled={busy}
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeAccount(user)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={12} />
                          <span>Hapus Akun</span>
                        </button>
                      </div>

                      {/* Workspace chips placement */}
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                          Penugasan Unit Kerja:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {companyWs.map(ws => {
                            const isAssigned = user.workspaceIds.includes(ws.id);
                            return (
                              <button
                                key={ws.id}
                                type="button"
                                disabled={busy}
                                onClick={() => place(user, ws.id, isAssigned)}
                                title={isAssigned ? 'Klik untuk melepas penugasan' : 'Klik untuk menugaskan ke workspace ini'}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isAssigned ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                  background: isAssigned ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                                  color: isAssigned ? 'var(--primary)' : 'var(--text-muted)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Layers size={11} />
                                <span>{ws.name}</span>
                                {isAssigned ? <Check size={11} /> : <Plus size={11} style={{ opacity: 0.5 }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
