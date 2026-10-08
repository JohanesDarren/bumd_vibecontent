import React, { useState } from 'react';
import { Sparkles, X, Check, BookOpen } from 'lucide-react';
import type { SchedulePillar, SchedulePlatform } from '../types';
import { apiService, type PlanSlot } from '../services/apiService';
import { PILLARS, parseDateStr } from '../services/scheduling';

const PLATFORMS: { key: SchedulePlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' }
];

interface ContentPlanModalProps {
  /** "plan": monthly plan for a theme; "gap": ideas for the empty days only. */
  mode: 'plan' | 'gap';
  workspaceId: string;
  monthLabel: string;
  /** The only dates the AI may use (future dates, or the empty ones for "gap"). */
  dates: string[];
  weakPillars: SchedulePillar[];
  moments: string[];
  existingTitles: string[];
  campaigns: string[];
  onClose: () => void;
  /** Saves the chosen slots as Draf schedules. */
  onAdd: (slots: PlanSlot[], campaign: string) => Promise<void>;
}

const shortDate = (dateStr: string) => parseDateStr(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

export const ContentPlanModal: React.FC<ContentPlanModalProps> = ({
  mode, workspaceId, monthLabel, dates, weakPillars, moments, existingTitles, campaigns, onClose, onAdd
}) => {
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(mode === 'gap' ? Math.min(5, dates.length) : 8);
  const [platforms, setPlatforms] = useState<SchedulePlatform[]>(['instagram', 'facebook']);
  const [slots, setSlots] = useState<PlanSlot[]>([]);
  const [chosen, setChosen] = useState<boolean[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (mode === 'plan' && !theme.trim()) return setError('Isi tema rencana, misalnya "Sosialisasi tarif baru Oktober 2026".');
    if (!platforms.length) return setError('Pilih minimal satu platform.');
    setBusy(true);
    setError(null);
    try {
      const result = await apiService.ragPlan({
        workspaceId, mode, monthLabel, theme: theme.trim(), count, dates, platforms,
        pillars: weakPillars, moments, existingTitles
      });
      setSlots(result.slots);
      setChosen(result.slots.map(() => true));
      setSources(result.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat usulan.');
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const picked = slots.filter((_, i) => chosen[i]);
    if (!picked.length) return setError('Pilih minimal satu usulan.');
    setBusy(true);
    setError(null);
    try {
      await onAdd(picked, theme.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan ke kalender.');
    } finally {
      setBusy(false);
    }
  };

  const pickedCount = chosen.filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '760px' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Rencana konten AI">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            {mode === 'plan' ? `Rencana Konten ${monthLabel} (AI)` : `Isi Hari Kosong ${monthLabel} (AI)`}
          </h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ padding: '6px' }} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            AI menyusun usulan dari dokumen resmi di Knowledge Base. Usulan masuk kalender sebagai <strong>Draf</strong>, lalu tetap perlu dibuatkan draf konten dan disetujui sebelum dijadwalkan.
            {mode === 'gap' && ` Tersedia ${dates.length} hari kosong.`}
          </p>
          {weakPillars.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Pilar yang masih kurang: {weakPillars.map(p => PILLARS[p].label).join(', ')}. AI akan mengutamakannya.</p>
          )}
          {moments.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Momen penting: {moments.join(' · ')}</p>
          )}
          {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">{mode === 'plan' ? 'Tema / tujuan *' : 'Arah ide (opsional)'}</label>
              <input className="form-input" list="plan-campaigns" placeholder="cth.: Sosialisasi tarif baru Oktober 2026" value={theme} onChange={e => setTheme(e.target.value)} />
              <datalist id="plan-campaigns">{campaigns.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Jumlah slot</label>
              <input className="form-input" type="number" min={1} max={Math.min(12, dates.length)} value={count} onChange={e => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Platform</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {PLATFORMS.map(p => (
                <label key={p.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={platforms.includes(p.key)} onChange={() => setPlatforms(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={generate} disabled={busy} style={{ alignSelf: 'flex-start' }}>
            <Sparkles size={16} /> {busy && !slots.length ? 'Menyusun usulan…' : slots.length ? 'Buat Ulang Usulan' : 'Buat Usulan'}
          </button>

          {slots.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {slots.map((slot, i) => (
                <label key={`${slot.date}-${slot.platform}-${i}`} style={{ display: 'grid', gridTemplateColumns: '20px 110px 1fr', gap: '10px', alignItems: 'start', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0,0,0,0.1))', borderLeft: slot.pillar ? `4px solid ${PILLARS[slot.pillar].color}` : undefined, opacity: chosen[i] ? 1 : 0.55 }}>
                  <input type="checkbox" checked={chosen[i]} onChange={() => setChosen(prev => prev.map((v, j) => j === i ? !v : v))} style={{ marginTop: '3px' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>{shortDate(slot.date)}</strong><br />{slot.time} · {PLATFORMS.find(p => p.key === slot.platform)?.label}
                    {slot.pillar && <><br /><span style={{ color: PILLARS[slot.pillar].color }}>{PILLARS[slot.pillar].label}</span></>}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                      className="form-input"
                      value={slot.title}
                      onChange={e => setSlots(prev => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
                      aria-label="Judul usulan"
                      style={{ fontWeight: 600, fontSize: '0.85rem', padding: '6px 8px' }}
                    />
                    {slot.angle && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{slot.angle}</span>}
                    {slot.source && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', gap: '4px', alignItems: 'center' }}><BookOpen size={11} /> {slot.source}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
          {sources.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dokumen rujukan: {sources.join(', ')}</p>
          )}
          {slots.length > 0 && !sources.length && (
            <p style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Tidak ada dokumen Knowledge Base yang dipakai sebagai rujukan. Periksa fakta pada setiap usulan.</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={add} disabled={busy || !pickedCount}>
            <Check size={16} /> {busy && slots.length ? 'Menyimpan…' : `Tambahkan ${pickedCount} ke Kalender`}
          </button>
        </div>
      </div>
    </div>
  );
};
