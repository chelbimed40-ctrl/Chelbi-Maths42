import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Vote, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { groups, polls, pollVotes } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherHeader, EmptyState } from "@/components/ui";
import { PollCreateForm, PollAdminCard } from "@/components/polls";

export const dynamic = "force-dynamic";

export default async function TeacherPollsPage() {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");

  const myGroups = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.teacherId, auth.id));
  const rows = await db
    .select({ id: polls.id, question: polls.question, options: polls.options, status: polls.status, groupId: polls.groupId, createdAt: polls.createdAt })
    .from(polls)
    .where(eq(polls.teacherId, auth.id))
    .orderBy(desc(polls.createdAt));
  const votes = await db.select({ pollId: pollVotes.pollId, optionIndex: pollVotes.optionIndex }).from(pollVotes);
  const gname = Object.fromEntries(myGroups.map((g) => [g.id, g.name]));

  const cards = rows.map((p) => ({
    ...p,
    groupName: gname[p.groupId] ?? "",
    counts: p.options.map((_, i) => votes.filter((v) => v.pollId === p.id && v.optionIndex === i).length),
  }));

  return (
    <main className="mesh-bg min-h-screen">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/teacher" className="btn-ghost btn-sm mb-5"><ArrowRight size={13} /> لوحة التحكم</Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <section className="card h-fit lg:sticky lg:top-24">
            <h1 className="flex items-center gap-2 text-lg font-black text-slate-900"><Vote size={20} className="text-violet-600" /> استفتاء سريع جديد</h1>
            <p className="mb-5 mt-1 text-xs font-bold leading-6 text-slate-400">يقيس فهم التلاميذ فورًا — يظهر لديهم في بوابة التلميذ. بعد الإنشاء يمكنك إغلاق الاستفتاء أو إعادة فتحه فقط.</p>
            {myGroups.length === 0 ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 ring-1 ring-amber-100">أنشئ مجموعة أولًا من لوحة التحكم.</p>
            ) : (
              <PollCreateForm groups={myGroups} />
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black text-slate-900">كل الاستفتاءات ({cards.length})</h2>
            {cards.length === 0 ? (
              <EmptyState icon={Vote} title="لا توجد استفتاءات بعد" hint="انشر أول استفتاء من النموذج اليساري" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cards.map((p) => (
                  <PollAdminCard key={p.id} poll={JSON.parse(JSON.stringify(p))} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
