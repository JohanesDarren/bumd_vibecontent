import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SetupInput { organizationName:string; code:string; sector:string; city:string; adminName:string; adminEmail:string; adminPassword?:string }

export const FirstRunSetupView:React.FC<{onSubmit:(input:SetupInput)=>Promise<void>}>=({onSubmit})=>{
  const [form,setForm]=useState<SetupInput>({organizationName:'',code:'',sector:'',city:'',adminName:'',adminEmail:'',adminPassword:''});
  const [saving,setSaving]=useState(false);
  const update=(key:keyof SetupInput,value:string)=>setForm(current=>({...current,[key]:value}));
  return <main className="login-shell"><section className="login-brand-panel"><Building2 size={36}/><p className="brand-tagline">Inisialisasi Workspace Korporat</p><h1>Siapkan Lingkungan VibeContent Korporat</h1><p>Konfigurasikan tenant korporat Anda untuk memulai generasi konten AI yang aman.</p></section><form className="login-card card-panel" onSubmit={async event=>{event.preventDefault();setSaving(true);try{await onSubmit(form);}finally{setSaving(false);}}}><span className="login-kicker">Organisasi Tenant</span><h2>Siapkan Workspace Korporat</h2>{Object.entries({organizationName:'Nama organisasi',code:'Kode organisasi',sector:'Sektor',city:'Kota',adminName:'Nama administrator',adminEmail:'Email administrator',adminPassword:'Kata sandi administrator (min. 8 karakter)'}).map(([key,label])=><label className="form-group" key={key}><span className="form-label">{label}</span><input className="form-input" type={key==='adminEmail'?'email':key==='adminPassword'?'password':'text'} value={form[key as keyof SetupInput]} onChange={event=>update(key as keyof SetupInput,event.target.value)} required minLength={key==='adminPassword'?8:undefined}/></label>)}<button className="btn btn-primary" disabled={saving}>{saving?'Menyiapkan…':'Siapkan Workspace'}</button></form></main>;
};
