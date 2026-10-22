"use client";

import { useRef, useState } from "react";
import { ScanBox } from "@/components/ScanBox";
import { CONDITIONS, LOCATIONS, SOURCE_AREAS } from "@/lib/constants";
import { registerSkidAction } from "@/lib/actions";
import { TicketPhoto } from "@/components/TicketPhoto";
import { TicketReadBox } from "@/components/TicketReadBox";
import { mergeTicketBarcodes, type DecodedBarcode } from "@/lib/barcode";
import type { FusionResult } from "@/lib/fusion";
import { joinDateTime, splitDateTime } from "@/lib/ticketParser";

type Mode = "live" | "photo" | "gallery";

export function RegisterForm() {
  const [mode, setMode] = useState<Mode>("live");
  const [values, setValues] = useState<Record<string, string>>({
    ticketType: "PRODUCTIVE",
    locationCode: "NC",
    batchCount: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [hits, setHits] = useState<DecodedBarcode[]>([]);
  const [saving, setSaving] = useState(false);
  const touched = useRef<Record<string, boolean>>({});

  function set(k: string, v: string) {
    touched.current[k] = true;
    setValues((s) => ({ ...s, [k]: v }));
  }

  function onPhoto(file: File | null) {
    setPhoto(file);
    setHits([]);
    touched.current = {};
  }

  function onHits(next: DecodedBarcode[]) {
    setHits(next);
    const merged = mergeTicketBarcodes(next);
    setValues((s) => ({
      ...s,
      compoundCode: touched.current.compoundCode ? s.compoundCode : merged.compound || s.compoundCode,
      runNo: touched.current.runNo ? s.runNo : merged.runNo || s.runNo,
      skidNo: touched.current.skidNo ? s.skidNo : merged.skidNo || s.skidNo,
    }));
  }

  function applyFusion(fusion: FusionResult) {
    const mix = splitDateTime(fusion.mixAt.value);
    const exp = splitDateTime(fusion.expAt.value);
    const t = touched.current;
    setValues((s) => ({
      ...s,
      compoundCode: t.compoundCode ? s.compoundCode : fusion.compound.value,
      runNo: t.runNo ? s.runNo : fusion.runNo.value,
      skidNo: t.skidNo ? s.skidNo : fusion.skidNo.value,
      ticketType: t.ticketType ? s.ticketType : fusion.ticketType.value || s.ticketType,
      mixer: t.mixer ? s.mixer : fusion.mixer.value,
      empId: t.empId ? s.empId : fusion.empId.value,
      mixDate: t.mixDate ? s.mixDate : mix.date,
      mixTime: t.mixTime ? s.mixTime : mix.time,
      expDate: t.expDate ? s.expDate : exp.date,
      expTime: t.expTime ? s.expTime : exp.time,
      sps: t.sps ? s.sps : fusion.sps.value,
    }));
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    const mixAt = joinDateTime(values.mixDate || "", values.mixTime || "");
    const expAt = joinDateTime(values.expDate || "", values.expTime || "");
    if (!mixAt && !expAt) {
      setError("Tanggal Mix atau Exp harus terisi. Koreksi teks OCR, atau ketik tanggal.");
      return;
    }
    formData.set("mixAt", mixAt);
    formData.set("expAt", expAt);
    setSaving(true);
    if (photo) formData.set("ticketPhoto", photo);
    const res = await registerSkidAction(formData);
    setSaving(false);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit}>
      <div className="source-tabs">
        {(
          [
            ["live", "Live"],
            ["photo", "Foto"],
            ["gallery", "Galeri"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? "on" : ""}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "live" ? (
        <ScanBox onHits={onHits} autoStart />
      ) : (
        <TicketPhoto onFile={onPhoto} mode={mode === "photo" ? "camera" : "gallery"} />
      )}

      <TicketReadBox photo={photo} barcodes={hits} onBarcodes={onHits} onApply={applyFusion} />
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid-2">
        <div className="field">
          <label>Compound</label>
          <input name="compoundCode" required value={values.compoundCode || ""} onChange={(e) => set("compoundCode", e.target.value)} placeholder="K16D4R" />
        </div>
        <div className="field">
          <label>Run no</label>
          <input name="runNo" required value={values.runNo || ""} onChange={(e) => set("runNo", e.target.value)} placeholder="791518" />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Skid</label>
          <input name="skidNo" required value={values.skidNo || ""} onChange={(e) => set("skidNo", e.target.value)} placeholder="3" />
        </div>
        <div className="field">
          <label>Mixer</label>
          <input name="mixer" placeholder="2" value={values.mixer || ""} onChange={(e) => set("mixer", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Emp / NIK</label>
          <input name="empId" placeholder="AA398822" value={values.empId || ""} onChange={(e) => set("empId", e.target.value)} />
        </div>
        <div className="field">
          <label>Tipe tiket</label>
          <select name="ticketType" value={values.ticketType} onChange={(e) => set("ticketType", e.target.value)}>
            <option value="PRODUCTIVE">Productive</option>
            <option value="NON_PRODUCTIVE">Non-productive</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Exp tanggal</label>
          <input name="expDate" type="date" value={values.expDate || ""} onChange={(e) => set("expDate", e.target.value)} />
        </div>
        <div className="field">
          <label>Exp jam (boleh kosong)</label>
          <input name="expTime" type="time" value={values.expTime || ""} onChange={(e) => set("expTime", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Mix tanggal</label>
          <input name="mixDate" type="date" value={values.mixDate || ""} onChange={(e) => set("mixDate", e.target.value)} />
        </div>
        <div className="field">
          <label>Mix jam (boleh kosong)</label>
          <input name="mixTime" type="time" value={values.mixTime || ""} onChange={(e) => set("mixTime", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Netto (kg)</label>
          <input name="netto" type="number" step="0.1" required />
        </div>
        <div className="field">
          <label>Sumber mesin</label>
          <select name="areaAsal" required defaultValue="">
            <option value="">Pilih BB / Ext / Cal / Bead</option>
            {SOURCE_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>SPS</label>
        <input name="sps" type="number" value={values.sps || ""} onChange={(e) => set("sps", e.target.value)} />
      </div>

      <details className="scan-box">
        <summary>Data tambahan (lokasi, bruto, kondisi)</summary>
        <div className="grid-2" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Batch</label>
            <input name="batchCount" type="number" defaultValue={1} />
          </div>
          <div className="field">
            <label>Bruto</label>
            <input name="bruto" type="number" step="0.1" />
          </div>
        </div>
        <div className="field">
          <label>Berat skid</label>
          <input name="beratSkid" type="number" step="0.1" />
        </div>
        <div className="field">
          <label>Lokasi sekarang</label>
          <select name="locationCode" value={values.locationCode} onChange={(e) => set("locationCode", e.target.value)}>
            {LOCATIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Kondisi</label>
          <select name="kondisi" defaultValue="OK">
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Catatan QC</label>
          <textarea name="noteQc" rows={2} placeholder="Lumpy atas, bawah OK / retest MV" />
        </div>
      </details>

      <label className="confirm-check">
        <input type="checkbox" name="operatorConfirmed" value="1" required />
        Compound, run, skid, dan tanggal tiket sudah saya cek
      </label>
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Menyimpan…" : "Simpan ke rak merah"}
      </button>
    </form>
  );
}
