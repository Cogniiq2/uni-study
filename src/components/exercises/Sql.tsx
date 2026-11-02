"use client";
import { ChevronDown, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { z } from "zod";
import type { sqlExercise } from "@/lib/content/schema";
import { compareResults, type ResultSet } from "@/lib/grading";
import { describeTables, freshDb, runQuery, type TablePreview } from "@/lib/sql";
import { ResultTable } from "../ResultTable";
import { Button } from "../ui";
import { Feedback, type ExerciseProps } from "./shared";

type Ex = z.infer<typeof sqlExercise>;

/** Score by attempts: 1st correct = 1.0, 2nd = 0.7, later = 0.5, given up = 0. */
const scoreFor = (attempts: number) => (attempts <= 1 ? 1 : attempts === 2 ? 0.7 : 0.5);

export function Sql({ ex, exam, onGraded }: ExerciseProps<Ex>) {
  const [tables, setTables] = useState<TablePreview[]>([]);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState<"solved" | "gaveup" | null>(null);
  const [expected, setExpected] = useState<ResultSet | null>(null);

  useEffect(() => {
    let alive = true;
    freshDb(ex.setupSql).then((db) => {
      if (alive) setTables(describeTables(db));
      db.close();
    });
    return () => {
      alive = false;
    };
  }, [ex.setupSql]);

  const exec = async (): Promise<ResultSet | undefined> => {
    setError(null);
    const db = await freshDb(ex.setupSql); // fresh DB every run: your query can't corrupt the data
    try {
      const r = runQuery(db, query);
      setResult(r ?? { columns: [], values: [] });
      return r;
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
      return undefined;
    } finally {
      db.close();
    }
  };

  const solutionResult = async () => {
    const db = await freshDb(ex.setupSql);
    try {
      return runQuery(db, ex.solutionSql);
    } finally {
      db.close();
    }
  };

  const check = async () => {
    const actual = await exec();
    const exp = await solutionResult();
    const v = actual ? compareResults(actual, exp, ex.orderMatters) : { ok: false, reason: "Abfrage fehlerhaft" };
    const n = attempts + 1;
    setAttempts(n);
    setVerdict(v);
    if (v.ok || exam) {
      setFinished("solved");
      setExpected(exp ?? null);
      onGraded(v.ok ? scoreFor(n) : 0);
    }
  };

  const giveUp = async () => {
    setExpected((await solutionResult()) ?? null);
    setFinished("gaveup");
    onGraded(0);
  };

  return (
    <div className="space-y-4">
      <details className="group rounded-xl border border-line" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium">
          Datenbank ({tables.length} Tabellen)
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-line p-3">
          {tables.map((t) => (
            <div key={t.name}>
              <div className="mb-1 font-mono text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted">
                  ({t.columns.map((c, i) => (
                    <span key={c.name}>
                      {i > 0 && ", "}
                      <span className={c.pk ? "underline" : ""}>{c.name}</span>
                    </span>
                  ))})
                </span>
                {t.total > t.rows.values.length && <span className="ml-2 text-xs text-muted">{t.rows.values.length} von {t.total} Zeilen</span>}
              </div>
              <ResultTable result={t.rows} />
            </div>
          ))}
        </div>
      </details>

      <div>
        <textarea
          className="min-h-36 w-full resize-y rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          spellCheck={false}
          placeholder="SELECT …"
          value={query}
          disabled={!!finished}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void exec();
            }
          }}
        />
        {!finished && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!query.trim()} onClick={() => void exec()}>
              <Play className="size-4" /> Ausführen <kbd className="hidden text-xs text-muted sm:inline">⌘↵</kbd>
            </Button>
            <Button disabled={!query.trim()} onClick={() => void check()}>Prüfen</Button>
            {!exam && attempts > 0 && (
              <Button variant="ghost" onClick={() => void giveUp()}>Lösung zeigen</Button>
            )}
          </div>
        )}
      </div>

      {error && <pre className="rounded-xl bg-bad/10 p-3 text-sm whitespace-pre-wrap text-bad">{error}</pre>}
      {result && <ResultTable result={result} caption="Dein Ergebnis" />}
      {verdict && !exam && (finished ? finished === "solved" : true) && (
        <Feedback ok={verdict.ok}>{verdict.ok ? `Richtig${attempts > 1 ? ` (Versuch ${attempts})` : ""}!` : `Noch nicht: ${verdict.reason}`}</Feedback>
      )}
      {finished && !exam && (
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wider text-muted uppercase">Musterlösung</div>
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-sm">{ex.solutionSql}</pre>
          {finished === "gaveup" && expected && <ResultTable result={expected} caption="Erwartetes Ergebnis" />}
        </div>
      )}
    </div>
  );
}
