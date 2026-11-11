import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { ArrowRight, Radio } from "lucide-react";
import { db } from "@/db";
import { groups, questionImages, questions, quizzes, memberships } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherHeader } from "@/components/ui";
import { QuizEditor } from "@/components/quiz-editor";
import { LaunchSessionForm } from "@/components/teacher-forms";

export const dynamic = "force-dynamic";

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");
  const { id } = await params;

  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, Number(id)), eq(quizzes.teacherId, auth.id))).limit(1);
  if (!quiz) notFound();

  const rawQs = await db.select().from(questions).where(eq(questions.quizId, quiz.id)).orderBy(asc(questions.orderIndex));
  // enrich each question with its prompt image IDs
  const qs = await Promise.all(
    rawQs.map(async (q) => {
      const imgs = await db.select({ id: questionImages.id }).from(questionImages).where(eq(questionImages.questionId, q.id)).orderBy(asc(questionImages.orderIndex));
      return { ...q, promptImageIds: imgs.map((x) => x.id) };
    })
  );
  const myGroups = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.teacherId, auth.id));
  const maxScore = qs.reduce((a, q) => a + q.points, 0);
  const approvedCounts = await Promise.all(
    myGroups.map(async (g) => ({ id: g.id, name: g.name, count: await db.$count(memberships, and(eq(memberships.groupId, g.id), eq(memberships.status, "approved"))) }))
  );

  return (
    <main className="mesh-bg min-h-screen">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/teacher" className="btn-ghost btn-sm mb-5"><ArrowRight size={13} /> لوحة التحكم</Link>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-5">
              <h1 className="font-display text-2xl font-black text-slate-900">{quiz.title}</h1>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {qs.length} سؤال · الدرجة القصوى المحسوبة تلقائيًا: <span className="text-indigo-600">{maxScore} نقطة</span>
                {quiz.description ? ` · ${quiz.description}` : ""}
              </p>
            </div>
            <QuizEditor quizId={quiz.id} questions={JSON.parse(JSON.stringify(qs))} />
          </div>

          <aside className="space-y-4">
            <section className="card">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Radio size={18} className="text-rose-500" /> إطلاق جلسة مباشرة</h2>
              <p className="mb-4 mt-1 text-xs font-bold text-slate-400">أنشئ غرفة بكود انضمام وشاركه مع تلاميذ المجموعة.</p>
              <LaunchSessionForm quizId={quiz.id} groups={approvedCounts as any} />
              {qs.length === 0 && (
                <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                  أضف سؤالًا واحدًا على الأقل أولًا.
                </p>
              )}
            </section>
            <section className="card">
              <h2 className="text-base font-black text-slate-900">أنواع الأسئلة المدعومة</h2>
              <ul className="mt-3 space-y-2 text-xs font-bold leading-6 text-slate-500">
                <li>• <b className="text-slate-700">اختيار من متعدد / صواب خطأ:</b> تصحيح آلي فوري.</li>
                <li>• <b className="text-slate-700">إجابة رقمية:</b> تقبل الأرقام العربية ٣ والإنجليزية 3، مع هامش خطأ ±اختياري.</li>
                <li>• <b className="text-slate-700">إجابة قصيرة:</b> مقارنة ذكية تتجاوز الهمزات والتشكيل. كل سطر = إجابة مقبولة.</li>
                <li>• <b className="text-slate-700">تصحيح يدوي:</b> تظهر لك الإجابات أثناء الجلسة لتقيّمها بنفسك.</li>
                <li>• <b className="text-slate-700">الدرجات:</b> حدّد لكل سؤال قيمته (١، ٣، ٨... أي عدد من 1 إلى 100).</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
