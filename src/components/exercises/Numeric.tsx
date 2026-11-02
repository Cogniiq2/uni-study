"use client";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import type { numericExercise } from "@/lib/content/schema";
import { checkNumeric, parseGermanNumber } from "@/lib/grading";
import { Markdown } from "../Markdown";
import { Button } from "../ui";
import { inputClass, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof numericExercise>;

/** Guided calculation: one step at a time, each checked, with the worked solution after each step. */
export function Numeric({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const [inputs, setInputs] = useState<string[]>(() => ex.steps.map(() => ""));
  const [results, setResults] = useState<boolean[]>([]);
  const current = results.length;
  const finished = current >= ex.steps.length;

  const submit = () => {
    const step = ex.steps[current]!;
    const ok = checkNumeric(inputs[current]!, step.answer, step.tolerance);
    const next = [...results, ok];
    setResults(next);
    if (next.length === ex.steps.length) onGraded(next.filter(Boolean).length / next.length);
  };

  return (
    <div className="space-y-3">
      {ex.steps.map((step, i) => {
        if (i > current) return null;
        const done = i < current;
        const ok = results[i];
        return (
          <div key={i} className={clsx("rounded-xl border p-4", done && !exam ? (ok ? "border-good/40" : "border-bad/40") : "border-line")}>
            <div className="mb-2 flex items-start gap-2">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{i + 1}</span>
              <Markdown compact className="flex-1">{step.label}</Markdown>
            </div>
            <div className="flex items-center gap-2">
              <input
                className={clsx(inputClass, "max-w-56 font-mono tabular-nums")}
                inputMode="decimal"
                placeholder="z. B. 1234,56"
                value={inputs[i]}
                disabled={done}
                autoFocus={!done}
                onChange={(e) => setInputs((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !done && parseGermanNumber(inputs[i]!) !== null) submit();
                }}
              />
              {step.unit && <span className="text-muted">{step.unit}</span>}
              {done && !exam && (ok ? <Check className="size-5 text-good" /> : <X className="size-5 text-bad" />)}
            </div>
            {!done && (
              <Button className="mt-3" disabled={parseGermanNumber(inputs[i]!) === null} onClick={submit}>
                Schritt prüfen
              </Button>
            )}
            {done && !exam && (
              <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
                {!ok && (
                  <div className="mb-2 font-medium">
                    Richtig wäre: <span className="font-mono">{step.answer.toLocaleString("de-DE")}</span> {step.unit}
                  </div>
                )}
                <Markdown compact>{step.solution}</Markdown>
              </div>
            )}
          </div>
        );
      })}
      {finished && !exam && (
        <p className="text-sm text-muted">
          {results.filter(Boolean).length} von {results.length} Schritten richtig.
        </p>
      )}
    </div>
  );
}
