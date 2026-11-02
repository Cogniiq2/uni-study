import type { Metadata } from "next";
import { SettingsView } from "@/components/SettingsView";
import { getCourseSummaries } from "@/lib/content/loader";

export const metadata: Metadata = { title: "Einstellungen" };

export default function SettingsPage() {
  const c = getCourseSummaries();
  const modules = c.flatMap((x) => x.modules);
  return <SettingsView stats={{ courses: c.length, modules: modules.length, items: modules.reduce((n, m) => n + m.itemUids.length, 0) }} />;
}
