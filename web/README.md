# Rak Merah

Aplikasi lantai produksi untuk Compound Slow Moving. Mengganti input Excel + form Disposition kertas.

## Jalanin lokal

```bash
cd web
npm install
npm run seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Pilih peran, lalu pakai menu bawah: Stok, Daftar, Dispo, Pakai, Kamus.

Data awal diimpor dari sheet `NEW` dan `Disposisi` di Excel inventory.

## Isi folder

- `src/app` — layar HP (stok, register, disposisi, eksekusi, kamus)
- `src/lib` — SQLite, query, session
- `data/seed.json` — hasil ekstrak Excel
- `data/rak-merah.db` — database lokal (dibuat saat `npm run seed`)
