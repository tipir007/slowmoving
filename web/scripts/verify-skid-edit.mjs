import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function envLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = envLocal();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function nid(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function fail(step, extra) {
  throw new Error(`FAIL ${step}${extra ? `: ${extra}` : ""}`);
}

const ids = [];
const tagIds = [];
const execIds = [];

async function cleanup() {
  if (execIds.length) await sb.from("execution").delete().in("id", execIds);
  if (tagIds.length) await sb.from("disposition").delete().in("id", tagIds);
  if (ids.length) await sb.from("skid").delete().in("id", ids);
  await sb.from("skid").delete().eq("run_no", "999001");
  await sb.from("skid").delete().eq("run_no", "999002");
  await sb.from("skid").delete().eq("run_no", "999003");
}

const log = [];
function ok(msg) {
  log.push(`OK  ${msg}`);
}

try {
  await cleanup();

  const a = nid("sk");
  ids.push(a);
  const { error: e1 } = await sb.from("skid").insert({
    id: a,
    compound_code: "ZZTEST",
    run_no: "999001",
    skid_no: "1",
    netto: 100,
    qty_sisa: 100,
    kg_locked: true,
    status: "UNDER_REVIEW",
    ticket_type: "PRODUCTIVE",
    created_by: "MIX001",
  });
  if (e1) fail("insert A", e1.message);
  ok("insert skid uji ZZTEST / 999001");

  const { error: e2 } = await sb
    .from("skid")
    .update({
      compound_code: "ZZTESTX",
      netto: 80,
      qty_sisa: 80,
      remarks: "koreksi verify",
      kondisi: "Lumpy",
    })
    .eq("id", a);
  if (e2) fail("update A", e2.message);
  const { data: after } = await sb
    .from("skid")
    .select("compound_code,netto,qty_sisa,remarks,kondisi")
    .eq("id", a)
    .single();
  if (after.compound_code !== "ZZTESTX" || Number(after.netto) !== 80 || after.kondisi !== "Lumpy") {
    fail("update A verify", JSON.stringify(after));
  }
  ok("edit compound + kg + kondisi tersimpan");

  const b = nid("sk");
  ids.push(b);
  const { error: e3 } = await sb.from("skid").insert({
    id: b,
    compound_code: "ZZTESTX",
    run_no: "999002",
    skid_no: "1",
    netto: 50,
    qty_sisa: 50,
    kg_locked: true,
    status: "UNDER_REVIEW",
    ticket_type: "PRODUCTIVE",
    created_by: "MIX001",
  });
  if (e3) fail("insert B", e3.message);
  const { error: dup } = await sb
    .from("skid")
    .update({ run_no: "999002" })
    .eq("id", a);
  if (!dup) fail("unique", "update duplikat tidak ditolak DB");
  ok(`unik compound+run+skid ditolak (${dup.code || dup.message})`);

  const tag = nid("dp");
  tagIds.push(tag);
  const { error: e4 } = await sb.from("disposition").insert({
    id: tag,
    tag_no: "39901",
    skid_id: a,
    action_type: "USE_AS_IS",
    date_disp: new Date().toISOString().slice(0, 10),
    originator: "verify",
    status: "OPEN",
    tag_color: "WHITE",
    label_payload: `SM1|39901|ZZTESTX|999001|1|${tag}`,
  });
  if (e4) fail("insert OPEN tag", e4.message);

  const { error: delTag } = await sb.from("disposition").delete().eq("skid_id", a);
  if (delTag) fail("hapus tag OPEN", delTag.message);
  const { error: delA } = await sb.from("skid").delete().eq("id", a);
  if (delA) fail("hapus skid tanpa eksekusi", delA.message);
  ids.splice(ids.indexOf(a), 1);
  tagIds.splice(tagIds.indexOf(tag), 1);
  const { data: gone } = await sb.from("skid").select("id").eq("id", a).maybeSingle();
  if (gone) fail("hapus A", "masih ada");
  ok("hapus skid + tag OPEN berhasil");

  const c = nid("sk");
  ids.push(c);
  const { error: e5 } = await sb.from("skid").insert({
    id: c,
    compound_code: "ZZTEST",
    run_no: "999003",
    skid_no: "1",
    netto: 90,
    qty_sisa: 90,
    kg_locked: true,
    status: "IN_EXECUTION",
    ticket_type: "PRODUCTIVE",
    created_by: "MIX001",
  });
  if (e5) fail("insert C", e5.message);
  const ex = nid("ex");
  execIds.push(ex);
  const { error: e6 } = await sb.from("execution").insert({
    id: ex,
    skid_id: c,
    machine_area: "8in Ext",
    kg_used: 10,
    result: "PARTIAL",
    operator_nik: "MIX001",
  });
  if (e6) fail("insert execution", e6.message);

  const { count } = await sb
    .from("execution")
    .select("id", { count: "exact", head: true })
    .eq("skid_id", c);
  if (!count) fail("guard execution", "eksekusi tidak terbaca");
  const { error: delC } = await sb.from("skid").delete().eq("id", c);
  if (!delC) fail("guard hapus", "skid ber-eksekusi terhapus — FK/aturan pecah");
  ok(`hapus skid yang sudah dipakai ditolak (${delC.code || delC.message})`);

  await cleanup();
  ok("skid uji dibersihkan, seed 214 tidak disentuh");
  console.log(log.join("\n"));
  console.log("VERIFY_OK");
} catch (err) {
  console.error(log.join("\n"));
  console.error(String(err?.message || err));
  try {
    await cleanup();
  } catch {}
  process.exit(1);
}
