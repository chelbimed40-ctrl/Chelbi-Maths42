import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { memberships, polls, pollVotes } from "@/db/schema";
import { getAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "student") return NextResponse.json({ error: "سجّل دخولك كتلميذ أولًا" }, { status: 401 });
  const { pollId, optionIndex } = await req.json().catch(() => ({}));

  const [p] = await db.select().from(polls).where(eq(polls.id, Number(pollId))).limit(1);
  if (!p) return NextResponse.json({ error: "الاستفتاء غير موجود" }, { status: 404 });
  if (p.status !== "open") return NextResponse.json({ error: "هذا الاستفتاء مغلق" }, { status: 409 });

  const idx = Number(optionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= (p.options?.length ?? 0)) {
    return NextResponse.json({ error: "اختر إجابة صحيحة" }, { status: 400 });
  }

  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.groupId, p.groupId), eq(memberships.studentId, auth.id), eq(memberships.status, "approved")))
    .limit(1);
  if (!m) return NextResponse.json({ error: "أنت لست عضوًا مقبولًا في هذه المجموعة" }, { status: 403 });

  try {
    await db.insert(pollVotes).values({ pollId: p.id, studentId: auth.id, optionIndex: idx });
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") {
      return NextResponse.json({ error: "صوّتّ في هذا الاستفتاء بالفعل" }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
