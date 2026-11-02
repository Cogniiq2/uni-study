"use client";
import type { Database, SqlJsStatic } from "sql.js";
import type { ResultSet } from "./grading";

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Lazy-load SQLite (WASM, self-hosted in /public). */
export function getSql(): Promise<SqlJsStatic> {
  sqlPromise ??= import("sql.js").then((m) => m.default({ locateFile: () => "/sql-wasm.wasm" }));
  return sqlPromise;
}

export async function freshDb(setupSql: string): Promise<Database> {
  const SQL = await getSql();
  const db = new SQL.Database();
  db.exec(setupSql);
  return db;
}

/** Runs SQL and returns the LAST result set (so "CREATE …; SELECT …" works). */
export function runQuery(db: Database, sql: string): ResultSet | undefined {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, values: last.values } : undefined;
}

export interface TablePreview {
  name: string;
  columns: { name: string; type: string; pk: boolean }[];
  rows: ResultSet;
  total: number;
}

export function describeTables(db: Database, sampleRows = 8): TablePreview[] {
  const names = runQuery(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")?.values.map((r) => String(r[0])) ?? [];
  return names.map((name) => {
    const q = name.replace(/"/g, '""');
    const info = runQuery(db, `PRAGMA table_info("${q}")`);
    const columns = (info?.values ?? []).map((r) => ({ name: String(r[1]), type: String(r[2]), pk: Number(r[5]) > 0 }));
    const total = Number(runQuery(db, `SELECT COUNT(*) FROM "${q}"`)?.values[0]?.[0] ?? 0);
    const rows = runQuery(db, `SELECT * FROM "${q}" LIMIT ${sampleRows}`) ?? { columns: [], values: [] };
    return { name, columns, rows, total };
  });
}
