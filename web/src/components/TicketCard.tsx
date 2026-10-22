import Link from "next/link";
import { statusMeta } from "@/lib/constants";
import { ageingClass, kg, stampDate } from "@/lib/format";
import type { SkidRow } from "@/lib/queries";

export function TicketCard({ skid }: { skid: SkidRow }) {
  const meta = statusMeta(skid.status);
  const expClass = ageingClass(skid.exp_at);
  return (
    <Link href={`/stok/${skid.id}`} className={`ticket ${expClass}`}>
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
          <span>{kg(skid.qty_sisa)} sisa</span>
        </div>
        <div className="ticket-meta">
          <span>{skid.location_name || "Tanpa lokasi"}</span>
          {skid.open_tag ? <span>TAG {skid.open_tag}</span> : null}
          {skid.mix_at ? <span>MIX {stampDate(skid.mix_at)}</span> : null}
          {skid.exp_at ? <span>EXP {stampDate(skid.exp_at)}</span> : null}
        </div>
        <div className="barcode-line" />
      </div>
    </Link>
  );
}
