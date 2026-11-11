import { redirect } from "next/navigation";
import { desc, eq, and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships, participants, questions, quizzes, sessions, students, polls, pollVotes } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { groupLeaderboard } from "@/lib/grading";
import { StudentDashboardClient } from "@/components/student-dashboard-client";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "student") redirect("/student/login");
  const { err } = await searchParams;

  const [me] = await db.select().from(students).where(eq(students.id, auth.id)).limit(1);

  const myMemberships = await db
    .select({
      mid: memberships.id, status: memberships.status, points: memberships.cumulativePoints,
      groupId: groups.id, groupName: groups.name, grade: groups.grade,
    })
    .from(memberships)
    .innerJoin(groups, eq(groups.id, memberships.groupId))
    .where(eq(memberships.studentId, auth.id))
    .orderBy(desc(memberships.createdAt));

  const approved = myMemberships.filter((m) => m.status === "approved");
  const totalPoints = approved.reduce((a, m) => a + m.points, 0);

  const boards: Record<number, { studentId: number; name: string; cumulativePoints: number }[]> = {};
  for (const m of approved) boards[m.groupId] = (await groupLeaderboard(m.groupId)) as any;

  const history = await db
    .select({
      sessionId: sessions.id, code: sessions.code, status: sessions.status,
      title: quizzes.title, groupName: groups.name,
      pts: participants.totalPoints, correct: participants.correctCount,
    })
    .from(participants)
    .innerJoin(sessions, eq(sessions.id, participants.sessionId))
    .innerJoin(quizzes, eq(quizzes.id, sessions.quizId))
    .innerJoin(groups, eq(groups.id, sessions.groupId))
    .where(eq(participants.studentId, auth.id))
    .orderBy(desc(sessions.createdAt))
    .limit(15);

  const maxScores: Record<number, number> = {};
  for (const h of history) {
    const [ms] = await db
      .select({ max: sql<number>`coalesce(sum(${questions.points}),0)::int` })
      .from(questions)
      .where(eq(questions.quizId, sql`(select quiz_id from sessions where id = ${h.sessionId})`));
    maxScores[h.sessionId] = ms?.max ?? 0;
  }

  let myPolls: any[] = [];
  if (approved.length) {
    const rows = await db
      .select({ id: polls.id, question: polls.question, options: polls.options, status: polls.status, groupName: groups.name, createdAt: polls.createdAt })
      .from(polls)
      .innerJoin(groups, eq(groups.id, polls.groupId))
      .where(inArray(polls.groupId, approved.map((m) => m.groupId)))
      .orderBy(desc(polls.createdAt))
      .limit(6);
    const myVotes = await db.select().from(pollVotes).where(eq(pollVotes.studentId, auth.id));
    const allVotes = await db.select({ pollId: pollVotes.pollId, optionIndex: pollVotes.optionIndex }).from(pollVotes);
    myPolls = rows.map((p) => ({
      ...p,
      myVote: myVotes.find((v) => v.pollId === p.id)?.optionIndex ?? null,
      counts: p.options.map((_: string, i: number) => allVotes.filter((v) => v.pollId === p.id && v.optionIndex === i).length),
    }));
  }

  return (
    <StudentDashboardClient
      studentId={auth.id}
      studentName={me?.name ?? ""}
      err={err}
      myMemberships={myMemberships}
      totalPoints={totalPoints}
      boards={boards}
      history={history}
      maxScores={maxScores}
      myPolls={myPolls}
    />
  );
}
