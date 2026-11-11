import React, { useState } from 'react';
import { Database, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { PageHeader } from './ui/PageHeader';

/**
 * Platform maintenance (superadmin only).
 *
 * The orphan-vector cleanup used to live inside "Pengaturan & Bantuan", which is a
 * workspace page: a superadmin has no workspace of their own, so the control was
 * unreachable exactly for the role that needs it. It belongs to the admin console.
 */
export const AdminMaintenanceView: React.FC<{ workspaceId?: string }> = ({ workspaceId }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<{ total: number; orphanCount: number; orphans: Array<{ id: string; name: string }> } | null>(null);
  const [done, setDone] = useState<{ deleted: number; failed: number } | null>(null);

  const check = async () => {
    setBusy(true); setError(''); setDone(null);
    try {
      setReport(await apiService.ragOrphans(workspaceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memeriksa vektor.');
    } finally { setBusy(false); }
  };

  const purge = async () => {
    if (!report) return;
    const names = report.orphans.map(o => o.name || o.id).join(', ');
    const ok = window.confirm(
      `Hapus ${report.orphanCount} vektor tanpa dokumen sumber?\n\n${names}\n\nDokumen asli tidak tersentuh.`
    );
    if (!ok) return;
    setBusy(true); setError('');
    try {
      const result = await apiService.ragPurgeOrphans(workspaceId);
      setDone({ deleted: result.deleted, failed: result.failed });
      setReport(await apiService.ragOrphans(workspaceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pembersihan gagal.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <PageHeader
        style={{ marginBottom: 0 }}
        eyebrow="Superadmin • Pemeliharaan Platform"
        icon={Database}
        title="Pemeliharaan Platform"
        subtitle="Perawatan tingkat aplikasi: kebersihan indeks vektor knowledge base dan kesehatan layanan pendukung."
      />
      {/* Make the level explicit: this console governs the whole application. */}
      <div className="scope-banner" role="note" style={{ marginBottom: 0 }}>
        <ShieldCheck size={16} />
        <div>
          <strong>Pengaturan tingkat aplikasi</strong>
          <span>
            Berlaku untuk seluruh perusahaan, seluruh workspace, dan seluruh peran.
            Pengaturan milik satu perusahaan (bahasa, kebijakan merek) dikelola akun
            korporat di halaman Pengaturan &amp; Bantuan mereka sendiri.
          </span>
        </div>
      </div>

      <div className="card-panel">
        <div className="settings-card-head">
          <Database size={20} />
          <h3>Vektor Knowledge Base</h3>
        </div>
        <p className="settings-hint" style={{ marginBottom: '14px' }}>
          Vektor bisa tertinggal tanpa dokumen sumber bila unggahan dihapus sebelum
          pengindeksan selesai. Vektor seperti itu masih ikut terambil saat pencarian,
          jadi isinya bisa muncul di naskah walau dokumennya sudah tidak ada.
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void check()} disabled={busy}>
            {busy ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />} Periksa Vektor
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void purge()}
            disabled={busy || !report || report.orphanCount === 0}
          >
            <Database size={13} /> Bersihkan Vektor Yatim
          </button>
        </div>

        {error && (
          <div className="core-warn" role="alert" style={{ marginTop: '12px' }}>
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        )}

        {done && (
          <div className="core-warn" role="status" style={{ marginTop: '12px', background: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.35)', color: '#065f46' }}>
            <CheckCircle2 size={14} />
            <span>{done.deleted} vektor dihapus{done.failed ? `, ${done.failed} gagal` : ', tidak ada yang gagal'}.</span>
          </div>
        )}

        {report && (
          <div style={{ marginTop: '14px', fontSize: '0.82rem' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>{report.total}</strong> vektor terdaftar,{' '}
              <strong style={{ color: report.orphanCount ? '#b45309' : '#065f46' }}>{report.orphanCount}</strong> tanpa dokumen sumber.
            </p>
            {report.orphanCount > 0 && (
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)' }}>
                {report.orphans.map(o => (
                  <li key={o.id} style={{ marginBottom: '2px' }}>
                    {o.name || '(tanpa nama)'} <code style={{ fontSize: '0.72rem', opacity: 0.7 }}>{o.id}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
