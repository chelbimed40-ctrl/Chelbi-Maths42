import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { getAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { title, description } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json({ error: "اكتب عنوان الاختبار" }, { status: 400 });
  }
  const [q] = await db
    .insert(quizzes)
    .values({ teacherId: auth.id, title: title.trim(), description: typeof description === "string" ? description.trim() : "" })
    .returning();
  return NextResponse.json({ ok: true, id: q.id });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { quizId } = await req.json().catch(() => ({}));
  await db.delete(quizzes).where(and(eq(quizzes.id, Number(quizId)), eq(quizzes.teacherId, auth.id)));
  return NextResponse.json({ ok: true });
}
