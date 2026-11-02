"use client";
import clsx from "clsx";
import { useState } from "react";
import type { z } from "zod";
import type { matchExercise } from "@/lib/content/schema";
import { Button } from "../ui";
import { Feedback, inputClass, useShuffled, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof matchExercise>;

export function Match({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const lefts = useShuffled(ex.pairs);
  const rights = useShuffled(ex.pairs.map((p) => p.right));
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const correct = ex.pairs.filter((p) => choice[p.left] === p.right).length;
  const score = correct / ex.pairs.length;
  const used = new Set(Object.values(choice));

  return (
    <div>
      <div className="space-y-3">
        {lefts.map((p) => {
          const ok = choice[p.left] === p.right;
          return (
            <div key={p.left} className={clsx("grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center", done && !exam ? (ok ? "border-good/60" : "border-bad/60") : "border-line")}>
              <div className="font-medium">{p.left}</div>
              <div>
                <select
                  className={clsx(inputClass, "py-2 text-sm")}
                  value={choice[p.left] ?? ""}
                  disabled={done}
                  onChange={(e) => setChoice((c) => ({ ...c, [p.left]: e.target.value }))}
                >
                  <option value="">– auswählen –</option>
                  {rights.map((r) => (
                    <option key={r} value={r}>
                      {used.has(r) && choice[p.left] !== r ? "✓ " : ""}
                      {r}
                    </option>
                  ))}
                </select>
                {done && !exam && !ok && <div className="mt-1 text-sm text-good">{p.right}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {!done ? (
        <Button className="mt-4" disabled={Object.keys(choice).length < ex.pairs.length} onClick={() => { setDone(true); onGraded(score); }}>
          Prüfen
        </Button>
      ) : (
        !exam && <Feedback ok={score === 1} partial={score >= 0.5}>{`${correct} von ${ex.pairs.length} Zuordnungen richtig`}</Feedback>
      )}
    </div>
  );
}
