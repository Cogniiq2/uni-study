"use client";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CourseSummary } from "@/lib/content/loader";
import { courseColor } from "@/lib/colors";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { averageMastery, isDue } from "@/lib/progress/scheduler";
import { ButtonLink, Panel, ProgressBar, pct } from "./ui";

const WEIGHT = { 1: "Randthema", 2: "Wichtig", 3: "Kernthema" } as const;

export function CourseModules({ course }: { course: CourseSummary }) {
  const { states } = useProgress();
  const col = courseColor(course.color);
  const allUids = course.modules.flatMap((m) => m.itemUids);
  const due = allUids.filter((u) => {
    const s = states.get(u);
    return s && isDue(s);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/wiederholen?kurs=${course.id}`} variant={due ? "primary" : "secondary"}>
          {due ? `${due} fällige wiederholen` : "Nichts fällig"}
        </ButtonLink>
        <ButtonLink href={`/pruefung?kurs=${course.id}`} variant="secondary">
          Prüfung simulieren
        </ButtonLink>
      </div>

      <Panel className="divide-y divide-line overflow-hidden">
        {course.modules.map((m) => {
          const mastery = averageMastery(m.itemUids, states);
          const seen = m.itemUids.filter((u) => states.has(u)).length;
          return (
            <Link key={m.id} href={`/kurs/${course.id}/${m.id}`} className="group flex items-center gap-4 p-4 transition hover:bg-surface-2 sm:p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums group-hover:bg-surface">
                {m.order}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.title}</span>
                  {m.examWeight === 3 && <span className="rounded bg-warn/10 px-1.5 text-[0.7rem] font-medium text-warn">{WEIGHT[3]}</span>}
                  {m.status === "draft" && <span className="rounded bg-surface-2 px-1.5 text-[0.7rem] text-muted">Entwurf</span>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{m.summary}</p>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={mastery} barClass={col.bar} className="max-w-48" />
                  <span className="text-xs text-muted tabular-nums">
                    {pct(mastery)} · {seen}/{m.itemUids.length} gesehen
                  </span>
                </div>
              </div>
              <ChevronRight className={clsx("size-5 shrink-0 text-muted transition group-hover:translate-x-0.5")} />
            </Link>
          );
        })}
      </Panel>
    </div>
  );
}
