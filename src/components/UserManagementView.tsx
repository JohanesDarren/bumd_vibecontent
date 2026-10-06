import React, { useState } from 'react';
import { User, UserRole, Workspace } from '../types';
import { UserPlus, ShieldCheck, Trash2, Users } from 'lucide-react';

interface Props {
  users: User[];
  activeWorkspace: Workspace;
  onCreate: (input: { name: string; email: string; role: UserRole; title: string; department: string; password?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const UserManagementView: React.FC<Props> = ({ users, activeWorkspace, onCreate, onDelete }) => {
  const [form, setForm] = useState({ name: '', email: '', role: 'creator' as UserRole, title: '', department: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onCreate({ ...form, password: form.password.trim() || undefined });
      setForm({ name: '', email: '', role: 'creator', title: '', department: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan pengguna');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Pengguna & Peran</h2>
          <p className="page-subtitle">
            Keanggotaan workspace untuk <strong>{activeWorkspace.name}</strong>. Akun baru dapat langsung masuk{form.password ? '' : ' dengan kata sandi sementara (ditampilkan setelah pembuatan)'}.
          </p>
        </div>
      </div>

      <form className="card-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }} onSubmit={submit}>
        <input className="form-input" placeholder="Nama lengkap" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="form-input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input className="form-input" placeholder="Jabatan (opsional)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input className="form-input" placeholder="Departemen (opsional)" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
        <input
          className="form-input"
          type="text"
          placeholder="Kata sandi (opsional — dibuat otomatis jika kosong)"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          minLength={form.password ? 8 : undefined}
        />
        <span className="form-label">Peran: Kreator</span>
        {error && (
          <div style={{ gridColumn: '1 / -1', padding: '10px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', color: '#fb7185', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" disabled={busy}>
            <UserPlus size={16} />
            {busy ? 'Menambahkan…' : 'Tambah Pengguna'}
          </button>
        </div>
      </form>

      <div className="card-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Pengguna</th><th>Email</th><th>Jabatan</th><th>Peran</th><th>Akses</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td>{user.title}</td>
                  <td>{user.role}</td>
                  <td><span className="member-active"><ShieldCheck size={13} />Aktif</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(user.id)} disabled={users.length === 1} title="Keluarkan dari workspace">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="empty-state">
            <Users size={36} />
            <p>Belum ada anggota workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
};
