import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { participants, questions, sessions, submissions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { gradeAnswer, recomputeParticipant } from "@/lib/grading";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "student") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = Number(body.sessionId);
  const questionId = Number(body.questionId);

  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!s) return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  if (s.status !== "active") return NextResponse.json({ error: "الجلسة غير نشطة الآن" }, { status: 409 });

  const qs = await db.select().from(questions).where(eq(questions.quizId, s.quizId)).orderBy(asc(questions.orderIndex));
  const current = qs[s.currentIndex] ?? null;
  if (!current || current.id !== questionId) {
    return NextResponse.json({ error: "هذا السؤال لم يعد معروضًا — تابع السؤال الحالي" }, { status: 409 });
  }

  // time limit enforcement
  if (s.timeLimitSec > 0 && s.questionStartedAt) {
    const elapsed = (Date.now() - new Date(s.questionStartedAt).getTime()) / 1000;
    if (elapsed > s.timeLimitSec) {
      return NextResponse.json({ error: "انتهى وقت هذا السؤال" }, { status: 409 });
    }
  }

  const [p] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.sessionId, s.id), eq(participants.studentId, auth.id)))
    .limit(1);
  if (!p) return NextResponse.json({ error: "لم تنضم لهذه الجلسة" }, { status: 403 });

  // duplicate prevention (pre-check + unique index as the real guarantee)
  const [dup] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.sessionId, s.id), eq(submissions.questionId, current.id), eq(submissions.studentId, auth.id)))
    .limit(1);
  if (dup) return NextResponse.json({ error: "أرسلت إجابتك لهذا السؤال بالفعل", duplicate: true }, { status: 409 });

  const answer = {
    answerOption: typeof body.answerOption === "number" ? body.answerOption : null,
    answerBool: typeof body.answerBool === "boolean" ? body.answerBool : null,
    answerNumber: typeof body.answerNumber === "string" ? body.answerNumber : null,
    answerText: typeof body.answerText === "string" ? body.answerText : null,
  };
  const empty =
    answer.answerOption === null && answer.answerBool === null && !answer.answerNumber?.trim() && !answer.answerText?.trim();
  // Image-only submissions are allowed when the teacher enabled image support:
  // the row anchors the uploaded photos that follow.
  if (empty && !current.allowImages) return NextResponse.json({ error: "اكتب أو اختر إجابة أولًا" }, { status: 400 });

  const { needsManual, isCorrect } = gradeAnswer(current, answer);
  const awarded = isCorrect === true ? current.points : 0;

  let insertedId: number;
  try {
    const [row] = await db
      .insert(submissions)
      .values({
        sessionId: s.id,
        questionId: current.id,
        studentId: auth.id,
        ...answer,
        needsManual,
        isCorrect,
        awardedPoints: awarded,
        gradedAt: needsManual ? null : new Date(),
      })
      .returning({ id: submissions.id });
    insertedId = row.id;
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") {
      return NextResponse.json({ error: "أرسلت إجابتك لهذا السؤال بالفعل", duplicate: true }, { status: 409 });
    }
    throw e;
  }

  await recomputeParticipant(s.id, auth.id);

  return NextResponse.json({
    ok: true,
    submissionId: insertedId,
    graded: !needsManual,
    isCorrect,
    awardedPoints: awarded,
    needsManual,
    allowImages: current.allowImages,
    maxImages: current.maxImages,
  });
}
