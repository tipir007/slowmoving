import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = path.join(root, "data", "rak-merah.db");
const seedPath = path.join(root, "data", "seed.json");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);
db.exec(`
  CREATE TABLE location (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    zone TEXT NOT NULL
  );
  CREATE TABLE skid (
    id TEXT PRIMARY KEY,
    compound_code TEXT NOT NULL,
    run_no TEXT NOT NULL,
    skid_no TEXT NOT NULL,
    mixer TEXT,
    mix_at TEXT,
    exp_at TEXT,
    sps INTEGER,
    emp_id TEXT,
    ticket_type TEXT NOT NULL DEFAULT 'PRODUCTIVE',
    bruto REAL,
    berat_skid REAL,
    netto REAL NOT NULL DEFAULT 0,
    qty_sisa REAL NOT NULL DEFAULT 0,
    batch_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    location_id TEXT,
    area_asal TEXT,
    kondisi TEXT,
    note_qc TEXT,
    legacy_no INTEGER,
    rack TEXT,
    remarks TEXT,
    executor_area TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (compound_code, run_no, skid_no)
  );
  CREATE TABLE disposition (
    id TEXT PRIMARY KEY,
    tag_no TEXT UNIQUE NOT NULL,
    skid_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_rule TEXT,
    target_area TEXT,
    target_compound TEXT,
    date_disp TEXT NOT NULL,
    date_exp TEXT,
    originator TEXT NOT NULL,
    tag_color TEXT NOT NULL DEFAULT 'WHITE',
    status TEXT NOT NULL DEFAULT 'OPEN',
    remarks TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE execution (
    id TEXT PRIMARY KEY,
    disposition_id TEXT,
    skid_id TEXT NOT NULL,
    exec_at TEXT NOT NULL,
    shift TEXT,
    machine_area TEXT NOT NULL,
    kg_used REAL NOT NULL,
    batch_count INTEGER NOT NULL DEFAULT 1,
    result TEXT NOT NULL,
    operator TEXT NOT NULL,
    note TEXT
  );
`);

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const now = new Date().toISOString();
const nid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

const locIns = db.prepare(`INSERT OR IGNORE INTO location (id, code, name, zone) VALUES (?,?,?,?)`);
const locs = new Map();
function locId(code, name) {
  const id = `loc_${code}`;
  if (!locs.has(code)) {
    locIns.run(id, code, name || code, "NC");
    locs.set(code, id);
  }
  return id;
}

const skidIns = db.prepare(`
  INSERT INTO skid (
    id, compound_code, run_no, skid_no, ticket_type, bruto, berat_skid, netto, qty_sisa,
    batch_count, status, location_id, rack, remarks, executor_area, executed_at, legacy_no,
    created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const byCompound = new Map();
let skidCount = 0;
for (const s of seed.skids) {
  const id = nid("sk");
  const locationId = locId(s.locationCode, s.locationName);
  try {
    skidIns.run(
      id,
      s.compoundCode,
      s.runNo,
      String(s.skidNo),
      "PRODUCTIVE",
      s.bruto,
      s.beratSkid,
      s.netto,
      s.qtySisa,
      1,
      s.status,
      locationId,
      s.rack,
      s.remarks,
      s.executorArea,
      s.executedAt,
      s.legacyNo,
      s.executedAt || now,
      s.executedAt || now,
    );
    skidCount += 1;
    const arr = byCompound.get(s.compoundCode) || [];
    arr.push({ id, status: s.status, qtySisa: s.qtySisa });
    byCompound.set(s.compoundCode, arr);
  } catch (err) {
    console.warn("skip skid", s.compoundCode, s.runNo, s.skidNo, err.message);
  }
}

const dispIns = db.prepare(`
  INSERT INTO disposition (
    id, tag_no, skid_id, action_type, action_rule, target_area, date_disp, date_exp,
    originator, tag_color, status, remarks, created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const placeholderIns = db.prepare(`
  INSERT INTO skid (
    id, compound_code, run_no, skid_no, ticket_type, netto, qty_sisa, status, location_id,
    remarks, created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);

const usedTags = new Set();
let dispCount = 0;
for (const d of seed.dispositions) {
  let tag = String(d.tagNo);
  if (usedTags.has(tag)) tag = `${tag}-${dispCount + 1}`;
  usedTags.add(tag);

  const candidates = byCompound.get(d.compoundCode) || [];
  let skid = candidates.find((c) => ["DISPOSED", "UNDER_REVIEW", "RESTACKING", "IN_EXECUTION"].includes(c.status));
  if (!skid) skid = candidates[0];
  if (!skid) {
    const id = nid("sk");
    const locationId = locId(d.locationCode, d.locationName);
    placeholderIns.run(
      id,
      d.compoundCode,
      `D${tag}`,
      "1",
      "PRODUCTIVE",
      0,
      0,
      d.status === "DONE" ? "CONSUMED" : "DISPOSED",
      locationId,
      d.asActionText,
      d.dateDisp || now,
      d.dateDisp || now,
    );
    skid = { id, status: "DISPOSED" };
    const arr = byCompound.get(d.compoundCode) || [];
    arr.push(skid);
    byCompound.set(d.compoundCode, arr);
  }

  try {
    dispIns.run(
      nid("dp"),
      tag,
      skid.id,
      d.actionType,
      d.asActionText,
      d.targetArea,
      d.dateDisp || now,
      d.dateExec || null,
      "Migrasi Excel",
      "WHITE",
      d.status,
      d.locationName,
      d.dateDisp || now,
    );
    dispCount += 1;
  } catch (err) {
    console.warn("skip disp", tag, err.message);
  }
}

console.log(`Seeded ${skidCount} skids, ${dispCount} dispositions -> ${dbPath}`);
db.close();
