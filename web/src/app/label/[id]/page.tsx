import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LabelPrintBar } from "@/components/LabelPrintBar";
import { ScanSm1 } from "@/components/ScanSm1";
import { Sm1Label } from "@/components/Sm1Label";
import { getDisposition } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { stampDate } from "@/lib/format";

export default async function LabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ printed?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const { id } = await params;
  const sp = await searchParams;
  const d = await getDisposition(id);
  if (!d) notFound();

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/disposisi">
      <p className="h-kicker no-print">Pratinjau label · printer fisik belakangan</p>
      <h1 className="page-title no-print">LABEL SM1</h1>
      {sp.printed ? (
        <div className="alert ok no-print">Waktu cetak tercatat. Tempel lalu scan verify.</div>
      ) : null}
      {d.printed_at ? (
        <p className="muted no-print">Dicetak {stampDate(d.printed_at)}</p>
      ) : (
        <p className="muted no-print">Belum dicatat sebagai tercetak.</p>
      )}
      {d.verified_at ? (
        <p className="muted no-print">Verify tempel {stampDate(d.verified_at)}</p>
      ) : null}

      <Sm1Label
        data={{
          id: d.id,
          tagNo: d.tag_no,
          compound: d.compound_code,
          runNo: d.run_no,
          skidNo: d.skid_no,
          actionType: d.action_type,
          actionRule: d.action_rule,
          targetArea: d.target_area,
          tagColor: d.tag_color,
          dateExp: d.date_exp,
          payload: d.label_payload,
        }}
      />

      <LabelPrintBar dispositionId={d.id} />

      <div className="no-print">
        <ScanSm1 purpose="verify" expectedId={d.id} />
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Link className="btn ghost" href={`/stok/${d.skid_id}`}>
            Ke skid
          </Link>
          <Link className="btn ghost" href={`/eksekusi?skid=${d.skid_id}&disp=${d.id}`}>
            Pakai
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
