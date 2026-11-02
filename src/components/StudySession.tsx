"use client";
/**
 * Runs a queue of study items (cards + exercises) in one of three modes:
 *  - learn:  work through module content, failed items come back once at the end
 *  - review: spaced-repetition queue, same re-queue rule
 *  - exam:   no feedback, optional timer, results + explanations at the end
 * Every answer is recorded to the scheduler.
 */
import clsx from "clsx";
import { ArrowRight, Check, Clock, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXERCISE_TYPE_LABELS, type StudyItem } from "@/lib/content/schema";
import { gradeFromScore, type Grade } from "@/lib/grading";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { ExerciseBody } from "./exercises/ExerciseView";
import { Flashcard } from "./Flashcard";
import { Markdown } from "./Markdown";
import { Badge, Button, Panel, ProgressBar } from "./ui";

export type SessionMode = "learn" | "review" | "exam";

interface Outcome {
  uid: string;
  score: number;
  grade: Grade;
}

export function StudySession({
  items,
  mode,
  labels = {},
  exitHref,
  onExit,
  timeLimitMin,
}: {
  items: StudyItem[];
  mode: SessionMode;
  /** "course/module" → human label shown above each item */
  labels?: Record<string, string>;
  exitHref: string;
  /** if set, exit buttons call this instead of navigating (inline sessions) */
  onExit?: () => void;
  timeLimitMin?: number;
}) {
  const { record, states } = useProgress();
  const [queue, setQueue] = useState<StudyItem[]>(items);
  const [pos, setPos] = useState(0);
  const [graded, setGraded] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());
  const itemStartedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  const item = queue[pos];
  const exam = mode === "exam";

  // exam timer
  useEffect(() => {
    if (!exam || !timeLimitMin || finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exam, timeLimitMin, finished]);
  const remainingMs = timeLimitMin ? timeLimitMin * 60000 - (now - startedAt.current) : Infinity;
  useEffect(() => {
    if (remainingMs <= 0 && !finished) setFinished(true);
  }, [remainingMs, finished]);

  const advance = useCallback(() => {
    setGraded(null);
    itemStartedAt.current = Date.now();
    if (pos + 1 >= queue.length) setFinished(true);
    else setPos((p) => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pos, queue.length]);

  const handleResult = useCallback(
    (score: number, explicitGrade?: Grade) => {
      if (!item) return;
      const grade = explicitGrade ?? gradeFromScore(score);
      record(item.uid, grade, { mode, score, durationMs: Date.now() - itemStartedAt.current });
      setOutcomes((o) => [...o, { uid: item.uid, score, grade }]);
      // failed items come back once at the end of the session (not in exams)
      if (!exam && grade === 1 && !requeued.has(item.uid)) {
        setRequeued((s) => new Set(s).add(item.uid));
        setQueue((q) => [...q, item]);
      }
      if (item.kind === "card" || exam) {
        setGraded(null);
        // let the state flush before moving on
        setTimeout(advance, 0);
      } else {
        setGraded(score);
      }
    },
    [item, record, mode, exam, requeued, advance],
  );

  // Enter = weiter after an exercise
  useEffect(() => {
    if (graded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [graded, advance]);

  if (!items.length) return null;

  if (finished || !item) {
    return <Summary items={items} outcomes={outcomes} mode={mode} exitHref={exitHref} onExit={onExit} labels={labels} durationMs={Date.now() - startedAt.current} />;
  }

  const label = labels[`${item.courseId}/${item.moduleId}`];
  const ex = item.kind === "exercise" ? item.exercise : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-0 z-10 -mx-4 mb-6 bg-bg/90 px-4 py-3 backdrop-blur sm:top-14">
        <div className="flex items-center gap-3">
          <ExitLink href={exitHref} onExit={onExit} aria-label="Sitzung beenden" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="size-5" />
          </ExitLink>
          <ProgressBar value={pos / queue.length} className="flex-1" />
          <span className="text-sm text-muted tabular-nums">
            {pos + 1}/{queue.length}
          </span>
          {exam && timeLimitMin && (
            <span className={clsx("flex items-center gap-1 text-sm tabular-nums", remainingMs < 60000 ? "text-bad" : "text-muted")}>
              <Clock className="size-4" />
              {fmtClock(remainingMs)}
            </span>
          )}
        </div>
      </div>

      <Panel className="p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge>{item.kind === "card" ? "Karteikarte" : EXERCISE_TYPE_LABELS[ex!.type]}</Badge>
          {ex?.examStyle && <Badge className="bg-warn/10 text-warn">Klausuraufgabe</Badge>}
          {label && <span className="truncate text-xs text-muted">{label}</span>}
        </div>

        {item.kind === "card" ? (
          <Flashcard key={`${item.uid}-${pos}`} card={item.card} state={states.get(item.uid)} onRate={(g) => handleResult(g >= 3 ? 1 : g === 2 ? 0.6 : 0, g)} />
        ) : (
          <div key={`${item.uid}-${pos}`}>
            {ex!.title && <h2 className="mb-3 text-xl font-semibold tracking-tight">{ex!.title}</h2>}
            <Markdown className="mb-6">{ex!.prompt}</Markdown>
            <ExerciseBody ex={ex!} exam={exam} onGraded={(s) => handleResult(s)} />
            {graded !== null && (
              <div className="mt-8 border-t border-line pt-6">
                <div className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Erklärung</div>
                <Markdown compact>{ex!.explanation}</Markdown>
                <Button className="mt-6 w-full sm:w-auto" onClick={advance}>
                  Weiter <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ExitLink({ href, onExit, children, ...rest }: { href: string; onExit?: () => void; className?: string; "aria-label"?: string; children: React.ReactNode }) {
  if (onExit)
    return (
      <button type="button" onClick={onExit} {...rest}>
        {children}
      </button>
    );
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Summary({
  items,
  outcomes,
  mode,
  exitHref,
  onExit,
  labels,
  durationMs,
}: {
  items: StudyItem[];
  outcomes: Outcome[];
  mode: SessionMode;
  exitHref: string;
  onExit?: () => void;
  labels: Record<string, string>;
  durationMs: number;
}) {
  // first attempt per item counts
  const first = useMemo(() => {
    const m = new Map<string, Outcome>();
    for (const o of outcomes) if (!m.has(o.uid)) m.set(o.uid, o);
    return m;
  }, [outcomes]);
  const answered = [...first.values()];
  const total = mode === "exam" ? items.length : answered.length;
  const points = answered.reduce((s, o) => s + o.score, 0);
  const ratio = total ? points / total : 0;
  const wrong = items.filter((i) => (first.get(i.uid)?.score ?? 0) < 0.9);

  return (
    <div className="mx-auto max-w-3xl">
      <Panel className="p-6 text-center sm:p-10">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-good/10 text-good">
          <Check className="size-7" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{mode === "exam" ? "Prüfung abgeschlossen" : "Sitzung abgeschlossen"}</h2>
        <p className="mt-2 text-muted">
          {Math.round(ratio * 100)} % · {answered.length} bearbeitet · {Math.round(durationMs / 60000)} min
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!onExit && (
            <Button variant="secondary" onClick={() => location.reload()}>
              <RotateCcw className="size-4" /> Neue Runde
            </Button>
          )}
          <ExitLink href={exitHref} onExit={onExit} className="inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white dark:text-neutral-950">
            Fertig
          </ExitLink>
        </div>
      </Panel>

      {mode === "exam" && (
        <div className="mt-8 space-y-3">
          <h3 className="text-lg font-semibold">Auswertung</h3>
          {items.map((it) => {
            const o = first.get(it.uid);
            const ex = it.kind === "exercise" ? it.exercise : null;
            return (
              <details key={it.uid} className="group rounded-xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", !o ? "bg-surface-2 text-muted" : o.score >= 0.9 ? "bg-good/15 text-good" : o.score >= 0.5 ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad")}>
                    {o ? Math.round(o.score * 100) : "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{ex?.title ?? (it.kind === "card" ? "Karteikarte" : EXERCISE_TYPE_LABELS[ex!.type])}</span>
                  <span className="hidden text-xs text-muted sm:inline">{labels[`${it.courseId}/${it.moduleId}`]}</span>
                </summary>
                {ex && (
                  <div className="space-y-4 border-t border-line p-4">
                    <Markdown compact>{ex.prompt}</Markdown>
                    <div className="rounded-xl bg-surface-2 p-4">
                      <div className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Lösung & Erklärung</div>
                      <Markdown compact>{ex.explanation}</Markdown>
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      )}

      {mode !== "exam" && wrong.length > 0 && (
        <p className="mt-6 text-center text-sm text-muted">
          {wrong.length} {wrong.length === 1 ? "Element kommt" : "Elemente kommen"} bald in der Wiederholung zurück.
        </p>
      )}
    </div>
  );
}
