import { pool, saveKnowledgeSource } from '../server/database.ts';
import { ragDeleteDocument, ragIndexDocument, ragSearch } from '../server/rag.ts';

const chunks = [
  {
    section: 'Batas penggunaan dan sumber kebenaran',
    content: 'Panduan umum untuk perusahaan rintisan teknologi yang mengembangkan perangkat lunak dan perangkat keras. Panduan ini bukan profil resmi perusahaan dan tidak membuktikan fitur, spesifikasi, harga, pelanggan, sertifikasi, kinerja, ketersediaan, garansi, atau tingkat layanan produk tertentu. Untuk setiap materi publik, gunakan dokumen resmi aktif pada knowledge base workspace sebagai sumber fakta. Jika fakta belum tersedia, jangan mengarang atau menjanjikannya; minta konfirmasi pemilik produk.'
  },
  {
    section: 'Siklus hidup perangkat lunak',
    content: 'Saat menjelaskan produk perangkat lunak, verifikasi nama dan fungsi fitur, platform yang didukung, kebutuhan akun atau jaringan, batas penggunaan, integrasi, versi, ketersediaan, keamanan, privasi, pemeliharaan, dan jalur dukungan melalui dokumentasi resmi yang berlaku. Bedakan fitur yang sudah tersedia dari fitur uji coba, rencana, atau pengembangan. Jangan menyatakan angka uptime, performa, skala, enkripsi, kepatuhan, SLA, atau kompatibilitas tanpa bukti resmi.'
  },
  {
    section: 'Siklus hidup perangkat keras',
    content: 'Saat menjelaskan perangkat keras, verifikasi model, komponen, dimensi, bahan, daya, lingkungan operasi, kompatibilitas, konektivitas, pemasangan, keselamatan, firmware, pemeliharaan, garansi, stok, dan layanan purna jual dari lembar spesifikasi atau kebijakan resmi. Jangan menebak kemampuan teknis, hasil uji, umur pakai, ketahanan, sertifikasi, ketersediaan, atau syarat garansi.'
  },
  {
    section: 'Produk gabungan perangkat lunak dan perangkat keras',
    content: 'Untuk solusi yang menggabungkan perangkat lunak dan perangkat keras, periksa alur data, koneksi, dependensi, versi firmware dan aplikasi, konfigurasi, kebutuhan jaringan, kompatibilitas, pengelolaan akses, privasi, keamanan, serta proses pemulihan. Nyatakan prasyarat dan batasan yang terdokumentasi. Jangan mengklaim integrasi, pemantauan jarak jauh, otomatisasi, atau perlindungan tertentu jika belum tertulis dalam sumber resmi.'
  },
  {
    section: 'Kerangka komunikasi produk startup teknologi',
    content: 'Susun komunikasi dengan urutan: masalah pengguna yang telah divalidasi, audiens yang dituju, solusi dan kemampuan yang benar-benar tersedia, bukti atau demonstrasi yang dapat diperiksa, batasan yang relevan, lalu ajakan bertindak yang resmi. Gunakan bahasa konkret dan mudah dipahami; jelaskan istilah teknis seperlunya. Hindari klaim seperti paling canggih, tanpa risiko, dijamin, revolusioner, atau penghematan tertentu tanpa pembanding dan bukti yang disetujui.'
  },
  {
    section: 'Pemeriksaan sebelum publikasi',
    content: 'Sebelum materi diterbitkan, cocokkan setiap nama, angka, tanggal, harga, spesifikasi, manfaat, perbandingan, kutipan, tautan, syarat, serta ajakan bertindak dengan sumber aktif. Pastikan materi sesuai kanal dan audiens, tidak mengungkap data rahasia atau pribadi, tidak memberi janji yang belum disetujui, dan menyebut batasan secara jelas. Eskalasi klaim teknis, keamanan, privasi, keselamatan, hukum, atau regulasi kepada penanggung jawab sebelum publikasi.'
  }
];

const workspaceChunks = (name: string) => [
  {
    section: 'Cakupan workspace',
    content: `Panduan kerja untuk knowledge base workspace ${name}. Nama workspace tidak menjelaskan lini produk, pelanggan, atau kemampuan perusahaan; jangan menyimpulkan hal tersebut dari namanya. Gunakan sumber resmi aktif yang ditetapkan untuk workspace ini sebagai bukti fakta. Panduan umum perusahaan tersedia melalui dokumen umum yang ditetapkan untuk seluruh workspace.`
  },
  {
    section: 'Catatan fakta yang harus tersedia',
    content: 'Sebelum membuat konten faktual, pastikan sumber resmi menjelaskan: nama produk dan pemiliknya; masalah pengguna; target audiens; fitur yang sudah tersedia; spesifikasi atau kebutuhan teknis; harga dan syarat; status ketersediaan; dukungan dan garansi; batasan; bukti klaim; serta CTA dan kanal resmi. Jika belum tercantum, tandai untuk konfirmasi dan jangan mengisi dengan asumsi.'
  },
  {
    section: 'Alur singkat penulisan dan pemeriksaan',
    content: 'Tentukan tujuan dan kanal; pilih fakta yang relevan dari dokumen aktif workspace; tulis manfaat hanya sejauh didukung fakta; pisahkan fakta dari hipotesis atau rencana; periksa angka, nama, versi, tanggal, syarat, dan tautan; minta persetujuan pemilik klaim berisiko; lalu simpan versi final beserta ringkasan sumber. Jangan menyalin data internal, rahasia dagang, kredensial, atau data pribadi ke materi publik.'
  }
];

function makeDocument(id: string, workspaceId: string, title: string, owner: string, sections: typeof chunks, assignments: { workspaceId: string; enabled: boolean }[]) {
  return {
    id,
    workspaceId,
    workspaceAssignments: assignments,
    title,
    category: 'sop_layanan' as const,
    owner,
    version: '1.0',
    effectiveDate: new Date().toISOString().slice(0, 10),
    status: 'aktif' as const,
    uploadDate: new Date().toISOString(),
    fileSize: 'internal-reference',
    summary: 'Panduan referensi generik untuk komunikasi dan pemeriksaan fakta perusahaan rintisan teknologi software dan hardware. Bukan sumber fakta produk atau profil resmi perusahaan.',
    chunks: sections.map((section, index) => ({
      id: `${id}-chunk-${index + 1}`,
      documentId: id,
      ...section,
      keywords: ['startup teknologi', 'perangkat lunak', 'perangkat keras', 'verifikasi fakta', 'panduan umum']
    }))
  };
}

async function main() {
  const { rows: users } = await pool.query("SELECT id,company_id FROM users WHERE lower(email)='salman@gmail.com' AND global_role='corporate'");
  if (users.length !== 1 || !users[0].company_id) throw new Error('Expected exactly one Salman corporate account with a company.');
  const companyId = users[0].company_id as string;
  const { rows: workspaces } = await pool.query('SELECT id,name,code FROM organizations WHERE company_id=$1 ORDER BY id', [companyId]);
  if (!workspaces.length) throw new Error('No workspaces found for Salman corporate account.');

  const companySlug = companyId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const partialIds = ['kb-general-tech-startup-guide-v1', `kb-${companySlug}-general-tech-startup-guide-v1`];
  for (const id of partialIds) {
    const { rows } = await pool.query('SELECT s.id,a.workspace_id FROM knowledge_sources s LEFT JOIN knowledge_source_workspaces a ON a.source_id=s.id WHERE s.id=$1 AND s.company_id=$2', [id, companyId]);
    for (const workspaceId of [...new Set(rows.map(row => row.workspace_id).filter(Boolean))]) await ragDeleteDocument(String(workspaceId), id);
    await pool.query('DELETE FROM knowledge_sources WHERE id=$1 AND company_id=$2', [id, companyId]);
  }
  const docs = workspaces.flatMap(workspace => {
    const slug = String(workspace.code).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const generalId = `kb-${companySlug}-${slug}-general-tech-startup-guide-v1`;
    const workspaceId = `kb-${companySlug}-${slug}-content-guide-v1`;
    const assignment = [{ workspaceId: workspace.id, enabled: true }];
    return [
      makeDocument(generalId, workspace.id, `Panduan Umum Startup Teknologi — ${workspace.name}`, 'Referensi umum — bukan fakta perusahaan', chunks, assignment),
      makeDocument(workspaceId, workspace.id, `Panduan Konten Workspace — ${workspace.name}`, 'Panduan editorial workspace — bukan fakta produk', workspaceChunks(workspace.name), assignment)
    ];
  });

  const results = [];
  for (const doc of docs) {
    const saved = await saveKnowledgeSource(doc);
    const targets = saved.workspaceAssignments.filter((item: { enabled: boolean }) => item.enabled).map((item: { workspaceId: string }) => item.workspaceId);
    const indexed = [];
    for (const scopeId of targets) {
      const response = await ragIndexDocument({
        scopeId,
        documentId: doc.id,
        documentName: doc.title,
        text: doc.chunks.map((chunk: { section: string; content: string }) => `${chunk.section}\n${chunk.content}`).join('\n\n'),
        language: 'id',
        metadata: { category: doc.category, owner: doc.owner, version: doc.version, effectiveDate: doc.effectiveDate }
      });
      indexed.push({ workspaceId: scopeId, status: response.status, chunks: response.chunks });
    }
    results.push({ id: doc.id, title: doc.title, assignedWorkspaceIds: targets, indexed });
  }

  const { rows: counts } = await pool.query(`SELECT s.id,s.title,count(DISTINCT a.workspace_id)::int AS workspaces,count(DISTINCT c.id)::int AS chunks FROM knowledge_sources s LEFT JOIN knowledge_source_workspaces a ON a.source_id=s.id AND a.enabled LEFT JOIN knowledge_chunks c ON c.source_id=s.id WHERE s.id=ANY($1::text[]) GROUP BY s.id,s.title ORDER BY s.id`, [docs.map(doc => doc.id)]);
  console.log(JSON.stringify({ companyId, workspaces, results, database: counts }, null, 2));
  const probe = await ragSearch(workspaces[0].id, 'Siklus hidup perangkat keras garansi firmware keselamatan', { top_k: 5 });
  console.log(JSON.stringify({ searchProbe: probe.results.map(hit => ({ documentId: hit.document_id, documentName: hit.document_name, section: hit.section, score: hit.score })) }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => pool.end());

