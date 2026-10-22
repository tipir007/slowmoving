import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { updateSkidAction } from "@/lib/actions";
import { CONDITIONS, SOURCE_AREAS } from "@/lib/constants";
import { getSkid, listExecutionsForSkid } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { splitDateTime } from "@/lib/ticketParser";

export default async function EditSkidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const { id } = await params;
  const sp = await searchParams;
  const skid = await getSkid(id);
  if (!skid) redirect("/");
  const execs = await listExecutionsForSkid(id);
  const kgLocked = execs.length > 0;
  const mix = splitDateTime(skid.mix_at);
  const exp = splitDateTime(skid.exp_at);

  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/">
      <p className="h-kicker">Koreksi data</p>
      <h1 className="page-title">EDIT SKID</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Untuk salah ketik ID atau kg. Identitas resmi tetap compound + run + skid.
        {kgLocked
          ? " Kg terkunci karena sudah ada potongan di mesin."
          : " Kg masih bisa dikoreksi selama belum dipakai."}
      </p>
      {sp.e ? <p className="err">{sp.e}</p> : null}
      <form action={updateSkidAction}>
        <input type="hidden" name="id" value={skid.id} />
        <div className="field">
          <label>Compound</label>
          <input name="compoundCode" defaultValue={skid.compound_code} required />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Run</label>
            <input name="runNo" defaultValue={skid.run_no} required />
          </div>
          <div className="field">
            <label>Skid</label>
            <input name="skidNo" defaultValue={skid.skid_no} required />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Mixer</label>
            <input name="mixer" defaultValue={skid.mixer || ""} />
          </div>
          <div className="field">
            <label>Emp</label>
            <input name="empId" defaultValue={skid.emp_id || ""} />
          </div>
        </div>
        <div className="field">
          <label>Tipe tiket</label>
          <select name="ticketType" defaultValue={skid.ticket_type}>
            <option value="PRODUCTIVE">PRODUCTIVE</option>
            <option value="NON_PRODUCTIVE">NON-PRODUCTIVE</option>
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Mix tanggal</label>
            <input name="mixDate" type="date" defaultValue={mix.date} />
          </div>
          <div className="field">
            <label>Mix jam (boleh kosong)</label>
            <input name="mixTime" type="time" defaultValue={mix.time} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Exp tanggal</label>
            <input name="expDate" type="date" defaultValue={exp.date} />
          </div>
          <div className="field">
            <label>Exp jam (boleh kosong)</label>
            <input name="expTime" type="time" defaultValue={exp.time} />
          </div>
        </div>
        <div className="field">
          <label>Netto kg {kgLocked ? "(terkunci)" : ""}</label>
          <input
            name="netto"
            type="number"
            step="0.1"
            defaultValue={skid.netto}
            disabled={kgLocked}
          />
        </div>
        <div className="field">
          <label>Rak / posisi</label>
          <input name="rack" defaultValue={skid.rack || ""} />
        </div>
        <div className="field">
          <label>Area asal (sumber mesin)</label>
          <select name="areaAsal" defaultValue={skid.area_asal || ""}>
            <option value="">Pilih sumber</option>
            {SOURCE_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Kondisi</label>
          <select name="kondisi" defaultValue={skid.kondisi || ""}>
            <option value="">—</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Catatan</label>
          <textarea name="remarks" rows={2} defaultValue={skid.remarks || ""} />
        </div>
        <p className="muted">Kalau ID berubah dan tag sudah terbit, print ulang label SM1.</p>
        <div className="grid-2">
          <button className="btn" type="submit">
            Simpan koreksi
          </button>
          <Link className="btn ghost" href={`/stok/${skid.id}`}>
            Batal
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
