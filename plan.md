# Plan Digitalisasi Compound Slow Moving

**Tanggal review:** 24 September 2026  
**Proses to-be disepakati:** 20 September 2026 (PPT slide 2)  
**Sumber:** `Alur Compound Slow Moving.pptx` (slide 1 existing, **slide 2 acuan to-be**), `Inventory Slow  moving Compound.xlsx`, foto Mixer Ticket & form Disposition, pola aplikasi Android **EcoReward** (`D:\training\Android studio\Ecoreward\Ecoreward_Android`)  
**Status dokumen:** Proses to-be = **PPT slide 2**. Histori & jam = **slide 3** (diselaraskan 24 Sep 2026 ke plan §6–§7). Supabase + Android + web live sudah jalan. SQLite `web/` hanya arsip seed. Pembangunan **bertahap** (§8).

---

## 1. Ringkasan

Proses Compound Slow Moving sudah berjalan, tapi masih **kertas di lantai + Excel 19 sheet**. Tiga kerepotan lapangan: input data, eksekusi kg, dan tracking maju/mundur.

Acuan digitalisasi adalah **PPT slide 2**, bukan lagi asumsi awal “scan barcode + print opsional”. Intinya:

1. **Input** — foto Mixer Ticket di HP, **barcode + OCR** baca field, operator konfirmasi, timbang netto (kg boleh diketik, lalu terkunci).
2. **Rak Merah** — stok live skid & kg; gagal trial parkir di sini, **tidak didaftar ulang**.
3. **Action** — restacking / pickle out di HP, **tanpa print dan tanpa ttd**.
4. **Disposisi** — satu-satunya titik print + ttd login NIK + scan verify label.
5. **Eksekusi** — area mesin potong kg aktual; sisa skid tetap hidup.
6. **Papan harian** — maju jika stok turun & leftover terdaftar; mundur jika gagal trial mengendap.

Excel hanya jadi export. Aplikasi HP mengikuti pola **EcoReward Android**. **Satu database: Supabase.** Dibangun **bertahap** (§8): fondasi → lihat stok → daftar manual → scan tiket → action → disposisi/print → eksekusi → papan; ML dan printer tidak menahan tahap awal.

---

## 2. Review kondisi saat ini (as-is)

### 2.1 Alur existing (PPT slide 1)

```
Sumber SM
BB1 / BB2 / BB3 / BB4 / 10in Ext / 8in Ext / Triplex
3 Roll Cal / 4 Roll Cal / UB Bead / Hexa Bead
        ↓
Non Conformance Area (Rak Merah)
        ↓
     Action
   /         \
Restacking   Pickle Out
   \         /
        ↓
  Area Disposisi
        ↓
Dipakai ulang ke:
Triplex / 10in Ext / 8in Ext / 3 Roll Cal / 4 Roll Cal / UB Bead / Hexa Bead
```

Alur fisik ini **tetap**. Yang didigitalisasi (slide 2) adalah cara input, putusan, eksekusi kg, dan tracking. PPT sekarang **3 slide**: existing · to-be 6 langkah · histori & jam (§7).

### 2.2 Dokumen fisik di lapangan

**Mixer Ticket (sudah tercetak + barcode)**

| Field | Contoh | Catatan |
|---|---|---|
| Compound code | `T7131`, `S6H63` | Barcode **atas** = compound |
| Run No | `790392`, `785751` | 6 digit |
| Skid | `2`, `3` | Barcode **samping** = `run` + skid 3 digit (`785751003`) |
| Crew / kode | `[01B5]`, `[RML]`, `[AAJ]` | Di samping Run |
| Exp date | `2026-09-21 08:51` | Ada di tiket, hampir tidak ada di Excel |
| Mix date | `2026-09-07 08:51` | Ada di tiket |
| Mixer / SPS / Emp | Mixer 3, SPS 4, AA398822 | Traceability produksi |
| Tipe | PRODUCTIVE / NON-PRODUCTIVE | Penting untuk NP vs leftover |
| Stempel / label | LPCA, `> 3 HARI RETEST MV`, tiket hijau lab | Ada proses lab/retest |
| Berat | — | **Tidak ada di tiket.** Netto hanya muncul setelah ditimbang ke Excel. |

**Form DISPOSITION (kertas, tulis tangan)**

| Field | Fungsi |
|---|---|
| TAG NO | Nomor fisik form (contoh 2274, 2255, 2371, 1242) |
| Compound code, Skid, Batch, Run No, Mix date | Identitas material |
| Defect / Area / Production feedback | Keputusan tindakan |
| Originator + paraf | Siapa yang mengeluarkan |
| Date Disp / Date Exp | Masa berlaku disposisi |
| Stempel jam | Bukti waktu di lapangan |
| Warna kertas | Putih dan kuning — fungsi beda warna **belum terdokumentasi** |

Contoh keputusan di form:

- Tag 2274 `K16V5R`: *blend dengan 2 skid yang sudah OK, giling di ext* — Area 3 Roll Calender
- Tag 2255 `B1026`: *giling di Ext* — Area timbangan dekat lab

**Gap utama:** Mixer Ticket sudah digital-cetak, Disposition masih kertas. Excel **tidak menyimpan Run No, Exp date, Mixer, Productive/NP**. Tiket dan spreadsheet tidak terhubung 1-ke-1.

### 2.3 Isi Excel saat ini (19 sheet)

| Sheet | Isi | Nilai | Masalah |
|---|---|---|---|
| `NEW` | 214 baris inventory (master paling lengkap) | Ada rack, compound, note OK/SCRAP, remarks, area, netto, tgl eksekusi, eksekutor | Campur data + kolom sisa; remarks bebas ketik |
| `Inventory` / `Sheet1` | Versi lama inventory | Histori | Duplikat `NEW`, pivot menempel di sheet yang sama |
| `Disposisi` | 161 baris tag disposisi | Field mendekati form kertas | 32 baris tanpa tanggal eksekusi; 2 tanpa tag |
| `Newcreation` | 225 baris disposisi/new creation | Ada status Habis | Duplikat konsep `Disposisi`; ejaan tidak seragam |
| `Data PC Slow Moving` | Plan harian per compound | Keputusan operasional (blend 50%, ODS, pickle out) | Kolom tanggal digeser; histori mudah tertimpa |
| `Summary SM Plan` / `Actual` / `Actual (2)` | Stok harian per kategori | Ada niat plan vs actual | Angka antar sheet tidak sinkron |
| `Dispo tracking` | Stok disposisi per area per hari (Ext/Cal/Mix) | Berguna untuk shop floor | Grid lebar, susah di-maintain |
| `Pareto` | Effort jam/skid + tracking harian | Old SM 3 jam/skid vs New Creation 1.5 jam/skid | Campur analisis dan operasional |
| `Cleaner Scrap` | Target cleaner 1.800 kg/bulan vs actual scrap | Ada nilai USD | Tidak terhubung ke transaksi skid |
| `Pivot *` | Ringkasan | Cepat untuk rapat | Bukan sumber data |
| `Flow Diagram SM` | Kosong | — | Sheet mati |

**Snapshot `NEW` (214 skid, netto terisi semua):**

- OK: 125 skid / **59.408 kg**
- SCRAP: 89 skid / **49.671 kg**
- Total: **109.079 kg**
- Netto per skid: median **500 kg**, rata-rata **510 kg**, kisaran 120–1.132 kg
- Bruto / berat skid hanya terisi 87/214 baris (berat palet median ~103 kg)
- Lokasi dominan: FIFO 198; eksekutor Mixing 141, Ext 64, Calcut 9

**Per batch ≠ per skid.** Di sheet `Disposisi`, kolom Batch hampir selalu **jumlah batch di tag** (1–4, mayoritas 1), bukan kg. Aturan pakai ODS/workaway (10–20 kg/batch) adalah jatah eksekusi, bukan berat skid. Sistem harus simpan `netto` + `qty_sisa` per skid, plus aturan kg/batch di disposisi.

**Kategori remarks di `NEW` (bebas ketik):**  
SCRAP, Restacking, Congkel, Giling di Ext, Segregasi, Pisahin, Remill, Giling di 4Roll, Potong-potong, ODS, Seleksi, Lumpy, dll.

**Jenis disposisi di sheet `Disposisi`:**  
Pakai Ext (78), Giling Ext (15), Sebagai Cleaner (11), Restacking (9), Congkel (8), Rack atas belum disposisi (7), Pakai di Calcut (6), Scrap, Segregasi, Remill + Leibax, Blend, Pakai UB, plus instruksi panjang bebas ketik.

### 2.4 Status bisnis yang sudah dipakai (diseragamkan di to-be)

1. **Under Review** — baru daftar, belum diputuskan
2. **Restacking / Pickle Out** — tindakan fisik, belum label eksekusi
3. **Disposed / siap pakai** — tag sudah print + verify
4. **In execution** — sedang dipakai di mesin, sisa kg hidup
5. **Gagal trial** — kembali Rak Merah, **skid yang sama**, antri putusan ulang
6. **Cleaner / Scrap / Habis**
7. **New Creation** — leftover baru; masuk lewat langkah 1, bukan gagal trial

---

## 3. Temuan review (masalah yang harus diselesaikan)

### Kritis

1. **Tidak ada identitas unik yang dipakai konsisten.** Mixer Ticket punya `Run + Skid`. Form kertas punya `TAG NO`. Excel kadang pakai No Comp, kadang Tag, kadang rack. Ada `NO ID`.
2. **Master data kotor.** Ejaan ganda, remarks campur keputusan + kondisi + lokasi, compound `CAMPURAN`.
3. **Sumber kebenaran pecah.** `Inventory` ≠ `NEW` ≠ `Disposisi` ≠ `Newcreation` ≠ `Summary`.
4. **Expiry ada di tiket, tidak di sistem.**
5. **Eksekusi sering tidak tertutup.** 32/161 baris `Disposisi` tanpa tanggal eksekusi. Gagal trial tidak punya status resmi (risiko daftar ulang).

### Tinggi

6. Form kertas mudah rusak/hilang.
7. Lokasi fisik tidak terstandard.
8. Keputusan disposisi berupa kalimat panjang.
9. Plan harian PC tidak punya histori rapi.
10. Scrap/cleaner punya target kg/USD, tidak terhubung ke skid.
11. Mixer Ticket tidak memuat kg — input berat mudah salah jika diketik bebas.

### Sedang — teknis Excel

12. Pivot dan raw data dalam satu sheet; sheet duplikat/kosong.
13. Tidak ada audit trail siapa mengubah apa.

### Yang sudah bagus (dipertahankan)

- Mixer Ticket punya barcode compound (atas) + run/skid (samping, contoh `785751003`) — bahan **barcode-first** + OCR + konfirmasi.
- Field form Disposition cukup untuk model data.
- Ada pembedaan Productive vs Non-Productive, plan vs actual, cleaner vs scrap, old SM vs new creation.

---

## 4. Tujuan digitalisasi (mengikuti slide 2)

1. Setiap skid punya **1 identitas** `compound + run + skid`. Gagal trial **tidak** membuat skid baru.
2. Input dari **foto Mixer Ticket + konfirmasi operator**, bukan isi Excel.
3. Restacking/pickle out **tanpa print**. Label fisik **hanya** terbit di disposisi.
4. Ttd digital = **login NIK**, bukan pilih nama orang lain.
5. Setelah tempel, **scan label** untuk verify. Foto kedua hanya audit.
6. Eksekusi memotong **kg aktual**; sisa skid tetap hidup (ODS 10–20 kg/batch).
7. Papan harian memakai definisi **maju / mundur** di slide 2.
8. Excel hanya **export laporan**.
9. **Setiap aktivitas punya jam + tanggal** (Asia/Jakarta). Tracking umur rak, expired, gagal trial > 24 jam, dan urutan kerja **tidak boleh** tanggal-saja.
10. **Histori bisa dijawab di rapat** (§7.2): potong kg, tag, snapshot, dan perubahan status. Jangan hapus skid yang sudah punya kisah. Excel hanya export dari database.

**Bukan tujuan v1:** ganti MES/SAP mixing, timbangan otomatis tersambung PLC, rilis ke Google Play Store. ML baca tiket **masuk proses** (bukan deteksi lumpy).

---

## 5. Ruang lingkup

### Masuk (in scope)

- Foto Mixer Ticket (HP Android) + **barcode + OCR** + konfirmasi operator (§9.1)
- Input netto (timbang wajib; angka boleh diketik; terkunci setelah simpan)
- Stok live Rak Merah (#skid, kg, expiry, lokasi, gagal trial)
- Restacking / pickle out (update status/lokasi, tanpa label)
- Disposisi digital: QC kondisi, PC aturan pakai, ttd NIK, print barcode, scan verify
- Tag buang / scrap: Supervisor, print tetap di disposisi
- Eksekusi di Ext / Cal / Mix: scan label, kg aktual, sisa hidup
- Loop gagal trial → Rak Merah → putusan ulang (langkah 4)
- Leftover / New Creation → langkah 1
- Papan progress maju/mundur
- Master data, role/NIK, export Excel
- **Histori per skid** (§7.2): timeline aktivitas, potongan kg, tag; snapshot harian; skid habis tidak dihapus
- **Aplikasi Android** mengikuti **EcoReward** (`Ecoreward_Android`): React Native CLI, TypeScript, kamera, TFLite on-device, dibuka di Android Studio
- **Aplikasi web di laptop/PC** (papan progress, plan PC, approve scrap, admin) — data yang sama
- **Pipeline scan + ML** (lihat §9.1): baca Mixer Ticket, decode label disposisi, scan eksekusi — bukan model sampah EcoReward
- **Satu database Supabase** (Postgres + Storage) untuk Android dan web; bukan MongoDB, bukan SQLite di HP

### Keluar dulu (out of scope v1)

- Integrasi langsung SAP/MES (siapkan field, sambung belakangan)
- Cetak Mixer Ticket baru (tetap dari mixing existing)
- Timbangan otomatis ke device timbang
- Rilis Google Play Store (distribusi APK internal / MDM cukup, sama seperti pola pabrik)
- Menyalin domain EcoReward (poin, peta, HiveMQ, ESP32, Google Sign-In sebagai login utama)
- MongoDB / database per HP / dua sumber stok
- Database pabrik (SAP/MES/Postgres internal) sebagai syarat v1 — cut-over belakangan, skema tetap SQL
- OCR tulis tangan form DISPOSITION kertas sebagai jalur utama (form digital; kertas lama = migrasi/audit)
- Deteksi visual lumpy / kondisi compound dari foto (QC tetap mata orang)
- Baca tanda tangan basah / stempel jam sebagai pengganti NIK
- Grafik histori 30 hari, papan malu per NIK, histori plan PC per orang (v1 = timeline skid + snapshot harian + export)

---

## 6. Proses to-be (acuan: PPT slide 2)

Kalimat di bawah = teks slide 2, bukan ringkasan bebas.

**Kepala slide:** foto+konfirmasi · 1 label di disposisi · gagal trial tidak daftar ulang · progress maju/mundur.

**Pintu masuk:** Leftover/New Creation baru → langkah 1. Gagal trial → Rak Merah (bukan daftar ulang).  
**Sumber mesin:** BB1, BB2, BB3, BB4, 10in Ext, 8in Ext, Triplex, 3 Roll Cal, 4 Roll Cal, UB Bead, Hexa Bead.

```
1. INPUT — Daftar skid                         PIC: Mixing
   Foto Mixer Ticket di HP → ML baca field → operator konfirmasi
   Timbang netto (wajib); kg boleh diketik; setelah simpan terkunci
   Status: Under Review
   Ganti isi Excel NEW

2. HOLD — Rak Merah
   Stok live: #skid & kg · ID = compound + run + skid
   Expiry / retest terlihat
   Gagal trial parkir di sini
   QC cek kondisi material · Mixing jaga lokasi rak
   Ganti cek fisik + Excel

3. ACTION — Siapkan material                   PIC: Mixing (fisik)
   Restacking / Pickle Out
   Pilih lokasi & kondisi · submit di HP saja
   Belum print, belum ttd
   Selesai → antri disposisi
   Tanpa label — update status

4. PUTUSAN — Disposisi digital                 ★ satu-satunya titik print
   QC: layak / kondisi · PC: aturan pakai & jadwal
   Gagal trial: putusan ulang (bukan langkah 1)
   Ttd = login NIK
   Print barcode + tempel · Verify: SCAN label tempel
   Tag buang juga di sini · Scrap: Supervisor

5. EKSEKUSI — Pakai di mesin                   PIC: area mesin
   Scan label di Ext / Cal / Mix
   Catat kg aktual di area mesin · sisa skid tetap hidup
   ODS 10–20 kg/batch OK
   Gagal trial → Rak Merah · jangan daftar ulang
   Tutup loop kg & sisa

6. PAPAN PROGRESS HARIAN
   Leftover terdaftar hari itu · gagal trial tidak mengendap
   MAJU (progress positif): kg/skid turun vs kemarin · plan PC tercapai ·
     tag sebelum expired · New Creation terdaftar hari itu · gagal trial sudah diputus
   MUNDUR (progress negatif): leftover belum didaftar · gagal trial tanpa putusan ·
     tag OPEN / kg tidak terpotong · scrap tanpa SPV · fisik rak ≠ sistem
```

**Kaki slide (wajib):** dipakai ulang ke Triplex, 10in Ext, 8in Ext, 3 Roll Cal, 4 Roll Cal, UB Bead, Hexa Bead. Cleaner / Scrap / Gagal Trial ke Rak Merah. Leftover baru ke langkah 1. **Print hanya di langkah 4.**

**Dua pintu masuk yang tidak boleh dicampur**

| Pintu | Ke mana | Bukan |
|---|---|---|
| Leftover / New Creation **baru** | Langkah 1 | — |
| Gagal trial skid **yang sudah ada** | Langkah 2 → 4 | Jangan langkah 1 |

### Role (disepakati di slide 2)

| Role | Tugas |
|---|---|
| Mixing | Foto + daftar skid, timbang/ketik kg, jaga lokasi rak, restacking/pickle out |
| QC | Cek layak/kondisi (termasuk setelah gagal trial) |
| PC / Planner | Aturan pakai & jadwal (blend / ODS / kg per batch / mesin) |
| Area Ext / Cal / Mix | Scan label, input kg aktual |
| Supervisor | Approve scrap / tag buang |
| Admin | Master data, user NIK, lokasi, printer |

### 6.1 Verifikasi slide 2 vs plan vs app (24 Sep 2026)

| Langkah slide 2 | Di plan | Di HP / web sekarang | Lolos? |
|---|---|---|---|
| 1 INPUT: foto + ML + konfirmasi + kg kunci + Under Review | Tahap 2–3, §9.1 | Tab Daftar: Live/Foto/Galeri → OCR → simpan `UNDER_REVIEW` | **Ya**. Sumber mesin wajib (web + HP) |
| 2 HOLD: stok live, ID, expiry/retest, gagal trial parkir | Tahap 1, §7.1 | Tab Stok + Review Mix/Exp + timeline | **Ya** (setelah SQL 004) |
| 3 ACTION: restack/pickle HP, tanpa print/ttd, antri disposisi | Tahap 4 | Tombol Restacking / Pickle out di Review | **Ya** + `skid_event` |
| 4 PUTUSAN: QC/PC/NIK, print+scan, tag buang, SPV scrap | Tahap 5 | Tab Dispo + pratinjau SM1 | Tag digital **ya**; printer fisik **belum** (sengaja) |
| 5 EKSEKUSI: scan label, kg aktual, sisa hidup, gagal trial tidak daftar ulang | Tahap 6 | Tab Pakai scan SM1 | **Ya** (loop gagal trial = status, bukan skid baru) |
| 6 PAPAN: maju/mundur + leftover hari itu | §12 / Tahap 7 | Tab Papan | **v0** (sinyal 1–3); snapshot harus diisi |
| Print hanya langkah 4 | Keputusan #3 | Daftar/Action tidak print | **Ya** |
| ID compound+run+skid unik | Keputusan #1 | Constraint + tolak duplikat | **Ya** |
| Histori tiap langkah (§7.2) | `skid_event` + execution | Timeline Review + tulis event | **Ya** setelah `004_skid_event.sql` |
| Sumber BB1–BB4, Ext, Cal, Bead | `SOURCE_AREAS` | Web Daftar + HP Confirm | **Ya** |
| Dipakai ulang ke Ext/Cal/Bead | `TARGET_AREAS` | Dispo + Pakai | **Ya** (+ Mixing/Cleaner/Scrap) |

Kalau slide 2 dan app beda, **slide 2 yang menang**. Jangan menambah langkah di luar 1–6.

---

## 7. Model data inti

**`skid_inventory`** — 1 baris = 1 skid fisik (`compound_code` + `run_no` + `skid_no` unik)

- Data tiket: mixer, mix_at, exp_at, sps, emp_id, ticket_type, crew_code
- **`mix_at` dan `exp_at` = tanggal + jam** (timestamptz). Jangan potong jadi date-only saat simpan/tampil.
- Berat: bruto, berat_skid, netto, qty_sisa; `kg_locked` setelah simpan
- Foto tiket (sumber scan), `document_type`, raw barcode, raw OCR, `field_confidence`, flag `operator_confirmed`
- status, lokasi, area_asal, kondisi, note_qc
- `created_by` = NIK login; `created_at` / `updated_at` tampil di HP (waktu sistem)
- Skid **CONSUMED / SCRAP / CLEANER tetap di tabel** (qty_sisa 0). Hapus hanya salah daftar **sebelum** ada tag atau potongan kg.

**`skid_event`** — 1 baris = 1 aktivitas (timeline Review, bukan hanya status terakhir)

- `skid_id`, `at` (timestamptz Asia/Jakarta), `nik`, `action`
- `action`: `DAFTAR` | `EDIT` | `RESTACK` | `PICKLE_OUT` | `DISPO` | `PRINT` | `VERIFY` | `PAKAI` | `GAGAL_TRIAL` | `SNAPSHOT` (opsional)
- `before` / `after` (json ringkas: status, kg, lokasi, mix/exp) — wajib untuk `EDIT`
- Diisi otomatis dari HP/web; operator tidak mengetik log

**`disposition`**

- tag_no, action_type, action_rule, target_area, target_compound
- date_disp, date_exp — **v1 lanjut: simpan jam** (`disp_at`, `date_exp` + waktu, atau naikkan jadi timestamptz). Tag OPEN > 3 hari dan lewat exp dihitung per jam, bukan midnight.
- qc_nik, pc_nik, approver_nik (ttd = login, bukan pilih nama)
- printed_at, verified_at (scan payload `SM1` label tempel)
- `label_payload`, `verify_scan_raw` (tolak kalau yang discan Mixer Ticket, kecuali mode ikat fisik)
- status OPEN / IN_PROGRESS / DONE / CANCELLED / FAILED / SUPERSEDED (ganti tag setelah gagal trial)
- tag buang/scrap juga record disposisi (print tetap di sini)

**`execution`**

- skid_id, disposition_id, machine_area, kg_used, result OK / PARTIAL / FAIL_TRIAL
- operator NIK, shift
- `exec_at` **wajib tampil** di review skid (tanggal + jam potong kg)
- FAIL_TRIAL → skid status `GAGAL_TRIAL`, qty_sisa tidak dihapus

### 7.1 Dua jam, jangan dicampur (wajib tracking)

Manager produksi butuh urutan waktu, bukan hanya “hari ini ada di rak”.

| Jam | Sumber | Dipakai untuk |
|---|---|---|
| **Jam tiket** | Cetak Mixer Ticket: `Date` / `Exp` (`YYYY-MM-DD HH:MM`) | Umur compound, FIFO, retest, lampu exp ≤ 2 hari |
| **Jam sistem** | Server saat operator bertindak (Asia/Jakarta) | Siapa daftar/edit/dispo/pakai kapan; papan vs kemarin; gagal trial > 24 jam |

Jangan pakai stempel bundar di tiket sebagai jam sistem (tetap NIK + server). Jangan isi jam `00:00` palsu jika OCR gagal — field jam kuning, operator ketik.

**Setiap alur wajib punya datetime di layar HP + web (bukan hanya di database):**

| Alur | Jam tiket | Jam sistem |
|---|---|---|
| Daftar / scan / foto | mix_at, exp_at (baca + konfirmasi) | created_at |
| Review skid (Stok detail) | Mix + Exp tampil lengkap | Dibuat / diubah |
| Edit / koreksi | Mix + Exp bisa dikoreksi | updated_at |
| Restack / pickle | — | updated_at (kapan dipindah) |
| Tag baru | — | disp_at; date_exp + jam berlaku |
| Print / verify tempel | — | printed_at, verified_at |
| Pakai di mesin | — | exec_at |
| Gagal trial | — | updated_at (mulai hitung 24 jam) |
| Snapshot papan | — | taken_at / snap_date + jam catat |

Tanpa jam, papan “gagal trial > 24 jam” dan “exp 2 hari lagi” **salah hitung** (semua dianggap tengah malam).

### 7.2 Histori lapangan (wajib tracking)

Manager produksi tidak butuh 19 sheet Excel. Yang wajib: **jawab rapat dan audit dalam 1 menit**, per skid dan per hari.

**Empat pertanyaan yang harus terjawab dari sistem (bukan dari ingatan):**

| Pertanyaan | Sudah ada di model | Celah sekarang (Tahap 0–3) |
|---|---|---|
| Kapan dicampur / expired? | `mix_at`, `exp_at` | Harus tampil di Review/Edit, bukan hanya DB |
| Kapan masuk rak, siapa daftar? | `created_at`, `created_by` | OK jika UI menampilkan |
| Kapan potong kg, mesin mana, sisa? | `execution` (1 baris / potongan) | Wajib tampil di Review |
| Rak kemarin vs hari ini? | `stock_snapshot` | Kosong jika tombol snapshot tidak dipakai |
| Tag kapan dibuat / print / verify? | `created_at`, `printed_at`, `verified_at` | `date_disp` masih date-only — naikkan jam (§7.1) |
| Siapa edit run/kg/lokasi, nilai lama? | — | Hanya `updated_at`. Perlu `skid_event` |
| Urutan restack / pickle / gagal trial? | status skid | Status **tertimpa**. Perlu event |
| Skid dihapus / CONSUMED 3 bulan lalu? | berisiko hilang | Hapus = kisah hilang. Jangan hapus yang sudah dipakai |

**Aturan (produksi, bukan IT):**

1. **Jangan hapus skid yang sudah punya kisah.** Habis = `CONSUMED` + qty_sisa 0. Hapus hanya salah ketik ID **sebelum** tag OPEN / potongan kg (sudah dikunci sebagian di app).
2. **Gagal trial = skid yang sama.** Potongan dan tag lama tetap nempel di `compound+run+skid`. Daftar ulang = histori putus.
3. **Transaksi tidak menimpa transaksi.** Potong kg = insert `execution`. Tag baru = insert `disposition`. Edit field = update skid **plus** baris `skid_event`.
4. **Snapshot harian wajib** (≈06:00 atau tutup shift). Tanpa ini papan “maju/mundur vs kemarin” mengarang.
5. **Export laporan dari database** (stok hidup, potongan kg, gagal trial, tag OPEN, timeline skid). Bukan ketik ulang sheet `NEW`.
6. Review skid = **timeline** (event + eksekusi + tag), bukan hanya status terakhir.

**Tidak masuk v1 histori:** grafik 30 hari, papan malu per NIK, histori plan PC per orang, stempel bundar sebagai jam sistem, Excel lama sebagai sumber kebenaran.

Celah as-is “tidak ada audit trail siapa mengubah apa” (gap #13) ditutup oleh `skid_event` + NIK login, bukan oleh sheet baru.

**Pemetaan event ke langkah slide 2**

| Langkah | Event `action` | Bukti di Review |
|---|---|---|
| 1 INPUT | `DAFTAR` | created_at, NIK, foto, mix/exp |
| 2 HOLD | (lihat stok; event hanya jika edit lokasi/kondisi) | `EDIT` |
| 3 ACTION | `RESTACK` / `PICKLE_OUT` | kapan dipindah |
| 4 PUTUSAN | `DISPO` / `PRINT` / `VERIFY` | tag, printed_at, verified_at |
| 5 EKSEKUSI | `PAKAI` / `GAGAL_TRIAL` | baris `execution` + jam |
| 6 PAPAN | `SNAPSHOT` (harian) | `stock_snapshot` |

### Status skid

```
UNDER_REVIEW → RESTACKING | PICKLE_OUT → DISPOSED → IN_EXECUTION → CONSUMED
                                              ↓
                                        GAGAL_TRIAL ──► (putusan ulang di DISPOSED)
                                              ↓
                                    CLEANER | SCRAP
```

### Master tindakan

| Kode | Nama tampilan | Asal lapangan |
|---|---|---|
| `RESTACK` | Restacking | restacking (langkah 3, bukan tag) |
| `PICKLE_OUT` | Pickle out | pickle out lumpy (langkah 3) |
| `USE_AS_IS` | Pakai langsung | pakai ext / calcut / UB |
| `MILL_THEN_USE` | Giling lalu pakai | giling ext / 4 roll |
| `BLEND` | Blend | blend 50% |
| `WORKAWAY` | Workaway / ODS | ODS 10–20 kg/batch |
| `CONGKEL` | Congkel | congkel |
| `SEGREGATE` | Segregasi | pisahin, seleksi |
| `CUT` | Potong-potong | potong-potong |
| `REMILL` | Remill | remill |
| `CLEANER` | Sebagai cleaner | cleaner N5843 |
| `SCRAP` | Scrap | scrap, tag buang |

Aturan kg/batch, compound tujuan, “coba 1 batch” masuk `action_rule`.

---

## 8. Tahapan pembangunan (bertahap)

Dibangun **urut**. Tahap berikutnya tidak dimulai sebelum tahap sebelumnya **bisa dipakai** di HP atau laptop (bukan hanya demo layar).

Aturan pecah tahap:

1. **Satu database dari awal** — Supabase; jangan SQLite di HP.
2. **Input manual dulu, ML belakangan** — operator harus bisa daftar skid tanpa menunggu OCR akurat.
3. **Tag digital dulu, printer belakangan** — disposisi boleh hidup sebelum printer label siap; print+scan `SM1` tahap sendiri.
4. **Web laptop dan Android jalan bersamaan** tiap tahap yang menyentuh stok — data yang sama.
5. Prototype `web/` + `rak-merah.db` = bahan seed, bukan produk akhir.

```
0 Fondasi → 1 Lihat stok → 2 Daftar manual → 3 Scan tiket
        → 4 Action → 5 Disposisi + print/scan → 6 Eksekusi
        → 7 Papan + cut-over Excel → 8 (nanti) DB pabrik / MES
```

| Gelombang | Tahap | Yang bisa dipakai setelah selesai |
|---|---|---|
| A. Lihat & daftar | 0 – 2 | Stok Rak Merah di HP+laptop; Mixing daftar skid (ketik + kg) |
| B. Scan & putusan | 3 – 5 | Foto tiket terbaca; restacking; disposisi + label `SM1` |
| C. Pakai & rapat | 6 – 7 | Potong kg di mesin; gagal trial; papan maju/mundur; Excel input ditutup |
| D. Pabrik | 8 | Postgres internal; MES opsional |

---

### Tahap 0 — Fondasi (1–2 minggu)

**Tujuan:** Android, web, dan database sudah nyambung. Belum ada alur lapangan baru.

| Kerja | Isi |
|---|---|
| Supabase | Project baru; tabel `users` (NIK, role, nama), `location`, `skid`, `disposition`, `execution`, `stock_snapshot`; Storage foto; unik `compound+run+skid`. Tabel `skid_event` boleh menyusul Tahap 4 (jangan tunda 0–2) |
| Seed | Impor Excel `NEW` / `Disposisi` + `rak-merah.db` |
| Web | Ganti SQLite → Supabase; login NIK (bukan pilih nama cookie) |
| Android | Scaffold pola EcoReward: splash, login NIK, tab kosong, `supabase-js` ke project yang sama |
| Kamus | Status/lokasi/tindakan = slide 2 |

**Belum:** foto ML, print, eksekusi, papan.

**Selesai jika:** satu NIK login di HP **dan** laptop, lihat jumlah skid seed yang sama.

---

### Tahap 1 — Lihat stok Rak Merah (1 minggu)

**Tujuan:** ganti Excel sebagai **papan lihat** stok.

- Daftar skid: compound, run, skid, kg sisa, status, lokasi, **expiry tanggal+jam**
- Filter status / compound / lokasi; cari
- HP: tab Rak. Laptop: layar stok (lebih lebar)

**Belum:** tombol daftar baru, foto, print.

**Selesai jika:** Mixing/QC/PC membuka stok di HP atau laptop **tanpa** buka sheet `NEW`.

---

### Tahap 2 — Daftar skid manual (1–2 minggu)

**Tujuan:** langkah 1 slide 2 jalan **tanpa ML**. Leftover / New Creation masuk sini.

- Form: compound, run, skid, mixer, **mix tanggal+jam**, **exp tanggal+jam**, tipe, lokasi, **netto** (wajib, boleh ketik, `kg_locked`)
- Foto tiket **disimpan** ke Storage (belum wajib terbaca mesin)
- Konfirmasi sebelum simpan; ID unik; tolak duplikat
- Fallback ketik jika HP tanpa kamera (laptop)

**Belum:** barcode/OCR mengisi form sendiri.

**Selesai jika:** Mixing mendaftar skid baru ke Rak Merah dari HP; muncul di laptop saat itu juga.

---

### Tahap 3 — Scan Mixer Ticket (barcode + OCR) (2 minggu)

**Tujuan:** percepat tahap 2. Algoritma §9.1 alur #1.

- Kamera (pola EcoReward) → jenis dokumen → **barcode dulu** → OCR → fusion → form terisi
- Operator **wajib** konfirmasi; field kuning jika ragu
- Scan/foto → kotak **Teks OCR (boleh dikoreksi) di paling atas** → otomatis pecah ke field. **Tanggal Exp/Mix wajib diusahakan**; jam boleh kosong. Detail: `plan_ML.md` §3.
- Log koreksi operator (untuk latih ulang)
- Dataset ≥ 30 tiket kotor di Rak Merah sebelum wajibkan foto sebagai satu-satunya pintu (ketik tetap ada)

**Belum:** decode label `SM1` (itu tahap 5–6).

**Selesai jika:** ≥ 90% tiket utuh terisi ID **dan** Mix/Exp tanggal; jam:menit bonus (boleh kosong). Review + Edit menampilkan tanggal yang sama.

---

### Tahap 4 — Action restacking / pickle out (1 minggu)

**Tujuan:** langkah 3 slide 2. **Tanpa print, tanpa ttd.**

- Pilih skid di Rak → Restacking atau Pickle Out → lokasi/kondisi → submit
- Status berubah; **antri disposisi** (langkah 4) — tanpa label
- Tulis `skid_event` (`RESTACK` / `PICKLE_OUT`) — jangan hanya timpa status
- Stok HP = laptop

**Belum:** label fisik.

**Selesai jika:** Mixing update lokasi di HP; tidak ada kertas action; Review skid menunjukkan kapan dipindah.

---

### Tahap 5 — Disposisi digital + print + scan verify (2–3 minggu)

**Tujuan:** langkah 4 slide 2. Satu-satunya titik print.

Urutan dalam tahap ini (tetap pecah kalau printer belum datang):

1. Form digital QC (layak/kondisi) + PC (aturan pakai, kg/batch, mesin) + ttd = NIK login
2. Tag digital `tag_no`; scrap = Supervisor
3. Print label `SM1` (QR + Code128 + teks)
4. Scan verify tempel (decode `SM1`, tolak barcode Mixer Ticket)
5. Tag buang / reprint rusak

**Selesai jika:** QC/PC tidak isi sheet `Disposisi`; label hanya keluar dari sini; verify = scan bukan foto kedua.

---

### Tahap 6 — Eksekusi & gagal trial (2–3 minggu)

**Tujuan:** langkah 5 slide 2.

- Scan `SM1` di Ext / Cal / Mix → input kg aktual → `qty_sisa` hidup (ODS 10–20 kg/batch)
- Setiap potongan = 1 baris `execution` (tidak menimpa potongan lama)
- Gagal trial → `GAGAL_TRIAL` di Rak Merah → **putusan ulang tahap 5**, bukan daftar ulang tahap 2
- Leftover baru tetap ke tahap 2
- Skid habis → `CONSUMED`, **jangan delete**

**Selesai jika:** sisa kg benar; gagal trial tidak membuat skid baru; Review menampilkan semua potongan + jam.

---

### Tahap 7 — Papan maju/mundur + cut-over Excel (2 minggu)

**Tujuan:** langkah 6 slide 2 + rapat harian tanpa pivot. Layout dan aturan putusan = **§12.1**.

- Papan `/dashboard`: MAJU / WASPADA / MUNDUR + 5 sinyal + daftar kerja
- Snapshot harian `stock_snapshot`
- Plan PC (sinyal 5) + hitung leftover fisik (sinyal 4)
- Export Excel laporan dari DB (stok hidup, eksekusi, gagal trial, tag OPEN, timeline skid) — bukan input
- Kunci input Excel setelah 2 minggu paralel

**Selesai jika:** rapat harian pakai papan app; sheet `NEW` / `Disposisi` tidak diisi.

**Papan v0** (sinyal 1–3 saja) boleh dikerjakan lebih awal, setelah stok Supabase kelihatan, tanpa menunggu tahap 6.

---

### Tahap 8 — Pabrik (nanti, tidak menahan 0–7)

- Cut-over Supabase → Postgres pabrik (skema SQL sama)
- Integrasi MES/mixing jika tiket bisa di-query
- Timbangan otomatis, Play Store: tetap di luar v1

---

**Yang tidak dikerjakan di tahap manapun v1:** model sampah EcoReward, MongoDB, Google login, OCR tulis tangan form DISPOSITION, deteksi lumpy dari foto.

---

## 9. Usulan teknis

Satu sistem, dua pintu: **Android di HP lantai** (pola EcoReward), **web di laptop**. **Satu database: Supabase.** Bukan dua database, bukan MongoDB.

### Android = ikut EcoReward

Referensi kode: `D:\training\Android studio\Ecoreward\Ecoreward_Android`

| Yang dipakai dari EcoReward | Dipakai untuk Compound SM |
|---|---|
| React Native 0.76 CLI + Kotlin `MainActivity`, buka di Android Studio | App HP lapangan |
| TypeScript, folder `src/screens`, `services`, `stores`, `hooks` | Struktur modul SM (daftar skid, rak, disposisi, eksekusi) |
| React Navigation (native stack + bottom tabs) | Menu sesuai role Mixing / QC / area mesin |
| Zustand | Session NIK, stok, scan tiket |
| `react-native-vision-camera` + `react-native-image-picker` | Foto Mixer Ticket + scan label verify |
| Runtime `react-native-fast-tflite` + hook `useTFLite` / `useCamera` | **Bukan** model sampah. Dipakai untuk klasifikasi jenis dokumen (+ OCR kustom belakangan) |
| Pola `Scan` → hasil → konfirmasi operator | Wajib: ML/barcode mengisi form, operator yang mengunci data |
| `supabase-js` + AsyncStorage | Client ke **satu** project Supabase (tabel + foto tiket) |
| Build APK (`phoneApk` / release) tanpa Metro | Distribusi internal pabrik |

| Yang tidak disalin dari EcoReward | Alasan |
|---|---|
| Login Google / dummy `demo@ecoreward.id` | SM pakai **NIK + role** (boleh di tabel Supabase, tanpa Google) |
| Poin / reward / streak / peta / Auth Google | Bukan proses rak merah; **tabel Postgres + Storage tetap dipakai** |
| HiveMQ, Node-RED, firmware ESP32 | Tidak ada smart bin di SM |
| Model `model.tflite` 12 kelas sampah + `labels.json` Roboflow | Tugasnya klasifikasi gambar, **bukan OCR tiket**. Jangan dipakai di SM |

Pola kamera EcoReward yang dipakai ulang: `ScanScreen` → `useCamera` + `CameraView` (Vision Camera) → `useTFLite` → `ScanResultScreen` (hasil + konfirmasi operator). Form pakai `react-hook-form` + yup seperti `LoginScreen`.

**Pemetaan layar EcoReward → Compound SM (Android)**

| EcoReward | Compound SM | Catatan |
|---|---|---|
| `LoginScreen` (Google / email) | Login **NIK + role** | Jangan Google sebagai login utama |
| `SplashScreen` | Splash app pabrik | Ganti branding |
| Tab `Home` | Stok **Rak Merah** (#skid, kg, expiry, gagal trial) | Bukan dashboard poin |
| Tab `Scan` + `ScanResult` | **Input tiket**: foto Mixer Ticket → jenis dokumen → barcode + OCR → konfirmasi → kg | **Bukan** `model.tflite` sampah; output field tiket |
| (scan ulang) | **Verify / eksekusi**: decode QR/Code128 `SM1` | Bukan foto form kertas DISPOSITION |
| Tab `Map` / bin | **Tidak dipakai** | Tidak ada smart bin |
| Tab `Achievements` / reward | **Tidak dipakai** | Bukan gamifikasi |
| `Profile` / histori transaksi | Profil NIK + riwayat aksi skid (daftar, action, eksekusi) | Tanpa katalog hadiah |
| — | **Action** restacking / pickle out | Layar baru, tanpa print |
| — | **Disposisi** QC + PC + ttd NIK + print | Layar baru; print hanya di sini |
| — | **Eksekusi** kg aktual / gagal trial | Layar baru |

Tab Android usulan: **Rak** | **Scan/Input** | **Action/Disposisi** | **Eksekusi** (tampil sesuai role Mixing / QC / PC / area mesin). Form PC yang lebar dan papan maju/mundur tetap di **web laptop**.

### Laptop + backend

| Aspek | Usulan |
|---|---|
| Laptop / PC | Web (lanjutkan `web/`) untuk PC, Supervisor, admin: stok, plan, papan maju/mundur, approve scrap. Bisa buka alur yang sama tanpa andalkan kamera |
| Database | **Supabase** (satu project, Postgres). Android + web baca/tulis ke sini. Bukan MongoDB. |
| Auth | NIK + role di tabel Supabase; ttd hanya user yang login; **bukan** Google Sign-In |
| Input tiket | Android: foto → barcode + OCR (§9.1) → konfirmasi. Laptop: ketik / unggah foto ke Storage |
| Verify / eksekusi | Android: decode QR/Code128 label SM. Laptop: ketik nomor tag |
| Print | 1 printer label di Rak Merah / disposisi |
| Kg | HP atau laptop; `kg_locked`; edit hanya Supervisor + alasan |
| Distribusi Android | APK internal / MDM, bukan Play Store v1 |
| Hosting app | Web di PC/VM pabrik atau hosting ringan; **data** di Supabase dulu |
| Nanti | Cut-over ke Postgres pabrik (skema SQL sama); SQLite `rak-merah.db` hanya seed/arsip prototype |

**Pembagian:** HP Android = kerja di rak dan mesin (kamera + ML). Laptop = rapat, plan, monitoring, admin. Stok sama real-time di **satu** Supabase.

Excel lama diarsipkan untuk migrasi dan cadangan 2–4 minggu setelah go-live. File SQLite `web/data/rak-merah.db` = prototype 18 Sep 2026, **bukan** sistem hidup setelah Supabase jalan.

### 9.0 Database = Supabase (satu untuk Android + web)

Diputuskan 20 September 2026: pakai **Supabase gratis/online** seperti EcoReward, selama database pabrik belum boleh dipakai. **Bukan MongoDB.**

Project Tahap 0: **Slowmoving** — `https://hjhvchqbnocadlzaltaw.supabase.co`  
Skema SQL: `supabase/001_tahap0_schema.sql` + seed `supabase/002_tahap0_seed_master.sql`.

| Pakai di Supabase | Untuk Compound SM |
|---|---|
| PostgreSQL (tabel + constraint unik `compound + run + skid`) | `users` (NIK, role), lokasi, skid, disposisi, eksekusi, log scan/koreksi |
| Storage | Foto Mixer Ticket, foto audit label |
| `supabase-js` (pola `Ecoreward_Android/src/services/supabase.ts`) | Client Android + web ke **satu** URL/project |
| RLS / service role hati-hati | Role Mixing/QC/PC/SPV sesuai slide 2 |

| Jangan | Alasan |
|---|---|
| MongoDB / Atlas | Domain relasional (FK, potong kg, cegah stok dobel); pindah ke DB pabrik (SQL) akan berat |
| SQLite di tiap HP | Banyak database; stok HP ≠ stok laptop |
| Google Sign-In sebagai login | Tetap **NIK + role** |
| Menganggap free tier = produksi pabrik | Bisa pause/limit; data ada di cloud. Cut-over ke Postgres pabrik begitu IT izinkan |

Alur data: HP dan laptop **tidak** simpan stok sendiri. Semua tulis ke Supabase. Antrian offline (kalau jaringan lemah) hanya buffer, lalu sync ke Supabase — bukan DB kedua.

Seed awal: mapping Excel + isi `rak-merah.db` diimpor ke tabel Supabase, lalu SQLite ditinggal.

### 9.1 Pipeline scan & machine learning

EcoReward memakai TFLite untuk **satu kelas sampah per foto**. Compound SM butuh **baca dokumen terstruktur**. Model sampah **tidak dipakai ulang**; yang dipakai ulang hanya kamera, konfirmasi operator, dan runtime TFLite.

Tiga pekerjaan scan di lantai (bukan satu model untuk semua):

| # | Kapan | Objek | Algoritma yang tepat | Bukan |
|---|---|---|---|---|
| 1 | Langkah 1 Input | Foto **Mixer Ticket** | Deteksi jenis dokumen → decode **barcode 1D** → **OCR** field cetak → gabung + skor → operator konfirmasi | Klasifikasi sampah; tebak kg (kg tidak ada di tiket) |
| 2 | Langkah 4 Disposisi digital | **Label yang kita print** setelah ttd NIK | Decode **QR / Code128** payload SM; opsional foto audit | OCR tulis tangan form kertas DISPOSITION |
| 3 | Langkah 5 Eksekusi + gagal trial + reprint | Label SM di skid | Decoder yang sama dengan #2 | Daftar skid baru dari foto tiket |

#### Temuan dari foto lapangan (wajib dihormati algoritma)

**Mixer Ticket (cetak, layout tetap)**

- Barcode atas: Code-128, human-readable = **compound** (`S6H63`, `T7131`).
- Barcode samping: Code-128, isi `run` (6 digit) + `skid` 3 digit (`785751` + `003` → skid 3). Ini kandidat ID paling kuat.
- Teks: compound besar, `Run`, `Skid`, `Exp` (`YYYY-MM-DD HH:MM`, sering terpotong kanan), `Mixer`, `Date`, `SPS`, `Emp`, kode crew `[01B5]` / `[RML]` / `[AAJ]`.
- Tipe: teks tegak `PRODUCTIVE` / `NON-PRODUCTIVE`.
- Stempel/overlay: `LPCA`, `> 3 HARI RETEST MV` — flag, bukan ID.
- Gangguan nyata: plastik sleeve, tiket terlipat, dipegang tangan, cahaya buruk, background compound kotor, tanggal `Exp` terpotong.
- **Tidak ada netto/kg.**

**Tiket hijau lab** (contoh `Mixer ticket productive (2).jpeg`) layout **beda** (tanggal mixing, stempel bundar). Jangan pakai template OCR Mixer Ticket.

**Form DISPOSITION kertas** (putih/kuning): `TAG NO` cetak, field lain **tulis tangan** (`K16V5R`, `All`, kalimat blend). HTR (handwriting) akurasinya rendah di lantai. To-be: isi di HP, lalu **print label SM** — scan disposisi = decode label itu, bukan baca kertas lama.

#### Alur #1 — baca Mixer Ticket

```
foto HP
  → cek jenis dokumen (TFLite kecil, pola EcoReward tapi kelas baru)
       MIXER_TICKET | LAB_GREEN | SM_LABEL | OLD_DISPOSITION | UNKNOWN
  → jika bukan MIXER_TICKET: hentikan / alihkan (lab = lampiran; old disposition = “pakai form digital”)
  → preprocess: crop tiket, deskew, naikkan kontras
  → BARCODE DULU (on-device, bukan neural net)
       atas  → compound_code
       samping → run_no + skid_no
  → OCR teks cetak (on-device: ML Kit Text Recognition / setara)
       parser template: regex + posisi (Run:, Skid:, Exp:, Mixer, Date, SPS, Emp)
       tipe: PRODUCTIVE vs NON-PRODUCTIVE
       flag: LPCA, RETEST_MV
  → fusion
       ID: barcode menang jika decode OK
       field lain: OCR; jika bentrok dengan barcode → tandai, jangan autosave
  → skor per field (0–1); yang rendah dikosongkan + highlight
  → layar konfirmasi:
       atas  = Teks OCR (boleh dikoreksi)  ← hasil scan masuk sini dulu
       bawah = field otomatis dari teks itu
       wajib tanggal Mix/Exp; jam isi jika kebaca, kalau tidak kosong
  → simpan foto, raw barcode, raw OCR, mix_at/exp_at (date atau timestamptz)
```

Jam tiket: bonus. Tanggal tiket: wajib diusahakan. Jangan `00:00` palsu. Detail alur kotak: `plan_ML.md` §3.

Setelah simpan, **Review skid + Edit skid + daftar Stok** wajib menampilkan Mix/Exp (bukan hanya form konfirmasi). Tanpa itu tracking umur rak buta.

Aturan fusion ID:

1. Barcode samping valid (`run` 6 digit + `skid`) **dan** barcode atas = compound → isi otomatis, operator tetap cek.
2. Hanya satu barcode berhasil → isi yang ada, OCR pelengkap.
3. Keduanya gagal → OCR saja, semua field kuning, operator ketik.
4. Compound/run/skid hasil ML ≠ ketikan operator → log koreksi (untuk retraining).

Target lapangan (setelah operator, data tersimpan 100% benar karena konfirmasi wajib):

| Metrik | Target v1 |
|---|---|
| Barcode samping ter-decode (tiket utuh, cahaya cukup) | ≥ 90% |
| ID `compound+run+skid` benar **sebelum** konfirmasi (barcode + OCR) | ≥ 95% |
| Field pendukung (mixer, emp, tipe) benar sebelum konfirmasi | ≥ 80% |
| Exp + Mix **tanggal** terisi sebelum konfirmasi (tiket utuh) | ≥ 90% |
| Exp + Mix **jam:menit** terisi jika tercetak jelas | bonus (boleh kosong) |
| Tanggal tanpa jam → jam kosong, bukan 00:00 | 100% |
| Waktu foto → form terisi | < 5 detik on-device |

#### Alur #2 — scan disposisi digital

Bukan OCR form kertas. Setelah QC/PC/NIK, printer mengeluarkan **label SM** yang kita kendalikan.

Isi payload (usulan, versi `SM1`):

```
SM1|{tag_no}|{compound}|{run}|{skid}|{disposition_id}
```

Cetak **QR** (tahan kotor/miring) + **Code128** cadangan + teks manusia (`compound / run / skid / TAG`).

Algoritma verify tempel:

1. Kamera live (bukan wajib foto kedua) → decode QR atau Code128.
2. Payload harus prefix `SM1|` (tolak barcode Mixer Ticket di langkah verify, atau tawarkan “ini tiket, bukan label disposisi”).
3. Lookup API: tag + skid harus cocok dengan yang baru di-print.
4. Opsional **ikatan fisik**: scan barcode Mixer Ticket yang masih nempel di skid yang sama — compound/run/skid harus = payload label. Mismatch = salah tempel.
5. `verified_at` tercatat; foto audit opsional (disimpan, tanpa ML).

Tag buang / scrap memakai payload jenis yang sama (bukan form kuning OCR).

#### Alur #3 — scan lain

| Kebutuhan | Algoritma |
|---|---|
| Eksekusi di Ext / Cal / Mix | Decoder payload `SM1` yang sama; buka skid + sisa kg |
| Gagal trial | Scan label SM yang sudah ada → status `GAGAL_TRIAL`, **jangan** foto tiket sebagai skid baru |
| Reprint label rusak | Supervisor/QC scan lama atau pilih skid → print `SM1` baru, tag lama `SUPERSEDED` |
| Tiket mixer rusak / tanpa barcode | OCR + ketik; ID tetap unik; flag `LEGACY_INCOMPLETE` jika run hilang |
| Tiket hijau lab | Jenis `LAB_GREEN`: lampiran bukti retest, bukan pendaftaran skid |
| Form kertas lama (cut-over) | Foto audit + ketik tag; **tidak** jadi model HTR v1 |

#### Modul software (Android)

Ikuti folder EcoReward, ganti isi ML:

| Modul | Isi |
|---|---|
| `src/ml/documentClassifier.ts` | TFLite kecil: 5 kelas dokumen (ini satu-satunya yang mirip `wasteClassifier.ts`) |
| `src/ml/barcode.ts` | ML Kit / Vision Camera code scanner; parse Code128 tiket + QR `SM1` |
| `src/ml/ticketOcr.ts` | ML Kit Text Recognition + parser template Mixer Ticket |
| `src/ml/fusion.ts` | Gabung barcode + OCR + confidence |
| `src/screens/ScanTicketScreen` | Foto tiket → hasil field (ganti `ScanScreen` sampah) |
| `src/screens/ScanLabelScreen` | Live decode label SM (disposisi, eksekusi, gagal trial) |

Laptop: unggah foto tiket ke **Supabase Storage** → parser yang sama (bukan TFLite sampah); atau operator ketik. Decode label di laptop = ketik `tag_no`.

#### Data latih & uji (Tahap 0 kumpul foto, Tahap 3 pakai)

Kumpul di Rak Merah, bukan dari 3 foto contoh saja:

- ≥ 100 foto Mixer Ticket: NP vs productive, sleeve, terlipat, gelap, rotasi.
- ≥ 20 foto tiket hijau lab (agar classifier tidak tertukar).
- Setelah printer hidup: ≥ 30 foto label SM menempel di skid (miring, kotor, jauh).
- Label gold: `compound, run, skid, exp tanggal+jam, mix tanggal+jam, mixer, emp, ticket_type` + nilai barcode mentah.
- Set uji terpisah (jangan dipakai latih). Tiap koreksi operator di app = data retraining.

#### Yang sengaja tidak dibuat modelnya di v1

- Tulis tangan *production feedback* / originator di form kertas.
- Deteksi lumpy dari foto compound (tulisan “Lumpy” di lantai).
- Baca kg dari gambar (tidak tercetak).
- Stempel jam bundar sebagai waktu sistem (waktu = server + NIK).

---

## 10. Migrasi data

1. `NEW` = kandidat stok terbuka (214 skid).
2. Satukan ke `Disposisi` / `Newcreation` lewat compound + tag + tanggal; yang tidak ketemu = `UNMATCHED`.
3. `Inventory` / `Sheet1` = arsip, bukan stok hidup.
4. Skid tanpa run: `LEGACY_INCOMPLETE`, dilengkapi saat ketemu fisik.
5. Jangan buat skid baru dari histori gagal trial yang masih fisik di rak — pairing ke ID lama.

Target: **stok yang masih di rak bisa dilacak**, bukan 100% histori bersih.

---

## 11. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Alur digital lebih panjang dari kertas | Operator tolak | Action tanpa print; verify pakai scan bukan foto kedua |
| ML salah baca tiket kotor/terlipat | Stok salah ID | Barcode dulu; konfirmasi wajib; fallback ketik; log koreksi |
| Scan Mixer Ticket di langkah verify/eksekusi | Tag dianggap ter-verify padahal belum tempel label SM | Payload wajib prefix `SM1`; jenis dokumen dipisah |
| OCR form kertas DISPOSITION | Feedback/tag salah, operator buang waktu | Form digital; kertas lama audit+ketik, bukan HTR v1 |
| Menyalin `model.tflite` EcoReward | Prediksi “plastic/paper” di tiket pabrik | Hanya salin kamera + runtime TFLite; latih kelas dokumen sendiri |
| Kg diketik salah | Papan maju/mundur kacau | Konfirmasi sebelum simpan; kunci kg; edit terbatas |
| Gagal trial diinput sebagai skid baru | Stok dobel, history hilang | Constraint unik + status `GAGAL_TRIAL` |
| Printer mati | Eksekusi macet | Fallback: tag digital + reprint wajib begitu printer hidup; jangan print di mesin |
| Ttd nama orang lain | Approval palsu | Login NIK; tidak ada dropdown nama |
| Dua sistem paralel terlalu lama | Data pecah | Cut-over: Excel input di-lock setelah 2 minggu |
| Jaringan shop floor lemah | Tidak bisa foto/submit | Antrian offline sederhana di Android jika terbukti perlu |
| Android dan web tidak sinkron | Stok HP ≠ stok laptop | Satu project Supabase; HP tanpa SQLite stok |
| Free tier Supabase tidur / penuh | HP dan laptop kosong | Backup export; jangan andalkan free untuk go-live pabrik; siapkan cut-over Postgres internal |
| Data produksi di cloud tanpa izin IT | Audit/keamanan | Project terpisah, akses terbatas; pindah ke DB pabrik saat diizinkan |
| Menyalin EcoReward utuh | Login Google / IoT / poin | Supabase = **Postgres+Storage saja**; auth NIK |

---

## 12. KPI (papan maju / mundur)

**MAJU (progress positif)** — teks slide 2

- Total kg & skid Rak Merah turun vs kemarin
- Plan harian PC tercapai (blend / ODS / pakai)
- Tag tereksekusi sebelum expired
- New Creation terdaftar hari itu juga
- Gagal trial sudah diputus (pakai lagi / scrap)

**MUNDUR (progress negatif)** — teks slide 2

- Leftover belum didaftar, stok mengendap
- Gagal trial tanpa putusan QC / PC / SPV
- Tag OPEN / kg tidak terpotong
- Scrap tanpa approval Supervisor
- Fisik rak tidak sama dengan sistem

KPI turunan: % skid terdaftar vs fisik ≥ 98%; skid `NO ID` → 0; kg scrap vs target cleaner; **hit rate barcode tiket** dan **% field dikoreksi operator** (untuk retraining ML).

### 12.1 Dashboard rapat (web laptop)

Bukan salinan Excel 19 sheet, bukan daftar stok. **Satu layar untuk rapat harian:** orang yang baru masuk ruangan harus bisa jawab “hari ini kita maju atau mundur?” dalam **5 detik**, lalu lihat **kenapa** dan **apa yang dikerjakan hari ini**.

Halaman Stok (`/`) tetap daftar kerja Mixing. Dashboard = halaman baru `/dashboard` (nav laptop: **Papan**). HP cukup ringkasan 1 bar; detail di laptop.

**Tiga zona, dari atas ke bawah**

```
┌─────────────────────────────────────────┐
│  1. PUTUSAN HARI INI                    │
│     MAJU  /  WASPADA  /  MUNDUR         │
│     1 kalimat + kg/skid vs kemarin      │
├─────────────────────────────────────────┤
│  2. 5 SINYAL (lampu, bukan grafik)      │
│     tiap kartu: angka, vs kemarin, warna│
├─────────────────────────────────────────┤
│  3. KERJAKAN HARI INI (daftar tautan)   │
│     skid/tag yang membuat lampu merah   │
└─────────────────────────────────────────┘
```

Tidak ada pie chart status, tidak ada 20 KPI, tidak ada poin/reward.

**Lima sinyal (hanya ini yang dihitung ke putusan)**

| # | Sinyal | Maju (hijau) | Waspada (kuning) | Mundur (merah) | Sumber data |
|---|---|---|---|---|---|
| 1 | **Stok Rak Merah** kg+skid hidup vs kemarin 06:00 | Turun | Sama (±1%) | Naik | Snapshot harian |
| 2 | **Gagal trial** mengendap tanpa putusan | 0 | Ada, umur ≤ 24 jam | Ada, umur > 24 jam | `GAGAL_TRIAL` |
| 3 | **Tag OPEN** / kg tidak terpotong | 0 tag lewat exp (datetime) | Tag OPEN belum expired | Tag lewat exp atau OPEN > 72 jam | `disposition.disp_at` / jam berlaku |
| 4 | **Leftover baru** terdaftar hari itu | Ada daftar, atau 0 leftover | Belum diisi “hitung fisik” | Ada leftover fisik yang tidak di sistem (input SPV) | Tahap 2 + isian fisik |
| 5 | **Plan PC** hari ini (blend/ODS/pakai) | ≥ 80% kg plan terpakai | 50–79% | < 50% atau tidak ada plan | Tahap 6–7; **abu-abu** sampai plan ada |

Sinyal 4 dan 5 boleh **abu-abu** (tidak dihitung) selama datanya belum ada. Jangan pura-pura hijau.

Sinyal 2 dan 3 **wajib datetime** (§7.1): 24 jam gagal trial dan 72 jam tag OPEN dihitung dari jam sistem, bukan “hari kalender”. Exp lampu 2 hari = sisa jam ke `exp_at`, bukan date-only.

**Aturan putusan (supaya tidak debat di rapat)**

1. Ada **satu atau lebih lampu merah** pada sinyal 2 atau 3 → minimal **WASPADA**.
2. Sinyal 1 **naik** (stok mengendap) **dan** ≥ 1 merah → **MUNDUR**.
3. Sinyal 1 **turun** dan **nol merah** → **MAJU** (kuning boleh, ditulis di kalimat).
4. Semua sinyal yang aktif hijau dan stok turun → **MAJU**.
5. Kalau snapshot kemarin belum ada (hari pertama) → tampil **BELUM BISA DITILAI**, jangan mengarang.

Kalimat otomatis contoh:

- Maju: *“Rak turun 1.140 kg vs kemarin. 2 gagal trial sudah diputus. Plan ODS 80%.”*
- Waspada: *“Rak turun, tapi 3 tag OPEN lewat expired — PC/QC tutup hari ini.”*
- Mundur: *“Rak naik 800 kg. 4 gagal trial > 24 jam belum putusan. Leftover belum didaftar.”*

**Zona 3 — daftar kerja (bukan grafik)**

Maksimal 10 baris, klik ke skid:

- Gagal trial belum QC/PC
- Tag OPEN / expired
- Skid `UNDER_REVIEW` > 2 hari
- Exp ≤ 2 hari masih di rak
- (Nanti) baris plan PC yang belum terpakai

**Yang sengaja tidak ditampilkan di dashboard v1**

- Grafik 30 hari yang rapat tidak sempat baca
- Breakdown 12 jenis tindakan (itu kamus, bukan putusan)
- USD scrap (belum terhubung skid)
- Performa orang / NIK (ttd ada di transaksi, bukan papan malu)

**Data yang harus ditambah**

Tabel `stock_snapshot` (isi otomatis tiap hari ~06:00, atau tombol SPV “tutup hari”): `snap_date`, `kg_live`, `skid_live`, `gagal_trial`, `tag_open`, `json_by_status`. Tanpa ini, “vs kemarin” tidak jujur.

Opsional belakangan: `plan_harian` (PC) dan `hitung_fisik` (jumlah leftover yang kelihatan di rak tapi belum di sistem).

**Kapan dibangun**

| Versi | Kapan | Isi |
|---|---|---|
| **Papan v0** | Boleh menyusul Tahap 1 (sekarang), tidak menunggu Tahap 7 | Putusan + sinyal 1–3 dari data yang sudah ada; snapshot harian; daftar kerja. Sinyal 4–5 abu-abu. |
| **Papan v1** | Tahap 7 | + plan PC, leftover fisik, export Excel laporan, cut-over rapat tanpa pivot |

Layar laptop dulu. Android: strip MAJU/WASPADA/MUNDUR di atas tab Rak, bukan dashboard penuh.

---

## 13. Timeline usulan

Mengikuti tahapan §8. Total kasar **12–16 minggu** sampai papan harian (tahap 0–7). Tahap 8 tidak dihitung ke v1 lantai.

| Tahap | Durasi | Output yang bisa dipakai |
|---|---|---|
| 0 Fondasi | 1–2 minggu | Supabase + NIK login HP & laptop, data seed sama |
| 1 Lihat stok | 1 minggu | Rak Merah live, Excel tidak perlu dibuka untuk lihat |
| 2 Daftar manual | 1–2 minggu | Mixing daftar leftover/skid baru + kg lock |
| 3 Scan tiket | 2 minggu | Barcode + OCR mengisi form; ketik tetap ada |
| 4 Action | 1 minggu | Restacking / pickle out tanpa print |
| 5 Disposisi + print/scan | 2–3 minggu | Tag digital → label `SM1` → verify scan |
| 6 Eksekusi | 2–3 minggu | Potong kg; gagal trial tidak dobel |
| 7 Papan + cut-over | 2 minggu | Rapat pakai papan app; input Excel dikunci |
| 8 Pabrik | nanti | Postgres internal / MES |

Kalau printer belum ada, **berhenti dulu di 5.1–5.2** (form digital) lalu lanjut print saat hardware siap. Jangan menahan tahap 0–4.

Prototype `web/` = dasar layar laptop, bukan spesifikasi proses.

---

## 14. Keputusan

### Sudah diputuskan (slide 2)

1. ID skid = `compound + run + skid`.
2. Input pertama = Mixing; leftover baru ke langkah 1.
3. Print **wajib** dan **hanya** di disposisi (langkah 4), termasuk tag buang.
4. Ttd = login NIK, bukan pilih nama.
5. Verify tempel = scan label; foto kedua tidak wajib.
6. Restacking/pickle out tanpa print/ttd.
7. QC = layak/kondisi; PC = aturan pakai & jadwal; area mesin = kg; SPV = scrap.
8. Gagal trial parkir Rak Merah, putusan ulang langkah 4, **bukan** daftar ulang.
9. Kg boleh diketik, terkunci setelah simpan.
10. Tracking per skid + sisa kg; “batch” di disposisi = aturan pakai (ODS kg/batch), bukan berat skid.
11. Client = **Android React Native (pola EcoReward)** + **web laptop**, **satu database Supabase**.
12. Scan = **bukan satu model**. Tiket = barcode + OCR + konfirmasi. Disposisi/eksekusi = decode label `SM1`. Model sampah EcoReward tidak dipakai.
13. Payload label print: `SM1|{tag_no}|{compound}|{run}|{skid}|{disposition_id}` (QR + Code128).
14. Database v1 = **Supabase (Postgres + Storage)**, bukan MongoDB, bukan SQLite di HP. SQLite prototype hanya seed. Cut-over ke Postgres pabrik belakangan tanpa ganti model data.
15. Bangun **bertahap** (§8): manual sebelum ML; tag digital sebelum printer; tiap tahap harus bisa dipakai sebelum lanjut.
16. Dashboard rapat = **putusan MAJU / WASPADA / MUNDUR** + 5 sinyal + daftar kerja (§12.1). Bukan grafik Excel. Papan v0 (sinyal 1–3) boleh sebelum Tahap 7.
17. **Jam + tanggal di setiap alur** (§7.1). Tiket = mix/exp. Aktivitas = created/updated/disp/print/verify/exec. UI Stok, Edit, Daftar, Dispo, Pakai, Papan menampilkan keduanya. Jangan 00:00 palsu.
18. **Histori** (§7.2). Transaksi (potong kg, tag, snapshot) = insert, jangan timpa. Perubahan (edit/pindah) = `skid_event`. Jangan hapus skid yang sudah dipakai. Gagal trial = ID yang sama. Excel = export.

### Masih terbuka

1. Arti kertas/tag **putih vs kuning**.
2. Apakah Mixer Ticket bisa di-query dari MES/mixing, atau foto fisik saja.
3. Daftar **lokasi master** resmi (buang duplikat FIFO/NC/laydown).
4. Titik **printer label** dan prosedur jika printer mati.
5. Kapan cut-over Supabase → **Postgres pabrik** (izin IT, region, backup).
6. Library OCR on-device final (ML Kit Text Recognition vs PaddleOCR TFLite) — diputus setelah uji ≥ 30 tiket kotor di Rak Merah.
7. Apakah verify tempel **wajib ikat** scan Mixer Ticket di skid yang sama, atau cukup decode `SM1`.

---

## 15. Langkah berikutnya

Slide 2 vs plan vs app diverifikasi 24 Sep 2026 (§6.1). Tahap 0–3 dan web live sudah jalan. Kerja berikutnya **bukan** printer.

Kode HP/web sudah menulis `skid_event` + picker sumber. **Jalankan `supabase/004_skid_event.sql` sekali** supaya timeline hidup.

1. Snapshot harian tiap shift; tag/eksekusi tampil jam (`disp_at`, `exec_at`).
2. Printer fisik belakangan — pratinjau SM1 cukup.
3. Tahap 5–7 mengikuti §8; export laporan dari DB saat papan hidup.

---

## Lampiran A — File yang direview

| File | Dipakai untuk |
|---|---|
| `Alur Compound Slow Moving.pptx` slide 1 | Alur existing |
| `Alur Compound Slow Moving.pptx` slide 2 | **Acuan proses to-be** (6 langkah) |
| `Alur Compound Slow Moving.pptx` slide 3 | Histori lapangan + dua jam + jejak per langkah (§7.1–7.2) |
| `Inventory Slow  moving Compound.xlsx` | Data, kg/skid, gap kualitas, kebutuhan laporan |
| `mixer ticket NP.jpeg` | Layout tiket NP + barcode atas/samping (`S6H63` / `785751003`) |
| `Mixer ticket productive.jpeg` | Layout productive + retest; Exp terpotong; barcode `790193002` |
| `Mixer ticket productive (2).jpeg` | Tiket + **tiket hijau lab** (template OCR terpisah) |
| `Dispose 3 roll cal.jpeg` | Form tulis tangan — alasan HTR **bukan** jalur digital |
| `Dispose ext.jpeg` | Form miring/tertutup compound — scan kertas rapuh |
| `Dispose kosong.jpeg` | Template tag putih & kuning (preprint TAG NO) |
| `D:\training\Android studio\Ecoreward\Ecoreward_Android` | Pola app Android (RN, kamera, TFLite **klasifikasi gambar**, `supabase-js`) |

## Lampiran B — Prinsip desain form digital

Form meniru **keputusan lapangan**, bukan layout kertas:

1. Material apa? (foto tiket + konfirmasi)
2. Berapa kg? (timbang / ketik, lalu kunci)
3. Di mana sekarang?
4. Kondisinya apa? (QC)
5. Mau diapakan, ke mana, aturan kg/batch? (PC)
6. Label sudah tempel dan ter-scan?
7. Berapa kg terpakai di mesin, sisa berapa?
8. Gagal trial atau leftover baru? (pintu berbeda)

Kalau 8 pertanyaan ini lebih cepat dari tulis tangan + Excel, kertas bisa ditinggalkan.
