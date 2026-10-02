# Analisis Alur Brief dan Generasi Konten Berbasis RAG

**Tanggal analisis:** 2 Oktober 2026  
**Cakupan:** alur pada fitur **Brief & Generasi Konten**, pemanggilan layanan RAG `https://rag.aiones.app`, pembentukan copywriting, dan penyimpanan draf.

## Ringkasan

Fitur Brief Studio mengirimkan parameter brief ke backend aplikasi. Backend bertindak sebagai proxy ke layanan RAG eksternal: API key tidak dikirim ke browser, knowledge base dipilih berdasarkan workspace, dan permintaan generasi menggunakan `strict_grounding` serta meminta sumber. Jawaban RAG sekarang melewati validasi bahasa, artefak/meta, angka, kecocokan pesan kunci, dan syarat brief. Jawaban yang lolos dipakai sebagai isi copy; jawaban yang gagal tidak ditampilkan dan diganti dengan teks brief yang jelas ditandai perlu verifikasi.

Jika layanan RAG tidak siap atau query gagal, Brief Studio tetap membuat draf aman dari pesan kunci, syarat, dan CTA yang dimasukkan pengguna, tanpa mengarang fakta; draf tersebut ditandai perlu verifikasi. Mesin retrieval lokal kata kunci tetap tersedia untuk jalur pemanggilan generator lama, tetapi bukan pengganti bukti dari layanan RAG pada alur UI ini.

### Penelusuran contoh fallback yang masih rancu

Contoh terakhir menunjukkan kode sedang memakai jalur fallback, bukan menjadikan jawaban RAG sebagai naskah. Indikasinya adalah pesan kunci dan batasan tampil hampir sama persis dengan input, disertai dua catatan verifikasi. Kondisi ini terjadi ketika `grounded` dari layanan RAG bernilai `false`, hasil RAG kosong, atau hasil `grounded` ditolak pemeriksaan kualitas. Panel editor menunjukkan tidak ada sumber resmi; sebelumnya Brief Studio hanya membaca `sources` dari jawaban `/query`, padahal pencarian sumber tersedia di endpoint `/search`. Dengan demikian, sumber yang sebenarnya dapat ditemukan terlewat bila endpoint query tidak menyertakannya. Penyebab awal kegagalan grounding tetap perlu dilihat dari hasil search serta status sinkronisasi dokumen.

Daftar panjang “klaim tak didukung” juga sebelumnya mencampur klaim faktual dengan alasan penolakan validator (misalnya aksara asing, angka, atau kecocokan teks). Selain itu, skor relevansi diberi batas bawah 60 dan sumber otomatis ditandai terverifikasi, walaupun skor asli rendah; ini melebih-lebihkan kepastian. Perbaikan menjalankan pencarian `/search` terpisah lalu memakai sumber tersebut bila `/query` tidak mengirim sources, mempertahankan skor sumber apa adanya, dan menandai kutipan sebagai sumber yang ditemukan—bukan bukti semua klaim telah diverifikasi. Alasan kualitas sekarang dipisahkan dari catatan grounding yang akan dilihat reviewer. Jika query menyatakan grounded tetapi kedua jalur tidak mengembalikan sumber, model tidak dipakai dan draf fallback tetap perlu verifikasi.

## Alur end-to-end

### 1. Dokumen resmi disinkronkan ke knowledge base

Sebelum konten dapat di-grounding, dokumen pengetahuan workspace disimpan bersama potongan teksnya (`knowledge_sources` dan `knowledge_chunks`). Saat dokumen disimpan melalui `PUT /api/knowledge-sources/:id`, server menyimpan perubahan ke database lalu menyinkronkannya ke RAG:

- Dokumen berstatus `aktif` diindeks; teks dibentuk dari bagian dan isi setiap chunk. Jika tidak ada chunk, server memakai ringkasan atau judul sebagai fallback.
- Dokumen yang tidak aktif dihapus dari knowledge base agar tidak dapat dipakai sebagai rujukan.
- ID knowledge base dibentuk di server dari ID workspace, dengan pola `kb-vibecontent-<workspace-yang-dinormalisasi>`. Pemanggil browser tidak menentukan ID KB secara langsung.
- Sinkronisasi juga dapat dijalankan melalui `POST /api/rag/sync`; data demo melakukan indexing saat seed. Endpoint prune menghapus dokumen remote yang tidak lagi ada di database.
- Kegagalan sinkronisasi tidak membatalkan penyimpanan database: respons menyertakan `ragSynced`, dan kegagalan dicatat sebagai warning.

Dengan demikian, RAG mengambil korpus yang sudah diindeks di layanan eksternal, bukan membaca file sumber atau tabel database secara langsung pada saat generasi.

### 2. Pengguna mengisi brief

Di `BriefStudioView`, pengguna menyusun brief yang memuat judul, kampanye/program, format, kanal, target audiens, nada suara, pesan kunci/fakta, CTA, dan batasan. Judul dan pesan kunci wajib ada. Objek `ContentBrief` dibentuk di frontend ketika tombol generasi dijalankan.

### 3. Frontend menyusun query dan memanggil backend

Frontend merangkai parameter brief menjadi teks berlabel, termasuk pesan kunci, lalu memanggil `apiService.ragQuery(workspaceId, query, 5)`. Pemanggilan browser hanya menuju `/api/rag/query` pada backend aplikasi; browser tidak menghubungi layanan RAG eksternal secara langsung.

Backend memvalidasi `workspaceId` dan `query`, kemudian meneruskan permintaan melalui klien di `server/rag.ts`. URL dasar berasal dari `RAG_API_URL`; jika nilainya `https://rag.aiones.app`, klien menambahkan `/api/v1` dan menggunakan endpoint `/query`. Jika URL konfigurasi sudah berakhiran `/api/v1`, akhiran itu tidak ditambahkan lagi. API key dibaca dari konfigurasi server (`RAG_API_KEY`) dan disertakan pada request server-ke-server.

Permintaan ke layanan RAG memuat:

- `knowledge_base_id` hasil derivasi server untuk workspace aktif;
- query yang ditambah instruksi penulisan copywriting berbahasa Indonesia, penggunaan fakta yang didukung dokumen, format satu naskah final, dan cara menerapkan panduan brief;
- opsi `top_k` (default pemanggilan fitur ini: 5), `strict_grounding: true`, dan `include_sources: true`.

### 4. Hasil RAG dipetakan dan dibersihkan

Backend mengembalikan jawaban, status `grounded`, sumber, model (bila tersedia), dan alasan tidak menjawab (bila tersedia). Frontend:

1. Mengubah sumber yang memiliki isi menjadi `GroundedCitation` (judul dokumen, bagian, kutipan, skor relevansi, dan metadata halaman).
2. Menetapkan daftar klaim belum terdukung kosong jika RAG menyatakan grounded; jika tidak, membuat catatan bahwa klaim belum ditemukan atau belum dapat di-grounding.
3. Menormalkan line ending, membuang marker sitasi numerik, dan mempertahankan jeda paragraf dengan `sanitizeRagAnswer`.
4. Memeriksa aksara non-Latin, label/meta, kata bahasa campuran yang dikenali, angka yang tidak ada di brief/sumber, angka brief yang hilang, serta kecocokan kata penting pesan dan batasan.
5. Membentuk `RemoteGrounding` berisi jawaban, sitasi, klaim belum terdukung, status grounding, dan model.

Jika jawaban melanggar pemeriksaan, teks model ditolak dan tidak diteruskan ke draf. Jika request RAG gagal atau status belum siap, UI membuat fallback deterministik dari brief, menyimpan draf dengan penanda verifikasi, serta menampilkan peringatan yang jelas.

### 5. Generator membentuk output menurut format

`generateContentFromBrief` dipanggil dengan `remote` hasil layanan RAG dan array dokumen lokal kosong. Jika hasil remote dinyatakan grounded dan memiliki jawaban, jawaban itu menjadi materi utama. Jika tidak, isi pesan kunci dari pengguna tetap dimasukkan ke draf dengan penanda **PERLU VERIFIKASI** dan catatan agar diperiksa sebelum publikasi.

Generator lalu merender konten berdasarkan format:

- **Copy & caption:** menambahkan penanda draf, judul, sapaan, materi utama, CTA, dan tagar.
- **Teks promosi/siaran pers:** menyisipkan materi utama ke dalam kerangka pengumuman, ditambah bagian sumber dan CTA.
- **Naskah singkat:** membentuk kerangka naskah beserta empat scene/arah visual/narasi; materi utama dan kutipan sumber dipakai sebagai masukan.
- **Brief visual:** membentuk panduan visual yang memasukkan materi utama dan arahan merek.

Generator juga membentuk `visualAsset` pendamping dan menjalankan `runQualityCheck`. Template siaran pers tidak lagi menyisipkan tanggal, manfaat, atau boilerplate yang tidak berasal dari brief/sumber. Pemeriksaan status mensyaratkan CTA utuh, adanya rujukan, tidak ada catatan klaim tak terdukung, serta lolos pemeriksaan brief/bahasa.

### 6. Output ditampilkan dan disimpan

Brief Studio menampilkan teks secara bertahap di area editor, lalu meneruskan objek brief dan hasil generasi ke `App.handleGenerateDraft`. Aplikasi membentuk draf status `draft`, versi pertama berisi teks, scene, sitasi, klaim belum terdukung, quality check, dan aset visual. Draf dikirim melalui `PUT /api/drafts/:id`, dimuat ulang dari bootstrap workspace, dan ditampilkan di Editor/Library.

Penyimpanan brief (`content_briefs`), draf, versi, dan sitasi dilakukan dalam transaksi PostgreSQL saat `replaceDraft` menerima brief bersama draf. Brief divalidasi agar ID, workspace, dan pembuatnya cocok dengan draf. Brief tersimpan juga dikembalikan melalui bootstrap workspace.

## Jalur data singkat

```text
Dokumen aktif + chunks
  -> PostgreSQL
  -> sinkronisasi server ke KB workspace di layanan RAG

Brief pengguna
  -> BriefStudioView
  -> POST /api/rag/query
  -> proxy server + prompt copywriting
  -> https://rag.aiones.app/api/v1/query
  -> jawaban + sumber + status grounding
  -> sanitasi + pemetaan sitasi
  -> generator sesuai format + quality check
  -> output di editor
  -> App.handleGenerateDraft
  -> PUT /api/drafts/:id
  -> PostgreSQL + refresh daftar draf
```

## Batasan dan hal yang perlu diperhatikan

1. **Fallback saat RAG gagal — ditangani.** Draf dari brief tetap dapat dibuat dengan satu penanda status di awal. Pesan kunci, syarat, dan CTA dipisahkan, tanpa penanda verifikasi ganda; sistem tidak mengklaim fallback tersebut grounded.
2. **Validasi output — diperketat dan diperjelas.** Naskah yang mengandung aksara non-Latin, artefak bahasa campuran yang dikenali, angka baru, atau kehilangan angka kunci ditolak sebelum tampil/disimpan sebagai copy hasil model. Angka kecil yang ditulis sebagai kata Bahasa Indonesia diterima; batasan tidak lagi ditolak hanya karena parafrasa rendah, dan generator tetap menambahkan teks batasan brief bila belum tercantum.
3. **Teks tambahan template — dikurangi.** Template tidak lagi mengarang tanggal, disposisi, manfaat umum, atau klaim pelayanan. CTA berasal langsung dari brief/profil merek.
4. **Sumber dan format paragraf — diperbaiki.** Sumber dicari terpisah melalui `/search` dan dipakai bila `/query` tidak mengirimkan kutipan; line break/paragraf dipertahankan. Skor sumber tidak dipaksa minimum dan kutipan tidak diklaim telah memverifikasi setiap kalimat.
5. **Persistensi brief — ditambahkan.** Brief disimpan bersama draf dalam transaksi yang sama dan dikembalikan oleh bootstrap workspace.
6. **Kegagalan simpan — terlihat.** Brief Studio menampilkan pesan jika draf gagal disimpan dan tidak menampilkan status sukses untuk kasus tersebut.
7. **Status RAG — digunakan.** Jika status diketahui belum siap/tidak terkonfigurasi, UI melewati request yang sia-sia dan masuk ke fallback aman; kegagalan query setelah status siap juga ditangani.

**Batas yang masih ada:** pemeriksaan bahasa memakai daftar artefak umum, bukan model deteksi bahasa lengkap; pemeriksaan kecocokan adalah heuristik dan tidak membuktikan entailment setiap kalimat. Status `siap_review` bukan persetujuan publikasi. Reviewer tetap harus membandingkan klaim satu per satu dengan kutipan dokumen resmi. Draf fallback dan output yang ditolak selalu berstatus perlu verifikasi.

## Berkas kode yang ditelusuri

| Area | Berkas dan lokasi |
|---|---|
| Form brief, request RAG, fallback, dan tampilan output | `src/components/BriefStudioView.tsx` |
| Proxy API frontend | `src/services/apiService.ts` |
| Konfigurasi URL dan API key | `server/env.ts` |
| Pemanggil layanan eksternal, prompt, KB, indexing | `server/rag.ts` |
| Route status/query/sinkronisasi | `server/index.ts` |
| Validasi jawaban, retrieval, generator format, quality check | `src/services/ragEngine.ts` |
| Pembentukan draf | `src/App.tsx` |
| Penyimpanan brief, versi draf, dan sitasi | `server/database.ts` |
| Skema knowledge base dan brief | `server/migrations/001_initial.sql` |
