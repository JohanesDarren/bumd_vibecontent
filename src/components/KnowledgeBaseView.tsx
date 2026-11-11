import { useEffect, useRef, useState, type FormEvent } from 'react';
// ponytail: reset native file input after success so the same file can be selected again.
import { UploadCloud, Trash2, Check, BookOpen, FileText, Image as ImageIcon, Video, FolderOpen } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Field } from './ui/FormControls';
import { apiService } from '../services/apiService';
import { imageFrame, videoFrame } from '../services/videoFrame';
import type { KnowledgeDocument, Workspace, User } from '../types';

type KmsDocument = { id:string; workspaceIds:string[]; title:string; filename:string; indexed:boolean; mediaType:'document'|'photo'|'video' };
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
    if(!file||!file.size||file.size>50*1024*1024||!/\.(md|pdf|docx|jpe?g|png|webp|mp4)$/i.test(file.name)) return setError('Pilih MD, PDF, DOCX, JPG, PNG, WebP, atau MP4 (maksimum 50 MB)');
    if(/\.(jpe?g|png|webp)$/i.test(file.name)&&file.size>5*1024*1024)return setError('Foto maksimal 5 MB agar bisa dianalisis sebagai referensi gaya');
    if(!workspaceIds.length)return setError('Pilih minimal satu workspace');
    setBusy(true);setError('');
    try {
      await apiService.uploadKmsDocument(file,title,workspaceIds,/\.mp4$/i.test(file.name)?await videoFrame(file):/\.(jpe?g|png|webp)$/i.test(file.name)?await imageFrame(file):undefined);
    // ponytail: one still/frame per media item; multi-frame analysis can be added when videos need temporal context.
      setFile(null);setTitle('');if(fileInput.current)fileInput.current.value='';
      onNotify(/\.(mp4|jpe?g|png|webp)$/i.test(file.name)?'Media tersimpan di KMS; frame referensi siap digunakan di Studio Visual.':'File diterima KMS. Pengindeksan belum terkonfirmasi.');
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
  const mediaIcon=(doc:KmsDocument)=>doc.mediaType==='video'?Video:doc.mediaType==='photo'?ImageIcon:FileText;
  return <div>
    <PageHeader
      eyebrow="Perusahaan • Knowledge Base"
      icon={BookOpen}
      title="Knowledge Base Bersama"
      subtitle="File otomatis masuk satu project KMS. Aplikasi membatasi penggunaannya ke workspace terpilih."
    />
    <div className="kms-layout">
      <section className="card-panel">
        <div className="settings-card-head"><UploadCloud size={20}/><h3>Unggah Dokumen</h3></div>
        <form onSubmit={upload} className="kms-form">
          <Field label="Judul dokumen" required htmlFor="kms-title">
            <input id="kms-title" className="form-input" required aria-required="true" maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy} placeholder="cth.: SK Direksi No. 55/2026 Tarif Air"/>
          </Field>
          <fieldset className="kms-workspaces"><legend className="ui-field-label">Digunakan di workspace</legend>
            <p className="kms-help">Pilih workspace yang boleh menggunakan dokumen ini.</p>
            <div className="kms-workspace-grid">{workspaces.map(workspace=><button key={workspace.id} type="button" className="kms-workspace-option" aria-pressed={workspaceIds.includes(workspace.id)} disabled={busy} onClick={()=>setWorkspaceIds(current=>current.includes(workspace.id)?current.filter(id=>id!==workspace.id):[...current,workspace.id])}>
              <span className="kms-workspace-check" aria-hidden="true"><Check size={14}/></span><span>{workspace.name}</span>
            </button>)}</div>
          </fieldset>
          <div className="kms-file-field">
            <span className="ui-field-label">Dokumen atau referensi visual</span>
            <p id="kms-file-help" className="kms-help">MD, PDF, DOCX, atau MP4 maksimal 50 MB; JPG, PNG, WebP maksimal 5 MB. Video menggunakan satu frame awal sebagai referensi gaya.</p>
            <input id="kms-file" className="kms-file-input" ref={fileInput} type="file" accept=".md,.pdf,.docx,.jpg,.jpeg,.png,.webp,.mp4" required aria-describedby="kms-file-help" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}} disabled={busy}/>
            {file&&<p className="kms-file-selected" role="status">Terpilih: {file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
          </div>
          {error&&<p role="alert" className="ui-field-error">{error}</p>}
          <button className="btn btn-primary" disabled={busy||!file||!workspaceIds.length}><UploadCloud size={16}/>{busy?' Mengunggah...':' Unggah ke KMS'}</button>
        </form>
      </section>
      <section className="card-panel">
        <div className="settings-card-head"><FolderOpen size={20}/><h3>Dokumen Perusahaan ({docs.length})</h3></div>
        {docs.length===0?<div className="kms-empty">
          <BookOpen size={28}/>
          <strong>Belum ada dokumen</strong>
          <span>Unggah SK, SOP, atau referensi visual agar generasi konten punya sumber resmi.</span>
        </div>:<ul className="kms-doc-list">{docs.map(doc=>{const Icon=mediaIcon(doc);return <li key={doc.id} className="kms-doc-row">
          <span className="kms-doc-icon"><Icon size={16}/></span>
          <div className="kms-doc-meta">
            <strong title={doc.title}>{doc.title}</strong>
            <span>{doc.filename} · {doc.workspaceIds.map(id=>workspaces.find(w=>w.id===id)?.name||id).join(', ')}</span>
          </div>
          <span className={`status-pill ${doc.mediaType!=='document'||doc.indexed?'disetujui':'draft'}`}>{doc.mediaType==='document'?(doc.indexed?'Terindeks':'Indeks belum terkonfirmasi'):`Referensi ${doc.mediaType==='video'?'video':'foto'}`}</span>
          <button className="btn btn-secondary btn-sm" disabled={busy} aria-label={`Hapus ${doc.title}`} onClick={()=>remove(doc)}><Trash2 size={16}/></button>
        </li>;})}</ul>}
      </section>
    </div>
  </div>;
}
