import React, { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';

export const SettingsHelpView: React.FC<{ corporate?: boolean }> = ({ corporate = false }) => {
  const [companyName, setCompanyName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(corporate);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!corporate) return;
    setError('');
    try { setCompanyName((await apiService.corporateDashboard()).company.name); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan'); }
    finally { setLoading(false); }
  }, [corporate]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeSignal(() => { void load(); });

  const saveCompany = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { const data = await apiService.updateCorporateSettings(companyName.trim()); setCompanyName(data.name); setNotice('Nama perusahaan tersimpan.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  };
  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (newPassword !== confirmPassword) { setError('Konfirmasi kata sandi tidak cocok.'); return; }
    setBusy(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setNotice('Kata sandi berhasil diubah.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengubah kata sandi'); }
    finally { setBusy(false); }
  };

  return <div>
    <div className="page-header-row"><div><h2 className="page-title">Pengaturan & Bantuan</h2><p className="page-subtitle">{corporate ? 'Kelola perusahaan dan keamanan akun Anda.' : 'Informasi aplikasi dan keamanan akun.'}</p></div></div>
    {error && <p role="alert" className="card-panel" style={{ color: 'var(--accent-rose)', padding: 16 }}>{error}</p>}
    {notice && <p role="status" className="card-panel" style={{ padding: 16 }}>{notice}</p>}
    <div className="settings-grid">
      {corporate && <form className="card-panel" onSubmit={saveCompany}>
        <h3>Perusahaan</h3><p>Nama ini tampil pada dasbor semua workspace perusahaan.</p>
        <label htmlFor="company-settings-name">Nama perusahaan</label>
        <input id="company-settings-name" className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} required maxLength={120} disabled={loading || busy} />
        <button className="btn btn-primary" type="submit" disabled={loading || busy || !companyName.trim()}>Simpan perusahaan</button>
      </form>}
      <form className="card-panel" onSubmit={savePassword}>
        <h3>Keamanan akun</h3><p>Ubah kata sandi akun Anda. Minimal 8 karakter.</p>
        <label htmlFor="settings-old-password">Kata sandi saat ini</label>
        <input id="settings-old-password" className="form-input" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required disabled={busy} />
        <label htmlFor="settings-new-password">Kata sandi baru</label>
        <input id="settings-new-password" className="form-input" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} disabled={busy} />
        <label htmlFor="settings-confirm-password">Konfirmasi kata sandi baru</label>
        <input id="settings-confirm-password" className="form-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} disabled={busy} />
        <button className="btn btn-primary" type="submit" disabled={busy}>Ubah kata sandi</button>
      </form>
      <div className="card-panel"><h3>Bahasa antarmuka</h3><p>Antarmuka saat ini hanya tersedia dalam Bahasa Indonesia. Pilihan bahasa lain belum tersedia.</p></div>
      <div className="card-panel"><h3>Penyimpanan & bantuan</h3><p>Data workspace disimpan melalui API di PostgreSQL. Untuk perubahan workspace dan penugasan kreator, gunakan menu manajemen. Hubungi admin jika kehilangan akses akun.</p></div>
    </div>
  </div>;
};
