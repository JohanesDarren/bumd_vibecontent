import React, { useState, useEffect } from 'react';
import { 
  BrandProfile, 
  KnowledgeDocument, 
  ContentFormat, 
  ContentBrief, 
  Workspace,
  User
} from '../types';
import { 
  retrieveKnowledge, 
  generateContentFromBrief 
} from '../services/ragEngine';
import { 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Send,
  Layers,
  FileCheck
} from 'lucide-react';

interface BriefStudioViewProps {
  brandProfile: BrandProfile;
  documents: KnowledgeDocument[];
  activeWorkspace: Workspace;
  activeUser: User;
  onGenerateDraft: (brief: ContentBrief) => void;
}

export const BriefStudioView: React.FC<BriefStudioViewProps> = ({
  brandProfile,
  documents,
  activeWorkspace,
  activeUser,
  onGenerateDraft
}) => {
  const [title, setTitle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [targetAudience, setTargetAudience] = useState('Masyarakat Kota dan Pelanggan BUMD');
  const [format, setFormat] = useState<ContentFormat>('copy_caption');
  const [channel, setChannel] = useState(brandProfile.approvedChannels[0] || 'Instagram Feed & Reels');
  const [tone, setTone] = useState(brandProfile.toneOfVoice[0] || 'Formal Korporat Ramah');
  const [keyMessage, setKeyMessage] = useState('');
  const [selectedCta, setSelectedCta] = useState(brandProfile.officialCTAs[0]?.text || '');
  const [limitations, setLimitations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Live Grounding Preview
  const [matchedDocsCount, setMatchedDocsCount] = useState<number>(0);
  const [matchedDocTitles, setMatchedDocTitles] = useState<string[]>([]);
  const [unsupportedWarning, setUnsupportedWarning] = useState<string[]>([]);

  useEffect(() => {
    if (keyMessage.trim().length > 3 || title.trim().length > 3) {
      const query = `${title} ${keyMessage}`;
      const rag = retrieveKnowledge(query, documents, activeWorkspace.id);
      setMatchedDocsCount(rag.matchedChunks.length);
      const uniqueDocs = Array.from(new Set(rag.matchedChunks.map(c => c.document.title)));
      setMatchedDocTitles(uniqueDocs);
      setUnsupportedWarning(rag.unsupportedClaims);
    } else {
      setMatchedDocsCount(0);
      setMatchedDocTitles([]);
      setUnsupportedWarning([]);
    }
  }, [title, keyMessage, documents, activeWorkspace.id]);

  // Preset Template Loader
  const loadPreset = (type: 'sambungan_baru' | 'tarif_subsidi' | 'unsupported_test') => {
    if (type === 'sambungan_baru') {
      setTitle('Pendaftaran Sambungan Rumah Baru Cicilan 0% 2026');
      setCampaign('Air Bersih Menjangkau Semua');
      setTargetAudience('Masyarakat Kota Metro, Penghuni Rumah Baru & UMKM');
      setFormat('copy_caption');
      setKeyMessage('Perumda Air Minum Tirta Sejahtera membuka pendaftaran sambungan rumah baru biaya Rp 1.250.000 dengan kemudahan cicilan 3x tanpa bunga dan instalasi selesai dalam 3 hari kerja.');
      setLimitations('Persyaratan wajib melampirkan Fotokopi KTP, Bukti PBB, dan rekening listrik.');
      setSelectedCta(brandProfile.officialCTAs[0]?.text || 'Daftar melalui portal resmi pasang.tirtasejahtera.co.id');
    } else if (type === 'tarif_subsidi') {
      setTitle('Sosialisasi Tarif Khusus Rp 0 Pelajar, Lansia dan Disabilitas');
      setCampaign('Konektivitas Inklusif Ramah Publik');
      setTargetAudience('Pelajar SD/SMP/SMA, Warga Senior Lansia, dan Disabilitas');
      setFormat('teks_promosi');
      setKeyMessage('Pengoperasian Koridor 7 bus listrik ramah disabilitas dengan jaminan tarif Rp 0 (gratis) bagi pelajar terdaftar, lansia di atas 60 tahun, dan penyandang disabilitas.');
      setLimitations('Pendaftaran kartu wajib membawa KTP/Kartu Pelajar di loket halte utama.');
      setSelectedCta('Unduh aplikasi TransGo untuk pantauan jadwal bus terintegrasi.');
    } else {
      // Test Unsupported Claim (PRD F-04 Acceptance Criteria: Knowledge base does not contain the answer)
      setTitle('Program Diskon Tiket Liburan Akhir Pekan 50% & Hadiah Undian Mobil');
      setCampaign('Promo Spesial Liburan');
      setTargetAudience('Wisatawan Umum');
      setFormat('copy_caption');
      setKeyMessage('Dapatkan diskon 50% tiket liburan serta kesempatan memenangkan hadiah undian mobil gratis seumur hidup.');
      setLimitations('Tidak ada pembatasan kuota.');
      setSelectedCta('Kunjungi loket wisata terdekat.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !keyMessage.trim()) {
      alert('Judul konten dan pesan utama wajib diisi.');
      return;
    }

    setIsGenerating(true);

    const brief: ContentBrief = {
      id: `brf-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      title,
      campaign,
      targetAudience,
      format,
      channel,
      tone,
      keyMessage,
      cta: selectedCta,
      limitations,
      language: brandProfile.defaultLanguage,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.id
    };

    // Simulate RAG generation latency
    setTimeout(() => {
      setIsGenerating(false);
      onGenerateDraft(brief);
    }, 900);
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Brief Konten & RAG Generasi</h2>
          <p className="page-subtitle">
            Susun panduan konten terstruktur. AI hanya menggunakan fakta dari knowledge base resmi <strong>{activeWorkspace.name}</strong> tanpa pencarian web bebas.
          </p>
        </div>

        {/* Quick Presets for Demo */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset('sambungan_baru')}
            title="Muat preset pasang sambungan air baru"
          >
            ⚡ Contoh: Pasang Baru
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset('tarif_subsidi')}
            title="Muat preset tarif khusus subsidi"
          >
            ⚡ Contoh: Tarif Subsidi
          </button>
          <button 
            type="button" 
            className="btn btn-warning btn-sm"
            onClick={() => loadPreset('unsupported_test')}
            title="Uji skenario PRD: Klaim tanpa dukungan sumber resmi"
          >
            ⚠️ Uji Coba: Klaim Tanpa Sumber (PRD F-04)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '28px', alignItems: 'start' }}>
        {/* Main Brief Form */}
        <form onSubmit={handleSubmit} className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <Sparkles size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Parameter Brief Konten BUMD</h3>
          </div>

          {/* Title & Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Judul Inisiatif / Konten *</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: Edukasi Pasang Baru Sambungan Air 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Nama Kampanye / Program</span>
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: Program Air Bersih Sejahtera"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
            </div>
          </div>

          {/* Format & Target Channel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Format Output Naskah *</span>
              </label>
              <select 
                className="form-select"
                value={format}
                onChange={e => setFormat(e.target.value as ContentFormat)}
              >
                <option value="copy_caption">📱 Copy & Caption Media Sosial (Feed / Carousel)</option>
                <option value="teks_promosi">📰 Teks Promosi & Siaran Pers Resmi</option>
                <option value="naskah_singkat">🎬 Naskah Video Singkat 9:16 (Reels/TikTok/Shorts)</option>
                <option value="brief_visual">🎨 Panduan Brief Visual & Grafis Informasi</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Kanal Distribusi Resmi</span>
              </label>
              <select 
                className="form-select"
                value={channel}
                onChange={e => setChannel(e.target.value)}
              >
                {brandProfile.approvedChannels.map((ch, idx) => (
                  <option key={idx} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience & Tone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Target Audiens</span>
              </label>
              <input 
                type="text" 
                className="form-input"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Tone of Voice (Panduan Merek)</span>
              </label>
              <select 
                className="form-select"
                value={tone}
                onChange={e => setTone(e.target.value)}
              >
                {brandProfile.toneOfVoice.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Message */}
          <div className="form-group">
            <label className="form-label">
              <span>Pesan Utama & Fakta yang Ingin Disampaikan *</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>RAG mencocokkan fakta ini ke dokumen aktif</span>
            </label>
            <textarea 
              className="form-textarea" 
              rows={4}
              placeholder="Tuliskan pokok informasi. Misalnya: tarif sambungan baru Rp 1.250.000 dengan cicilan 3x dan syarat KTP/PBB..."
              value={keyMessage}
              onChange={e => setKeyMessage(e.target.value)}
              required
            />
          </div>

          {/* Call to Action */}
          <div className="form-group">
            <label className="form-label">
              <span>Pilihan Call to Action (CTA) Resmi</span>
            </label>
            <select 
              className="form-select"
              value={selectedCta}
              onChange={e => setSelectedCta(e.target.value)}
              style={{ marginBottom: '8px' }}
            >
              {brandProfile.officialCTAs.map(c => (
                <option key={c.id} value={c.text}>
                  [{c.label}] {c.text}
                </option>
              ))}
              <option value="">-- Kustom CTA Sendiri --</option>
            </select>
            <input 
              type="text"
              className="form-input"
              placeholder="Atau ketik Call to Action khusus..."
              value={selectedCta}
              onChange={e => setSelectedCta(e.target.value)}
            />
          </div>

          {/* Limitations */}
          <div className="form-group">
            <label className="form-label">
              <span>Batasan, Syarat & Peringatan Penting (Opsional)</span>
            </label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Contoh: Hanya berlaku untuk pelanggan daya listrik hingga 900 VA"
              value={limitations}
              onChange={e => setLimitations(e.target.value)}
            />
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isGenerating}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              {isGenerating ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>Memproses RAG & Membuat Naskah...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Jalankan Generasi Berbasis RAG</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Side: Live Brief Summary & RAG Grounding Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live RAG Match Status */}
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <BookOpen size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Radar RAG Knowledge Base</h4>
            </div>

            {matchedDocsCount > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span className="grounding-badge verified">
                    <CheckCircle2 size={12} /> {matchedDocsCount} Bagian Cocok
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    dari {matchedDocTitles.length} dokumen aktif
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {matchedDocTitles.map((t, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '8px 10px', 
                        borderRadius: '8px', 
                        background: 'var(--bg-tertiary)', 
                        fontSize: '0.75rem', 
                        borderLeft: '3px solid var(--accent-emerald)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      📑 {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Ketikkan pesan utama di sebelah kiri untuk melihat dokumen resmi yang relevan secara real-time.
              </div>
            )}

            {/* Unsupported Claims Detection Warning (PRD F-04) */}
            {unsupportedWarning.length > 0 && (
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  <AlertCircle size={14} />
                  <span>Peringatan Grounding: Sumber Belum Cukup</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  Topik berikut tidak didukung oleh dokumen resmi aktif:
                  <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                    {unsupportedWarning.map((w, idx) => (
                      <li key={idx} style={{ color: '#fb7185', fontWeight: 600 }}>{w}</li>
                    ))}
                  </ul>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '6px' }}>
                    * Sistem akan menandai draf sebagai <code>[Perlu Verifikasi]</code> dan menolak klaim palsu.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Live Brief Card Snapshot */}
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileCheck size={18} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Ringkasan Brief Konten</h4>
            </div>

            <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Judul</span>
                <strong>{title || '(Belum diisi)'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Format & Kanal</span>
                <span>{format.replace('_', ' ').toUpperCase()} • {channel}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Nada Bahasa</span>
                <span>{tone}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Audiens</span>
                <span>{targetAudience}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
