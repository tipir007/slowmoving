import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TicketCard } from "@/components/TicketCard";
import { STATUSES } from "@/lib/constants";
import { kg } from "@/lib/format";
import { countOpen, listSkids, summaryByStatus } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function StokPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const sp = await searchParams;
  const status = sp.status || "LIVE";
  const q = sp.q || "";
  const live = ["UNDER_REVIEW", "RESTACKING", "PICKLE_OUT", "GAGAL_TRIAL", "DISPOSED", "IN_EXECUTION"];
  const rows = (await listSkids({
    q,
    status: status === "LIVE" || status === "ALL" ? undefined : status,
  })).filter((s) => (status === "LIVE" ? live.includes(s.status) : true));
  const tally = await countOpen();
  const byStatus = await summaryByStatus();
  const kgLive = byStatus
    .filter((s) => live.includes(s.status))
    .reduce((a, b) => a + Number(b.kg || 0), 0);

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/">
      <p className="h-kicker">Papan stok</p>
      <h1 className="page-title">SKID DI RAK</h1>
      <p className="muted" style={{ marginTop: -6 }}>Sumber data: Supabase Slowmoving (bukan Excel / SQLite)</p>
      <div className="tally">
        <div>
          <div className="n">{tally.review || 0}</div>
          <div className="l">Review</div>
        </div>
        <div>
          <div className="n">{tally.ready || 0}</div>
          <div className="l">Siap pakai</div>
        </div>
        <div>
          <div className="n">{tally.running || 0}</div>
          <div className="l">Mesin</div>
        </div>
        <div>
          <div className="n">{Math.round(kgLive)}</div>
          <div className="l">Kg hidup</div>
        </div>
      </div>

      <form className="search" action="/">
        {status !== "LIVE" ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={q} placeholder="Cari compound / run / rak" />
        <button className="btn" type="submit" style={{ width: 88 }}>
          Cari
        </button>
      </form>

      <div className="filters">
        {[
          ["LIVE", "Hidup"],
          ["ALL", "Semua"],
          ...STATUSES.map((s) => [s.id, s.label] as const),
        ].map(([id, label]) => (
          <a key={id} className={status === id ? "on" : ""} href={id === "LIVE" ? "/" : `/?status=${id}`}>
            {label}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">Tidak ada skid untuk filter ini. Daftarkan dari Mixer Ticket.</div>
      ) : (
        rows.map((skid) => <TicketCard key={skid.id} skid={skid} />)
      )}
      <p className="muted">{rows.length} skid · {kg(rows.reduce((a, s) => a + s.qty_sisa, 0))} sisa tampil</p>
    </AppShell>
  );
}
