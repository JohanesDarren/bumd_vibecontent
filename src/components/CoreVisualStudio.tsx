import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Sparkles, Upload, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Visual generation surface for the core-prompt architecture.
 *
 * Layout follows the strategy document exactly:
 *   Brief Choices  →  References  →  Generated Image
 *
 * The core prompt is never shown here: the user only supplies choices, optional
 * remarks and reference images. Everything about "how the picture is built" is
 * server-side and invisible by design.
 */

type Mode = 'product' | 'human';
type Slot = 'model' | 'font' | 'color' | 'pose' | 'lighting';

type Reference = { slot: Slot; filename: string; dataUrl: string };

const SLOT_META: Record<Slot, { label: string; hint: string }> = {
  model: { label: 'Model reference', hint: 'Foto orang/model acuan' },
  font: { label: 'Font reference', hint: 'Contoh tipografi' },
  color: { label: 'Color reference', hint: 'Palet warna acuan' },
  pose: { label: 'Pose reference', hint: 'Contoh pose & framing' },
  lighting: { label: 'Lighting reference', hint: 'Arah & karakter cahaya' }
};

const PRODUCT_SLOTS: Slot[] = ['font', 'color', 'lighting'];
const HUMAN_SLOTS: Slot[] = ['model', 'font', 'color', 'pose', 'lighting'];

const ACCEPT = '.png,.jpg,.jpeg';
const MAX_BYTES = 8 * 1024 * 1024;

export type CoreVisualResult = {
  imageUrl: string;
  format: string;
  provider: string;
  model: string;
  dimensions: string;
  mode: Mode;
  referencesAnalyzed: Slot[];
  referenceFailures: Slot[];
  slotsFromHuman: Slot[];
  slotsDefaulted: Slot[];
};

export function CoreVisualStudio({
  workspaceId,
  draftTitle,
  headline,
  ctaText,
  onSave
}: {
  workspaceId: string;
  draftTitle?: string;
  headline?: string;
  ctaText?: string;
  onSave?: (imageUrl: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>('product');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [sizeChoice, setSizeChoice] = useState<'small' | 'medium' | 'large'>('medium');
  const [remark, setRemark] = useState('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CoreVisualResult | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const requiredSlots = mode === 'human' ? HUMAN_SLOTS : PRODUCT_SLOTS;
  const missingSlots = requiredSlots.filter(slot => !references.some(r => r.slot === slot));

  const pickFile = (slot: Slot, file: File | null) => {
    setError('');
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!['png', 'jpg', 'jpeg'].includes(ext)) {
      setError(`${SLOT_META[slot].label}: hanya file .png, .jpg, atau .jpeg.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`${SLOT_META[slot].label}: ukuran melebihi 8 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!/^data:image\/(png|jpeg|jpg);base64,/.test(dataUrl)) {
        setError(`${SLOT_META[slot].label}: file bukan gambar PNG/JPEG yang valid.`);
        return;
      }
      setReferences(prev => [...prev.filter(r => r.slot !== slot), { slot, filename: file.name, dataUrl }]);
    };
    reader.onerror = () => setError(`${SLOT_META[slot].label}: gagal membaca file.`);
    reader.readAsDataURL(file);
  };

  const removeReference = (slot: Slot) => setReferences(prev => prev.filter(r => r.slot !== slot));

  const generate = async () => {
    setError('');
    if (missingSlots.length) {
      setError(
        mode === 'human'
          ? `Mode human model butuh semua referensi. Belum ada: ${missingSlots.map(s => SLOT_META[s].label).join(', ')}.`
          : `Mode product only butuh referensi: ${missingSlots.map(s => SLOT_META[s].label).join(', ')}.`
      );
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/visual/core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId,
          mode,
          aspectRatio,
          remark: remark.trim(),
          headline,
          ctaText,
          sizeChoice,
          references: references.map(({ slot, filename, dataUrl }) => ({ slot, filename, dataUrl }))
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Gagal membuat gambar (HTTP ${response.status})`);
      setResult(body as CoreVisualResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat gambar.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result || !onSave) return;
    setSavingImage(true);
    try {
      await onSave(result.imageUrl);
    } finally {
      setSavingImage(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `visual-${Date.now()}.jpg`;
    a.click();
  };

  const previewBox = () => {
    if (aspectRatio === '9:16') return { width: 240, height: 427 };
    if (aspectRatio === '16:9') return { width: 427, height: 240 };
    return { width: 340, height: 340 };
  };

  return (
    <div className="core-visual">
      <div className="core-visual-grid">
        {/* ── Column 1: Brief Choices ── */}
        <section className="core-col" aria-label="Brief choices">
          <header className="core-col-head">
            <span className="core-step">1</span>
            <div>
              <h3>Brief Choices</h3>
              <p>Pilih jenis visual dan orientasi.</p>
            </div>
          </header>

          <div className="core-field">
            <label className="core-label">Jenis visual</label>
            <div className="core-mode-row">
              <button
                type="button"
                className={`core-mode ${mode === 'product' ? 'is-active' : ''}`}
                onClick={() => { setMode('product'); setReferences(prev => prev.filter(r => PRODUCT_SLOTS.includes(r.slot))); }}
              >
                <strong>Product only</strong>
                <span>Tanpa model manusia</span>
              </button>
              <button
                type="button"
                className={`core-mode ${mode === 'human' ? 'is-active' : ''}`}
                onClick={() => setMode('human')}
              >
                <strong>Human model</strong>
                <span>Dengan model & pose</span>
              </button>
            </div>
          </div>

          <div className="core-field">
            <label className="core-label">Orientasi gambar</label>
            <div className="core-ratio-row">
              {(['1:1', '9:16', '16:9'] as const).map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  className={`core-chip ${aspectRatio === ratio ? 'is-active' : ''}`}
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio === '1:1' ? 'Persegi' : ratio === '9:16' ? 'Vertikal' : 'Horizontal'}
                  <small>{ratio}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="core-field">
            <label className="core-label">Ukuran keluaran</label>
            <select className="form-select" value={sizeChoice} onChange={e => setSizeChoice(e.target.value as 'small' | 'medium' | 'large')}>
              <option value="small">Kecil — hemat kuota</option>
              <option value="medium">Sedang — seimbang</option>
              <option value="large">Besar — detail maksimal</option>
            </select>
          </div>

          <div className="core-field">
            <label className="core-label" htmlFor="core-remark">
              Tambahan permintaan <span className="core-optional">(opsional)</span>
            </label>
            <textarea
              id="core-remark"
              className="form-input core-textarea"
              rows={3}
              placeholder='cth.: "baju merah, latar biru"'
              value={remark}
              onChange={e => setRemark(e.target.value)}
            />
            <p className="core-help">
              Tulis singkat. Sistem menyesuaikan sendiri bagian yang perlu diubah.
            </p>
          </div>
        </section>

        {/* ── Column 2: References ── */}
        <section className="core-col" aria-label="References">
          <header className="core-col-head">
            <span className="core-step">2</span>
            <div>
              <h3>References</h3>
              <p>{mode === 'human' ? 'Semua referensi wajib diisi.' : 'Font, warna, dan cahaya wajib diisi.'}</p>
            </div>
          </header>

          {requiredSlots.map(slot => {
            const current = references.find(r => r.slot === slot);
            return (
              <div key={slot} className={`core-ref ${current ? 'has-file' : ''}`}>
                <div className="core-ref-head">
                  <div>
                    <strong>{SLOT_META[slot].label}</strong>
                    <span>{SLOT_META[slot].hint}</span>
                  </div>
                  {current ? (
                    <button type="button" className="core-ref-remove" onClick={() => removeReference(slot)} aria-label={`Hapus ${SLOT_META[slot].label}`}>
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                {current ? (
                  <div className="core-ref-file">
                    <CheckCircle2 size={14} />
                    <span title={current.filename}>{current.filename}</span>
                  </div>
                ) : (
                  <>
                    <input
                      ref={el => { inputs.current[slot] = el; }}
                      type="file"
                      accept={ACCEPT}
                      hidden
                      onChange={e => pickFile(slot, e.target.files?.[0] ?? null)}
                    />
                    <button type="button" className="core-ref-upload" onClick={() => inputs.current[slot]?.click()}>
                      <Upload size={14} /> Pilih file PNG / JPG
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {missingSlots.length ? (
            <p className="core-missing">
              <AlertCircle size={14} /> Kurang {missingSlots.length} referensi.
            </p>
          ) : (
            <p className="core-ready">
              <CheckCircle2 size={14} /> Referensi lengkap.
            </p>
          )}
        </section>

        {/* ── Column 3: Generated Image ── */}
        <section className="core-col" aria-label="Generated image">
          <header className="core-col-head">
            <span className="core-step">3</span>
            <div>
              <h3>Generated Image</h3>
              <p>{draftTitle ? draftTitle.slice(0, 60) : 'Hasil visual'}</p>
            </div>
          </header>

          <div className="core-preview" style={{ width: previewBox().width, height: previewBox().height }}>
            {busy ? (
              <div className="core-preview-empty">
                <Loader2 size={26} className="core-spin" />
                <span>Menyiapkan visual…</span>
              </div>
            ) : result ? (
              <img src={result.imageUrl} alt="Visual hasil generasi" className="core-preview-img" />
            ) : (
              <div className="core-preview-empty">
                <ImageIcon size={26} />
                <span>Belum ada gambar</span>
              </div>
            )}
          </div>

          {error ? (
            <div className="core-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="core-actions">
            <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
              {busy ? <Loader2 size={15} className="core-spin" /> : <Sparkles size={15} />}
              {busy ? 'Membuat…' : 'Generate'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={download} disabled={!result}>
              <Download size={15} /> Export
            </button>
            {onSave ? (
              <button type="button" className="btn btn-secondary" onClick={save} disabled={!result || savingImage}>
                {savingImage ? 'Menyimpan…' : 'Simpan ke draf'}
              </button>
            ) : null}
          </div>

          {result ? (
            <dl className="core-meta">
              <div><dt>Model</dt><dd>{result.model}</dd></div>
              <div><dt>Orientasi</dt><dd>{result.dimensions}</dd></div>
              <div><dt>Referensi terbaca</dt><dd>{result.referencesAnalyzed.length}/{requiredSlots.length}</dd></div>
              {result.slotsFromHuman.length ? (
                <div><dt>Disesuaikan</dt><dd>{result.slotsFromHuman.join(', ')}</dd></div>
              ) : null}
            </dl>
          ) : null}
        </section>
      </div>
    </div>
  );
}
