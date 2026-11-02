"use client";
import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { shuffle } from "@/lib/grading";

export interface ExerciseProps<T> {
  ex: T;
  /** exam mode: no per-answer feedback, parent advances immediately */
  exam?: boolean;
  /** called exactly once with a score 0..1 */
  onGraded: (score: number) => void;
}

/** Shuffle after mount (avoids SSR/hydration mismatch). */
export function useShuffled<T>(items: readonly T[], enabled = true): T[] {
  const [out, setOut] = useState<T[]>(() => [...items]);
  useEffect(() => {
    if (enabled) setOut(shuffle(items));
  }, [items, enabled]);
  return out;
}

export function Feedback({ ok, partial, children }: { ok: boolean; partial?: boolean; children?: ReactNode }) {
  return (
    <div
      className={clsx(
        "mt-4 rounded-xl px-4 py-3 text-sm font-medium",
        ok ? "bg-good/10 text-good" : partial ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad",
      )}
      role="status"
    >
      {children ?? (ok ? "Richtig!" : partial ? "Teilweise richtig" : "Leider falsch")}
    </div>
  );
}

export function Checklist({
  items,
  checked,
  onToggle,
  disabled,
}: {
  items: string[];
  checked: Set<number>;
  onToggle: (i: number) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i}>
          <label className={clsx("flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm", checked.has(i) && "border-good/50 bg-good/5")}>
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--good)]" checked={checked.has(i)} onChange={() => onToggle(i)} disabled={disabled} />
            <span>{it}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function useToggleSet() {
  const [set, setSet] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setSet((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return [set, toggle, setSet] as const;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-70";
