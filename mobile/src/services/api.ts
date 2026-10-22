import RNFS from 'react-native-fs';
import {decodeBarcode, encodeSm1, normalizeSkidNo, type Sm1Payload} from '../ml/barcode';
import {nid} from '../utils/nid';
import {supabase} from './supabase';

function throwIf(error: {message: string} | null) {
  if (error) throw new Error(error.message);
}

function isMissingEventTable(error: {code?: string; message?: string} | null) {
  if (!error) return false;
  const m = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return m.includes('skid_event') || m.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST205';
}

export type SkidEventAction =
  | 'DAFTAR'
  | 'EDIT'
  | 'RESTACK'
  | 'PICKLE_OUT'
  | 'DISPO'
  | 'PRINT'
  | 'VERIFY'
  | 'PAKAI'
  | 'GAGAL_TRIAL'
  | 'SNAPSHOT';

export async function writeSkidEvent(input: {
  skidId?: string | null;
  nik?: string | null;
  action: SkidEventAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const {error} = await supabase.from('skid_event').insert({
    id: nid('ev'),
    skid_id: input.skidId || null,
    nik: input.nik || null,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
  });
  if (isMissingEventTable(error)) return;
  throwIf(error);
}

export async function listSkidEvents(skidId: string) {
  const {data, error} = await supabase
    .from('skid_event')
    .select('id, skid_id, at, nik, action, before, after')
    .eq('skid_id', skidId)
    .order('at', {ascending: false})
    .limit(40);
  if (isMissingEventTable(error)) return [];
  throwIf(error);
  return data ?? [];
}

function decodeBase64(b64: string) {
  const bin = global.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export type SessionUser = {nik: string; name: string; role: string};

export async function loginNik(nik: string, pin: string): Promise<SessionUser> {
  const code = nik.trim().toUpperCase();
  const {data, error} = await supabase
    .from('app_user')
    .select('nik, name, role, pin, is_active')
    .eq('nik', code)
    .maybeSingle();
  throwIf(error);
  if (!data || !data.is_active) throw new Error('NIK tidak ditemukan atau nonaktif.');
  if (data.pin !== pin) throw new Error('PIN salah.');
  return {nik: data.nik, name: data.name, role: data.role};
}

export async function listSkids() {
  const {data, error} = await supabase
    .from('skid')
    .select(
      'id, compound_code, run_no, skid_no, qty_sisa, status, ticket_type, mixer, netto, mix_at, exp_at, created_at, updated_at, remarks, area_asal, kondisi',
    )
    .order('updated_at', {ascending: false})
    .limit(250);
  throwIf(error);
  return data ?? [];
}

export async function getSkid(id: string) {
  const {data, error} = await supabase.from('skid').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  return data;
}

export async function updateSkidStatus(id: string, status: string, nik?: string) {
  const before = await getSkid(id);
  const {error} = await supabase.from('skid').update({status}).eq('id', id);
  throwIf(error);
  if (status === 'RESTACKING' || status === 'PICKLE_OUT' || status === 'GAGAL_TRIAL') {
    await writeSkidEvent({
      skidId: id,
      nik: nik || null,
      action: status === 'RESTACKING' ? 'RESTACK' : (status as SkidEventAction),
      before: before ? {status: before.status} : null,
      after: {status},
    });
  }
}

export async function updateSkid(
  id: string,
  input: {
    compoundCode: string;
    runNo: string;
    skidNo: string;
    mixer?: string;
    mixAt?: string | null;
    expAt?: string | null;
    empId?: string;
    ticketType?: 'PRODUCTIVE' | 'NON_PRODUCTIVE';
    netto?: number;
    areaAsal?: string;
    kondisi?: string;
    remarks?: string;
    rack?: string;
    actorNik?: string;
  },
) {
  const skid = await getSkid(id);
  if (!skid) return {ok: false as const, error: 'Skid tidak ditemukan.'};
  const compound = input.compoundCode.trim().toUpperCase();
  const runNo = input.runNo.trim();
  const skidNo = normalizeSkidNo(input.skidNo);
  if (!compound || !runNo || !skidNo) {
    return {ok: false as const, error: 'Compound, run, dan skid wajib diisi.'};
  }
  const {data: dup} = await supabase
    .from('skid')
    .select('id')
    .ilike('compound_code', compound)
    .eq('run_no', runNo)
    .eq('skid_no', skidNo)
    .maybeSingle();
  if (dup && dup.id !== id) return {ok: false as const, error: 'ID itu sudah dipakai skid lain.'};

  const execs = await listExecutionsForSkid(id);
  const patch: Record<string, unknown> = {
    compound_code: compound,
    run_no: runNo,
    skid_no: skidNo,
    mixer: input.mixer || null,
    emp_id: input.empId || null,
    area_asal: input.areaAsal || null,
    kondisi: input.kondisi || null,
    remarks: input.remarks || null,
    rack: input.rack || null,
  };
  if (input.ticketType) patch.ticket_type = input.ticketType;
  if (input.mixAt !== undefined) patch.mix_at = input.mixAt;
  if (input.expAt !== undefined) patch.exp_at = input.expAt;
  if (input.netto !== undefined) {
    if (execs.length > 0) {
      return {ok: false as const, error: 'Kg terkunci — skid ini sudah pernah dipotong di mesin.'};
    }
    if (!input.netto || input.netto <= 0) {
      return {ok: false as const, error: 'Netto kg harus lebih dari 0.'};
    }
    patch.netto = input.netto;
    patch.qty_sisa = input.netto;
    patch.kg_locked = true;
  }
  const {error} = await supabase.from('skid').update(patch).eq('id', id);
  throwIf(error);
  await writeSkidEvent({
    skidId: id,
    nik: input.actorNik || null,
    action: 'EDIT',
    before: {
      status: skid.status,
      kg: skid.netto,
      area: skid.area_asal,
      mix_at: skid.mix_at,
      exp_at: skid.exp_at,
    },
    after: {
      kg: input.netto ?? skid.netto,
      area: input.areaAsal ?? skid.area_asal,
      mix_at: input.mixAt ?? skid.mix_at,
      exp_at: input.expAt ?? skid.exp_at,
    },
  });

  const idChanged =
    compound !== skid.compound_code || runNo !== skid.run_no || String(skid.skid_no) !== skidNo;
  if (idChanged) {
    const {data: tags} = await supabase.from('disposition').select('id, tag_no').eq('skid_id', id);
    for (const t of tags ?? []) {
      const {error: pErr} = await supabase
        .from('disposition')
        .update({
          label_payload: encodeSm1({
            tagNo: t.tag_no,
            compound,
            runNo,
            skidNo,
            dispositionId: t.id,
          }),
        })
        .eq('id', t.id);
      throwIf(pErr);
    }
  }
  return {ok: true as const, reprint: idChanged};
}

export async function deleteSkid(id: string) {
  const skid = await getSkid(id);
  if (skid && ['CONSUMED', 'SCRAP', 'CLEANER', 'DISPOSED', 'IN_EXECUTION', 'GAGAL_TRIAL'].includes(skid.status)) {
    return {ok: false as const, error: 'Tidak bisa hapus — skid sudah punya kisah. Habis = CONSUMED.'};
  }
  const execs = await listExecutionsForSkid(id);
  if (execs.length > 0) {
    return {ok: false as const, error: 'Tidak bisa hapus — sudah ada potongan kg di mesin.'};
  }
  const {data: tags, error: tErr} = await supabase
    .from('disposition')
    .select('id, status, tag_no')
    .eq('skid_id', id);
  throwIf(tErr);
  if ((tags ?? []).length > 0) {
    return {
      ok: false as const,
      error: `Tidak bisa hapus — sudah ada tag #${tags![0].tag_no}. Histori tidak boleh putus.`,
    };
  }
  const {error} = await supabase.from('skid').delete().eq('id', id);
  throwIf(error);
  return {ok: true as const};
}

async function locationId(code: string) {
  const {data, error} = await supabase.from('location').select('id').eq('code', code).maybeSingle();
  throwIf(error);
  return data?.id ?? null;
}

export async function uploadTicketPhoto(
  uri: string,
  nik: string,
  compound: string,
  runNo: string,
  skidNo: string,
) {
  const filePath = uri.replace('file://', '');
  const base64 = await RNFS.readFile(filePath, 'base64');
  const bytes = decodeBase64(base64);
  const safe = `${compound}_${runNo}_${skidNo}`.replace(/[^\w.-]+/g, '_');
  const path = `${nik}/${Date.now()}_${safe}.jpg`;
  const {error} = await supabase.storage.from('ticket-photos').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  throwIf(error);
  return path;
}

export async function createSkid(input: {
  compoundCode: string;
  runNo: string;
  skidNo: string;
  netto: number;
  mixer?: string;
  empId?: string;
  ticketType: 'PRODUCTIVE' | 'NON_PRODUCTIVE';
  createdBy: string;
  ticketPhotoPath?: string;
  rawBarcode?: string;
  rawOcr?: string;
  documentType?: string;
  mixAt?: string;
  expAt?: string;
  areaAsal?: string;
}) {
  const skidNo = normalizeSkidNo(input.skidNo);
  const {data: existing} = await supabase
    .from('skid')
    .select('id')
    .ilike('compound_code', input.compoundCode)
    .eq('run_no', input.runNo)
    .eq('skid_no', skidNo)
    .maybeSingle();
  if (existing) return {ok: false as const, error: 'Skid ini sudah terdaftar.'};

  const loc = await locationId('NC');
  const id = nid('sk');
  const {error} = await supabase.from('skid').insert({
    id,
    compound_code: input.compoundCode.trim().toUpperCase(),
    run_no: input.runNo.trim(),
    skid_no: skidNo,
    mixer: input.mixer || null,
    emp_id: input.empId || null,
    ticket_type: input.ticketType,
    netto: input.netto,
    qty_sisa: input.netto,
    kg_locked: true,
    batch_count: 1,
    status: 'UNDER_REVIEW',
    location_id: loc,
    operator_confirmed: true,
    created_by: input.createdBy,
    ticket_photo_path: input.ticketPhotoPath || null,
    document_type: input.documentType || null,
    raw_barcode: input.rawBarcode || null,
    raw_ocr: input.rawOcr || null,
    mix_at: input.mixAt || null,
    exp_at: input.expAt || null,
    area_asal: input.areaAsal || null,
  });
  throwIf(error);
  await writeSkidEvent({
    skidId: id,
    nik: input.createdBy,
    action: 'DAFTAR',
    after: {status: 'UNDER_REVIEW', kg: input.netto, area: input.areaAsal || null},
  });
  return {ok: true as const, id};
}

export async function listDispositions(status?: string) {
  let q = supabase
    .from('disposition')
    .select(
      'id, tag_no, skid_id, action_type, target_area, action_rule, tag_color, status, label_payload, verified_at, printed_at, created_at, date_exp',
    )
    .order('created_at', {ascending: false})
    .limit(80);
  if (status && status !== 'ALL') q = q.eq('status', status);
  const {data, error} = await q;
  throwIf(error);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const skidIds = [...new Set(rows.map(r => r.skid_id))];
  const {data: skids} = await supabase
    .from('skid')
    .select('id, compound_code, run_no, skid_no, qty_sisa')
    .in('id', skidIds);
  const byId = new Map((skids ?? []).map(s => [s.id, s]));
  return rows.map(d => {
    const s = byId.get(d.skid_id);
    const payload =
      d.label_payload ||
      (s
        ? encodeSm1({
            tagNo: d.tag_no,
            compound: s.compound_code,
            runNo: s.run_no,
            skidNo: s.skid_no,
            dispositionId: d.id,
          })
        : '');
    return {
      ...d,
      compound_code: s?.compound_code ?? '',
      run_no: s?.run_no ?? '',
      skid_no: s?.skid_no ?? '',
      qty_sisa: s?.qty_sisa ?? 0,
      label_payload: payload,
    };
  });
}

export async function listOpenDispositions() {
  const all = await listDispositions();
  return all.filter(d => d.status === 'OPEN' || d.status === 'IN_PROGRESS');
}

export async function listExecutionsForSkid(skidId: string) {
  const {data, error} = await supabase
    .from('execution')
    .select('id, kg_used, machine_area, result, exec_at, operator_nik')
    .eq('skid_id', skidId)
    .order('exec_at', {ascending: false})
    .limit(20);
  throwIf(error);
  return data ?? [];
}

export async function createDisposition(input: {
  skidId: string;
  actionType: string;
  actionRule?: string;
  targetArea?: string;
  tagColor?: string;
  originator: string;
  originatorNik?: string;
}) {
  const skid = await getSkid(input.skidId);
  if (!skid) return {ok: false as const, error: 'Skid tidak ditemukan.'};
  if (['CONSUMED', 'SCRAP'].includes(skid.status)) {
    return {ok: false as const, error: 'Skid sudah habis atau scrap.'};
  }
  const {data: tags} = await supabase.from('disposition').select('tag_no');
  const nums = (tags ?? []).map(r => Number(r.tag_no)).filter(n => Number.isFinite(n));
  const tagNo = String(nums.length ? Math.max(...nums) + 1 : 3000);
  const id = nid('dp');
  const payload = encodeSm1({
    tagNo,
    compound: skid.compound_code,
    runNo: skid.run_no,
    skidNo: skid.skid_no,
    dispositionId: id,
  });
  const nextStatus =
    input.actionType === 'SCRAP'
      ? 'SCRAP'
      : input.actionType === 'CLEANER'
        ? 'CLEANER'
        : input.actionType === 'RESTACK'
          ? 'RESTACKING'
          : input.actionType === 'PICKLE_OUT'
            ? 'PICKLE_OUT'
            : 'DISPOSED';
  const {error} = await supabase.from('disposition').insert({
    id,
    tag_no: tagNo,
    skid_id: input.skidId,
    action_type: input.actionType,
    action_rule: input.actionRule || null,
    target_area: input.targetArea || null,
    date_disp: new Date().toISOString().slice(0, 10),
    originator: input.originator,
    qc_nik: input.originatorNik || null,
    tag_color: input.tagColor || 'WHITE',
    status: input.actionType === 'SCRAP' ? 'DONE' : 'OPEN',
    label_payload: payload,
  });
  throwIf(error);
  await updateSkidStatus(input.skidId, nextStatus, input.originatorNik);
  await writeSkidEvent({
    skidId: input.skidId,
    nik: input.originatorNik || input.originator,
    action: 'DISPO',
    after: {tag: tagNo, action: input.actionType, area: input.targetArea || null},
  });
  return {ok: true as const, id};
}

export async function getYesterdaySnapshot() {
  const {data, error} = await supabase
    .from('stock_snapshot')
    .select('snap_date, kg_live, skid_live')
    .order('snap_date', {ascending: false})
    .limit(2);
  if (error) return null;
  const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Jakarta'});
  return (data ?? []).find(r => r.snap_date !== today) ?? null;
}

export async function saveTodaySnapshot() {
  const skids = await listSkids();
  const live = skids.filter(s =>
    ['UNDER_REVIEW', 'RESTACKING', 'PICKLE_OUT', 'GAGAL_TRIAL', 'DISPOSED', 'IN_EXECUTION'].includes(s.status),
  );
  const kgLive = live.reduce((a, s) => a + Number(s.qty_sisa || 0), 0);
  const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Jakarta'});
  const open = await listOpenDispositions();
  const {error} = await supabase.from('stock_snapshot').upsert(
    {
      snap_date: today,
      kg_live: kgLive,
      skid_live: live.length,
      gagal_trial: skids.filter(s => s.status === 'GAGAL_TRIAL').length,
      tag_open: open.length,
    },
    {onConflict: 'snap_date'},
  );
  throwIf(error);
}

export async function getDisposition(id: string) {
  const rows = await listOpenDispositions();
  const hit = rows.find(r => r.id === id);
  if (hit) return hit;
  const {data, error} = await supabase.from('disposition').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  if (!data) return null;
  const {data: s} = await supabase
    .from('skid')
    .select('compound_code, run_no, skid_no, qty_sisa')
    .eq('id', data.skid_id)
    .maybeSingle();
  return {
    ...data,
    compound_code: s?.compound_code ?? '',
    run_no: s?.run_no ?? '',
    skid_no: s?.skid_no ?? '',
    qty_sisa: s?.qty_sisa ?? 0,
    label_payload:
      data.label_payload ||
      encodeSm1({
        tagNo: data.tag_no,
        compound: s?.compound_code ?? '',
        runNo: s?.run_no ?? '',
        skidNo: s?.skid_no ?? '',
        dispositionId: data.id,
      }),
  };
}

export async function resolveSm1(raw: string) {
  const decoded = decodeBarcode(raw);
  if (decoded.kind !== 'sm1' || !decoded.sm1) {
    return {
      ok: false as const,
      error:
        decoded.kind === 'compound' || decoded.kind === 'run_skid'
          ? 'Ini Mixer Ticket, bukan label SM1.'
          : decoded.message || 'Kode tidak dikenali.',
    };
  }
  const d = await getDisposition(decoded.sm1.dispositionId);
  if (!d) return {ok: false as const, error: 'Tag tidak ada di sistem.'};
  return {ok: true as const, disposition: d, payload: decoded.sm1};
}

export async function verifySm1(raw: string, expectedId: string) {
  const res = await resolveSm1(raw);
  if (!res.ok) return res;
  if (res.disposition.id !== expectedId && res.disposition.tag_no !== expectedId) {
    return {ok: false as const, error: 'Label ini milik tag lain. Salah tempel.'};
  }
  const {error} = await supabase
    .from('disposition')
    .update({verified_at: new Date().toISOString(), verify_scan_raw: raw})
    .eq('id', res.disposition.id);
  throwIf(error);
  await writeSkidEvent({
    skidId: res.disposition.skid_id,
    action: 'VERIFY',
    after: {tag: res.disposition.tag_no},
  });
  return {ok: true as const, disposition: res.disposition};
}

export async function recordUse(input: {
  skidId: string;
  dispositionId?: string;
  machineArea: string;
  kgUsed: number;
  operatorNik: string;
}) {
  const {data: skid, error: sErr} = await supabase
    .from('skid')
    .select('id, qty_sisa')
    .eq('id', input.skidId)
    .maybeSingle();
  throwIf(sErr);
  if (!skid) return {ok: false as const, error: 'Skid tidak ditemukan.'};
  const used = Math.min(input.kgUsed, Number(skid.qty_sisa));
  const sisa = Math.round((Number(skid.qty_sisa) - used) * 10) / 10;
  const {error} = await supabase.from('execution').insert({
    id: nid('ex'),
    disposition_id: input.dispositionId || null,
    skid_id: input.skidId,
    machine_area: input.machineArea,
    kg_used: used,
    batch_count: 1,
    result: sisa <= 0 ? 'OK' : 'PARTIAL',
    operator_nik: input.operatorNik,
  });
  throwIf(error);
  const {error: uErr} = await supabase
    .from('skid')
    .update({
      qty_sisa: Math.max(sisa, 0),
      status: sisa <= 0 ? 'CONSUMED' : 'IN_EXECUTION',
      executor_area: input.machineArea,
      executed_at: new Date().toISOString(),
    })
    .eq('id', input.skidId);
  throwIf(uErr);
  await writeSkidEvent({
    skidId: input.skidId,
    nik: input.operatorNik,
    action: 'PAKAI',
    after: {kg: used, sisa: Math.max(sisa, 0), area: input.machineArea},
  });
  return {ok: true as const};
}

export type {Sm1Payload};
