import React, { useState } from 'react';
import type { User, Workspace } from '../types';
import { Building2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  users: User[];
  workspaces: Workspace[];
  onLogin: (userId: string) => void;
}

export const LoginAccessView: React.FC<Props> = ({ users, workspaces, onLogin }) => {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const selected = users.find(user => user.id === userId);
  const workspace = workspaces.find(item => item.id === selected?.workspaceId);

  return <main className="login-shell">
    <section className="login-brand-panel">
      <div className="brand-icon-gem"><Sparkles size={24}/></div>
      <p className="brand-tagline">Workspace Konten BUMD Berbasis Sumber Resmi</p>
      <h1>Konten profesional.<br/>Fakta tetap terkendali.</h1>
      <p>VibeContent membantu Creator, Reviewer, dan Knowledge Owner bekerja dalam satu alur yang dapat ditelusuri.</p>
      <div className="login-trust"><ShieldCheck size={18}/><span>RAG hanya memakai active documents pada workspace pengguna.</span></div>
    </section>
    <section className="login-card card-panel">
      <span className="login-kicker">Akses workspace</span>
      <h2>Masuk ke VibeContent</h2>
      <p>Pilih pengguna yang telah dibuat pada workspace PostgreSQL.</p>
      <label className="form-group"><span className="form-label">Akun pengguna</span><select className="form-select" value={userId} onChange={event=>setUserId(event.target.value)}>{users.map(user=><option key={user.id} value={user.id}>{user.name} — {user.role.toUpperCase()}</option>)}</select></label>
      <div className="login-workspace"><Building2 size={18}/><div><small>Workspace yang diizinkan</small><strong>{workspace?.name || 'Tidak tersedia'}</strong></div></div>
      <button className="btn btn-primary" disabled={!selected} onClick={()=>onLogin(userId)}><LockKeyhole size={17}/>Masuk ke workspace</button>
      <small className="login-note">Autentikasi produksi belum aktif. Data aplikasi tersimpan di PostgreSQL.</small>
    </section>
  </main>;
};
