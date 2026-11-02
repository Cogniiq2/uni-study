/**
 * Pure grading helpers — no React, no I/O. Unit-tested in grading.test.ts.
 */

/** Parse a number the way a German student types it: "1.234,5", "1234,5", "1234.5", "12 %", "−3". */
export function parseGermanNumber(raw: string): number | null {
  let s = raw.trim().replace(/[\s €%]/g, "").replace(/[−–]/g, "-");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma) s = s.replace(",", ".");
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function defaultTolerance(expected: number): number {
  return Math.max(Math.abs(expected) * 0.005, 0.01);
}

export function checkNumeric(input: string, expected: number, tolerance?: number): boolean {
  const n = parseGermanNumber(input);
  if (n === null) return false;
  return Math.abs(n - expected) <= (tolerance ?? defaultTolerance(expected));
}

// ---------------------------------------------------------------------------
// Cloze: "Ein {{Primärschlüssel|PK}} identifiziert …"
// ---------------------------------------------------------------------------

export type ClozeSegment = { kind: "text"; text: string } | { kind: "gap"; index: number; answers: string[] };

export function parseCloze(text: string): ClozeSegment[] {
  const out: ClozeSegment[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let index = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "gap", index: index++, answers: m[1]!.split("|").map((a) => a.trim()) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function normalizeAnswer(s: string, caseSensitive = false): string {
  const t = s.trim().replace(/\s+/g, " ").replace(/[„“”"]/g, '"');
  return caseSensitive ? t : t.toLocaleLowerCase("de-DE");
}

export function checkGap(input: string, answers: string[], caseSensitive = false): boolean {
  const n = normalizeAnswer(input, caseSensitive);
  return answers.some((a) => normalizeAnswer(a, caseSensitive) === n);
}

// ---------------------------------------------------------------------------
// Choice / order / match
// ---------------------------------------------------------------------------

export function checkChoice(selected: Set<number>, correct: boolean[]): boolean {
  return correct.every((c, i) => c === selected.has(i));
}

/** Share of positions that are correct (0..1). */
export function orderScore(given: string[], correct: string[]): number {
  if (!correct.length) return 0;
  let ok = 0;
  correct.forEach((c, i) => {
    if (given[i] === c) ok++;
  });
  return ok / correct.length;
}

// ---------------------------------------------------------------------------
// SQL result comparison
// ---------------------------------------------------------------------------

export interface ResultSet {
  columns: string[];
  values: unknown[][];
}

function normCell(v: unknown): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(6);
  if (v === null || v === undefined) return "∅";
  return String(v);
}

/** Compares result sets by values only (column names/aliases are ignored). */
export function compareResults(
  actual: ResultSet | undefined,
  expected: ResultSet | undefined,
  orderMatters: boolean,
): { ok: boolean; reason?: string } {
  const a = actual ?? { columns: [], values: [] };
  const e = expected ?? { columns: [], values: [] };
  if (a.columns.length !== e.columns.length)
    return { ok: false, reason: `Spaltenanzahl: ${a.columns.length} statt ${e.columns.length}` };
  if (a.values.length !== e.values.length)
    return { ok: false, reason: `Zeilenanzahl: ${a.values.length} statt ${e.values.length}` };
  const rows = (r: ResultSet) => r.values.map((row) => JSON.stringify(row.map(normCell)));
  const ra = rows(a);
  const re = rows(e);
  if (!orderMatters) {
    ra.sort();
    re.sort();
  }
  const ok = ra.every((r, i) => r === re[i]);
  if (ok) return { ok };
  if (orderMatters && [...ra].sort().join() === [...re].sort().join())
    return { ok: false, reason: "Richtige Zeilen, aber falsche Sortierung" };
  return { ok: false, reason: "Werte stimmen nicht überein" };
}

// ---------------------------------------------------------------------------
// Score → spaced-repetition rating
// ---------------------------------------------------------------------------

/** 1 = Nochmal, 2 = Schwer, 3 = Gut, 4 = Leicht (FSRS grades) */
export type Grade = 1 | 2 | 3 | 4;

export function gradeFromScore(score: number): Grade {
  if (score >= 0.9) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
