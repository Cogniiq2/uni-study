# Content Guide – how lecture material becomes learning content

The quality bar: **after working through a module, the student can pass the exam questions on that topic
without opening the original slides.** Optimise for exam performance and long-term retention, not for
reproducing slides.

## 1. Folder layout

```
content/courses/<course-id>/
  course.json
  modules/
    01-<module-id>/
      module.json      required
      lesson.md        required
      cards.json       optional (but expected)
      exercises.json   optional (but expected)
```

All ids are kebab-case (`a-z0-9-`). Ids are **permanent** (progress is stored against them).

## 2. course.json

```json
{
  "id": "datenbanken",
  "title": "Datenbanksysteme",
  "shortTitle": "DB",
  "description": "Ein Satz, worum es geht.",
  "semester": "WiSe 2026/27",
  "lecturer": "Prof. Dr. …",
  "color": "indigo | emerald | amber | rose | sky | violet | teal | orange",
  "examDate": "2027-02-10",
  "examFormat": "Klausur 90 min, ohne Hilfsmittel"
}
```

Use a different colour per course.

## 3. module.json

```json
{
  "id": "normalisierung",
  "order": 4,
  "title": "Normalisierung",
  "summary": "One sentence: what this module covers and why it matters.",
  "learningGoals": ["Verb-first, testable goals: 'Funktionale Abhängigkeiten bestimmen'"],
  "examWeight": 3,
  "sources": [{ "file": "VL04_Normalisierung.pdf", "pages": "1-42" }],
  "status": "complete"
}
```

`examWeight`: 3 = core topic (appears in almost every exam / heavily emphasised), 2 = important, 1 = peripheral.
Judge from emphasis, repetition, "klausurrelevant" remarks and past exams. Use `"status": "draft"` if slides were incomplete.

## 4. lesson.md – structured explanation

Rules:
- Start with `## Überblick`: 2–4 sentences on what this is and why it matters (business context for WI).
- One `##` per subtopic (these become the table of contents). `###` for sub-sections. Never `#`.
- **Compress and restructure** the slides: no slide-by-slide transcript, no filler. Reorganise into a logical order.
- Every definition in a `> [!DEFINITION] Begriff` callout, worded exactly as the lecturer defines it (exam wording).
- Show every concept with a concrete example (`> [!BEISPIEL]`), ideally a business one.
- Comparisons and classifications → **tables**.
- Processes, models, architectures → **mermaid** diagrams (`erDiagram`, `flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`).
- Formulas in KaTeX: inline `$…$`, block `$$…$$`, important ones in `> [!FORMEL]`.
- Calculation methods: a full worked example, step by step.
- Typical mistakes → `> [!WARNUNG]`. Explicit exam hints from the lecturer → `> [!KLAUSUR]`.
- `> [!MERKE]` for the 1–3 key takeaways per section. Use sparingly.
- Allowed callouts: DEFINITION, MERKE, BEISPIEL, WARNUNG, KLAUSUR, FORMEL, INFO.
- No raw HTML (it is not rendered). Mark primary keys **bold**, foreign keys with ↑.
- Add information the slides only imply if it is needed for understanding; never invent lecture-specific claims.

## 5. cards.json – flashcards (atomic facts)

```json
[{ "id": "def-2nf", "front": "Wann ist eine Relation in **2NF**?", "back": "…", "hint": "optional" }]
```

- **8–25 cards per module**, one fact per card (minimum information principle).
- Cover: every definition, every list/classification ("Nenne die 4 …"), key distinctions ("Unterschied X vs. Y"), formulas.
- Front = a question, not a keyword. Back = short; enumerations as lists.
- id pattern: `def-…`, `vgl-…` (comparison), `liste-…`, `formel-…`.

## 6. exercises.json – practice

Every exercise has: `id`, `type`, `prompt`, `explanation` (a full worked explanation of *why*), optional
`title`, `difficulty` (1–3), `examStyle` (true if from or modelled on a past exam), `tags`, `source`.

| type | use for | specific fields |
|---|---|---|
| `mcq` | concept checks, distinguishing similar terms | `options[{text, correct, why?}]` (several correct allowed), `shuffle` |
| `recall` | "Erläutern Sie …", "Grenzen Sie ab …" (most written exam questions) | `modelAnswer`, `rubric[]` (scoring points) |
| `numeric` | any calculation (KLR, Investition, Statistik, Mathe) | `steps[{label, answer, unit?, tolerance?, solution}]` |
| `cloze` | definitions, process steps | `text` with `{{answer|alternative}}` gaps |
| `order` | phases, process steps, layers | `items[]` in **correct** order |
| `match` | term ↔ definition, example ↔ category | `pairs[{left, right}]` |
| `sql` | SQL queries (SQLite dialect) | `setupSql`, `solutionSql`, `orderMatters` |
| `modeling` | ERM, BPMN, EPK, UML, relational schema | `notation`, `referenceSolution` (mermaid + notes), `checklist[]` |

Per module, aim for **6–15 exercises**:
- a few quick checks (mcq/match/cloze, difficulty 1),
- the core at **exam level** (recall/numeric/sql/modeling, difficulty 2), with points given in the prompt like the exam ("*(6 Punkte)*"),
- 1–2 harder transfer tasks (difficulty 3).
- `recall` rubric items = what the examiner would award points for.
- `numeric`: break into the steps an exam solution has, so partial credit and guidance work. Give the exact expected value; set `tolerance` when rounding is ambiguous.
- `sql`: test data must make wrong queries produce **different** results (e.g. include a row a missing WHERE would wrongly include). The validator executes every `solutionSql`.
- Explanations teach: why the right answer is right, and the typical wrong approach.

## 7. Checklist before committing

- [ ] Whole presentation read; every exam-relevant concept appears in the lesson **and** in at least one card or exercise
- [ ] Ids are new and unique; no existing id changed
- [ ] `npm run validate && npm test && npm run build` pass
- [ ] Report to the user: what was added, unclear slides, suggested focus
