import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createDispositionAction } from "@/lib/actions";
import { ACTIONS, TARGET_AREAS } from "@/lib/constants";
import { getSkid, listSkids } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function DisposisiBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ skid?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const sp = await searchParams;
  const selected = sp.skid ? await getSkid(sp.skid) : null;
  const candidates = (await listSkids()).filter((s) =>
    ["UNDER_REVIEW", "RESTACKING", "PICKLE_OUT", "GAGAL_TRIAL", "DISPOSED", "IN_EXECUTION"].includes(s.status),
  );

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/disposisi">
      <p className="h-kicker">Ganti kertas tag</p>
      <h1 className="page-title">TAG BARU</h1>
      <form action={createDispositionAction}>
        <div className="field">
          <label>1. Material apa?</label>
          <select name="skidId" required defaultValue={selected?.id || ""}>
            <option value="" disabled>
              Pilih skid
            </option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.compound_code} · run {s.run_no} · skid {s.skid_no} · {Math.round(s.qty_sisa)}kg
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>4. Mau diapakan?</label>
          <select name="actionType" required defaultValue="USE_AS_IS">
            {ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>5. Ke mana?</label>
          <select name="targetArea" defaultValue="8in Ext">
            {TARGET_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>6. Aturan pakai</label>
          <input name="actionRule" placeholder="Blend 50% / max 10 kg per batch / coba 1 batch" />
        </div>
        <div className="field">
          <label>Compound tujuan (jika blend / WA)</label>
          <input name="targetCompound" placeholder="F7894" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>7. Berlaku sampai</label>
            <input name="dateExp" type="datetime-local" />
          </div>
          <div className="field">
            <label>Warna tag</label>
            <select name="tagColor" defaultValue="WHITE">
              <option value="WHITE">Putih</option>
              <option value="YELLOW">Kuning</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Catatan lapangan</label>
          <textarea name="remarks" rows={2} placeholder="Production feedback" />
        </div>
        <p className="muted">Originator: {session.name}. Tag number dibuat otomatis.</p>
        <button className="btn sulfur" type="submit">
          Terbitkan tag
        </button>
      </form>
    </AppShell>
  );
}
