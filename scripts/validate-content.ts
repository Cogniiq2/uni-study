/**
 * Validates all content in /content. Run: `npm run validate` (also runs before every build).
 * Checks: JSON schema, ids, folder naming, uniqueness, and executes every SQL solution.
 */
import initSqlJs from "sql.js";
import { loadAllContentUnsafe, type ContentIssue } from "../src/lib/content/loader";
import { CALLOUT_TYPES } from "../src/lib/content/callouts";

async function main() {
  const { courses, issues } = loadAllContentUnsafe();
  const SQL = await initSqlJs();
  const extra: ContentIssue[] = [];

  let cards = 0;
  let exercises = 0;
  for (const c of courses) {
    for (const m of c.modules) {
      cards += m.cards.length;
      exercises += m.exercises.length;
      const where = `content/courses/${c.meta.id}/modules/${String(m.meta.order).padStart(2, "0")}-${m.meta.id}`;

      // callout markers must be known types
      for (const match of m.lesson.matchAll(/^>\s*\[!([A-Z]+)\]/gm)) {
        if (!(CALLOUT_TYPES as readonly string[]).includes(match[1]!))
          extra.push({ file: `${where}/lesson.md`, message: `unknown callout [!${match[1]}] (allowed: ${CALLOUT_TYPES.join(", ")})` });
      }

      for (const ex of m.exercises) {
        if (ex.type !== "sql") continue;
        const db = new SQL.Database();
        try {
          db.exec(ex.setupSql);
        } catch (e) {
          extra.push({ file: `${where}/exercises.json`, message: `${ex.id}: setupSql fails: ${(e as Error).message}` });
          continue;
        }
        try {
          const res = db.exec(ex.solutionSql);
          if (!res.length) extra.push({ file: `${where}/exercises.json`, message: `${ex.id}: solutionSql returns no result set` });
        } catch (e) {
          extra.push({ file: `${where}/exercises.json`, message: `${ex.id}: solutionSql fails: ${(e as Error).message}` });
        } finally {
          db.close();
        }
      }
    }
  }

  const all = [...issues, ...extra];
  if (all.length) {
    console.error(`\n✗ Content invalid — ${all.length} issue(s):\n`);
    for (const i of all) console.error(`  • ${i.file}\n      ${i.message}`);
    process.exit(1);
  }
  const modules = courses.reduce((n, c) => n + c.modules.length, 0);
  console.log(`✓ Content valid — ${courses.length} course(s), ${modules} module(s), ${cards} cards, ${exercises} exercises`);
}

main();
