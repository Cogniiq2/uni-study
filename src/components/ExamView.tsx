"use client";
import clsx from "clsx";
import { useMemo, useState } from "react";
import type { CourseSummary } from "@/lib/content/loader";
import type { StudyItem } from "@/lib/content/schema";
import { courseColor } from "@/lib/colors";
import { pickExamItems } from "@/lib/exam";
import { fetchItems } from "@/lib/fetchItems";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { itemMastery } from "@/lib/progress/scheduler";
import { StudySession } from "./StudySession";
import { Button, EmptyState, PageHeader, Panel } from "./ui";

const COUNTS = [5, 10, 20, 30];
const TIMES = [0, 30, 60, 90];

export function ExamView({ courses, initialCourse }: { courses: CourseSummary[]; initialCourse?: string }) {
  const { states } = useProgress();
  const withEx = courses.filter((c) => c.modules.some((m) => m.exerciseUids.length));
  const [courseId, setCourseId] = useState(initialCourse && withEx.some((c) => c.id === initialCourse) ? initialCourse : withEx[0]?.id);
  const course = withEx.find((c) => c.id === courseId);
  const [selected, setSelected] = useState<Set<string> | null>(null); // null = all modules
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(30);
  const [session, setSession] = useState<{ items: StudyItem[]; labels: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modules = useMemo(() => course?.modules.filter((m) => m.exerciseUids.length) ?? [], [course]);
  const active = modules.filter((m) => !selected || selected.has(m.id));
  const poolSize = active.reduce((n, m) => n + m.exerciseUids.length, 0);

  if (session) return <StudySession items={session.items} mode="exam" labels={session.labels} exitHref="/pruefung" timeLimitMin={minutes || undefined} />;
  if (!course) return <EmptyState title="Noch keine Übungsaufgaben vorhanden" />;

  const start = async () => {
    const cands = active.flatMap((m) => m.exerciseUids.map((uid) => ({ uid, examWeight: m.examWeight, mastery: itemMastery(states.get(uid)) })));
    const uids = pickExamItems(cands, count);
    try {
      const res = await fetchItems(uids);
      // exams follow module order, like a real Klausur
      const order = new Map(modules.map((m, i) => [m.id, i]));
      res.items.sort((a, b) => (order.get(a.moduleId) ?? 0) - (order.get(b.moduleId) ?? 0));
      setSession(res);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selected ?? modules.map((m) => m.id));
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Prüfungssimulation">
        Gemischte Aufgaben unter Zeitdruck, ohne Feedback bis zum Ende. Schwerpunkt: Kernthemen und deine Schwachstellen.
      </PageHeader>

      <Panel className="space-y-8 p-6 sm:p-8">
        <Field label="Kurs">
          <div className="flex flex-wrap gap-2">
            {withEx.map((c) => (
              <Chip key={c.id} active={c.id === courseId} onClick={() => { setCourseId(c.id); setSelected(null); }}>
                <span className={clsx("size-2 rounded-full", courseColor(c.color).dot)} /> {c.shortTitle}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label={`Module (${active.length}/${modules.length})`}>
          <div className="space-y-1.5">
            {modules.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={!selected || selected.has(m.id)} onChange={() => toggle(m.id)} />
                <span className="flex-1 text-sm">{m.order}. {m.title}</span>
                <span className="text-xs text-muted">{m.exerciseUids.length}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid gap-8 sm:grid-cols-2">
          <Field label="Aufgaben">
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((n) => (
                <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}</Chip>
              ))}
            </div>
          </Field>
          <Field label="Zeit">
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <Chip key={t} active={minutes === t} onClick={() => setMinutes(t)}>{t ? `${t} min` : "ohne"}</Chip>
              ))}
            </div>
          </Field>
        </div>

        <div className="border-t border-line pt-6">
          <Button className="w-full" disabled={!poolSize} onClick={start}>
            Prüfung starten · {Math.min(count, poolSize)} Aufgaben
          </Button>
          {poolSize < count && poolSize > 0 && <p className="mt-2 text-center text-xs text-muted">Nur {poolSize} Aufgaben in der Auswahl verfügbar.</p>}
          {error && <p className="mt-2 text-center text-sm text-bad">{error}</p>}
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition", active ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-muted hover:text-fg")}
    >
      {children}
    </button>
  );
}
