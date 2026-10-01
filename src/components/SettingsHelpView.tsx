import React from 'react';
import { BookOpenCheck, CircleHelp, Database, Languages, ShieldCheck } from 'lucide-react';

export const SettingsHelpView: React.FC = () => <div>
  <div className="page-header-row"><div><h2 className="page-title">Pengaturan & Bantuan</h2><p className="page-subtitle">Detail lingkungan aplikasi, bahasa antarmuka, dan batas kemampuan saat ini.</p></div></div>
  <div className="settings-grid">
    <div className="card-panel"><Languages size={22}/><h3>Bahasa antarmuka</h3><p>Bahasa Indonesia formal adalah bawaan. Bahasa konten tambahan dapat dipilih melalui brief.</p><select className="form-select" defaultValue="id"><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></div>
    <div className="card-panel"><Database size={22}/><h3>Penyimpanan saat ini</h3><p>Data disimpan melalui API Node.js di PostgreSQL. Tidak ada data contoh yang dibuat otomatis.</p></div>
    <div className="card-panel"><ShieldCheck size={22}/><h3>Batas grounding</h3><p>Tidak ada pencarian web. Sumber yang menunggu persetujuan dan sumber usang tidak pernah dipakai untuk generasi.</p></div>
    <div className="card-panel"><CircleHelp size={22}/><h3>Alur bantuan</h3><p>Buat brief, periksa RAG Radar, simpan versi, kirim untuk review, lalu ekspor tanpa mengubah status.</p></div>
  </div>
  <div className="card-panel help-boundary"><BookOpenCheck size={21}/><div><h3>Batasan implementasi</h3><p>Autentikasi terpercaya, penyedia AI, unggah file biner, monitoring, dan deployment belum diaktifkan.</p></div></div>
</div>;
