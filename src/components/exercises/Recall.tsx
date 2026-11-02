"use client";
import { useState } from "react";
import type { z } from "zod";
import type { recallExercise } from "@/lib/content/schema";
import { Markdown } from "../Markdown";
import { Button } from "../ui";
import { Checklist, inputClass, useToggleSet, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof recallExercise>;

/** Free recall → reveal model answer → self-check against rubric. Writing first is the point. */
export function Recall({ ex, onGraded }: ExerciseProps<Ex>) {
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"write" | "check" | "done">("write");
  const [checked, toggle] = useToggleSet();

  return (
    <div>
      <textarea
        className={`${inputClass} min-h-36 resize-y`}
        placeholder="Antwort in eigenen Worten formulieren – erst schreiben, dann vergleichen."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={phase !== "write"}
      />
      {phase === "write" && (
        <Button className="mt-3" onClick={() => setPhase("check")}>
          {answer.trim() ? "Mit Musterlösung vergleichen" : "Ich weiß es nicht – Lösung zeigen"}
        </Button>
      )}
      {phase !== "write" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Musterlösung</div>
            <Markdown compact>{ex.modelAnswer}</Markdown>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Was davon hattest du? (ehrlich abhaken)</div>
            <Checklist items={ex.rubric} checked={checked} onToggle={toggle} disabled={phase === "done"} />
          </div>
          {phase === "check" && (
            <Button
              onClick={() => {
                setPhase("done");
                onGraded(answer.trim() ? checked.size / ex.rubric.length : 0);
              }}
            >
              Bewertung abschließen ({checked.size}/{ex.rubric.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
