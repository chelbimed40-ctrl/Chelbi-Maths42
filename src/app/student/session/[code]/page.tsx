import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { memberships, participants, sessions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { LiveStudentPlayer } from "@/components/live-student";

export const dynamic = "force-dynamic";

export default async function StudentSessionPage({ params }: { params: Promise<{ code: string }> }) {
  const auth = await getAuth();
  const { code } = await params;
  if (auth?.role !== "student") redirect(`/student/login?next=${encodeURIComponent(`/student/session/${code}`)}`);

  const [s] = await db.select().from(sessions).where(eq(sessions.code, code.toUpperCase())).limit(1);
  if (!s) notFound();

  // التلميذ يجب أن يكون عضواً مقبولاً في المجموعة
  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.groupId, s.groupId), eq(memberships.studentId, auth.id), eq(memberships.status, "approved")))
    .limit(1);
  if (!m) redirect("/student?err=not-member");

  if (s.status !== "ended") {
    // الجلسة المباشرة: يجب أن يكون قد انضم فعلياً عبر الكود (participant record)
    // إذا حاول الدخول مباشرة من الرابط دون إدخال الكود — نحيله لصفحته
    const [p] = await db.select().from(participants).where(and(eq(participants.sessionId, s.id), eq(participants.studentId, auth.id))).limit(1);
    if (!p) {
      // لم ينضم عبر الكود — أعده لصفحته مع رسالة توضيحية
      redirect("/student?err=need-code");
    }
  }

  return <LiveStudentPlayer sessionId={s.id} studentName="" />;
}
