import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships, participants, questions, quizzes, sessions, teachers } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherDashboardClient } from "@/components/teacher-dashboard-client";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");

  const [me] = await db.select().from(teachers).where(eq(teachers.id, auth.id)).limit(1);

  const myGroups = await db.select({ id: groups.id, name: groups.name, grade: groups.grade })
    .from(groups).where(eq(groups.teacherId, auth.id)).orderBy(desc(groups.createdAt));

  const members = await db.select({ groupId: memberships.groupId, status: memberships.status }).from(memberships);

  const myQuizzes = await db.select({ id: quizzes.id, title: quizzes.title, description: quizzes.description })
    .from(quizzes).where(eq(quizzes.teacherId, auth.id)).orderBy(desc(quizzes.createdAt));

  const qAgg = await db
    .select({ quizId: questions.quizId, count: sql<number>`count(*)::int`, max: sql<number>`coalesce(sum(${questions.points}),0)::int` })
    .from(questions).groupBy(questions.quizId);

  const rawSessions = await db
    .select({ id: sessions.id, code: sessions.code, status: sessions.status, createdAt: sessions.createdAt, quizTitle: quizzes.title, groupName: groups.name })
    .from(sessions)
    .innerJoin(quizzes, eq(quizzes.id, sessions.quizId))
    .innerJoin(groups, eq(groups.id, sessions.groupId))
    .where(eq(sessions.teacherId, auth.id))
    .orderBy(desc(sessions.createdAt))
    .limit(12);

  const pCounts = await db
    .select({ sessionId: participants.sessionId, count: sql<number>`count(*)::int` })
    .from(participants).groupBy(participants.sessionId);

  return (
    <TeacherDashboardClient
      teacherName={me?.name ?? "الأستاذ محمد شلبي"}
      myGroups={myGroups}
      members={members}
      myQuizzes={myQuizzes}
      qAgg={qAgg}
      mySessions={rawSessions}
      pCounts={pCounts}
    />
  );
}
