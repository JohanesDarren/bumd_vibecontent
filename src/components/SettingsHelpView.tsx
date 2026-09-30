import React from 'react';
import { BookOpenCheck, CircleHelp, Database, Languages, ShieldCheck } from 'lucide-react';

export const SettingsHelpView: React.FC = () => <div>
  <div className="page-header-row"><div><h2 className="page-title">Pengaturan & Bantuan</h2><p className="page-subtitle">Informasi lingkungan demo, bahasa antarmuka, dan batas kemampuan MVP.</p></div></div>
  <div className="settings-grid">
    <div className="card-panel"><Languages size={22}/><h3>Bahasa antarmuka</h3><p>Bahasa Indonesia baku menjadi default. Konten tambahan dapat dipilih melalui brief.</p><select className="form-select" defaultValue="id"><option value="id">Bahasa Indonesia</option><option value="en">English (demo)</option></select></div>
    <div className="card-panel"><Database size={22}/><h3>Penyimpanan saat ini</h3><p>Data demo disimpan di localStorage browser. Tidak ada database, API, atau dokumen BUMD nyata.</p></div>
    <div className="card-panel"><ShieldCheck size={22}/><h3>Batas grounding</h3><p>Tidak ada pencarian web. Sumber menunggu persetujuan dan usang tidak digunakan untuk generasi.</p></div>
    <div className="card-panel"><CircleHelp size={22}/><h3>Alur bantuan</h3><p>Buat brief, periksa Radar RAG, simpan versi, kirim review, lalu ekspor tanpa mengubah status.</p></div>
  </div>
  <div className="card-panel help-boundary"><BookOpenCheck size={21}/><div><h3>Batas prototype frontend</h3><p>Autentikasi tepercaya, tenant isolation server-side, provider AI, unggah file nyata, penyimpanan, monitoring, dan deployment tetap menunggu technical design PRD.</p></div></div>
</div>;
