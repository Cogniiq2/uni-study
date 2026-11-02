"use client";
import type { StudyItem } from "./content/schema";

export async function fetchItems(uids: string[]): Promise<{ items: StudyItem[]; labels: Record<string, string> }> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uids }),
  });
  if (!res.ok) throw new Error(`Laden fehlgeschlagen (${res.status})`);
  return res.json();
}
