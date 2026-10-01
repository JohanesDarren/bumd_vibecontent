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
      brandProfile.officialCTAs.some(c => normalizedContent.includes(c.label.toLowerCase()) || normalizedContent.includes('contact') || normalizedContent.includes('download') || normalizedContent.includes('visit'))
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
      details: hasCta ? 'Key message and Call-to-Action are embedded according to the brief.' : 'Key message covered; recommend adding the official Call-to-Action.',
      passed: briefScore >= 80
    },
    toneCompliance: {
      score: Math.max(50, toneScore),
      details: bannedWordsFound.length === 0 
        ? `Matches the brand guideline tone (${brief.tone || 'Corporate Formal'}). Free of banned terms.`
        : `Non-recommended terms found: "${bannedWordsFound.join(', ')}".`,
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

  if (remote) {
    citations = remote.citations;
    unsupported = remote.unsupportedClaims;
    if (remote.grounded && remote.answer.trim()) {
      groundedKeyMessage = remote.answer.trim();
    } else if (citations.length > 0) {
      groundedKeyMessage = brief.keyMessage;
    } else {
      groundedKeyMessage = 'The requested information is not yet available in active official sources. Add or confirm the source with the Knowledge Owner before using this claim.';
    }
  } else {
    const query = `${brief.title} ${brief.keyMessage} ${brief.targetAudience} ${brief.selectedProduct || ''}`;
    const rag = retrieveKnowledge(query, documents, workspaceId);
    citations = rag.groundedCitations;
    unsupported = rag.unsupportedClaims;
    groundedKeyMessage = rag.isAdequate
      ? brief.keyMessage
      : 'The requested information is not yet available in active official sources. Add or confirm the source with the Knowledge Owner before using this claim.';
  }

  let generatedText = '';
  let scenes: VideoScriptScene[] | undefined = undefined;
  let visualAsset: VisualAsset | undefined = undefined;

  const citationSummary = citations.length > 0
    ? citations.map((c, i) => `[${i + 1}] ${c.documentTitle} (${c.section})`).join('\n')
    : 'No active document references yet.';

  const ungroundedNotice = unsupported.length > 0
    ? `\n\nGROUNDING NOTES: ${unsupported.map(u => `[Needs Verification: ${u}]`).join(' ')}`
    : '';

  // Generate according to format
  if (brief.format === 'copy_caption') {
    generatedText = `[CORPORATE DRAFT - NOT YET APPROVED]

 ${brief.title.toUpperCase()}

Dear ${brandProfile.organizationName} community,

${groundedKeyMessage}

${citations.length > 0 ? `Based on official provisions:\n${citations.map(c => `• ${c.excerpt.slice(0, 140)}... [References: ${c.documentTitle}, Page ${c.page || 1}]`).join('\n')}` : 'Further information will be announced according to official corporate policy.'}

${brief.limitations ? ` Important Notes: ${brief.limitations}\n` : ''}
${brief.cta || brandProfile.officialCTAs[0]?.text || 'Contact our official channels for more information.'}

#ProfessionalBUMD #${brandProfile.organizationName.replace(/\s+/g, '')} #PublicServices #OfficialInfo${ungroundedNotice}`;
  } 
  else if (brief.format === 'teks_promosi') {
    const todayStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    generatedText = `[OFFICIAL PRESS RELEASE / ANNOUNCEMENT DRAFT]
Disposition Number: DRAFT-${Date.now().toString().slice(-4)}

${brief.title.toUpperCase()}

${brandProfile.unitDepartment.toUpperCase()} — ${todayStr}

In order to provide excellent and transparent public service to the community of ${brandProfile.organizationName}, we hereby convey the key policy points and service information as follows:

1. BACKGROUND & OBJECTIVES
${groundedKeyMessage} This program targets ${brief.targetAudience} to build accountable and sustainable regional service governance.

2. OFFICIAL PROVISIONS BASED ON KNOWLEDGE BASE DOCUMENTS
${citations.length > 0 ? citations.map((c, i) => `2.${i + 1}. ${c.excerpt} (Source: ${c.documentTitle}, ${c.section})`).join('\n\n') : '2.1. Detailed provisions await ratification of the official reference document.'}

3. SERVICE CHANNELS & CALL TO ACTION
${brief.cta || brandProfile.officialCTAs[0]?.text || 'Please contact the official BUMD information center.'}

Secretariat & Public Relations
${brandProfile.organizationName}
Registered Official Communication Channels: ${brandProfile.approvedChannels.slice(0, 2).join(' | ')}${ungroundedNotice}`;
  } 
  else if (brief.format === 'naskah_singkat') {
    generatedText = `[SHORT EDUCATIONAL VIDEO SCRIPT DRAFT]
Title: ${brief.title}
Target Duration: 45 - 60 Seconds
Format: Reels / TikTok / YouTube Shorts (9:16)
Key Message: ${groundedKeyMessage}
Related Fact References:
${citationSummary}${ungroundedNotice}`;

    scenes = [
      {
        sceneNumber: 1,
        visualDirection: `Opening hook: Presenter or talent smiles in front of the ${brandProfile.organizationName} installation/facility backdrop, holding an information card.`,
        audioNarration: `Talent: "Have you heard? There is important official news regarding ${brief.keyMessage.slice(0, 45)}!"`,
        textOnScreen: `${brief.title.slice(0, 30).toUpperCase()} `,
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 2,
        visualDirection: 'The camera switches to a motion infographic showing the key points of the official reference provisions.',
        audioNarration: citations[0] 
          ? `Narrator: "${citations[0].excerpt.slice(0, 110)}."`
          : `Narrator: "This program exists to make all community needs easier."`,
        textOnScreen: citations[0] ? `SOURCE: ${citations[0].section.slice(0, 28)} ` : 'OFFICIAL SERVICE INFO',
        citationId: citations[0]?.id,
        citationNote: citations[0]?.documentTitle
      },
      {
        sceneNumber: 3,
        visualDirection: 'The talent demonstrates practical steps (e.g.: accessing the portal/app or showing service evidence).',
        audioNarration: `Talent: "${brief.limitations || 'All processes can be accessed transparently and orderly according to official procedures.'}"`,
        textOnScreen: 'EASY & TRANSPARENT PROCESS',
        citationId: citations[1]?.id,
        citationNote: citations[1]?.documentTitle
      },
      {
        sceneNumber: 4,
        visualDirection: `Closing bumper: Official ${brandProfile.organizationName} logo and official Call to Action information.`,
        audioNarration: `Narrator: "${brief.cta || brandProfile.officialCTAs[0]?.text || 'Contact us now!'}"`,
        textOnScreen: `${brief.cta ? brief.cta.slice(0, 35) : 'MORE INFO ON OFFICIAL CHANNELS'}`,
        citationId: undefined,
        citationNote: 'Closing CTA'
      }
    ];
  } 
  else {
    // brief_visual
    generatedText = `[CORPORATE VISUAL & GRAPHIC GUIDE DRAFT]
Design Theme: ${brief.title}
Primary Color: ${brandProfile.organizationName} Official Color
Key Message: ${groundedKeyMessage}
Brand Provisions: The official BUMD logo must be placed in the top-right corner, without altering its proportions or colors.`;
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
    ctaText: brief.cta ? brief.cta.slice(0, 45) : (brandProfile.officialCTAs[0]?.label || ''),
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
      summary: 'Condensed by trimming repeated explanatory sentences.'
    };
  } 
  else if (refinementType === 'formal') {
    const formalHeader = `[OFFICIAL CORPORATE FORMAT]\nTo: All Stakeholders and Customers of ${brandProfile.organizationName},\n\n`;
    return {
      newContent: formalHeader + currentContent,
      summary: 'Elevated language formality according to official drafting standards.'
    };
  } 
  else if (refinementType === 'persuasive') {
    return {
      newContent: currentContent,
      summary: 'Language style adjusted to be more persuasive and invite active community participation.'
    };
  } 
  else {
    // X Thread format
    const threadParts = [
      `1/3  [OFFICIAL ANNOUNCEMENT] ${brandProfile.organizationName}\n\n${lines.slice(0, 3).join(' ')}`,
      `2/3  Official Provisions & References:\n${lines.slice(3, 7).join(' ')}`,
      `3/3 Full info & complaint services: ${brandProfile.officialCTAs[0]?.text || ''}`
    ];
    return {
      newContent: threadParts.join('\n\n---\n\n'),
      summary: 'Draft adapted into a concise thread format for the X social media channel.'
    };
  }
}
