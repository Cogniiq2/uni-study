"use client";
import { useState } from "react";
import type { z } from "zod";
import type { modelingExercise } from "@/lib/content/schema";
import { Markdown } from "../Markdown";
import { Badge, Button } from "../ui";
import { Checklist, useToggleSet, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof modelingExercise>;

/** Modelling: draw on paper/tablet, then compare with the reference and self-check. */
export function Modeling({ ex, onGraded }: ExerciseProps<Ex>) {
  const [phase, setPhase] = useState<"draw" | "check" | "done">("draw");
  const [checked, toggle] = useToggleSet();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        <Badge>{ex.notation}</Badge>
        Modelliere deine Lösung auf Papier oder Tablet – vollständig, wie in der Klausur. Erst danach vergleichen.
      </div>
      {phase === "draw" && (
        <Button className="mt-3" onClick={() => setPhase("check")}>
          Fertig – Referenzlösung zeigen
        </Button>
      )}
      {phase !== "draw" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Referenzlösung</div>
            <Markdown compact>{ex.referenceSolution}</Markdown>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Prüfe dein Modell:</div>
            <Checklist items={ex.checklist} checked={checked} onToggle={toggle} disabled={phase === "done"} />
          </div>
          {phase === "check" && (
            <Button
              onClick={() => {
                setPhase("done");
                onGraded(checked.size / ex.checklist.length);
              }}
            >
              Bewertung abschließen ({checked.size}/{ex.checklist.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
