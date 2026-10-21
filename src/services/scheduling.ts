// Pure scheduling rules shared by the Penjadwalan Konten view (and its tests).
import type { ContentDraft, KnowledgeDocument, SchedulePillar, SchedulePlatform, ScheduledContent } from '../types/index.ts';

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Parse "YYYY-MM-DD" as a local date (not UTC, which shifts the day in WIB). */
export function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number) {
  const date = parseDateStr(dateStr);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

/** Monday of the week containing dateStr. */
export function startOfWeek(dateStr: string) {
  const day = parseDateStr(dateStr).getDay();
  return addDays(dateStr, day === 0 ? -6 : 1 - day);
}

/** A "scheduled" entry whose moment has passed but was never marked published. */
export function isOverdue(item: ScheduledContent, todayStr: string, nowTime: string) {
  return item.status === 'scheduled' && (item.date < todayStr || (item.date === todayStr && item.time < nowTime));
}

// ponytail: generic industry rules of thumb; replace with engagement data once Meta insights are connected.
export const SUGGESTED_TIME: Record<SchedulePlatform, string> = {
  instagram: '19:00',
  facebook: '12:00',
  twitter: '12:00',
  linkedin: '08:00',
  youtube: '17:00'
};

/** Writing instruction for the AI caption adaptation of one draft to one platform. */
export const CAPTION_STYLE: Record<SchedulePlatform, string> = {
  instagram: 'Ubah menjadi caption Instagram: kalimat pembuka yang menarik, paragraf pendek, emoji secukupnya, dan 3-5 tagar relevan di akhir. Maksimal 2.200 karakter.',
  facebook: 'Ubah menjadi post Facebook: ramah dan informatif, 1-3 paragraf pendek, maksimal 2 tagar.',
  twitter: 'Ubah menjadi post X (Twitter): maksimal 280 karakter termasuk spasi, langsung ke inti, maksimal 1 tagar.',
  linkedin: 'Ubah menjadi post LinkedIn: bahasa korporat formal dan profesional, tanpa emoji, 2-3 paragraf, maksimal 3 tagar.',
  youtube: 'Ubah menjadi deskripsi video YouTube: ringkasan 2-3 kalimat, lalu poin-poin penting.'
};

export const PILLARS: Record<SchedulePillar, { label: string; color: string }> = {
  edukasi: { label: 'Edukasi', color: '#8b5cf6' },
  layanan: { label: 'Layanan', color: '#06b6d4' },
  korporat: { label: 'Korporat', color: '#f59e0b' }
};

const DOCUMENT_STATUS_LABELS: Record<KnowledgeDocument['status'], string> = {
  aktif: 'Aktif',
  menunggu_persetujuan: 'Menunggu Persetujuan',
  usang: 'Usang',
  gagal_diproses: 'Gagal Diproses'
};

export function currentVersion(draft?: ContentDraft) {
  return draft?.versions.find(v => v.versionNumber === draft.currentVersionon) ?? draft?.versions[0];
}

/**
 * Fact conflicts between a schedule and the official documents its draft cites:
 * airing before a document takes effect, or citing a document that is no longer active.
 */
export function factConflicts(item: ScheduledContent, draft: ContentDraft | undefined, documents: KnowledgeDocument[]): string[] {
  const citations = currentVersion(draft)?.citations || [];
  const issues: string[] = [];
  for (const documentId of new Set(citations.map(c => c.documentId))) {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) {
      issues.push(`Dokumen sumber "${citations.find(c => c.documentId === documentId)?.documentTitle || documentId}" sudah tidak ada di Knowledge Base.`);
      continue;
    }
    if (doc.status !== 'aktif') issues.push(`Dokumen sumber "${doc.title}" berstatus ${DOCUMENT_STATUS_LABELS[doc.status]}.`);
    const effective = doc.effectiveDate?.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(effective || '') && item.date < effective!) {
      issues.push(`Tayang sebelum "${doc.title}" berlaku (${effective}).`);
    }
  }
  return issues;
}

export interface Moment {
  /** MM-DD, fixed every year. */
  monthDay: string;
  name: string;
  /** Keywords matched against the workspace sector; empty = relevant to every BUMD. */
  sectors: string[];
}

// ponytail: fixed-date observances only; movable holidays (Idul Fitri, Imlek, Nyepi…) change yearly,
// add them from the government SKB calendar per year if needed.
export const MOMENTS: Moment[] = [
  { monthDay: '01-01', name: 'Tahun Baru', sectors: [] },
  { monthDay: '03-22', name: 'Hari Air Sedunia', sectors: ['air', 'pdam', 'tirta', 'sanitasi'] },
  { monthDay: '04-21', name: 'Hari Kartini', sectors: [] },
  { monthDay: '04-22', name: 'Hari Bumi', sectors: [] },
  { monthDay: '05-01', name: 'Hari Buruh Internasional', sectors: [] },
  { monthDay: '05-02', name: 'Hari Pendidikan Nasional', sectors: [] },
  { monthDay: '05-20', name: 'Hari Kebangkitan Nasional', sectors: [] },
  { monthDay: '06-01', name: 'Hari Lahir Pancasila', sectors: [] },
  { monthDay: '06-05', name: 'Hari Lingkungan Hidup Sedunia', sectors: [] },
  { monthDay: '07-12', name: 'Hari Koperasi', sectors: [] },
  { monthDay: '07-27', name: 'Hari Sungai Nasional', sectors: ['air', 'pdam', 'tirta', 'sanitasi'] },
  { monthDay: '08-17', name: 'HUT Kemerdekaan RI', sectors: [] },
  { monthDay: '09-04', name: 'Hari Pelanggan Nasional', sectors: [] },
  { monthDay: '10-01', name: 'Hari Kesaktian Pancasila', sectors: [] },
  { monthDay: '10-27', name: 'Hari Listrik Nasional', sectors: ['listrik', 'energi'] },
  { monthDay: '10-28', name: 'Hari Sumpah Pemuda', sectors: [] },
  { monthDay: '11-10', name: 'Hari Pahlawan', sectors: [] },
  { monthDay: '11-12', name: 'Hari Kesehatan Nasional', sectors: [] },
  { monthDay: '11-19', name: 'Hari Toilet Sedunia', sectors: ['air', 'pdam', 'tirta', 'sanitasi'] },
  { monthDay: '12-03', name: 'Hari Bakti Pekerjaan Umum', sectors: ['air', 'pdam', 'tirta', 'infrastruktur', 'pekerjaan umum'] },
  { monthDay: '12-09', name: 'Hari Antikorupsi Sedunia', sectors: [] },
  { monthDay: '12-22', name: 'Hari Ibu', sectors: [] },
  { monthDay: '12-25', name: 'Hari Natal', sectors: [] }
];

/** Moments relevant to a workspace, keyed by full date, for one month (month is 0-based). */
export function momentsInMonth(year: number, month: number, sector = ''): Record<string, string[]> {
  const sectorText = sector.toLowerCase();
  const prefix = pad2(month + 1);
  const result: Record<string, string[]> = {};
  for (const moment of MOMENTS) {
    if (!moment.monthDay.startsWith(`${prefix}-`)) continue;
    if (moment.sectors.length && !moment.sectors.some(keyword => sectorText.includes(keyword))) continue;
    (result[`${year}-${moment.monthDay}`] ||= []).push(moment.name);
  }
  return result;
}

/** Future dates (today included) of a month that have no schedule at all. */
export function emptyFutureDates(year: number, month: number, todayStr: string, occupied: Set<string>): string[] {
  const days = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    if (dateStr >= todayStr && !occupied.has(dateStr)) dates.push(dateStr);
  }
  return dates;
}

/** Pillars under 20% of the period's tagged items (only meaningful from 4 items). */
export function weakPillars(items: { pillar?: SchedulePillar | null }[]): SchedulePillar[] {
  if (items.length < 4) return [];
  return (Object.keys(PILLARS) as SchedulePillar[]).filter(key => items.filter(i => i.pillar === key).length / items.length < 0.2);
}

/**
 * Days of the week with the strongest organic reach per platform. Used only as a
 * suggestion next to the date field; the user always keeps the final choice.
 */
export const SUGGESTED_WEEKDAY: Record<SchedulePlatform, number[]> = {
  instagram: [2, 3, 4],   // Tue-Thu
  facebook: [3, 4, 5],    // Wed-Fri
  twitter: [1, 2, 3],     // Mon-Wed
  linkedin: [2, 3, 4],    // Tue-Thu
  youtube: [5, 6, 0]      // Fri-Sun
};

export const WEEKDAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type ScheduleSlot = { date: string; time: string; weekday: string; reason: string };

/** Existing booking used to avoid collisions. */
export type BookedSlot = { date: string; time: string; platform?: string };

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Suggest a complete publication slot (date AND time) that is free.
 *
 * A schedule is only useful if it does not collide with what is already planned,
 * so the search walks forward from tomorrow, prefers the platform's best weekdays
 * and times, and skips any slot already occupied on that date. It always returns
 * a different slot as more content is scheduled.
 */
export function suggestPublishSlot(
  platform: SchedulePlatform,
  todayStr: string,
  booked: BookedSlot[] = [],
  options: { minLeadDays?: number; horizonDays?: number } = {}
): ScheduleSlot {
  const minLead = options.minLeadDays ?? 1;
  const horizon = options.horizonDays ?? 30;
  const preferredTimes = [SUGGESTED_TIME[platform], '12:00', '09:00', '20:00', '17:00', '08:00'];
  const preferredDays = SUGGESTED_WEEKDAY[platform] || [];
  const taken = new Set(booked.map(b => `${b.date}T${b.time}`));
  // One post per day per platform: piling several drafts onto the same date is
  // what made schedules feel "crashed". Only fall back to a second slot on the
  // same date when the whole horizon is otherwise busy.
  const busyDates = new Set(booked.map(b => b.date));

  const base = new Date(`${todayStr}T00:00:00`);
  let fallback: ScheduleSlot | null = null;

  for (let offset = minLead; offset <= horizon; offset++) {
    const day = new Date(base);
    day.setDate(base.getDate() + offset);
    const date = toDateString(day);
    const weekday = WEEKDAY_LABELS[day.getDay()];
    const dayScore = preferredDays.includes(day.getDay()) ? 0 : 1;

    const dayAlreadyUsed = busyDates.has(date);
    for (const time of preferredTimes) {
      if (taken.has(`${date}T${time}`)) continue;
      const slot: ScheduleSlot = {
        date,
        time,
        weekday,
        reason: dayScore === 0
          ? `${weekday} termasuk hari dengan jangkauan terbaik untuk ${platform}; jam ${time} WIB masih kosong.`
          : `${weekday} masih kosong pada jam ${time} WIB; hari terbaik ${platform} sudah terisi.`
      };
      if (dayScore === 0 && !dayAlreadyUsed) return slot;
      if (!fallback) fallback = slot;
    }

    // After the preferred weekdays pass, do not drift more than two weeks out.
    if (offset >= minLead + 14 && fallback) return fallback;
  }

  if (fallback) return fallback;
  // Everything in the horizon is booked: pick the first slot after the last booking.
  const latest = booked.map(b => b.date).sort().pop();
  const anchor = latest ? new Date(`${latest}T00:00:00`) : base;
  anchor.setDate(anchor.getDate() + 1);
  const date = toDateString(anchor);
  return { date, time: SUGGESTED_TIME[platform], weekday: WEEKDAY_LABELS[anchor.getDay()], reason: 'Semua slot dalam 30 hari terisi; ini slot berikutnya yang tersedia.' };
}

/** Compact list of the nearest free slots, for showing alternatives. */
export function suggestPublishSlots(platform: SchedulePlatform, todayStr: string, booked: BookedSlot[] = [], count = 3): ScheduleSlot[] {
  const out: ScheduleSlot[] = [];
  // Treat each suggested date as taken so the alternatives land on different days
  // instead of stacking several times on the same date.
  const used = [...booked];
  for (let i = 0; i < count; i++) {
    const slot = suggestPublishSlot(platform, todayStr, used);
    out.push(slot);
    used.push({ date: slot.date, time: slot.time });
    used.push({ date: slot.date, time: '00:00' });
    for (const t of ['08:00','09:00','12:00','17:00','19:00','20:00']) used.push({ date: slot.date, time: t });
  }
  return out;
}