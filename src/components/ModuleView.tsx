"use client";
import clsx from "clsx";
import { BookOpen, Dumbbell, FileText, Layers, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EXERCISE_TYPE_LABELS, type Module, type StudyItem } from "@/lib/content/schema";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { averageMastery, isDue, itemMastery, type ItemState } from "@/lib/progress/scheduler";
import { Markdown } from "./Markdown";
import { StudySession, type SessionMode } from "./StudySession";
import { Badge, Button, EmptyState, Panel, ProgressBar, pct } from "./ui";

type Tab = "lernen" | "karten" | "ueben";
const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "lernen", label: "Lernen", icon: BookOpen },
  { id: "karten", label: "Karteikarten", icon: Layers },
  { id: "ueben", label: "Üben", icon: Dumbbell },
];

export interface TocEntry {
  id: string;
  text: string;
}

/** Due first, then never seen, then the rest by weakest mastery. */
function prioritize(items: StudyItem[], states: Map<string, ItemState>): StudyItem[] {
  const now = new Date();
  const rank = (it: StudyItem) => {
    const s = states.get(it.uid);
    if (s && isDue(s, now)) return 0;
    if (!s) return 1;
    return 2 + itemMastery(s);
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

export function ModuleView({
  courseTitle,
  meta,
  lesson,
  toc,
  items,
  label,
  exitHref,
}: {
  courseTitle: string;
  meta: Module;
  lesson: string;
  toc: TocEntry[];
  items: StudyItem[];
  label: string;
  exitHref: string;
}) {
  const { states } = useProgress();
  const [tab, setTab] = useState<Tab>("lernen");
  const [session, setSession] = useState<{ items: StudyItem[]; mode: SessionMode; key: number } | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab") as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);
  const switchTab = (t: Tab) => {
    setTab(t);
    const url = new URL(location.href);
    url.searchParams.set("tab", t);
    history.replaceState(null, "", url);
  };

  const cards = useMemo(() => items.filter((i) => i.kind === "card"), [items]);
  const exercises = useMemo(() => items.filter((i) => i.kind === "exercise"), [items]);
  const mastery = averageMastery(items.map((i) => i.uid), states);

  const start = (list: StudyItem[], mode: SessionMode = "learn") => {
    setSession({ items: list, mode, key: Date.now() });
    window.scrollTo({ top: 0 });
  };

  if (session) {
    return (
      <StudySession key={session.key} items={session.items} mode={session.mode} labels={{ [`${items[0]?.courseId}/${meta.id}`]: label }} exitHref={exitHref} onExit={() => setSession(null)} />
    );
  }

  return (
    <div>
      <header className="mb-6">
        <a href={exitHref} className="text-sm text-muted hover:text-fg">
          {courseTitle}
        </a>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          <span className="mr-2 text-muted tabular-nums">{meta.order}.</span>
          {meta.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{meta.summary}</p>
        <div className="mt-4 flex max-w-sm items-center gap-3">
          <ProgressBar value={mastery} />
          <span className="text-sm whitespace-nowrap text-muted tabular-nums">{pct(mastery)} beherrscht</span>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-8 border-b border-line bg-bg/90 px-4 backdrop-blur sm:top-14">
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = id === "karten" ? cards.length : id === "ueben" ? exercises.length : null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={clsx(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition",
                  tab === id ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {label}
                {count !== null && <span className="text-xs text-muted tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "lernen" && <LessonTab meta={meta} lesson={lesson} toc={toc} onNext={() => switchTab(cards.length ? "karten" : "ueben")} />}
      {tab === "karten" && <CardsTab cards={cards} states={states} onStart={(l) => start(l)} />}
      {tab === "ueben" && <PracticeTab exercises={exercises} states={states} onStart={(l) => start(l)} />}
    </div>
  );
}

function LessonTab({ meta, lesson, toc, onNext }: { meta: Module; lesson: string; toc: TocEntry[]; onNext: () => void }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0">
        {meta.learningGoals.length > 0 && (
          <Panel className="mb-8 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-accent" /> Nach diesem Modul kannst du …
            </div>
            <ul className="space-y-1.5 text-[0.95rem]">
              {meta.learningGoals.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {g}
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Markdown>{lesson}</Markdown>
        <Panel className="mt-12 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">Gelesen? Jetzt aktiv abrufen.</div>
            <div className="text-sm text-muted">Lesen allein bleibt nicht hängen – Abrufen schon.</div>
          </div>
          <Button onClick={onNext}>Weiter zum Üben</Button>
        </Panel>
        {meta.sources.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted">
            <FileText className="size-3.5" /> Quellen:
            {meta.sources.map((s) => (
              <span key={s.file + s.pages}>
                {s.file}
                {s.pages && `, S. ${s.pages}`}
              </span>
            ))}
          </div>
        )}
      </article>
      {toc.length > 1 && (
        <aside className="hidden lg:block">
          <nav className="sticky top-32 text-sm">
            <div className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Inhalt</div>
            <ul className="space-y-2 border-l border-line">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-fg hover:text-fg">
                    {t.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function CardsTab({ cards, states, onStart }: { cards: StudyItem[]; states: Map<string, ItemState>; onStart: (l: StudyItem[]) => void }) {
  if (!cards.length) return <EmptyState title="Keine Karteikarten in diesem Modul" />;
  const now = new Date();
  const due = cards.filter((c) => {
    const s = states.get(c.uid);
    return s && isDue(s, now);
  });
  const fresh = cards.filter((c) => !states.has(c.uid));
  const learned = cards.length - fresh.length;
  const pending = [...due, ...fresh];

  return (
    <Panel className="mx-auto max-w-xl p-6 sm:p-8">
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="Neu" value={fresh.length} />
        <Stat label="Fällig" value={due.length} />
        <Stat label="Gelernt" value={learned} />
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {pending.length > 0 && <Button onClick={() => onStart(prioritize(pending, states))}>{pending.length} Karten lernen</Button>}
        <Button variant={pending.length ? "secondary" : "primary"} onClick={() => onStart(prioritize(cards, states))}>
          Alle {cards.length} Karten durchgehen
        </Button>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Erst selbst antworten (laut oder im Kopf), dann aufdecken. <kbd>Leertaste</kbd> aufdecken · <kbd>1–4</kbd> bewerten
      </p>
    </Panel>
  );
}

function PracticeTab({ exercises, states, onStart }: { exercises: StudyItem[]; states: Map<string, ItemState>; onStart: (l: StudyItem[]) => void }) {
  if (!exercises.length) return <EmptyState title="Noch keine Übungsaufgaben in diesem Modul" />;
  const ordered = prioritize(exercises, states);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Sortiert nach Bedarf: fällige und neue Aufgaben zuerst.</p>
        <Button onClick={() => onStart(ordered)}>Alle {exercises.length} üben</Button>
      </div>
      <Panel className="divide-y divide-line overflow-hidden">
        {exercises.map((it) => {
          if (it.kind !== "exercise") return null;
          const ex = it.exercise;
          const s = states.get(it.uid);
          const m = itemMastery(s);
          return (
            <button key={it.uid} type="button" onClick={() => onStart([it])} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-surface-2">
              <span
                className={clsx("size-2.5 shrink-0 rounded-full", !s ? "bg-surface-2 ring-1 ring-line" : m >= 0.7 ? "bg-good" : m >= 0.3 ? "bg-warn" : "bg-bad")}
                title={s ? `${pct(m)} beherrscht` : "noch nicht bearbeitet"}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{ex.title ?? firstLine(ex.prompt)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{EXERCISE_TYPE_LABELS[ex.type]}</Badge>
                  <Badge>{"●".repeat(ex.difficulty)}{"○".repeat(3 - ex.difficulty)}</Badge>
                  {ex.examStyle && <Badge className="bg-warn/10 text-warn">Klausur</Badge>}
                  {s && isDue(s) && <Badge className="bg-accent-soft text-accent">fällig</Badge>}
                </div>
              </div>
            </button>
          );
        })}
      </Panel>
    </div>
  );
}

function firstLine(md: string) {
  return md.replace(/[#*_`>$]/g, "").split("\n").find((l) => l.trim())?.slice(0, 90) ?? "Aufgabe";
}
