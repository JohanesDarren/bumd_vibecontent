// Label Bahasa Indonesia bersama untuk status, format, dan peran.
import type { DraftStatus, ContentFormat, UserRole } from '../types/index.ts';

export const STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Draf',
  menunggu_review: 'Menunggu Review',
  revisi_diminta: 'Revisi Diminta',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  diarsipkan: 'Diarsipkan'
};

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  copy_caption: 'Caption Media Sosial',
  teks_promosi: 'Teks Siaran Pers',
  naskah_singkat: 'Naskah Video 9:16',
  brief_visual: 'Panduan Visual'
};

export const ROLE_LABELS: Record<UserRole, string> = {
  creator: 'Kreator',
  corporate: 'Korporat',
  superadmin: 'Superadmin'
};

export function statusLabel(status: DraftStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatLabel(format: ContentFormat): string {
  return FORMAT_LABELS[format] ?? format;
}
