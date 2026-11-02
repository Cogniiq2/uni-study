"use client";
import clsx from "clsx";
import { ClipboardCheck, Home, Layers, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { isDue } from "@/lib/progress/scheduler";

const LINKS = [
  { href: "/", label: "Übersicht", icon: Home },
  { href: "/wiederholen", label: "Wiederholen", icon: Layers, badge: true },
  { href: "/pruefung", label: "Prüfung", icon: ClipboardCheck },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings, iconOnly: true },
];

export function Nav() {
  const path = usePathname();
  const { states, ready } = useProgress();
  const due = useMemo(() => {
    const now = new Date();
    let n = 0;
    for (const s of states.values()) if (isDue(s, now)) n++;
    return n;
  }, [states]);

  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/kurs") : path.startsWith(href));
  const Count = () => (ready && due > 0 ? <span className="rounded-full bg-accent px-1.5 py-px text-[0.68rem] font-semibold text-white tabular-nums dark:text-neutral-950">{due > 99 ? "99+" : due}</span> : null);

  return (
    <>
      <header className="sticky top-0 z-20 hidden h-14 border-b border-line bg-bg/85 backdrop-blur sm:block">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm text-white dark:text-neutral-950">W</span>
            Studium
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon, badge, iconOnly }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                  iconOnly && "ml-auto",
                  active(href) ? "bg-surface-2 font-medium text-fg" : "text-muted hover:text-fg",
                )}
              >
                {iconOnly ? <Icon className="size-4" /> : label}
                {badge && <Count />}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {LINKS.map(({ href, label, icon: Icon, badge }) => (
          <Link key={href} href={href} className={clsx("relative flex flex-col items-center gap-0.5 py-2 text-[0.68rem]", active(href) ? "text-accent" : "text-muted")}>
            <Icon className="size-5" />
            {label}
            {badge && (
              <span className="absolute top-1 left-1/2 ml-2">
                <Count />
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
