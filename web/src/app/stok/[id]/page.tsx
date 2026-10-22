import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DeleteSkidButton } from "@/components/DeleteSkidButton";
import { setStatusAction } from "@/lib/actions";
import { actionMeta, eventLabel, statusMeta } from "@/lib/constants";
import { kg, stampDate } from "@/lib/format";
import { getSkid, listDispositions, listExecutionsForSkid, listSkidEvents, ticketPhotoUrl } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function SkidDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; reprint?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const { id } = await params;
  const sp = await searchParams;
  const skid = await getSkid(id);
  if (!skid) notFound();
  const meta = statusMeta(skid.status);
  const disps = (await listDispositions()).filter((d) => d.skid_id === id);
  const execs = await listExecutionsForSkid(id);
  const events = await listSkidEvents(id);
  const photoUrl = await ticketPhotoUrl(skid.ticket_photo_path);

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/">
      <p className="h-kicker">{skid.ticket_type.replace("_", "-")}</p>
      {sp.e ? <p className="err">{sp.e}</p> : null}
      {sp.reprint ? (
        <p className="muted">ID berubah. Print ulang label SM1 jika tag sudah tempel di skid.</p>
      ) : null}
      <div className="ticket">
        <div className={`ticket-rail ${skid.ticket_type === "NON_PRODUCTIVE" ? "np" : ""}`}>
          {skid.ticket_type === "NON_PRODUCTIVE" ? "NON-PRODUCTIVE" : "PRODUCTIVE"}
        </div>
        <div className="ticket-body">
          <div className="row-between">
            <div className="ticket-code">{skid.compound_code}</div>
            <span className={`stamp ${meta.tone}`}>{meta.label}</span>
          </div>
          <div className="ticket-meta">
            <span>RUN {skid.run_no}</span>
            <span>SKID {skid.skid_no}</span>
            {skid.rack ? <span>RAK {skid.rack}</span> : null}
          </div>
          <div className="barcode-line" />
        </div>
      </div>

      <div className="tally" style={{ margin: "12px 0" }}>
        <div>
          <div className="n">{Math.round(skid.qty_sisa)}</div>
          <div className="l">Sisa kg</div>
        </div>
        <div>
          <div className="n">{Math.round(skid.netto)}</div>
          <div className="l">Netto</div>
        </div>
        <div>
          <div className="n">{skid.batch_count}</div>
          <div className="l">Batch</div>
        </div>
        <div>
          <div className="n">{skid.mixer || "—"}</div>
          <div className="l">Mixer</div>
        </div>
      </div>

      <p className="muted">
        Lokasi: {skid.location_name || "—"} · Asal: {skid.area_asal || "—"}
        <br />
        Mix {stampDate(skid.mix_at)} · Exp {stampDate(skid.exp_at)}
        <br />
        Dibuat {stampDate(skid.created_at)} · Diubah {stampDate(skid.updated_at)}
        {skid.kondisi ? ` · Kondisi ${skid.kondisi}` : ""}
      </p>
      {skid.remarks ? <p>{skid.remarks}</p> : null}
      {photoUrl ? (
        <img className="ticket-photo" src={photoUrl} alt={`Mixer Ticket ${skid.compound_code}`} />
      ) : (
        <p className="muted">Belum ada foto tiket.</p>
      )}

      <div className="grid-2" style={{ margin: "16px 0" }}>
        <Link className="btn" href={`/disposisi/baru?skid=${skid.id}`}>
          Disposisi
        </Link>
        <Link className="btn ghost" href={`/eksekusi?skid=${skid.id}`}>
          Pakai
        </Link>
      </div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Link className="btn ghost" href={`/stok/${skid.id}/edit`}>
          Edit / koreksi
        </Link>
        {execs.length === 0 &&
        disps.length === 0 &&
        !["CONSUMED", "SCRAP", "CLEANER", "DISPOSED", "IN_EXECUTION", "GAGAL_TRIAL"].includes(skid.status) ? (
          <DeleteSkidButton id={skid.id} label={`${skid.compound_code} run ${skid.run_no} skid ${skid.skid_no}`} />
        ) : (
          <p className="muted">Tidak bisa hapus — skid sudah punya kisah.</p>
        )}
      </div>

      {["UNDER_REVIEW", "RESTACKING", "PICKLE_OUT", "GAGAL_TRIAL"].includes(skid.status) ? (
        <form action={setStatusAction} className="grid-2" style={{ marginBottom: 16 }}>
          <input type="hidden" name="id" value={skid.id} />
          <button className="btn ghost" name="status" value="RESTACKING">
            Restacking
          </button>
          <button className="btn ghost" name="status" value="PICKLE_OUT">
            Pickle out
          </button>
        </form>
      ) : null}

      <h2 className="h-kicker">Timeline</h2>
      {events.length === 0 ? (
        <p className="muted">Belum ada jejak. Jalankan supabase/004_skid_event.sql sekali, lalu daftar/pindah/pakai lagi.</p>
      ) : (
        <ul className="history">
          {events.map((e) => (
            <li key={e.id}>
              <strong>{eventLabel(e.action)}</strong>
              {e.nik ? ` · ${e.nik}` : ""}
              <br />
              <span className="muted">{stampDate(e.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="h-kicker">Tag disposisi</h2>
      {disps.length === 0 ? (
        <p className="muted">Belum ada tag.</p>
      ) : (
        <ul className="history">
          {disps.map((d) => (
            <li key={d.id}>
              <Link href={`/label/${d.id}`}>
                <strong>#{d.tag_no}</strong> · {actionMeta(d.action_type).label} · {d.status}
              </Link>
              <br />
              <span className="muted">
                {d.action_rule || d.target_area || "—"} · {stampDate(d.date_disp)}
                {d.verified_at ? " · verify OK" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="h-kicker">Eksekusi</h2>
      {execs.length === 0 ? (
        <p className="muted">Belum ada pemakaian.</p>
      ) : (
        <ul className="history">
          {execs.map((e) => (
            <li key={e.id}>
              {kg(e.kg_used)} di {e.machine_area} · {e.result}
              <br />
              <span className="muted">
                {e.operator} · {stampDate(e.exec_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
