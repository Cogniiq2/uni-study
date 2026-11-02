"use client";
import { useEffect, useMemo, useState } from "react";
import type { CourseSummary } from "@/lib/content/loader";
import type { StudyItem } from "@/lib/content/schema";
import { fetchItems } from "@/lib/fetchItems";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { isDue } from "@/lib/progress/scheduler";
import { StudySession } from "./StudySession";
import { Button, ButtonLink, EmptyState, PageHeader, Panel } from "./ui";

const SESSION_SIZE = 40;

export function ReviewView({ courses, courseId }: { courses: CourseSummary[]; courseId?: string }) {
  const { states, ready } = useProgress();
  const [items, setItems] = useState<StudyItem[] | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const known = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) if (!courseId || c.id === courseId) for (const m of c.modules) for (const u of m.itemUids) set.add(u);
    return set;
  }, [courses, courseId]);

  // Snapshot the due list once when progress is ready; the session must not change underneath you.
  const [dueUids, setDueUids] = useState<string[] | null>(null);
  useEffect(() => {
    if (!ready || dueUids) return;
    const now = new Date();
    const due = [...states.values()]
      .filter((s) => known.has(s.uid) && isDue(s, now))
      .sort((a, b) => a.srs.due.localeCompare(b.srs.due)) // most overdue first
      .map((s) => s.uid);
    setDueUids(due);
  }, [ready, states, known, dueUids]);

  const course = courses.find((c) => c.id === courseId);

  const start = async () => {
    if (!dueUids) return;
    try {
      const res = await fetchItems(dueUids.slice(0, SESSION_SIZE));
      // interleave courses/modules: mixing topics improves discrimination & retention
      setItems(interleave(res.items));
      setLabels(res.labels);
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (started && items?.length) return <StudySession items={items} mode="review" labels={labels} exitHref={course ? `/kurs/${course.id}` : "/"} />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={course ? course.title : "Alle Kurse"} title="Wiederholen">
        Spaced Repetition: Jede Karte und Aufgabe kommt genau dann zurück, wenn du sie sonst vergessen würdest.
      </PageHeader>
      {!ready || dueUids === null ? (
        <Panel className="p-8 text-center text-muted">Lade Fortschritt …</Panel>
      ) : dueUids.length === 0 ? (
        <EmptyState title="Nichts fällig 🎉">
          Neue Inhalte lernst du in den Modulen. Danach erscheinen sie hier automatisch zur richtigen Zeit.
          <div className="mt-4">
            <ButtonLink href={course ? `/kurs/${course.id}` : "/"} variant="secondary">
              Zu den Kursen
            </ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <Panel className="p-8 text-center">
          <div className="text-5xl font-semibold tabular-nums">{dueUids.length}</div>
          <div className="mt-1 text-muted">fällige Elemente</div>
          <Button className="mt-6" onClick={start}>
            {dueUids.length > SESSION_SIZE ? `Erste ${SESSION_SIZE} starten` : "Starten"}
          </Button>
          {error && <p className="mt-4 text-sm text-bad">{error}</p>}
          {courses.length > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
              <a href="/wiederholen" className={!courseId ? "font-medium text-fg" : "text-muted hover:text-fg"}>Alle</a>
              {courses.map((c) => (
                <a key={c.id} href={`/wiederholen?kurs=${c.id}`} className={c.id === courseId ? "font-medium text-fg" : "text-muted hover:text-fg"}>
                  {c.shortTitle}
                </a>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/** Round-robin across modules so consecutive items come from different topics. */
function interleave(items: StudyItem[]): StudyItem[] {
  const groups = new Map<string, StudyItem[]>();
  for (const it of items) {
    const k = `${it.courseId}/${it.moduleId}`;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const lists = [...groups.values()];
  const out: StudyItem[] = [];
  for (let i = 0; out.length < items.length; i++) for (const l of lists) if (l[i]) out.push(l[i]!);
  return out;
}
