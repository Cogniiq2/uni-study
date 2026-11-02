"use client";
import clsx from "clsx";
import { useMemo, useState } from "react";
import type { z } from "zod";
import type { clozeExercise } from "@/lib/content/schema";
import { checkGap, parseCloze } from "@/lib/grading";
import { Button } from "../ui";
import { Feedback, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof clozeExercise>;

export function Cloze({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const segments = useMemo(() => parseCloze(ex.text), [ex.text]);
  const gaps = segments.filter((s) => s.kind === "gap");
  const [values, setValues] = useState<string[]>(() => gaps.map(() => ""));
  const [done, setDone] = useState(false);
  const results = gaps.map((g) => g.kind === "gap" && checkGap(values[g.index]!, g.answers, ex.caseSensitive));
  const score = results.filter(Boolean).length / gaps.length;

  return (
    <div>
      <div className="text-[1.0625rem] leading-[2.4]">
        {segments.map((s, i) =>
          s.kind === "text" ? (
            <span key={i} className="whitespace-pre-wrap">{s.text}</span>
          ) : (
            <span key={i} className="inline-flex flex-col align-baseline">
              <input
                aria-label={`Lücke ${s.index + 1}`}
                className={clsx(
                  "mx-1 inline-block rounded-md border-b-2 bg-surface-2 px-2 py-0.5 text-center outline-none focus:border-accent",
                  !done || exam ? "border-line" : results[s.index] ? "border-good text-good" : "border-bad text-bad",
                )}
                style={{ width: `${Math.max(6, Math.max(...s.answers.map((a) => a.length)) + 2)}ch` }}
                value={values[s.index]}
                disabled={done}
                onChange={(e) => setValues((v) => v.map((x, j) => (j === s.index ? e.target.value : x)))}
              />
              {done && !exam && !results[s.index] && <span className="mx-1 text-xs leading-tight text-good">{s.answers[0]}</span>}
            </span>
          ),
        )}
      </div>
      {!done ? (
        <Button
          className="mt-4"
          onClick={() => {
            setDone(true);
            onGraded(score);
          }}
        >
          Prüfen
        </Button>
      ) : (
        !exam && <Feedback ok={score === 1} partial={score > 0}>{`${results.filter(Boolean).length} von ${gaps.length} Lücken richtig`}</Feedback>
      )}
    </div>
  );
}
