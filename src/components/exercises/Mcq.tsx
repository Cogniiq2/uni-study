"use client";
import clsx from "clsx";
import { useState } from "react";
import type { z } from "zod";
import type { mcqExercise } from "@/lib/content/schema";
import { checkChoice } from "@/lib/grading";
import { Markdown } from "../Markdown";
import { Button } from "../ui";
import { Feedback, useShuffled, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof mcqExercise>;

export function Mcq({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const indexed = ex.options.map((o, i) => ({ ...o, i }));
  const options = useShuffled(indexed, ex.shuffle);
  const multi = ex.options.filter((o) => o.correct).length > 1;
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const ok = checkChoice(sel, ex.options.map((o) => o.correct));

  const toggle = (i: number) => {
    if (done) return;
    setSel((s) => {
      if (!multi) return new Set([i]);
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted">{multi ? "Mehrere Antworten sind richtig." : "Genau eine Antwort ist richtig."}</p>
      <div className="space-y-2">
        {options.map((o) => {
          const chosen = sel.has(o.i);
          const reveal = done && !exam;
          return (
            <button
              key={o.i}
              type="button"
              onClick={() => toggle(o.i)}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition",
                !reveal && (chosen ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"),
                reveal && o.correct && "border-good bg-good/10",
                reveal && !o.correct && chosen && "border-bad bg-bad/10",
                reveal && !o.correct && !chosen && "border-line opacity-60",
              )}
            >
              <span className={clsx("mt-1 grid size-4 shrink-0 place-items-center border", multi ? "rounded" : "rounded-full", chosen ? "border-accent bg-accent" : "border-muted")} />
              <div className="min-w-0 flex-1">
                <Markdown compact>{o.text}</Markdown>
                {reveal && o.why && (chosen || o.correct) && <p className="mt-1 text-sm text-muted">{o.why}</p>}
              </div>
            </button>
          );
        })}
      </div>
      {!done ? (
        <Button
          className="mt-4"
          disabled={!sel.size}
          onClick={() => {
            setDone(true);
            onGraded(ok ? 1 : 0);
          }}
        >
          Prüfen
        </Button>
      ) : (
        !exam && <Feedback ok={ok} />
      )}
    </div>
  );
}
