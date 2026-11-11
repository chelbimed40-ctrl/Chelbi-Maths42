import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { groups, questions, quizzes, sessions, submissions as submissionsTbl } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { sessionCode } from "@/lib/utils";
import { finalizeSession } from "@/lib/grading";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { quizId, groupId, timeLimitSec } = await req.json().catch(() => ({}));

  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, Number(quizId)), eq(quizzes.teacherId, auth.id))).limit(1);
  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  const [group] = await db.select().from(groups).where(and(eq(groups.id, Number(groupId)), eq(groups.teacherId, auth.id))).limit(1);
  if (!group) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });

  const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id)).orderBy(asc(questions.orderIndex));
  if (qs.length === 0) return NextResponse.json({ error: "أضف سؤالًا واحدًا على الأقل قبل بدء جلسة" }, { status: 400 });

  const limit = Math.max(0, Math.min(600, Number(timeLimitSec) || 60));

  // unique join code
  let code = sessionCode();
  for (let i = 0; i < 8; i++) {
    const [dup] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.code, code)).limit(1);
    if (!dup) break;
    code = sessionCode();
  }

  const [s] = await db
    .insert(sessions)
    .values({ quizId: quiz.id, groupId: group.id, teacherId: auth.id, code, status: "lobby", timeLimitSec: limit })
    .returning();
  return NextResponse.json({ ok: true, id: s.id, code: s.code });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { sessionId, action, timeLimitSec } = await req.json().catch(() => ({}));
  const [s] = await db.select().from(sessions).where(and(eq(sessions.id, Number(sessionId)), eq(sessions.teacherId, auth.id))).limit(1);
  if (!s) return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });

  const qs = await db.select().from(questions).where(eq(questions.quizId, s.quizId)).orderBy(asc(questions.orderIndex));
  const total = qs.length;
  const now = new Date();

  switch (action) {
    case "start": {
      if (s.status === "ended") return NextResponse.json({ error: "انتهت الجلسة بالفعل" }, { status: 409 });
      await db
        .update(sessions)
        .set({ status: "active", currentIndex: 0, questionStartedAt: now, startedAt: s.startedAt ?? now })
        .where(eq(sessions.id, s.id));
      break;
    }
    case "next": {
      if (s.status !== "active") return NextResponse.json({ error: "الجلسة غير نشطة" }, { status: 409 });
      const next = Math.min(total - 1, s.currentIndex + 1);
      await db.update(sessions).set({ currentIndex: next, questionStartedAt: now }).where(eq(sessions.id, s.id));
      break;
    }
    case "prev": {
      if (s.status !== "active") return NextResponse.json({ error: "الجلسة غير نشطة" }, { status: 409 });
      const prev = Math.max(0, s.currentIndex - 1);
      await db.update(sessions).set({ currentIndex: prev, questionStartedAt: now }).where(eq(sessions.id, s.id));
      break;
    }
    case "set-limit": {
      const limit = Math.max(0, Math.min(600, Number(timeLimitSec) || 0));
      await db.update(sessions).set({ timeLimitSec: limit }).where(eq(sessions.id, s.id));
      break;
    }
    case "release-grades": {
      // publish manual grades + feedback to students (idempotent)
      await db
        .update(submissionsTbl)
        .set({ gradeReleased: true })
        .where(eq(submissionsTbl.sessionId, s.id));
      break;
    }
    case "end": {
      if (s.status === "ended") return NextResponse.json({ ok: true });
      // status guard ensures finalize runs exactly once
      const updated = await db
        .update(sessions)
        .set({ status: "ended", endedAt: now })
        .where(and(eq(sessions.id, s.id), eq(sessions.status, s.status)))
        .returning();
      if (updated.length > 0) await finalizeSession(s.id);
      break;
    }
    default:
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
