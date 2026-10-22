import { decodeBarcode, mergeTicketBarcodes, ticketIdReady, type DecodedBarcode } from "./barcode";
import { parseMixerTicketText, type DocumentType, type ParsedTicket } from "./ticketParser";

export type FieldSource = "barcode" | "ocr" | "empty";

export type FusedField = {
  value: string;
  source: FieldSource;
  confidence: number;
  conflict?: string;
};

export type FusionResult = {
  documentType: DocumentType;
  compound: FusedField;
  runNo: FusedField;
  skidNo: FusedField;
  expAt: FusedField;
  mixAt: FusedField;
  mixer: FusedField;
  empId: FusedField;
  ticketType: FusedField;
  sps: FusedField;
  flags: string[];
  rawBarcode: string;
  rawOcr: string;
  idReady: boolean;
  note: string;
};

function field(value: string | undefined, source: FieldSource, confidence: number, conflict?: string): FusedField {
  if (!value) return { value: "", source: "empty", confidence: 0, conflict };
  return { value, source, confidence, conflict };
}

function preferBarcode(barcode?: string, ocr?: string, high = 0.95, mid = 0.7): FusedField {
  if (barcode && ocr && barcode.toUpperCase() !== ocr.toUpperCase()) {
    return field(barcode, "barcode", high, `OCR baca ${ocr}`);
  }
  if (barcode) return field(barcode, "barcode", high);
  if (ocr) return field(ocr, "ocr", mid);
  return field(undefined, "empty", 0);
}

export function fuseTicket(barcodes: DecodedBarcode[], ocrText = ""): FusionResult {
  const parsed: ParsedTicket = ocrText.trim() ? parseMixerTicketText(ocrText) : {
    documentType: "UNKNOWN",
    flags: [],
    raw: "",
  };
  const fromBc = mergeTicketBarcodes(barcodes.filter((b) => b.kind !== "sm1"));
  const sm1 = barcodes.find((b) => b.kind === "sm1");
  const documentType: DocumentType = sm1
    ? "SM_LABEL"
    : parsed.documentType !== "UNKNOWN"
      ? parsed.documentType
      : fromBc.compound || fromBc.runNo
        ? "MIXER_TICKET"
        : "UNKNOWN";

  const runFromBc =
    fromBc.runNo || (fromBc.weakRun && parsed.runNo && fromBc.weakRun === parsed.runNo ? fromBc.weakRun : undefined);
  const compound = preferBarcode(fromBc.compound, parsed.compound);
  const runNo = preferBarcode(runFromBc, parsed.runNo);
  const skidNo = preferBarcode(fromBc.skidNo, parsed.skidNo);
  const idReady = ticketIdReady({
    compound: compound.value,
    runNo: runNo.value,
    skidNo: skidNo.value,
  });

  let note = "Isi yang kuning dicek / diketik operator.";
  if (sm1) note = "Ini label SM1, bukan Mixer Ticket. Jangan daftar skid baru dari sini.";
  else if (documentType === "LAB_GREEN") note = "Tiket lab hijau: lampiran retest, bukan daftar skid.";
  else if (documentType === "OLD_DISPOSITION") note = "Form kertas lama: pakai Disposisi digital, jangan OCR tulis tangan.";
  else if (idReady) note = "ID dari barcode. Cek lalu simpan. Kg tetap diketik.";
  else if (compound.value || runNo.value) note = "Barcode sebagian. Scan yang belum, atau isi manual.";
  else note = "Belum ada barcode. Foto + baca teks, atau ketik.";

  return {
    documentType,
    compound,
    runNo,
    skidNo,
    expAt: field(parsed.expAt, parsed.expAt ? "ocr" : "empty", parsed.expAt ? 0.55 : 0),
    mixAt: field(parsed.mixAt, parsed.mixAt ? "ocr" : "empty", parsed.mixAt ? 0.55 : 0),
    mixer: field(parsed.mixer, parsed.mixer ? "ocr" : "empty", parsed.mixer ? 0.6 : 0),
    empId: field(parsed.empId, parsed.empId ? "ocr" : "empty", parsed.empId ? 0.55 : 0),
    ticketType: field(parsed.ticketType, parsed.ticketType ? "ocr" : "empty", parsed.ticketType ? 0.75 : 0),
    sps: field(parsed.sps, parsed.sps ? "ocr" : "empty", parsed.sps ? 0.5 : 0),
    flags: parsed.flags,
    rawBarcode: fromBc.raw.join(" · "),
    rawOcr: parsed.raw,
    idReady,
    note,
  };
}

export function decodeMany(raws: string[]) {
  return raws.map(decodeBarcode);
}

export function confidenceMap(fusion: FusionResult) {
  return {
    compound: fusion.compound.confidence,
    runNo: fusion.runNo.confidence,
    skidNo: fusion.skidNo.confidence,
    expAt: fusion.expAt.confidence,
    mixAt: fusion.mixAt.confidence,
    mixer: fusion.mixer.confidence,
    empId: fusion.empId.confidence,
    ticketType: fusion.ticketType.confidence,
    sps: fusion.sps.confidence,
  };
}
