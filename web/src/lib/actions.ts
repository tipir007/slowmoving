"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type ActionId, type RoleId, type StatusId } from "./constants";
import { clearSession, getSession, setSession } from "./session";
import {
  createDisposition,
  createSkid,
  deleteSkid,
  findDispositionByTag,
  findUserByNik,
  getDisposition,
  markDispositionPrinted,
  markDispositionVerified,
  recordExecution,
  updateSkid,
  updateSkidStatus,
} from "./queries";
import { getSupabase } from "./supabase";
import { decodeBarcode, normalizeSkidNo } from "./barcode";
import { joinDateTime } from "./ticketParser";

export async function loginAction(formData: FormData): Promise<void> {
  const nik = String(formData.get("nik") || "").trim().toUpperCase();
  const pin = String(formData.get("pin") || "").trim();
  if (!nik || !pin) redirect("/masuk?e=1");

  let user;
  try {
    user = await findUserByNik(nik);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("NEXT_PUBLIC_SUPABASE") || msg.includes(".env")) {
      redirect("/masuk?e=env");
    }
    redirect("/masuk?e=db");
  }
  if (!user || !user.is_active) redirect("/masuk?e=nik");
  if (user.pin !== pin) redirect("/masuk?e=pin");

  await setSession({
    nik: user.nik,
    name: user.name,
    role: user.role as RoleId,
  });
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/masuk");
}

function jsonObj(v: FormDataEntryValue | null) {
  try {
    const s = String(v || "");
    if (!s) return null;
    const o = JSON.parse(s);
    return o && typeof o === "object" ? (o as Record<string, number>) : null;
  } catch {
    return null;
  }
}

function num(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function registerSkidAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const compoundCode = String(formData.get("compoundCode") || "").trim();
  const runNo = String(formData.get("runNo") || "").trim();
  const skidNo = String(formData.get("skidNo") || "").trim();
  const netto = num(formData.get("netto"));
  if (!compoundCode || !runNo || !skidNo || !netto) {
    return { error: "Compound, run, skid, dan netto wajib diisi." };
  }

  const photo = formData.get("ticketPhoto");
  let ticketPhotoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const safe = `${compoundCode}_${runNo}_${skidNo}`.replace(/[^\w.-]+/g, "_");
    const path = `${session.nik}/${Date.now()}_${safe}.jpg`;
    const buf = Buffer.from(await photo.arrayBuffer());
    const { error: upErr } = await getSupabase()
      .storage.from("ticket-photos")
      .upload(path, buf, {
        contentType: photo.type || "image/jpeg",
        upsert: true,
      });
    if (upErr) {
      return { error: `Foto gagal tersimpan: ${upErr.message}` };
    }
    ticketPhotoPath = path;
  }

  const result = await createSkid({
    compoundCode,
    runNo,
    skidNo,
    mixer: String(formData.get("mixer") || "") || undefined,
    mixAt: String(formData.get("mixAt") || "") || undefined,
    expAt: String(formData.get("expAt") || "") || undefined,
    sps: num(formData.get("sps")),
    empId: String(formData.get("empId") || "") || undefined,
    ticketType: String(formData.get("ticketType") || "PRODUCTIVE") === "NON_PRODUCTIVE"
      ? "NON_PRODUCTIVE"
      : "PRODUCTIVE",
    bruto: num(formData.get("bruto")),
    beratSkid: num(formData.get("beratSkid")),
    netto,
    batchCount: num(formData.get("batchCount")) ?? 1,
    locationCode: String(formData.get("locationCode") || "NC"),
    areaAsal: String(formData.get("areaAsal") || "") || undefined,
    kondisi: String(formData.get("kondisi") || "") || undefined,
    noteQc: String(formData.get("noteQc") || "") || undefined,
    createdBy: session.nik,
    ticketPhotoPath,
    documentType: String(formData.get("documentType") || "") || undefined,
    rawBarcode: String(formData.get("rawBarcode") || "") || undefined,
    rawOcr: String(formData.get("rawOcr") || "") || undefined,
    fieldConfidence: jsonObj(formData.get("fieldConfidence")),
    operatorConfirmed: String(formData.get("operatorConfirmed") || "") === "1",
  });

  if (!result.ok) return { error: result.error, existingId: result.skid.id };
  revalidatePath("/");
  redirect(`/stok/${result.skid.id}`);
}

export async function updateSkidAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/");
  const nettoRaw = String(formData.get("netto") || "").trim();
  const result = await updateSkid(id, {
    compoundCode: String(formData.get("compoundCode") || ""),
    runNo: String(formData.get("runNo") || ""),
    skidNo: String(formData.get("skidNo") || ""),
    mixer: String(formData.get("mixer") || "") || undefined,
    empId: String(formData.get("empId") || "") || undefined,
    ticketType: String(formData.get("ticketType") || "PRODUCTIVE") === "NON_PRODUCTIVE"
      ? "NON_PRODUCTIVE"
      : "PRODUCTIVE",
    netto: nettoRaw ? Number(nettoRaw) : undefined,
    areaAsal: String(formData.get("areaAsal") || "") || undefined,
    kondisi: String(formData.get("kondisi") || "") || undefined,
    remarks: String(formData.get("remarks") || "") || undefined,
    rack: String(formData.get("rack") || "") || undefined,
    noteQc: String(formData.get("noteQc") || "") || undefined,
    mixAt: joinDateTime(String(formData.get("mixDate") || ""), String(formData.get("mixTime") || "")) || null,
    expAt: joinDateTime(String(formData.get("expDate") || ""), String(formData.get("expTime") || "")) || null,
    actorNik: session.nik,
  });
  if (!result.ok) {
    redirect(`/stok/${id}/edit?e=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  revalidatePath(`/stok/${id}`);
  redirect(`/stok/${id}${result.reprint ? "?reprint=1" : ""}`);
}

export async function deleteSkidAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/");
  const result = await deleteSkid(id);
  if (!result.ok) {
    redirect(`/stok/${id}?e=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  redirect("/");
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as StatusId;
  await updateSkidStatus(id, status, { actorNik: session.nik });
  revalidatePath("/");
  revalidatePath(`/stok/${id}`);
}

export async function createDispositionAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const skidId = String(formData.get("skidId") || "");
  const actionType = String(formData.get("actionType") || "") as ActionId;
  if (!skidId || !actionType) {
    redirect(`/disposisi/baru?e=wajib`);
  }

  const result = await createDisposition({
    skidId,
    actionType,
    actionRule: String(formData.get("actionRule") || "") || undefined,
    targetArea: String(formData.get("targetArea") || "") || undefined,
    targetCompound: String(formData.get("targetCompound") || "") || undefined,
    dateExp: String(formData.get("dateExp") || "") || undefined,
    originator: session.name,
    originatorNik: session.nik,
    tagColor: String(formData.get("tagColor") || "WHITE"),
    remarks: String(formData.get("remarks") || "") || undefined,
  });

  if (!result.ok) {
    redirect(`/disposisi/baru?skid=${skidId}&e=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  revalidatePath("/disposisi");
  redirect(`/label/${result.disposition.id}`);
}

export async function executeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const skidId = String(formData.get("skidId") || "");
  const kgUsed = num(formData.get("kgUsed"));
  const machineArea = String(formData.get("machineArea") || "");
  if (!skidId || !kgUsed || !machineArea) {
    redirect("/eksekusi?e=wajib");
  }

  const result = await recordExecution({
    skidId,
    dispositionId: String(formData.get("dispositionId") || "") || undefined,
    machineArea,
    kgUsed: kgUsed!,
    batchCount: num(formData.get("batchCount")) ?? 1,
    result: (String(formData.get("result") || "OK") as "OK" | "PARTIAL" | "FAIL"),
    operatorNik: session.nik,
    shift: String(formData.get("shift") || "") || undefined,
    note: String(formData.get("note") || "") || undefined,
  });

  if (!result.ok) {
    redirect(`/eksekusi?skid=${skidId}&e=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  revalidatePath("/eksekusi");
  revalidatePath(`/stok/${skidId}`);
  redirect(`/stok/${skidId}`);
}

export async function resolveScanAction(raw: string) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const decoded = decodeBarcode(raw);
  if (decoded.kind !== "sm1" || !decoded.sm1) {
    return {
      ok: false as const,
      error:
        decoded.kind === "compound" || decoded.kind === "run_skid"
          ? "Ini Mixer Ticket, bukan label SM1. Scan QR/barcode tag yang dicetak dari Disposisi."
          : decoded.message || "Kode tidak dikenali.",
    };
  }
  const d =
    (await getDisposition(decoded.sm1.dispositionId)) ||
    (await findDispositionByTag(decoded.sm1.tagNo));
  if (!d) return { ok: false as const, error: "Tag tidak ada di sistem." };
  return {
    ok: true as const,
    skidId: d.skid_id,
    dispositionId: d.id,
    tagNo: d.tag_no,
    compound: d.compound_code,
    runNo: d.run_no,
  };
}

export async function verifyDispositionAction(raw: string, expectedId?: string) {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const decoded = decodeBarcode(raw);
  if (decoded.kind !== "sm1" || !decoded.sm1) {
    return {
      ok: false as const,
      message:
        decoded.kind === "compound" || decoded.kind === "run_skid"
          ? "Ini Mixer Ticket, bukan label SM1."
          : decoded.message || "Kode tidak dikenali.",
    };
  }
  const d =
    (await getDisposition(decoded.sm1.dispositionId)) ||
    (await findDispositionByTag(decoded.sm1.tagNo));
  if (!d) return { ok: false as const, message: "Tag tidak ada di sistem." };
  if (expectedId && d.id !== expectedId && d.tag_no !== expectedId) {
    return { ok: false as const, message: "Label ini milik tag lain. Salah tempel." };
  }
  if (
    d.compound_code.toUpperCase() !== decoded.sm1.compound.toUpperCase() ||
    d.run_no !== decoded.sm1.runNo ||
    normalizeSkidNo(d.skid_no) !== decoded.sm1.skidNo
  ) {
    return { ok: false as const, message: "Payload tidak cocok dengan skid tag ini." };
  }
  await markDispositionVerified(d.id, raw, session.nik);
  revalidatePath(`/label/${d.id}`);
  revalidatePath(`/stok/${d.skid_id}`);
  return { ok: true as const, message: `Tempel OK. Tag #${d.tag_no} · ${d.compound_code}.` };
}

export async function markPrintedAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/disposisi");
  await markDispositionPrinted(id, session.nik);
  revalidatePath(`/label/${id}`);
  redirect(`/label/${id}?printed=1`);
}

export async function saveSnapshotAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  const { listDispositions, listSkids, upsertTodaySnapshot } = await import("./queries");
  const { jakartaToday, liveKg, liveSkids } = await import("./dashboard");
  const skids = await listSkids();
  const dispositions = await listDispositions();
  const openTags = dispositions.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS");
  const byStatus: Record<string, number> = {};
  for (const s of skids) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  const result = await upsertTodaySnapshot({
    snapDate: jakartaToday(),
    kgLive: liveKg(skids),
    skidLive: liveSkids(skids).length,
    gagalTrial: skids.filter((s) => s.status === "GAGAL_TRIAL").length,
    tagOpen: openTags.length,
    byStatus,
  });
  revalidatePath("/dashboard");
  redirect(result.missingTable ? "/dashboard?needsql=1" : "/dashboard?saved=1");
}
