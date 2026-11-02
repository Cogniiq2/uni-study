import type { Metadata } from "next";
import { ReviewView } from "@/components/ReviewView";
import { getCourseSummaries } from "@/lib/content/loader";

export const metadata: Metadata = { title: "Wiederholen" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ kurs?: string }> }) {
  const { kurs } = await searchParams;
  return <ReviewView key={kurs ?? "all"} courses={getCourseSummaries()} courseId={kurs} />;
}
