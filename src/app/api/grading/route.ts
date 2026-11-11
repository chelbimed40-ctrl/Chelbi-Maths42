import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { gradeAudit, memberships, participants, questions, sessions, submissions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { recomputeParticipant } from "@/lib/grading";

/**
 * Teacher grading actions on a submission:
 *  - default: award points (+ feedback, status, optional release) — idempotent update.
 *  - action "resubmit": request resubmission; the submission is removed so the
 *    student may answer again while the session is still open.
 * Every score change is recorded in the audit history.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { submissionId, action } = body;

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, Number(submissionId))).limit(1);
  if (!sub) return NextResponse.json({ error: "الإجابة غير موجودة" }, { status: 404 });

  const [s] = await db.select().from(sessions).where(eq(sessions.id, sub.sessionId)).limit(1);
  if (!s || s.teacherId !== auth.id) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });

  if (action === "resubmit") {
    if (s.status === "ended") return NextResponse.json({ error: "انتهت الجلسة — لا يمكن طلب إعادة التسليم" }, { status: 409 });
    await db.delete(submissions).where(eq(submissions.id, sub.id));
    await recomputeParticipant(s.id, sub.studentId);
    return NextResponse.json({ ok: true, resubmit: true });
  }

  // التصحيح اليدوي متاح حتى بعد إنهاء الجلسة

  const pts = Number(body.awardedPoints);
  if (!Number.isFinite(pts) || pts < 0) return NextResponse.json({ error: "درجة غير صالحة" }, { status: 400 });

  const [q] = await db.select().from(questions).where(eq(questions.id, sub.questionId)).limit(1);
  if (!q) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  const clamped = Math.max(0, Math.min(q.points, pts));

  const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 500) : sub.feedback;
  const release = body.release === true;
  const reviewStatus =
    body.reviewStatus === "pending" ? "pending" : "graded";

  // audit before update
  await db.insert(gradeAudit).values({
    submissionId: sub.id,
    sessionId: s.id,
    questionId: q.id,
    studentId: sub.studentId,
    teacherId: auth.id,
    oldPoints: sub.awardedPoints,
    newPoints: clamped,
    feedback,
  });

  await db
    .update(submissions)
    .set({
      awardedPoints: clamped,
      isCorrect: clamped >= q.points ? true : clamped === 0 ? false : null,
      needsManual: false,
      feedback,
      reviewStatus,
      gradeReleased: release ? true : sub.gradeReleased,
      gradedAt: new Date(),
      gradedBy: auth.id,
    })
    .where(eq(submissions.id, sub.id));

  // Recompute participant totals
  const oldTotal = (await db.select({ t: participants.totalPoints }).from(participants).where(and(eq(participants.sessionId, s.id), eq(participants.studentId, sub.studentId))).limit(1))[0]?.t ?? 0;
  
  await recomputeParticipant(s.id, sub.studentId);
  
  // If session already ended, update cumulative membership points with the difference
  if (s.status === "ended") {
    const newTotal = (await db.select({ t: participants.totalPoints }).from(participants).where(and(eq(participants.sessionId, s.id), eq(participants.studentId, sub.studentId))).limit(1))[0]?.t ?? 0;
    const diff = newTotal - oldTotal;
    if (diff !== 0) {
      await db
        .update(memberships)
        .set({ cumulativePoints: sql`${memberships.cumulativePoints} + ${diff}` })
        .where(
          and(
            eq(memberships.groupId, s.groupId),
            eq(memberships.studentId, sub.studentId),
            eq(memberships.status, "approved")
          )
        );
    }
  }

  return NextResponse.json({ ok: true, awardedPoints: clamped, feedback, reviewStatus, gradeReleased: release ? true : sub.gradeReleased });
}
