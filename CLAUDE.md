# Studium – Wirtschaftsinformatik learning app

Personal study platform for Lazar (B.Sc. Wirtschaftsinformatik). Lecture slides are turned into
structured lessons, flashcards and exercises; progress is scheduled with FSRS spaced repetition.

**Language:** all content and UI text in **German**. Code, comments, commit messages in English.

## Architecture (read before changing code)

- `content/` – all learning content as validated files. **Content is data, not code.**
- `src/lib/content/schema.ts` – Zod schema = the contract. Every item type is defined here.
- `src/lib/content/loader.ts` – reads + validates content (server only).
- `src/lib/progress/` – FSRS scheduler + offline-first `ProgressProvider` (localStorage ⇄ Supabase).
- `src/components/exercises/` – one engine per exercise type, dispatched in `ExerciseView.tsx`.
- `src/proxy.ts` – auth gate. Lecture content is copyrighted → the app must never be public.
- `supabase/migrations/` – progress tables with RLS. Content never goes into the DB.

Adding an exercise type = schema variant + engine component + case in `ExerciseView.tsx` + label.

## Commands

```bash
npm run validate   # schema + id + SQL-solution checks for all content (runs before build)
npm test           # unit tests (grading, scheduler, exam selection)
npm run build      # validate + production build
npm run dev
```

## Processing lecture material (the main recurring task)

Follow `docs/CONTENT_GUIDE.md` exactly. Summary:

1. Read the **entire** presentation before writing anything. Raw PDFs go in `inbox/` (gitignored, never committed).
2. Map it to a course (`content/courses/<course-id>/`) and split into modules: one coherent topic each,
   usually one lecture ≈ one module. Folder `NN-<module-id>`, `order` = NN.
3. Write `module.json`, `lesson.md`, `cards.json`, `exercises.json` per the guide's quality bar.
4. **Never rename or delete an existing item/module/course id** — progress is keyed by `course/module/item`.
   To replace an item, add a new id and remove the old one deliberately (tell the user).
5. `npm run validate && npm test && npm run build` must pass before committing.
6. Commit per course/module: `content(<course-id>): add NN <module title>`.
7. Report to the user: modules added, item counts, gaps/unclear slides, and which topics look most exam-relevant.

Past exams (Altklausuren) and exercise sheets are the best source for exercises → mark those `"examStyle": true`.
