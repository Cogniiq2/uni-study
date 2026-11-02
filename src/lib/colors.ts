/** Static class map so Tailwind can see every class at build time. */
const MAP = {
  indigo: { dot: "bg-indigo-500", bar: "bg-indigo-500", soft: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  emerald: { dot: "bg-emerald-500", bar: "bg-emerald-500", soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  amber: { dot: "bg-amber-500", bar: "bg-amber-500", soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  rose: { dot: "bg-rose-500", bar: "bg-rose-500", soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  sky: { dot: "bg-sky-500", bar: "bg-sky-500", soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  violet: { dot: "bg-violet-500", bar: "bg-violet-500", soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  teal: { dot: "bg-teal-500", bar: "bg-teal-500", soft: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  orange: { dot: "bg-orange-500", bar: "bg-orange-500", soft: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
} as const;

export function courseColor(color: string) {
  return MAP[color as keyof typeof MAP] ?? MAP.indigo;
}
