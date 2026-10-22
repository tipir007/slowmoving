# Plan ML — gelombang 2: jam, tanggal, tracking alur

Dokumen ini merinci **baca tiket + tampil waktu** di HP dan laptop. Acuan proses: `plan.md` §7.1 (dua jam) dan §9.1 (pipeline).

**Tidak dikerjakan di dokumen ini:** kode / APK. Setelah kedua plan disetujui, baru perbaikan Android.

**Bukan pekerjaan ini:** model sampah EcoReward TFLite, tebak kg dari gambar, OCR tulis tangan form DISPOSITION, deteksi lumpy, stempel bundar sebagai jam sistem.

---

## 0. Status gelombang 1 (selesai 21 Sep 2026)

Gelombang 1 sudah masuk APK. Jangan ulang diagnosis lama (“foto tidak diproses”).

| Item | Status |
|---|---|
| Still-image barcode (ML Kit) dari foto / galeri | Jalan |
| OCR latin on-device + Tesseract web otomatis | Jalan |
| Parser 9 digit, `K16D4R`, `24-JAN-2024`, tolak `128000` | Gold tes lolos |
| Reset session scan per foto baru | Jalan |
| Form konfirmasi: Exp/Mix tanggal + jam | Ada kotak |
| Izin galeri (`READ_MEDIA_IMAGES`) | Ada |
| Tes gold repo (F7894, K16D4R, S0431, S6H63) | `GOLD_OK` |

Bukti 23 Sep 2026 (skid `K16D4R` / run `791518` / skid `3` / mixer `2` / netto `50`): **ID + kg sudah benar**. Celah tersisa = **jam** dan **layar setelah simpan**.

---

## 1. Gejala yang harus hilang (bukti 23 Sep 2026)

Tiga layar, satu skid.

| # | Layar | Yang terlihat | Celah |
|---|---|---|---|
| E | Konfirmasi scan / foto | Mix tanggal `2026-09-19` terisi. Mix jam **kosong**. Exp tanggal + jam **kosong**. | OCR mentah sudah ada `Expet:2026-10-10 07` dan `Datette:2026-09-19 07:26`. Tanggal mix lolos; jam putus; Exp gagal karena label OCR rusak. |
| F | Edit skid | Mixer, netto, rak, area, kondisi, catatan. | **Tidak ada** kotak Mix/Exp tanggal atau jam. Operator tidak bisa koreksi waktu tiket. |
| G | Review compound (Stok detail) | Compound, run, skid, status, sisa kg, netto, mixer, asal. | **Tidak ada** Mix, Exp, jam dibuat, jam diubah. Tracking umur rak buta. |

Yang wajib terisi **sebelum** dianggap “tiket terbaca”:

1. Kode barcode (atas = compound, samping = run+skid 9 digit) — jika ada di foto
2. Kode compound
3. Run number (6 digit)
4. **Tanggal Exp dan tanggal Mix** (bukan jam)

**Jam:menit boleh kosong.** Jangan tahan simpan, jangan isi `00:00` palsu. Kalau OCR punya jam, isi; kalau tidak, biarkan kosong.

Setelah simpan, tanggal (dan jam jika ada) wajib muncul di Review + Edit + daftar Stok.

Kg **tetap diketik**.

---

## 2. Diagnosis manager produksi

Manager produksi tidak peduli “OCR sudah jalan”. Yang dibutuhkan: **kapan compound dicampur, kapan expired, kapan orang bertindak**. Tanpa jam, papan “gagal trial > 24 jam” dan “exp ≤ 2 hari” salah hitung (semua dianggap tengah malam).

### 2.1 Dua jam, jangan dicampur

| Jam | Sumber | Contoh bukti 23 Sep | Dipakai untuk |
|---|---|---|---|
| **Jam tiket** | Cetak Mixer Ticket `Date` / `Exp` | Mix `2026-09-19 07:26`, Exp `2026-10-10 07:26` | FIFO, lampu expired, umur di rak |
| **Jam sistem** | Server Asia/Jakarta + NIK login | `created_at` saat skid `K16D4R` disimpan | Urutan kerja, papan vs kemarin, 24 jam gagal trial |

Stempel bundar di tiket **bukan** jam sistem. Jam tiket gagal baca → kotak jam **kosong** (boleh simpan). Jangan isi `00:00` palsu. Tanggal tiket tetap wajib.

Rincian alur: `plan.md` §7.1.

### 2.2 Tiga celah (bukan satu bug kamera)

**A. Parser jam masih kaku (penyebab gejala E)**

OCR lapangan (bukan teks rapi gold):

```
PRODUCTTVE
Mixe ickot
K16D4R
Expet:2026-10-10 07
Mixer:2
791518003
Datette:2026-09-19 07:26
Emp:AA398822
S2026-09-19 07:26
```

Parser sekarang (`parseTicketDateTime`):

- Label harus `\bExp\b` / `\bDate\b` — gagal pada `Expet`, `Datette`.
- Jam hanya `HH:MM` dengan titik dua ASCII — gagal pada `07` tanpa menit, `07.26`, `07 26`, `07：26` (fullwidth), jam di baris berikutnya.
- Tanggal tanpa jam → simpan date-only. Form Mix jam kosong walau tiket punya `07:26`.

**B. Layar setelah simpan tidak punya waktu (penyebab F + G)**

`ConfirmScreen` sudah punya 4 kotak. `StokDetailScreen` dan `StokEditScreen` tidak. API list sudah menarik `exp_at` / `created_at` tetapi UI tidak menampilkannya. Koreksi jam tidak mungkin tanpa buka ulang foto.

**C. Stempel aktivitas masih date-only (belum kelihatan di HP, akan merusak papan)**

`disposition.date_disp` / `date_exp` = tipe `date`. Tag OPEN > 3 hari dan lewat exp dihitung midnight. Eksekusi punya `exec_at` tetapi Review skid tidak menampilkannya.

Kamera **bukan** prioritas gelombang 2. ID sudah kebaca. Prioritas: **kotak OCR di atas → pecah otomatis (tanggal wajib, jam opsional) → Review/Edit**.

---

## 3. Alur konfirmasi: OCR dulu, lalu pecah ke field

Satu layar **Cek lalu simpan**. Sumber kebenaran teks = kotak OCR. Field di bawah adalah hasil potong otomatis, bukan input pertama.

```
foto / galeri / live (barcode + OCR)
  → isi kotak "Teks OCR (boleh dikoreksi)"  ← PALING ATAS
  → parser + fusion otomatis membagi ke kotak di bawah
       Compound, Run, Skid, Mixer, Emp,
       Exp tanggal, Exp jam, Mix tanggal, Mix jam
  → operator boleh koreksi teks OCR  → field di bawah dihitung ulang
  → operator boleh koreksi satu field  → nilai itu menang untuk field itu
  → Simpan
```

### 3.1 Urutan kotak di HP + web

Dari atas ke bawah:

1. **Teks OCR (boleh dikoreksi)** — besar, multiline, langsung terlihat tanpa scroll jauh
2. Catatan singkat + barcode mentah (satu baris)
3. Foto tiket (kecil, boleh dilipat)
4. Compound, Run, Skid, Mixer, Emp
5. Exp tanggal · Exp jam
6. Mix tanggal · Mix jam
7. Netto kg (tetap diketik)
8. Tombol simpan

Sekarang kotak OCR ada di **paling bawah** — itu yang diubah. Operator mengoreksi teks mentah dulu (mis. `Expet` → `Exp`, tambah `:26`), baru cek potongan field.

### 3.2 Aturan pecah otomatis

- Setiap perubahan teks OCR → parse ulang → isi field yang masih “dari mesin”.
- Field yang sudah diketik operator **jangan ditimpa** (kecuali operator tap Reset field / ganti foto).
- Barcode tetap menang untuk compound / run / skid jika decode OK; OCR mengisi sisanya dan menjadi cadangan ID.
- Koreksi di kotak OCR adalah cara utama memperbaiki `Expet` / `Datette` / baris putus — tidak wajib buka Edit skid dulu.

---

## 4. Aturan baca tanggal & jam (parser)

Satu file: `ticketParser.ts` (web + mobile, tetap mirror).

### 4.1 Label kotor

Cari tanggal dekat kata yang **mirip** Exp / Date / Mix, bukan exact word-boundary.

| OCR | Artinya |
|---|---|
| `Exp`, `EXP`, `Expet`, `Expiry`, `Expire` | Exp tiket |
| `Date`, `Datette`, `Mix date`, `Mixing date` | Mix tiket |
| `Mixe ickot` | noise header, **bukan** mix datetime |

Jika label gagal: ambil ISO `YYYY-MM-DD` di dokumen. Yang **kemudian** = Exp, yang **dahulu** = Mix (tiket Mixer selalu Exp > Mix). Jangan ambil stempel bundar / `S2026-…` sebagai pengganti jika label sudah ketemu.

### 4.2 Varian jam (kalau ada, isi; kalau tidak, kosong)

Setelah tanggal, terima salah satu:

| Pola | Contoh | Hasil |
|---|---|---|
| `HH:MM` | `07:26` | `07:26` |
| `HH.MM` | `07.26` | `07:26` |
| `HH MM` | `07 26` | `07:26` |
| `HH：MM` fullwidth | `07：26` | `07:26` |
| `H:MM` | `7:26` | `07:26` |
| `HH` saja di baris yang sama | `2026-10-10 07` | coba menit di baris berikut; kalau tidak ada → **tanggal isi, jam kosong** |
| Jam di baris berikut | `Exp:2026-10-10` + baris `07:26` | gabung |
| Tanpa jam | `2026-10-10` | tanggal isi, jam kosong — **ini sah** |

Normalisasi sebelum regex: fullwidth digit/colon → ASCII; `O`/`o` di jam → `0` jika di posisi waktu.

### 4.3 Fusion waktu

| Field | Sumber | Jika gagal |
|---|---|---|
| exp tanggal | OCR Exp (wajib diusahakan) | kosong → operator ketik / koreksi OCR |
| exp jam | OCR Exp (varian §4.2) | **kosong = sah** |
| mix tanggal | OCR Date (wajib diusahakan) | kosong → operator ketik / koreksi OCR |
| mix jam | OCR Date | **kosong = sah** |

Barcode **tidak** berisi tanggal/jam. Jangan isi jam dari `created_at`. Jangan isi jam dari tanggal.

Bentrok dua tanggal → biarkan di kotak OCR; field ikut label; operator kunci.

### 4.4 Validasi sebelum simpan

- Wajib: compound + run + skid + netto + **minimal tanggal Mix atau tanggal Exp** (lebih baik keduanya).
- Jam Exp / Mix: **tidak wajib**. Kosong = simpan date-only, bukan `00:00`.
- Exp < Mix (kalau keduanya ada tanggal) → minta koreksi.
- Operator lebih disarankan mengoreksi kotak OCR di atas daripada mengarang jam.

---

## 5. Permukaan UI yang wajib (HP + web)

Jam yang sudah di DB **harus kelihatan**. Kalau tidak tampil, sama saja tidak ada.

| Layar | Jam tiket | Jam sistem | Catatan |
|---|---|---|---|
| Konfirmasi scan | Mix/Exp tanggal wajib diisi mesin atau operator; jam opsional | — | **OCR box paling atas**, pecah otomatis |
| **Review skid** (Stok detail) | Mix, Exp (lengkap) | Dibuat, diubah | Gejala G — **wajib gelombang 2** |
| **Edit skid** | 4 kotak: mix tgl/jam, exp tgl/jam | — | Gejala F — **wajib gelombang 2** |
| Daftar Stok | Exp (tgl+jam, pendek) | — | Lampu ≤ 2 hari pakai datetime |
| Papan | — | umur gagal trial **jam**, tag OPEN **jam** | Jangan `daysTo` date-only |
| Dispo (nanti) | — | `disp_at`, berlaku s.d. exp+jam | Skema date → timestamptz |
| Pakai / riwayat potong | — | `exec_at` tampil di review | Kg + kapan dipotong |
| Restack / pickle | — | `updated_at` | Kapan dipindah |

Format tampil lapangan: `19 Sep 2026 07:26` (Asia/Jakarta). Input tetap `YYYY-MM-DD` + `HH:MM`.

---

## 6. Stempel aktivitas (skema + papan)

Gelombang 2 UI memakai kolom yang **sudah ada** dulu (`mix_at`, `exp_at`, `created_at`, `updated_at`, `exec_at`).

Lanjut skema (boleh satu migrasi kecil, setelah UI Review/Edit hidup):

| Sekarang | Target | Alasan manager |
|---|---|---|
| `disposition.date_disp` `date` | `disp_at` timestamptz (atau kolom baru, isi dari `date_disp` 00:00 **hanya untuk data lama**) | Tag pagi vs sore beda shift |
| `disposition.date_exp` `date` | tetap tanggal berlaku **plus jam** (default jam Exp tiket atau 23:59 Jakarta, **tertulis di UI**, bukan diam) | “lewat exp” harus jam |
| `stock_snapshot.snap_date` | catat `taken_at` | banding papan vs kemarin |
| `printed_at`, `verified_at` | sudah direncana; **tampilkan** di tag | audit tempel |

Data lama tanpa jam: tampil `tanggal · jam kosong`, jangan backfill 00:00 seolah-olah akurat.

---

## 7. Pipeline

```
sumber gambar (kamera | galeri | file)
  → reset session
  → preprocess
  → BARCODE still-image
  → OCR (ML Kit / Tesseract)
  → konfirmasi:
       [atas]  Teks OCR (boleh dikoreksi)  ← hasil scan masuk sini dulu
       [bawah] field otomatis dari teks itu (tanggal wajib diisi jika ada di teks;
               jam isi jika kebaca, kalau tidak biarkan kosong)
  → operator cek / koreksi OCR / koreksi field
  → simpan (date, atau timestamptz jika jam ada)
  → Review / Edit / Stok membaca kolom yang sama
```

Live camera tetap jalur cepat ID. Foto/galeri tetap wajib mengisi kotak OCR. **Jangan** mulai TFLite di gelombang 2.

---

## 8. Data uji gelombang 2

Uji parser **tanpa HP** dulu: string OCR sintetis = teks kotor 23 Sep + gold lama.

| Sumber | Exp | Mix | Yang harus lolos |
|---|---|---|---|
| OCR kotor 23 Sep (`Expet` / `Datette` / `07` potong) | tanggal `2026-10-10` (jam isi jika menit ketemu, **boleh kosong**) | tanggal `2026-09-19` (+ jam `07:26` jika kebaca) | Exp/Mix **tanggal** jangan kosong hanya karena label `Expet`/`Datette` |
| Gold C `K16D4R` teks rapi | 2026-10-10 07:26 | 2026-09-19 07:26 | Tetap lolos (regresi) |
| Gold B `F7894` | 2026-09-24 08:10 | 2026-09-17 08:10 | Tetap |
| Gold A `S0431` `24-JAN-2024 03:01` | 2024-01-24 03:01 | 2024-01-10 03:01 | Tetap |
| Varian `2026-10-10 07.26` | 07:26 | — | titik |
| Varian `2026-10-10` + baris `07:26` | 07:26 | — | wrap |
| Varian tanggal saja | tanggal, jam kosong | — | **bukan** 00:00 |
| `128000` sendirian | — | — | tetap ditolak sebagai run |

Selesai gelombang 2 jika:

- kotak **Teks OCR** di paling atas konfirmasi; field di bawah terisi otomatis dari teks itu,
- koreksi OCR mengisi ulang field,
- Mix/Exp **tanggal** terisi dari tiket utuh; jam boleh kosong,
- Review + Edit menampilkan tanggal (dan jam jika ada),
- APK rebuild **setelah** plan disetujui.

---

## 9. Urutan implementasi (setelah plan disetujui)

Jangan mulai printer / TFLite / tahap 5.

1. **ConfirmScreen / web:** pindah **Teks OCR ke paling atas**; parse ulang setiap edit teks → field bawah.
2. **Parser tanggal** tahan `Expet`/`Datette`; jam opsional (varian §4.2 jika ada).
3. Tes gold: tanggal wajib lolos; jam kosong pada `2026-10-10 07` **bukan gagal**.
4. **Review + Edit skid** tampil/koreksi Mix/Exp tanggal (+ jam jika ada).
5. Daftar Stok + Papan baca `exp_at` (date atau datetime).
6. Rebuild APK + cek web.

---

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| Menit Exp hilang (`07` saja) | Tanggal tetap isi; jam kosong. Operator boleh tambah `:26` di kotak OCR atas |
| Dua ISO di OCR (`Date` + stempel `S2026-…`) | Utamakan label; stempel bukan mix_at |
| Operator mengisi jam sistem ke kotak Mix | Label UI: “Jam di tiket (cetak mixer)”, bukan “jam daftar” |
| Backfill 00:00 merusak papan | Data lama: jam kosong; hitung 24 jam hanya jika ada waktu |
| APK besar ML Kit | Jangan tambah modul; gelombang 2 = parser + UI |

---

## 11. Keputusan yang tidak diubah

- Satu DB Supabase untuk HP dan laptop.
- Konfirmasi operator wajib sebelum simpan.
- Unique ID = compound + run + skid.
- Print hanya dari disposisi (`SM1`); scan Pakai = decode label, bukan foto tiket.
- Input manual tetap hidup jika mesin gagal baca.
- Kg tidak dibaca dari gambar.
- Gelombang 1 (barcode still-image + OCR on-device) **tetap**; jangan rollback.
