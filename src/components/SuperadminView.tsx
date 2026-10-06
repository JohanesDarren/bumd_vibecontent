import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

type Company = { id:string; name:string };
type AdminUser = { id:string; name:string; email:string; role:string; companyId:string|null };
type AdminWorkspace = { id:string; name:string; code:string; companyId:string };

export const SuperadminView:React.FC<{onLogout:()=>void;onOpen:(id:string)=>void}>=({onLogout,onOpen})=>{
  const [companies,setCompanies]=useState<Company[]>([]);
  const [users,setUsers]=useState<AdminUser[]>([]);
  const [workspaces,setWorkspaces]=useState<AdminWorkspace[]>([]);
  const [name,setName]=useState('');
  const [user,setUser]=useState({name:'',email:'',password:'',role:'corporate' as 'corporate'|'superadmin',companyId:''});
  const [workspace,setWorkspace]=useState({companyId:'',name:'',code:'',sector:'',city:''});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const refresh=async()=>{const [c,u,w]=await Promise.all([apiService.adminCompanies(),apiService.adminUsers(),apiService.adminWorkspaces()]);setCompanies(c);setUsers(u);setWorkspaces(w);};
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  const submit=async(event:React.FormEvent,action:()=>Promise<unknown>)=>{event.preventDefault();setError('');setBusy(true);try{await action();await refresh();}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan');}finally{setBusy(false);}};
  return <main className="content-viewport" style={{maxWidth:1150,margin:'0 auto',padding:30}}>
    <div className="page-header-row"><div><h1 className="page-title">Administrasi VibeContent</h1><p className="page-subtitle">Superadmin · perusahaan, akun, dan workspace seluruh aplikasi.</p></div><button className="btn btn-secondary" onClick={onLogout}>Keluar</button></div>
    {error&&<p role="alert" style={{color:'#fb7185'}}>{error}</p>}
    <section className="card-panel" style={{padding:20,marginBottom:18}}><h2>Perusahaan ({companies.length})</h2><ul>{companies.map(c=><li key={c.id}>{c.name}</li>)}</ul>
      <form onSubmit={e=>submit(e,async()=>{await apiService.createCompany(name);setName('');})}><label className="form-group"><span className="form-label">Nama perusahaan</span><input className="form-input" value={name} onChange={e=>setName(e.target.value)} required /></label><button className="btn btn-primary" disabled={busy}>Tambah perusahaan</button></form>
    </section>
    <section className="card-panel" style={{padding:20,marginBottom:18}}><h2>Pengguna ({users.length})</h2><ul>{users.map(u=><li key={u.id}>{u.name} · {u.email} · {u.role}{u.companyId?` · ${companies.find(c=>c.id===u.companyId)?.name||u.companyId}`:''}</li>)}</ul>
      <form onSubmit={e=>submit(e,async()=>{await apiService.createAdminUser(user);setUser({name:'',email:'',password:'',role:'corporate',companyId:''});})}>
        {(['name','email','password'] as const).map(k=><label className="form-group" key={k}><span className="form-label">{{name:'Nama',email:'Email',password:'Kata sandi (min. 8 karakter)'}[k]}</span><input className="form-input" type={k==='password'?'password':k==='email'?'email':'text'} value={user[k]} onChange={e=>setUser({...user,[k]:e.target.value})} minLength={k==='password'?8:undefined} required /></label>)}
        <label className="form-group"><span className="form-label">Peran</span><select className="form-select" value={user.role} onChange={e=>setUser({...user,role:e.target.value as typeof user.role})}><option value="corporate">Korporat</option><option value="superadmin">Superadmin</option></select></label>
        {user.role==='corporate'&&<label className="form-group"><span className="form-label">Perusahaan</span><select className="form-select" value={user.companyId} onChange={e=>setUser({...user,companyId:e.target.value})} required><option value="">Pilih perusahaan</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        <button className="btn btn-primary" disabled={busy}>Tambah pengguna</button>
      </form>
    </section>
    <section className="card-panel" style={{padding:20}}><h2>Workspace ({workspaces.length})</h2><ul>{workspaces.map(w=><li key={w.id}>{w.name} ({w.code}) · {companies.find(c=>c.id===w.companyId)?.name||w.companyId} <button className="btn btn-secondary btn-sm" type="button" onClick={()=>onOpen(w.id)}>Buka</button></li>)}</ul>
      <form onSubmit={e=>submit(e,async()=>{await apiService.createAdminWorkspace(workspace);setWorkspace({companyId:'',name:'',code:'',sector:'',city:''});})}>
        <label className="form-group"><span className="form-label">Perusahaan</span><select className="form-select" value={workspace.companyId} onChange={e=>setWorkspace({...workspace,companyId:e.target.value})} required><option value="">Pilih perusahaan</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {(['name','code','sector','city'] as const).map(k=><label className="form-group" key={k}><span className="form-label">{{name:'Nama workspace',code:'Kode',sector:'Sektor',city:'Kota'}[k]}</span><input className="form-input" value={workspace[k]} onChange={e=>setWorkspace({...workspace,[k]:e.target.value})} required /></label>)}
        <button className="btn btn-primary" disabled={busy}>Tambah workspace</button>
      </form>
    </section>
  </main>;
};
