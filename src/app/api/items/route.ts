import { NextResponse } from "next/server";
import { z } from "zod";
import { getCourses, getItemsByUid } from "@/lib/content/loader";
import { isAuthorized } from "@/lib/supabase/server";

const body = z.object({ uids: z.array(z.string().max(200)).max(1000) });

/** Resolves item bodies for review/exam sessions (keeps pages light: only due items are shipped). */
export async function POST(req: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const items = getItemsByUid(parsed.data.uids);
  const labels: Record<string, string> = {};
  for (const c of getCourses())
    for (const m of c.modules) labels[`${c.meta.id}/${m.meta.id}`] = `${c.meta.shortTitle} · ${m.meta.title}`;
  return NextResponse.json({ items, labels });
}
