import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups, polls } from "@/db/schema";
import { getAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { groupId, question, options } = await req.json().catch(() => ({}));

  const opts = (Array.isArray(options) ? options : []).map((o: any) => String(o).trim()).filter(Boolean).slice(0, 6);
  if (typeof question !== "string" || question.trim().length < 2) {
    return NextResponse.json({ error: "اكتب سؤال الاستفتاء" }, { status: 400 });
  }
  if (opts.length < 2) return NextResponse.json({ error: "أضف خيارين على الأقل" }, { status: 400 });

  const [g] = await db.select().from(groups).where(and(eq(groups.id, Number(groupId)), eq(groups.teacherId, auth.id))).limit(1);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });

  const [p] = await db
    .insert(polls)
    .values({ teacherId: auth.id, groupId: g.id, question: question.trim(), options: opts })
    .returning();
  return NextResponse.json({ ok: true, id: p.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { pollId, action } = await req.json().catch(() => ({}));
  const [p] = await db.select().from(polls).where(and(eq(polls.id, Number(pollId)), eq(polls.teacherId, auth.id))).limit(1);
  if (!p) return NextResponse.json({ error: "الاستفتاء غير موجود" }, { status: 404 });
  if (action === "close") {
    await db.update(polls).set({ status: "closed", closedAt: new Date() }).where(eq(polls.id, p.id));
  } else if (action === "open") {
    await db.update(polls).set({ status: "open", closedAt: null }).where(eq(polls.id, p.id));
  } else {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { pollId } = await req.json().catch(() => ({}));
  const [p] = await db.select().from(polls).where(and(eq(polls.id, Number(pollId)), eq(polls.teacherId, auth.id))).limit(1);
  if (!p) return NextResponse.json({ error: "الاستفتاء غير موجود" }, { status: 404 });
  await db.delete(polls).where(eq(polls.id, p.id));
  return NextResponse.json({ ok: true });
}
