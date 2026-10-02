import type { RagHit } from './apiService';

// Server-side "guard rails" for the RAG service.
//
// The upstream RAG model routinely returns long, markdown-formatted answers that
// mix relevant and irrelevant sections, and it can state numbers that are not in
// the retrieved chunks. These pure helpers keep the final response on-track:
//   1. only chunks above the configured relevance threshold are trusted;
//   2. the answer is sanitised and capped;
//   3. numeric claims that are not present in an accepted chunk are flagged;
//   4. with no accepted evidence we fall back to an explicit "not available".

/** RAG returns relevance in 0..1; tolerate 0..100 too. */
export function normalizeScore(score: unknown): number {
  const value = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  const ratio = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, ratio));
}

/** Strip markdown/noise, drop meta prefixes, and cap length at a sentence boundary. */
export function sanitizeAnswer(raw: string, maxSentences = 4, maxChars = 700): string {
  if (!raw) return '';
  let text = raw
    .replace(/```[\s\S]*?```/g, ' ')            // fenced code blocks
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')          // headings
    .replace(/\*\*(.*?)\*\*/g, '$1')             // bold
    .replace(/\*(.*?)\*/g, '$1')                 // italic
    .replace(/^\s*[-*•]\s+/gm, '')               // bullet markers
    .replace(/`([^`]*)`/g, '$1')                 // inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // markdown links
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // Remove a leading meta label such as "Jawaban:" / "Answer:".
  text = text.replace(/^(jawaban|answer)\s*[:\-]\s*/i, '');

  // Protect thousand separators (e.g. "1.250.000") so they are not mistaken
  // for sentence boundaries while splitting.
  const DOT = '\u0001';
  const protectedText = text.replace(/(\d)\.(?=\d)/g, `$1${DOT}`);
  const sentences = (protectedText.match(/[^.!?\n]+[.!?]?/g) || [])
    .map(part => part.trim())
    .filter(Boolean);
  let out = sentences.slice(0, maxSentences).join(' ').split(DOT).join('.');
  if (!out) out = text;
  if (out.length > maxChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  }
  return out.trim();
}

/** Extract significant numeric tokens (amounts, percentages, years) as strings of digits. */
export function extractNumericClaims(text: string): string[] {
  const tokens = text.match(/\d+(?:[.,]\d+)*/g) || [];
  const claims = new Set<string>();
  const seenDigits = new Set<string>();
  for (const token of tokens) {
    const digits = token.replace(/[^\d]/g, '');
    // Keep the original, human-readable token (e.g. "9.999.000") but only once.
    if (digits.length >= 3 && !seenDigits.has(digits)) {
      seenDigits.add(digits);
      claims.add(token);
    }
  }
  return [...claims];
}

function digitsOnly(text: string): string {
  return text.replace(/(\d)[.,](?=\d)/g, '$1').replace(/[^\d]/g, '');
}

/** True when a numeric claim appears somewhere in the accepted excerpts. */
export function isClaimSupported(claim: string, excerpts: string[]): boolean {
  const digits = claim.replace(/[^\d]/g, '');
  if (!digits) return true;
  return excerpts.some(excerpt => digitsOnly(excerpt).includes(digits));
}

export interface RagGuardInput {
  answer?: string;
  grounded?: boolean;
  sources?: RagHit[];
  /** Relevance threshold 0..1 (from the grounding scale). */
  threshold: number;
  maxSentences?: number;
  maxChars?: number;
}

export interface RagGuardResult {
  answer: string;
  grounded: boolean;
  usedFallback: boolean;
  /** Only chunks at or above the threshold. */
  sources: RagHit[];
  droppedSources: number;
  unsupportedClaims: string[];
  notes: string[];
}

const FALLBACK_ANSWER = 'Informasi yang diminta belum tersedia di dokumen aktif. Tambahkan atau konfirmasi sumber resminya sebelum informasi ini dipakai sebagai fakta.';

export function guardRagResponse(input: RagGuardInput): RagGuardResult {
  const threshold = normalizeScore(input.threshold);
  const allSources = input.sources || [];
  const kept = allSources.filter(hit => normalizeScore(hit.score) >= threshold);
  const droppedSources = allSources.length - kept.length;
  const notes: string[] = [];
  if (droppedSources > 0) {
    notes.push(`${droppedSources} sumber di bawah ambang relevansi ${(threshold * 100).toFixed(0)}% diabaikan.`);
  }

  const sanitized = sanitizeAnswer(input.answer || '', input.maxSentences ?? 4, input.maxChars ?? 700);
  const hasEvidence = kept.length > 0;
  const grounded = Boolean(input.grounded) && hasEvidence && sanitized.length > 0;

  if (!grounded) {
    const reason = input.grounded
      ? 'Jawaban RAG tidak didukung sumber yang memenuhi ambang relevansi.'
      : 'Klaim faktual tidak ditemukan pada dokumen aktif.';
    notes.push('Tidak ada bukti yang cukup — draf memakai informasi fallback yang ditandai perlu verifikasi.');
    return {
      answer: FALLBACK_ANSWER,
      grounded: false,
      usedFallback: true,
      sources: kept,
      droppedSources,
      unsupportedClaims: [reason],
      notes
    };
  }

  const excerpts = kept.map(hit => (typeof hit.content === 'string' ? hit.content : ''));
  const unverified = extractNumericClaims(sanitized).filter(claim => !isClaimSupported(claim, excerpts));
  const unsupportedClaims: string[] = [];
  if (unverified.length > 0) {
    unsupportedClaims.push(`Angka berikut pada jawaban tidak ditemukan pada sumber terpilih: ${unverified.join(', ')}.`);
    notes.push(`${unverified.length} klaim angka tidak cocok dengan kutipan sumber dan ditandai perlu verifikasi.`);
  }

  return {
    answer: sanitized,
    grounded: true,
    usedFallback: false,
    sources: kept,
    droppedSources,
    unsupportedClaims,
    notes
  };
}
