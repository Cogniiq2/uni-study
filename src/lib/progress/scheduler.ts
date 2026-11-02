/**
 * Spaced repetition on top of FSRS (ts-fsrs). State is stored as plain JSON.
 */
import { createEmptyCard, fsrs, generatorParameters, State, type Card as FsrsCard, type Grade as FsrsGrade } from "ts-fsrs";
import type { Grade } from "../grading";

/** Serializable FSRS card (dates as ISO strings). */
export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface ItemState {
  uid: string;
  srs: SrsCard;
  /** last time this record changed (ISO) — used for last-write-wins sync */
  updatedAt: string;
}

/** 90% target retention, max interval 1 year (semesters are short), fuzz to spread reviews. */
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: true }));

function toFsrs(c: SrsCard): FsrsCard {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined,
    elapsed_days: 0,
  } as FsrsCard;
}

function fromFsrs(c: FsrsCard): SrsCard {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.toISOString(),
  };
}

export function review(uid: string, prev: ItemState | undefined, grade: Grade, now = new Date()): ItemState {
  const card = prev ? toFsrs(prev.srs) : createEmptyCard(now);
  const next = scheduler.next(card, now, grade as FsrsGrade);
  return { uid, srs: fromFsrs(next.card), updatedAt: now.toISOString() };
}

export function isDue(s: ItemState, now = new Date()): boolean {
  return new Date(s.srs.due).getTime() <= now.getTime();
}

/** Preview the next interval per grade, for button labels ("10 min", "3 T"). */
export function previewIntervals(prev: ItemState | undefined, now = new Date()): Record<Grade, string> {
  const card = prev ? toFsrs(prev.srs) : createEmptyCard(now);
  const p = scheduler.repeat(card, now);
  const fmt = (d: Date) => formatInterval(d.getTime() - now.getTime());
  return { 1: fmt(p[1].card.due), 2: fmt(p[2].card.due), 3: fmt(p[3].card.due), 4: fmt(p[4].card.due) };
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} T`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} Mon`;
  return `${(d / 365).toFixed(1)} J`;
}

/** Days of memory stability that count as "sicher gelernt". */
export const MASTERY_STABILITY_DAYS = 21;

/**
 * 0..1 mastery of one item: grows with FSRS stability, capped at MASTERY_STABILITY_DAYS.
 * Unseen = 0. An item that was just failed (relearning) counts at most 0.25.
 */
export function itemMastery(s: ItemState | undefined): number {
  if (!s || s.srs.reps === 0) return 0;
  const base = Math.min(1, s.srs.stability / MASTERY_STABILITY_DAYS);
  return s.srs.state === State.Relearning ? Math.min(base, 0.25) : base;
}

export function averageMastery(uids: string[], states: Map<string, ItemState>): number {
  if (!uids.length) return 0;
  return uids.reduce((sum, u) => sum + itemMastery(states.get(u)), 0) / uids.length;
}
