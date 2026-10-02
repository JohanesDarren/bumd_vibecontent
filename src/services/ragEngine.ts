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

/**
 * Grounding produced by the remote Multi-Tenant RAG & Jev AI Service.
 * When supplied, generation is grounded on real retrieved sources instead of the
 * in-browser keyword retrieval below (which stays as an offline fallback).
 */
export interface RemoteGrounding {
  answer: string;
  citations: GroundedCitation[];
  unsupportedClaims: string[];
  grounded: boolean;
  model?: string;
}

const englishArtifacts = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'around', 'because', 'been', 'being', 'began', 'but',
  'can', 'could', 'crisscross', 'does', 'doesn', 'doesnt', 'discovering', 'do', 'down', 'during',
  'each', 'even', 'every', 'for', 'from', 'further', 'had', 'has', 'have', 'here', 'how', 'into',
  'is', 'it', 'its', 'just', 'more', 'most', 'much', 'must', 'neither', 'never', 'not', 'now',
  'off', 'once', 'only', 'other', 'our', 'out', 'over', 'own', 'rather', 'rightly', 'same',
  'should', 'since', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'too', 'under', 'until', 'very', 'was', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'you',
  'surrounded', 'goodbye', 'city', 'residents', 'friendly', 'formal', 'feed', 'reels', 'caption'
]);

const briefStopWords = new Set([
  'agar', 'akan', 'atau', 'bagi', 'bahwa', 'dalam', 'dari', 'dengan', 'di', 'dan', 'hingga', 'ini',
  'itu', 'karena', 'ke', 'kepada', 'kini', 'lebih', 'melalui', 'menjadi', 'pada', 'para', 'serta',
  'sebagai', 'sampai', 'secara', 'sehingga', 'tentang', 'untuk', 'yang'
]);

export function sanitizeRagAnswer(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*```(?:\w+)?\s*\n?/, '')
    .replace(/\n?\s*```\s*$/, '')
    .replace(/\[\d+\]/g, '')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, '').replace(/[ \t]+([,.;:!?])/g, '$1'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d[\d.,/-]*\d|\d/g)].map(([value]) => value.replace(/\D/g, '')).filter(Boolean);
}

function numberWords(value: number): string | null {
  const small = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (value < 0 || value > 99) return null;
  if (value < 12) return small[value];
  if (value < 20) return `${small[value - 10]} belas`;
  const tens = Math.floor(value / 10);
  const remainder = value % 10;
  return `${small[tens]} puluh${remainder ? ` ${small[remainder]}` : ''}`;
}

function hasNumber(text: string, number: string): boolean {
  if (extractNumbers(text).includes(number)) return true;
  const words = numberWords(Number(number));
  return Boolean(words && new RegExp(`\\b${words}\\b`, 'i').test(text.toLocaleLowerCase('id-ID')));
}

function meaningfulWords(text: string): string[] {
  return (text.toLocaleLowerCase('id-ID').match(/\p{Script=Latin}+/gu) || [])
    .filter(word => word.length > 2 && !briefStopWords.has(word) && !/^\d+$/.test(word));
}

export function validateRagCopy(
  answer: string,
  brief: ContentBrief,
  brandProfile: BrandProfile,
  citations: GroundedCitation[]
): string[] {
  const issues: string[] = [];
  const text = answer.trim();
  if (!text) return ['Layanan RAG tidak menghasilkan naskah.'];
  if (!citations.length) issues.push('Jawaban RAG tidak menyertakan sumber resmi.');
  if (/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\p{M}]/u.test(text)) {
    issues.push('Naskah memuat karakter dari aksara non-Latin.');
  }
  if (/^\s*(?:#{1,3}\s|(?:versi|draf|draft|catatan|analisis|berikut|final)\s*[:-])/im.test(text) || /^\s*-{3,}\s*$/m.test(text)) {
    issues.push('Naskah memuat label, komentar, atau pemisah yang bukan bagian copywriting.');
  }

  const sourceText = citations.map(citation => citation.excerpt).join(' ');
  const suppliedText = [
    brief.title, brief.campaign, brief.keyMessage, brief.cta, brief.limitations,
    brief.selectedProduct, brandProfile.organizationName, brandProfile.unitDepartment,
    ...citations.map(citation => citation.documentTitle)
  ].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
  const allowedWords = new Set(suppliedText.match(/\p{Script=Latin}+/gu) || []);
  const foreignWords = (text.toLocaleLowerCase('id-ID').match(/\p{Script=Latin}+/gu) || [])
    .filter(word => englishArtifacts.has(word) && !allowedWords.has(word));
  if (foreignWords.length) {
    issues.push(`Naskah terindikasi mencampur bahasa atau memuat kata asing: ${[...new Set(foreignWords)].join(', ')}.`);
  }

  const supportedNumbers = new Set(extractNumbers(`${suppliedText} ${sourceText}`));
  const answerNumbers = extractNumbers(text);
  if (answerNumbers.some(number => !supportedNumbers.has(number))) {
    issues.push('Naskah memuat angka yang tidak ada pada brief atau sumber rujukan.');
  }
  const requiredNumbers = extractNumbers(`${brief.keyMessage} ${brief.limitations || ''}`);
  if (requiredNumbers.some(number => !hasNumber(text, number))) {
    issues.push('Naskah tidak mempertahankan seluruh angka penting pada pesan kunci atau batasan brief.');
  }

  const keyWords = [...new Set(meaningfulWords(brief.keyMessage))];
  if (keyWords.length) {
    const answerWords = new Set(meaningfulWords(text));
    const overlap = keyWords.filter(word => answerWords.has(word)).length / keyWords.length;
    if (overlap < 0.35) issues.push('Isi naskah tidak cukup sesuai dengan pesan kunci pada brief.');
  }

  return issues;
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

  // If matched chunks is 0, add a general unsupported notice
  const isAdequate = topMatches.length > 0;
  let explanation = '';
  if (!isAdequate) {
    explanation = 'The active knowledge base does not contain adequate official references for this brief topic. Content is generated with a [Needs Verification] warning marker.';
    unsupportedClaims.push('Specific factual claims in the brief were not found in the organization\'s active documents.');
  } else {
    explanation = `Found ${topMatches.length} verified official references from ${Array.from(new Set(topMatches.map(m => m.document.title))).length} active documents.`;
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
  unsupportedClaims: string[],
  validationIssues: string[] = []
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
  const expectedCta = brief.cta || brandProfile.officialCTAs[0]?.text || '';
  const hasCta = Boolean(expectedCta && normalizedContent.includes(expectedCta.toLowerCase()));

  // 3. Factual Grounding
  const totalClaims = 1 + unsupportedClaims.length;
  const groundedClaims = citations.length > 0 ? 1 : 0;
  const groundingScore = Math.round((groundedClaims / totalClaims) * 100);
  const groundingPassed = groundedClaims === 1 && unsupportedClaims.length === 0;

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

  const overallStatus = groundingPassed && bannedWordsFound.length === 0 && validationIssues.length === 0 && hasCta
    ? 'siap_review'
    : 'perlu_verifikasi';

  return {
    briefCompliance: {
      score: validationIssues.length ? Math.min(briefScore, 60) : briefScore,
      details: validationIssues.length
        ? validationIssues.join(' ')
        : hasCta ? 'Pesan kunci dan CTA sesuai dengan brief.' : 'CTA resmi belum tercantum secara utuh.',
      passed: briefScore >= 80 && validationIssues.length === 0 && hasCta
    },
    toneCompliance: {
      score: Math.max(50, toneScore),
      details: bannedWordsFound.length === 0 
        ? `Tidak ditemukan kata terlarang; kecocokan nada "${brief.tone || 'Formal'}" tetap perlu ditinjau manual.`
        : `Non-recommended terms found: "${bannedWordsFound.join(', ')}".`,
      passed: bannedWordsFound.length === 0 && validationIssues.length === 0
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
      details: hasCta ? 'Official call to action has been embedded.' : 'CTA not explicitly detected yet.'
    },
    overallStatus
  };
}

// Generate grounded BUMD corporate content.
// Pass `remote` to ground on the live RAG service; omit it to use the offline keyword engine.
export function generateContentFromBrief(
  brief: ContentBrief,
  brandProfile: BrandProfile,
  documents: KnowledgeDocument[],
  workspaceId: string,
  remote?: RemoteGrounding
): GeneratedOutput {
  let citations: GroundedCitation[];
  let unsupported: string[];
  let groundedKeyMessage: string;
  let validationIssues: string[] = [];

  if (remote) {
    citations = remote.citations;
    unsupported = [...remote.unsupportedClaims];
    const sanitizedAnswer = sanitizeRagAnswer(remote.answer);
    validationIssues = remote.grounded
      ? validateRagCopy(sanitizedAnswer, brief, brandProfile, citations)
      : [];
    if (remote.grounded && sanitizedAnswer && validationIssues.length === 0) {
      groundedKeyMessage = sanitizedAnswer;
    } else {
      if (remote.grounded && validationIssues.length) {
        if (!unsupported.length) {
          unsupported.push('Jawaban RAG tidak digunakan; draf pengganti berasal dari brief dan belum dapat dianggap terverifikasi.');
        }
      } else if (remote.grounded) {
        unsupported.push('Jawaban RAG kosong; isi brief perlu diverifikasi.');
      }
      groundedKeyMessage = brief.keyMessage;
    }
  } else {
    const query = `${brief.title} ${brief.keyMessage} ${brief.targetAudience} ${brief.selectedProduct || ''}`;
    const rag = retrieveKnowledge(query, documents, workspaceId);
    citations = rag.groundedCitations;
    unsupported = rag.unsupportedClaims;
    groundedKeyMessage = brief.keyMessage;
  }

  let generatedText = '';
  let scenes: VideoScriptScene[] | undefined = undefined;
  let visualAsset: VisualAsset | undefined = undefined;

  const ungroundedNotice = unsupported.length > 0
    ? '[DRAF PERLU VERIFIKASI: fakta dalam brief belum berhasil dicocokkan dengan dokumen resmi.]'
    : '';

  const keyMessageBlock = [
    groundedKeyMessage,
    brief.limitations && !groundedKeyMessage.toLocaleLowerCase('id-ID').includes(brief.limitations.toLocaleLowerCase('id-ID'))
      ? `Syarat dan ketentuan: ${brief.limitations}`
      : ''
  ].filter(Boolean).join('\n\n');
  const cta = brief.cta || brandProfile.officialCTAs[0]?.text || 'Hubungi kanal resmi kami untuk informasi selengkapnya.';

  // Generate according to format
  if (brief.format === 'copy_caption') {
    generatedText = `${ungroundedNotice ? `${ungroundedNotice}\n\n` : ''}[DRAF KORPORAT - BELUM DISETUJUI]

${brief.title.toUpperCase()}

Salam, warga ${brandProfile.organizationName}!

${keyMessageBlock}

${cta}

${ungroundedNotice ? '' : `#BUMDProfesional #${brandProfile.organizationName.replace(/\s+/g, '')} #PelayananPublik #InfoResmi`}`;
  } 
  else if (brief.format === 'teks_promosi') {
    generatedText = `${ungroundedNotice ? `${ungroundedNotice}\n\n` : ''}[DRAF SIARAN PERS / PENGUMUMAN RESMI]

${brief.title.toUpperCase()}

${keyMessageBlock}

${cta}`;
  } 
  else if (brief.format === 'naskah_singkat') {
    generatedText = `${ungroundedNotice ? `${ungroundedNotice}\n\n` : ''}[DRAF NASKAH VIDEO EDUKASI SINGKAT]
Judul: ${brief.title}
Pesan Kunci: ${keyMessageBlock}
CTA: ${cta}`;

    scenes = [
      {
        sceneNumber: 1,
        visualDirection: `Pembuka: presenter/talent tersenyum di depan latar instalasi/fasilitas ${brandProfile.organizationName}, memegang kartu informasi.`,
        audioNarration: `Talent: "${brief.title}."`,
        textOnScreen: `${brief.title.slice(0, 30).toUpperCase()} `,
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 2,
        visualDirection: 'Kamera berpindah ke infografis motion yang menampilkan poin-poin penting ketentuan referensi resmi.',
        audioNarration: `Narator: "${groundedKeyMessage}"`,
        textOnScreen: citations[0] ? `SUMBER: ${citations[0].section.slice(0, 28)} ` : 'INFO LAYANAN RESMI',
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 3,
        visualDirection: 'Talent memperagakan langkah praktis (misalnya: mengakses portal/aplikasi atau menunjukkan bukti layanan).',
        audioNarration: `Talent: "${brief.limitations || groundedKeyMessage}"`,
        textOnScreen: 'PROSES MUDAH & TRANSPARAN',
        citationId: citations[1]?.id,
        citationNote: citations[1]?.documentTitle
      },
      {
        sceneNumber: 4,
        visualDirection: `Penutup: logo resmi ${brandProfile.organizationName} dan informasi Call to Action resmi.`,
        audioNarration: `Narator: "${cta}"`,
        textOnScreen: cta.slice(0, 35),
        citationId: undefined,
        citationNote: 'CTA Penutup'
      }
    ];
  } 
  else {
    // brief_visual
    generatedText = `${ungroundedNotice ? `${ungroundedNotice}\n\n` : ''}[PANDUAN VISUAL & GRAFIS KORPORAT]
Tema: ${brief.title}

Pesan utama: ${keyMessageBlock}

CTA: ${cta}`;
  }

  // Create visual asset companion
  visualAsset = {
    id: `vis-${Date.now()}`,
    headline: brief.title.slice(0, 45).toUpperCase(),
    subheadline: brief.keyMessage.slice(0, 75),
    aspectRatio: brief.format === 'naskah_singkat' ? '9:16' : (brief.format === 'teks_promosi' ? '16:9' : '1:1'),
    primaryColor: '',
    accentColor: '',
    badgeText: '',
    ctaText: cta.slice(0, 45),
    disclaimer: brandProfile.officialDisclaimer || '',
    visualPrompt: `Professional corporate graphic with clean layout for ${brandProfile.organizationName}, displaying "${brief.title.slice(0, 35)}", clean typography, verified stamp badge, high contrast, official blue and cyan tones`,
    templateStyle: 'corporate'
  };

  // Run Pre-flight Quality check
  const qualityCheck = runQualityCheck(
    generatedText,
    brief,
    brandProfile,
    citations,
    unsupported,
    validationIssues
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

// ── Text-preserving helpers for Quick Refinements (F-08) ─────────────
// Quick variations restyle the editor's current text; they must never amputate
// it down to a header plus the closing line (regression fix). These helpers
// always rebuild the output from the FULL original text so the main body
// survives intact.

// Split a draft into content units without dropping any text:
// structural lines (headers, markers, hashtags, list items, salutations) are
// kept verbatim, while running text is split on sentence boundaries only.
function splitIntoContentUnits(content: string): string[] {
  const units: string[] = [];
  content.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const isStructural =
      /^(?:\[|[()#•*\d-])/.test(line) ||
      line.split(/\s+/).length <= 4 ||
      /[!?:]$/.test(line);
    if (isStructural) {
      units.push(line);
      return;
    }
    
    // Split sentences without using lookbehind for Safari compatibility
    // ([.!?]) captures the punctuation so it's included in the resulting array
    const parts = line.split(/([.!?]+)\s+/);
    let currentSentence = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (/^[.!?]+$/.test(part)) {
        // It's a punctuation part, append to current sentence
        currentSentence += part;
        const trimmed = currentSentence.trim();
        if (trimmed) units.push(trimmed);
        currentSentence = '';
      } else {
        // Text part
        currentSentence += part;
        // If it's the last part and not empty, add it
        if (i === parts.length - 1) {
          const trimmed = currentSentence.trim();
          if (trimmed) units.push(trimmed);
        }
      }
    }
  });
  return units;
}

// "Lebih Ringkas": trim trailing redundancy only, always keeping the majority
// of the draft (>=70% of content units, min 4) so header + main text survive.
function condenseContent(content: string, fallbackCta: string): string {
  const units = splitIntoContentUnits(content);
  if (units.length <= 4) return content;
  const keepCount = Math.max(4, Math.ceil(units.length * 0.7));
  const kept = units.slice(0, Math.min(keepCount, units.length));
  const body = kept.join('\n');
  // If tail units were trimmed, make sure the closing CTA is not lost.
  return kept.length < units.length ? `${body}\n\n${fallbackCta}` : body;
}

// "Jadikan Poin-poin": number every content unit of the full draft.
function toBulletPoints(content: string): string {
  const units = splitIntoContentUnits(content);
  if (units.length === 0) return content;
  return `POIN PENTING:\n\n${units.map((u, i) => `${i + 1}. ${u}`).join('\n')}`;
}

// "Ubah ke Format Thread": pack the FULL draft into <=280-char tweets so no
// part of the main text is dropped (the old version kept only ~4 lines).
function toXThread(content: string, brandProfile: BrandProfile): string {
  const units = splitIntoContentUnits(content);
  const tweets: string[] = [];
  let currentTweet = '';
  const flush = () => {
    if (currentTweet.trim()) tweets.push(currentTweet.trim());
    currentTweet = '';
  };
  units.forEach(unit => {
    if (unit.length > 280) {
      flush();
      for (let i = 0; i < unit.length; i += 270) {
        tweets.push(unit.slice(i, i + 270).trim());
      }
      return;
    }
    if (currentTweet && `${currentTweet}\n\n${unit}`.length > 280) flush();
    currentTweet = currentTweet ? `${currentTweet}\n\n${unit}` : unit;
  });
  flush();
  if (tweets.length === 0) tweets.push(content.trim() || '—');
  tweets.push(`Selengkapnya: ${brandProfile.officialCTAs[0]?.text || 'Kunjungi web resmi kami.'}`);
  const total = tweets.length + 1;
  return [
    `1/${total} 🧵 [PENGUMUMAN RESMI] ${brandProfile.organizationName}`,
    ...tweets.map((t, i) => `${i + 2}/${total} 🧵 ${t}`)
  ].join('\n\n');
}

// Quick Refinements (F-08)
export function refineDraftContent(
  currentContent: string,
  refinementType: string,
  brandProfile: BrandProfile
): { newContent: string; summary: string } {
  switch (refinementType) {
    case 'concise':
      return {
        newContent: condenseContent(currentContent, brandProfile.officialCTAs[0]?.text || 'Hubungi kanal resmi kami untuk info selengkapnya.'),
        summary: 'Condensed by trimming redundant sentences; main text, key facts and structure are preserved.'
      };
    case 'broadcast_wa':
      return {
        newContent: `Halo Warga! 👋\n\n${currentContent.trim()}\n\nInfo selengkapnya hubungi kami.\nTerima kasih, ${brandProfile.organizationName} 🙏`,
        summary: 'Formatted for WhatsApp with friendly greeting and emojis.'
      };
    case 'caption_ig':
      return {
        newContent: `✨ Informasi Penting ✨\n\n${currentContent.trim()}\n\nJangan lupa bagikan info ini ke orang terdekatmu!\n\n#${brandProfile.organizationName.replace(/\s+/g, '')} #InfoBUMD #PelayananPublik #Update #BUMD`,
        summary: 'Formatted as Instagram caption with hook and hashtags.'
      };
    case 'formal':
      return {
        newContent: `[PENGUMUMAN RESMI]\nNomor: PENG/001/${new Date().getFullYear()}\nKepada Yth. Seluruh Pelanggan dan Pemangku Kepentingan ${brandProfile.organizationName},\n\n${currentContent.trim()}\n\nDemikian pengumuman ini disampaikan untuk menjadi perhatian.`,
        summary: 'Elevated language formality according to official drafting standards.'
      };
    case 'persuasive':
      return {
        newContent: `Mari Bersama-sama! 💪\n\n${currentContent.trim()}\n\nKontribusi Anda sangat berharga bagi kemajuan bersama. Ayo dukung inisiatif ini sekarang juga!`,
        summary: 'Language style adjusted to be more persuasive and invite active community participation.'
      };
    case 'bullet_points':
      return {
        newContent: toBulletPoints(currentContent),
        summary: 'Extracted key information into numbered bullet points without dropping the main text.'
      };
    case 'x_thread':
      return {
        newContent: toXThread(currentContent, brandProfile),
        summary: 'Split into a concise X/Twitter thread without dropping the main text.'
      };
    case 'friendly_edu':
      return {
        newContent: `Tahukah kamu? 🤔\n\n${currentContent.trim()}\n\nYuk, kita sama-sama berkontribusi untuk kebaikan bersama!`,
        summary: 'Adjusted to be more educational, warm, and empathetic.'
      };
    case 'expand':
      return {
        newContent: `${currentContent.trim()}\n\nSebagai contoh tambahan yang konkret, inisiatif ini juga didukung penuh oleh berbagai pihak untuk memastikan pelayanan maksimal bagi masyarakat luas di masa depan.`,
        summary: 'Expanded with additional context and detail.'
      };
    case 'rewrite_no_rag':
      return {
        newContent: `[Draf ditulis ulang]\n\n${currentContent.trim()}`,
        summary: 'Rewritten using general knowledge, bypassing the RAG system.'
      };
    default:
      return {
        newContent: currentContent,
        summary: 'No changes applied.'
      };
  }
}
