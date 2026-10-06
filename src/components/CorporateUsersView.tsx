import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { Workspace } from '../types';

type Creator = { id:string; name:string; email:string; workspaceIds:string[] };

export const CorporateUsersView:React.FC = () => {
  const [workspaces,setWorkspaces]=useState<Workspace[]>([]);
  const [creators,setCreators]=useState<Creator[]>([]);
  const [form,setForm]=useState({name:'',email:'',password:'',workspaceIds:[] as string[]});
  const [edits,setEdits]=useState<Record<string,string[]>>({});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const refresh=async()=>{const [ws,people]=await Promise.all([apiService.corporateWorkspaces(),apiService.corporateUsers()]);setWorkspaces(ws);setCreators(people);setEdits(Object.fromEntries(people.map(p=>[p.id,p.workspaceIds])));};
  useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
  const toggle=(ids:string[],id:string)=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id];
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!form.workspaceIds.length){setError('Pilih minimal satu workspace.');return;}setBusy(true);setError('');try{await apiService.createCorporateUser(form);setForm({name:'',email:'',password:'',workspaceIds:[]});await refresh();}catch(e){setError(e instanceof Error?e.message:'Gagal membuat kreator');}finally{setBusy(false);}};
  const save=async(id:string)=>{if(!(edits[id]||[]).length){setError('Pilih minimal satu workspace.');return;}setBusy(true);setError('');try{await apiService.assignCorporateUser(id,edits[id]||[]);await refresh();}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan akses');}finally{setBusy(false);}};
  return <div>
    <div className="page-header-row"><div><h2 className="page-title">Kreator Perusahaan</h2><p className="page-subtitle">Buat akun kreator dan tentukan satu atau beberapa workspace di perusahaan Anda.</p></div></div>
    {error&&<p role="alert" style={{color:'#fb7185'}}>{error}</p>}
    <form className="card-panel" style={{padding:20,marginBottom:18}} onSubmit={submit}><h3>Buat kreator</h3>
      {(['name','email','password'] as const).map(key=><label className="form-group" key={key}><span className="form-label">{{name:'Nama',email:'Email',password:'Kata sandi (minimal 8 karakter)'}[key]}</span><input className="form-input" type={key==='password'?'password':key==='email'?'email':'text'} minLength={key==='password'?8:undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required /></label>)}
      <fieldset><legend>Akses workspace</legend>{workspaces.map(ws=><label key={ws.id} style={{display:'block'}}><input type="checkbox" checked={form.workspaceIds.includes(ws.id)} onChange={()=>setForm({...form,workspaceIds:toggle(form.workspaceIds,ws.id)})} /> {ws.name}</label>)}{!workspaces.length&&<p>Buat workspace terlebih dahulu.</p>}</fieldset>
      <button className="btn btn-primary" disabled={busy||!workspaces.length}>Buat kreator</button>
    </form>
    <section className="card-panel" style={{padding:20}}><h3>Kreator ({creators.length})</h3>
      {!creators.length&&<p>Belum ada kreator di perusahaan Anda.</p>}
      {creators.map(person=><div key={person.id} style={{padding:'14px 0',borderTop:'1px solid var(--border-color, #444)'}}><strong>{person.name}</strong> · {person.email}<fieldset><legend>Penempatan workspace</legend>{workspaces.map(ws=><label key={ws.id} style={{display:'block'}}><input type="checkbox" checked={(edits[person.id]||[]).includes(ws.id)} onChange={()=>setEdits({...edits,[person.id]:toggle(edits[person.id]||[],ws.id)})} /> {ws.name}</label>)}</fieldset><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void save(person.id)}>Simpan penempatan</button></div>)}
    </section>
  </div>;
};
