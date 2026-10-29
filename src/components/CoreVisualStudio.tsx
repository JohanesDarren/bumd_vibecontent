import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Sparkles, Upload, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch, Segmented } from './ui/FormControls';

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
type Publication = 'social' | 'poster';
type Theme = 'korporat' | 'gelap' | 'editorial' | 'aurora' | 'alam' | 'blueprint' | 'ceria' | 'swiss';

/**
 * The eight poster themes with their real swatches, taken from the design system
 * so the picker shows the actual colours instead of a name alone.
 */
const THEME_OPTIONS: { key: Theme; label: string; bg: string; accent: string; accent2: string }[] = [
  { key: 'korporat', label: 'Korporat', bg: '#ffffff', accent: '#c8962e', accent2: '#1b3a6b' },
  { key: 'gelap', label: 'Gelap', bg: '#0b0d17', accent: '#22d3ee', accent2: '#a78bfa' },
  { key: 'editorial', label: 'Editorial', bg: '#f6f1e7', accent: '#1f3a93', accent2: '#b5452b' },
  { key: 'aurora', label: 'Aurora', bg: '#f7f5ff', accent: '#7c3aed', accent2: '#ec4899' },
  { key: 'alam', label: 'Alam', bg: '#f4f1e8', accent: '#2f6b3a', accent2: '#c08a2b' },
  { key: 'blueprint', label: 'Blueprint', bg: '#f5f8fc', accent: '#0a66c2', accent2: '#f59e0b' },
  { key: 'ceria', label: 'Ceria', bg: '#fffaf5', accent: '#ff6b6b', accent2: '#2ec4b6' },
  { key: 'swiss', label: 'Swiss', bg: '#ffffff', accent: '#e3000f', accent2: '#111111' }
];
type Slot = 'model' | 'font' | 'color' | 'pose' | 'lighting';

type KmsPicture = { id: string; title: string; mediaType: string; visionDescription?: string; filename: string };

/**
 * A reference is either a file the user just picked or a picture already stored
 * in the workspace knowledge base. `kmsId` is sent instead of bytes, so the
 * server reads the stored frame and the browser never has to download it first.
 */
type Reference =
  | { slot: Slot; source: 'upload'; filename: string; dataUrl: string }
  | { slot: Slot; source: 'kms'; kmsId: string; filename: string; previewUrl: string };

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
  publication: Publication;
  usedReferenceImage: boolean;
  referencesUsed: number;
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
  companyType,
  onSave
}: {
  workspaceId: string;
  draftTitle?: string;
  headline?: string;
  ctaText?: string;
  /** Issuing organisation type, used to frame the visual. */
  companyType?: string;
  onSave?: (imageUrl: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>('product');
  const [publication, setPublication] = useState<Publication>('social');
  const [commercial, setCommercial] = useState(false);
  const [theme, setTheme] = useState<Theme>('korporat');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [sizeChoice, setSizeChoice] = useState<'small' | 'medium' | 'large'>('medium');
  const [remark, setRemark] = useState('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CoreVisualResult | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [kmsPictures, setKmsPictures] = useState<KmsPicture[]>([]);
  const [kmsState, setKmsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openPicker, setOpenPicker] = useState<Slot | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const requiredSlots = mode === 'human' ? HUMAN_SLOTS : PRODUCT_SLOTS;
  const missingSlots = requiredSlots.filter(slot => !references.some(r => r.slot === slot));

  // Knowledge-base pictures are the default source: the workspace already owns
  // approved imagery, so uploading again is the exception, not the rule.
  const loadKmsPictures = async () => {
    if (kmsState === 'loading') return;
    setKmsState('loading');
    try {
      const response = await fetch(`/api/visual/references?workspaceId=${encodeURIComponent(workspaceId)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('failed');
      const rows = (await response.json()) as KmsPicture[];
      setKmsPictures(Array.isArray(rows) ? rows : []);
      setKmsState('idle');
    } catch {
      setKmsPictures([]);
      setKmsState('error');
    }
  };

  useEffect(() => {
    void loadKmsPictures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const chooseKms = (slot: Slot, picture: KmsPicture) => {
    setError('');
    setReferences(prev => [
      ...prev.filter(r => r.slot !== slot),
      {
        slot,
        source: 'kms',
        kmsId: picture.id,
        filename: picture.title || picture.filename,
        previewUrl: `/api/visual/references/${encodeURIComponent(picture.id)}/thumbnail?workspaceId=${encodeURIComponent(workspaceId)}`
      }
    ]);
    setOpenPicker(null);
  };

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
      setReferences(prev => [...prev.filter(r => r.slot !== slot), { slot, source: 'upload', filename: file.name, dataUrl }]);
      setOpenPicker(null);
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
          publication,
          commercial,
          theme,
          topic: draftTitle || headline || '',
          companyType: companyType || '',
          aspectRatio,
          remark: remark.trim(),
          headline,
          ctaText,
          sizeChoice,
          references: references.map(ref =>
            ref.source === 'kms'
              ? { slot: ref.slot, kmsId: ref.kmsId, filename: ref.filename }
              : { slot: ref.slot, filename: ref.filename, dataUrl: ref.dataUrl }
          )
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
            <Segmented
              value={mode}
              onChange={next => {
                setMode(next);
                if (next === 'product') {
                  setReferences(prev => prev.filter(r => PRODUCT_SLOTS.includes(r.slot)));
                }
              }}
              variant="card"
              fill
              ariaLabel="Jenis visual"
              options={[
                { value: 'product', label: 'Product only', note: 'Tanpa model manusia' },
                { value: 'human', label: 'Human model', note: 'Dengan model & pose' }
              ]}
            />
          </div>

          <div className="core-field">
            <label className="core-label">Jenis publikasi</label>
            <Segmented
              value={publication}
              onChange={setPublication}
              variant="card"
              fill
              ariaLabel="Jenis publikasi"
              options={[
                { value: 'social', label: 'Social media post', note: 'Rapi, teks minimal' },
                { value: 'poster', label: 'Poster / banner', note: 'Persuasif, ajakan' }
              ]}
            />
            <Switch
              checked={commercial}
              onChange={setCommercial}
              label="Konten komersial"
              hint="Produk sedang dipromosikan."
            />
          </div>

          <div className="core-field">
            <label className="core-label">Tema desain</label>
            <div className="ui-swatch-grid" role="radiogroup" aria-label="Tema desain">
              {THEME_OPTIONS.map(option => {
                const active = theme === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`ui-swatch ${active ? 'is-active' : ''}`}
                    onClick={() => setTheme(option.key)}
                  >
                    <span
                      className="ui-swatch-plate"
                      style={{ background: option.bg }}
                      aria-hidden="true"
                    >
                      <i style={{ background: option.accent }} />
                      <i style={{ background: option.accent2 }} />
                    </span>
                    <span className="ui-swatch-name">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="core-help">
              Palet, tipografi, dan ornamen mengikuti sistem poster resmi.
            </p>
          </div>

          <div className="core-field">
            <label className="core-label">Orientasi gambar</label>
            <Segmented
              value={aspectRatio}
              onChange={setAspectRatio}
              size="sm"
              fill
              ariaLabel="Orientasi gambar"
              options={[
                { value: '1:1' as const, label: 'Persegi', note: '1:1' },
                { value: '9:16' as const, label: 'Vertikal', note: '9:16' },
                { value: '16:9' as const, label: 'Horizontal', note: '16:9' }
              ]}
            />
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
                    {current.source === 'kms' ? (
                      <img src={current.previewUrl} alt="" className="core-ref-thumb" />
                    ) : (
                      <img src={current.dataUrl} alt="" className="core-ref-thumb" />
                    )}
                    <span title={current.filename}>{current.filename}</span>
                    <em className="core-ref-origin">{current.source === 'kms' ? 'Knowledge base' : 'Unggahan'}</em>
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
                    <div className="core-ref-actions">
                      <button
                        type="button"
                        className="core-ref-upload"
                        onClick={() => {
                          if (!kmsPictures.length) void loadKmsPictures();
                          setOpenPicker(openPicker === slot ? null : slot);
                        }}
                      >
                        <ImageIcon size={14} /> Pilih dari knowledge base
                      </button>
                      <button type="button" className="core-ref-upload is-quiet" onClick={() => inputs.current[slot]?.click()}>
                        <Upload size={14} /> Unggah PNG / JPG
                      </button>
                    </div>

                    {openPicker === slot ? (
                      <div className="core-kms-picker">
                        {kmsState === 'loading' ? (
                          <p className="core-kms-note"><Loader2 size={13} className="core-spin" /> Memuat gambar…</p>
                        ) : kmsState === 'error' ? (
                          <p className="core-kms-note">Gagal memuat knowledge base. Coba lagi.</p>
                        ) : kmsPictures.length === 0 ? (
                          <p className="core-kms-note">
                            Belum ada gambar .png / .jpg / .jpeg di knowledge base workspace ini.
                          </p>
                        ) : (
                          <ul className="core-kms-grid">
                            {kmsPictures.map(picture => (
                              <li key={picture.id}>
                                <button
                                  type="button"
                                  className="core-kms-item"
                                  title={picture.title}
                                  onClick={() => chooseKms(slot, picture)}
                                >
                                  <img
                                    src={`/api/visual/references/${encodeURIComponent(picture.id)}/thumbnail?workspaceId=${encodeURIComponent(workspaceId)}`}
                                    alt={picture.title}
                                    loading="lazy"
                                  />
                                  <span>{picture.title}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
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
              <div><dt>Publikasi</dt><dd>{result.publication === 'poster' ? 'Poster / banner' : 'Social media'}</dd></div>
              <div><dt>Referensi gambar</dt><dd>{result.usedReferenceImage ? `Dipakai langsung (${result.referencesUsed})` : 'Teks saja'}</dd></div>
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
