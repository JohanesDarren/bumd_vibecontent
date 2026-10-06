# Prompt Gemini: Halaman Manajemen Knowledge Base

Salin prompt di bawah ini ke Gemini saat Gemini memiliki akses ke repository VibeContent.

---

## Prompt

Anda adalah senior full-stack engineer yang bekerja langsung pada repository aplikasi **VibeContent**. Implementasikan halaman UI yang benar-benar berfungsi untuk admin mengelola dokumen knowledge base per workspace dan mengirim isinya ke layanan RAG yang sudah terintegrasi. Jangan berhenti di mockup, analisis, atau rencana: lakukan perubahan kode, tes, dan validasi.

### Konteks aplikasi saat ini

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express + TypeScript.
- Database: PostgreSQL melalui `pg`.
- Definisi peran ada di `src/types/index.ts`: `admin`, `reviewer`, `creator`.
- Navigasi dan izin tab UI berada di `src/components/Sidebar.tsx` dan `src/services/policies.ts`.
- `knowledge_sources` menyimpan metadata sumber. Kolom pentingnya: `id`, `organization_id`, `title`, `category`, `owner`, `version`, `effective_date`, `status`, `upload_date`, `file_size`, `summary`.
- `knowledge_chunks` menyimpan potongan isi dengan kolom `id`, `source_id`, `section`, `page`, `content`, `keywords`.
- Relasi sumber dan chunks dibaca untuk workspace oleh `listBootstrap()` di `server/database.ts`.
- API saat ini memiliki `PUT /api/knowledge-sources/:id` untuk menyimpan metadata + chunks, dan `DELETE /api/organizations/:workspaceId/knowledge-sources/:id` untuk menghapus sumber. Route PUT juga memanggil sinkronisasi ke RAG. `POST /api/rag/sync` menyinkronkan dokumen workspace; hanya dokumen berstatus `aktif` yang diindeks, sedangkan status lain dihapus dari RAG.
- `server/rag.ts` menyediakan `ragIndexDocument()`, yang mengirim teks ke endpoint `/knowledge/index` pada layanan RAG yang dikonfigurasi server. Endpoint ini menggunakan `replace: true`. `server/rag.ts` juga menyediakan penghapusan dokumen dari RAG.
- Kredensial RAG hanya boleh digunakan di backend dari konfigurasi environment. Jangan pernah mengirim atau mengekspos API key ke browser.
- Saat ini data knowledge base demo dibuat oleh `server/seed.ts`, termasuk dokumen `doc-demo-tariff` dan chunks `chk-demo-tariff-1`/`chk-demo-tariff-2`. Script seed memanggil `clearAllData()` yang menghapus semua data aplikasi. Data demo ini bukan alur unggah dokumen nyata.
- Tidak ada halaman UI khusus untuk membuat/mengedit/meninjau isi `knowledge_sources` dan `knowledge_chunks`. Halaman Editor hanya memperlihatkan kutipan yang dipakai sebuah draf; itu bukan halaman manajemen knowledge base.
- **Penting:** API login saat ini belum menyediakan mekanisme sesi/token server yang dapat dipercaya. Sebagian route backend tidak mengautentikasi pemanggil. Jangan menganggap pembatasan navigasi di React saja sebagai otorisasi.

Sebelum mengedit, periksa kode terbaru dan perubahan lokal. Ikuti pola UI, bahasa, tipe, serta komponen yang sudah ada. Jangan menimpa atau menghapus perubahan pengguna yang tidak terkait.

### Tujuan produk

Buat halaman **Knowledge Base** yang memungkinkan **Admin** workspace:

1. Melihat daftar dokumen untuk workspace aktif, status sinkronisasi/indeks bila informasinya tersedia, dan ringkasan metadata.
2. Membuka detail dokumen untuk membaca metadata dan seluruh chunks (section, nomor halaman, keywords, isi), agar admin dapat memeriksa sumber sebelum digunakan.
3. Menambahkan dokumen nyata dengan mengisi metadata dan isi teks sumber, lalu menyunting/meninjau hasil pemecahan chunks sebelum menyimpan.
4. Mengedit metadata, isi, urutan, section, halaman, keywords, dan status dokumen/chunks.
5. Menghapus dokumen dengan konfirmasi. Penghapusan harus berdampak konsisten pada PostgreSQL dan knowledge base RAG yang sesuai.
6. Menyinkronkan atau mengindeks ulang workspace/dokumen secara eksplisit, dengan umpan balik jumlah berhasil/gagal dan pesan error yang jelas.
7. Menggunakan data **workspace aktif saja**. Jangan tampilkan, indeks, ubah, atau hapus data tenant lain.

### UX dan navigasi

- Tambahkan item navigasi **Knowledge Base** di `Sidebar` dan tab/halaman terkait di `App.tsx`.
- Halaman dan semua aksi pengelolaan hanya tersedia untuk **admin**. Creator/reviewer tidak boleh dapat mengaksesnya dengan mengetik route, memanggil API secara langsung, atau mengubah parameter workspace.
- Buat UI berbahasa Indonesia yang konsisten dengan gaya aplikasi (card, form, badge/status, loading/empty/error state).
- Daftar dokumen menampilkan sekurangnya judul, kategori, versi, pemilik, tanggal berlaku, status, tanggal unggah, dan ringkasan.
- Sediakan pencarian/filter yang berguna bila pola aplikasi memungkinkan.
- Detail dokumen harus menampilkan isi chunks secara utuh dan mudah dibaca; jangan hanya menampilkan judul atau kutipan ringkas.
- Form pengelolaan harus mendukung teks dokumen dan preview/edit chunks sebelum persistensi. Jangan mengklaim parsing PDF/DOCX tersedia jika belum dibuat.
- Untuk input awal, dukung penempelan teks biasa dan pemecahan chunks yang dapat ditinjau admin. Jika menambah dukungan file PDF/DOCX, gunakan parser yang sesuai, validasi ukuran/tipe file, jelaskan kegagalan ekstraksi, dan jangan menyimpan file ke lokasi publik. Jangan menambahkan dependency besar tanpa kebutuhan yang jelas.
- Gunakan label status konsisten dengan `DocumentStatus`: `aktif`, `menunggu_persetujuan`, `usang`, `gagal_diproses`. Jelaskan bahwa hanya `aktif` yang digunakan dalam retrieval RAG.
- Jangan menciptakan tab/page `knowledge_base` yang tidak tercakup dalam union `ActiveTab` atau akses role policy.

### Keamanan dan integritas data (wajib)

- Terapkan otorisasi **di server**, bukan hanya menyembunyikan link atau tombol di frontend. Otorisasi harus memverifikasi identitas user yang login, peran admin, dan membership aktif pada workspace target.
- Karena aplikasi saat ini belum mempunyai sesi/token tepercaya untuk API, periksa alur autentikasi yang ada dan implementasikan mekanisme sesi/API autentikasi minimum yang sesuai dengan arsitektur aplikasi (misalnya token bertanda tangan dengan secret server, masa berlaku, validasi, dan penyimpanan klien yang aman). Jangan percaya `role`, `userId`, atau `workspaceId` yang hanya dikirim bebas oleh browser. Jangan hardcode secret.
- Lindungi semua endpoint manajemen Knowledge Base dan endpoint sync/prune yang dapat mengubah KB. Pertahankan endpoint lain yang tidak terkait, tetapi jangan membuat jalur pintas yang melemahkan pemeriksaan workspace/role.
- Pastikan query database memvalidasi bahwa `sourceId` memang milik `workspaceId` yang diotorisasi. Karena `knowledge_sources.id` merupakan primary key global, jangan mengizinkan update lintas workspace melalui `ON CONFLICT(id)`.
- Simpan metadata/chunks dalam transaksi PostgreSQL. Chunk lama tidak boleh hilang jika penyimpanan chunk baru gagal.
- Sinkronisasi RAG dan PostgreSQL dapat gagal secara terpisah. Laporkan hasil sinkronisasi secara eksplisit; jangan menampilkan pesan sukses bila indeks gagal. Jangan menghapus data PostgreSQL hanya karena RAG tidak tersedia.
- Hapus atau nonaktifkan dokumen pada RAG ketika dokumen dihapus atau statusnya bukan `aktif`, sesuai pola backend saat ini. Tangani kegagalan RAG dengan jelas dan sediakan cara retry/sinkronisasi ulang.
- Jangan mencatat isi dokumen sensitif, kredensial, atau API key ke log.
- Jangan menjalankan `db:clear`, `clearAllData()`, atau `db:seed` selama implementasi/validasi. Script seed saat ini destruktif dan mereset seluruh data aplikasi.

### Penyimpanan dan integrasi RAG

- Gunakan struktur tipe yang ada di `src/types/index.ts` (`KnowledgeDocument`, `KnowledgeChunk`, `DocumentCategory`, `DocumentStatus`) atau rapikan tipe bersama bila perlu.
- Gunakan API service frontend yang ada di `src/services/apiService.ts`; jangan akses PostgreSQL langsung dari browser.
- Untuk mengubah isi sumber, simpan metadata dan chunks ke PostgreSQL, lalu indeks teks gabungan dari chunks ke RAG menggunakan `ragIndexDocument()` di server.
- Metadata RAG setidaknya harus mengidentifikasi workspace dan dokumen, agar indeks tetap tenant-scoped. Ikuti format/kontrak yang digunakan `server/rag.ts`.
- Gunakan id stabil dan unik untuk dokumen dan chunks. Pertahankan referensi chunk yang benar ke `source_id`.
- Setelah simpan/hapus/status berubah, muat ulang data workspace di UI dan pastikan hasil retrieval berikutnya mencerminkan perubahan.
- Hindari duplikasi isi: ketika mengganti chunks, pastikan operasi DB melakukan replace secara atomik; indexing RAG harus menggunakan replace/update sesuai kontrak layanan.

### Tes dan kriteria penerimaan

Tambahkan atau perbarui tes yang relevan. Minimal verifikasi:

1. Admin dapat membuka halaman dan mengelola dokumen hanya untuk workspace yang menjadi anggotanya.
2. Creator dan reviewer tidak dapat mengakses UI/API manajemen, termasuk dengan request API langsung.
3. Daftar/detail menampilkan dokumen dan isi chunks workspace aktif saja.
4. Membuat/memperbarui dokumen menyimpan metadata dan chunks dengan benar; edit chunks menghapus chunks lama dan mengganti dengan yang baru secara konsisten.
5. Status aktif memicu indexing; status nonaktif menghapus/menonaktifkan entri remote sesuai pola yang ada.
6. Penghapusan dokumen memeriksa workspace ownership, menghapus record/chunks yang sesuai, dan menangani kegagalan remote secara eksplisit.
7. Kegagalan validasi, PostgreSQL, atau layanan RAG terlihat jelas di UI dan tidak menghasilkan toast sukses palsu.
8. Workspace A tidak dapat membaca atau memutasi dokumen workspace B.

Jalankan tes backend terarah yang aman terhadap database test, tes frontend yang relevan, lint, dan build. Pastikan command test benar-benar menggunakan database test; jangan pernah menjalankan tes yang memanggil `clearAllData()` terhadap database development. Jika pengujian tidak dapat dijalankan dengan aman, jelaskan hambatannya dan jangan beralih ke database development.

### Batasan lingkup

- Jangan mengubah atau menghapus dokumen/data demo secara otomatis.
- Jangan mengubah script seeding untuk menghapus data atau menimpa dokumen yang sudah ada.
- Jangan membuat fitur manajemen dokumen hanya di browser/localStorage.
- Jangan menambahkan CRUD untuk tabel lain yang tidak dibutuhkan.
- Jangan menyebut hasil indexing berhasil sebelum layanan RAG mengonfirmasi keberhasilan.
- Ikuti pola kode yang ada dan jaga perubahan tetap fokus pada halaman Knowledge Base, API yang diperlukan, otorisasi, serta tes/dokumentasi terkait.

### Hasil yang diminta

Implementasikan perubahan langsung di repository. Pada akhir pekerjaan, rangkum:

- Halaman dan kontrol yang ditambahkan.
- Mekanisme otorisasi yang digunakan, termasuk perubahan autentikasi bila diperlukan.
- Endpoint dan tabel yang terlibat.
- Tes/build/lint yang berhasil atau gagal.
- Batasan dukungan format dokumen dan cara admin mengisi isi dokumen.

---
