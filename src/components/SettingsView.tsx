"use client";
import { Cloud, HardDrive } from "lucide-react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { Button, PageHeader, Panel } from "./ui";

export function SettingsView({ stats }: { stats: { courses: number; modules: number; items: number } }) {
  const { storage, user, states, syncError, resetLocal } = useProgress();

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), states: Object.fromEntries(states) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lernfortschritt-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Einstellungen" />

      <Panel className="p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-surface-2">{storage === "cloud" ? <Cloud className="size-5" /> : <HardDrive className="size-5" />}</div>
          <div className="flex-1">
            <div className="font-medium">{storage === "cloud" ? "Cloud-Synchronisierung" : "Lokaler Modus"}</div>
            <p className="mt-1 text-sm text-muted">
              {storage === "cloud"
                ? `Angemeldet als ${user?.email ?? "…"}. Fortschritt wird geräteübergreifend gespeichert und funktioniert auch offline.`
                : "Fortschritt wird nur in diesem Browser gespeichert. Für Sync zwischen Laptop und Handy Supabase konfigurieren (siehe README)."}
            </p>
            {syncError && <p className="mt-2 text-sm text-bad">Sync-Problem: {syncError} – wird automatisch erneut versucht.</p>}
          </div>
        </div>
        {storage === "cloud" && (
          <form action="/auth/signout" method="post" className="mt-4">
            <Button type="submit" variant="secondary">Abmelden</Button>
          </form>
        )}
      </Panel>

      <Panel className="p-6">
        <div className="font-medium">Daten</div>
        <p className="mt-1 text-sm text-muted">
          {stats.courses} Kurse · {stats.modules} Module · {stats.items} Lerneinheiten · {states.size} davon mit Lernfortschritt
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>Fortschritt exportieren</Button>
          {storage === "local" && (
            <Button variant="ghost" onClick={() => confirm("Gesamten lokalen Lernfortschritt löschen?") && resetLocal()}>
              Lokalen Fortschritt löschen
            </Button>
          )}
        </div>
      </Panel>

      <Panel className="p-6 text-sm text-muted">
        <div className="mb-2 font-medium text-fg">So funktioniert das Lernen hier</div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li><b className="text-fg">Lernen:</b> Modul lesen – kurz, strukturiert, mit Beispielen.</li>
          <li><b className="text-fg">Abrufen:</b> Karteikarten und Aufgaben direkt danach – ehrlich bewerten.</li>
          <li><b className="text-fg">Wiederholen:</b> täglich die fälligen Elemente (FSRS-Algorithmus, Zielbehaltensquote 90 %).</li>
          <li><b className="text-fg">Prüfen:</b> vor der Klausur gemischte, getimte Simulationen.</li>
        </ol>
      </Panel>
    </div>
  );
}
