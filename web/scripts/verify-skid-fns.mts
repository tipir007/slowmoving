import { createSkid, deleteSkid, updateSkid } from "../src/lib/queries";

const log: string[] = [];
const ok = (m: string) => log.push(`OK  ${m}`);

try {
  const made = await createSkid({
    compoundCode: "ZZFN",
    runNo: "999011",
    skidNo: "7",
    ticketType: "PRODUCTIVE",
    netto: 44,
    locationCode: "NC",
    createdBy: "MIX001",
  });
  if (!made.ok) throw new Error(`create ${made.error}`);
  const id = made.skid.id;
  ok(`createSkid ${id}`);

  const edited = await updateSkid(id, {
    compoundCode: "ZZFNX",
    runNo: "999011",
    skidNo: "7",
    netto: 41,
    kondisi: "Lumpy",
    remarks: "fn-verify-edit",
  });
  if (!edited.ok) throw new Error(`update ${edited.error}`);
  ok("updateSkid compound+kg");

  const clash = await updateSkid(id, {
    compoundCode: "N1785",
    runNo: "L0151",
    skidNo: "C21",
  });
  if (clash.ok) throw new Error("update duplikat C21 tidak ditolak");
  ok(`unik C21 ditolak: ${clash.error}`);

  const other = await createSkid({
    compoundCode: "ZZFN",
    runNo: "999012",
    skidNo: "7",
    ticketType: "PRODUCTIVE",
    netto: 10,
    locationCode: "NC",
    createdBy: "MIX001",
  });
  if (!other.ok) throw new Error(`create other ${other.error}`);
  const clash2 = await updateSkid(id, {
    compoundCode: "ZZFN",
    runNo: "999012",
    skidNo: "7",
  });
  if (clash2.ok) throw new Error("update duplikat 999012 tidak ditolak");
  ok(`unik numeric ditolak: ${clash2.error}`);
  const delOther = await deleteSkid(other.skid.id);
  if (!delOther.ok) throw new Error(`delete other ${delOther.error}`);

  const gone = await deleteSkid(id);
  if (!gone.ok) throw new Error(`delete ${gone.error}`);
  ok("deleteSkid skid kosong");

  console.log(log.join("\n"));
  console.log("FNS_OK");
} catch (e) {
  console.error(log.join("\n"));
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
