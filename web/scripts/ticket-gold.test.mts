import { decodeBarcode, mergeTicketBarcodes } from "../src/lib/barcode";
import { fuseTicket } from "../src/lib/fusion";
import { parseMixerTicketText } from "../src/lib/ticketParser";

function eq(name: string, got: unknown, want: unknown) {
  if (String(got) !== String(want)) {
    throw new Error(`${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
}

const f7894Ocr = `Mixer ticket
F7894
Run: 791280
SkiU: 1
Exp:2026-09-24 08:10
Mixer: 1
Date: 2026-09-17 08:10
SPS: 4
Emp: AA398822
PRODUCTIVE
LPCA - INCOMPATIBLE`;

const k16Ocr = `Mixer ticket
K16D4R
Run: 791518
Skid: 3
Exp:2026-10-10 07:26
Mixer: 2
Date: 2026-09-19 07:26
SPS: 7
Emp: AA398822
PRODUCTIVE`;

const s0431Ocr = `NON-PRODUCTIVE
S0431
Run: 686933
Skid: 5
Exp:24-JAN-2024
Mixer: 4
Date: 2024-01-10 03:01`;

const npOcr = `NON-PRODUCTIVE
S6H63
Run: 785751
Skid: 3`;

eq("K16D4R barcode", decodeBarcode("K16D4R").compound, "K16D4R");
eq("F7894 barcode", decodeBarcode("F7894").compound, "F7894");
eq("S6H63 barcode", decodeBarcode("S6H63").compound, "S6H63");
eq("9 digit", JSON.stringify({ r: decodeBarcode("791280001").runNo, s: decodeBarcode("791280001").skidNo }), JSON.stringify({ r: "791280", s: "1" }));
eq("128000 weak", decodeBarcode("128000").weak, true);
eq("128000 not merged", mergeTicketBarcodes([decodeBarcode("128000")]).runNo, undefined);

const f = fuseTicket([decodeBarcode("F7894"), decodeBarcode("791280001")], f7894Ocr);
eq("F compound", f.compound.value, "F7894");
eq("F run", f.runNo.value, "791280");
eq("F skid", f.skidNo.value, "1");
eq("F exp", f.expAt.value, "2026-09-24T08:10");
eq("F mix", f.mixAt.value, "2026-09-17T08:10");
eq("F emp", f.empId.value, "AA398822");
eq("F mixer", f.mixer.value, "1");

const k = fuseTicket([decodeBarcode("K16D4R"), decodeBarcode("791518003")], k16Ocr);
eq("K compound", k.compound.value, "K16D4R");
eq("K run", k.runNo.value, "791518");
eq("K skid", k.skidNo.value, "3");
eq("K exp", k.expAt.value, "2026-10-10T07:26");
eq("K mix", k.mixAt.value, "2026-09-19T07:26");

const s = fuseTicket([decodeBarcode("S0431")], s0431Ocr);
eq("S compound", s.compound.value, "S0431");
eq("S run ocr", s.runNo.value, "686933");
eq("S skid", s.skidNo.value, "5");
eq("S exp jan", s.expAt.value, "2024-01-24");
eq("S mix", s.mixAt.value, "2024-01-10T03:01");
eq("S type", s.ticketType.value, "NON_PRODUCTIVE");

const leftover = fuseTicket([decodeBarcode("PN791"), decodeBarcode("791518")], s0431Ocr);
eq("stale 6-digit ignored", leftover.runNo.value, "686933");

const np = parseMixerTicketText(npOcr);
eq("NP compound", np.compound, "S6H63");
eq("NP run", np.runNo, "785751");
eq("NP skid", np.skidNo, "3");

const weakOnly = fuseTicket([decodeBarcode("128000")], "");
eq("weak alone empty run", weakOnly.runNo.value, "");

const dirtySep23 = `PRODUCTTVE
Mixe ickot
K16D4R
Runnt:
Skid:
Expet:2026-10-10 07
Mixer:2
791518003
Datette:2026-09-19 07:26
Emp:AA398822
S2026-09-19 07:26`;
const dirty = fuseTicket([decodeBarcode("K16D4R"), decodeBarcode("791518003")], dirtySep23);
eq("dirty compound", dirty.compound.value, "K16D4R");
eq("dirty run", dirty.runNo.value, "791518");
eq("dirty skid", dirty.skidNo.value, "3");
eq("dirty mixer", dirty.mixer.value, "2");
eq("dirty exp date only", dirty.expAt.value, "2026-10-10");
eq("dirty mix + time", dirty.mixAt.value, "2026-09-19T07:26");
eq("dirty emp", dirty.empId.value, "AA398822");

eq("dot time", parseMixerTicketText("Exp:2026-10-10 07.26").expAt, "2026-10-10T07:26");
eq("wrap time", parseMixerTicketText("Exp:2026-10-10\n07:26").expAt, "2026-10-10T07:26");
eq("date only no fake midnight", parseMixerTicketText("Exp:2026-10-10").expAt, "2026-10-10");

console.log("GOLD_OK");
