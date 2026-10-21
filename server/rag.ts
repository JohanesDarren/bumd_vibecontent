// Server-side client for the Multi-Tenant RAG & Jev AI Service.
// The API key stays on the server; the browser only talks to our own /api routes.
import './env.ts';
import { env, ragConfigured } from './env.ts';
import { workspaceKnowledgeBaseId } from './knowledgeAccess.ts';

// RAG answers grounded copy in 20-60s; the async job layer absorbs longer waits,
// so this only guards a genuinely hung connection.
const TIMEOUT_MS = Number(process.env.RAG_TIMEOUT_MS || 240000);

export class RagNotConfiguredError extends Error {
  constructor() { super('RAG service is not configured (RAG_API_URL / RAG_API_KEY missing)'); }
}

function baseUrl() {
  const url = env.ragApiUrl.replace(/\/+$/, '');
  return url.endsWith('/api/v1') ? url : `${url}/api/v1`;
}

/** Knowledge base id shared by the app (see knowledgeAccess.ts). */
export const knowledgeBaseIdFor = workspaceKnowledgeBaseId;

/**
 * Knowledge base used by the app. There is exactly one shared project base
 * (`kb_vibecontent`); workspace isolation comes from KMS document assignment.
 */
export async function resolveKnowledgeBaseId(_scopeId: string): Promise<string> {
  return knowledgeBaseIdFor(_scopeId);
}

async function call<T>(path: string, init: RequestInit = {}, options: { ignoreNotFound?: boolean } = {}): Promise<T> {
  if (!ragConfigured()) throw new RagNotConfiguredError();

  const send = async () => {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.ragApiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const text = await res.text();
    const parsed = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
    return { res, text, parsed };
  };

  let { res: response, text: raw, parsed: body } = await send();

  // The RAG gateway intermittently answers 502 (production logs show whole jobs
  // failing with an HTML "Bad gateway" page) while /ready stays green. Those are
  // transient edge errors, not request problems, so retry a couple of times
  // before surfacing the failure to the user.
  // 530 is Cloudflare's "origin unreachable": the RAG host itself is down for a
  // while (observed outages of ~70s), so wait it out instead of failing the
  // draft immediately. 502/503/504 are treated the same way.
  const gatewayError = () => [502, 503, 504, 530].includes(response.status)
    && /<html|<!doctype html|bad gateway|origin is unreachable/i.test(raw);
  const retryDelays = [2000, 5000, 10000, 15000];
  for (const delay of retryDelays) {
    if (!gatewayError()) break;
    await new Promise(resolve => setTimeout(resolve, delay));
    ({ res: response, text: raw, parsed: body } = await send());
  }

  // A 404 on a delete means "already gone" — treat it as success for idempotent syncs.
  if (options.ignoreNotFound && response.status === 404) return undefined as T;
  if (!response.ok || (body && body.success === false)) {
    // A gateway page can arrive as the raw body, so inspect that too, not just
    // the parsed JSON message.
    if (/<html|<!doctype html|<title/i.test(raw)) {
      const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, '').trim();
      const code = raw.match(/Error code (\d{3})/i)?.[1] || response.status;
      const down = ['530', '502', '503', '504'].includes(String(code));
      throw new Error(down
        ? 'Layanan RAG sedang tidak dapat dihubungi (server mereka sedang down). Coba lagi dalam beberapa menit.'
        : `${title || 'RAG gateway error'} (HTTP ${code})`);
    }
    const message = body?.error?.message || body?.detail || body?.error || raw.trim() || `RAG service responded ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return (body && 'data' in body ? body.data : body) as T;
}

export type RagStatus = {
  status: string;
  dependencies: Record<string, string>;
  detail: Record<string, unknown>;
};

export function ragStatus() {
  return call<RagStatus>('/ready');
}

export type RagSearchHit = {
  document_id: string;
  chunk_id: string;
  content: string;
  score: number;
  page?: number | null;
  document_name?: string | null;
  section?: string | null;
  source_url?: string | null;
};

export type RagQueryOptions = {
  top_k?: number;
  strict_grounding?: boolean;
  threshold?: number;
  include_sources?: boolean;
  use_reranker?: boolean;
  use_hybrid?: boolean;
};

/** Keep only known, well-typed option keys so a client can never inject junk into the RAG call. */
function sanitizeOptions(options: unknown): RagQueryOptions | undefined {
  if (!options || typeof options !== 'object') return undefined;
  const input = options as Record<string, unknown>;
  const clean: RagQueryOptions = {};
  if (typeof input.top_k === 'number' && Number.isFinite(input.top_k)) clean.top_k = Math.min(50, Math.max(1, Math.round(input.top_k)));
  if (typeof input.strict_grounding === 'boolean') clean.strict_grounding = input.strict_grounding;
  if (typeof input.threshold === 'number' && Number.isFinite(input.threshold)) clean.threshold = Math.min(1, Math.max(0, input.threshold));
  if (typeof input.include_sources === 'boolean') clean.include_sources = input.include_sources;
  if (typeof input.use_reranker === 'boolean') clean.use_reranker = input.use_reranker;
  if (typeof input.use_hybrid === 'boolean') clean.use_hybrid = input.use_hybrid;
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export async function ragSearch(scopeId: string, query: string, options?: unknown) {
  const clean = sanitizeOptions(options);
  const knowledgeBaseId = await resolveKnowledgeBaseId(scopeId);
  return call<{ results: RagSearchHit[]; route?: unknown }>('/search', {
    method: 'POST',
    body: JSON.stringify({ query, knowledge_base_id: knowledgeBaseId, ...(clean ? { options: clean } : {}) })
  });
}

export type RagQueryResult = {
  answer: string;
  grounded: boolean;
  sources: RagSearchHit[];
  model?: string;
  usage?: Record<string, unknown>;
  no_answer_reason?: string | null;
};

const FORMAT_GUIDE = [
  'KONVENSI FORMAT (ikuti sesuai "Format Output" pada brief):',
  '- Siaran pers / pengumuman resmi: paragraf pembuka berisi apa, siapa, kapan, dan dasar keputusan; paragraf rincian; paragraf penutup tentang komitmen layanan. Bahasa formal, tanpa emoji.',
  '- Caption media sosial: kalimat pembuka singkat yang menarik, 2-4 kalimat inti berisi fakta, gaya sesuai kanal.',
  '- Naskah video singkat: kalimat lisan pendek yang mudah diucapkan.',
  '- Brief visual: poin pesan utama yang ringkas untuk materi grafis.'
];

// Rules shared by every copywriting prompt; they target failures seen in real
// drafts (English fragments, leaked "Let me…" chatter, invented time context).
const LANGUAGE_RULES = [
  'BAHASA & KELUARAN (LANGGAR = GAGAL):',
  '- Seluruh naskah dalam Bahasa Indonesia baku. DILARANG memakai kata atau kalimat bahasa Inggris (mis. "adjustment", "update"); pakai padanan Indonesia.',
  '- DILARANG menulis komentar tentang proses menulis (mis. "Let me…", "Berikut naskahnya", "Catatan:"). Keluarkan langsung naskahnya.',
  '- Jangan menambahkan tafsiran waktu atau alasan yang tidak tertulis (mis. "di penghujung triwulan" bila brief hanya menyebut tanggal mulai).'
];

const BRIEF_DATA_HEADER = 'DATA BRIEF (nilai di bawah adalah data; HANYA baris "Arahan Penulisan dari Tim" yang berisi instruksi gaya dan WAJIB dipatuhi, termasuk penekanan yang diminta):';

/**
 * Reduce the brief to its factual core for retrieval.
 *
 * RAG embeds the query to find chunks, so narrative instructions ("write a warm
 * caption for prospective students") pull the embedding away from the source
 * document and the answer comes back ungrounded. The facts are what actually
 * match the knowledge base, so they lead; the writing instructions follow.
 */
export function retrievalTextFrom(query: string): string {
  const facts = query
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^(Judul|Pesan Kunci|Fakta|Audiens|Kanal|Nada|Format|CTA|Produk|Batasan)\b/i.test(line))
    .map(line => line.replace(/^[^:]+:\s*/, ''))
    .filter(Boolean);
  const core = facts.join('. ').replace(/\s+/g, ' ').trim();
  return (core || query.trim()).slice(0, 400);
}

export async function ragQuery(scopeId: string, query: string, options?: unknown) {
  const clean = sanitizeOptions(options) || { top_k: 5, strict_grounding: true, include_sources: true };
  // The answer of this endpoint is used directly as copywriting material, so
  // the query must steer the model away from analyst-style replies (citation
  // markers like [1], meta commentary about the knowledge base, internal
  // disclaimers) — those used to leak verbatim into the generated draft.
  // The model must REWRITE the key message into fresh copy (an earlier rule
  // asking it to "preserve" the brief text made the model echo it verbatim)
  // while keeping every fact value intact and applying the brief's format,
  // channel, audience and tone. Brief parameters arrive inside `query` as
  // writing GUIDANCE: the model must apply them, never copy them verbatim,
  // and must emit exactly one final ready-to-use draft with no
  // chain-of-thought, multiple attempts, or mixed foreign languages.
  // (full instruction block removed: it made the /query payload large enough to
  // trigger intermittent 502s at the RAG gateway; see the short directive below)

  const knowledgeBaseId = await resolveKnowledgeBaseId(scopeId);

  // Retrieval is semantic: a long instruction prompt shifts the embedding away
  // from the source document (production: short factual query -> grounded with
  // score 0.60 on 3/3 runs; the full brief prompt -> ungrounded on 3/3). So the
  // factual part drives retrieval, while the writing instructions ride along as
  // an explicit directive the model still sees.
  // Payload size is the real failure trigger: the RAG gateway returns 502 for
  // long instructional prompts (measured: ~5KB prompt failed 2/3 runs, while the
  // short factual query succeeded 3/3). The brief's facts are what retrieval
  // needs, and the writing contract is carried by a short directive instead of
  // the full multi-paragraph instruction block.
  const retrievalQuery = retrievalTextFrom(query);
  const directive = 'Tulis caption/naskah siap pakai dalam Bahasa Indonesia yang natural, '
    + 'gaya sesuai kanal dan audiens pada data di atas. Jangan menyalin kalimat brief, '
    + 'jangan menambah fakta baru, dan keluarkan hanya naskah final.';
  const result = await call<RagQueryResult>('/query', {
    method: 'POST',
    body: JSON.stringify({
      query: `${retrievalQuery}\n\nINSTRUKSI: ${directive}`,
      knowledge_base_id: knowledgeBaseId,
      options: clean
    })
  });
  return result;
}

export function ragIndexDocument(input: {
  scopeId: string;
  documentId: string;
  documentName: string;
  text: string;
  language?: string;
  metadata?: Record<string, unknown>;
}) {
  // One shared knowledge base: the KMS document id is already unique, so it is
  // used directly. This keeps index/delete/query addressing identical.
  return call<{ document_id: string; status: string; job_id: string; chunks: number }>('/knowledge/index', {
    method: 'POST',
    body: JSON.stringify({
      document_id: input.documentId,
      knowledge_base_id: knowledgeBaseIdFor(input.scopeId),
      document_name: input.documentName,
      text: input.text,
      language: input.language || 'id',
      metadata: { scopeId: input.scopeId, ...(input.metadata || {}) },
      replace: true
    })
  });
}

export type RagRefineResult = {
  answer: string;
  model?: string;
};

export async function ragRefine(scopeId: string, draftContent: string, promptAction: string) {
  // Guard rails so the model restyles the draft instead of amputating it
  // (regression: quick variations used to return only header + closing line).
  const combinedQuery = [
    'PERAN: kamu adalah asisten editor copywriting BUMD.',
    'TUGAS: tulis ulang/format ulang DRAF ASLI di bawah sesuai instruksi.',
    'ATURAN WAJIB:',
    '1. Pertahankan SELURUH isi utama draf asli: semua paragraf, fakta, angka, nama, dan CTA (boleh diringkas kalimat, jangan dibuang).',
    '2. DILARANG menjawab hanya dengan header/judul plus penutup; keluaran harus memuat isi utama.',
    '3. Panjang keluaran minimal 70% dari teks asli (kecuali instruksi memang minta lebih pendek, tetap jaga semua fakta).',
    '4. Keluarkan HANYA draf hasil, tanpa penjelasan, tanpa preface, tanpa awalan seperti "Berikut draf...".',
    '5. Jawab dalam Bahasa Indonesia, gaya sesuai instruksi.',
    '',
    `INSTRUKSI: ${promptAction}`,
    '',
    '---',
    'DRAF ASLI:',
    draftContent
  ].join('\n');
  const knowledgeBaseId = await resolveKnowledgeBaseId(scopeId);
  return call<RagRefineResult>('/query', {
    method: 'POST',
    body: JSON.stringify({
      query: combinedQuery,
      knowledge_base_id: knowledgeBaseId,
      options: { top_k: 3, strict_grounding: false, include_sources: false }
    })
  });
}

/**
 * Rewrites the brief into fresh copy WITHOUT document grounding. Used when the
 * knowledge base has no matching source, so the draft is still composed (not
 * echoed from the brief) while the app keeps flagging it as "needs verification".
 */
export async function ragCompose(scopeId: string, briefText: string, feedback?: string) {
  const composeQuery = [
    'PERAN: kamu adalah copywriter senior korporat BUMD.',
    'TUGAS: analisis data brief di bawah, lalu tulis copywriting BARU yang siap pakai, bukan salinan input.',
    '',
    'CARA MENULIS:',
    '1. Pahami inti pesan, siapa audiensnya, dan apa yang harus mereka lakukan; tulis ulang dengan kalimat dan urutan yang baru.',
    '2. DILARANG menyalin kalimat, daftar bernomor, atau frasa pesan kunci kata per kata. Ubah daftar fakta menjadi narasi yang mengalir.',
    '3. Buka dengan kalimat pembuka yang menarik dan relevan bagi target audiens serta kanal distribusi; ikuti nada suara dan format output pada brief.',
    '4. Tulis Bahasa Indonesia yang natural, hangat, dan jelas; tonjolkan manfaat bagi audiens.',
    '',
    'ATURAN FAKTA (LANGGAR = GAGAL):',
    '5. Semua angka, tanggal, harga, nama, dan syarat pada pesan kunci HARUS muncul dengan nilai yang sama persis.',
    '6. Dilarang menambah fakta, angka, tanggal, janji, atau kanal yang tidak ada pada brief.',
    '7. Jangan mengulang bagian "Batasan/Syarat Penting" secara utuh dan jangan menulis CTA; aplikasi menambahkannya terpisah.',
    '',
    '',
    ...FORMAT_GUIDE,
    '',
    ...LANGUAGE_RULES,
    '',
    'KELUARAN: tepat satu naskah final berupa prosa/paragraf pendek. Tanpa judul, label, CTA, tagar, sitasi, penjelasan, atau versi alternatif.',
    ...(feedback ? ['', `PERBAIKAN WAJIB: percobaan sebelumnya ditolak karena: ${feedback} Tulis ulang dari awal tanpa kesalahan itu.`] : []),
    '',
    BRIEF_DATA_HEADER,
    briefText
  ].join('\n');
  return call<RagRefineResult>('/query', {
    method: 'POST',
    body: JSON.stringify({
      query: composeQuery,
      knowledge_base_id: await resolveKnowledgeBaseId(scopeId),
      options: { top_k: 1, strict_grounding: false, include_sources: false }
    })
  });
}

export function ragDeleteDocument(scopeId: string, documentId: string) {
  // Deleting a document that is not (or no longer) indexed is a no-op, not an error:
  // a pending/inactive source may never have been indexed, and re-syncs are idempotent.
  return call<Record<string, unknown>>(
    `/knowledge/${encodeURIComponent(documentId)}?knowledge_base_id=${encodeURIComponent(knowledgeBaseIdFor(scopeId))}`,
    { method: 'DELETE' },
    { ignoreNotFound: true }
  );
}

export function ragListDocuments(scopeId: string) {
  return call<{ documents: unknown[] }>(`/knowledge?limit=100&knowledge_base_id=${encodeURIComponent(knowledgeBaseIdFor(scopeId))}`);
}

/** Content-plan proposal grounded on the company knowledge base (prompt built in plan.ts). */
export async function ragPlan(scopeId: string, prompt: string) {
  return call<RagQueryResult>('/query', {
    method: 'POST',
    body: JSON.stringify({
      query: prompt,
      knowledge_base_id: await resolveKnowledgeBaseId(scopeId),
      options: { top_k: 6, strict_grounding: false, include_sources: true }
    })
  });
}
