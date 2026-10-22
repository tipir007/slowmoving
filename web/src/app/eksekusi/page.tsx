import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ScanSm1 } from "@/components/ScanSm1";
import { executeAction } from "@/lib/actions";
import { TARGET_AREAS } from "@/lib/constants";
import { kg, stampDate } from "@/lib/format";
import { getSkid, listDispositions, listExecutions, listSkids } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function EksekusiPage({
  searchParams,
}: {
  searchParams: Promise<{ skid?: string; disp?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const sp = await searchParams;
  const selected = sp.skid ? await getSkid(sp.skid) : null;
  const live = (await listSkids()).filter((s) =>
    ["DISPOSED", "IN_EXECUTION", "RESTACKING", "PICKLE_OUT"].includes(s.status),
  );
  const openDisp = selected
    ? (await listDispositions("OPEN"))
        .concat(await listDispositions("IN_PROGRESS"))
        .filter((d) => d.skid_id === selected.id)
    : [];
  const history = await listExecutions(12);

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/eksekusi">
      <p className="h-kicker">Scan lalu timbang</p>
      <h1 className="page-title">PAKAI SKID</h1>
      <ScanSm1 purpose="execute" />
      <form action={executeAction}>
        <div className="field">
          <label>Skid</label>
          <select name="skidId" required defaultValue={selected?.id || ""}>
            <option value="" disabled>
              Pilih skid siap pakai
            </option>
            {live.map((s) => (
              <option key={s.id} value={s.id}>
                {s.compound_code} · {s.run_no} · sisa {Math.round(s.qty_sisa)}kg
              </option>
            ))}
          </select>
        </div>
        {openDisp.length > 0 ? (
          <div className="field">
            <label>Tag disposisi</label>
            <select name="dispositionId" defaultValue={sp.disp || openDisp[0]?.id}>
              {openDisp.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.tag_no} · {d.action_type}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="dispositionId" value="" />
        )}
        <div className="grid-2">
          <div className="field">
            <label>Mesin / area</label>
            <select name="machineArea" defaultValue={session.role === "CALCUT" ? "3 Roll Cal" : "8in Ext"}>
              {TARGET_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Kg terpakai</label>
            <input name="kgUsed" type="number" step="0.1" required placeholder="10" />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Hasil</label>
            <select name="result" defaultValue="OK">
              <option value="OK">OK habis / sesuai</option>
              <option value="PARTIAL">Sebagian</option>
              <option value="FAIL">Gagal trial — kembali Rak Merah</option>
            </select>
          </div>
          <div className="field">
            <label>Shift</label>
            <select name="shift" defaultValue="1">
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Catatan</label>
          <input name="note" placeholder="Trial 1 batch OK / lumpy gagal" />
        </div>
        <button className="btn" type="submit">
          Catat pemakaian
        </button>
      </form>

      <h2 className="h-kicker" style={{ marginTop: 24 }}>
        Terakhir dipakai
      </h2>
      {history.length === 0 ? (
        <p className="muted">Belum ada eksekusi.</p>
      ) : (
        <ul className="history">
          {history.map((e) => (
            <li key={e.id}>
              <strong>{e.compound_code}</strong> · {kg(e.kg_used)} · {e.machine_area} · {e.result}
              <br />
              <span className="muted">
                {e.operator} {e.tag_no ? `· tag ${e.tag_no}` : ""} · {stampDate(e.exec_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
