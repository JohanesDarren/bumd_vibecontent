import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SetupInput { organizationName:string; code:string; sector:string; city:string; adminName:string; adminEmail:string; adminPassword?:string }

export const FirstRunSetupView:React.FC<{onSubmit:(input:SetupInput)=>Promise<void>}>=({onSubmit})=>{
  const [form,setForm]=useState<SetupInput>({organizationName:'',code:'',sector:'',city:'',adminName:'',adminEmail:'',adminPassword:''});
  const [saving,setSaving]=useState(false);
  const update=(key:keyof SetupInput,value:string)=>setForm(current=>({...current,[key]:value}));
  return <main className="login-shell"><section className="login-brand-panel"><Building2 size={36}/><p className="brand-tagline">Corporate Workspace Initialization</p><h1>Initialize Enterprise VibeContent Environment</h1><p>Configure your corporate tenant to begin secure AI content generation.</p></section><form className="login-card card-panel" onSubmit={async event=>{event.preventDefault();setSaving(true);try{await onSubmit(form);}finally{setSaving(false);}}}><span className="login-kicker">Tenant Organization</span><h2>Provision Corporate Workspace</h2>{Object.entries({organizationName:'Organization name',code:'Organization code',sector:'Sector',city:'City',adminName:'Administrator name',adminEmail:'Administrator email',adminPassword:'Administrator password (min 8 characters)'}).map(([key,label])=><label className="form-group" key={key}><span className="form-label">{label}</span><input className="form-input" type={key==='adminEmail'?'email':key==='adminPassword'?'password':'text'} value={form[key as keyof SetupInput]} onChange={event=>update(key as keyof SetupInput,event.target.value)} required minLength={key==='adminPassword'?8:undefined}/></label>)}<button className="btn btn-primary" disabled={saving}>{saving?'Provisioning…':'Provision Workspace'}</button></form></main>;
};
