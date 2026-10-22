"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DecodedBarcode } from "@/lib/barcode";
import { confidenceMap, fuseTicket, type FusionResult } from "@/lib/fusion";
import { detectBarcodesFromFile, ocrFromFile } from "@/lib/readTicketImage";

type Props = {
  photo: File | null;
  barcodes: DecodedBarcode[];
  onBarcodes?: (hits: DecodedBarcode[]) => void;
  onApply: (fusion: FusionResult) => void;
};

function lamp(confidence: number, source: string) {
  if (source === "empty") return "lamp-grey";
  if (confidence >= 0.9) return "lamp-green";
  if (confidence >= 0.55) return "lamp-yellow";
  return "lamp-red";
}

export function TicketReadBox({ photo, barcodes, onBarcodes, onApply }: Props) {
  const [ocrText, setOcrText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("Foto tiket, atau tempel teks OCR di sini. Field di bawah terisi otomatis.");
  const lastFile = useRef<File | null>(null);
  const applyRef = useRef(onApply);
  applyRef.current = onApply;

  const fusion = useMemo(() => fuseTicket(barcodes, ocrText), [barcodes, ocrText]);

  useEffect(() => {
    if (!photo || photo === lastFile.current) return;
    lastFile.current = photo;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setOcrText("");
      setHint("Membaca barcode dan teks dari foto…");
      try {
        const codes = await detectBarcodesFromFile(photo);
        if (cancelled) return;
        if (codes.length) onBarcodes?.(codes.filter((c) => c.kind !== "unknown"));
        const text = await ocrFromFile(photo);
        if (cancelled) return;
        setOcrText(text);
        if (!text && codes.length === 0) {
          setHint("Tidak terbaca. Tempel teks OCR, atau ketik field.");
        } else {
          setHint("Teks masuk. Koreksi di sini — kotak di bawah ikut terisi. Jam boleh kosong.");
        }
      } catch {
        if (!cancelled) setHint("Baca foto gagal. Tempel teks OCR, atau ketik field.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  useEffect(() => {
    applyRef.current(fusion);
  }, [fusion]);

  const rows: { key: string; label: string; field: FusionResult["compound"] }[] = [
    { key: "compound", label: "Compound", field: fusion.compound },
    { key: "run", label: "Run", field: fusion.runNo },
    { key: "skid", label: "Skid", field: fusion.skidNo },
    { key: "type", label: "Tipe", field: fusion.ticketType },
    { key: "exp", label: "Exp", field: fusion.expAt },
    { key: "mix", label: "Mix", field: fusion.mixAt },
    { key: "mixer", label: "Mixer", field: fusion.mixer },
    { key: "emp", label: "Emp", field: fusion.empId },
  ];

  return (
    <div className="scan-box ocr-box">
      <div className="field" style={{ marginTop: 0, marginBottom: 10 }}>
        <label>Teks OCR (boleh dikoreksi)</label>
        <textarea
          className="ocr-area"
          rows={8}
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          placeholder={"PRODUCTIVE\nK16D4R\nRun: 791518\nSkid: 3\nExp:2026-10-10 07:26\nDate: 2026-09-19 07:26\nMixer: 2"}
        />
      </div>
      <p className="muted" style={{ margin: "0 0 8px" }}>
        {busy ? "Membaca…" : hint}
      </p>
      <p className="muted" style={{ margin: "0 0 8px" }}>
        Dokumen: <strong>{fusion.documentType}</strong>
        {fusion.flags.length ? ` · ${fusion.flags.join(", ")}` : ""}
        {fusion.rawBarcode ? ` · barcode ${fusion.rawBarcode}` : ""}
      </p>
      <ul className="ocr-fields">
        {rows.map((r) => (
          <li key={r.key} className={`ocr-field ${lamp(r.field.confidence, r.field.source)}`}>
            <span>{r.label}</span>
            <strong>{r.field.value || "—"}</strong>
            <em>
              {r.field.source === "empty" ? "kosong" : r.field.source}
              {r.field.conflict ? ` · ${r.field.conflict}` : ""}
            </em>
          </li>
        ))}
      </ul>
      <p className="muted">{fusion.note}</p>
      <input type="hidden" name="rawBarcode" value={fusion.rawBarcode} />
      <input type="hidden" name="rawOcr" value={fusion.rawOcr} />
      <input type="hidden" name="documentType" value={fusion.documentType} />
      <input type="hidden" name="fieldConfidence" value={JSON.stringify(confidenceMap(fusion))} />
    </div>
  );
}
