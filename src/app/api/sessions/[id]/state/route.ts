import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerImages, participants, questionImages, questions, quizzes, sessions, students, submissions, groups } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { sessionLeaderboard } from "@/lib/grading";
import { IMG } from "@/lib/images";

function timeLeft(s: typeof sessions.$inferSelect): number | null {
  if (s.status !== "active" || !s.questionStartedAt || !s.timeLimitSec) return null;
  const elapsed = (Date.now() - new Date(s.questionStartedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(s.timeLimitSec - elapsed));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const forRole = req.nextUrl.searchParams.get("for") || auth.role;

  const [s] = await db.select().from(sessions).where(eq(sessions.id, Number(id))).limit(1);
  if (!s) return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, s.quizId)).limit(1);
  const [group] = await db.select().from(groups).where(eq(groups.id, s.groupId)).limit(1);
  const qs = await db.select().from(questions).where(eq(questions.quizId, s.quizId)).orderBy(asc(questions.orderIndex));
  const current = s.status === "active" && s.currentIndex >= 0 ? qs[s.currentIndex] ?? null : null;

  /* ── STUDENT VIEW ── */
  if (forRole === "student") {
    if (auth.role !== "student") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
    const [p] = await db
      .select()
      .from(participants)
      .where(and(eq(participants.sessionId, s.id), eq(participants.studentId, auth.id)))
      .limit(1);
    if (!p) return NextResponse.json({ error: "لم تنضم لهذه الجلسة" }, { status: 403 });

    const board = await sessionLeaderboard(s.id);
    const rank = board.findIndex((b) => b.studentId === auth.id) + 1;

    let mySubmission = null;
    if (current) {
      const [sub] = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.sessionId, s.id), eq(submissions.questionId, current.id), eq(submissions.studentId, auth.id)))
        .limit(1);
      if (sub) {
        const imgs = await db
          .select({ id: answerImages.id, annotatedAt: answerImages.annotatedAt })
          .from(answerImages)
          .where(eq(answerImages.submissionId, sub.id));
        mySubmission = {
          submissionId: sub.id,
          isCorrect: sub.isCorrect,
          awardedPoints: sub.awardedPoints,
          needsManual: sub.needsManual,
          graded: !sub.needsManual,
          reviewStatus: sub.reviewStatus,
          gradeReleased: sub.gradeReleased,
          feedback: sub.gradeReleased ? sub.feedback : "",
          imagesCount: imgs.length,
          imageIds: imgs.map((x) => x.id),
          annotatedImageIds: imgs.filter(x => !!x.annotatedAt).map(x => x.id),
        };
      }
    }

    let ended = null;
    if (s.status === "ended") {
      const mine = await db
        .select({
          submissionId: submissions.id,
          prompt: questions.prompt,
          points: questions.points,
          awardedPoints: submissions.awardedPoints,
          isCorrect: submissions.isCorrect,
          needsManual: submissions.needsManual,
          feedback: submissions.feedback,
          gradeReleased: submissions.gradeReleased,
          reviewStatus: submissions.reviewStatus,
          imagesCount: sql<number>`(select count(*) from ${answerImages} where ${answerImages.submissionId} = ${submissions.id})::int`,
        })
        .from(submissions)
        .innerJoin(questions, eq(questions.id, submissions.questionId))
        .where(and(eq(submissions.sessionId, s.id), eq(submissions.studentId, auth.id)))
        .orderBy(asc(questions.orderIndex));
      ended = {
        leaderboard: board.slice(0, 10).map((b, i) => ({ rank: i + 1, name: b.name, totalPoints: b.totalPoints, me: b.studentId === auth.id })),
        myResults: mine,
      };
    }

    return NextResponse.json({
      me: "student",
      session: { id: s.id, code: s.code, status: s.status, currentIndex: s.currentIndex, timeLimitSec: s.timeLimitSec },
      quizTitle: quiz?.title ?? "",
      groupName: group?.name ?? "",
      questionsCount: qs.length,
      currentQuestion: current
        ? await (async () => {
            const qImgs = await db.select({ id: questionImages.id }).from(questionImages).where(eq(questionImages.questionId, current.id)).orderBy(asc(questionImages.orderIndex));
            // تحديد ما إذا كان التلميذ أجاب على هذا السؤال — إذا أجاب نكشف الإجابة الصحيحة
            const alreadyAnswered = !!(mySubmission);
            return {
              id: current.id,
              type: current.type,
              prompt: current.prompt,
              points: current.points,
              options: current.options ?? [],
              allowImages: current.allowImages,
              maxImages: current.maxImages,
              allowExplanation: current.allowExplanation,
              promptImageIds: qImgs.map((x) => x.id),
              // الإجابة الصحيحة تُكشف فقط بعد إرسال الإجابة (للسماح للتلميذ بالتعلم)
              ...(alreadyAnswered ? {
                correctOption: current.correctOption ?? undefined,
                correctBool: current.correctBool ?? undefined,
                correctNumber: current.correctNumber ?? undefined,
                acceptedAnswers: current.acceptedAnswers ?? undefined,
              } : {}),
            };
          })().catch(() => null)
        : null,
      uploadLimits: { maxMb: IMG.maxUploadMb },
      timeLeft: timeLeft(s),
      participantsCount: board.length,
      my: { totalPoints: p.totalPoints, correctCount: p.correctCount, answeredCount: p.answeredCount, rank },
      mySubmission,
      ended,
    });
  }

  /* ── TEACHER VIEW ── */
  if (auth.role !== "teacher" || s.teacherId !== auth.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const parts = await db
    .select({
      studentId: participants.studentId,
      name: students.name,
      totalPoints: participants.totalPoints,
      correctCount: participants.correctCount,
      answeredCount: participants.answeredCount,
      joinedAt: participants.joinedAt,
    })
    .from(participants)
    .innerJoin(students, eq(students.id, participants.studentId))
    .where(eq(participants.sessionId, s.id))
    .orderBy(asc(participants.joinedAt));

  let answers: any[] = [];
  if (current) {
    answers = await db
      .select({
        submissionId: submissions.id,
        studentId: submissions.studentId,
        name: students.name,
        answerOption: submissions.answerOption,
        answerBool: submissions.answerBool,
        answerNumber: submissions.answerNumber,
        answerText: submissions.answerText,
        isCorrect: submissions.isCorrect,
        awardedPoints: submissions.awardedPoints,
        needsManual: submissions.needsManual,
        submittedAt: submissions.submittedAt,
        imagesCount: sql<number>`(select count(*) from ${answerImages} where ${answerImages.submissionId} = ${submissions.id})::int`,
      })
      .from(submissions)
      .innerJoin(students, eq(students.id, submissions.studentId))
      .where(and(eq(submissions.sessionId, s.id), eq(submissions.questionId, current.id)));
  }

  // enrich each question with its prompt image IDs
  const qsWithImages = await Promise.all(
    qs.map(async (qq) => {
      const imgs = await db.select({ id: questionImages.id }).from(questionImages).where(eq(questionImages.questionId, qq.id)).orderBy(asc(questionImages.orderIndex));
      return { ...qq, promptImageIds: imgs.map((x) => x.id) };
    })
  );

  return NextResponse.json({
    me: "teacher",
    session: { id: s.id, code: s.code, status: s.status, currentIndex: s.currentIndex, timeLimitSec: s.timeLimitSec },
    quiz: { title: quiz?.title ?? "", questions: qsWithImages },
    groupName: group?.name ?? "",
    maxScore: qs.reduce((a, q) => a + q.points, 0),
    timeLeft: timeLeft(s),
    participants: parts,
    answers,
    leaderboard: [...parts].sort((a, b) => b.totalPoints - a.totalPoints),
    pendingManualCount: answers.filter((a) => a.needsManual).length,
  });
}
