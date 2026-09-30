import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveKnowledge } from './ragEngine.ts';
import type { KnowledgeDocument } from '../types/index.ts';

const base = { category: 'sop_layanan' as const, owner: 'Owner', version: '1', effectiveDate: '2026', uploadDate: '2026', fileSize: '1 KB', summary: '' };
const documents: KnowledgeDocument[] = [
  { ...base, id: 'active', workspaceId: 'ws-a', title: 'Aktif', status: 'aktif', chunks: [{ id: 'c1', documentId: 'active', section: 'Tarif', content: 'Tarif resmi air adalah 2800 rupiah.', keywords: ['tarif'] }] },
  { ...base, id: 'pending', workspaceId: 'ws-a', title: 'Pending', status: 'menunggu_persetujuan', chunks: [{ id: 'c2', documentId: 'pending', section: 'Promo', content: 'Diskon rahasia.', keywords: ['diskon'] }] },
  { ...base, id: 'foreign', workspaceId: 'ws-b', title: 'Tenant lain', status: 'aktif', chunks: [{ id: 'c3', documentId: 'foreign', section: 'Tarif', content: 'Tarif tenant lain.', keywords: ['tarif'] }] },
];

test('retrieval uses active documents from current workspace only', () => {
  const result = retrieveKnowledge('tarif resmi', documents, 'ws-a');
  assert.deepEqual([...new Set(result.matchedChunks.map(item => item.document.id))], ['active']);
});

test('unsupported query returns explicit inadequate fallback', () => {
  const result = retrieveKnowledge('layanan internasional', documents, 'ws-a');
  assert.equal(result.isAdequate, false);
  assert.match(result.explanation, /tidak memuat rujukan resmi/i);
  assert.ok(result.unsupportedClaims.length > 0);
});
