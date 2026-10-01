import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContentFromBrief, refineDraftContent, retrieveKnowledge } from './ragEngine.ts';
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
  // The brief's key message must survive, but always wrapped in the explicit
  // verification marker so it is never presented as a grounded fact.
  assert.match(output.content, /\[PERLU VERIFIKASI\] Diskon 50% tiket dan hadiah undian mobil/);
  assert.match(output.content, /belum ditemukan pada dokumen resmi aktif/i);
});

// ── Quick variation regressions: the main text must never be dropped ──
const refineBrand = {
  workspaceId: 'ws-a',
  organizationName: 'BUMD Contoh',
  unitDepartment: 'Humas',
  defaultLanguage: 'Bahasa Indonesia',
  targetAudiences: [],
  toneOfVoice: [],
  terminology: [],
  bannedWords: [],
  officialCTAs: [{ id: 'cta-1', channel: 'Instagram', label: 'Kunjungi', text: 'Kunjungi kanal resmi kami.' }],
  approvedChannels: ['Instagram'],
  brandGuidelinesSummary: '',
  officialDisclaimer: ''
} satisfies BrandProfile;

const fullDraft = [
  '[CORPORATE DRAFT - NOT YET APPROVED]',
  '',
  'JUDUL PENGUMUMAN',
  '',
  'Kalimat pembuka yang menjelaskan konteks program dengan cukup panjang.',
  'Paragraf isi pertama berisi fakta utama angka tarif resmi 2800 rupiah.',
  'Paragraf isi kedua menjelaskan mekanisme layanan secara rinci dan lengkap.',
  'Paragraf isi ketiga menegaskan jadwal pemberlakuan mulai minggu depan.',
  '',
  'Kunjungi kanal resmi kami untuk informasi selengkapnya.',
  '',
  '#ProfessionalBUMD #BUMDContoh'
].join('\n');

const mainBodyMissing = (result: string) =>
  !result.includes('fakta utama angka tarif resmi 2800 rupiah') ||
  !result.includes('mekanisme layanan secara rinci dan lengkap') ||
  !result.includes('jadwal pemberlakuan');

test('quick variations keep the main body text intact', () => {
  ['concise', 'broadcast_wa', 'caption_ig', 'formal', 'persuasive', 'bullet_points', 'x_thread', 'friendly_edu', 'expand', 'rewrite_no_rag'].forEach(id => {
    const { newContent } = refineDraftContent(fullDraft, id, refineBrand);
    assert.equal(mainBodyMissing(newContent), false, `variation "${id}" dropped the main body text`);
  });
});

test('concise variation keeps the majority of the draft', () => {
  const { newContent } = refineDraftContent(fullDraft, 'concise', refineBrand);
  assert.match(newContent, /jadwal pemberlakuan|Kunjungi kanal resmi/);
});

test('press release template follows brief language (Indonesian) and keeps brief facts', () => {
  const brief = { id:'b2', workspaceId:'ws-a', title:'Promo Sambungan Air', targetAudience:'Warga kota', format:'teks_promosi' as const, channel:'Facebook Page', tone:'Trustworthy', keyMessage:'Biaya sambungan baru hanya Rp1.250.000 dan bisa dicicil 3 kali.', cta:'Hubungi call center', language:'Bahasa Indonesia', createdAt:'2026', createdBy:'u' } satisfies ContentBrief;
  const brand = { workspaceId:'ws-a', organizationName:'Perumda Tirta Demo', unitDepartment:'Humas', defaultLanguage:'Bahasa Indonesia', targetAudiences:[], toneOfVoice:[], terminology:[], bannedWords:[], officialCTAs:[], approvedChannels:['Facebook Page'], brandGuidelinesSummary:'', officialDisclaimer:'' } satisfies BrandProfile;
  const output = generateContentFromBrief(brief, brand, documents, 'ws-a');
  assert.match(output.content, /LATAR BELAKANG & TUJUAN/);
  assert.match(output.content, /Biaya sambungan baru hanya Rp1\.250\.000/);
  assert.doesNotMatch(output.content, /BACKGROUND & OBJECTIVES|OFFICIAL PRESS RELEASE/);
});

test('x_thread variation packs the whole draft into numbered tweets', () => {
  const { newContent } = refineDraftContent(fullDraft, 'x_thread', refineBrand);
  const tweetBodies = newContent.split(/\n\n/).filter(part => /^\d+\/\d+ 🧵/.test(part));
  assert.ok(tweetBodies.length >= 2, 'expected the thread to have multiple tweets');
  tweetBodies.forEach(tweet => {
    assert.ok(tweet.length <= 280 + 12, 'tweet exceeds 280 characters including its prefix');
  });
  assert.match(newContent, /2800 rupiah/);
});
