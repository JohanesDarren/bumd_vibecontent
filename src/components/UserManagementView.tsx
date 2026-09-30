import React from 'react';
import type { User, Workspace } from '../types';
import { ShieldCheck, UserCog, Users } from 'lucide-react';

interface Props { users: User[]; activeWorkspace: Workspace; }
export const UserManagementView: React.FC<Props> = ({ users, activeWorkspace }) => <div>
  <div className="page-header-row"><div><h2 className="page-title">Manajemen Pengguna & Peran</h2><p className="page-subtitle">Keanggotaan lokal untuk <strong>{activeWorkspace.name}</strong>. Provisioning dan SSO masih TBD.</p></div></div>
  <div className="role-summary-grid">{[['Creator','Membuat dan mengedit draft'],['Reviewer','Meninjau dan memberi keputusan'],['Admin','Mengelola knowledge dan merek']].map(([role,text])=><div className="card-panel" key={role}><UserCog size={20}/><strong>{role}</strong><small>{text}</small></div>)}</div>
  <div className="card-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>Pengguna</th><th>Email</th><th>Jabatan</th><th>Peran</th><th>Status akses</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.title}</td><td><span className="status-pill disetujui">{user.role}</span></td><td><span className="member-active"><ShieldCheck size={13}/>Aktif</span></td></tr>)}</tbody></table></div>{users.length===0&&<div className="empty-state"><Users size={36}/><p>Belum ada anggota workspace.</p></div>}</div>
</div>;
