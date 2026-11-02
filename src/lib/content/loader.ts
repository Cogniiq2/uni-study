/**
 * Reads and validates all course content from /content.
 *
 * Layout:
 *   content/courses/<course-id>/course.json
 *   content/courses/<course-id>/modules/<NN>-<module-id>/module.json
 *                                                       /lesson.md
 *                                                       /cards.json      (optional)
 *                                                       /exercises.json  (optional)
 *
 * Used by the Next.js server (cached per process) and by scripts/validate-content.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  cardsFileSchema,
  courseSchema,
  exercisesFileSchema,
  makeUid,
  moduleSchema,
  type ItemRef,
  type LoadedCourse,
  type LoadedModule,
  type StudyItem,
} from "./schema";

export const CONTENT_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), "content", "courses");

export interface ContentIssue {
  file: string;
  message: string;
}

export class ContentError extends Error {
  constructor(public issues: ContentIssue[]) {
    super(
      `Content validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n` +
        issues.map((i) => `  • ${i.file}: ${i.message}`).join("\n"),
    );
  }
}

function rel(p: string) {
  return path.relative(process.cwd(), p);
}

function readJson<T>(file: string, schema: z.ZodType<T>, issues: ContentIssue[]): T | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    issues.push({ file: rel(file), message: `invalid JSON: ${(e as Error).message}` });
    return undefined;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const issue of res.error.issues) {
      issues.push({ file: rel(file), message: `${issue.path.join(/*turbopackIgnore: true*/ ".") || "(root)"}: ${issue.message}` });
    }
    return undefined;
  }
  return res.data;
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

const MODULE_DIR = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function loadModule(courseId: string, dir: string, issues: ContentIssue[]): LoadedModule | undefined {
  const folder = path.basename(dir);
  const m = MODULE_DIR.exec(folder);
  if (!m) {
    issues.push({ file: rel(dir), message: `module folder must be named "NN-<module-id>" (e.g. "03-normalisierung")` });
    return undefined;
  }
  const meta = readJson(path.join(/*turbopackIgnore: true*/ dir, "module.json"), moduleSchema, issues);
  if (!meta) return undefined;
  if (meta.id !== m[2]) issues.push({ file: rel(dir), message: `module.json id "${meta.id}" ≠ folder id "${m[2]}"` });
  if (meta.order !== Number(m[1]))
    issues.push({ file: rel(dir), message: `module.json order ${meta.order} ≠ folder prefix ${m[1]}` });

  const lessonFile = path.join(/*turbopackIgnore: true*/ dir, "lesson.md");
  const lesson = fs.existsSync(lessonFile) ? fs.readFileSync(lessonFile, "utf8") : "";
  if (!lesson.trim()) issues.push({ file: rel(lessonFile), message: "lesson.md missing or empty" });

  const cardsFile = path.join(/*turbopackIgnore: true*/ dir, "cards.json");
  const exFile = path.join(/*turbopackIgnore: true*/ dir, "exercises.json");
  const cards = fs.existsSync(cardsFile) ? (readJson(cardsFile, cardsFileSchema, issues) ?? []) : [];
  const exercises = fs.existsSync(exFile) ? (readJson(exFile, exercisesFileSchema, issues) ?? []) : [];

  // item ids must be unique within a module (cards + exercises share the namespace)
  const seen = new Set<string>();
  for (const it of [...cards, ...exercises]) {
    if (seen.has(it.id)) issues.push({ file: rel(dir), message: `duplicate item id "${it.id}"` });
    seen.add(it.id);
  }

  // semantic checks that zod can't express
  for (const ex of exercises) {
    if (ex.type === "match") {
      const lefts = new Set(ex.pairs.map((p) => p.left));
      const rights = new Set(ex.pairs.map((p) => p.right));
      if (lefts.size !== ex.pairs.length || rights.size !== ex.pairs.length)
        issues.push({ file: rel(exFile), message: `${ex.id}: match pairs must be unique on both sides` });
    }
    if (ex.type === "order" && new Set(ex.items).size !== ex.items.length)
      issues.push({ file: rel(exFile), message: `${ex.id}: order items must be unique` });
  }

  return { courseId, meta, lesson, cards, exercises };
}

function loadCourse(dir: string, issues: ContentIssue[]): LoadedCourse | undefined {
  const folder = path.basename(dir);
  const meta = readJson(path.join(/*turbopackIgnore: true*/ dir, "course.json"), courseSchema, issues);
  if (!meta) return undefined;
  if (meta.id !== folder) issues.push({ file: rel(dir), message: `course.json id "${meta.id}" ≠ folder "${folder}"` });

  const modules = listDirs(path.join(/*turbopackIgnore: true*/ dir, "modules"))
    .map((name) => loadModule(meta.id, path.join(/*turbopackIgnore: true*/ dir, "modules", name), issues))
    .filter((x): x is LoadedModule => !!x)
    .sort((a, b) => a.meta.order - b.meta.order);

  const ids = new Set<string>();
  for (const mod of modules) {
    if (ids.has(mod.meta.id)) issues.push({ file: rel(dir), message: `duplicate module id "${mod.meta.id}"` });
    ids.add(mod.meta.id);
  }
  return { meta, modules };
}

/** Load everything; returns issues instead of throwing (used by the validator). */
export function loadAllContentUnsafe(root = CONTENT_ROOT): { courses: LoadedCourse[]; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const courses = listDirs(root)
    .map((name) => loadCourse(path.join(/*turbopackIgnore: true*/ root, name), issues))
    .filter((x): x is LoadedCourse => !!x);
  return { courses, issues };
}

let cache: LoadedCourse[] | undefined;

/** Load everything; throws ContentError on any issue. Cached for the server process lifetime. */
export function getCourses(): LoadedCourse[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const { courses, issues } = loadAllContentUnsafe();
  if (issues.length) throw new ContentError(issues);
  cache = courses;
  return courses;
}

export function getCourse(courseId: string): LoadedCourse | undefined {
  return getCourses().find((c) => c.meta.id === courseId);
}

export function getModule(courseId: string, moduleId: string): LoadedModule | undefined {
  return getCourse(courseId)?.modules.find((m) => m.meta.id === moduleId);
}

export function moduleItems(mod: LoadedModule): StudyItem[] {
  return [
    ...mod.cards.map(
      (card): StudyItem => ({
        kind: "card",
        uid: makeUid(mod.courseId, mod.meta.id, card.id),
        courseId: mod.courseId,
        moduleId: mod.meta.id,
        card,
      }),
    ),
    ...mod.exercises.map(
      (exercise): StudyItem => ({
        kind: "exercise",
        uid: makeUid(mod.courseId, mod.meta.id, exercise.id),
        courseId: mod.courseId,
        moduleId: mod.meta.id,
        exercise,
      }),
    ),
  ];
}

export function moduleItemRefs(mod: LoadedModule): ItemRef[] {
  return moduleItems(mod).map((it) => ({
    uid: it.uid,
    kind: it.kind,
    courseId: it.courseId,
    moduleId: it.moduleId,
    exerciseType: it.kind === "exercise" ? it.exercise.type : undefined,
    examWeight: mod.meta.examWeight,
  }));
}

/** Index of every item across all courses (ids + metadata only, no bodies). */
export function getItemIndex(): ItemRef[] {
  return getCourses().flatMap((c) => c.modules.flatMap(moduleItemRefs));
}

/** Resolve full item bodies by uid. Unknown uids are skipped (e.g. deleted content). */
export function getItemsByUid(uids: string[]): StudyItem[] {
  const wanted = new Set(uids);
  const out = new Map<string, StudyItem>();
  for (const c of getCourses())
    for (const m of c.modules) for (const it of moduleItems(m)) if (wanted.has(it.uid)) out.set(it.uid, it);
  return uids.map((u) => out.get(u)).filter((x): x is StudyItem => !!x);
}

/** Small, serialisable summary for navigation / dashboards. */
export interface CourseSummary {
  id: string;
  title: string;
  shortTitle: string;
  color: string;
  description: string;
  examDate?: string;
  examFormat?: string;
  demo: boolean;
  modules: { id: string; order: number; title: string; summary: string; examWeight: 1 | 2 | 3; status: string; itemUids: string[]; exerciseUids: string[] }[];
}

export function getCourseSummaries(): CourseSummary[] {
  return getCourses().map((c) => ({
    id: c.meta.id,
    title: c.meta.title,
    shortTitle: c.meta.shortTitle,
    color: c.meta.color,
    description: c.meta.description,
    examDate: c.meta.examDate,
    examFormat: c.meta.examFormat,
    demo: c.meta.demo,
    modules: c.modules.map((m) => ({
      id: m.meta.id,
      order: m.meta.order,
      title: m.meta.title,
      summary: m.meta.summary,
      examWeight: m.meta.examWeight,
      status: m.meta.status,
      itemUids: moduleItems(m).map((i) => i.uid),
      exerciseUids: m.exercises.map((e) => makeUid(c.meta.id, m.meta.id, e.id)),
    })),
  }));
}
