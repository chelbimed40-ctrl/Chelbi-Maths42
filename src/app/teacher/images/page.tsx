import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, and, sql } from "drizzle-orm";
import { ArrowRight, ImageIcon } from "lucide-react";
import { db } from "@/db";
import { answerImages, groups, questions, quizzes, sessions, students, submissions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherHeader, EmptyState } from "@/components/ui";
import { ImageReviewBoard, type ReviewCard } from "@/components/image-review";

export const dynamic = "force-dynamic";
export const metadata = { title: "إجابات التلاميذ بالصور | Success-In-Maths" };

export default async function TeacherImagesPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");
  const { session } = await searchParams;
  const sessionFilter = session ? Number(session) : null;

  // عرض جميع إجابات أسئلة التصحيح اليدوي (سواء بصور أو بدون)
  const rows = await db
    .select({
      submissionId: submissions.id,
      studentName: students.name,
      groupName: groups.name,
      quizTitle: quizzes.title,
      sessionCode: sessions.code,
      sessionId: sessions.id,
      sessionStatus: sessions.status,
      prompt: questions.prompt,
      qPoints: questions.points,
      qType: questions.type,
      explanation: submissions.answerText,
      awardedPoints: submissions.awardedPoints,
      needsManual: submissions.needsManual,
      reviewStatus: submissions.reviewStatus,
      gradeReleased: submissions.gradeReleased,
      feedback: submissions.feedback,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(students, eq(students.id, submissions.studentId))
    .innerJoin(sessions, eq(sessions.id, submissions.sessionId))
    .innerJoin(quizzes, eq(quizzes.id, sessions.quizId))
    .innerJoin(groups, eq(groups.id, sessions.groupId))
    .innerJoin(questions, eq(questions.id, submissions.questionId))
    .where(and(
      eq(sessions.teacherId, auth.id),
      eq(questions.type, "manual"),
      sessionFilter ? eq(sessions.id, sessionFilter) : undefined,
    ))
    .orderBy(desc(submissions.submittedAt))
    .limit(80);

  const cards: ReviewCard[] = await Promise.all(
    rows.map(async (r) => {
      const imgs = await db.select({ id: answerImages.id }).from(answerImages).where(eq(answerImages.submissionId, r.submissionId));
      return { ...r, imagesCount: imgs.length, imageIds: imgs.map((x) => x.id), submittedAt: r.submittedAt.toISOString() } as ReviewCard;
    })
  );

  const pendingCount = cards.filter((c) => c.reviewStatus !== "graded").length;

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <Link href="/teacher" className="btn-ghost btn-sm mb-4"><ArrowRight size={13} /> لوحة التحكم</Link>
        <div className="flex flex-col xs:flex-row xs:items-end xs:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-black text-stone-900 sm:text-3xl">
              <ImageIcon size={26} className="text-[#b8921f]" /> إجابات التلاميذ بالصور
            </h1>
            <p className="mt-1 text-sm font-bold text-stone-500">
              مراجعة الحلول المكتوبة بخط اليد، تكبير الصور، ورصد الدرجات مع ملاحظات للتلاميذ.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="chip animate-live bg-[#b8921f] text-white">{pendingCount} بانتظار التصحيح</span>
          )}
        </div>

        <div className="mt-8">
          {cards.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="لا توجد إجابات مصوّرة بعد"
              hint="فعِّل «إرفاق صور» في أسئلة اختبارك، وسيظهر هنا عمل التلاميذ فور رفعه"
            />
          ) : (
            <ImageReviewBoard cards={cards} />
          )}
        </div>
      </div>
    </main>
  );
}
