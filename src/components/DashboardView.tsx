"use client";
import clsx from "clsx";
import { ArrowRight, CalendarClock, Flame } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { CourseSummary } from "@/lib/content/loader";
import { courseColor } from "@/lib/colors";
import { daysUntil, examLabel } from "@/lib/dates";
import { localDay, useProgress } from "@/lib/progress/ProgressProvider";
import { averageMastery, isDue } from "@/lib/progress/scheduler";
import { ButtonLink, EmptyState, Panel, ProgressBar, pct } from "./ui";

export function DashboardView({ courses }: { courses: CourseSummary[] }) {
  const { states, activity, ready } = useProgress();
  const now = new Date();

  const stats = useMemo(() => {
    return courses.map((c) => {
      const uids = c.modules.flatMap((m) => m.itemUids);
      const due = uids.filter((u) => {
        const s = states.get(u);
        return s && isDue(s);
      }).length;
      const seen = uids.filter((u) => states.has(u)).length;
      return { id: c.id, uids, due, seen, mastery: averageMastery(uids, states) };
    });
  }, [courses, states]);

  const totalDue = stats.reduce((s, x) => s + x.due, 0);
  const today = activity[localDay()] ?? 0;
  const streak = useMemo(() => {
    let n = 0;
    const d = new Date();
    if (!activity[localDay(d)]) d.setDate(d.getDate() - 1); // today not done yet doesn't break the streak
    while (activity[localDay(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [activity]);

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return { key: localDay(d), n: activity[localDay(d)] ?? 0 };
  });
  const maxDay = Math.max(10, ...days.map((d) => d.n));

  const upcoming = courses
    .filter((c) => c.examDate && daysUntil(c.examDate) >= 0)
    .sort((a, b) => a.examDate!.localeCompare(b.examDate!));

  if (!courses.length) {
    return (
      <EmptyState title="Noch keine Kurse">
        Sobald die ersten Vorlesungsfolien verarbeitet sind, erscheinen deine Kurse hier.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col justify-between gap-6 p-6 lg:col-span-2">
          <div>
            <div className="text-sm text-muted">{now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {!ready ? "…" : totalDue > 0 ? `${totalDue} Wiederholungen fällig` : "Alles wiederholt"}
            </h1>
            <p className="mt-2 text-muted">
              {totalDue > 0
                ? "Erst wiederholen, dann Neues lernen – so bleibt das Gelernte bis zur Klausur."
                : "Lerne jetzt neue Inhalte in einem Modul. Sie tauchen automatisch zur richtigen Zeit wieder auf."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {totalDue > 0 && (
              <ButtonLink href="/wiederholen">
                Wiederholung starten <ArrowRight className="size-4" />
              </ButtonLink>
            )}
            <ButtonLink href="/pruefung" variant="secondary">
              Prüfung simulieren
            </ButtonLink>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">Heute</div>
              <div className="text-2xl font-semibold tabular-nums">{today}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-sm text-muted">
                <Flame className={clsx("size-4", streak > 0 && "text-orange-500")} /> Serie
              </div>
              <div className="text-2xl font-semibold tabular-nums">{streak} {streak === 1 ? "Tag" : "Tage"}</div>
            </div>
          </div>
          <div className="mt-6 flex h-16 items-end gap-[3px]" aria-label="Aktivität der letzten 28 Tage">
            {days.map((d) => (
              <div
                key={d.key}
                title={`${d.key}: ${d.n}`}
                className={clsx("flex-1 rounded-sm", d.n ? "bg-accent" : "bg-surface-2")}
                style={{ height: `${d.n ? Math.max(12, (d.n / maxDay) * 100) : 8}%`, opacity: d.n ? 0.35 + 0.65 * (d.n / maxDay) : 1 }}
              />
            ))}
          </div>
          <div className="mt-1 text-xs text-muted">Letzte 4 Wochen</div>
        </Panel>
      </div>

      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upcoming.map((c) => (
            <span key={c.id} className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm", courseColor(c.color).soft)}>
              <CalendarClock className="size-3.5" /> {c.shortTitle}: {examLabel(c.examDate)}
            </span>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Kurse</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => {
            const s = stats[i]!;
            const col = courseColor(c.color);
            return (
              <Link key={c.id} href={`/kurs/${c.id}`} className="group">
                <Panel className="flex h-full flex-col p-5 transition group-hover:border-muted/50 group-hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx("size-2.5 rounded-full", col.dot)} />
                      <span className="text-xs font-medium text-muted">{c.shortTitle}</span>
                      {c.demo && <span className="rounded bg-surface-2 px-1.5 text-[0.65rem] text-muted">Demo</span>}
                    </div>
                    {s.due > 0 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{s.due} fällig</span>}
                  </div>
                  <h3 className="mt-3 font-semibold tracking-tight text-balance">{c.title}</h3>
                  <div className="mt-1 text-sm text-muted">
                    {c.modules.length} Module · {s.uids.length} Lerneinheiten
                    {c.examDate && <> · {examLabel(c.examDate)}</>}
                  </div>
                  <div className="mt-auto pt-5">
                    <div className="mb-1.5 flex justify-between text-xs text-muted">
                      <span>Beherrschung</span>
                      <span className="tabular-nums">{pct(s.mastery)}</span>
                    </div>
                    <ProgressBar value={s.mastery} barClass={col.bar} />
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
