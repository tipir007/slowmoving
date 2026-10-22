import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) {
    throw new Error("Buat web/.env.local dari .env.example, isi ANON KEY dari Supabase → Settings → API");
  }
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    process.env[k] = v;
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key || key === "ganti_dengan_anon_key_dari_dashboard" || key.startsWith("ganti_dengan")) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di web/.env.local");
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const seed = JSON.parse(fs.readFileSync(path.join(root, "data", "seed.json"), "utf8"));

const ALLOWED = new Set([
  "UNDER_REVIEW",
  "RESTACKING",
  "PICKLE_OUT",
  "DISPOSED",
  "IN_EXECUTION",
  "GAGAL_TRIAL",
  "CONSUMED",
  "CLEANER",
  "SCRAP",
]);

const { data: locs, error: locErr } = await sb.from("location").select("id, code");
if (locErr) throw locErr;
const locByCode = new Map((locs ?? []).map((l) => [l.code, l.id]));

const rows = [];
const seen = new Set();
for (const s of seed.skids) {
  const compound = String(s.compoundCode || "").trim().toUpperCase();
  const runNo = String(s.runNo || "").trim() || `L${String(s.legacyNo).padStart(4, "0")}`;
  const skidNo = String(s.skidNo ?? s.legacyNo ?? "").trim() || "1";
  const keyu = `${compound}|${runNo}|${skidNo}`;
  if (!compound || seen.has(keyu)) continue;
  seen.add(keyu);
  const status = ALLOWED.has(s.status) ? s.status : "UNDER_REVIEW";
  rows.push({
    id: `sk_legacy_${s.legacyNo}`,
    compound_code: compound,
    run_no: runNo,
    skid_no: skidNo,
    mixer: s.mixer || null,
    mix_at: s.mixAt || null,
    exp_at: s.expAt || null,
    ticket_type: s.ticketType === "NON_PRODUCTIVE" ? "NON_PRODUCTIVE" : "PRODUCTIVE",
    bruto: s.bruto,
    berat_skid: s.beratSkid,
    netto: Number(s.netto || 0),
    qty_sisa: Number(s.qtySisa ?? s.netto ?? 0),
    kg_locked: true,
    batch_count: s.batchCount || 1,
    status,
    location_id: locByCode.get(s.locationCode) || locByCode.get("NC") || null,
    area_asal: s.executorArea || null,
    kondisi: s.note || null,
    operator_confirmed: true,
    legacy_no: s.legacyNo,
    rack: s.rack ? String(s.rack) : null,
    remarks: s.remarks || null,
    executor_area: s.executorArea || null,
    executed_at: s.executedAt || null,
  });
}

console.log("mengirim", rows.length, "skid ke Supabase…");
let ok = 0;
let skip = 0;
for (let i = 0; i < rows.length; i += 40) {
  const chunk = rows.slice(i, i + 40);
  const { error } = await sb.from("skid").upsert(chunk, { onConflict: "id" });
  if (error) {
    console.error("batch gagal", i, error.message);
    skip += chunk.length;
  } else {
    ok += chunk.length;
  }
}

const { count } = await sb.from("skid").select("*", { count: "exact", head: true });
console.log("selesai. terkirim ok/skip:", ok, skip, "total di tabel skid:", count);
