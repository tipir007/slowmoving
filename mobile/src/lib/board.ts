import {LIVE_STATUSES} from '../utils/constants';

export type Lamp = 'green' | 'yellow' | 'red' | 'grey';
export type Verdict = 'MAJU' | 'WASPADA' | 'MUNDUR' | 'BELUM';

type SkidLike = {
  id: string;
  compound_code: string;
  run_no: string;
  status: string;
  qty_sisa: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  exp_at?: string | null;
};

type DispoLike = {
  id: string;
  tag_no: string;
  skid_id: string;
  compound_code?: string;
  status: string;
  created_at?: string | null;
  date_exp?: string | null;
};

type SnapshotLike = {
  snap_date: string;
  kg_live: number;
  skid_live: number;
};

export type WorkItem = {
  skidId: string;
  title: string;
  why: string;
};

function daysTo(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
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

export function jakartaToday(now = new Date()) {
  return now.toLocaleDateString('en-CA', {timeZone: 'Asia/Jakarta'});
}

export function buildBoard(input: {
  skids: SkidLike[];
  dispositions: DispoLike[];
  yesterday: SnapshotLike | null;
  today: string;
}) {
  const {skids, dispositions, yesterday, today} = input;
  const live = skids.filter(s => LIVE_STATUSES.includes(s.status as (typeof LIVE_STATUSES)[number]));
  const kgNow = live.reduce((a, s) => a + Number(s.qty_sisa || 0), 0);
  const skidNow = live.length;
  const gagal = skids.filter(s => s.status === 'GAGAL_TRIAL');
  const gagalOld = gagal.filter(s => hoursSince(s.updated_at) > 24);
  const openTags = dispositions.filter(d => d.status === 'OPEN' || d.status === 'IN_PROGRESS');
  const tagExpired = openTags.filter(d => {
    if (!d.date_exp) return daysSince(d.created_at) > 3;
    const left = daysTo(d.date_exp);
    return left !== null && left < 0;
  });
  const tagStale = openTags.filter(d => daysSince(d.created_at) > 3);

  let s1Lamp: Lamp = 'grey';
  let s1Hint = 'Belum ada angka kemarin — catat snapshot hari ini';
  if (yesterday) {
    const dKg = kgNow - Number(yesterday.kg_live);
    const base = Number(yesterday.kg_live) || 1;
    const pct = Math.abs(dKg) / base;
    s1Lamp = pct <= 0.01 ? 'yellow' : dKg < 0 ? 'green' : 'red';
    const arah = dKg < -1 ? 'Turun' : dKg > 1 ? 'Naik' : 'Sama';
    s1Hint = `${arah} ${Math.abs(Math.round(dKg)).toLocaleString('id-ID')} kg vs ${yesterday.snap_date}`;
  }

  const s2Lamp: Lamp = gagal.length === 0 ? 'green' : gagalOld.length ? 'red' : 'yellow';
  const s2Hint =
    gagal.length === 0
      ? 'Tidak ada yang menunggu putusan'
      : gagalOld.length
        ? `${gagalOld.length} sudah > 24 jam`
        : 'Masih ≤ 24 jam — putuskan hari ini';

  const s3Lamp: Lamp =
    openTags.length === 0 ? 'green' : tagExpired.length || tagStale.length ? 'red' : 'yellow';
  const s3Hint =
    openTags.length === 0
      ? 'Tidak ada tag menggantung'
      : tagExpired.length || tagStale.length
        ? `${tagExpired.length} lewat exp · ${tagStale.length} OPEN > 3 hari`
        : 'OPEN, belum expired';

  const signals = [
    {
      id: 'stok',
      title: 'Stok Rak Merah',
      value: `${skidNow} skid · ${Math.round(kgNow).toLocaleString('id-ID')} kg`,
      hint: s1Hint,
      lamp: s1Lamp,
    },
    {
      id: 'gagal',
      title: 'Gagal trial mengendap',
      value: gagal.length === 0 ? '0 skid' : `${gagal.length} skid`,
      hint: s2Hint,
      lamp: s2Lamp,
    },
    {
      id: 'tag',
      title: 'Tag OPEN',
      value: `${openTags.length} tag`,
      hint: s3Hint,
      lamp: s3Lamp,
    },
  ];

  const reds = signals.filter(s => s.lamp === 'red').length;
  let verdict: Verdict;
  if (s1Lamp === 'grey') verdict = reds > 0 ? 'WASPADA' : 'BELUM';
  else if (s1Lamp === 'red' && reds > 0) verdict = 'MUNDUR';
  else if (reds > 0) verdict = 'WASPADA';
  else if (s1Lamp === 'green') verdict = 'MAJU';
  else verdict = 'WASPADA';

  const sentence =
    verdict === 'BELUM'
      ? 'Angka kemarin belum tercatat. Simpan snapshot hari ini, besok papan bisa bilang maju atau mundur.'
      : verdict === 'MAJU'
        ? `${s1Hint}. ${gagal.length} gagal trial. ${openTags.length} tag OPEN.`
        : verdict === 'MUNDUR'
          ? `${s1Hint}. Ada lampu merah: ${s2Hint}. ${s3Hint}.`
          : `${s1Lamp === 'grey' ? 'Stok vs kemarin belum bisa dinilai.' : s1Hint} ${s2Hint}. ${s3Hint}`;

  const work: WorkItem[] = [];
  for (const s of gagal) {
    work.push({
      skidId: s.id,
      title: `${s.compound_code} · run ${s.run_no}`,
      why: hoursSince(s.updated_at) > 24 ? 'Gagal trial > 24 jam — putusan QC/PC' : 'Gagal trial — putusan ulang',
    });
  }
  for (const d of openTags) {
    if (work.length >= 10) break;
    const expired = tagExpired.some(x => x.id === d.id);
    const stale = tagStale.some(x => x.id === d.id);
    work.push({
      skidId: d.skid_id,
      title: `Tag ${d.tag_no} · ${d.compound_code || ''}`.trim(),
      why: expired ? 'Tag lewat expired' : stale ? 'Tag OPEN > 3 hari' : 'Tag OPEN — belum dipotong kg',
    });
  }
  for (const s of live) {
    if (work.length >= 10) break;
    if (s.status === 'UNDER_REVIEW' && daysSince(s.created_at) > 2) {
      work.push({skidId: s.id, title: `${s.compound_code} · run ${s.run_no}`, why: 'Under review > 2 hari'});
    }
  }
  for (const s of live) {
    if (work.length >= 10) break;
    const left = daysTo(s.exp_at);
    if (left !== null && left <= 2) {
      work.push({
        skidId: s.id,
        title: `${s.compound_code} · run ${s.run_no}`,
        why: left < 0 ? 'Sudah expired di rak' : `Exp ${left} hari lagi`,
      });
    }
  }

  const seen = new Set<string>();
  const uniqueWork = work.filter(w => {
    const k = w.skidId + w.why;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 10);

  return {today, kgNow, skidNow, verdict, sentence, signals, work: uniqueWork};
}
