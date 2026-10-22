/// <reference path="../types/node-sqlite.d.ts" />
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dbFile = path.join(process.cwd(), "data", "rak-merah.db");

let instance: DatabaseSync | null = null;

export function getDb() {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  instance = new DatabaseSync(dbFile);
  instance.exec(`PRAGMA journal_mode = WAL;`);
  instance.exec(`PRAGMA foreign_keys = ON;`);
  migrate(instance);
  return instance;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS location (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      zone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skid (
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
      UNIQUE (compound_code, run_no, skid_no),
      FOREIGN KEY (location_id) REFERENCES location(id)
    );

    CREATE TABLE IF NOT EXISTS disposition (
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
      created_at TEXT NOT NULL,
      FOREIGN KEY (skid_id) REFERENCES skid(id)
    );

    CREATE TABLE IF NOT EXISTS execution (
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
      note TEXT,
      FOREIGN KEY (disposition_id) REFERENCES disposition(id),
      FOREIGN KEY (skid_id) REFERENCES skid(id)
    );

    CREATE INDEX IF NOT EXISTS idx_skid_status ON skid(status);
    CREATE INDEX IF NOT EXISTS idx_skid_compound ON skid(compound_code);
    CREATE INDEX IF NOT EXISTS idx_disp_status ON disposition(status);
  `);
}

export function nowIso() {
  return new Date().toISOString();
}

export function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
