import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, and, asc, sql } from "drizzle-orm";
import { Users, Clock, Trophy, ArrowRight, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { groups, memberships, participants, sessions, students, quizzes } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherHeader, RankRow, LevelChip, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/auth-forms";
import { MemberAction } from "@/components/teacher-forms";
import { groupLeaderboard } from "@/lib/grading";
import { fmtPoints } from "@/lib/utils";
import { ExportResultsImage } from "@/components/export-image";
import { GroupSettings } from "@/components/group-settings";

export const dynamic = "force-dynamic";

export default async function GroupManagePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");
  const { id } = await params;

  const [g] = await db.select().from(groups).where(and(eq(groups.id, Number(id)), eq(groups.teacherId, auth.id))).limit(1);
  if (!g) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const invite = `${proto}://${host}/register/${g.inviteToken}`;

  const rows = await db
    .select({ 
      mid: memberships.id, 
      status: memberships.status, 
      points: memberships.cumulativePoints, 
      createdAt: memberships.createdAt, 
      approvedAt: memberships.approvedAt, 
      name: students.name,
      code: students.loginCode
    })
    .from(memberships)
    .innerJoin(students, eq(students.id, memberships.studentId))
    .where(eq(memberships.groupId, g.id))
    .orderBy(asc(memberships.createdAt));

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const rejected = rows.filter((r) => r.status === "rejected");

  const board = await groupLeaderboard(g.id);
  const hist = await db
    .select({ id: sessions.id, code: sessions.code, title: quizzes.title, status: sessions.status, createdAt: sessions.createdAt, pc: sql<number>`(select count(*) from ${participants} where ${participants.sessionId} = ${sessions.id})::int` })
    .from(sessions)
    .innerJoin(quizzes, eq(quizzes.id, sessions.quizId))
    .where(eq(sessions.groupId, g.id))
    .orderBy(asc(sessions.createdAt));

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
        <Link href="/teacher" className="btn-ghost btn-sm mb-4 inline-flex"><ArrowRight size={13} /> لوحة التحكم</Link>

        <div className="flex flex-col lg:grid lg:grid-cols-[1.6fr_1fr] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6 min-w-0">
            <GroupSettings group={{ ...g, approvedCount: approved.length }} inviteUrl={invite} shortUrl={`${proto}://${host}/j/${g.inviteToken}`} />

            {/* pending approvals */}
            <section className="card !p-4 sm:!p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-stone-900 leading-tight">
                <Clock size={18} className="text-amber-500 shrink-0" /> 
                <span>طلبات بانتظار الموافقة</span>
                {pending.length > 0 && <span className="chip bg-amber-500 text-white !py-0.5 !px-2">{pending.length}</span>}
              </h2>
              <div className="mt-4 space-y-2.5">
                {pending.length === 0 && <p className="text-[11px] font-bold text-stone-400">لا توجد طلبات معلقة حالياً.</p>}
                {pending.map((m) => (
                  <div key={m.mid} className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 rounded-2xl bg-amber-50/60 px-4 py-3 ring-1 ring-amber-100">
                    <p className="text-sm font-black text-stone-800 break-words">{m.name}</p>
                    <div className="flex items-center gap-2">
                      <MemberAction groupId={g.id} membershipId={m.mid} action="approve" label="قبول" tone="approve" />
                      <MemberAction groupId={g.id} membershipId={m.mid} action="reject" label="رفض" tone="reject" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* approved members */}
            <section className="card !p-4 sm:!p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-stone-900 leading-tight">
                <Users size={18} className="text-emerald-600 shrink-0" /> 
                <span>التلاميذ المقبولون</span>
              </h2>
              <div className="mt-4 overflow-x-auto no-scrollbar">
                {approved.length === 0 ? (
                  <EmptyState icon={Users} title="لا يوجد تلاميذ مقبولون بعد" hint="شارك رابط التسجيل ثم اقبل الطلبات" />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="table-th !px-2">التلميذ</th>
                        <th className="table-th !px-2">الكود</th>
                        <th className="table-th !px-2">النقاط</th>
                        <th className="table-th !px-2 text-left">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {approved.map((m) => (
                        <tr key={m.mid}>
                          <td className="table-td !px-2 font-bold max-w-[80px] xs:max-w-[120px] truncate" title={m.name}>{m.name}</td>
                          <td className="table-td !px-2 font-black text-stone-400" dir="ltr">{m.code || "---"}</td>
                          <td className="table-td !px-2 whitespace-nowrap">
                            <span className="font-black text-[#b8921f]">{fmtPoints(m.points)}</span> 
                          </td>
                          <td className="table-td !px-2 text-left">
                            <div className="flex items-center justify-end gap-1">
                              <MemberAction groupId={g.id} membershipId={m.mid} action="pending" label="تعليق" tone="pending" />
                              <MemberAction groupId={g.id} membershipId={m.mid} action="remove" label="إزالة" tone="remove" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* session history */}
            <section className="card !p-4 sm:!p-6">
              <h2 className="text-base font-black text-stone-900">جلسات هذه المجموعة</h2>
              <div className="mt-4 space-y-2.5">
                {hist.length === 0 && <p className="text-xs font-bold text-stone-400">لم تُقام جلسات لهذه المجموعة بعد.</p>}
                {hist.map((s) => (
                  <div key={s.code} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-stone-100">
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-sm font-black text-stone-800 break-words leading-tight mb-1">{s.title}</p>
                      <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 flex flex-wrap items-center gap-1.5">
                        <span dir="ltr" className="text-indigo-600 font-black">{s.code}</span>
                        <span className="opacity-40">•</span>
                        <span>مشاركون: {s.pc}</span>
                        <span className="opacity-40">•</span>
                        <span className={`chip !px-1.5 !py-0 !text-[9px] ${
                          s.status === "active" ? "bg-emerald-50 text-emerald-600" : 
                          s.status === "lobby" ? "bg-amber-50 text-amber-600" : 
                          "bg-stone-100 text-stone-500"
                        }`}>
                          {s.status === "active" ? "مباشر" : s.status === "lobby" ? "انتظار" : "منتهية"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0 w-full sm:w-auto">
                      <Link href={`/teacher/sessions/${s.id}`} className="btn-ghost btn-sm flex-1 sm:flex-none !justify-center !py-1.5 font-bold">فتح</Link>
                      <Link href={`/teacher/sessions/${s.id}`} className="btn-ghost btn-sm flex-1 sm:flex-none !justify-center !py-1.5 font-bold">النتائج</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* leaderboard column */}
          <div className="space-y-4 sm:space-y-6">
            <section className="card !p-4 sm:!p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-stone-900 leading-tight">
                <Trophy size={18} className="text-amber-500 shrink-0" /> 
                <span>الترتيب التراكمي</span>
              </h2>
              <div className="mt-4 space-y-2">
                {board.length === 0 && <EmptyState icon={Trophy} title="لا توجد نقاط بعد" hint="تظهر النقاط بعد انتهاء أول جلسة" />}
                {board.slice(0, 15).map((b, i) => (
                  <RankRow key={b.studentId} rank={i + 1} name={b.name} value={fmtPoints(b.cumulativePoints)} />
                ))}
              </div>
              <div className="mt-5">
                <ExportResultsImage
                  title={`الترتيب التراكمي — ${g.name}`}
                  subtitle={g.grade || ""}
                  rows={board.map((b, i) => ({ rank: i + 1, name: b.name, points: b.cumulativePoints }))}
                  label="تصدير النتائج كصورة"
                />
              </div>
            </section>

            <section className="card !p-4 sm:!p-6">
              <h2 className="text-base font-black text-stone-900 leading-tight">مستويات الإنجاز</h2>
              <p className="mb-4 mt-1 text-[11px] sm:text-xs font-bold text-stone-400 leading-relaxed">تُحسب تلقائيًا من النقاط التراكمية — كل 25 نقطة = نجمة.</p>
              {board[0] && <LevelChip points={board[0].cumulativePoints} />}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
