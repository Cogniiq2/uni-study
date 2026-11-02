"use client";
import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { z } from "zod";
import type { orderExercise } from "@/lib/content/schema";
import { orderScore, shuffle } from "@/lib/grading";
import { Button } from "../ui";
import { Feedback, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof orderExercise>;

export function Order({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const [items, setItems] = useState<string[]>(ex.items);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let s = shuffle(ex.items);
    for (let i = 0; i < 5 && orderScore(s, ex.items) === 1; i++) s = shuffle(ex.items);
    setItems(s);
  }, [ex.items]);

  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const n = [...xs];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });

  const score = orderScore(items, ex.items);

  return (
    <div>
      <ol className="space-y-2">
        {items.map((it, i) => {
          const ok = it === ex.items[i];
          return (
            <li
              key={it}
              className={clsx(
                "flex items-center gap-3 rounded-xl border bg-surface p-3",
                done && !exam ? (ok ? "border-good/60 bg-good/5" : "border-bad/60 bg-bad/5") : "border-line",
              )}
            >
              <span className="w-5 text-center text-sm text-muted tabular-nums">{i + 1}</span>
              <span className="flex-1">{it}</span>
              {!done && (
                <span className="flex gap-1">
                  <button type="button" aria-label="nach oben" className="rounded-lg p-1.5 hover:bg-surface-2 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label="nach unten" className="rounded-lg p-1.5 hover:bg-surface-2 disabled:opacity-30" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
              {done && !exam && !ok && <span className="text-xs text-muted">→ Pos. {ex.items.indexOf(it) + 1}</span>}
            </li>
          );
        })}
      </ol>
      {!done ? (
        <Button className="mt-4" onClick={() => { setDone(true); onGraded(score); }}>
          Prüfen
        </Button>
      ) : (
        !exam && <Feedback ok={score === 1} partial={score >= 0.5}>{`${Math.round(score * ex.items.length)} von ${ex.items.length} an der richtigen Position`}</Feedback>
      )}
    </div>
  );
}
