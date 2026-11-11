import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { LiveTeacherConsole } from "@/components/live-teacher";

export const dynamic = "force-dynamic";

export default async function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");
  const { id } = await params;
  const [s] = await db.select().from(sessions).where(and(eq(sessions.id, Number(id)), eq(sessions.teacherId, auth.id))).limit(1);
  if (!s) notFound();
  return <LiveTeacherConsole sessionId={s.id} />;
}
