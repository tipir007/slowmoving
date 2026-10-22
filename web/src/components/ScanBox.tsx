"use client";

import { useRef, useState } from "react";
import { BarcodeLive, kindLabel } from "@/components/BarcodeLive";
import {
  mergeTicketBarcodes,
  ticketIdReady,
  type DecodedBarcode,
} from "@/lib/barcode";

type Props = {
  onHits: (hits: DecodedBarcode[]) => void;
  autoStart?: boolean;
};

export function ScanBox({ onHits, autoStart = false }: Props) {
  const hitsRef = useRef<DecodedBarcode[]>([]);
  const [hits, setHits] = useState<DecodedBarcode[]>([]);
  const [warn, setWarn] = useState<string | null>(null);

  function onHit(decoded: DecodedBarcode): "continue" | "stop" {
    if (decoded.kind === "sm1") {
      setWarn("Ini label SM1 (disposisi), bukan Mixer Ticket. Jangan daftar skid baru dari sini.");
      return "continue";
    }
    if (decoded.kind === "unknown") {
      setWarn(decoded.message || "Kode tidak dikenali. Coba barcode satunya.");
      return "continue";
    }
    setWarn(null);
    const next = [...hitsRef.current.filter((h) => h.raw !== decoded.raw), decoded];
    hitsRef.current = next;
    setHits(next);
    onHits(next);
    return ticketIdReady(mergeTicketBarcodes(next)) ? "stop" : "continue";
  }

  const merged = mergeTicketBarcodes(hits);

  return (
    <>
      <BarcodeLive mode="ticket" autoStart={autoStart} onHit={onHit} />
      {warn ? <div className="alert">{warn}</div> : null}
      {hits.length > 0 ? (
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          Terbaca: {hits.map((h) => kindLabel(h.kind)).join(" + ")}
          {merged.compound ? ` · ${merged.compound}` : ""}
          {merged.runNo ? ` · run ${merged.runNo}` : ""}
          {merged.skidNo ? ` · skid ${merged.skidNo}` : ""}
          {ticketIdReady(merged) ? " — ID lengkap." : " — scan barcode yang belum."}
        </p>
      ) : null}
    </>
  );
}
