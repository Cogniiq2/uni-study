/** Callout blocks usable in lesson.md:  > [!DEFINITION] Titel  */
export const CALLOUT_TYPES = ["DEFINITION", "MERKE", "BEISPIEL", "WARNUNG", "KLAUSUR", "FORMEL", "INFO"] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export const CALLOUT_LABELS: Record<CalloutType, string> = {
  DEFINITION: "Definition",
  MERKE: "Merke",
  BEISPIEL: "Beispiel",
  WARNUNG: "Typischer Fehler",
  KLAUSUR: "Klausurrelevant",
  FORMEL: "Formel",
  INFO: "Hintergrund",
};
