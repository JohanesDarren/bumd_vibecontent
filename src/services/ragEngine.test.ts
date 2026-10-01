import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContentFromBrief, retrieveKnowledge } from './ragEngine.ts';
import type { BrandProfile, ContentBrief, KnowledgeDocument } from '../types/index.ts';

const base = { category: 'sop_layanan' as const, owner: 'Owner', version: '1', effectiveDate: '2026', uploadDate: '2026', fileSize: '1 KB', summary: '' };
const documents: KnowledgeDocument[] = [
  { ...base, id: 'active', workspaceId: 'ws-a', title: 'Active', status: 'aktif', chunks: [{ id: 'c1', documentId: 'active', section: 'Tarif', content: 'Tarif resmi air adalah 2800 rupiah.', keywords: ['tarif'] }] },
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
  assert.match(result.explanation, /does not contain adequate official references/i);
  assert.ok(result.unsupportedClaims.length > 0);
});

test('generation never repeats an unsupported factual claim as fact', () => {
  const brief = { id:'b', workspaceId:'ws-a', title:'Promo', targetAudience:'Publik', format:'copy_caption', channel:'Instagram', tone:'Formal', keyMessage:'Diskon 50% tiket dan hadiah undian mobil', cta:'Review kanal resmi', language:'Bahasa Indonesia', createdAt:'2026', createdBy:'u' } satisfies ContentBrief;
  const brand = { workspaceId:'ws-a', organizationName:'BUMD Contoh', unitDepartment:'Humas', defaultLanguage:'Bahasa Indonesia', targetAudiences:['City residents'], toneOfVoice:['Formal'], terminology:[], bannedWords:[], officialCTAs:[], approvedChannels:['Instagram'], brandGuidelinesSummary:'', officialDisclaimer:'' } satisfies BrandProfile;
  const output = generateContentFromBrief(brief, brand, documents, 'ws-a');
  assert.doesNotMatch(output.content, /Diskon 50% tiket dan hadiah undian mobil/i);
  assert.match(output.content, /not yet available in active official sources/i);
});
