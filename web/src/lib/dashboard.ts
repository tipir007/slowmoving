import type { DispositionRow, SkidRow } from "./queries";
import { daysTo } from "./format";

export const LIVE_STATUSES = [
  "UNDER_REVIEW",
  "RESTACKING",
  "PICKLE_OUT",
  "GAGAL_TRIAL",
  "DISPOSED",
  "IN_EXECUTION",
] as const;

export type Lamp = "green" | "yellow" | "red" | "grey";
export type Verdict = "MAJU" | "WASPADA" | "MUNDUR" | "BELUM";

export type SignalCard = {
  id: string;
  title: string;
  value: string;
  hint: string;
  lamp: Lamp;
};

export type WorkItem = {
  href: string;
  title: string;
  why: string;
};

export type SnapshotRow = {
  snap_date: string;
  kg_live: number;
  skid_live: number;
};

export function jakartaToday(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function jakartaYesterday(now = new Date()) {
  return jakartaToday(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

export function liveSkids(rows: SkidRow[]) {
  return rows.filter((s) => LIVE_STATUSES.includes(s.status as (typeof LIVE_STATUSES)[number]));
}

export function liveKg(rows: SkidRow[]) {
  return liveSkids(rows).reduce((a, s) => a + Number(s.qty_sisa || 0), 0);
}

function hoursSince(iso?: string | null, now = Date.now()) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return (now - t) / 36e5;
}

function daysSince(iso?: string | null, now = Date.now()) {
  return hoursSince(iso, now) / 24;
}

export function buildBoard(input: {
  skids: SkidRow[];
  dispositions: DispositionRow[];
  yesterday: SnapshotRow | null;
  today: string;
}) {
  const { skids, dispositions, yesterday, today } = input;
  const live = liveSkids(skids);
  const kgNow = liveKg(skids);
  const skidNow = live.length;

  const gagal = skids.filter((s) => s.status === "GAGAL_TRIAL");
  const gagalOld = gagal.filter((s) => hoursSince(s.updated_at) > 24);

  const openTags = dispositions.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS");
  const tagExpired = openTags.filter((d) => {
    if (!d.date_exp) return daysSince(d.created_at) > 3;
    const left = daysTo(d.date_exp);
    return left !== null && left < 0;
  });
  const tagStale = openTags.filter((d) => daysSince(d.created_at) > 3);

  let s1: SignalCard;
  if (!yesterday) {
    s1 = {
      id: "stok",
      title: "Stok Rak Merah",
      value: `${skidNow} skid · ${Math.round(kgNow).toLocaleString("id-ID")} kg`,
      hint: "Belum ada angka kemarin — catat snapshot hari ini",
      lamp: "grey",
    };
  } else {
    const dKg = kgNow - Number(yesterday.kg_live);
    const base = Number(yesterday.kg_live) || 1;
    const pct = Math.abs(dKg) / base;
    const lamp: Lamp = pct <= 0.01 ? "yellow" : dKg < 0 ? "green" : "red";
    const arah = dKg < -1 ? "Turun" : dKg > 1 ? "Naik" : "Sama";
    s1 = {
      id: "stok",
      title: "Stok Rak Merah",
      value: `${skidNow} skid · ${Math.round(kgNow).toLocaleString("id-ID")} kg`,
      hint: `${arah} ${Math.abs(Math.round(dKg)).toLocaleString("id-ID")} kg vs ${yesterday.snap_date}`,
      lamp,
    };
  }

  const s2: SignalCard = {
    id: "gagal",
    title: "Gagal trial mengendap",
    value: gagal.length === 0 ? "0 skid" : `${gagal.length} skid`,
    hint:
      gagal.length === 0
        ? "Tidak ada yang menunggu putusan"
        : gagalOld.length
          ? `${gagalOld.length} sudah > 24 jam`
          : "Masih ≤ 24 jam — putuskan hari ini",
    lamp: gagal.length === 0 ? "green" : gagalOld.length ? "red" : "yellow",
  };

  const s3: SignalCard = {
    id: "tag",
    title: "Tag OPEN / tidak terpotong",
    value: `${openTags.length} tag`,
    hint:
      openTags.length === 0
        ? "Tidak ada tag menggantung"
        : tagExpired.length || tagStale.length
          ? `${tagExpired.length} lewat exp · ${tagStale.length} OPEN > 3 hari`
          : "OPEN, belum expired",
    lamp:
      openTags.length === 0
        ? "green"
        : tagExpired.length || tagStale.length
          ? "red"
          : "yellow",
  };

  const s4: SignalCard = {
    id: "leftover",
    title: "Leftover baru terdaftar",
    value: "—",
    hint: "Hitung fisik rak belum ada di sistem",
    lamp: "grey",
  };

  const s5: SignalCard = {
    id: "plan",
    title: "Plan PC hari ini",
    value: "—",
    hint: "Plan blend / ODS / pakai menyusul Tahap 7",
    lamp: "grey",
  };

  const reds = [s2, s3].filter((s) => s.lamp === "red").length;
  let verdict: Verdict;
  if (s1.lamp === "grey") {
    verdict = reds > 0 ? "WASPADA" : "BELUM";
  } else if (s1.lamp === "red" && reds > 0) {
    verdict = "MUNDUR";
  } else if (reds > 0) {
    verdict = "WASPADA";
  } else if (s1.lamp === "green") {
    verdict = "MAJU";
  } else {
    verdict = "WASPADA";
  }

  const sentence = buildSentence({ verdict, s1, s2, s3, today });

  const work: WorkItem[] = [];
  for (const s of gagal) {
    work.push({
      href: `/stok/${s.id}`,
      title: `${s.compound_code} · run ${s.run_no}`,
      why: hoursSince(s.updated_at) > 24 ? "Gagal trial > 24 jam — putusan QC/PC" : "Gagal trial — putusan ulang",
    });
  }
  for (const d of openTags) {
    if (work.length >= 10) break;
    const expired = tagExpired.some((x) => x.id === d.id);
    const stale = tagStale.some((x) => x.id === d.id);
    if (!expired && !stale && d.status === "OPEN") {
      work.push({
        href: `/stok/${d.skid_id}`,
        title: `Tag ${d.tag_no} · ${d.compound_code}`,
        why: "Tag OPEN — belum dipotong kg",
      });
    } else if (expired || stale) {
      work.push({
        href: `/stok/${d.skid_id}`,
        title: `Tag ${d.tag_no} · ${d.compound_code}`,
        why: expired ? "Tag lewat expired" : "Tag OPEN > 3 hari",
      });
    }
  }
  for (const s of live) {
    if (work.length >= 10) break;
    if (s.status === "UNDER_REVIEW" && daysSince(s.created_at) > 2) {
      work.push({
        href: `/stok/${s.id}`,
        title: `${s.compound_code} · run ${s.run_no}`,
        why: "Under review > 2 hari",
      });
    }
  }
  for (const s of live) {
    if (work.length >= 10) break;
    const left = daysTo(s.exp_at);
    if (left !== null && left <= 2) {
      work.push({
        href: `/stok/${s.id}`,
        title: `${s.compound_code} · run ${s.run_no}`,
        why: left < 0 ? "Sudah expired di rak" : `Exp ${left} hari lagi`,
      });
    }
  }

  const seen = new Set<string>();
  const uniqueWork = work.filter((w) => {
    const k = w.href + w.why;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 10);

  return {
    today,
    kgNow,
    skidNow,
    verdict,
    sentence,
    signals: [s1, s2, s3, s4, s5],
    work: uniqueWork,
  };
}

function buildSentence(opts: {
  verdict: Verdict;
  s1: SignalCard;
  s2: SignalCard;
  s3: SignalCard;
  today: string;
}) {
  const { verdict, s1, s2, s3 } = opts;
  if (verdict === "BELUM") {
    return "Angka kemarin belum tercatat. Simpan snapshot hari ini, besok papan bisa bilang maju atau mundur.";
  }
  if (verdict === "MAJU") {
    return `${s1.hint}. ${s2.value} gagal trial mengendap. ${s3.value} OPEN.`;
  }
  if (verdict === "MUNDUR") {
    return `${s1.hint}. Ada lampu merah: ${s2.hint}. ${s3.hint}.`;
  }
  return `${s1.lamp === "grey" ? "Stok vs kemarin belum bisa dinilai." : s1.hint} ${s2.hint}. ${s3.hint}`;
}
