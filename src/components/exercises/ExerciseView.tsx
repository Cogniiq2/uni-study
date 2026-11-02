"use client";
import type { Exercise } from "@/lib/content/schema";
import { Cloze } from "./Cloze";
import { Match } from "./Match";
import { Mcq } from "./Mcq";
import { Modeling } from "./Modeling";
import { Numeric } from "./Numeric";
import { Order } from "./Order";
import { Recall } from "./Recall";
import { Sql } from "./Sql";

/** Dispatches an exercise to its engine. Adding a new type = schema + component + one case here. */
export function ExerciseBody({ ex, exam, onGraded }: { ex: Exercise; exam?: boolean; onGraded: (score: number) => void }) {
  switch (ex.type) {
    case "mcq":
      return <Mcq ex={ex} exam={exam} onGraded={onGraded} />;
    case "recall":
      return <Recall ex={ex} exam={exam} onGraded={onGraded} />;
    case "numeric":
      return <Numeric ex={ex} exam={exam} onGraded={onGraded} />;
    case "cloze":
      return <Cloze ex={ex} exam={exam} onGraded={onGraded} />;
    case "order":
      return <Order ex={ex} exam={exam} onGraded={onGraded} />;
    case "match":
      return <Match ex={ex} exam={exam} onGraded={onGraded} />;
    case "sql":
      return <Sql ex={ex} exam={exam} onGraded={onGraded} />;
    case "modeling":
      return <Modeling ex={ex} exam={exam} onGraded={onGraded} />;
    default: {
      const never: never = ex;
      return <div>Unbekannter Aufgabentyp: {JSON.stringify(never)}</div>;
    }
  }
}
