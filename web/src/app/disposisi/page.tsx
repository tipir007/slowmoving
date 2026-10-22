import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { actionMeta } from "@/lib/constants";
import { kg, stampDate } from "@/lib/format";
import { listDispositions } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function DisposisiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const sp = await searchParams;
  const status = sp.status || "OPEN";
  const rows = await listDispositions(status === "ALL" ? undefined : status);

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/disposisi">
      <p className="h-kicker">Form digital</p>
      <h1 className="page-title">DISPOSISI</h1>
      <Link className="btn" href="/disposisi/baru" style={{ marginBottom: 14 }}>
        Tag baru
      </Link>
      <div className="filters">
        {["OPEN", "IN_PROGRESS", "DONE", "FAILED", "ALL"].map((s) => (
          <a key={s} className={status === s ? "on" : ""} href={`/disposisi?status=${s}`}>
            {s.replace("_", " ")}
          </a>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty">Tidak ada tag dengan status ini.</div>
      ) : (
        rows.map((d) => (
          <Link key={d.id} href={`/label/${d.id}`} className="ticket">
            <div className={`ticket-rail ${d.tag_color === "YELLOW" ? "np" : ""}`}>
              TAG {d.tag_no}
            </div>
            <div className="ticket-body">
              <div className="row-between">
                <div className="ticket-code">{d.compound_code}</div>
                <span className="stamp ready">{d.status}</span>
              </div>
              <div className="ticket-meta">
                <span>{actionMeta(d.action_type).label}</span>
                <span>RUN {d.run_no}</span>
                <span>{kg(d.qty_sisa)}</span>
              </div>
              <div className="ticket-meta">
                <span>{d.target_area || d.action_rule || "—"}</span>
                <span>{stampDate(d.date_disp)}</span>
              </div>
            </div>
          </Link>
        ))
      )}
    </AppShell>
  );
}
