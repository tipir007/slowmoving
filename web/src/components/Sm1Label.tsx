"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { encodeSm1 } from "@/lib/barcode";
import { actionMeta } from "@/lib/constants";

export type LabelData = {
  id: string;
  tagNo: string;
  compound: string;
  runNo: string;
  skidNo: string;
  actionType: string;
  actionRule?: string | null;
  targetArea?: string | null;
  tagColor?: string;
  dateExp?: string | null;
  payload?: string | null;
};

export function Sm1Label({ data }: { data: LabelData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qr, setQr] = useState<string>("");
  const payload =
    data.payload ||
    encodeSm1({
      tagNo: data.tagNo,
      compound: data.compound,
      runNo: data.runNo,
      skidNo: data.skidNo,
      dispositionId: data.id,
    });

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, { margin: 1, width: 220, errorCorrectionLevel: "M" }).then((url) => {
      if (alive) setQr(url);
    });
    if (svgRef.current) {
      JsBarcode(svgRef.current, payload, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1.15,
        height: 52,
        background: "transparent",
      });
    }
    return () => {
      alive = false;
    };
  }, [payload]);

  const yellow = data.tagColor === "YELLOW";

  return (
    <div className={`sm1-sheet ${yellow ? "yellow" : ""}`}>
      <div className="sm1-head">
        <span>RAK MERAH</span>
        <strong>TAG {data.tagNo}</strong>
      </div>
      <div className="sm1-grid">
        {qr ? <img className="sm1-qr" src={qr} alt="QR SM1" /> : <div className="sm1-qr" />}
        <div>
          <div className="sm1-code">{data.compound}</div>
          <div className="sm1-meta">
            RUN {data.runNo} · SKID {data.skidNo}
          </div>
          <div className="sm1-action">{actionMeta(data.actionType).label}</div>
          <div className="sm1-rule">
            {data.targetArea || "—"}
            {data.actionRule ? ` · ${data.actionRule}` : ""}
          </div>
          {data.dateExp ? <div className="sm1-rule">Berlaku s/d {data.dateExp}</div> : null}
        </div>
      </div>
      <svg ref={svgRef} className="sm1-c128" />
      <div className="sm1-payload">{payload}</div>
    </div>
  );
}
