import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContentFromBrief, refineDraftContent, retrieveKnowledge, reviewRagCopy, sanitizeRagAnswer, validateRagCopy } from './ragEngine.ts';
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
  assert.match(output.content, /\[DRAF PERLU VERIFIKASI:.*?\][\s\S]*Diskon 50% tiket dan hadiah undian mobil/);
  assert.match(output.content, /belum berhasil dicocokkan dengan dokumen resmi/i);
});

test('unverified fallback clearly separates draft status, conditions, and CTA without duplicate warnings', () => {
  const fallback = generateContentFromBrief(copyBrief, copyBrand, [], 'ws-a', {
    answer: '',
    citations: [],
    unsupportedClaims: ['Sumber resmi belum ditemukan.'],
    grounded: false
  });
  assert.equal((fallback.content.match(/DRAF PERLU VERIFIKASI/g) || []).length, 1);
  assert.equal((fallback.content.match(/Syarat dan ketentuan:/g) || []).length, 1);
  assert.equal((fallback.content.match(/Daftar melalui aplikasi TirtaApp/g) || []).length, 1);
  assert.match(fallback.content, /DRAF PERLU VERIFIKASI.*?\n\n\[DRAF KORPORAT/s);
  assert.doesNotMatch(fallback.content, /PERLU VERIFIKASI: periksa fakta/);
  assert.equal(fallback.qualityCheck.overallStatus, 'perlu_verifikasi');
});

const copyBrief = {
  id: 'brief-copy',
  workspaceId: 'ws-a',
  title: 'Promo Akhir Tahun Sambungan Air Baru 2026',
  campaign: 'Program Air Bersih Merata 2026',
  targetAudience: 'City residents',
  format: 'copy_caption',
  channel: 'Instagram Feed & Reels',
  tone: 'Friendly',
  keyMessage: 'Diskon 30% untuk biaya pemasangan sambungan air baru dari Rp1.250.000 menjadi Rp875.000. Berlaku hingga 31 Desember 2026. Biaya pasang dapat dicicil hingga 3 kali.',
  cta: 'Daftar melalui aplikasi TirtaApp atau hubungi Call Center HaloTirta di 1500-123.',
  limitations: 'Promo hanya berlaku untuk pelanggan rumah tangga R1 dan R2 dengan daya listrik maksimal 1300 VA.',
  language: 'Bahasa Indonesia',
  createdAt: '2026',
  createdBy: 'writer'
} satisfies ContentBrief;

const copyBrand = {
  workspaceId: 'ws-a',
  organizationName: 'Perumda Tirta Demo',
  unitDepartment: 'Humas',
  defaultLanguage: 'Bahasa Indonesia',
  targetAudiences: ['Warga rumah tangga'],
  toneOfVoice: ['Ramah'],
  terminology: [],
  bannedWords: [],
  officialCTAs: [{ id: 'cta-copy', channel: 'Instagram', label: 'Daftar', text: copyBrief.cta }],
  approvedChannels: ['Instagram'],
  brandGuidelinesSummary: '',
  officialDisclaimer: ''
} satisfies BrandProfile;

const copyCitation = {
  id: 'cit-copy',
  documentId: 'promo-official',
  documentTitle: 'Ketentuan Promo Sambungan Air',
  section: 'Promo akhir tahun',
  excerpt: 'Diskon 30% dari Rp1.250.000 menjadi Rp875.000. Berlaku hingga 31 Desember 2026. Cicilan hingga 3 kali. Berlaku untuk pelanggan rumah tangga R1 dan R2, daya listrik maksimal 1300 VA.',
  relevanceScore: 96,
  verified: true,
  claimExcerpt: 'Ketentuan promo sambungan air'
};

test('RAG answer validation rejects mixed-language and brief-inconsistent copy', () => {
  const noisy = 'Air Bersih untuk Rumah Tangga,是什么样 Biaya Ringan. Biaya sambungan Rp1.250.000, bayar tiga kali, doesn’t memberatkan surrounded于 kebutuhan lain. Air bersih bukan Discovering fasilitas, rightly goodbye began.';
  const issues = validateRagCopy(noisy, copyBrief, copyBrand, [copyCitation]);
  assert.ok(issues.some(issue => /aksara non-Latin/i.test(issue)));
  assert.ok(issues.some(issue => /bahasa|kata asing/i.test(issue)));
  assert.ok(issues.some(issue => /angka penting/i.test(issue)));

  const generated = generateContentFromBrief(copyBrief, copyBrand, [], 'ws-a', {
    answer: noisy,
    citations: [copyCitation],
    unsupportedClaims: [],
    grounded: true
  });
  assert.doesNotMatch(generated.content, /是什么样|crisscross|Discovering|surrounded/i);
  assert.ok(generated.content.includes(copyBrief.keyMessage));
  assert.ok(generated.content.includes(copyBrief.limitations));
  assert.equal(generated.qualityCheck.overallStatus, 'perlu_verifikasi');
  assert.ok(generated.unsupportedClaims.every(issue => !issue.includes('karakter dari aksara')));
  assert.match(generated.qualityCheck.briefCompliance.details, /aksara non-Latin/);
});

test('answer cleanup preserves paragraphs and valid brief-aligned Indonesian copy passes checks', () => {
  assert.equal(sanitizeRagAnswer('Paragraf pertama.\r\n\r\nParagraf kedua [1].'), 'Paragraf pertama.\n\nParagraf kedua.');
  const valid = 'Pasang sambungan air baru kini lebih hemat: biaya pemasangan turun 30% dari Rp1.250.000 menjadi Rp875.000, berlaku hingga 31 Desember 2026. Biaya pasang bisa dicicil hingga tiga kali, jadi tidak memberatkan. Promo berlaku untuk rumah tangga R1 dan R2 dengan daya listrik 1300 VA.';
  assert.deepEqual(validateRagCopy(valid, copyBrief, copyBrand, [copyCitation]), []);
  const echoed = `${copyBrief.keyMessage} Promo berlaku untuk rumah tangga R1 dan R2.`;
  assert.ok(validateRagCopy(echoed, copyBrief, copyBrand, [copyCitation]).some(issue => issue.includes('menyalin pesan kunci')));
});

test('a repaired Indonesian RAG answer can pass pre-flight without losing its citations', () => {
  const repaired = 'Warga rumah tangga, kini tersedia promo pemasangan sambungan air dengan potongan 30%. Biaya turun dari Rp1.250.000 menjadi Rp875.000 dan berlaku sampai 31 Desember 2026. Pembayaran dapat dilakukan dalam 3 kali cicilan.';
  const output = generateContentFromBrief(copyBrief, copyBrand, [], 'ws-a', {
    answer: repaired,
    citations: [copyCitation],
    unsupportedClaims: [],
    grounded: true
  });
  assert.deepEqual(validateRagCopy(repaired, copyBrief, copyBrand, [copyCitation]), []);
  assert.equal(output.qualityCheck.overallStatus, 'siap_review');
  assert.equal(output.citations[0].documentId, copyCitation.documentId);
  assert.doesNotMatch(output.content, /DRAF PERLU VERIFIKASI/);
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
  assert.match(output.content, /DRAF SIARAN PERS/);
  assert.match(output.content, /Biaya sambungan baru hanya Rp1\.250\.000/);
  assert.doesNotMatch(output.content, /BACKGROUND & OBJECTIVES|OFFICIAL PRESS RELEASE/);
  assert.doesNotMatch(output.content, /akuntabel dan berkelanjutan|Nomor Disposisi/);
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

test('copy with only warnings is still used and flagged for verification', () => {
  const loose = 'Mau pasang air bersih tanpa pusing? Biaya pemasangan turun 30% jadi Rp875.000 sampai 31 Desember 2026, dan bisa dicicil tiga kali. Kuota terbatas untuk 500 rumah pertama.';
  const review = reviewRagCopy(loose, copyBrief, copyBrand, [copyCitation]);
  assert.deepEqual(review.blocking, []);
  assert.ok(review.warnings.some(issue => issue.includes('500')));
  assert.ok(review.warnings.some(issue => issue.includes('1250000')));

  const generated = generateContentFromBrief(copyBrief, copyBrand, [], 'ws-a', {
    answer: loose,
    citations: [copyCitation],
    unsupportedClaims: [],
    grounded: true
  });
  assert.equal(generated.aiCopyUsed, true);
  assert.ok(generated.content.includes('Mau pasang air bersih tanpa pusing?'));
  assert.equal(generated.qualityCheck.overallStatus, 'perlu_verifikasi');
});

test('amounts written as "juta" satisfy key-message numbers', () => {
  const brief = { ...copyBrief, keyMessage: 'Harga sewa kios mulai dari Rp 5.000.000 per tahun.' };
  const review = reviewRagCopy('Cukup mulai Rp5 juta setahun, kios impian Anda siap ditempati.', brief, copyBrand, []);
  assert.deepEqual(review.blocking, []);
  assert.ok(!review.warnings.some(issue => issue.includes('angka penting')));
});

test('brief-only composed copy is used when no official document matches', () => {
  const composed = 'Kabar gembira untuk warga! Pasang sambungan air baru kini hemat 30%: dari Rp1.250.000 cukup Rp875.000, berlaku sampai 31 Desember 2026 dan bisa dicicil hingga 3 kali.';
  const generated = generateContentFromBrief(copyBrief, copyBrand, [], 'ws-a', {
    answer: '',
    citations: [],
    unsupportedClaims: ['Sumber resmi belum ditemukan.'],
    grounded: false,
    composedCopy: composed
  });
  assert.equal(generated.aiCopyUsed, true);
  assert.ok(generated.content.includes('Kabar gembira untuk warga!'));
  assert.ok(!generated.content.includes(copyBrief.keyMessage));
  assert.match(generated.content, /DRAF PERLU VERIFIKASI/);
});
