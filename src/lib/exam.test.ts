import { describe, expect, it } from "vitest";
import { pickExamItems } from "./exam";

describe("pickExamItems", () => {
  it("returns n unique items", () => {
    const c = Array.from({ length: 20 }, (_, i) => ({ uid: `u${i}`, examWeight: 2 as const, mastery: 0 }));
    const r = pickExamItems(c, 10);
    expect(r).toHaveLength(10);
    expect(new Set(r).size).toBe(10);
  });
  it("caps at pool size", () => expect(pickExamItems([{ uid: "a", examWeight: 1, mastery: 1 }], 5)).toEqual(["a"]));
  it("prefers weak core topics", () => {
    const c = [
      { uid: "weak-core", examWeight: 3 as const, mastery: 0 },
      { uid: "strong-side", examWeight: 1 as const, mastery: 1 },
    ];
    let hits = 0;
    for (let i = 0; i < 500; i++) if (pickExamItems(c, 1)[0] === "weak-core") hits++;
    expect(hits).toBeGreaterThan(450);
  });
});
