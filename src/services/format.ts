/**
 * Locale helpers.
 *
 * Dates used to render in mixed formats ("10/30/2026, 01:32 PM" in the library
 * and comments, "25 Okt 2026, 20.10" in the audit log). One formatter keeps the
 * whole app on Indonesian conventions.
 */

const LOCALE = 'id-ID';

/** "30 Okt 2026" */
export function formatDate(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "30 Okt 2026, 20.10" */
export function formatDateTime(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** "20.10" */
export function formatTime(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}
