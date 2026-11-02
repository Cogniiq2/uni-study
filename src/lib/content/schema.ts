/**
 * Content schema — the contract between lecture material and the app.
 *
 * Every course/module/card/exercise on disk is validated against these schemas
 * (at build time via `npm run validate`, and at load time). If content is wrong,
 * the build fails instead of the UI breaking.
 *
 * IDs are permanent: learning progress is keyed by `courseId/moduleId/itemId`.
 * Never rename an ID after it has been published — add a new item instead.
 */
import { z } from "zod";

/** kebab-case slug, used for course, module and item ids */
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a kebab-case slug (a-z, 0-9, '-')");

/** Markdown string (GFM + KaTeX math + ```mermaid blocks + > [!TYPE] callouts) */
const md = z.string().min(1);

export const COURSE_COLORS = ["indigo", "emerald", "amber", "rose", "sky", "violet", "teal", "orange"] as const;

export const sourceRef = z.object({
  /** file name of the original material, e.g. "VL03_Datenbanken.pdf" */
  file: z.string().min(1),
  /** slide/page range, e.g. "12-18" */
  pages: z.string().optional(),
});
export type SourceRef = z.infer<typeof sourceRef>;

export const courseSchema = z.object({
  id: slug,
  title: z.string().min(1),
  /** short label for nav / chips, e.g. "DB" */
  shortTitle: z.string().min(1).max(12),
  description: z.string().default(""),
  semester: z.string().optional(),
  lecturer: z.string().optional(),
  color: z.enum(COURSE_COLORS),
  /** ISO date (YYYY-MM-DD) of the exam, drives the countdown */
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** e.g. "Klausur 90 min, ohne Hilfsmittel" */
  examFormat: z.string().optional(),
  /** hides demo content in production views when false */
  demo: z.boolean().default(false),
});
export type Course = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  id: slug,
  /** position inside the course (1, 2, 3 …) */
  order: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  learningGoals: z.array(z.string().min(1)).default([]),
  /** how important this is for the exam: 1 = Randthema, 2 = wichtig, 3 = Kernthema */
  examWeight: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  sources: z.array(sourceRef).default([]),
  status: z.enum(["draft", "complete"]).default("complete"),
});
export type Module = z.infer<typeof moduleSchema>;

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export const cardSchema = z.object({
  id: slug,
  front: md,
  back: md,
  /** optional nudge shown before revealing the answer */
  hint: z.string().optional(),
  tags: z.array(z.string()).default([]),
  source: sourceRef.optional(),
});
export type Card = z.infer<typeof cardSchema>;

// ---------------------------------------------------------------------------
// Exercises — discriminated union on `type`
// ---------------------------------------------------------------------------

const exerciseBase = {
  id: slug,
  title: z.string().optional(),
  /** 1 = Grundlagen, 2 = Klausurniveau, 3 = anspruchsvoll */
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  /** task text (markdown) */
  prompt: md,
  /** full worked explanation shown after answering (markdown) */
  explanation: md,
  tags: z.array(z.string()).default([]),
  /** true if taken from / modelled on a past exam (Altklausur) */
  examStyle: z.boolean().default(false),
  source: sourceRef.optional(),
};

/** Single- or multiple-choice. Multiple-choice if more than one option is correct. */
export const mcqExercise = z.object({
  ...exerciseBase,
  type: z.literal("mcq"),
  options: z
    .array(z.object({ text: md, correct: z.boolean(), why: z.string().optional() }))
    .min(2)
    .refine((o) => o.some((x) => x.correct), "at least one option must be correct"),
  shuffle: z.boolean().default(true),
});

/** Free recall: write the answer, then self-check against the rubric. */
export const recallExercise = z.object({
  ...exerciseBase,
  type: z.literal("recall"),
  modelAnswer: md,
  /** checkpoints that a full-mark answer contains */
  rubric: z.array(z.string().min(1)).min(1),
});

/** Multi-step calculation. Each step is checked numerically. */
export const numericExercise = z.object({
  ...exerciseBase,
  type: z.literal("numeric"),
  steps: z
    .array(
      z.object({
        label: md,
        answer: z.number(),
        /** absolute tolerance; default: 0.5% relative (min 0.01) */
        tolerance: z.number().nonnegative().optional(),
        unit: z.string().optional(),
        /** worked solution for this step (markdown, may contain formulas) */
        solution: md,
      }),
    )
    .min(1),
});

/** Gap text: `{{answer}}` or `{{answer|alternative}}` marks a gap. */
export const clozeExercise = z.object({
  ...exerciseBase,
  type: z.literal("cloze"),
  text: z.string().refine((t) => /\{\{[^}]+\}\}/.test(t), "text must contain at least one {{gap}}"),
  caseSensitive: z.boolean().default(false),
});

/** Bring items into the right order (process steps, phases, layers …). */
export const orderExercise = z.object({
  ...exerciseBase,
  type: z.literal("order"),
  /** items in the CORRECT order — the app shuffles them */
  items: z.array(z.string().min(1)).min(3),
});

/** Match terms to definitions. */
export const matchExercise = z.object({
  ...exerciseBase,
  type: z.literal("match"),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(3),
});

/** SQL query, auto-checked by running it against an in-browser SQLite database. */
export const sqlExercise = z.object({
  ...exerciseBase,
  type: z.literal("sql"),
  /** CREATE TABLE … + INSERT … statements (SQLite dialect) */
  setupSql: z.string().min(1),
  solutionSql: z.string().min(1),
  /** if false, row order is ignored when comparing results */
  orderMatters: z.boolean().default(false),
});

/** Modelling task (ERM, BPMN, EPK, UML …): draw on paper, then compare with reference + checklist. */
export const modelingExercise = z.object({
  ...exerciseBase,
  type: z.literal("modeling"),
  notation: z.enum(["ERM", "BPMN", "EPK", "UML-Klasse", "UML-Aktivität", "UML-Use-Case", "Relational", "Sonstige"]),
  /** reference solution — usually a ```mermaid block plus notes */
  referenceSolution: md,
  checklist: z.array(z.string().min(1)).min(1),
});

export const exerciseSchema = z.discriminatedUnion("type", [
  mcqExercise,
  recallExercise,
  numericExercise,
  clozeExercise,
  orderExercise,
  matchExercise,
  sqlExercise,
  modelingExercise,
]);
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise["type"];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  mcq: "Multiple Choice",
  recall: "Freie Antwort",
  numeric: "Rechenaufgabe",
  cloze: "Lückentext",
  order: "Reihenfolge",
  match: "Zuordnung",
  sql: "SQL",
  modeling: "Modellierung",
};

export const cardsFileSchema = z.array(cardSchema);
export const exercisesFileSchema = z.array(exerciseSchema);

// ---------------------------------------------------------------------------
// Runtime shapes (what the loader returns)
// ---------------------------------------------------------------------------

/** A learnable thing tracked by the scheduler. `uid` = "course/module/item". */
export type StudyItem =
  | { kind: "card"; uid: string; courseId: string; moduleId: string; card: Card }
  | { kind: "exercise"; uid: string; courseId: string; moduleId: string; exercise: Exercise };

/** Lightweight index entry (no bodies) — cheap to ship to the client. */
export interface ItemRef {
  uid: string;
  kind: "card" | "exercise";
  courseId: string;
  moduleId: string;
  exerciseType?: ExerciseType;
  examWeight: 1 | 2 | 3;
}

export interface LoadedModule {
  courseId: string;
  meta: Module;
  lesson: string;
  cards: Card[];
  exercises: Exercise[];
}

export interface LoadedCourse {
  meta: Course;
  modules: LoadedModule[];
}

export const makeUid = (courseId: string, moduleId: string, itemId: string) =>
  `${courseId}/${moduleId}/${itemId}`;
