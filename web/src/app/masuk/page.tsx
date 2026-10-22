import { loginAction } from "@/lib/actions";

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const sp = await searchParams;
  const err =
    sp.e === "nik"
      ? "NIK tidak ditemukan atau nonaktif."
      : sp.e === "pin"
        ? "PIN salah."
        : sp.e === "env"
          ? "Kunci Supabase belum diisi. Buat web/.env.local (lihat .env.example), isi ANON KEY, lalu restart npm run dev."
          : sp.e === "db"
            ? "Gagal hubung ke database. Cek internet dan project Slowmoving masih Healthy."
          : sp.e
            ? "Isi NIK dan PIN."
            : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">RAK MERAH</div>
          <small>COMPOUND SLOW MOVING</small>
        </div>
      </header>
      <main className="page">
        <p className="h-kicker">Shift masuk</p>
        <h1 className="page-title">LOGIN NIK</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
          Peran mengikuti NIK di database. Demo: MIX001 / PIN 1234
        </p>
        {err ? <div className="alert">{err}</div> : null}
        <form action={loginAction}>
          <div className="field">
            <label>NIK</label>
            <input name="nik" required autoComplete="username" placeholder="MIX001" />
          </div>
          <div className="field">
            <label>PIN</label>
            <input name="pin" type="password" required autoComplete="current-password" placeholder="1234" />
          </div>
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">
            Masuk lantai
          </button>
        </form>
      </main>
    </div>
  );
}
