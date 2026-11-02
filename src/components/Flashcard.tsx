"use client";
import { useEffect, useState } from "react";
import type { Card } from "@/lib/content/schema";
import type { Grade } from "@/lib/grading";
import { previewIntervals, type ItemState } from "@/lib/progress/scheduler";
import { Markdown } from "./Markdown";
import { Button } from "./ui";

const GRADES: { g: Grade; label: string; variant: "bad" | "secondary" | "good" }[] = [
  { g: 1, label: "Nochmal", variant: "bad" },
  { g: 2, label: "Schwer", variant: "secondary" },
  { g: 3, label: "Gut", variant: "good" },
  { g: 4, label: "Leicht", variant: "secondary" },
];

/** Active recall card: think first, reveal, rate honestly. Keys: Space = reveal, 1–4 = rate. */
export function Flashcard({ card, state, onRate }: { card: Card; state?: ItemState; onRate: (g: Grade) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const intervals = previewIntervals(state);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        onRate(Number(e.key) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onRate]);

  return (
    <div>
      <div className="min-h-24">
        <Markdown>{card.front}</Markdown>
      </div>
      {!revealed && card.hint && (
        <div className="mt-2">
          {showHint ? (
            <p className="text-sm text-muted">💡 {card.hint}</p>
          ) : (
            <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setShowHint(true)}>
              Hinweis anzeigen
            </button>
          )}
        </div>
      )}
      {revealed ? (
        <>
          <div className="my-6 border-t border-dashed border-line" />
          <Markdown>{card.back}</Markdown>
          <div className="mt-8">
            <p className="mb-2 text-center text-xs text-muted">Wie gut wusstest du es?</p>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map(({ g, label, variant }) => (
                <Button key={g} variant={variant} className="flex-col gap-0 px-1 py-2" onClick={() => onRate(g)}>
                  <span>{label}</span>
                  <span className="text-[0.7rem] font-normal opacity-75">{intervals[g]}</span>
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Button className="mt-8 w-full" onClick={() => setRevealed(true)}>
          Antwort zeigen <kbd className="text-xs opacity-60">Leertaste</kbd>
        </Button>
      )}
    </div>
  );
}
