/** Decode Mixer Ticket barcodes and SM1 label payloads. Barcode-first, not a neural net. */

export type BarcodeKind = "compound" | "run_skid" | "sm1" | "unknown";

export type Sm1Payload = {
  version: "SM1";
  tagNo: string;
  compound: string;
  runNo: string;
  skidNo: string;
  dispositionId: string;
};

export type DecodedBarcode = {
  raw: string;
  kind: BarcodeKind;
  compound?: string;
  runNo?: string;
  skidNo?: string;
  sm1?: Sm1Payload;
  message?: string;
  /** 6-digit-only side scan — do not auto-fill run until OCR agrees. */
  weak?: boolean;
};

const COMPOUND_DENY = /^(RUN|SKID|EXP|MIXER|EMP|SPS|DATE|PRODUCTIVE|NONPRODUCTIVE)$/;

/** F7894, S0431, PN791, S6H63, T97F1, K16D4R */
export const COMPOUND_RE =
  /^(?:[A-Z]{1,3}\d{2,5}[A-Z]{0,3}|[A-Z]\d[A-Z]\d{2,3}|[A-Z]\d{2}[A-Z]\d[A-Z]?)$/;

export function isCompoundCode(raw: string) {
  const upper = raw.trim().toUpperCase();
  if (!upper || COMPOUND_DENY.test(upper) || /^\d+$/.test(upper)) return false;
  return COMPOUND_RE.test(upper);
}

export function normalizeSkidNo(raw: string) {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return trimmed;
  if (/[A-Z]/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  return String(Number(digits));
}

export function encodeSm1(input: {
  tagNo: string;
  compound: string;
  runNo: string;
  skidNo: string;
  dispositionId: string;
}) {
  return [
    "SM1",
    String(input.tagNo).trim(),
    String(input.compound).trim().toUpperCase(),
    String(input.runNo).trim(),
    normalizeSkidNo(input.skidNo),
    String(input.dispositionId).trim(),
  ].join("|");
}

export function decodeSm1(raw: string): Sm1Payload | null {
  const parts = raw.trim().split("|").map((p) => p.trim());
  if (parts.length < 6) return null;
  if (parts[0].toUpperCase() !== "SM1") return null;
  const [, tagNo, compound, runNo, skidNo, dispositionId] = parts;
  if (!tagNo || !compound || !runNo || !skidNo || !dispositionId) return null;
  return {
    version: "SM1",
    tagNo,
    compound: compound.toUpperCase(),
    runNo,
    skidNo: normalizeSkidNo(skidNo),
    dispositionId,
  };
}

export function decodeBarcode(rawInput: string): DecodedBarcode {
  const raw = rawInput.trim();
  if (!raw) return { raw, kind: "unknown", message: "Kode kosong." };

  const sm1 = decodeSm1(raw);
  if (sm1) {
    return {
      raw,
      kind: "sm1",
      compound: sm1.compound,
      runNo: sm1.runNo,
      skidNo: sm1.skidNo,
      sm1,
    };
  }

  const upper = raw.toUpperCase();
  const digits = raw.replace(/\D/g, "");

  if (/^SM1/.test(upper)) {
    return { raw, kind: "unknown", message: "Payload SM1 rusak / terpotong." };
  }

  if (isCompoundCode(upper)) {
    return { raw, kind: "compound", compound: upper };
  }

  if (/^\d+$/.test(digits)) {
    if (digits.length === 9) {
      const runNo = digits.slice(0, 6);
      const skidNo = normalizeSkidNo(digits.slice(6));
      return {
        raw,
        kind: "run_skid",
        runNo,
        skidNo,
        message: `Run ${runNo} · skid ${skidNo}`,
      };
    }
    if (digits.length === 6) {
      return {
        raw,
        kind: "run_skid",
        runNo: digits,
        weak: true,
        message: `6 digit ${digits} — scan barcode samping 9 digit, atau cek OCR Run`,
      };
    }
    return {
      raw,
      kind: "unknown",
      message: `Kode ${digits.length} digit. Barcode samping Mixer Ticket = 9 digit (run+skid).`,
    };
  }

  return { raw, kind: "unknown", message: "Bukan barcode Mixer Ticket atau label SM1." };
}

export function mergeTicketBarcodes(hits: DecodedBarcode[]) {
  const out: { compound?: string; runNo?: string; skidNo?: string; raw: string[]; weakRun?: string } = {
    raw: [],
  };
  for (const hit of hits) {
    if (!hit.raw || out.raw.includes(hit.raw)) continue;
    out.raw.push(hit.raw);
    if (hit.kind === "sm1") continue;
    if (hit.compound) out.compound = hit.compound;
    if (hit.kind === "run_skid" && hit.weak) {
      out.weakRun = hit.runNo;
      continue;
    }
    if (hit.runNo) out.runNo = hit.runNo;
    if (hit.skidNo) out.skidNo = hit.skidNo;
  }
  return out;
}

export function ticketIdReady(fields: { compound?: string; runNo?: string; skidNo?: string }) {
  return Boolean(fields.compound && fields.runNo && fields.skidNo);
}
