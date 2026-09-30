import { 
  Workspace, 
  User, 
  KnowledgeDocument, 
  BrandProfile, 
  ContentDraft, 
  AuditLog 
} from '../types';

export const initialWorkspaces: Workspace[] = [
  {
    id: 'ws-tirta',
    name: 'Perumda Air Minum Tirta Sejahtera',
    code: 'TIRTA-METRO',
    sector: 'Pelayanan Air Minum & Sanitasi Daerah',
    city: 'Kota Metro',
    tagline: 'Mengalirkan Kehidupan, Menjaga Kualitas dan Kepercayaan Daerah',
    primaryColor: '#0284c7', // Sky Blue
    accentColor: '#0ea5e9',
    description: 'Badan Usaha Milik Daerah yang mengelola penyediaan air bersih bermutu tinggi dan higienis bersertifikasi ISO 9001 untuk 450.000 sambungan rumah tangga.'
  },
  {
    id: 'ws-trans',
    name: 'PT Trans Moda Nusantara',
    code: 'TRANS-MODA',
    sector: 'Transportasi Publik Terpadu & BRT',
    city: 'Provinsi Megapolitan',
    tagline: 'Konektivitas Cepat, Ramah Emisi, Menjangkau Seluruh Pelosok',
    primaryColor: '#059669', // Emerald
    accentColor: '#10b981',
    description: 'Pengelola sistem Bus Rapid Transit (BRT) elektrik dan armada microtransit terintegrasi dengan sistem satu tiket kartu multi-trip.'
  },
  {
    id: 'ws-pangan',
    name: 'BUMD Agro Pangan Makmur',
    code: 'AGRO-MAKMUR',
    sector: 'Ketahanan Pangan & Logistik Komoditas',
    city: 'Kabupaten Lumbung Sejahtera',
    tagline: 'Menjamin Ketersediaan Bahan Pokok Berkualitas dengan Harga Stabil',
    primaryColor: '#d97706', // Amber
    accentColor: '#f59e0b',
    description: 'BUMD distribusi logistik pangan daerah, penyerap hasil panen gabah petani lokal, dan pelaksana operasi pasar stabilisasi harga bahan pokok.'
  }
];

export const initialUsers: User[] = [
  {
    id: 'usr-creator',
    name: 'Darren Ardiansyah',
    email: 'darren.ardiansyah@bumd.go.id',
    role: 'creator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    workspaceId: 'ws-tirta',
    title: 'Staf Komunikasi & Konten Kreatif',
    department: 'Sub Bagian Hubungan Masyarakat & Publikasi'
  },
  {
    id: 'usr-reviewer',
    name: 'Maulana Akbar, S.Sos.',
    email: 'maulana.akbar@bumd.go.id',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    workspaceId: 'ws-tirta',
    title: 'Kepala Sub Bagian Humas & Komunikasi Publik',
    department: 'Divisi Sekretariat Perusahaan'
  },
  {
    id: 'usr-admin',
    name: 'Ir. Bambang Hartono, M.T.',
    email: 'bambang.hartono@bumd.go.id',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    workspaceId: 'ws-tirta',
    title: 'Kepala Bagian Pengendalian Kinerja & Knowledge Owner',
    department: 'Direktorat Umum & Transformasi Digital'
  }
];

export const initialBrandProfiles: Record<string, BrandProfile> = {
  'ws-tirta': {
    workspaceId: 'ws-tirta',
    organizationName: 'Perumda Air Minum Tirta Sejahtera',
    unitDepartment: 'Bagian Humas & Pelayanan Pelanggan',
    defaultLanguage: 'Bahasa Indonesia (Baku Korporat)',
    toneOfVoice: [
      'Formal Korporat Ramah',
      'Informatif & Transparan',
      'Solutif & Sigap Pelayanan',
      'Edukasi Bijak Penggunaan Air'
    ],
    terminology: [
      {
        term: 'Sambungan Rumah (SR)',
        definition: 'Instalasi jaringan pipa distribusi air minum dari meter air resmi hingga kran pertama konsumen.',
        mandatory: true
      },
      {
        term: 'Pelanggan Tirta',
        definition: 'Penyebutan resmi bagi masyarakat atau entitas bisnis yang berlangganan resmi air perumda.',
        mandatory: true
      },
      {
        term: 'Aplikasi TirtaPay',
        definition: 'Kanal resmi pembayaran tagihan air digital bebas antrean dengan biaya admin resmi Rp 1.500.',
        mandatory: false
      },
      {
        term: 'ISO/IEC 17025',
        definition: 'Akreditasi laboratorium pengujian kualitas air baku dan air minum sesuai standar Kementerian Kesehatan RI.',
        mandatory: false
      }
    ],
    bannedWords: [
      {
        word: 'dijamin termurah se-Indonesia',
        reason: 'Overclaim publik yang melanggar kode etik penyiaran informasi publik BUMD.',
        suggestedReplacement: 'sesuai penetapan tarif bersubsidi peraturan daerah'
      },
      {
        word: 'tanpa syarat sama sekali',
        reason: 'Menyesatkan calon pelanggan karena pemasangan SR memerlukan verifikasi KTP dan bukti kepemilikan.',
        suggestedReplacement: 'persyaratan administrasi mudah dan ringkas'
      },
      {
        word: 'air keruh',
        reason: 'Terminologi informal yang dapat menimbulkan kepanikan.',
        suggestedReplacement: 'fluktuasi kekeruhan sementara akibat proses flushing pipa'
      }
    ],
    officialCTAs: [
      {
        id: 'cta-1',
        label: 'Aplikasi TirtaPay',
        text: 'Unduh aplikasi TirtaPay di Play Store & App Store untuk kemudahan cek tagihan dan bayar tepat waktu!',
        channel: 'Media Sosial & Digital'
      },
      {
        id: 'cta-2',
        label: 'Contact Center 24 Jam',
        text: 'Laporkan kendala distribusi air Anda melalui WhatsApp HaloTirta 0811-7788-9900 (Layanan 24 Jam).',
        channel: 'Semua Kanal Layanan'
      },
      {
        id: 'cta-3',
        label: 'Daftar Sambungan Baru',
        text: 'Daftar sambungan rumah baru secara mandiri melalui portal resmi pasang.tirtasejahtera.co.id.',
        channel: 'Website & Cetak'
      }
    ],
    approvedChannels: [
      'Instagram Feed & Reels (@tirtasejahtera_official)',
      'LinkedIn Korporat (Perumda Air Minum Tirta Sejahtera)',
      'WhatsApp Broadcast Pelanggan',
      'Portal Pengumuman Web Resmi',
      'Siaran Pers Media Massa Daerah'
    ],
    brandGuidelinesSummary: 'Gunakan warna dominan biru air laut (#0284c7) dengan aksen cyan (#0ea5e9) dan latar putih bersih. Huruf judul memakai sans-serif tebal yang ramah dan mudah dibaca oleh seluruh lapisan masyarakat.',
    officialDisclaimer: 'Informasi tarif dan jadwal pemeliharaan ini ditetapkan secara sah berdasarkan Surat Keputusan Direksi Perumda Tirta Sejahtera.'
  },
  'ws-trans': {
    workspaceId: 'ws-trans',
    organizationName: 'PT Trans Moda Nusantara',
    unitDepartment: 'Divisi Komunikasi Perusahaan & Relasi Komunitas',
    defaultLanguage: 'Bahasa Indonesia (Baku)',
    toneOfVoice: [
      'Modern & Cepat Tanggap',
      'Ramah Inklusif (Aksesibel bagi Semua)',
      'Ajakan Berkelanjutan Peduli Lingkungan'
    ],
    terminology: [
      {
        term: 'Kartu Multi-Trip Nusantara (KMTN)',
        definition: 'Kartu uang elektronik terpadu yang dapat digunakan di semua koridor BRT dan moda pengumpan.',
        mandatory: true
      },
      {
        term: 'Armada Rendah Emisi',
        definition: 'Bus listrik bertenaga baterai (EV) dan gas alam terkompresi (CNG).',
        mandatory: true
      }
    ],
    bannedWords: [
      {
        word: 'paling bebas macet sedunia',
        reason: 'Klaim berlebihan yang tidak terukur secara ilmiah.',
        suggestedReplacement: 'jalur khusus steril untuk ketepatan waktu perjalanan'
      }
    ],
    officialCTAs: [
      {
        id: 'cta-trans-1',
        label: 'Unduh Aplikasi TransGo',
        text: 'Pantau kedatangan bus secara real-time di aplikasi TransGo!',
        channel: 'Digital & Media Sosial'
      }
    ],
    approvedChannels: ['Instagram', 'X (Twitter Info Lalu Lintas)', 'Display Halte BRT', 'Siaran Pers'],
    brandGuidelinesSummary: 'Warna dominan hijau mobilitas ramah lingkungan (#059669) dengan aksen kuning keselamatan.',
    officialDisclaimer: 'Jadwal operasional dapat menyesuaikan diskresi petugas rekayasa lalu lintas Kepolisian dan Dinas Perhubungan.'
  },
  'ws-pangan': {
    workspaceId: 'ws-pangan',
    organizationName: 'BUMD Agro Pangan Makmur',
    unitDepartment: 'Bidang Pemasaran & Stabilisasi Pasokan',
    defaultLanguage: 'Bahasa Indonesia (Baku)',
    toneOfVoice: ['Hangat Merangkul', 'Transparan Harga', 'Berpihak pada Petani & Konsumen'],
    terminology: [
      {
        term: 'Beras SPHP',
        definition: 'Beras Stabilisasi Pasokan dan Harga Pangan berstandar medium dengan HET Rp 12.500/kg.',
        mandatory: true
      }
    ],
    bannedWords: [
      {
        word: 'dijamin paling enak',
        reason: 'Subjektif dan tidak sesuai pedoman penyuluhan pangan.',
        suggestedReplacement: 'beras pulen bermutu sesuai standar ketahanan pangan'
      }
    ],
    officialCTAs: [
      {
        id: 'cta-pangan-1',
        label: 'Cek Lokasi Operasi Pasar',
        text: 'Cek jadwal dan lokasi truk Operasi Pasar Pangan Murah hari ini di panganmakmur.go.id/jadwal.',
        channel: 'Kanal Berita & Sosmed'
      }
    ],
    approvedChannels: ['Instagram', 'Facebook Komunitas Ibu Rumah Tangga', 'Radio Siaran Pemda', 'Spanduk Kelurahan'],
    brandGuidelinesSummary: 'Warna hangat tanah dan keemasan padi (#d97706) melambangkan kemakmuran dan ketahanan pangan.',
    officialDisclaimer: 'Program pasar murah diselenggarakan bekerja sama dengan Badan Pangan Nasional dan Bulog.'
  }
};

export const initialKnowledgeDocuments: KnowledgeDocument[] = [
  // TIRTA DOCUMENTS
  {
    id: 'doc-tirta-01',
    workspaceId: 'ws-tirta',
    title: 'SK Direksi No. 42/DIR/2026: Tarif Air Minum Bersubsidi Golongan Sosial & Rumah Tangga',
    category: 'sk_direksi',
    owner: 'Bagian Keuangan & Tarif Perumda',
    version: 'v2.1',
    effectiveDate: '01 Januari 2026',
    status: 'aktif',
    uploadDate: '2026-01-15T09:00:00Z',
    fileSize: '2.4 MB',
    summary: 'Penetapan struktur tarif air bersih tahun 2026. Golongan Rumah Tangga 1 (RT-1) disubsidi penuh dengan tarif Rp 2.800 per m³ untuk pemakaian 0-10 m³. Golongan Sosial bebas abonemen bulanan.',
    chunks: [
      {
        id: 'chk-tirta-01-1',
        documentId: 'doc-tirta-01',
        section: 'Pasal 4 Ayat 1 - Ketentuan Tarif Golongan Sosial & RT-1',
        page: 4,
        content: 'Tarif pemakaian air bersih golongan Rumah Tangga 1 (daya listrik <= 900 VA) ditetapkan sebesar Rp 2.800/m³ untuk blok konsumsi dasar 0 sampai dengan 10 meter kubik. Blok pemakaian di atas 10 meter kubik dikenakan tarif progresif Rp 3.500/m³.',
        keywords: ['tarif', 'rumah tangga', 'RT-1', 'subsidi', 'meter kubik', '2800']
      },
      {
        id: 'chk-tirta-01-2',
        documentId: 'doc-tirta-01',
        section: 'Pasal 6 Ayat 3 - Pembebasan Biaya Abonemen Rumah Ibadah',
        page: 6,
        content: 'Tempat ibadah (Masjid, Gereja, Pura, Vihara, Klenteng) dan panti asuhan yang terdaftar resmi dibebaskan 100% dari biaya beban tetap (abonemen) bulanan dan mendapatkan kuota gratis 15 m³ pertama setiap bulannya.',
        keywords: ['rumah ibadah', 'panti asuhan', 'bebas abonemen', 'gratis', 'sosial']
      }
    ]
  },
  {
    id: 'doc-tirta-02',
    workspaceId: 'ws-tirta',
    title: 'SOP Layanan Pasang Baru Sambungan Rumah Tangga 2026',
    category: 'sop_layanan',
    owner: 'Divisi Pelayanan Pelanggan & Distribusi',
    version: 'v1.4',
    effectiveDate: '10 Februari 2026',
    status: 'aktif',
    uploadDate: '2026-02-12T14:30:00Z',
    fileSize: '1.8 MB',
    summary: 'Prosedur operasional baku pendaftaran sambungan air baru dengan estimasi pemasangan maksimal 3 hari kerja pasca survei teknis disetujui.',
    chunks: [
      {
        id: 'chk-tirta-02-1',
        documentId: 'doc-tirta-02',
        section: 'Bagian 2 - Persyaratan Dokumen & Skema Cicilan 0%',
        page: 2,
        content: 'Pendaftaran sambungan rumah baru hanya memerlukan Fotokopi KTP pemohon, Bukti PBB/Sertifikat Rumah, serta rekening listrik terakhir. Biaya pasang standar Rp 1.250.000 dapat dicicil 3x tanpa bunga (0%) langsung ditagihkan pada rekening air bulanan.',
        keywords: ['pasang baru', 'syarat', 'ktp', 'pbb', 'cicilan 0%', '1250000']
      },
      {
        id: 'chk-tirta-02-2',
        documentId: 'doc-tirta-02',
        section: 'Bagian 5 - Jaminan Waktu Pemasangan (SLA)',
        page: 5,
        content: 'Petugas teknis wajib menyelesaikan instalasi meter air dan pipa dinas dalam jangka waktu maksimal 3 (tiga) hari kerja sejak pembayaran biaya pasang baru atau verifikasi skema cicilan dinyatakan tuntas.',
        keywords: ['waktu pemasangan', '3 hari kerja', 'sla', 'meter air', 'instalasi']
      }
    ]
  },
  {
    id: 'doc-tirta-03',
    workspaceId: 'ws-tirta',
    title: 'Panduan Layanan Aplikasi TirtaPay & Kanal Pembayaran Digital',
    category: 'sop_layanan',
    owner: 'Bagian Sistem Informasi & Humas',
    version: 'v3.0',
    effectiveDate: '15 Maret 2026',
    status: 'aktif',
    uploadDate: '2026-03-18T10:15:00Z',
    fileSize: '3.1 MB',
    summary: 'Panduan integrasi pembayaran tagihan air via TirtaPay, QRIS, e-wallet (GoPay, OVO, ShopeePay), dan minimarket tanpa biaya denda sebelum tanggal 20 tiap bulan.',
    chunks: [
      {
        id: 'chk-tirta-03-1',
        documentId: 'doc-tirta-03',
        section: 'Bab 1 - Batas Pembayaran & Fitur TirtaPay',
        page: 3,
        content: 'Batas akhir pembayaran tagihan air bulanan adalah tanggal 20 setiap bulannya. Melalui aplikasi TirtaPay, pelanggan mendapatkan notifikasi otomatis H-3 sebelum jatuh tempo dan dapat melihat riwayat pemakaian air grafik 12 bulan terakhir.',
        keywords: ['tirtapay', 'jatuh tempo', 'tanggal 20', 'notifikasi', 'grafik pemakaian']
      }
    ]
  },
  {
    id: 'doc-tirta-04',
    workspaceId: 'ws-tirta',
    title: 'Surat Edaran Direksi: Pemeliharaan Pipa Induk Transmisi Q3 2025 (KADALUARSA)',
    category: 'sk_direksi',
    owner: 'Divisi Teknik',
    version: 'v1.0',
    effectiveDate: '01 Juli 2025 s.d. 30 September 2025',
    status: 'usang',
    uploadDate: '2025-06-25T11:00:00Z',
    fileSize: '890 KB',
    summary: 'Dokumen jadwal pemadaman aliran air bergilir tahun lalu yang sudah tidak berlaku. Disimpan untuk arsip kepatuhan tata kelola.',
    chunks: [
      {
        id: 'chk-tirta-04-1',
        documentId: 'doc-tirta-04',
        section: 'Arsip Jadwal Pemadaman 2025',
        page: 1,
        content: 'Jadwal penghentian air sementara tahun 2025 untuk wilayah Kecamatan Timur telah selesai dikerjakan pada September 2025.',
        keywords: ['pemeliharaan pipa', '2025', 'kadaluarsa', 'arsip']
      }
    ]
  },
  {
    id: 'doc-tirta-05',
    workspaceId: 'ws-tirta',
    title: 'Draft SOP Layanan Uji Laboratorium Air Minum Komersial & Mandiri',
    category: 'sop_layanan',
    owner: 'Kepala UPTD Laboratorium Kualitas Air',
    version: 'v0.3 (Draft)',
    effectiveDate: 'Menunggu Pengesahan Direksi Q4 2026',
    status: 'menunggu_persetujuan',
    uploadDate: '2026-09-20T16:00:00Z',
    fileSize: '1.2 MB',
    summary: 'Rancangan paket pengujian bakteriologis dan kimiawi air sumur warga dengan diskon uji kelompok. Belum boleh dikutip untuk publik sampai SK resmi terbit.',
    chunks: [
      {
        id: 'chk-tirta-05-1',
        documentId: 'doc-tirta-05',
        section: 'Rancangan Tarif Uji Mandiri',
        page: 2,
        content: 'Rancangan paket uji air sumur mandiri Rp 150.000 per sampel masih dalam tahap pengujian kalkulasi biaya reagen.',
        keywords: ['uji lab', 'air sumur', 'draft', 'belum disetujui']
      }
    ]
  },

  // TRANS MODA DOCUMENTS
  {
    id: 'doc-trans-01',
    workspaceId: 'ws-trans',
    title: 'SK Direksi No. 18/TMN/2026: Operasional Koridor 7 BRT Listrik Rendah Emisi',
    category: 'sk_direksi',
    owner: 'Divisi Operasional & Keselamatan',
    version: 'v1.0',
    effectiveDate: '01 Februari 2026',
    status: 'aktif',
    uploadDate: '2026-02-05T08:00:00Z',
    fileSize: '3.4 MB',
    summary: 'Peresmian rute baru Koridor 7 Stasiun Sentral - Kawasan Edukasi Terpadu dengan 25 armada bus listrik berpendingin udara dan fasilitas kursi roda.',
    chunks: [
      {
        id: 'chk-trans-01-1',
        documentId: 'doc-trans-01',
        section: 'Ketentuan Rute & Fasilitas Halte Koridor 7',
        page: 3,
        content: 'Koridor 7 melayani rute Stasiun Sentral menuju Kampus Terpadu sepanjang 18,5 km dengan headway 7 menit pada jam sibuk. Seluruh 14 halte dilengkapi ramp landai ramah disabilitas, pemandu taktil tunanetra, dan kamera CCTV 24 jam.',
        keywords: ['koridor 7', 'headway 7 menit', 'bus listrik', 'ramah disabilitas', 'stasiun sentral']
      }
    ]
  },
  {
    id: 'doc-trans-02',
    workspaceId: 'ws-trans',
    title: 'Kebijakan Subsidi Tarif Khusus: Pelajar, Lansia, dan Disabilitas Rp 0 (Gratis)',
    category: 'sk_direksi',
    owner: 'Bagian Komersial & Tiket Terpadu',
    version: 'v2.0',
    effectiveDate: '01 Januari 2026',
    status: 'aktif',
    uploadDate: '2026-01-10T11:20:00Z',
    fileSize: '1.9 MB',
    summary: 'Petunjuk teknis pendaftaran Kartu Multi-Trip Khusus Pelajar berseragam/kartu pelajar, lansia usia di atas 60 tahun dengan e-KTP daerah, dan penyandang disabilitas berhak atas tarif Rp 0 di seluruh koridor.',
    chunks: [
      {
        id: 'chk-trans-02-1',
        documentId: 'doc-trans-02',
        section: 'Syarat & Verifikasi Tarif Khusus Rp 0',
        page: 2,
        content: 'Tarif Rp 0 (gratis) diberikan bagi: (1) Pelajar SD/SMP/SMA berdomisili lokal, (2) Warga Lansia berusia 60 tahun ke atas, dan (3) Penyandang disabilitas. Registrasi dilakukan di loket halte utama dengan membawa KTP/Kartu Pelajar aktif.',
        keywords: ['tarif 0 rupiah', 'gratis', 'pelajar', 'lansia', 'disabilitas', 'kmtn khusus']
      }
    ]
  },

  // PANGAN DOCUMENTS
  {
    id: 'doc-pangan-01',
    workspaceId: 'ws-pangan',
    title: 'Petunjuk Teknis Operasi Pasar Beras SPHP & Minyak Bersubsidi 2026',
    category: 'sop_layanan',
    owner: 'Divisi Logistik Pangan & Penyaluran',
    version: 'v1.2',
    effectiveDate: '01 Maret 2026',
    status: 'aktif',
    uploadDate: '2026-03-02T13:00:00Z',
    fileSize: '2.1 MB',
    summary: 'Pedoman penyaluran beras SPHP kemasan 5 kg dengan harga maksimal Rp 62.500 (Rp 12.500/kg) dibatasi maksimal 2 kantong per keluarga per pembelian.',
    chunks: [
      {
        id: 'chk-pangan-01-1',
        documentId: 'doc-pangan-01',
        section: 'Tata Cara Pembelian di Loket Operasi Pasar',
        page: 3,
        content: 'Beras SPHP kemasan 5 kg dijual dengan Harga Eceran Tertinggi Rp 62.500 per sak. Setiap warga wajib menunjukkan KTP dan dibatasi maksimal pembelian 2 sak (10 kg) agar seluruh warga mendapatkan kuota merata.',
        keywords: ['beras sphp', '62500', '12500/kg', 'maksimal 2 sak', 'operasi pasar']
      }
    ]
  }
];

export const initialDrafts: ContentDraft[] = [
  {
    id: 'dft-tirta-001',
    workspaceId: 'ws-tirta',
    briefId: 'brf-tirta-001',
    title: 'Edukasi Program Pasang Baru Sambungan Air 2026 dengan Cicilan 0%',
    format: 'copy_caption',
    status: 'menunggu_review',
    currentVersion: 2,
    createdAt: '2026-09-28T09:30:00Z',
    updatedAt: '2026-09-29T14:15:00Z',
    createdBy: 'usr-creator',
    creatorName: 'Darren Ardiansyah',
    versions: [
      {
        versionNumber: 1,
        content: `Masyarakat Kota Metro kini semakin mudah menikmati air bersih higienis langsung di rumah! 💧

Perumda Air Minum Tirta Sejahtera menghadirkan kemudahan program pemasangan Sambungan Rumah (SR) baru tahun 2026. Nikmati skema pembiayaan ramah keluarga dengan cicilan 0% hingga 3 bulan tanpa beban bunga tambahan.

Persyaratan pendaftaran sangat praktis:
✅ Fotokopi KTP pemohon
✅ Bukti PBB / Sertifikat Tempat Tinggal
✅ Rekening listrik terakhir

Biaya standar pemasangan Rp 1.250.000 dapat dicicil 3x dan langsung terintegrasi pada tagihan rekening bulanan Anda. Tim teknisi kami siap memasang instalasi dalam estimasi 3 hari kerja setelah verifikasi tuntas!

Yuk, beralih ke air bersih terstandar laboratorium resmi untuk kesehatan keluarga tercinta.

Pendaftaran online mandiri dapat diakses melalui portal resmi kami:
🌐 pasang.tirtasejahtera.co.id
Atau hubungi WhatsApp HaloTirta 24 Jam: 0811-7788-9900

#AirBersihKotaMetro #TirtaSejahtera #SambunganBaru #LayananBUMD #KesehatanKeluarga`,
        citations: [
          {
            id: 'cit-1',
            documentId: 'doc-tirta-02',
            documentTitle: 'SOP Layanan Pasang Baru Sambungan Rumah Tangga 2026',
            section: 'Bagian 2 - Persyaratan Dokumen & Skema Cicilan 0%',
            page: 2,
            excerpt: 'Pendaftaran sambungan rumah baru hanya memerlukan Fotokopi KTP pemohon, Bukti PBB/Sertifikat Rumah, serta rekening listrik terakhir. Biaya pasang standar Rp 1.250.000 dapat dicicil 3x tanpa bunga (0%)...',
            relevanceScore: 98,
            verified: true,
            claimExcerpt: 'Persyaratan KTP, PBB, rekening listrik & biaya Rp 1.250.000 cicilan 3x'
          },
          {
            id: 'cit-2',
            documentId: 'doc-tirta-02',
            documentTitle: 'SOP Layanan Pasang Baru Sambungan Rumah Tangga 2026',
            section: 'Bagian 5 - Jaminan Waktu Pemasangan (SLA)',
            page: 5,
            excerpt: 'Petugas teknis wajib menyelesaikan instalasi meter air dan pipa dinas dalam jangka waktu maksimal 3 (tiga) hari kerja...',
            relevanceScore: 95,
            verified: true,
            claimExcerpt: 'Pemasangan dalam 3 hari kerja pasca verifikasi'
          }
        ],
        unsupportedClaims: [],
        qualityCheck: {
          briefCompliance: { score: 98, details: 'Memenuhi seluruh arahan brief: target warga, format caption, CTA dan pesan utama tercakup sempurna.', passed: true },
          toneCompliance: { score: 95, details: 'Menggunakan Bahasa Indonesia baku, sopan, dan mencerminkan citra BUMD profesional.', passed: true },
          factualGrounding: { score: 100, groundedClaims: 2, totalClaims: 2, ungroundedClaims: [], passed: true },
          bannedWordsFound: [],
          ctaCompliance: { hasCta: true, details: 'CTA resmi portal pasang baru dan nomor HaloTirta tersemat.' },
          overallStatus: 'siap_review'
        },
        createdAt: '2026-09-28T09:30:00Z',
        createdBy: 'Darren Ardiansyah',
        changeSummary: 'Draf generasi awal berbasis RAG dokumen SOP Layanan Pasang Baru 2026.'
      },
      {
        versionNumber: 2,
        content: `Masyarakat Kota Metro kini semakin mudah menikmati air bersih higienis langsung di rumah! 💧

Perumda Air Minum Tirta Sejahtera menghadirkan program resmi pemasangan Sambungan Rumah (SR) baru tahun 2026. Dapatkan skema pembiayaan ramah keluarga dengan cicilan 0% selama 3 bulan tanpa bunga.

Persyaratan pendaftaran sangat mudah dan transparan:
1. Fotokopi KTP pemohon aktif
2. Bukti lunas PBB / Sertifikat Tempat Tinggal
3. Bukti pembayaran rekening listrik terakhir

Biaya pasang standar resmi Rp 1.250.000 dapat dicicil 3 kali dan ditagihkan langsung pada rekening air bulanan. Jaminan instalasi meter air diselesaikan maksimal dalam 3 hari kerja setelah survei disetujui petugas.

Daftar sekarang secara mudah melalui:
🌐 Portal Resmi: pasang.tirtasejahtera.co.id
📞 Layanan Pengaduan 24 Jam: WhatsApp HaloTirta 0811-7788-9900

#AirBersihKotaMetro #TirtaSejahtera #SambunganBaru #LayananBUMD #KesehatanKeluarga`,
        citations: [
          {
            id: 'cit-1',
            documentId: 'doc-tirta-02',
            documentTitle: 'SOP Layanan Pasang Baru Sambungan Rumah Tangga 2026',
            section: 'Bagian 2 - Persyaratan Dokumen & Skema Cicilan 0%',
            page: 2,
            excerpt: 'Pendaftaran sambungan rumah baru hanya memerlukan Fotokopi KTP pemohon, Bukti PBB/Sertifikat Rumah, serta rekening listrik terakhir...',
            relevanceScore: 98,
            verified: true,
            claimExcerpt: 'Persyaratan KTP, PBB, rekening listrik & biaya Rp 1.250.000 cicilan 3x'
          },
          {
            id: 'cit-2',
            documentId: 'doc-tirta-02',
            documentTitle: 'SOP Layanan Pasang Baru Sambungan Rumah Tangga 2026',
            section: 'Bagian 5 - Jaminan Waktu Pemasangan (SLA)',
            page: 5,
            excerpt: 'Petugas teknis wajib menyelesaikan instalasi meter air dan pipa dinas dalam jangka waktu maksimal 3 (tiga) hari kerja...',
            relevanceScore: 95,
            verified: true,
            claimExcerpt: 'Pemasangan dalam 3 hari kerja pasca verifikasi'
          }
        ],
        unsupportedClaims: [],
        qualityCheck: {
          briefCompliance: { score: 100, details: 'Brief terpenuhi optimal dengan penataan butir persyaratan yang lebih terstruktur.', passed: true },
          toneCompliance: { score: 98, details: 'Gaya bahasa baku korporat rapi, bebas kata terlarang.', passed: true },
          factualGrounding: { score: 100, groundedClaims: 2, totalClaims: 2, ungroundedClaims: [], passed: true },
          bannedWordsFound: [],
          ctaCompliance: { hasCta: true, details: 'Memuat portal resmi dan hotline HaloTirta 24 Jam.' },
          overallStatus: 'siap_review'
        },
        createdAt: '2026-09-29T14:15:00Z',
        createdBy: 'Darren Ardiansyah',
        changeSummary: 'Penyempurnaan tata letak butir persyaratan sesuai masukan reviewer sebelum approval final.'
      }
    ],
    comments: [
      {
        id: 'cmt-1',
        authorName: 'Maulana Akbar, S.Sos.',
        authorRole: 'reviewer',
        text: 'Naskah copy sudah sangat baik dan faktanya sesuai dengan SOP Layanan 2026. Pada versi 2 penomoran syarat terlihat jauh lebih mudah dibaca untuk posting Instagram carousel.',
        createdAt: '2026-09-29T15:00:00Z',
        resolved: false
      }
    ],
    visualAsset: {
      id: 'vis-tirta-01',
      headline: 'PASANG SAMBUNGAN AIR BERSIH BARU',
      subheadline: 'Cicilan 0% Selama 3 Bulan • Pasang Cepat 3 Hari Kerja',
      aspectRatio: '1:1',
      primaryColor: '#0284c7',
      accentColor: '#38bdf8',
      badgeText: 'PROGRAM RESMI BUMD 2026',
      ctaText: 'Daftar di pasang.tirtasejahtera.co.id',
      disclaimer: 'Berdasarkan SOP Pelayanan Pasang Baru No. 14/2026. Syarat & ketentuan berlaku.',
      visualPrompt: 'Corporate modern infographic of clean blue flowing water tap, family smiling in modern Indonesian house, certified ISO watermark, clean minimalist layout with deep blue header',
      templateStyle: 'corporate'
    }
  },
  {
    id: 'dft-tirta-002',
    workspaceId: 'ws-tirta',
    briefId: 'brf-tirta-002',
    title: 'Naskah Video Singkat: Cara Cepat Bayar Air via Aplikasi TirtaPay',
    format: 'naskah_singkat',
    status: 'disetujui',
    currentVersion: 1,
    createdAt: '2026-09-25T11:00:00Z',
    updatedAt: '2026-09-26T10:30:00Z',
    createdBy: 'usr-creator',
    creatorName: 'Darren Ardiansyah',
    approvalInfo: {
      approvedBy: 'Maulana Akbar, S.Sos.',
      approvedAt: '2026-09-26T10:30:00Z',
      decision: 'approved',
      notes: 'Disetujui untuk diproduksi tim multimedia Humas. Pastikan audio jingle resmi BUMD dipasang di akhir video.',
      dispositionNumber: 'DSP/HMS-TIRTA/IX/2026/089'
    },
    versions: [
      {
        versionNumber: 1,
        content: `Naskah Video Edukasi Singkat (Reels / TikTok / Shorts) - Durasi 45 Detik
Tema: Bayar Air Praktis Tanpa Antre Sebelum Tanggal 20 via TirtaPay`,
        scenes: [
          {
            sceneNumber: 1,
            visualDirection: 'Medium shot seorang ibu muda sedang memeriksa kalender di dinding rumah, kamera zoom ke tanggal 18 yang dilingkari merah.',
            audioNarration: 'Ibu: "Aduh, udah tanggal 18! Belum sempat bayar tagihan air ke loket, nanti kena denda lagi!"',
            textOnScreen: 'JATUH TEMPO TANGGAL 20 TIAP BULAN! 📅',
            citationId: 'cit-tirta-3',
            citationNote: 'Bab 1 Dokumen Panduan TirtaPay'
          },
          {
            sceneNumber: 2,
            visualDirection: 'Anak muda datang sambil menunjukkan layar smartphone dengan aplikasi TirtaPay terbuka dan tampilan saldo tagihan.',
            audioNarration: 'Anak: "Tenang Bu! Sekarang ada TirtaPay. Cek nomor sambungan dan bayar langsung dari HP via QRIS atau e-wallet!"',
            textOnScreen: 'BAYAR DALAM 1 MENIT VIA TIRTAPAY 📱⚡',
            citationId: 'cit-tirta-3',
            citationNote: 'Panduan Layanan Aplikasi TirtaPay v3.0'
          },
          {
            sceneNumber: 3,
            visualDirection: 'Layar ponsel menunjukkan grafik riwayat pemakaian air 12 bulan terakhir dan notifikasi centang hijau "Lunas".',
            audioNarration: 'Narator: "Bisa pantau grafik pemakaian air keluarga bulanan dan bebas antre kapan saja sebelum tanggal 20."',
            textOnScreen: 'PANTAU PEMAKAIAN AIR LEBIH HEMAT & BIJAK 📊💧',
            citationId: 'cit-tirta-3',
            citationNote: 'Fitur Notifikasi & Grafik Pemakaian'
          },
          {
            sceneNumber: 4,
            visualDirection: 'Bumper penutup dengan Logo Resmi Perumda Tirta Sejahtera dan ikon unduh Play Store / App Store.',
            audioNarration: 'Narator: "Unduh TirtaPay sekarang. Perumda Tirta Sejahtera, mengalirkan kenyamanan untuk Anda."',
            textOnScreen: 'UNDUH DI GOOGLE PLAY & APP STORE 📲✨',
            citationId: undefined,
            citationNote: 'CTA Resmi BUMD'
          }
        ],
        citations: [
          {
            id: 'cit-tirta-3',
            documentId: 'doc-tirta-03',
            documentTitle: 'Panduan Layanan Aplikasi TirtaPay & Kanal Pembayaran Digital',
            section: 'Bab 1 - Batas Pembayaran & Fitur TirtaPay',
            page: 3,
            excerpt: 'Batas akhir pembayaran tagihan air bulanan adalah tanggal 20 setiap bulannya. Melalui aplikasi TirtaPay, pelanggan mendapatkan notifikasi otomatis H-3 sebelum jatuh tempo...',
            relevanceScore: 97,
            verified: true,
            claimExcerpt: 'Jatuh tempo tgl 20 & grafik 12 bulan'
          }
        ],
        unsupportedClaims: [],
        qualityCheck: {
          briefCompliance: { score: 100, details: 'Format naskah 45 detik dengan visual dan audio tersusun rapi.', passed: true },
          toneCompliance: { score: 98, details: 'Bahasa komunikatif dan hangat untuk media sosial tanpa meninggalkan kesopanan korporat.', passed: true },
          factualGrounding: { score: 100, groundedClaims: 1, totalClaims: 1, ungroundedClaims: [], passed: true },
          bannedWordsFound: [],
          ctaCompliance: { hasCta: true, details: 'CTA unduh aplikasi dan logo tersemat di scene penutup.' },
          overallStatus: 'siap_review'
        },
        createdAt: '2026-09-25T11:00:00Z',
        createdBy: 'Darren Ardiansyah',
        changeSummary: 'Naskah video lengkap 4 adegan dengan petunjuk visual dan narasi audio.'
      }
    ],
    comments: []
  },
  {
    id: 'dft-trans-001',
    workspaceId: 'ws-trans',
    briefId: 'brf-trans-001',
    title: 'Siaran Pers Resmi: Peresmian Koridor 7 BRT Listrik Ramah Disabilitas',
    format: 'teks_promosi',
    status: 'disetujui',
    currentVersion: 1,
    createdAt: '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-21T09:10:00Z',
    createdBy: 'usr-creator',
    creatorName: 'Darren Ardiansyah',
    approvalInfo: {
      approvedBy: 'Maulana Akbar, S.Sos.',
      approvedAt: '2026-09-21T09:10:00Z',
      decision: 'approved',
      notes: 'Teks siaran pers sangat komprehensif dan telah sesuai dengan SK Direksi No. 18/2026. Siap didistribusikan ke rekan jurnalis daerah.',
      dispositionNumber: 'DSP/PR-TMN/IX/2026/041'
    },
    versions: [
      {
        versionNumber: 1,
        content: `SIARAN PERS RESMI
Nomor: 018/SP-CORCOM/TMN/IX/2026

PERLUAS KONEKTIVITAS BERKELANJUTAN: PT TRANS MODA NUSANTARA RESMI OPERASIKAN KORIDOR 7 BRT LISTRIK RAMAH DISABILITAS

KOTA MEGAPOLITAN, 20 September 2026 — Sebagai wujud komitmen BUMD dalam menghadirkan transportasi massal perkotaan yang modern, inklusif, dan berwawasan lingkungan, PT Trans Moda Nusantara secara resmi meluncurkan layanan Koridor 7 yang menghubungkan Stasiun Sentral menuju Kawasan Kampus Terpadu.

Layanan Koridor 7 membentang sepanjang 18,5 kilometer dengan dukungan 25 unit armada bus listrik bertenaga baterai berpendingin udara dan tingkat emisi karbon mendekati nol. Pada jam-jam sibuk, waktu tunggu antarbus (headway) dipatok konsisten setiap 7 menit guna menjamin mobilitas pengguna jasa tetap tepat waktu.

Seluruh 14 halte pada lintasan ini telah dirancang dengan standar aksesibilitas universal, mencakup ramp landai khusus kursi roda, ubin pemandu taktil bagi penyandang disabilitas sensorik netra, serta pemantauan kamera pengawas CCTV 24 jam.

Masyarakat pemegang Kartu Multi-Trip Nusantara (KMTN) dapat langsung menikmati perjalanan terintegrasi ini. Khusus bagi pelajar, warga lanjut usia di atas 60 tahun, dan penyandang disabilitas yang telah terverifikasi, tarif layanan tetap berlaku Rp 0 (gratis).

Untuk informasi rute terkini dan pantauan posisi bus secara langsung, masyarakat dapat mengunduh aplikasi TransGo di platform Android dan iOS.

Kontak Media:
Sekretariat Perusahaan PT Trans Moda Nusantara
Email: corcom@transmoda.co.id
Website: www.transmoda.co.id`,
        citations: [
          {
            id: 'cit-trans-1',
            documentId: 'doc-trans-01',
            documentTitle: 'SK Direksi No. 18/TMN/2026: Operasional Koridor 7 BRT Listrik',
            section: 'Ketentuan Rute & Fasilitas Halte Koridor 7',
            page: 3,
            excerpt: 'Koridor 7 melayani rute Stasiun Sentral menuju Kampus Terpadu sepanjang 18,5 km dengan headway 7 menit pada jam sibuk. Seluruh 14 halte dilengkapi ramp landai ramah disabilitas...',
            relevanceScore: 99,
            verified: true,
            claimExcerpt: 'Rute Stasiun Sentral - Kampus, 18,5 km, headway 7 menit, 14 halte aksesibel'
          },
          {
            id: 'cit-trans-2',
            documentId: 'doc-trans-02',
            documentTitle: 'Kebijakan Subsidi Tarif Khusus: Pelajar, Lansia, dan Disabilitas Rp 0',
            section: 'Syarat & Verifikasi Tarif Khusus Rp 0',
            page: 2,
            excerpt: 'Tarif Rp 0 (gratis) diberikan bagi: (1) Pelajar SD/SMP/SMA, (2) Warga Lansia berusia 60 tahun ke atas, dan (3) Penyandang disabilitas...',
            relevanceScore: 98,
            verified: true,
            claimExcerpt: 'Tarif Rp 0 bagi pelajar, lansia >60 th, dan disabilitas'
          }
        ],
        unsupportedClaims: [],
        qualityCheck: {
          briefCompliance: { score: 100, details: 'Struktur siaran pers standar organisasi lengkap dengan kontak media.', passed: true },
          toneCompliance: { score: 100, details: 'Bahasa Indonesia jurnalistik korporat baku.', passed: true },
          factualGrounding: { score: 100, groundedClaims: 2, totalClaims: 2, ungroundedClaims: [], passed: true },
          bannedWordsFound: [],
          ctaCompliance: { hasCta: true, details: 'CTA aplikasi TransGo dan kontak sekretariat tertera.' },
          overallStatus: 'siap_review'
        },
        createdAt: '2026-09-20T08:00:00Z',
        createdBy: 'Darren Ardiansyah',
        changeSummary: 'Rilis pers pembukaan koridor 7 terverifikasi dokumen SK 18 & Kebijakan Tarif Subsidi.'
      }
    ],
    comments: []
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'adt-001',
    workspaceId: 'ws-tirta',
    timestamp: '2026-09-29T15:00:00Z',
    actorName: 'Maulana Akbar, S.Sos.',
    actorRole: 'reviewer',
    action: 'Penambahan Komentar Review',
    objectType: 'review',
    objectId: 'dft-tirta-001',
    objectName: 'Edukasi Program Pasang Baru Sambungan Air 2026 dengan Cicilan 0%',
    details: 'Reviewer memberikan apresiasi struktur naskah dan meminta penyesuaian sedikit butir persyaratan pada versi 2.'
  },
  {
    id: 'adt-002',
    workspaceId: 'ws-tirta',
    timestamp: '2026-09-29T14:15:00Z',
    actorName: 'Darren Ardiansyah',
    actorRole: 'creator',
    action: 'Pembaruan Versi Draft (v2)',
    objectType: 'draft',
    objectId: 'dft-tirta-001',
    objectName: 'Edukasi Program Pasang Baru Sambungan Air 2026 dengan Cicilan 0%',
    details: 'Creator memperbarui draf menjadi versi 2 dan mengajukan kembali ke antrean review.'
  },
  {
    id: 'adt-003',
    workspaceId: 'ws-tirta',
    timestamp: '2026-09-26T10:30:00Z',
    actorName: 'Maulana Akbar, S.Sos.',
    actorRole: 'reviewer',
    action: 'Persetujuan Konten (Approval)',
    objectType: 'review',
    objectId: 'dft-tirta-002',
    objectName: 'Naskah Video Singkat: Cara Cepat Bayar Air via Aplikasi TirtaPay',
    details: 'Penerbitan nomor lembar disposisi persetujuan DSP/HMS-TIRTA/IX/2026/089.'
  },
  {
    id: 'adt-004',
    workspaceId: 'ws-tirta',
    timestamp: '2026-09-20T16:00:00Z',
    actorName: 'Ir. Bambang Hartono, M.T.',
    actorRole: 'admin',
    action: 'Unggah Dokumen Knowledge Base',
    objectType: 'dokumen',
    objectId: 'doc-tirta-05',
    objectName: 'Draft SOP Layanan Uji Laboratorium Air Minum Komersial & Mandiri',
    details: 'Pengunggahan dokumen baru dengan status awal Menunggu Persetujuan (belum aktif untuk RAG).'
  }
];
