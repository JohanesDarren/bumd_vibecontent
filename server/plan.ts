// AI content planning: prompt building and strict parsing of the model's JSON slots.
// Kept free of I/O so it can be unit-tested without the RAG service or a database.

export const PLAN_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'] as const;
export const PLAN_PILLARS = ['edukasi', 'layanan', 'korporat'] as const;

export type PlanSlot = {
  date: string;
  time: string;
  platform: (typeof PLAN_PLATFORMS)[number];
  pillar: (typeof PLAN_PILLARS)[number] | null;
  title: string;
  angle: string;
  source: string;
};

export type PlanRequest = {
  mode: 'plan' | 'gap';
  monthLabel: string;
  theme: string;
  count: number;
  /** The only dates the model may use (future dates of the month, or the empty ones for "gap"). */
  dates: string[];
  platforms: string[];
  pillars: string[];
  moments: string[];
  existingTitles: string[];
};

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Validates and normalises a plan request coming from the browser. */
export function cleanPlanRequest(body: any): PlanRequest | string {
  const mode = body?.mode === 'gap' ? 'gap' : 'plan';
  const theme = clip(body?.theme, 200);
  if (mode === 'plan' && !theme) return 'Tema rencana wajib diisi.';
  const dates = (Array.isArray(body?.dates) ? body.dates : []).filter((d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31);
  if (!dates.length) return 'Tidak ada tanggal yang tersedia untuk direncanakan.';
  const platforms = (Array.isArray(body?.platforms) ? body.platforms : []).filter((p: string) => (PLAN_PLATFORMS as readonly string[]).includes(p));
  if (!platforms.length) return 'Pilih minimal satu platform.';
  const pillars = (Array.isArray(body?.pillars) ? body.pillars : []).filter((p: string) => (PLAN_PILLARS as readonly string[]).includes(p));
  const count = Math.min(12, Math.max(1, Math.round(Number(body?.count) || 8)));
  const list = (value: unknown, max: number) => (Array.isArray(value) ? value : []).map(v => clip(v, 120)).filter(Boolean).slice(0, max);
  return { mode, monthLabel: clip(body?.monthLabel, 40), theme, count, dates, platforms, pillars, moments: list(body?.moments, 20), existingTitles: list(body?.existingTitles, 40) };
}

export function buildPlanPrompt(req: PlanRequest): string {
  const task = req.mode === 'gap'
    ? `TUGAS: usulkan ${req.count} ide konten untuk mengisi hari kosong di kalender ${req.monthLabel}${req.theme ? ` dengan arah "${req.theme}"` : ''}.`
    : `TUGAS: susun rencana ${req.count} slot konten untuk ${req.monthLabel} dengan tema "${req.theme}".`;
  return [
    'PERAN: kamu adalah perencana konten media sosial senior untuk BUMD.',
    task,
    'Gunakan fakta dari dokumen resmi Knowledge Base. Jangan mengarang angka, tarif, tanggal berlaku, atau program yang tidak ada di dokumen.',
    '',
    'ATURAN:',
    `1. "date" HANYA boleh salah satu dari: ${req.dates.join(', ')}. Sebar slot merata, jangan menumpuk di satu tanggal.`,
    `2. "platform" HANYA salah satu dari: ${req.platforms.join(', ')}.`,
    `3. "pillar" salah satu dari: edukasi, layanan, korporat.${req.pillars.length ? ` Utamakan pilar: ${req.pillars.join(', ')}.` : ' Jaga keseimbangan ketiganya.'}`,
    '4. "time" format HH:MM (24 jam, WIB), sesuai kebiasaan audiens platform.',
    '5. "title" judul konten dalam Bahasa Indonesia baku, maksimal 80 karakter, tanpa kata bahasa Inggris.',
    '6. "angle" satu kalimat sudut pesan/isi utama. "source" judul dokumen resmi yang mendasari, atau "" bila tidak ada.',
    req.moments.length ? `7. Momen penting di periode ini (manfaatkan bila relevan): ${req.moments.join('; ')}.` : null,
    req.existingTitles.length ? `8. Jangan mengulang topik yang sudah dijadwalkan: ${req.existingTitles.join('; ')}.` : null,
    '',
    'KELUARAN: HANYA satu JSON array, tanpa teks lain, tanpa markdown. Contoh bentuk:',
    '[{"date":"2026-10-12","time":"19:00","platform":"instagram","pillar":"edukasi","title":"...","angle":"...","source":"..."}]'
  ].filter(line => line !== null).join('\n');
}

/** Extracts slots from a model answer; anything outside the constraints is dropped, never repaired. */
export function parsePlanSlots(answer: string, req: Pick<PlanRequest, 'dates' | 'platforms' | 'count'>): PlanSlot[] {
  const start = answer.indexOf('[');
  const end = answer.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try { raw = JSON.parse(answer.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const dates = new Set(req.dates);
  const seen = new Set<string>();
  const slots: PlanSlot[] = [];
  for (const item of raw as any[]) {
    const title = clip(item?.title, 120);
    const platform = String(item?.platform || '').toLowerCase();
    // Letters outside the Latin script mean the model derailed; skip rather than publish.
    if (!title || /(?!\p{Script=Latin})\p{L}/u.test(title)) continue;
    if (!dates.has(item?.date) || !req.platforms.includes(platform)) continue;
    const key = `${item.date}|${platform}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pillar = (PLAN_PILLARS as readonly string[]).includes(item?.pillar) ? item.pillar : null;
    slots.push({
      date: item.date,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item?.time) ? item.time : '09:00',
      platform: platform as PlanSlot['platform'],
      pillar,
      title,
      angle: clip(item?.angle, 300),
      source: clip(item?.source, 160)
    });
    if (slots.length >= req.count) break;
  }
  return slots;
}
