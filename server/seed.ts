import { ragConfigured } from './env.ts';
import { clearAllData, hashPassword, pool } from './database.ts';
import { knowledgeBaseIdFor, ragDeleteDocument, ragIndexDocument, ragListDocuments } from './rag.ts';

// Shared demo password for every seeded account.
const DEMO_PASSWORD = 'DemoPass123';

// Local demo seed: resets the database and inserts one workspace with a
// ready-to-use account for each role (admin, creator), plus a brand
// profile and one active knowledge document so the app is immediately usable.
const workspaceId = 'org-demo-tirta';
const companyId = 'co-demo-tirta';
const companyName = 'Perumda Tirta Demo Holding';

const avatar = (initials: string, color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="42" font-size="26" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// `globalRole` drives platform-wide access; `membership` is the workspace role
// (only creators are enrolled as workspace members in the three-tier model).
const users = [
  { id: 'usr-demo-admin', name: 'Andi Prasetyo', email: 'admin@tirta.demo', globalRole: 'superadmin', membership: null as string | null, title: 'Knowledge Administrator', department: 'Corporate Secretariat', initials: 'AP', color: '#0284c7' },

  { id: 'usr-demo-creator', name: 'Budi Santoso', email: 'creator@tirta.demo', globalRole: 'creator', membership: 'creator', title: 'Content Creator', department: 'Creative Communications', initials: 'BS', color: '#7c3aed' }
];

const brandProfile = {
  workspaceId,
  organizationName: 'Perumda Tirta Demo',
  unitDepartment: 'Public Relations',
  defaultLanguage: 'English',
  targetAudiences: ['City residents', 'BUMD customers', 'Business partners'],
  toneOfVoice: ['Formal Corporate', 'Friendly', 'Trustworthy'],
  terminology: [
    { term: 'Perumda', definition: 'Regional Public Company (Perusahaan Umum Daerah)', mandatory: true },
    { term: 'HaloTirta', definition: 'Official customer service center', mandatory: true }
  ],
  bannedWords: [
    { word: 'gratis', reason: 'Misleading for a paid service', suggestedReplacement: 'without additional charges' }
  ],
  officialCTAs: [
    { id: 'cta-demo-1', label: 'Contact Us', text: 'Contact the HaloTirta call center at 1500-123 for more information.', channel: 'All Channels' }
  ],
  approvedChannels: ['Instagram Feed & Reels', 'Facebook Page', 'Official Website'],
  brandGuidelinesSummary: 'Official voice for all Perumda Tirta Demo public communication.',
  officialDisclaimer: 'This material is based on official documents ratified by the board of directors.'
};

const document = {
  id: 'doc-demo-tariff',
  workspaceId,
  title: 'Board Decree No. 55/2026: Clean Water Service Tariff',
  category: 'tarif_resmi',
  owner: 'Corporate Secretariat',
  version: 'v1.0',
  effectiveDate: '2026',
  status: 'aktif',
  fileSize: '2.4 MB',
  summary: 'Regulates the new connection fee, water tariff rates, and installment options for customers.',
  chunks: [
    {
      id: 'chk-demo-tariff-1',
      section: 'Chapter 2 - New Connection Fees',
      page: 3,
      content: 'The new connection fee for residential customers is 1,250,000 rupiah, payable in up to 3 installments without interest.',
      keywords: ['sambungan', 'baru', 'tarif', 'air', 'installment', 'connection', 'fee', 'water']
    },
    {
      id: 'chk-demo-tariff-2',
      section: 'Chapter 4 - Monthly Water Tariff',
      page: 7,
      content: 'The monthly water tariff for the first 10 cubic meters is 2,800 rupiah per cubic meter for residential customers.',
      keywords: ['tarif', 'air', 'bulanan', 'monthly', 'water', 'tariff', 'rate']
    }
  ]
};

const citation = {
  id: 'cit-demo-1',
  documentId: 'doc-demo-tariff',
  documentTitle: 'Board Decree No. 55/2026: Clean Water Service Tariff',
  section: 'Chapter 2 - New Connection Fees',
  page: 3,
  excerpt: 'The new connection fee for residential customers is 1,250,000 rupiah, payable in up to 3 installments without interest.',
  relevanceScore: 92,
  verified: true,
  claimExcerpt: 'The new connection fee is 1,250,000 rupiah'
};

const qualityCheck = {
  briefCompliance: { score: 92, details: 'Key message and Call-to-Action are embedded according to the brief.', passed: true },
  toneCompliance: { score: 95, details: 'Matches the brand guideline tone (Formal Corporate). Free of banned terms.', passed: true },
  factualGrounding: { score: 100, groundedClaims: 1, totalClaims: 1, ungroundedClaims: [], passed: true },
  bannedWordsFound: [],
  ctaCompliance: { hasCta: true, details: 'Official call to action has been embedded.' },
  overallStatus: 'siap_review'
};

type DemoDraft = { id: string; title: string; format: string; status: string; content: string; changeSummary: string; withCitation: boolean };

const drafts: DemoDraft[] = [
  {
    id: 'dft-demo-1',
    title: 'Promo Sambungan Baru 2026',
    format: 'copy_caption',
    status: 'draft',
    content: `[CORPORATE DRAFT - NOT YET APPROVED]\n\nPROMO SAMBUNGAN BARU 2026\n\nWarga Bandung, saatnya pasang sambungan air bersih baru!\n\nBiaya sambungan baru untuk pelanggan rumah tangga sebesar Rp1.250.000 dan dapat diangsur hingga 3 kali tanpa bunga. Tarif air bulanan untuk 10 meter kubik pertama adalah Rp2.800 per meter kubik.\n\nContact the HaloTirta call center at 1500-123 for more information.`,
    changeSummary: 'Initial version',
    withCitation: true
  },
  {
    id: 'dft-demo-2',
    title: 'Pengumuman Penyesuaian Tarif Air Q4 2026',
    format: 'teks_promosi',
    status: 'menunggu_review',
    content: `[OFFICIAL PRESS RELEASE / ANNOUNCEMENT DRAFT]\n\nPENGUMUMAN PENYESUAIAN TARIF AIR Q4 2026\n\nPerumda Tirta Demo menyampaikan bahwa tarif air bulanan untuk pelanggan rumah tangga mengacu pada Board Decree No. 55/2026, yaitu Rp2.800 per meter kubik untuk 10 meter kubik pertama.\n\nInformasi lebih lanjut dapat diperoleh melalui layanan pelanggan resmi.`,
    changeSummary: 'Initial version',
    withCitation: true
  }
];

console.log('Resetting database and seeding demo data...');
await clearAllData();

await pool.query(
  `INSERT INTO companies(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,
  [companyId, companyName]
);

await pool.query(
  `INSERT INTO organizations(id,company_id,name,code,sector,city,tagline,primary_color,accent_color,description)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [workspaceId, companyId, 'Perumda Tirta Demo', 'TIRTA', 'Water Utility', 'Bandung', 'Serving the community with clean water', '#0284c7', '#0ea5e9', 'Demo workspace for local testing.']
);

for (const user of users) {
  await pool.query(
    `INSERT INTO users(id,name,email,avatar,title,department,password_hash,global_role,company_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [user.id, user.name, user.email, avatar(user.initials, user.color), user.title, user.department, await hashPassword(DEMO_PASSWORD), user.globalRole, user.globalRole === 'superadmin' ? null : companyId]
  );
  if (user.membership) {
    await pool.query(
      `INSERT INTO memberships(organization_id,user_id,role,active) VALUES($1,$2,$3,true)`,
      [workspaceId, user.id, user.membership]
    );
  }
}

await pool.query(
  `INSERT INTO brand_profiles(organization_id,data,updated_at) VALUES($1,$2::jsonb,now())
   ON CONFLICT(organization_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,
  [workspaceId, JSON.stringify(brandProfile)]
);

await pool.query(
  `INSERT INTO knowledge_sources(id,organization_id,company_id,title,category,owner,version,effective_date,status,file_size,summary)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [document.id, workspaceId, companyId, document.title, document.category, document.owner, document.version, document.effectiveDate, document.status, document.fileSize, document.summary]
  );
  await pool.query('INSERT INTO knowledge_source_workspaces(source_id,workspace_id,enabled) VALUES($1,$2,true)', [document.id, workspaceId]);
  for (const chunk of document.chunks) {
  await pool.query(
    `INSERT INTO knowledge_chunks(id,source_id,section,page,content,keywords) VALUES($1,$2,$3,$4,$5,$6)`,
    [chunk.id, document.id, chunk.section, chunk.page, chunk.content, chunk.keywords]
  );
}

for (const draft of drafts) {
  const creator = users.find(u => u.membership === 'creator')!;
  await pool.query(
    `INSERT INTO content_drafts(id,organization_id,brief_id,title,format,status,current_version,created_by,creator_name,visual_asset,approval_info,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,1,$7,$8,NULL,NULL,now(),now())`,
    [draft.id, workspaceId, null, draft.title, draft.format, draft.status, creator.id, creator.name]
  );
  await pool.query(
    `INSERT INTO draft_versions(draft_id,version_number,content,scenes,unsupported_claims,quality_check,created_at,created_by,change_summary)
     VALUES($1,1,$2,NULL,'[]'::jsonb,$3::jsonb,now(),$4,$5)`,
    [draft.id, draft.content, JSON.stringify(qualityCheck), creator.name, draft.changeSummary]
  );
  if (draft.withCitation) {
    await pool.query(
      `INSERT INTO draft_citations(id,draft_id,version_number,source_id,data) VALUES($1,$2,1,$3,$4::jsonb)`,
      [`${draft.id}-cit-1`, draft.id, document.id, JSON.stringify(citation)]
    );
  }
  await pool.query(
    `INSERT INTO audit_events(organization_id,actor_id,actor_name,actor_role,action,object_type,object_id,object_name,details)
     VALUES($1,$2,$3,'creator','New Draft Created','draft',$4,$5,'Saved to PostgreSQL')`,
    [workspaceId, creator.id, creator.name, draft.id, draft.title]
  );
}

for (const user of users.filter(u => u.globalRole === 'superadmin')) {
  await pool.query(
    `INSERT INTO audit_events(organization_id,actor_id,actor_name,actor_role,action,object_type,object_id,object_name,details)
     VALUES($1,$2,$3,'superadmin','Organization Created','brand_profile',$4,'Demo workspace','Saved to PostgreSQL')`,
    [workspaceId, user.id, user.name, workspaceId]
  );
}

if (ragConfigured()) {
  try {
    // The demo reset wipes the local DB but the remote KB persists; prune stale
    // entries first so old test documents cannot ground future answers.
    // Demo documents are indexed only to their assigned workspace scope.
        const kbId = knowledgeBaseIdFor(workspaceId);
        const listed = await ragListDocuments(workspaceId);
    const remoteIds: string[] = ((listed as any)?.documents || [])
      .map((e: any) => e?.document_id || e?.id)
      .filter(Boolean);
    let pruned = 0;
    for (const id of remoteIds) {
      try { await ragDeleteDocument(workspaceId, id); pruned++; } catch { /* already gone */ }
    }
    if (pruned > 0) console.log(`RAG: pruned ${pruned} stale document(s) from ${kbId}`);

    await ragIndexDocument({
      scopeId: workspaceId,
      documentId: document.id,
      documentName: document.title,
      text: document.chunks.map(chunk => `${chunk.section}\n${chunk.content}`).join('\n\n'),
      language: 'id',
      metadata: { category: document.category, owner: document.owner, version: document.version, effectiveDate: document.effectiveDate }
    });
    console.log(`RAG: indexed "${document.title}" -> ${kbId}`);
  } catch (error) {
    console.warn('RAG: indexing skipped —', error instanceof Error ? error.message : error);
  }
} else {
  console.warn('RAG: not configured, skipping indexing');
}

console.log('');
console.log('Demo workspace seeded:');
console.log(`  Workspace : Perumda Tirta Demo (${workspaceId})`);
console.log(`  Password  : ${DEMO_PASSWORD} (same for every account below)`);
for (const user of users) console.log(`  ${user.globalRole.padEnd(9)}: ${user.name} <${user.email}>`);
console.log(`  Knowledge : ${document.title} (active, ${document.chunks.length} chunks)`);
console.log(`  Drafts    : ${drafts.length} (${drafts.map(d => `${d.status}: ${d.title}`).join(', ')})`);
console.log('');

await pool.end();
