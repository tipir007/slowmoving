import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ACTIONS, LOCATIONS, SOURCE_AREAS, STATUSES, TARGET_AREAS } from "@/lib/constants";
import { getSession } from "@/lib/session";

export default async function KamusPage() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/kamus">
      <p className="h-kicker">PPT slide 2</p>
      <h1 className="page-title">KAMUS LAPANGAN</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Identitas skid resmi: <strong>compound + run + skid</strong>. Excel lama diimpor sebagai data awal.
      </p>

      <h2 className="h-kicker">Status</h2>
      <ul className="history">
        {STATUSES.map((s) => (
          <li key={s.id}>
            <span className={`stamp ${s.tone}`}>{s.label}</span>
            <span className="muted"> · {s.zone} · {s.id}</span>
          </li>
        ))}
      </ul>

      <h2 className="h-kicker">Tindakan disposisi</h2>
      <ul className="history">
        {ACTIONS.map((a) => (
          <li key={a.id}>
            <strong>{a.label}</strong>
            <br />
            <span className="muted">{a.hint}</span>
          </li>
        ))}
      </ul>

      <h2 className="h-kicker">Lokasi</h2>
      <ul className="history">
        {LOCATIONS.map((l) => (
          <li key={l.code}>
            {l.name} <span className="muted">· {l.zone}</span>
          </li>
        ))}
      </ul>

      <h2 className="h-kicker">Alur to-be (PPT slide 2)</h2>
      <ul className="history">
        <li>
          <strong>1. INPUT</strong> — Mixing foto tiket, konfirmasi, timbang/ketik kg, terkunci. Status Under Review. Ganti Excel NEW.
        </li>
        <li>
          <strong>2. HOLD</strong> — Rak Merah: stok live, ID compound+run+skid, expiry. Gagal trial parkir di sini.
        </li>
        <li>
          <strong>3. ACTION</strong> — Restacking / pickle out di HP. Tanpa print, tanpa ttd. Selesai = antri disposisi.
        </li>
        <li>
          <strong>4. PUTUSAN</strong> — Satu-satunya titik print. QC kondisi, PC aturan, ttd NIK, scan verify. Scrap: Supervisor.
        </li>
        <li>
          <strong>5. EKSEKUSI</strong> — Scan label di mesin, catat kg, sisa hidup. Gagal trial kembali ke Rak Merah, jangan daftar ulang.
        </li>
        <li>
          <strong>6. PAPAN</strong> — Maju jika kg/skid turun & leftover terdaftar; mundur jika gagal trial / tag OPEN mengendap.
        </li>
      </ul>

      <h2 className="h-kicker">Sumber & tujuan (slide 2)</h2>
      <ul className="history">
        <li>
          Sumber leftover: {SOURCE_AREAS.join(", ")}
        </li>
        <li>
          Dipakai ulang / keluar: {TARGET_AREAS.join(", ")}
        </li>
        <li>Print hanya di langkah 4. Leftover baru ke langkah 1. Gagal trial ke Rak Merah, bukan daftar ulang.</li>
      </ul>

      <h2 className="h-kicker">Keputusan sementara</h2>
      <ul className="history">
        <li>Input pertama: Mixing / material handler.</li>
        <li>Scrap & cleaner: Supervisor boleh, PC membuat tag.</li>
        <li>Fase 1 tidak wajib printer fisik — pratinjau label SM1 di HP/laptop cukup.</li>
        <li>Warna tag kuning vs putih masih bisa dipakai, arti final menunggu konfirmasi lapangan.</li>
      </ul>

      <h2 className="h-kicker">Barcode Mixer Ticket</h2>
      <ul className="history">
        <li>Atas = compound (contoh <strong>S6H63</strong>, <strong>T7131</strong>).</li>
        <li>Samping = run 6 digit + skid 3 digit (contoh <strong>785751003</strong> → run 785751, skid 3).</li>
        <li>Kalau yang discan malah label SM1, form daftar menolak — itu tag disposisi, bukan skid baru.</li>
      </ul>

      <h2 className="h-kicker">Label SM1</h2>
      <ul className="history">
        <li>
          Payload: <strong>SM1|tag|compound|run|skid|disposition_id</strong>
        </li>
        <li>QR + Code128 + teks. Scan di Pakai / verify menolak barcode Mixer Ticket.</li>
        <li>Printer fisik belakangan; sekarang cetak = pratinjau + PDF browser.</li>
      </ul>
    </AppShell>
  );
}
