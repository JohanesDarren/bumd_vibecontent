import type {
  KnowledgeDocument,
  BrandProfile,
  ContentBrief,
  GroundedCitation,
  QualityCheck,
  VideoScriptScene,
  VisualAsset
} from '../types/index.ts';

export interface RAGRetrievalResult {
  matchedChunks: Array<{
    document: KnowledgeDocument;
    section: string;
    page?: number;
    content: string;
    score: number;
    matchedKeywords: string[];
  }>;
  groundedCitations: GroundedCitation[];
  unsupportedClaims: string[];
  isAdequate: boolean;
  explanation: string;
}

export interface GeneratedOutput {
  title: string;
  content: string;
  scenes?: VideoScriptScene[];
  visualAsset?: VisualAsset;
  citations: GroundedCitation[];
  unsupportedClaims: string[];
  qualityCheck: QualityCheck;
}

// Perform client-side semantic & keyword retrieval over approved active documents
export function retrieveKnowledge(
  queryText: string,
  documents: KnowledgeDocument[],
  workspaceId: string
): RAGRetrievalResult {
  // CRITICAL REQUIREMENT: Only active documents in the current workspace!
  const activeDocs = documents.filter(
    doc => doc.workspaceId === workspaceId && doc.status === 'aktif'
  );

  const normalizedQuery = queryText.toLowerCase();
  const queryTokens = normalizedQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);

  const matchedChunks: RAGRetrievalResult['matchedChunks'] = [];

  activeDocs.forEach(doc => {
    doc.chunks.forEach(chunk => {
      let matchCount = 0;
      const matchedKeywords: string[] = [];
      const chunkText = (chunk.content + ' ' + chunk.section + ' ' + chunk.keywords.join(' ')).toLowerCase();

      // Check keywords
      chunk.keywords.forEach(kw => {
        if (normalizedQuery.includes(kw.toLowerCase())) {
          matchCount += 3;
          matchedKeywords.push(kw);
        }
      });

      // Check query tokens
      queryTokens.forEach(token => {
        if (chunkText.includes(token)) {
          matchCount += 1;
        }
      });

      if (matchCount > 0) {
        // Calculate score between 75 and 99
        const score = Math.min(99, 75 + matchCount * 4);
        matchedChunks.push({
          document: doc,
          section: chunk.section,
          page: chunk.page,
          content: chunk.content,
          score,
          matchedKeywords: Array.from(new Set(matchedKeywords))
        });
      }
    });
  });

  // Sort by highest score
  matchedChunks.sort((a, b) => b.score - a.score);

  // Take top matched chunks and convert to citations
  const topMatches = matchedChunks.slice(0, 3);
  const groundedCitations: GroundedCitation[] = topMatches.map((m, idx) => ({
    id: `cit-${Date.now()}-${idx}`,
    documentId: m.document.id,
    documentTitle: m.document.title,
    section: m.section,
    page: m.page,
    excerpt: m.content,
    relevanceScore: m.score,
    verified: true,
    claimExcerpt: m.content.substring(0, 80) + '...'
  }));

  // Detect potential unsupported topics
  const unsupportedClaims: string[] = [];
  const unsupportedTriggers = [
    { trigger: 'diskon 50%', label: 'Diskon 50% tiket/tarif' },
    { trigger: 'internasional', label: 'Layanan cabang internasional' },
    { trigger: 'uji lab mandiri', label: 'Uji lab air sumur mandiri (Status Dokumen masih DRAFT / Belum Disahkan)' },
    { trigger: 'gratis seumur hidup', label: 'Klaim gratis seumur hidup' },
    { trigger: 'hadiah undian mobil', label: 'Program hadiah undian mobil' }
  ];

  unsupportedTriggers.forEach(item => {
    if (normalizedQuery.includes(item.trigger)) {
      unsupportedClaims.push(item.label);
    }
  });

  // If matched chunks is 0, add a general unsupported notice
  const isAdequate = topMatches.length > 0;
  let explanation = '';
  if (!isAdequate) {
    explanation = 'Knowledge base aktif tidak memuat rujukan resmi yang memadai untuk topik brief ini. Konten dihasilkan dengan tanda peringatan [Perlu Verifikasi].';
    unsupportedClaims.push('Klaim faktual spesifik dalam brief belum ditemukan dalam dokumen aktif organisasi.');
  } else {
    explanation = `Ditemukan ${topMatches.length} rujukan resmi terverifikasi dari ${Array.from(new Set(topMatches.map(m => m.document.title))).length} dokumen aktif.`;
  }

  return {
    matchedChunks,
    groundedCitations,
    unsupportedClaims,
    isAdequate,
    explanation
  };
}

// Perform quality pre-flight check according to PRD F-09
export function runQualityCheck(
  content: string,
  brief: ContentBrief,
  brandProfile: BrandProfile,
  citations: GroundedCitation[],
  unsupportedClaims: string[]
): QualityCheck {
  const normalizedContent = content.toLowerCase();

  // 1. Check banned words
  const bannedWordsFound: string[] = [];
  brandProfile.bannedWords.forEach(b => {
    if (normalizedContent.includes(b.word.toLowerCase())) {
      bannedWordsFound.push(b.word);
    }
  });

  // 2. Check CTA
  const hasCta = Boolean(
    brief.cta && (
      normalizedContent.includes(brief.cta.toLowerCase().slice(0, 20)) ||
      brandProfile.officialCTAs.some(c => normalizedContent.includes(c.label.toLowerCase()) || normalizedContent.includes('hubungi') || normalizedContent.includes('unduh') || normalizedContent.includes('kunjungi'))
    )
  );

  // 3. Factual Grounding
  const totalClaims = citations.length + unsupportedClaims.length;
  const groundedClaims = citations.length;
  const groundingScore = totalClaims === 0 ? 80 : Math.round((groundedClaims / totalClaims) * 100);
  const groundingPassed = unsupportedClaims.length === 0;

  // 4. Tone Compliance
  let toneScore = 95;
  if (bannedWordsFound.length > 0) toneScore -= bannedWordsFound.length * 15;
  if (content.length < 50) toneScore -= 20;

  // 5. Brief Compliance
  let briefScore = 90;
  if (hasCta) briefScore += 5;
  if (brief.keyMessage && normalizedContent.includes(brief.keyMessage.toLowerCase().slice(0, 15))) {
    briefScore += 5;
  }
  briefScore = Math.min(100, briefScore);

  const overallStatus = (groundingPassed && bannedWordsFound.length === 0) ? 'siap_review' : 'perlu_verifikasi';

  return {
    briefCompliance: {
      score: briefScore,
      details: hasCta ? 'Pesan utama dan Call-to-Action tersemat sesuai brief.' : 'Pesan utama tercakup, disarankan melengkapi Call-to-Action resmi.',
      passed: briefScore >= 80
    },
    toneCompliance: {
      score: Math.max(50, toneScore),
      details: bannedWordsFound.length === 0 
        ? `Sesuai nada panduan merek (${brief.tone || 'Formal Korporat'}). Bebas dari istilah terlarang.`
        : `Ditemukan istilah yang tidak dianjurkan: "${bannedWordsFound.join(', ')}".`,
      passed: bannedWordsFound.length === 0
    },
    factualGrounding: {
      score: groundingScore,
      groundedClaims,
      totalClaims,
      ungroundedClaims: unsupportedClaims,
      passed: groundingPassed
    },
    bannedWordsFound,
    ctaCompliance: {
      hasCta,
      details: hasCta ? 'Call to action resmi telah disematkan.' : 'CTA belum terdeteksi secara eksplisit.'
    },
    overallStatus
  };
}

// Generate grounded BUMD corporate content
export function generateContentFromBrief(
  brief: ContentBrief,
  brandProfile: BrandProfile,
  documents: KnowledgeDocument[],
  workspaceId: string
): GeneratedOutput {
  // Run RAG
  const query = `${brief.title} ${brief.keyMessage} ${brief.targetAudience} ${brief.selectedProduct || ''}`;
  const rag = retrieveKnowledge(query, documents, workspaceId);

  let generatedText = '';
  let scenes: VideoScriptScene[] | undefined = undefined;
  let visualAsset: VisualAsset | undefined = undefined;

  const citations = rag.groundedCitations;
  const unsupported = rag.unsupportedClaims;

  const citationSummary = citations.length > 0
    ? citations.map((c, i) => `[${i + 1}] ${c.documentTitle} (${c.section})`).join('\n')
    : 'Belum ada rujukan dokumen aktif.';

  const ungroundedNotice = unsupported.length > 0
    ? `\n\n⚠️ CATATAN GROUNDING: ${unsupported.map(u => `[Perlu Verifikasi: ${u}]`).join(' ')}`
    : '';

  // Generate according to format
  if (brief.format === 'copy_caption') {
    generatedText = `[DRAFT KORPORAT - BELUM DISETUJUI]

📢 ${brief.title.toUpperCase()}

Sahabat ${brandProfile.organizationName},

${brief.keyMessage}

${citations.length > 0 ? `Berdasarkan ketentuan resmi:\n${citations.map(c => `• ${c.excerpt.slice(0, 140)}... [Rujukan: ${c.documentTitle}, Hal ${c.page || 1}]`).join('\n')}` : 'Informasi lebih lanjut akan diumumkan sesuai kebijakan resmi perumda.'}

${brief.limitations ? `📌 Catatan Penting: ${brief.limitations}\n` : ''}
${brief.cta || brandProfile.officialCTAs[0]?.text || 'Hubungi kanal resmi kami untuk informasi lebih lanjut.'}

#BUMDProfesional #${brandProfile.organizationName.replace(/\s+/g, '')} #LayananMasyarakat #InfoResmi${ungroundedNotice}`;
  } 
  else if (brief.format === 'teks_promosi') {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    generatedText = `[DRAFT SIARAN PERS / PENGUMUMAN RESMI]
Nomor Disposisi: DRAFT-${Date.now().toString().slice(-4)}

${brief.title.toUpperCase()}

${brandProfile.unitDepartment.toUpperCase()} — ${todayStr}

Dalam rangka memberikan pelayanan publik yang prima dan transparan bagi masyarakat ${brandProfile.organizationName}, kami menyampaikan pokok-pokok kebijakan dan informasi layanan sebagai berikut:

1. LATAR BELAKANG & TUJUAN
${brief.keyMessage} Target program ini ditujukan bagi ${brief.targetAudience} guna mewujudkan tata kelola layanan daerah yang akuntabel dan berkesinambungan.

2. KETENTUAN RESMI BERDASARKAN DOKUMEN KNOWLEDGE BASE
${citations.length > 0 ? citations.map((c, i) => `2.${i + 1}. ${c.excerpt} (Sumber: ${c.documentTitle}, ${c.section})`).join('\n\n') : '2.1. Ketentuan rinci menunggu pengesahan dokumen rujukan resmi.'}

3. KANAL LAYANAN & CALL TO ACTION
${brief.cta || brandProfile.officialCTAs[0]?.text || 'Silakan menghubungi pusat informasi resmi BUMD.'}

Sekretariat & Hubungan Masyarakat
${brandProfile.organizationName}
Kanal Komunikasi Resmi Terdaftar: ${brandProfile.approvedChannels.slice(0, 2).join(' | ')}${ungroundedNotice}`;
  } 
  else if (brief.format === 'naskah_singkat') {
    generatedText = `[DRAFT NASKAH VIDEO EDUKASI SINGKAT]
Judul: ${brief.title}
Target Durasi: 45 - 60 Detik
Format: Reels / TikTok / YouTube Shorts (9:16)
Pesan Utama: ${brief.keyMessage}
Rujukan Fakta Terkait:
${citationSummary}${ungroundedNotice}`;

    scenes = [
      {
        sceneNumber: 1,
        visualDirection: `Opening hook: Presenter atau talent tersenyum di depan latar instalasi/fasilitas ${brandProfile.organizationName}, membawa kartu informasi.`,
        audioNarration: `Talent: "Warga sudah tahu belum? Ada kabar penting dan resmi mengenai ${brief.keyMessage.slice(0, 45)}!"`,
        textOnScreen: `${brief.title.slice(0, 30).toUpperCase()} 📢`,
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 2,
        visualDirection: 'Kamera beralih ke infografis gerak yang memperlihatkan poin utama ketentuan rujukan resmi.',
        audioNarration: citations[0] 
          ? `Narator: "${citations[0].excerpt.slice(0, 110)}."`
          : `Narator: "Program ini hadir untuk mempermudah seluruh kebutuhan masyarakat."`,
        textOnScreen: citations[0] ? `SUMBER: ${citations[0].section.slice(0, 28)} 📑` : 'INFO LAYANAN RESMI',
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 3,
        visualDirection: 'Talent mempraktikkan langkah praktis (misal: mengakses portal/aplikasi atau menunjukkan bukti layanan).',
        audioNarration: `Talent: "${brief.limitations || 'Semua proses dapat diakses secara transparan dan tertib sesuai prosedur resmi.'}"`,
        textOnScreen: 'PROSES MUDAH & TRANSPARAN ✅',
        citationId: citations[1]?.id,
        citationNote: citations[1]?.documentTitle
      },
      {
        sceneNumber: 4,
        visualDirection: `Closing bumper: Logo resmi ${brandProfile.organizationName} dan informasi Call to Action resmi.`,
        audioNarration: `Narator: "${brief.cta || brandProfile.officialCTAs[0]?.text || 'Hubungi kami sekarang!'}"`,
        textOnScreen: `${brief.cta ? brief.cta.slice(0, 35) : 'INFO LEBIH LANJUT DI KANAL RESMI'} 📲`,
        citationId: undefined,
        citationNote: 'CTA Penutup'
      }
    ];
  } 
  else {
    // brief_visual
    generatedText = `[DRAFT PANDUAN VISUAL & GRAFIS KORPORAT]
Tema Desain: ${brief.title}
Warna Utama: ${brandProfile.organizationName} Official Color
Pesan Kunci: ${brief.keyMessage}
Ketentuan Brand: Logo resmi BUMD wajib ditempatkan di pojok kanan atas, tidak diubah proporsi atau warnanya.`;
  }

  // Create visual asset companion
  visualAsset = {
    id: `vis-${Date.now()}`,
    headline: brief.title.slice(0, 45).toUpperCase(),
    subheadline: brief.keyMessage.slice(0, 75),
    aspectRatio: brief.format === 'naskah_singkat' ? '9:16' : (brief.format === 'teks_promosi' ? '16:9' : '1:1'),
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    badgeText: 'PUBLIKASI RESMI BUMD',
    ctaText: brief.cta ? brief.cta.slice(0, 45) : (brandProfile.officialCTAs[0]?.label || 'Kunjungi Kanal Resmi'),
    disclaimer: brandProfile.officialDisclaimer || 'Berdasarkan dokumen resmi yang telah disahkan direksi.',
    visualPrompt: `Professional corporate graphic with clean layout for ${brandProfile.organizationName}, displaying "${brief.title.slice(0, 35)}", clean Indonesian typography, verified stamp badge, high contrast, official blue and cyan tones`,
    templateStyle: 'corporate'
  };

  // Run Pre-flight Quality check
  const qualityCheck = runQualityCheck(
    generatedText,
    brief,
    brandProfile,
    citations,
    unsupported
  );

  return {
    title: brief.title,
    content: generatedText,
    scenes,
    visualAsset,
    citations,
    unsupportedClaims: unsupported,
    qualityCheck
  };
}

// Quick Refinements (F-08)
export function refineDraftContent(
  currentContent: string,
  refinementType: 'concise' | 'formal' | 'persuasive' | 'x_thread',
  brandProfile: BrandProfile
): { newContent: string; summary: string } {
  const lines = currentContent.split('\n');

  if (refinementType === 'concise') {
    const shortened = lines
      .filter(line => line.trim().length > 0)
      .slice(0, Math.max(4, Math.floor(lines.length * 0.7)))
      .join('\n\n');
    return {
      newContent: `${shortened}\n\n${brandProfile.officialCTAs[0]?.text || ''}`,
      summary: 'Diringkas lebih padat dengan memangkas kalimat penjelas berulang.'
    };
  } 
  else if (refinementType === 'formal') {
    const formalHeader = `[FORMAT RESMI KORPORAT BUMD]\nKepada Yth. Seluruh Pemangku Kepentingan dan Pelanggan ${brandProfile.organizationName},\n\n`;
    const polished = currentContent
      .replace(/Sahabat/gi, 'Bapak/Ibu Pelanggan Terhormat')
      .replace(/Yuk,/gi, 'Kami mengimbau kepada seluruh masyarakat untuk')
      .replace(/Udah/gi, 'Sudah');
    return {
      newContent: formalHeader + polished,
      summary: 'Peningkatan tingkat formalitas bahasa sesuai kaidah tata naskah dinas BUMD.'
    };
  } 
  else if (refinementType === 'persuasive') {
    const persuasivePrefix = `✨ Kabar gembira dan solusi terbaik untuk kenyamanan Anda sekeluarga!\n\n`;
    return {
      newContent: persuasivePrefix + currentContent,
      summary: 'Penyesuaian gaya bahasa menjadi lebih persuasif dan mengajak peran aktif masyarakat.'
    };
  } 
  else {
    // X Thread format
    const threadParts = [
      `1/3 🧵 [PENGUMUMAN RESMI] ${brandProfile.organizationName}\n\n${lines.slice(0, 3).join(' ')}`,
      `2/3 📌 Ketentuan & Rujukan Resmi:\n${lines.slice(3, 7).join(' ')}`,
      `3/3 📲 Info lengkap & layanan pengaduan: ${brandProfile.officialCTAs[0]?.text || ''}`
    ];
    return {
      newContent: threadParts.join('\n\n---\n\n'),
      summary: 'Adaptasi format naskah menjadi utas/thread ringkas untuk kanal media sosial X.'
    };
  }
}
