import { useEffect, useRef, useState, type FormEvent } from 'react';
// ponytail: reset native file input after success so the same file can be selected again.
import { UploadCloud, Trash2, Check } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { KnowledgeDocument, Workspace, User } from '../types';

type KmsDocument = { id:string; workspaceIds:string[]; title:string; filename:string; indexed:boolean };
type Props = { documents:KnowledgeDocument[]; workspaces:Workspace[]; activeWorkspace:Workspace; activeUser:User; onNotify:(message:string)=>void; onReload:()=>Promise<void> };

export function KnowledgeBaseView({activeWorkspace,workspaces,onNotify}:Props) {
  const [docs,setDocs]=useState<KmsDocument[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const [title,setTitle]=useState('');
  const [workspaceIds,setWorkspaceIds]=useState<string[]>([activeWorkspace.id]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{apiService.listKmsDocuments().then(setDocs).catch(()=>setError('Daftar dokumen KMS gagal dimuat'));},[activeWorkspace.id]);
  async function refresh(){try{setDocs(await apiService.listKmsDocuments());}catch{setError('Dokumen tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman untuk melihatnya.');}}
  async function upload(event:FormEvent) {
    event.preventDefault();
    if(!file||!file.size||file.size>50*1024*1024||!/\.(md|pdf|docx)$/i.test(file.name)) return setError('Pilih MD, PDF, atau DOCX valid (maksimum 50 MB)');
    if(!workspaceIds.length)return setError('Pilih minimal satu workspace');
    setBusy(true);setError('');
    try {
      await apiService.uploadKmsDocument(file,title,workspaceIds);
      setFile(null);setTitle('');if(fileInput.current)fileInput.current.value='';
      onNotify('File diterima KMS. Pengindeksan belum terkonfirmasi.');
      await refresh();
    } catch(e){setError(e instanceof Error?e.message:'Upload gagal');}
    finally{setBusy(false);}
  }
  async function remove(doc:KmsDocument){
    if(!confirm(`Hapus "${doc.title}" dari KMS bersama?`))return;
    setBusy(true);setError('');
    try{await apiService.deleteKmsDocument(doc.id);setDocs(current=>current.filter(x=>x.id!==doc.id));onNotify('Dokumen KMS dihapus');}
    catch(e){setError(e instanceof Error?e.message:'Penghapusan gagal');}
    finally{setBusy(false);}
  }
  return <section className="card-panel" style={{padding:24}}>
    <h2>Knowledge Base Bersama</h2>
    <p>File otomatis masuk satu project KMS. Aplikasi membatasi penggunaannya ke workspace terpilih.</p>
    <form onSubmit={upload} style={{display:'grid',gap:12,marginTop:16}}>
      <label>Judul dokumen <input className="form-input" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
      <fieldset className="kms-workspaces"><legend>Digunakan di workspace</legend>
        <p className="kms-help">Pilih workspace yang boleh menggunakan dokumen ini.</p>
        <div className="kms-workspace-grid">{workspaces.map(workspace=><button key={workspace.id} type="button" className="kms-workspace-option" aria-pressed={workspaceIds.includes(workspace.id)} disabled={busy} onClick={()=>setWorkspaceIds(current=>current.includes(workspace.id)?current.filter(id=>id!==workspace.id):[...current,workspace.id])}>
                  <span className="kms-workspace-check" aria-hidden="true"><Check size={14}/></span><span>{workspace.name}</span>
                </button>)}</div>
      </fieldset>
      <div className="kms-file-field"><label htmlFor="kms-file">Dokumen</label>
        <p id="kms-file-help" className="kms-help">MD, PDF, atau DOCX · maksimal 50 MB</p>
        <input id="kms-file" className="kms-file-input" ref={fileInput} type="file" accept=".md,.pdf,.docx" required aria-describedby="kms-file-help" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}} disabled={busy}/>
        {file&&<p className="kms-file-selected" role="status">Terpilih: {file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
      </div>
      <button className="btn btn-primary" disabled={busy||!file||!workspaceIds.length}><UploadCloud size={16}/>{busy?' Mengunggah...':' Unggah ke KMS'}</button>
    </form>
    {error&&<p role="alert" style={{color:'var(--danger-color,red)'}}>{error}</p>}
    <h3 style={{marginTop:20}}>Dokumen perusahaan ini</h3>
    {docs.map(doc=><div key={doc.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}>
      <span>{doc.title} ({doc.filename}) · {doc.workspaceIds.map(id=>workspaces.find(w=>w.id===id)?.name||id).join(', ')} · {doc.indexed?'Terindeks':'Indeks belum terkonfirmasi'}</span>
      <button className="btn btn-secondary btn-sm" disabled={busy} aria-label={`Hapus ${doc.title}`} onClick={()=>remove(doc)}><Trash2 size={16}/></button>
    </div>)}
  </section>;
}
