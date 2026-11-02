export function daysUntil(isoDate: string, now = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function examLabel(isoDate?: string): string | null {
  if (!isoDate) return null;
  const d = daysUntil(isoDate);
  if (d < 0) return "Klausur vorbei";
  if (d === 0) return "Klausur heute";
  if (d === 1) return "Klausur morgen";
  return `Klausur in ${d} Tagen`;
}
