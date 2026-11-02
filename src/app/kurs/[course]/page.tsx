import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseModules } from "@/components/CourseView";
import { EmptyState, PageHeader } from "@/components/ui";
import { courseColor } from "@/lib/colors";
import { getCourseSummaries } from "@/lib/content/loader";
import { examLabel } from "@/lib/dates";

type Params = Promise<{ course: string }>;

export function generateStaticParams() {
  return getCourseSummaries().map((c) => ({ course: c.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { course } = await params;
  return { title: getCourseSummaries().find((c) => c.id === course)?.title };
}

export default async function CoursePage({ params }: { params: Params }) {
  const { course: id } = await params;
  const course = getCourseSummaries().find((c) => c.id === id);
  if (!course) notFound();

  const meta = [course.examFormat, examLabel(course.examDate)].filter(Boolean).join(" · ");

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link href="/" className="inline-flex items-center gap-2 hover:text-fg">
            <span className={clsx("size-2 rounded-full", courseColor(course.color).dot)} /> Kurse
          </Link>
        }
        title={course.title}
      >
        {course.description}
        {meta && <div className="mt-2 text-sm">{meta}</div>}
      </PageHeader>
      {course.modules.length ? (
        <CourseModules course={course} />
      ) : (
        <EmptyState title="Noch keine Module">Die Inhalte dieses Kurses werden gerade aufbereitet.</EmptyState>
      )}
    </div>
  );
}
