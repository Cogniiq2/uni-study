import { describe, expect, it } from "vitest";
import { checkChoice, checkGap, checkNumeric, compareResults, gradeFromScore, orderScore, parseCloze, parseGermanNumber } from "./grading";

describe("parseGermanNumber", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,5", 1234.5],
    ["1234.5", 1234.5],
    [" 12 % ", 12],
    ["−3,2", -3.2],
    ["1.000 €", 1], // single dot = decimal point; document in UI that "1000" is safest
    ["abc", null],
    ["", null],
  ])("%s → %s", (raw, expected) => expect(parseGermanNumber(raw)).toBe(expected));
});

describe("checkNumeric", () => {
  it("accepts within default relative tolerance", () => {
    expect(checkNumeric("100,4", 100)).toBe(true);
    expect(checkNumeric("101", 100)).toBe(false);
  });
  it("respects explicit tolerance", () => expect(checkNumeric("0,15", 0.1, 0.05)).toBe(true));
});

describe("cloze", () => {
  it("parses gaps with alternatives", () => {
    const segs = parseCloze("Ein {{Primärschlüssel|PK}} ist {{eindeutig}}.");
    expect(segs.filter((s) => s.kind === "gap")).toEqual([
      { kind: "gap", index: 0, answers: ["Primärschlüssel", "PK"] },
      { kind: "gap", index: 1, answers: ["eindeutig"] },
    ]);
  });
  it("checks case-insensitively and trims", () => {
    expect(checkGap("  pk ", ["Primärschlüssel", "PK"])).toBe(true);
    expect(checkGap("pk", ["PK"], true)).toBe(false);
  });
});

describe("choice / order", () => {
  it("requires exact selection", () => {
    expect(checkChoice(new Set([0, 2]), [true, false, true])).toBe(true);
    expect(checkChoice(new Set([0]), [true, false, true])).toBe(false);
  });
  it("scores order by position", () => expect(orderScore(["a", "c", "b"], ["a", "b", "c"])).toBeCloseTo(1 / 3));
});

describe("compareResults", () => {
  const exp = { columns: ["a", "b"], values: [[1, "x"], [2, "y"]] };
  it("ignores order unless required", () => {
    const act = { columns: ["A", "B"], values: [[2, "y"], [1, "x"]] };
    expect(compareResults(act, exp, false).ok).toBe(true);
    expect(compareResults(act, exp, true)).toEqual({ ok: false, reason: "Richtige Zeilen, aber falsche Sortierung" });
  });
  it("reports column mismatch", () => expect(compareResults({ columns: ["a"], values: [[1]] }, exp, false).ok).toBe(false));
  it("tolerates float noise", () =>
    expect(compareResults({ columns: ["x"], values: [[0.1 + 0.2]] }, { columns: ["x"], values: [[0.3]] }, false).ok).toBe(true));
});

describe("gradeFromScore", () => {
  it("maps score bands", () => {
    expect(gradeFromScore(1)).toBe(3);
    expect(gradeFromScore(0.6)).toBe(2);
    expect(gradeFromScore(0.2)).toBe(1);
  });
});
