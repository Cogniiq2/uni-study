import { DashboardView } from "@/components/DashboardView";
import { getCourseSummaries } from "@/lib/content/loader";

export default function Home() {
  return <DashboardView courses={getCourseSummaries()} />;
}
