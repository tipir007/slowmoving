import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key || key.startsWith("ganti_")) {
  console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan ANON KEY di web/.env.local dulu.");
  process.exit(1);
}

console.log("Deploy Vercel production (env tidak dicetak)…");
const r = spawnSync(
  "npx",
  [
    "vercel",
    "--prod",
    "--yes",
    "--name",
    "rak-merah",
    "-e",
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    "-e",
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}`,
  ],
  { stdio: "inherit", shell: true },
);
process.exit(r.status ?? 1);
