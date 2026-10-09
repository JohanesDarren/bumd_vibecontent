import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  CircleHelp,
  Database,
  Languages,
  ShieldCheck,
  SlidersHorizontal,
  Lock,
  Activity,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Gauge,
  FileText,
  Users,
  Wrench,
  Sparkles,
  Search,
  Layers,
  EyeOff
} from 'lucide-react';
import { ClipLoader } from 'react-spinners';
import type { Workspace } from '../types';
import { apiService, RagStatus } from '../services/apiService';
import {
  AppSettings,
  GroundingSettings,
  DEFAULT_SETTINGS,
  GROUNDING_LEVEL_LABELS,
  groundingForLevel,
  normalizeSettings,
  toRagOptions,
  outboundDataSummary
} from '../services/appSettings';

interface SettingsHelpViewProps {
  activeWorkspace: Workspace;
  /** Company-wide settings loaded from the server. */
  settings: AppSettings;
  /** Persist the settings for the active workspace. */
  onSaveSettings: (settings: AppSettings) => void | Promise<void>;
  onNotify?: (message: string) => void;
}

type TabKey = 'pengaturan' | 'grounding' | 'privasi' | 'alur';
type HelpKey = 'alur' | 'peran' | 'masalah' | 'faq';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'pengaturan', label: 'Pengaturan Umum', icon: <SlidersHorizontal size={15} /> },
  { key: 'grounding', label: 'Batas Grounding', icon: <Gauge size={15} /> },
  { key: 'privasi', label: 'Privasi & Data', icon: <ShieldCheck size={15} /> },
  { key: 'alur', label: 'Alur Bantuan', icon: <CircleHelp size={15} /> }
];

/* ── Small UI primitives ─────────────────────────────────────────────── */

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={`vc-switch ${checked ? 'on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="vc-switch-knob" />
  </button>
);

const SettingRow: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="settings-row">
    <div className="settings-row-text">
      <strong>{title}</strong>
      <span>{desc}</span>
    </div>
    <div className="settings-row-control">{children}</div>
  </div>
);

/* ── Static help content ─────────────────────────────────────────────── */

const WORKFLOW_STEPS: Array<{ title: string; detail: string; tabs: string[] }> = [
  { title: '1. Siapkan dokumen resmi', detail: 'Unggah/atur dokumen resmi di Pustaka & Ekspor. Hanya dokumen berstatus "aktif" yang boleh dipakai untuk generasi. Dokumen yang menunggu persetujuan atau usang otomatis tidak dipakai.', tabs: ['Pustaka & Ekspor'] },
  { title: '2. Atur panduan merek', detail: 'Isi terminologi wajib, kata terlarang, CTA resmi, kanal yang disetujui, dan disclaimer di Profil & Merek. Panduan ini otomatis dipakai saat generasi.', tabs: ['Profil & Merek'] },
  { title: '3. Atur batas grounding', detail: 'Buka tab Batas Grounding di halaman ini. Atur skala keketatan, ambang relevansi, dan jumlah potongan pengetahuan (top-k). Perubahan langsung berlaku pada generasi berikutnya.', tabs: ['Pengaturan & Bantuan'] },
  { title: '4. Susun brief', detail: 'Di Brief & Generasi Konten, isi judul, pesan kunci, target audiens, format, kanal, dan CTA. Semakin spesifik pesan kunci, semakin akurat pencocokan RAG.', tabs: ['Brief & Generasi Konten'] },
  { title: '5. Jalankan generasi berbasis RAG', detail: 'Tekan "Jalankan Generasi Berbasis RAG". Sistem memanggil knowledge base, mengambil potongan pengetahuan sesuai skala grounding, lalu menyusun draf disertai sitasi sumber.', tabs: ['Brief & Generasi Konten'] },
  { title: '6. Edit & simpan versi', detail: 'Perbaiki draf langsung di Editor Draf AI, lalu simpan versi baru. Setiap versi tercatat di riwayat agar dapat diaudit.', tabs: ['Editor & Versi'] },
  { title: '7. Review & persetujuan', detail: 'Periksa skor kualitas (kepatuhan brief, nada, grounding faktual, CTA), lalu setujui brief bila sudah layak. Persetujuan membuka Studio Visual.', tabs: ['Editor & Versi'] },
  { title: '8. Studio visual', detail: 'Buat aset visual dari brief yang telah disetujui: headline, subheadline, badge, CTA, rasio, dan template gaya perusahaan.', tabs: ['Studio Visual'] },
  { title: '9. Penjadwalan konten', detail: 'Jadwalkan konten yang sudah siap ke kalender distribusi dan hubungkan ke draf di Pustaka.', tabs: ['Penjadwalan Konten'] },
  { title: '10. Ekspor & arsip', detail: 'Ekspor draf final tanpa mengubah statusnya, atau pindahkan draf lama ke arsip untuk menjaga pustaka tetap bersih.', tabs: ['Pustaka & Ekspor'] }
];

const ROLE_NOTES = [
  { role: 'Kreator', detail: 'Menyusun brief, menjalankan generasi RAG, mengedit draf, membuat visual, menjadwalkan konten, dan mengekspor.' },
  { role: 'Admin', detail: 'Semua kemampuan kreator ditambah pengelolaan pengguna & peran, profil merek, jejak audit, dan pengaturan sistem.' }
];

const TROUBLESHOOTING = [
  { q: 'Generasi gagal atau lama sekali', a: 'Periksa kartu status layanan di tab Pengaturan Umum. Jika RAG Degraded/Offline, tunggu beberapa saat lalu tekan "Uji Koneksi". Coba turunkan skala grounding bila ambang relevansi terlalu tinggi.' },
  { q: 'Draf tidak punya sitasi / warning "Perlu Verifikasi"', a: 'Knowledge base tidak menemukan referensi yang cukup. Pastikan dokumen relevan berstatus "aktif" di Pustaka, lalu turunkan ambang relevansi pada skala grounding.' },
  { q: 'Hasil terlalu umum atau tidak sesuai merek', a: 'Periksa pesan kunci pada brief dan panduan merek (terminologi/kata terlarang). Naikkan skala grounding agar hanya potongan paling relevan yang dipakai.' },
  { q: 'Draf tidak tersimpan di database', a: 'Kemungkinan opsi privasi "Simpan draf hasil generasi" sedang nonaktif. Aktifkan kembali di tab Privasi & Data, atau salin isi draf secara manual.' }
];

const FAQS = [
  { q: 'Apakah aplikasi memakai pencarian web?', a: 'Tidak. Semua fakta hanya diambil dari knowledge base internal perusahaan melalui layanan RAG. Tidak ada pencarian internet saat generasi.' },
  { q: 'Apakah dokumen saya bocor ke tenant lain?', a: 'Tidak. Tiap perusahaan punya corpus sendiri; hanya workspace perusahaan yang dipilih corporate dan statusnya aktif menerima dokumen di RAG.' },
  { q: 'Apakah kunci API RAG aman?', a: 'Kunci API hanya disimpan di server (.env.local) dan tidak pernah dikirim ke peramban. Peramban hanya berbicara ke API internal aplikasi.' },
  { q: 'Apa arti skor skala grounding?', a: 'Skala 1 (Sangat Longgar) mengambil banyak potongan dengan ambang rendah; skala 5 (Sangat Ketat) hanya memakai potongan dengan kemiripan tinggi. Naikkan bila ingin lebih faktual, turunkan bila jawaban terlalu sering kosong.' }
];

/* ── Component ───────────────────────────────────────────────────────── */

export const SettingsHelpView: React.FC<SettingsHelpViewProps> = ({ activeWorkspace, settings: serverSettings, onSaveSettings, onNotify }) => {
  const [tab, setTab] = useState<TabKey>('pengaturan');
  // Local editing copy; changes are debounced and written to the server.
  const [settings, setSettings] = useState<AppSettings>(() => normalizeSettings(serverSettings));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh across workspaces and live updates; cancel any pending write from the previous scope.
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSettings(normalizeSettings(serverSettings));
  }, [activeWorkspace.id, serverSettings]);

  // Flush nothing on unmount, but never leave a dangling timer.
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Live RAG status
  const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Grounding test bench
  const [testQuery, setTestQuery] = useState('Apa ketentuan layanan sambungan air baru?');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean; grounded?: boolean; sources?: number; topScore?: number; model?: string; answer?: string; error?: string;
  } | null>(null);

  const grounding = settings.grounding;

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      setRagStatus(await apiService.ragStatus());
    } catch {
      setRagStatus({ configured: false, ready: false });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: AppSettings) => {
    const clean = normalizeSettings(next);
    setSettings(clean);
    // Debounce so dragging a slider persists once it settles.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      Promise.resolve(onSaveSettings(clean))
        .then(() => setSavedAt(Date.now()))
        .catch(() => { /* parent surfaces the error */ });
    }, 400);
  };

  const updateGrounding = (patch: Partial<GroundingSettings>) => {
    persist({ ...settings, grounding: { ...grounding, ...patch } });
  };

  const applyLevel = (level: number) => {
    persist({ ...settings, grounding: groundingForLevel(level) });
  };

  const updatePrivacy = (patch: Partial<AppSettings['privacy']>) => {
    persist({ ...settings, privacy: { ...settings.privacy, ...patch } });
  };

  const handleReset = () => {
    persist(DEFAULT_SETTINGS);
    setTestResult(null);
    onNotify?.('Pengaturan perusahaan dikembalikan ke bawaan dan diterapkan ke semua workspace.');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await apiService.ragSync(activeWorkspace.id);
      onNotify?.(`Knowledge base disinkronkan: ${result.indexed} berhasil, ${result.failed} gagal dari ${result.total} dokumen.`);
    } catch (error) {
      onNotify?.(`Sinkronisasi gagal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  const runTest = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiService.ragQuery(activeWorkspace.id, testQuery, toRagOptions(grounding));
      const scores = (result.sources || []).map(s => (typeof s.score === 'number' ? s.score : 0));
      setTestResult({
        ok: true,
        grounded: result.grounded,
        sources: (result.sources || []).length,
        topScore: scores.length ? Math.max(...scores) : undefined,
        model: result.model,
        answer: result.answer
      });
    } catch (error) {
      setTestResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setTesting(false);
    }
  };

  const ragState = useMemo(() => {
    if (!ragStatus) return { label: 'Memeriksa…', tone: 'draft' as const };
    if (ragStatus.ready) return { label: 'Online', tone: 'disetujui' as const };
    if (ragStatus.configured) return { label: 'Degraded', tone: 'menunggu_review' as const };
    return { label: 'Offline', tone: 'revisi_diminta' as const };
  }, [ragStatus]);

  const savedLabel = savedAt ? 'Tersimpan ke database' : 'Belum ada perubahan';

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Pengaturan &amp; Bantuan</h2>
          <p className="page-subtitle">
            Kendali nyata untuk pembuatan konten: skala grounding, privasi data, dan panduan alur kerja.
            Semua pengaturan di sini langsung memengaruhi generasi berikutnya di Brief &amp; Generasi Konten.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />{savedLabel}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            <RotateCcw size={13} /> Pulihkan Bawaan
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`settings-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Pengaturan Umum ── */}
      {tab === 'pengaturan' && (
        <div className="settings-panel-grid">
          <div className="card-panel">
            <div className="settings-card-head"><Languages size={20} /><h3>Bahasa &amp; Output</h3></div>
            <SettingRow title="Bahasa konten bawaan" desc="Dipakai saat brief baru dibuat dan disimpan ke draf.">
              <select
                className="form-select"
                style={{ minWidth: '180px' }}
                value={settings.defaultLanguage}
                onChange={e => persist({ ...settings, defaultLanguage: e.target.value === 'en' ? 'en' : 'id' })}
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </SettingRow>
            <p className="settings-hint">
              Bahasa ini mengisi kolom bahasa pada brief hasil generasi. Anda tetap dapat mengganti bahasa per brief.
            </p>
          </div>

          <div className="card-panel">
            <div className="settings-card-head"><Activity size={20} /><h3>Status Layanan RAG</h3></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span className={`status-pill ${ragState.tone}`} style={{ fontSize: '0.68rem' }}>{ragState.label}</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {ragStatus?.configured ? 'Kunci API server terpasang' : 'Kunci API belum dikonfigurasi'}
              </span>
            </div>
            {ragStatus?.dependencies && (
              <div className="rag-dep-grid">
                {Object.entries(ragStatus.dependencies).map(([name, state]) => (
                  <div key={name} className="rag-dep-item">
                    <span className="rag-dep-name">{name}</span>
                    <span className={`status-pill ${state === 'ok' ? 'disetujui' : 'draft'}`} style={{ fontSize: '0.6rem' }}>{state}</span>
                  </div>
                ))}
              </div>
            )}
            {ragStatus?.error && <p className="settings-hint" style={{ color: 'var(--accent-rose)' }}>{ragStatus.error}</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={refreshStatus} disabled={statusLoading}>
                {statusLoading ? <ClipLoader size={13} color="currentColor" speedMultiplier={0.8} /> : <RefreshCw size={13} />} Uji Koneksi
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
                {syncing ? <ClipLoader size={13} color="currentColor" speedMultiplier={0.8} /> : <Database size={13} />} Sinkronkan KB
              </button>
            </div>
          </div>

          <div className="card-panel">
            <div className="settings-card-head"><Database size={20} /><h3>Penyimpanan &amp; Workspace</h3></div>
            <SettingRow title="Workspace aktif" desc="Knowledge base terpisah per tenant, ditentukan di sisi server.">
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{activeWorkspace.name} ({activeWorkspace.code})</span>
            </SettingRow>
            <p className="settings-hint">
              Data aplikasi disimpan melalui API Node.js di PostgreSQL. Pengaturan halaman ini disimpan sekali untuk
              perusahaan dan otomatis berlaku pada seluruh workspace perusahaan; kreator tidak dapat mengubahnya.
            </p>
          </div>

          <div className="card-panel">
            <div className="settings-card-head"><Wrench size={20} /><h3>Pemeliharaan Cepat</h3></div>
            <p className="settings-hint" style={{ marginBottom: '12px' }}>
              Bersihkan dokumen knowledge base yang sudah tidak ada di database untuk menjaga hasil retrieval tetap akurat.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                try {
                  const r = await apiService.ragPrune(activeWorkspace.id);
                  onNotify?.(`Pembersihan selesai: ${r.removed} dokumen usang dihapus, ${r.failed} gagal.`);
                } catch (error) {
                  onNotify?.(`Pembersihan gagal: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
            >
              <Trash2 size={13} /> Bersihkan Knowledge Base Usang
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Batas Grounding ── */}
      {tab === 'grounding' && (
        <div className="settings-panel-grid">
          <div className="card-panel" style={{ gridColumn: 'span 2' }}>
            <div className="settings-card-head"><Gauge size={20} /><h3>Skala Keketatan Grounding</h3></div>
            <p className="settings-hint">
              Geser skala untuk mengatur seberapa ketat fakta dari knowledge base dipakai. Naikkan bila ingin lebih faktual
              dan konservatif; turunkan bila jawaban terlalu sering kosong.
            </p>

            <div className="grounding-scale">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={grounding.level || 3}
                onChange={e => applyLevel(Number(e.target.value))}
                className="vc-range"
                aria-label="Skala grounding"
              />
              <div className="grounding-scale-ticks">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={grounding.level === n ? 'active' : ''}>{n}</span>
                ))}
              </div>
            </div>
            <div className="grounding-summary">
              <strong>{GROUNDING_LEVEL_LABELS[grounding.level] || 'Kustom'}</strong>
              <span>Ambang relevansi {(grounding.threshold * 100).toFixed(0)}%</span>
              <span>Top-K {grounding.topK} potongan</span>
              <span>{grounding.strictGrounding ? 'Strict grounding aktif' : 'Strict grounding nonaktif'}</span>
            </div>

            <details className="grounding-advanced">
              <summary><ChevronRight size={14} /> Penyetelan Lanjutan</summary>
              <div className="grounding-advanced-body">
                <div className="grounding-field">
                  <label className="form-label"><span>Ambang relevansi (threshold)</span><span>{(grounding.threshold * 100).toFixed(0)}%</span></label>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={grounding.threshold}
                    onChange={e => updateGrounding({ threshold: Number(e.target.value), level: 0 })}
                    className="vc-range"
                  />
                </div>
                <div className="grounding-field">
                  <label className="form-label"><span>Jumlah potongan (top-k)</span><span>{grounding.topK}</span></label>
                  <input
                    type="range" min={1} max={15} step={1}
                    value={grounding.topK}
                    onChange={e => updateGrounding({ topK: Number(e.target.value), level: 0 })}
                    className="vc-range"
                  />
                </div>
                <div className="grounding-field">
                  <div className="settings-row" style={{ padding: 0 }}>
                    <div className="settings-row-text"><strong>Strict grounding</strong><span>Menolak jawaban yang tidak didukung sumber.</span></div>
                    <Toggle checked={grounding.strictGrounding} onChange={v => updateGrounding({ strictGrounding: v, level: 0 })} label="Strict grounding" />
                  </div>
                </div>
                <div className="grounding-field">
                  <div className="settings-row" style={{ padding: 0 }}>
                    <div className="settings-row-text"><strong>Reranker</strong><span>Mengurutkan ulang hasil agar potongan paling relevan di atas.</span></div>
                    <Toggle checked={grounding.useReranker} onChange={v => updateGrounding({ useReranker: v, level: 0 })} label="Reranker" />
                  </div>
                </div>
                <div className="grounding-field">
                  <div className="settings-row" style={{ padding: 0 }}>
                    <div className="settings-row-text"><strong>Pencarian hybrid</strong><span>Gabungkan pencarian vektor dan kata kunci.</span></div>
                    <Toggle checked={grounding.useHybrid} onChange={v => updateGrounding({ useHybrid: v, level: 0 })} label="Pencarian hybrid" />
                  </div>
                </div>
                <div className="grounding-field">
                  <div className="settings-row" style={{ padding: 0 }}>
                    <div className="settings-row-text"><strong>Sertakan sumber di draf</strong><span>Menampilkan sitasi sumber pada hasil generasi.</span></div>
                    <Toggle checked={grounding.includeSources} onChange={v => updateGrounding({ includeSources: v, level: 0 })} label="Sertakan sumber" />
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div className="card-panel" style={{ gridColumn: 'span 2' }}>
            <div className="settings-card-head"><Search size={20} /><h3>Uji Grounding Langsung</h3></div>
            <p className="settings-hint">Jalankan kueri contoh dengan skala di atas untuk melihat efeknya pada jumlah sumber dan skor relevansi.</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: '1 1 320px' }}
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Tulis kueri pengujian…"
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={runTest} disabled={testing || !ragStatus?.ready}>
                {testing ? <ClipLoader size={14} color="currentColor" speedMultiplier={0.8} /> : <Sparkles size={14} />} Uji Grounding
              </button>
            </div>
            {!ragStatus?.ready && <p className="settings-hint" style={{ color: 'var(--accent-amber)' }}>Layanan RAG belum siap — uji dinonaktifkan sementara.</p>}
            {testResult && (
              <div className={`grounding-test-result ${testResult.ok ? 'ok' : 'fail'}`}>
                {testResult.ok ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`status-pill ${testResult.grounded ? 'disetujui' : 'menunggu_review'}`} style={{ fontSize: '0.64rem' }}>
                        {testResult.grounded ? 'Grounded' : 'Tidak tergrounding'}
                      </span>
                      <span className="test-metric"><Layers size={12} /> {testResult.sources ?? 0} sumber</span>
                      {typeof testResult.topScore === 'number' && <span className="test-metric">skor tertinggi {testResult.topScore.toFixed(3)}</span>}
                      {testResult.model && <span className="test-metric">{testResult.model}</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {(testResult.answer || '').slice(0, 600) || 'Tidak ada jawaban.'}
                    </p>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertTriangle size={15} color="var(--accent-rose)" />
                    <span style={{ fontSize: '0.8rem' }}>Gagal: {testResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Privasi & Data ── */}
      {tab === 'privasi' && (
        <div className="settings-panel-grid">
          <div className="card-panel" style={{ gridColumn: 'span 2' }}>
            <div className="settings-card-head"><ShieldCheck size={20} /><h3>Kendali Privasi Generasi</h3></div>
            <p className="settings-hint">Semua opsi di bawah ini benar-benar mengubah cara konten dibuat, bukan sekadar tampilan.</p>

            <SettingRow title="Izinkan generasi daring (layanan RAG eksternal)" desc="Bila nonaktif, konten dibuat lokal di peramban dan tidak ada data yang dikirim keluar.">
              <Toggle checked={settings.privacy.allowRemoteGeneration} onChange={v => updatePrivacy({ allowRemoteGeneration: v })} label="Generasi daring" />
            </SettingRow>
            <SettingRow title="Kirim konteks merek ke layanan RAG" desc="Menyertakan audiens, nada, kanal, dan format dalam kueri agar hasil lebih relevan.">
              <Toggle checked={settings.privacy.includeBrandContextInQuery} onChange={v => updatePrivacy({ includeBrandContextInQuery: v })} label="Konteks merek" />
            </SettingRow>
            <SettingRow title="Sertakan kutipan sumber di draf" desc="Bila nonaktif, isi kutipan verbatim disembunyikan namun metadata sumber tetap ada.">
              <Toggle checked={settings.privacy.includeSourceExcerpts} onChange={v => updatePrivacy({ includeSourceExcerpts: v })} label="Kutipan sumber" />
            </SettingRow>
            <SettingRow title="Simpan draf hasil generasi ke database" desc="Bila nonaktif, draf hanya tampil di layar dan tidak persisten.">
              <Toggle checked={settings.privacy.persistGeneratedDrafts} onChange={v => updatePrivacy({ persistGeneratedDrafts: v })} label="Simpan draf" />
            </SettingRow>
          </div>

          <div className="card-panel">
            <div className="settings-card-head"><EyeOff size={20} /><h3>Apa yang Dikirim Keluar?</h3></div>
            <ul className="privacy-list">
              {outboundDataSummary(settings, grounding).map((line, i) => <li key={i}>{line}</li>)}
              <li><strong>Kunci API</strong> — tetap di server, tidak pernah dikirim ke peramban.</li>
              <li><strong>Isolasi tenant</strong> — knowledge base ditentukan server; klien tidak dapat menargetkan tenant lain.</li>
            </ul>
          </div>

          <div className="card-panel">
            <div className="settings-card-head"><Lock size={20} /><h3>Dampak Mode Privasi Tinggi</h3></div>
            <p className="settings-hint">
              Saat "Generasi daring" nonaktif, Brief &amp; Generasi Konten otomatis memakai mesin lokal dan menampilkan
              lencana <em>Privasi Tinggi</em>. Tidak ada permintaan jaringan ke layanan RAG.
            </p>
            <p className="settings-hint">
              Pengaturan ini disimpan ke database untuk workspace ini. Tekan "Pulihkan Bawaan" untuk mengembalikan seluruh nilai.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Alur Bantuan ── */}
      {tab === 'alur' && <HelpSection />}
    </div>
  );
};

/* ── Help section with its own sub-tabs ─────────────────────────────── */

const HELP_TABS: Array<{ key: HelpKey; label: string; icon: React.ReactNode }> = [
  { key: 'alur', label: 'Alur Kerja', icon: <Sparkles size={14} /> },
  { key: 'peran', label: 'Peran & Hak Akses', icon: <Users size={14} /> },
  { key: 'masalah', label: 'Pemecahan Masalah', icon: <Wrench size={14} /> },
  { key: 'faq', label: 'FAQ', icon: <CircleHelp size={14} /> }
];

const HelpSection: React.FC = () => {
  const [helpTab, setHelpTab] = useState<HelpKey>('alur');
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <div>
      <div className="help-subtabs" role="tablist">
        {HELP_TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={helpTab === t.key}
            className={`help-subtab ${helpTab === t.key ? 'active' : ''}`}
            onClick={() => setHelpTab(t.key)}
          >
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {helpTab === 'alur' && (
        <div className="card-panel">
          <div className="settings-card-head"><BookOpenCheck size={20} /><h3>Alur Kerja Sepuluh Langkah</h3></div>
          <div className="help-steps">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={i} className={`help-step ${openStep === i ? 'open' : ''}`}>
                <button type="button" className="help-step-head" onClick={() => setOpenStep(openStep === i ? null : i)}>
                  {openStep === i ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <strong>{step.title}</strong>
                  <span className="help-step-tab">{step.tabs[0]}</span>
                </button>
                {openStep === i && <div className="help-step-body">{step.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {helpTab === 'peran' && (
        <div className="settings-panel-grid">
          {ROLE_NOTES.map(r => (
            <div key={r.role} className="card-panel">
              <div className="settings-card-head"><Users size={20} /><h3>{r.role}</h3></div>
              <p className="settings-hint">{r.detail}</p>
            </div>
          ))}
          <div className="card-panel">
            <div className="settings-card-head"><FileText size={20} /><h3>Transisi Status Draf</h3></div>
            <p className="settings-hint">
              Draf berjalan: draft → menunggu review → disetujui / revisi diminta → diarsipkan. Persetujuan membuka Studio Visual.
            </p>
          </div>
        </div>
      )}

      {helpTab === 'masalah' && (
        <div className="card-panel">
          <div className="settings-card-head"><Wrench size={20} /><h3>Pemecahan Masalah</h3></div>
          <div className="help-steps">
            {TROUBLESHOOTING.map((item, i) => (
              <div key={i} className={`help-step ${openStep === i ? 'open' : ''}`}>
                <button type="button" className="help-step-head" onClick={() => setOpenStep(openStep === i ? null : i)}>
                  {openStep === i ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <strong>{item.q}</strong>
                </button>
                {openStep === i && <div className="help-step-body">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {helpTab === 'faq' && (
        <div className="card-panel">
          <div className="settings-card-head"><CircleHelp size={20} /><h3>Pertanyaan yang Sering Diajukan</h3></div>
          <div className="help-steps">
            {FAQS.map((item, i) => (
              <div key={i} className={`help-step ${openStep === i ? 'open' : ''}`}>
                <button type="button" className="help-step-head" onClick={() => setOpenStep(openStep === i ? null : i)}>
                  {openStep === i ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <strong>{item.q}</strong>
                </button>
                {openStep === i && <div className="help-step-body">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsHelpView;
