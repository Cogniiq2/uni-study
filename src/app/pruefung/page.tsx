import type { Metadata } from "next";
import { ExamView } from "@/components/ExamView";
import { getCourseSummaries } from "@/lib/content/loader";

export const metadata: Metadata = { title: "Prüfung" };

export default async function ExamPage({ searchParams }: { searchParams: Promise<{ kurs?: string }> }) {
  const { kurs } = await searchParams;
  return <ExamView courses={getCourseSummaries()} initialCourse={kurs} />;
}
