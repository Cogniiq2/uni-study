import { describe, expect, it } from "vitest";
import { averageMastery, formatInterval, isDue, itemMastery, review } from "./scheduler";

describe("scheduler", () => {
  const t0 = new Date("2026-01-01T10:00:00Z");
  it("creates state on first review and schedules into the future", () => {
    const s = review("c/m/x", undefined, 3, t0);
    expect(s.srs.reps).toBe(1);
    expect(new Date(s.srs.due).getTime()).toBeGreaterThan(t0.getTime());
    expect(isDue(s, t0)).toBe(false);
  });
  it("good answers grow mastery; again resets it", () => {
    let s = review("u", undefined, 3, t0);
    let now = t0;
    for (let i = 0; i < 6; i++) {
      now = new Date(s.srs.due);
      s = review("u", s, 3, now);
    }
    expect(itemMastery(s)).toBeGreaterThan(0.9);
    const failed = review("u", s, 1, new Date(s.srs.due));
    expect(itemMastery(failed)).toBeLessThanOrEqual(0.25);
  });
  it("averages mastery with unseen items as 0", () => {
    const m = new Map([["a", review("a", undefined, 4, t0)]]);
    expect(averageMastery(["a", "b"], m)).toBeLessThan(itemMastery(m.get("a")));
  });
  it("formats intervals", () => {
    expect(formatInterval(5 * 60000)).toBe("5 min");
    expect(formatInterval(3 * 86400000)).toBe("3 T");
  });
});
