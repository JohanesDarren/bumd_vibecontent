import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { Workspace } from '../types';

export const CorporateManagementView: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [form, setForm] = useState({ name: '', code: '', sector: '', city: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiService.corporateWorkspaces().then(setWorkspaces).catch(e => setError(e.message)); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await apiService.createCorporateWorkspace(form);
      setWorkspaces(await apiService.corporateWorkspaces());
      setForm({ name: '', code: '', sector: '', city: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal membuat workspace'); }
    finally { setBusy(false); }
  };
  return <div>
    <div className="page-header-row"><div><h2 className="page-title">Workspace Korporat</h2><p className="page-subtitle">Kelola workspace di perusahaan Anda. Penempatan kreator dikelola lewat Kreator Perusahaan.</p></div></div>
    <section className="card-panel" style={{ padding: 20, marginBottom: 18 }}><h3>Workspace perusahaan</h3>
      {workspaces.length === 0 && <p>Belum ada workspace.</p>}
      {workspaces.map(ws => <div key={ws.id} style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>{ws.name} ({ws.code})</span><button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(ws.id)}>Buka</button></div>)}
    </section>
    <form className="card-panel" style={{ padding: 20 }} onSubmit={submit}><h3>Buat workspace</h3>
      {(['name', 'code', 'sector', 'city'] as const).map(key => <label className="form-group" key={key}><span className="form-label">{{name:'Nama workspace',code:'Kode unik',sector:'Sektor',city:'Kota'}[key]}</span><input className="form-input" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required /></label>)}
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Buat workspace'}</button>
    </form>
  </div>;
};
