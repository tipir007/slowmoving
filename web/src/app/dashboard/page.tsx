import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { saveSnapshotAction } from "@/lib/actions";
import {
  buildBoard,
  jakartaToday,
  jakartaYesterday,
  liveKg,
  liveSkids,
} from "@/lib/dashboard";
import { getSnapshot, listDispositions, listSkids, upsertTodaySnapshot } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; needsql?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const sp = await searchParams;

  const skids = await listSkids();
  const dispositions = await listDispositions();
  const today = jakartaToday();
  const yesterday = jakartaYesterday();

  const ySnap = await getSnapshot(yesterday);
  const missingTable = ySnap.missingTable;

  if (!missingTable) {
    const openTags = dispositions.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS");
    const byStatus: Record<string, number> = {};
    for (const s of skids) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    await upsertTodaySnapshot({
      snapDate: today,
      kgLive: liveKg(skids),
      skidLive: liveSkids(skids).length,
      gagalTrial: skids.filter((s) => s.status === "GAGAL_TRIAL").length,
      tagOpen: openTags.length,
      byStatus,
    });
  }

  const board = buildBoard({
    skids,
    dispositions,
    yesterday: ySnap.row,
    today,
  });

  const tone =
    board.verdict === "MAJU"
      ? "maju"
      : board.verdict === "MUNDUR"
        ? "mundur"
        : board.verdict === "WASPADA"
          ? "waspada"
          : "belum";

  const label =
    board.verdict === "MAJU"
      ? "MAJU"
      : board.verdict === "MUNDUR"
        ? "MUNDUR"
        : board.verdict === "WASPADA"
          ? "WASPADA"
          : "BELUM BISA DITILAI";

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/dashboard" wide>
      <p className="h-kicker">Rapat harian · {today}</p>
      <h1 className="page-title">PAPAN PROGRESS</h1>

      {missingTable || sp.needsql ? (
        <div className="alert">
          Jalankan sekali <strong>supabase/003_stock_snapshot.sql</strong> di SQL Editor Supabase
          supaya “vs kemarin” bisa dihitung. Tanpa itu, putusan stok tidak dikarang.
        </div>
      ) : null}
      {sp.saved ? <p className="muted">Snapshot hari ini tersimpan. Besok dipakai sebagai “kemarin”.</p> : null}

      <section className={`verdict verdict-${tone}`}>
        <div className="verdict-kicker">Putusan hari ini</div>
        <div className="verdict-word">{label}</div>
        <p className="verdict-copy">{board.sentence}</p>
        <p className="verdict-meta">
          Hidup sekarang: {board.skidNow} skid · {Math.round(board.kgNow).toLocaleString("id-ID")} kg
        </p>
      </section>

      <p className="h-kicker" style={{ marginTop: 18 }}>
        Lima sinyal
      </p>
      <div className="signal-grid">
        {board.signals.map((s) => (
          <article key={s.id} className={`signal lamp-${s.lamp}`}>
            <div className="signal-lamp" aria-hidden />
            <div className="signal-title">{s.title}</div>
            <div className="signal-value">{s.value}</div>
            <div className="signal-hint">{s.hint}</div>
          </article>
        ))}
      </div>

      <p className="h-kicker" style={{ marginTop: 18 }}>
        Kerjakan hari ini
      </p>
      {board.work.length === 0 ? (
        <div className="empty">Tidak ada antrian merah dari gagal trial, tag OPEN, review lama, atau expiry.</div>
      ) : (
        <ul className="work-list">
          {board.work.map((w) => (
            <li key={w.href + w.why}>
              <Link href={w.href}>
                <strong>{w.title}</strong>
                <span>{w.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={saveSnapshotAction} style={{ marginTop: 16 }}>
        <button className="btn ghost" type="submit">
          Catat angka hari ini
        </button>
      </form>
      <p className="muted" style={{ marginTop: 8 }}>
        Hijau = maju, kuning = waspada, merah = mundur. Abu-abu = datanya belum ada, tidak dihitung.
      </p>
    </AppShell>
  );
}
