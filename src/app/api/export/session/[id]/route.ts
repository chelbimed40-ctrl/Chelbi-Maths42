import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { groups, questions, quizzes, sessions, students, submissions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { sessionLeaderboard } from "@/lib/grading";
import { toCsv, QUESTION_TYPE_LABELS } from "@/lib/utils";

/** Export a full session report (rankings + per-question breakdown) as CSV. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;

  const [s] = await db.select().from(sessions).where(eq(sessions.id, Number(id))).limit(1);
  if (!s || s.teacherId !== auth.id) return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, s.quizId)).limit(1);
  const [group] = await db.select().from(groups).where(eq(groups.id, s.groupId)).limit(1);
  const qs = await db.select().from(questions).where(eq(questions.quizId, s.quizId)).orderBy(asc(questions.orderIndex));
  const board = await sessionLeaderboard(s.id);
  const allSubs = await db.select().from(submissions).where(eq(submissions.sessionId, s.id));

  const rows: unknown[][] = [];
  rows.push(["تقرير جلسة", quiz?.title ?? "", "المجموعة", group?.name ?? "", "الكود", s.code]);
  rows.push(["الحالة", s.status, "التاريخ", s.createdAt.toISOString().slice(0, 19), "الحد الأقصى للدرجات", qs.reduce((a, q) => a + q.points, 0)]);
  rows.push([]);
  rows.push(["الترتيب", "التلميذ", "الدرجة", "إجابات صحيحة", "إجابات مرسلة"]);
  board.forEach((b, i) => rows.push([i + 1, b.name, b.totalPoints, b.correctCount, b.answeredCount]));
  rows.push([]);
  const head = ["التلميذ"];
  for (const q of qs) head.push(`س${q.orderIndex + 1} (${q.points} درجة - ${QUESTION_TYPE_LABELS[q.type] ?? q.type})`);
  rows.push(head);
  for (const b of board) {
    const line: unknown[] = [b.name];
    for (const q of qs) {
      const sub = allSubs.find((x) => x.studentId === b.studentId && x.questionId === q.id);
      line.push(sub ? `${sub.awardedPoints}${sub.needsManual ? "؟" : ""}` : "-");
    }
    rows.push(line);
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${s.code}-report.csv"`,
    },
  });
}
