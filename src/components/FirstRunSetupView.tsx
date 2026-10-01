import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SetupInput { organizationName:string; code:string; sector:string; city:string; adminName:string; adminEmail:string }

export const FirstRunSetupView:React.FC<{onSubmit:(input:SetupInput)=>Promise<void>}>=({onSubmit})=>{
  const [form,setForm]=useState<SetupInput>({organizationName:'',code:'',sector:'',city:'',adminName:'',adminEmail:''});
  const [saving,setSaving]=useState(false);
  const update=(key:keyof SetupInput,value:string)=>setForm(current=>({...current,[key]:value}));
  return <main className="login-shell"><section className="login-brand-panel"><Building2 size={36}/><p className="brand-tagline">First-run setup</p><h1>Start with an empty PostgreSQL workspace.</h1><p>No sample organization, user, document, or draft will be created.</p></section><form className="login-card card-panel" onSubmit={async event=>{event.preventDefault();setSaving(true);try{await onSubmit(form);}finally{setSaving(false);}}}><span className="login-kicker">Initial organization</span><h2>Create the first workspace</h2>{Object.entries({organizationName:'Organization name',code:'Organization code',sector:'Sector',city:'City',adminName:'Administrator name',adminEmail:'Administrator email'}).map(([key,label])=><label className="form-group" key={key}><span className="form-label">{label}</span><input className="form-input" type={key==='adminEmail'?'email':'text'} value={form[key as keyof SetupInput]} onChange={event=>update(key as keyof SetupInput,event.target.value)} required/></label>)}<button className="btn btn-primary" disabled={saving}>{saving?'Creating…':'Create workspace'}</button></form></main>;
};
