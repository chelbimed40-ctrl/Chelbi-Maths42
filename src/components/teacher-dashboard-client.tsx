"use client";

import Link from "next/link";
import { Users, UserPlus2, Library, Radio, ClipboardList, ArrowLeft, Trophy, Vote } from "lucide-react";
import { TeacherHeader, Stat, EmptyState } from "@/components/ui";
import { LogoutButton } from "@/components/auth-forms";
import { CreateGroupForm, CreateQuizForm, DeleteQuizButton, DeleteGroupButton } from "@/components/teacher-forms";
import { ExportResultsImage } from "@/components/export-image";
import { useLang } from "@/lib/i18n";

type Props = {
  teacherName: string;
  myGroups: { id: number; name: string; grade: string | null }[];
  members: { groupId: number; status: string }[];
  myQuizzes: { id: number; title: string; description: string | null }[];
  qAgg: { quizId: number; count: number; max: number }[];
  mySessions: { id: number; code: string; status: string; quizTitle: string; groupName: string }[];
  pCounts: { sessionId: number; count: number }[];
};

export function TeacherDashboardClient({ teacherName, myGroups, members, myQuizzes, qAgg, mySessions, pCounts }: Props) {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";

  const pendingByGroup = (gid: number) => members.filter((m) => m.groupId === gid && m.status === "pending").length;
  const approvedByGroup = (gid: number) => members.filter((m) => m.groupId === gid && m.status === "approved").length;

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
          <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : "text-left"}`}>
            <h1 className="font-display text-2xl font-black text-stone-900 sm:text-3xl break-words leading-tight mb-1">
              {lang === "ar" ? `أهلًا بك، ${teacherName}` : `Bienvenue, ${teacherName}`}
            </h1>
            <p className="text-sm font-bold text-stone-400 leading-snug">
              {lang === "ar" ? "لوحة التحكم الخاصة بك — كل شيء يعمل ببيانات حقيقية محفوظة." : "Votre tableau de bord — tout fonctionne avec des données réelles."}
            </p>
          </div>
          <LogoutButton role="teacher" className="btn-ghost btn-sm self-start xs:self-auto shrink-0" />
        </div>

        {/* stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 items-stretch">
          <Stat label={t("المجموعات")} value={myGroups.length} icon={Users} tint="indigo" />
          <Stat label={t("التلاميذ المقبولون")} value={members.filter((m) => m.status === "approved").length} icon={UserPlus2} tint="mint" />
          <Stat label={t("بانتظار الموافقة")} value={members.filter((m) => m.status === "pending").length} icon={ClipboardList} tint="amber" />
          <Stat label={t("الاختبارات")} value={myQuizzes.length} icon={Library} tint="rose" />
        </div>

        {/* quick create */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Users size={18} className="text-indigo-600" /> {t("مجموعة جديدة")}</h2>
            <p className="mb-4 mt-1 text-xs font-bold text-slate-400">
              {lang === "ar" ? "بعد الإنشاء ستحصل على رابط تسجيل مستقل تشاركه مع التلاميذ." : "Après la création, vous obtiendrez un lien d'inscription indépendant."}
            </p>
            <CreateGroupForm />
          </section>
          <section className="card">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Library size={18} className="text-violet-600" /> {t("اختبار جديد")}</h2>
            <p className="mb-4 mt-1 text-xs font-bold text-slate-400">
              {lang === "ar" ? "أنشئ الاختبار ثم أضف أسئلة بدرجات مختلفة لكل سؤال." : "Créez l'examen puis ajoutez des questions avec des barèmes différents."}
            </p>
            <CreateQuizForm />
          </section>
        </div>

        {/* groups */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-stone-900">
            <Users size={20} className="text-[#b8921f]" />
            {lang === "ar" ? "المجموعات وروابط التسجيل" : "Groupes et liens d'inscription"}
          </h2>
          {myGroups.length === 0 ? (
            <EmptyState icon={Users}
              title={lang === "ar" ? "لا توجد مجموعات بعد" : "Aucun groupe pour l'instant"}
              hint={lang === "ar" ? "أنشئ مجموعتك الأولى من الأعلى وشارك رابطها مع التلاميذ" : "Créez votre premier groupe et partagez le lien avec vos élèves"} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {myGroups.map((g) => (
                <div key={g.id} className="card !p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/teacher/groups/${g.id}`} className="text-base font-black text-stone-900 hover:text-[#b8921f] block break-words leading-tight">
                        {g.name}
                      </Link>
                      <p className="mt-1 text-xs font-bold text-stone-400">{g.grade || (lang === "ar" ? "بدون صف محدد" : "Niveau non défini")}</p>
                    </div>
                    <div className="shrink-0"><DeleteGroupButton id={g.id} /></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{approvedByGroup(g.id)} {t("مقبول")}</span>
                    {pendingByGroup(g.id) > 0 && (
                      <span className="chip animate-live bg-amber-500 text-white !py-0.5 !px-2">{pendingByGroup(g.id)} {t("بانتظار")}</span>
                    )}
                  </div>
                  <div className="mt-5">
                    <Link href={`/teacher/groups/${g.id}`} className="btn-dark btn-sm !w-full !justify-center font-bold">
                      {t("إدارة المجموعة")} <ArrowLeft size={14} className="mr-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* quizzes */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-stone-900 leading-tight">
            <ClipboardList size={20} className="text-violet-600 shrink-0" />
            <span>{t("الاختبارات")}</span>
          </h2>
          {myQuizzes.length === 0 ? (
            <EmptyState icon={ClipboardList}
              title={lang === "ar" ? "لا توجد اختبارات بعد" : "Aucun examen pour l'instant"}
              hint={lang === "ar" ? "أنشئ اختبارًا وأضف أسئلة بأنواع ودرجات مختلفة" : "Créez un examen et ajoutez des questions de différents types"} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {myQuizzes.map((q) => {
                const agg = qAgg.find((x) => x.quizId === q.id);
                return (
                  <div key={q.id} className="card !p-4 sm:!p-6 overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                        <Link href={`/teacher/quizzes/${q.id}`} className="text-base font-black text-stone-900 hover:text-[#b8921f] break-words leading-tight block">{q.title}</Link>
                        {q.description && <p className="mt-1 line-clamp-1 text-[11px] font-bold text-stone-400 leading-snug">{q.description}</p>}
                      </div>
                      <DeleteQuizButton id={q.id} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="chip bg-stone-100 text-stone-600 ring-1 ring-stone-200 text-[10px]">{agg?.count ?? 0} {t("سؤال")}</span>
                      <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-100 text-[10px]"><Trophy size={11} className="shrink-0" /> {agg?.max ?? 0} {t("درجة")}</span>
                    </div>
                    <div className="mt-4">
                      <Link href={`/teacher/quizzes/${q.id}`} className="btn-primary btn-sm !w-full !justify-center font-bold">
                        {t("فتح المحرر")} <ArrowLeft size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* sessions */}
        <section className="mt-10 pb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Radio size={20} className="text-rose-500" />
            {lang === "ar" ? "الجلسات الأخيرة" : "Sessions récentes"}
          </h2>
          {mySessions.length === 0 ? (
            <EmptyState icon={Radio}
              title={lang === "ar" ? "لا توجد جلسات بعد" : "Aucune session pour l'instant"}
              hint={lang === "ar" ? "افتح أي اختبار واضغط «بدء جلسة مباشرة»" : "Ouvrez un examen et cliquez sur «Démarrer une session en direct»"} />
          ) : (
            <div className="card overflow-x-auto !p-0">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-th">{lang === "ar" ? "الكود" : "Code"}</th>
                    <th className="table-th">{lang === "ar" ? "الاختبار" : "Examen"}</th>
                    <th className="table-th">{lang === "ar" ? "المجموعة" : "Groupe"}</th>
                    <th className="table-th">{lang === "ar" ? "الحالة" : "État"}</th>
                    <th className="table-th">{lang === "ar" ? "المشاركون" : "Participants"}</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mySessions.map((s) => {
                    const pc = pCounts.find((p) => p.sessionId === s.id)?.count ?? 0;
                    return (
                      <tr key={s.id}>
                        <td className="table-td font-black tracking-widest text-indigo-600" dir="ltr">{s.code}</td>
                        <td className="table-td font-bold">{s.quizTitle}</td>
                        <td className="table-td">{s.groupName}</td>
                        <td className="table-td">
                          {s.status === "active" ? (
                            <span className="chip animate-live bg-emerald-500 text-white">{lang === "ar" ? "مباشر الآن" : "En direct"}</span>
                          ) : s.status === "lobby" ? (
                            <span className="chip bg-amber-50 text-amber-600 ring-1 ring-amber-100">{lang === "ar" ? "غرفة انتظار" : "Salle d'attente"}</span>
                          ) : (
                            <span className="chip bg-slate-100 text-slate-500">{lang === "ar" ? "منتهية" : "Terminée"}</span>
                          )}
                        </td>
                        <td className="table-td font-black">{pc}</td>
                        <td className="table-td">
                          <div className="flex gap-2">
                            <Link href={`/teacher/sessions/${s.id}`} className="btn-dark btn-sm">{lang === "ar" ? "فتح" : "Ouvrir"}</Link>
                            <Link href={`/teacher/sessions/${s.id}`} className="btn-ghost btn-sm">{lang === "ar" ? "النتائج" : "Résultats"}</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="pb-10 text-center text-xs font-bold text-slate-400">
          <Vote size={13} className="mb-0.5 inline" />
          {lang === "ar" ? " لا تنسَ: الاستفتاءات السريعة وأدوات الفصل من القائمة بالأعلى" : " N'oubliez pas : sondages et outils de classe disponibles dans le menu"}
        </p>
      </div>
    </main>
  );
}
