import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  raw.split(/\r?\n/).flatMap((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return m ? [[m[1], m[2].trim()]] : [];
  }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { data: test } = await sb
  .from("skid")
  .select("id,compound_code,run_no,skid_no,netto,qty_sisa,remarks")
  .eq("id", "sk_003dc2c0320d4d81")
  .maybeSingle();
console.log("test_row", test);

const { data: orig } = await sb
  .from("skid")
  .select("id,compound_code,run_no,skid_no,netto,qty_sisa")
  .eq("id", "sk_legacy_151")
  .maybeSingle();
console.log("orig_151", orig);

if (test) {
  const { error } = await sb.from("skid").delete().eq("id", test.id);
  console.log("deleted_test", !error, error?.message || "");
}

const { data: leftovers } = await sb
  .from("skid")
  .select("id,compound_code,run_no,skid_no")
  .or("compound_code.ilike.ZZ%,run_no.in.(999001,999002,999003,999011)");
console.log("leftovers", leftovers);
