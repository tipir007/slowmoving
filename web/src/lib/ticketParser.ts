/** Template regex parser for Mixer Ticket printed text. */

export type DocumentType =
  | "MIXER_TICKET"
  | "LAB_GREEN"
  | "SM_LABEL"
  | "OLD_DISPOSITION"
  | "UNKNOWN";

export type ParsedTicket = {
  documentType: DocumentType;
  compound?: string;
  runNo?: string;
  skidNo?: string;
  ticketType?: "PRODUCTIVE" | "NON_PRODUCTIVE";
  expAt?: string;
  mixAt?: string;
  mixer?: string;
  empId?: string;
  sps?: string;
  flags: string[];
  raw: string;
};

const COMPOUND_DENY = /^(RUN|SKID|EXP|MIXER|EMP|SPS|DATE|PRODUCTIVE|NONPRODUCTIVE|FIRST|BATCH|TICKET)$/;
const COMPOUND_TOKEN =
  /\b([A-Z]{1,3}\d{2,5}[A-Z]{0,3}|[A-Z]\d[A-Z]\d{2,3}|[A-Z]\d{2}[A-Z]\d[A-Z]?)\b/g;

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function pick(text: string, re: RegExp) {
  const m = text.match(re);
  return m?.[1]?.trim();
}

function toIso(date: string, time?: string) {
  if (!date) return undefined;
  if (time) return `${date}T${time}`;
  return date;
}

/** Fullwidth colon/digit → ASCII. Do not invent 00:00. */
export function normalizeOcr(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/\uFF1A/g, ":")
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
}

function pad2(n: string | number) {
  return String(n).padStart(2, "0");
}

/** HH:MM / HH.MM / HH MM / fullwidth. Hour-only is not a time. */
export function extractTicketTime(afterDate: string): string | undefined {
  const s = afterDate.trim();
  const m = s.match(/^T?\s*(\d{1,2})[:.： ](\d{2})\b/);
  if (!m) return undefined;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return undefined;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function isTimeOnlyLine(line: string) {
  return /^\s*\d{1,2}[:.：]\d{2}\s*$/.test(line);
}

/** Parse Exp/Date printed on Mixer Ticket. No fake 00:00 if jam absen. */
export function parseTicketDateTime(raw: string): string | undefined {
  const s = normalizeOcr(raw).trim();
  if (!s) return undefined;
  const iso = s.match(/(\d{4})[/-](\d{2})[/-](\d{2})([\s\S]*)$/);
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return toIso(date, extractTicketTime(iso[4].replace(/\n/g, " ")));
  }
  const named = s.match(/(\d{1,2})[-/\s]([A-Z]{3})[-/\s](\d{4})([\s\S]*)$/i);
  if (named) {
    const mon = MONTHS[named[2].toUpperCase()];
    if (!mon) return undefined;
    const date = `${named[3]}-${mon}-${pad2(named[1])}`;
    return toIso(date, extractTicketTime(named[4].replace(/\n/g, " ")));
  }
  return undefined;
}

const WIB_OFFSET = "+07:00";
const WIB_MS = 7 * 3600_000;

/** Timestamptz from DB → jam tiket WIB. Naive string (OCR) dipakai apa adanya. */
export function splitDateTime(iso?: string | null) {
  if (!iso) return { date: "", time: "" };
  let s = iso;
  if (/[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(iso)) {
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) s = new Date(ms + WIB_MS).toISOString();
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  return { date: m?.[1] || "", time: m?.[2] || "" };
}

/** Jam tiket dicetak WIB; tanpa offset Postgres menganggapnya UTC. */
export function joinDateTime(date: string, time: string) {
  const d = date.trim();
  const t = time.trim();
  if (!d) return "";
  return t ? `${d}T${t}:00${WIB_OFFSET}` : d;
}

export function classifyDocument(text: string): DocumentType {
  const t = text.toUpperCase();
  if (/\bSM1\|/.test(t) || /RAK MERAH/.test(t)) return "SM_LABEL";
  if (/TAG\s*NO/.test(t) && /ORIGINATOR|PRODUCTION FEEDBACK/.test(t)) return "OLD_DISPOSITION";
  if (/MIXING DATE|LAB|CERTIFICATE/.test(t) && !/\bRUN\b/.test(t)) return "LAB_GREEN";
  if (/\bRUN\b/.test(t) || /\bSKI/.test(t) || /PRODUCTIVE/.test(t) || /\bMIXER\b/.test(t)) {
    return "MIXER_TICKET";
  }
  return "UNKNOWN";
}

function pickCompound(upper: string) {
  const labeled = pick(upper, /\bCOMPOUND\b[:\s#.-]*([A-Z0-9]{3,10})\b/);
  if (labeled && !COMPOUND_DENY.test(labeled)) return labeled;
  const matches = [...upper.matchAll(COMPOUND_TOKEN)].map((m) => m[1]);
  return matches.find((c) => !COMPOUND_DENY.test(c));
}

function labeledBlob(lines: string[], testers: RegExp[]) {
  for (let i = 0; i < lines.length; i += 1) {
    for (const re of testers) {
      const m = lines[i].match(re);
      if (!m) continue;
      const after = (m[1] ?? "").trim();
      const next = lines[i + 1] || "";
      return isTimeOnlyLine(next) ? `${after}\n${next.trim()}` : after;
    }
  }
  return undefined;
}

function fallbackDates(raw: string, haveExp?: string, haveMix?: string) {
  const seen = new Set<string>();
  const found: string[] = [];
  const re = /(\d{4})[/-](\d{2})[/-](\d{2})([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const parsed = parseTicketDateTime(m[0]);
    if (!parsed) continue;
    const day = parsed.slice(0, 10);
    if (seen.has(day)) continue;
    seen.add(day);
    found.push(parsed);
  }
  found.sort((a, b) => a.localeCompare(b));
  let mixAt = haveMix;
  let expAt = haveExp;
  const unused = found.filter((x) => {
    const day = x.slice(0, 10);
    return day !== haveExp?.slice(0, 10) && day !== haveMix?.slice(0, 10);
  });
  if (!mixAt && unused[0]) mixAt = unused[0];
  if (!expAt && unused.length >= 2) expAt = unused[unused.length - 1];
  else if (!expAt && unused.length === 1 && mixAt && unused[0].slice(0, 10) !== mixAt.slice(0, 10)) {
    expAt = unused[0];
  }
  return { expAt, mixAt };
}

export function parseMixerTicketText(rawInput: string): ParsedTicket {
  const raw = normalizeOcr(rawInput);
  const upper = raw.toUpperCase();
  const lines = raw.split("\n");
  const flags: string[] = [];
  if (/LPCA/.test(upper)) flags.push("LPCA");
  if (/RETEST/.test(upper)) flags.push("RETEST_MV");
  if (/INCOMPATIBLE/.test(upper)) flags.push("INCOMPATIBLE");

  const ticketType = /NON[-\s]?PRODUCTIVE/.test(upper)
    ? "NON_PRODUCTIVE"
    : /PRODUCT[TI]VE/.test(upper)
      ? "PRODUCTIVE"
      : undefined;

  const runNo = pick(upper, /\bRUN[A-Z]*\b[:\s#.-]*([0-9]{6})\b/);
  const skidRaw = pick(upper, /\bSKI[DU]?\b[:\s#.-]*([0-9]{1,4})\b/);
  const mixer = pick(upper, /\bMIXER\b[:\s#.-]*([0-9]{1,2})\b/);
  const empId = pick(upper, /\bEMP(?:\.|LOYEE)?\b[:\s#.-]*([A-Z]{2}\d{4,10})\b/);
  const sps = pick(upper, /\bSPS\b[:\s#.-]*([0-9]+)\b/);

  const expRaw = labeledBlob(lines, [
    /exp(?:et|iry|ire|iration)?[:\s#.\-]*([^\n]*)/i,
  ]);
  const mixRaw = labeledBlob(lines, [
    /dat(?:e|ette|a)[:\s#.\-]*([^\n]*)/i,
    /mix(?:ing)?\s*dat[a-z]*[:\s#.\-]*([^\n]*)/i,
  ]);

  let expAt = expRaw ? parseTicketDateTime(expRaw) : undefined;
  let mixAt = mixRaw ? parseTicketDateTime(mixRaw) : undefined;
  if (!expAt || !mixAt) {
    const fb = fallbackDates(raw, expAt, mixAt);
    expAt = fb.expAt;
    mixAt = fb.mixAt;
  }

  const compound = pickCompound(upper);

  return {
    documentType: classifyDocument(raw),
    compound: compound && !COMPOUND_DENY.test(compound) ? compound : undefined,
    runNo,
    skidNo: skidRaw ? String(Number(skidRaw)) : undefined,
    ticketType,
    expAt,
    mixAt,
    mixer,
    empId,
    sps,
    flags,
    raw,
  };
}
