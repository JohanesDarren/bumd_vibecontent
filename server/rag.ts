// Server-side client for the Multi-Tenant RAG & Jev AI Service.
// The API key stays on the server; the browser only talks to our own /api routes.
import './env.ts';
import { env, ragConfigured } from './env.ts';

const TIMEOUT_MS = Number(process.env.RAG_TIMEOUT_MS || 60000);

export class RagNotConfiguredError extends Error {
  constructor() { super('RAG service is not configured (RAG_API_URL / RAG_API_KEY missing)'); }
}

function baseUrl() {
  const url = env.ragApiUrl.replace(/\/+$/, '');
  return url.endsWith('/api/v1') ? url : `${url}/api/v1`;
}

/** One knowledge base per workspace, derived server-side so a client can never target another tenant's KB. */
export function knowledgeBaseIdFor(workspaceId: string) {
  const safe = workspaceId.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 180);
  return `kb-vibecontent-${safe}`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!ragConfigured()) throw new RagNotConfiguredError();
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.ragApiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || (body && body.success === false)) {
    const message = body?.error?.message || body?.detail || body?.error || `RAG service responded ${response.status}`;
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

export function ragSearch(workspaceId: string, query: string, options?: unknown) {
  const clean = sanitizeOptions(options);
  return call<{ results: RagSearchHit[]; route?: unknown }>('/search', {
    method: 'POST',
    body: JSON.stringify({ query, knowledge_base_id: knowledgeBaseIdFor(workspaceId), ...(clean ? { options: clean } : {}) })
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

export function ragQuery(workspaceId: string, query: string, options?: unknown) {
  const clean = sanitizeOptions(options) || { top_k: 5, strict_grounding: true, include_sources: true };
  return call<RagQueryResult>('/query', {
    method: 'POST',
    body: JSON.stringify({
      query,
      knowledge_base_id: knowledgeBaseIdFor(workspaceId),
      options: clean
    })
  });
}

export function ragIndexDocument(input: {
  workspaceId: string;
  documentId: string;
  documentName: string;
  text: string;
  language?: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ document_id: string; status: string; job_id: string; chunks: number }>('/knowledge/index', {
    method: 'POST',
    body: JSON.stringify({
      document_id: input.documentId,
      knowledge_base_id: knowledgeBaseIdFor(input.workspaceId),
      document_name: input.documentName,
      text: input.text,
      language: input.language || 'id',
      metadata: { workspaceId: input.workspaceId, ...(input.metadata || {}) },
      replace: true
    })
  });
}

export function ragDeleteDocument(workspaceId: string, documentId: string) {
  return call<Record<string, unknown>>(
    `/knowledge/${encodeURIComponent(documentId)}?knowledge_base_id=${encodeURIComponent(knowledgeBaseIdFor(workspaceId))}`,
    { method: 'DELETE' }
  );
}

export function ragListDocuments(workspaceId: string) {
  return call<{ documents: unknown[] }>(`/knowledge?limit=100&knowledge_base_id=${encodeURIComponent(knowledgeBaseIdFor(workspaceId))}`);
}
