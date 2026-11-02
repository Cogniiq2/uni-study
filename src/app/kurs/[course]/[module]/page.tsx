import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { slugify } from "@/lib/slug";
import { ModuleView } from "@/components/ModuleView";
import { getCourse, getCourses, moduleItems } from "@/lib/content/loader";

type Params = Promise<{ course: string; module: string }>;

export function generateStaticParams() {
  return getCourses().flatMap((c) => c.modules.map((m) => ({ course: c.meta.id, module: m.meta.id })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { course, module } = await params;
  return { title: getCourse(course)?.modules.find((m) => m.meta.id === module)?.meta.title };
}

export default async function ModulePage({ params }: { params: Params }) {
  const { course: cid, module: mid } = await params;
  const course = getCourse(cid);
  const mod = course?.modules.find((m) => m.meta.id === mid);
  if (!course || !mod) notFound();

  const toc = [...mod.lesson.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1]!.replace(/[*_`]/g, "").trim();
    return { id: slugify(text), text };
  });

  return (
    <ModuleView
      courseTitle={course.meta.title}
      meta={mod.meta}
      lesson={mod.lesson}
      toc={toc}
      items={moduleItems(mod)}
      label={`${course.meta.shortTitle} · ${mod.meta.title}`}
      exitHref={`/kurs/${course.meta.id}`}
    />
  );
}
