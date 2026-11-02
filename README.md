# Studium

A personal learning platform for the Wirtschaftsinformatik degree. Lectures become structured lessons, flashcards and
auto-checked exercises (multiple choice, free recall, calculations, gap texts, ordering, matching, live SQL,
modelling). Everything is scheduled with **FSRS spaced repetition**, and there is an **exam simulation** mode.

## How learning works

1. **Lernen** – read the module (short, structured, with examples, diagrams and formulas).
2. **Karteikarten / Üben** – active recall right afterwards.
3. **Wiederholen** – review whatever is due each day (FSRS, 90% target retention).
4. **Prüfung** – timed, mixed simulation weighted towards core topics and weak spots.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000 – without Supabase: local mode, progress stays in the browser
```

## Production setup (sync across laptop + phone)

1. **Supabase**: create a project → SQL editor → run `supabase/migrations/0001_progress.sql`.
   Authentication → Providers → Email: **disable "Allow new users to sign up"**, then
   Authentication → Users → **Add user** (your email + password).
2. **Vercel**: import the repo, set the environment variables from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAILS`.
3. On your phone, open the URL and "Add to Home Screen" (runs like an app).

Every page sits behind login (`src/proxy.ts`), and only `ALLOWED_EMAILS` get in. Lecture material is copyrighted and must
not be public. **Keep the GitHub repo private.**

## Adding content

See `docs/CONTENT_GUIDE.md`. In short: `content/courses/<course>/modules/NN-<module>/` with `module.json`, `lesson.md`,
`cards.json` and `exercises.json`. `npm run validate` checks everything (and runs every SQL solution).
The demo course `content/courses/demo-datenbanken` can be deleted as soon as real courses exist.
