import { getSupabase, nid } from "./supabase";
import type { ActionId, StatusId } from "./constants";
import { encodeSm1, normalizeSkidNo } from "./barcode";

export type SkidRow = {
  id: string;
  compound_code: string;
  run_no: string;
  skid_no: string;
  mixer: string | null;
  mix_at: string | null;
  exp_at: string | null;
  sps: number | null;
  emp_id: string | null;
  ticket_type: string;
  bruto: number | null;
  berat_skid: number | null;
  netto: number;
  qty_sisa: number;
  batch_count: number;
  status: string;
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  area_asal: string | null;
  kondisi: string | null;
  note_qc: string | null;
  legacy_no: number | null;
  rack: string | null;
  remarks: string | null;
  executor_area: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
  open_tag: string | null;
  ticket_photo_path: string | null;
  document_type: string | null;
  raw_barcode: string | null;
  raw_ocr: string | null;
};

export type DispositionRow = {
  id: string;
  tag_no: string;
  skid_id: string;
  action_type: string;
  action_rule: string | null;
  target_area: string | null;
  target_compound: string | null;
  date_disp: string;
  date_exp: string | null;
  originator: string;
  tag_color: string;
  status: string;
  remarks: string | null;
  created_at: string;
  compound_code: string;
  run_no: string;
  skid_no: string;
  qty_sisa: number;
  skid_status: string;
  label_payload: string | null;
  printed_at: string | null;
  verified_at: string | null;
};

export type ExecutionRow = {
  id: string;
  disposition_id: string | null;
  skid_id: string;
  exec_at: string;
  shift: string | null;
  machine_area: string;
  kg_used: number;
  batch_count: number;
  result: string;
  operator: string;
  note: string | null;
  compound_code: string;
  tag_no: string | null;
};

type Loc = { id: string; code: string; name: string };

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function isMissingEventTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const m = `${error.code || ""} ${error.message || ""}`.toLowerCase();
  return m.includes("skid_event") || m.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205";
}

export type SkidEventAction =
  | "DAFTAR"
  | "EDIT"
  | "RESTACK"
  | "PICKLE_OUT"
  | "DISPO"
  | "PRINT"
  | "VERIFY"
  | "PAKAI"
  | "GAGAL_TRIAL"
  | "SNAPSHOT";

export type SkidEventRow = {
  id: string;
  skid_id: string | null;
  at: string;
  nik: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export async function writeSkidEvent(input: {
  skidId?: string | null;
  nik?: string | null;
  action: SkidEventAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const { error } = await getSupabase().from("skid_event").insert({
    id: nid("ev"),
    skid_id: input.skidId || null,
    nik: input.nik || null,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
  });
  if (isMissingEventTable(error)) return { missingTable: true as const };
  throwIf(error);
  return { missingTable: false as const };
}

export async function listSkidEvents(skidId: string) {
  const { data, error } = await getSupabase()
    .from("skid_event")
    .select("id, skid_id, at, nik, action, before, after")
    .eq("skid_id", skidId)
    .order("at", { ascending: false })
    .limit(40);
  if (isMissingEventTable(error)) return [];
  throwIf(error);
  return (data ?? []) as SkidEventRow[];
}

async function locations(): Promise<Loc[]> {
  const { data, error } = await getSupabase().from("location").select("id, code, name");
  throwIf(error);
  return (data ?? []) as Loc[];
}

function attachLoc(row: Record<string, unknown>, locs: Loc[], openTag: string | null = null): SkidRow {
  const loc = locs.find((l) => l.id === row.location_id);
  return {
    ...(row as unknown as SkidRow),
    location_code: loc?.code ?? null,
    location_name: loc?.name ?? null,
    open_tag: openTag,
  };
}

export async function findUserByNik(nik: string) {
  const { data, error } = await getSupabase()
    .from("app_user")
    .select("nik, name, role, pin, is_active")
    .eq("nik", nik.trim().toUpperCase())
    .maybeSingle();
  throwIf(error);
  return data as {
    nik: string;
    name: string;
    role: string;
    pin: string;
    is_active: boolean;
  } | null;
}

export async function getLocationId(code: string) {
  const { data, error } = await getSupabase()
    .from("location")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  throwIf(error);
  return data?.id ?? null;
}

export async function listSkids(opts: { q?: string; status?: string } = {}) {
  const sb = getSupabase();
  const locs = await locations();
  const { data, error } = await sb.from("skid").select("*").order("updated_at", { ascending: false });
  throwIf(error);
  const { data: tags } = await sb
    .from("disposition")
    .select("skid_id, tag_no, status, created_at")
    .in("status", ["OPEN", "IN_PROGRESS"])
    .order("created_at", { ascending: false });

  const openBySkid = new Map<string, string>();
  for (const t of tags ?? []) {
    if (!openBySkid.has(t.skid_id)) openBySkid.set(t.skid_id, t.tag_no);
  }

  const rank: Record<string, number> = {
    UNDER_REVIEW: 0,
    RESTACKING: 1,
    PICKLE_OUT: 2,
    GAGAL_TRIAL: 3,
    DISPOSED: 4,
    IN_EXECUTION: 5,
  };

  let rows = (data ?? []).map((s) => attachLoc(s, locs, openBySkid.get(s.id) ?? null));
  if (opts.status && opts.status !== "ALL") {
    rows = rows.filter((s) => s.status === opts.status);
  }
  if (opts.q?.trim()) {
    const q = opts.q.trim().toUpperCase();
    rows = rows.filter(
      (s) =>
        s.compound_code.toUpperCase().includes(q) ||
        s.run_no.toUpperCase().includes(q) ||
        s.skid_no.toUpperCase().includes(q) ||
        (s.rack || "").toUpperCase().includes(q),
    );
  }
  rows.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
  return rows;
}

export async function getSkid(id: string) {
  const rows = await listSkids();
  return rows.find((s) => s.id === id);
}

export async function findSkidByTicket(compoundCode: string, runNo: string, skidNo: string) {
  const { data, error } = await getSupabase()
    .from("skid")
    .select("id")
    .ilike("compound_code", compoundCode)
    .eq("run_no", runNo)
    .eq("skid_no", normalizeSkidNo(skidNo))
    .maybeSingle();
  throwIf(error);
  if (!data) return undefined;
  return getSkid(data.id);
}

export async function summaryByStatus() {
  const rows = await listSkids();
  const map = new Map<string, { status: string; skids: number; kg: number }>();
  for (const s of rows) {
    const cur = map.get(s.status) ?? { status: s.status, skids: 0, kg: 0 };
    cur.skids += 1;
    cur.kg += Number(s.qty_sisa || 0);
    map.set(s.status, cur);
  }
  return [...map.values()];
}

export type NewSkidInput = {
  compoundCode: string;
  runNo: string;
  skidNo: string;
  mixer?: string;
  mixAt?: string;
  expAt?: string;
  sps?: number;
  empId?: string;
  ticketType: "PRODUCTIVE" | "NON_PRODUCTIVE";
  bruto?: number;
  beratSkid?: number;
  netto: number;
  batchCount?: number;
  locationCode: string;
  areaAsal?: string;
  kondisi?: string;
  noteQc?: string;
  createdBy?: string;
  ticketPhotoPath?: string;
  documentType?: string;
  rawBarcode?: string;
  rawOcr?: string;
  fieldConfidence?: Record<string, number> | null;
  operatorConfirmed?: boolean;
};

export async function createSkid(input: NewSkidInput) {
  const existing = await findSkidByTicket(
    input.compoundCode,
    input.runNo,
    normalizeSkidNo(input.skidNo),
  );
  if (existing) return { ok: false as const, error: "Skid ini sudah terdaftar.", skid: existing };

  const id = nid("sk");
  const locationId = await getLocationId(input.locationCode);
  const { error } = await getSupabase().from("skid").insert({
    id,
    compound_code: input.compoundCode.trim().toUpperCase(),
    run_no: input.runNo.trim(),
    skid_no: normalizeSkidNo(input.skidNo),
    mixer: input.mixer || null,
    mix_at: input.mixAt || null,
    exp_at: input.expAt || null,
    sps: input.sps ?? null,
    emp_id: input.empId || null,
    ticket_type: input.ticketType,
    bruto: input.bruto ?? null,
    berat_skid: input.beratSkid ?? null,
    netto: input.netto,
    qty_sisa: input.netto,
    kg_locked: true,
    batch_count: input.batchCount ?? 1,
    status: "UNDER_REVIEW",
    location_id: locationId,
    area_asal: input.areaAsal || null,
    kondisi: input.kondisi || null,
    note_qc: input.noteQc || null,
    operator_confirmed: input.operatorConfirmed ?? true,
    created_by: input.createdBy || null,
    ticket_photo_path: input.ticketPhotoPath || null,
    document_type: input.documentType || null,
    raw_barcode: input.rawBarcode || null,
    raw_ocr: input.rawOcr || null,
    field_confidence: input.fieldConfidence ?? null,
  });
  throwIf(error);
  await writeSkidEvent({
    skidId: id,
    nik: input.createdBy || null,
    action: "DAFTAR",
    after: {
      status: "UNDER_REVIEW",
      kg: input.netto,
      area: input.areaAsal || null,
      mix_at: input.mixAt || null,
      exp_at: input.expAt || null,
    },
  });
  return { ok: true as const, skid: (await getSkid(id))! };
}

export async function updateSkid(
  id: string,
  input: {
    compoundCode: string;
    runNo: string;
    skidNo: string;
    mixer?: string;
    empId?: string;
    ticketType?: "PRODUCTIVE" | "NON_PRODUCTIVE";
    netto?: number;
    areaAsal?: string;
    kondisi?: string;
    remarks?: string;
    rack?: string;
    noteQc?: string;
    mixAt?: string | null;
    expAt?: string | null;
    actorNik?: string;
  },
) {
  const skid = await getSkid(id);
  if (!skid) return { ok: false as const, error: "Skid tidak ditemukan." };

  const compound = input.compoundCode.trim().toUpperCase();
  const runNo = input.runNo.trim();
  const skidNo = normalizeSkidNo(input.skidNo);
  if (!compound || !runNo || !skidNo) {
    return { ok: false as const, error: "Compound, run, dan skid wajib diisi." };
  }

  const dup = await findSkidByTicket(compound, runNo, skidNo);
  if (dup && dup.id !== id) {
    return { ok: false as const, error: "ID itu sudah dipakai skid lain." };
  }

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
    note_qc: input.noteQc || null,
  };
  if (input.ticketType) patch.ticket_type = input.ticketType;
  if (input.mixAt !== undefined) patch.mix_at = input.mixAt;
  if (input.expAt !== undefined) patch.exp_at = input.expAt;

  if (input.netto !== undefined) {
    if (execs.length > 0) {
      return { ok: false as const, error: "Kg terkunci — skid ini sudah pernah dipotong di mesin." };
    }
    if (!input.netto || input.netto <= 0) {
      return { ok: false as const, error: "Netto kg harus lebih dari 0." };
    }
    patch.netto = input.netto;
    patch.qty_sisa = input.netto;
    patch.kg_locked = true;
  }

  const { error } = await getSupabase().from("skid").update(patch).eq("id", id);
  throwIf(error);

  const idChanged =
    compound !== skid.compound_code || runNo !== skid.run_no || skidNo !== skid.skid_no;
  if (idChanged) {
    const { data: tags } = await getSupabase()
      .from("disposition")
      .select("id, tag_no")
      .eq("skid_id", id);
    for (const t of tags ?? []) {
      const payload = encodeSm1({
        tagNo: t.tag_no,
        compound,
        runNo,
        skidNo,
        dispositionId: t.id,
      });
      const { error: pErr } = await getSupabase()
        .from("disposition")
        .update({ label_payload: payload })
        .eq("id", t.id);
      throwIf(pErr);
    }
  }

  await writeSkidEvent({
    skidId: id,
    nik: input.actorNik || null,
    action: "EDIT",
    before: {
      status: skid.status,
      kg: skid.netto,
      area: skid.area_asal,
      mix_at: skid.mix_at,
      exp_at: skid.exp_at,
      compound: skid.compound_code,
      run: skid.run_no,
      skid: skid.skid_no,
    },
    after: {
      kg: input.netto ?? skid.netto,
      area: input.areaAsal ?? skid.area_asal,
      mix_at: input.mixAt ?? skid.mix_at,
      exp_at: input.expAt ?? skid.exp_at,
      compound,
      run: runNo,
      skid: skidNo,
    },
  });

  return { ok: true as const, reprint: idChanged };
}

export async function deleteSkid(id: string) {
  const skid = await getSkid(id);
  if (!skid) return { ok: false as const, error: "Skid tidak ditemukan." };

  if (["CONSUMED", "SCRAP", "CLEANER", "DISPOSED", "IN_EXECUTION", "GAGAL_TRIAL"].includes(skid.status)) {
    return { ok: false as const, error: "Tidak bisa hapus — skid sudah punya kisah. Habis = CONSUMED, tetap di tabel." };
  }

  const execs = await listExecutionsForSkid(id);
  if (execs.length > 0) {
    return { ok: false as const, error: "Tidak bisa hapus — sudah ada potongan kg di mesin." };
  }

  const { data: tags, error: tErr } = await getSupabase()
    .from("disposition")
    .select("id, status, tag_no")
    .eq("skid_id", id);
  throwIf(tErr);
  if ((tags ?? []).length > 0) {
    return {
      ok: false as const,
      error: `Tidak bisa hapus — sudah ada tag #${tags![0].tag_no}. Histori tidak boleh putus.`,
    };
  }

  const openIds = (tags ?? []).map((d) => d.id);
  if (openIds.length) {
    const { error: dErr } = await getSupabase().from("disposition").delete().in("id", openIds);
    throwIf(dErr);
  }

  const { error } = await getSupabase().from("skid").delete().eq("id", id);
  throwIf(error);
  return { ok: true as const };
}

export async function updateSkidStatus(
  id: string,
  status: StatusId,
  extra: { locationCode?: string; remarks?: string; actorNik?: string } = {},
) {
  const before = await getSkid(id);
  const locationId = extra.locationCode ? await getLocationId(extra.locationCode) : undefined;
  const patch: Record<string, unknown> = { status };
  if (extra.remarks) patch.remarks = extra.remarks;
  if (locationId) patch.location_id = locationId;
  const { error } = await getSupabase().from("skid").update(patch).eq("id", id);
  throwIf(error);
  if (status === "RESTACKING" || status === "PICKLE_OUT" || status === "GAGAL_TRIAL") {
    await writeSkidEvent({
      skidId: id,
      nik: extra.actorNik || null,
      action: status === "RESTACKING" ? "RESTACK" : status,
      before: before ? { status: before.status } : null,
      after: { status },
    });
  }
}

export async function listDispositions(status?: string) {
  const sb = getSupabase();
  let q = sb.from("disposition").select("*").order("created_at", { ascending: false });
  if (status && status !== "ALL") q = q.eq("status", status);
  const { data, error } = await q;
  throwIf(error);
  const skids = await listSkids();
  const byId = new Map(skids.map((s) => [s.id, s]));
  return (data ?? []).map((d) => {
    const s = byId.get(d.skid_id);
    return {
      ...d,
      compound_code: s?.compound_code ?? "",
      run_no: s?.run_no ?? "",
      skid_no: s?.skid_no ?? "",
      qty_sisa: s?.qty_sisa ?? 0,
      skid_status: s?.status ?? "",
    } as DispositionRow;
  });
}

export async function getDisposition(id: string) {
  const rows = await listDispositions();
  return rows.find((d) => d.id === id);
}

export async function findDispositionByTag(tagNo: string) {
  const { data, error } = await getSupabase()
    .from("disposition")
    .select("id")
    .eq("tag_no", tagNo)
    .maybeSingle();
  throwIf(error);
  if (!data) return undefined;
  return getDisposition(data.id);
}

export async function markDispositionPrinted(id: string, nik?: string) {
  const row = await getDisposition(id);
  const { error } = await getSupabase()
    .from("disposition")
    .update({ printed_at: new Date().toISOString() })
    .eq("id", id);
  throwIf(error);
  if (row) {
    await writeSkidEvent({
      skidId: row.skid_id,
      nik: nik || null,
      action: "PRINT",
      after: { tag: row.tag_no },
    });
  }
}

export async function markDispositionVerified(id: string, raw: string, nik?: string) {
  const row = await getDisposition(id);
  const { error } = await getSupabase()
    .from("disposition")
    .update({
      verified_at: new Date().toISOString(),
      verify_scan_raw: raw,
    })
    .eq("id", id);
  throwIf(error);
  if (row) {
    await writeSkidEvent({
      skidId: row.skid_id,
      nik: nik || null,
      action: "VERIFY",
      after: { tag: row.tag_no },
    });
  }
}

export async function nextTagNo() {
  const { data, error } = await getSupabase().from("disposition").select("tag_no");
  throwIf(error);
  const nums = (data ?? [])
    .map((r) => Number(r.tag_no))
    .filter((n) => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 3000;
  return String(n);
}

export async function createDisposition(input: {
  skidId: string;
  actionType: ActionId;
  actionRule?: string;
  targetArea?: string;
  targetCompound?: string;
  dateExp?: string;
  originator: string;
  originatorNik?: string;
  tagColor?: string;
  remarks?: string;
}) {
  const skid = await getSkid(input.skidId);
  if (!skid) return { ok: false as const, error: "Skid tidak ditemukan." };

  if (["CONSUMED", "SCRAP"].includes(skid.status)) {
    return { ok: false as const, error: "Skid sudah habis atau scrap, tidak bisa didisposisi." };
  }

  const id = nid("dp");
  const tagNo = await nextTagNo();
  const nextStatus =
    input.actionType === "SCRAP"
      ? "SCRAP"
      : input.actionType === "CLEANER"
        ? "CLEANER"
        : input.actionType === "RESTACK"
          ? "RESTACKING"
          : input.actionType === "PICKLE_OUT"
            ? "PICKLE_OUT"
            : "DISPOSED";

  const dateExp = input.dateExp ? input.dateExp.slice(0, 10) : null;
  const payload = encodeSm1({
    tagNo,
    compound: skid.compound_code,
    runNo: skid.run_no,
    skidNo: skid.skid_no,
    dispositionId: id,
  });
  const { error } = await getSupabase().from("disposition").insert({
    id,
    tag_no: tagNo,
    skid_id: input.skidId,
    action_type: input.actionType,
    action_rule: input.actionRule || null,
    target_area: input.targetArea || null,
    target_compound: input.targetCompound || null,
    date_disp: new Date().toISOString().slice(0, 10),
    date_exp: dateExp,
    originator: input.originator,
    qc_nik: input.originatorNik || null,
    tag_color: input.tagColor || "WHITE",
    status: input.actionType === "SCRAP" ? "DONE" : "OPEN",
    remarks: input.remarks || null,
    label_payload: payload,
  });
  throwIf(error);

  await updateSkidStatus(input.skidId, nextStatus as StatusId, {
    locationCode: nextStatus === "DISPOSED" ? "SIAP_PAKAI" : undefined,
    remarks: input.actionRule || input.remarks,
  });

  await writeSkidEvent({
    skidId: input.skidId,
    nik: input.originatorNik || input.originator || null,
    action: "DISPO",
    after: { tag: tagNo, action: input.actionType, area: input.targetArea || null },
  });

  return { ok: true as const, disposition: (await getDisposition(id))! };
}

export async function listExecutions(limit = 30) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("execution")
    .select("*")
    .order("exec_at", { ascending: false })
    .limit(limit);
  throwIf(error);
  const skids = await listSkids();
  const disps = await listDispositions("ALL");
  return (data ?? []).map((e) => {
    const s = skids.find((x) => x.id === e.skid_id);
    const d = disps.find((x) => x.id === e.disposition_id);
    return {
      ...e,
      operator: e.operator_nik,
      compound_code: s?.compound_code ?? "",
      tag_no: d?.tag_no ?? null,
    } as ExecutionRow;
  });
}

export async function listExecutionsForSkid(skidId: string) {
  const all = await listExecutions(100);
  return all.filter((e) => e.skid_id === skidId);
}

export async function recordExecution(input: {
  skidId: string;
  dispositionId?: string;
  machineArea: string;
  kgUsed: number;
  batchCount?: number;
  result: "OK" | "PARTIAL" | "FAIL";
  operatorNik: string;
  shift?: string;
  note?: string;
}) {
  const skid = await getSkid(input.skidId);
  if (!skid) return { ok: false as const, error: "Skid tidak ditemukan." };
  if (input.kgUsed <= 0) return { ok: false as const, error: "Kg terpakai harus lebih dari 0." };

  const used = Math.min(input.kgUsed, skid.qty_sisa);
  const sisa = Math.round((skid.qty_sisa - used) * 10) / 10;
  const id = nid("ex");
  const dbResult = input.result === "FAIL" ? "FAIL_TRIAL" : input.result;

  const { error } = await getSupabase().from("execution").insert({
    id,
    disposition_id: input.dispositionId || null,
    skid_id: input.skidId,
    shift: input.shift || null,
    machine_area: input.machineArea,
    kg_used: used,
    batch_count: input.batchCount ?? 1,
    result: dbResult,
    operator_nik: input.operatorNik,
    note: input.note || null,
  });
  throwIf(error);

  let status: StatusId = "IN_EXECUTION";
  if (input.result === "FAIL") status = "GAGAL_TRIAL";
  if (sisa <= 0 && input.result !== "FAIL") status = "CONSUMED";

  const { error: skErr } = await getSupabase()
    .from("skid")
    .update({
      qty_sisa: Math.max(sisa, 0),
      status,
      executor_area: input.machineArea,
      executed_at: new Date().toISOString(),
    })
    .eq("id", input.skidId);
  throwIf(skErr);

  if (input.dispositionId) {
    const dispStatus =
      sisa <= 0 && input.result !== "FAIL" ? "DONE" : input.result === "FAIL" ? "FAILED" : "IN_PROGRESS";
    const { error: dErr } = await getSupabase()
      .from("disposition")
      .update({ status: dispStatus })
      .eq("id", input.dispositionId);
    throwIf(dErr);
  }

  await writeSkidEvent({
    skidId: input.skidId,
    nik: input.operatorNik,
    action: input.result === "FAIL" ? "GAGAL_TRIAL" : "PAKAI",
    after: { kg: used, sisa: Math.max(sisa, 0), area: input.machineArea, result: dbResult },
  });

  return { ok: true as const, sisa: Math.max(sisa, 0), status };
}

export async function countOpen() {
  const rows = await listSkids();
  return {
    review: rows.filter((s) =>
      ["UNDER_REVIEW", "RESTACKING", "PICKLE_OUT", "GAGAL_TRIAL"].includes(s.status),
    ).length,
    ready: rows.filter((s) => s.status === "DISPOSED").length,
    running: rows.filter((s) => s.status === "IN_EXECUTION").length,
    scrap: rows.filter((s) => s.status === "SCRAP").length,
    kg: rows.reduce((a, s) => a + Number(s.qty_sisa || 0), 0),
  };
}

function isMissingSnapshotTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const m = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (m.includes("stock_snapshot") && (m.includes("schema cache") || m.includes("does not exist")))
  );
}

export async function getSnapshot(snapDate: string) {
  const { data, error } = await getSupabase()
    .from("stock_snapshot")
    .select("snap_date, kg_live, skid_live, gagal_trial, tag_open")
    .eq("snap_date", snapDate)
    .maybeSingle();
  if (isMissingSnapshotTable(error)) return { missingTable: true as const, row: null };
  throwIf(error);
  return {
    missingTable: false as const,
    row: data
      ? {
          snap_date: String(data.snap_date),
          kg_live: Number(data.kg_live || 0),
          skid_live: Number(data.skid_live || 0),
        }
      : null,
  };
}

export async function upsertTodaySnapshot(input: {
  snapDate: string;
  kgLive: number;
  skidLive: number;
  gagalTrial: number;
  tagOpen: number;
  byStatus: Record<string, number>;
}) {
  const { error } = await getSupabase().from("stock_snapshot").upsert(
    {
      snap_date: input.snapDate,
      kg_live: input.kgLive,
      skid_live: input.skidLive,
      gagal_trial: input.gagalTrial,
      tag_open: input.tagOpen,
      by_status: input.byStatus,
      taken_at: new Date().toISOString(),
    },
    { onConflict: "snap_date" },
  );
  if (isMissingSnapshotTable(error)) return { ok: false as const, missingTable: true as const };
  throwIf(error);
  return { ok: true as const, missingTable: false as const };
}

export async function ticketPhotoUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await getSupabase()
    .storage.from("ticket-photos")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
