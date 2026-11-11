"use client";

import Link from "next/link";
import { Hash, Users, Vote, History, Medal, Clock, CheckCircle2 } from "lucide-react";
import { StudentHeader, RankRow, LevelChip, EmptyState } from "@/components/ui";
import { LogoutButton, JoinSessionForm } from "@/components/auth-forms";
import { PollVoteCard } from "@/components/polls";
import { useLang } from "@/lib/i18n";
import { fmtPoints } from "@/lib/utils";

type Membership = { mid: number; status: string; points: number; groupId: number; groupName: string; grade: string | null };
type HistoryItem = { sessionId: number; code: string; status: string; title: string; groupName: string; pts: number; correct: number };
type BoardEntry = { studentId: number; name: string; cumulativePoints: number };

type Props = {
  studentId: number;
  studentName: string;
  err?: string;
  myMemberships: Membership[];
  totalPoints: number;
  boards: Record<number, BoardEntry[]>;
  history: HistoryItem[];
  maxScores: Record<number, number>;
  myPolls: any[];
};

export function StudentDashboardClient({
  studentId, studentName, err, myMemberships, totalPoints, boards, history, maxScores, myPolls
}: Props) {
  const { t, lang } = useLang();
  const isAr = lang === "ar";

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden">
      <StudentHeader />
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black text-stone-900 sm:text-3xl break-words leading-tight">
              {isAr ? `أهلًا بك، ${studentName}` : `Bienvenue, ${studentName}`}
            </h1>
            <p className="mt-1 text-sm font-bold text-stone-400 leading-relaxed">
              {isAr ? "تابع نقاطك وترتيبك وانضم للجلسات المباشرة." : "Suivez votre score, votre classement et rejoignez les sessions en direct."}
            </p>
          </div>
          <LogoutButton role="student" className="btn-ghost btn-sm self-start xs:self-auto" />
        </div>

        {err === "not-member" && (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-4 text-sm font-bold text-rose-700 ring-1 ring-rose-100 flex items-start gap-3">
            <span className="text-xl shrink-0">⛔</span>
            <span>{isAr ? "أنت لست عضوًا مقبولًا في مجموعة هذه الجلسة. تأكد من تسجيل انضمامك وانتظار موافقة الأستاذ." : "Vous n'êtes pas membre accepté de ce groupe. Vérifiez votre inscription et attendez l'approbation du professeur."}</span>
          </div>
        )}
        {err === "need-code" && (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4 text-sm font-bold text-amber-800 ring-1 ring-amber-200 flex items-start gap-3">
            <span className="text-xl shrink-0">🔐</span>
            <span>
              {isAr ? (<>للانضمام إلى جلسة مباشرة يجب إدخال <strong>كود الجلسة</strong> الذي يعرضه أستاذك. أدخله في الحقل أدناه.</>)
                     : (<>Pour rejoindre une session en direct, entrez le <strong>code de session</strong> affiché par votre professeur.</>)}
            </span>
          </div>
        )}

        {/* join + level */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="card relative overflow-hidden !bg-gradient-to-l !from-indigo-600 !to-violet-600 text-white ring-0">
            <h2 className="flex items-center gap-2 text-base font-black"><Hash size={18} /> {t("انضم إلى جلسة مباشرة")}</h2>
            <p className="mb-4 mt-1 text-xs font-bold text-indigo-100/80">
              {isAr ? "أدخل الكود الذي يعرضه أستاذك على الشاشة." : "Entrez le code affiché par votre professeur sur l'écran."}
            </p>
            <div className="[&_input]:!bg-white/95">
              <JoinSessionForm big />
            </div>
          </section>
          <section className="card">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Medal size={18} className="text-amber-500" /> {t("مستوى إنجازك")}</h2>
            <div className="mt-4"><LevelChip points={totalPoints} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400">{isAr ? "جلسات شاركت فيها" : "Sessions suivies"}</p>
                <p className="text-lg font-black text-slate-800">{history.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400">{isAr ? "إجابات صحيحة" : "Bonnes réponses"}</p>
                <p className="text-lg font-black text-emerald-600">{history.reduce((a, h) => a + h.correct, 0)}</p>
              </div>
            </div>
          </section>
        </div>

        {/* my groups */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Users size={20} className="text-indigo-600" /> {t("مجموعاتي")}</h2>
          {myMemberships.length === 0 ? (
            <EmptyState icon={Users}
              title={isAr ? "لم تنضم لأي مجموعة بعد" : "Vous n'avez rejoint aucun groupe"}
              hint={isAr ? "اطلب رابط التسجيل الخاص بمجموعتك من أستاذك" : "Demandez le lien d'inscription à votre professeur"} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {myMemberships.map((m) => (
                <div key={m.mid} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-black text-slate-900">{m.groupName}</p>
                      <p className="text-xs font-bold text-slate-400">{m.grade || "—"}</p>
                    </div>
                    {m.status === "approved" ? (
                      <span className="chip bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><CheckCircle2 size={12} /> {t("مقبول")}</span>
                    ) : m.status === "pending" ? (
                      <span className="chip bg-amber-50 text-amber-600 ring-1 ring-amber-100"><Clock size={12} /> {isAr ? "بانتظار الموافقة" : "En attente d'approbation"}</span>
                    ) : (
                      <span className="chip bg-rose-50 text-rose-600 ring-1 ring-rose-100">{isAr ? "مرفوض" : "Refusé"}</span>
                    )}
                  </div>
                  {m.status === "approved" && (
                    <>
                      <div className="mt-4"><LevelChip points={m.points} showProgress={false} /></div>
                      <div className="mt-4 space-y-1.5">
                        <p className="text-[11px] font-black text-slate-400">{isAr ? "ترتيب المجموعة:" : "Classement du groupe :"}</p>
                        {(boards[m.groupId] ?? []).slice(0, 4).map((b, i) => (
                          <RankRow key={b.studentId} rank={i + 1} name={b.name} value={fmtPoints(b.cumulativePoints)} highlight={b.studentId === studentId} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* polls */}
        {myPolls.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Vote size={20} className="text-violet-600" /> {isAr ? "الاستفتاءات السريعة" : "Sondages rapides"}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {myPolls.map((p) => <PollVoteCard key={p.id} poll={JSON.parse(JSON.stringify(p))} />)}
            </div>
          </section>
        )}

        {/* history */}
        <section className="mt-10 pb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><History size={20} className="text-slate-500" /> {t("سجل نتائجي")}</h2>
          {history.length === 0 ? (
            <EmptyState icon={History}
              title={isAr ? "لا نتائج بعد" : "Aucun résultat pour l'instant"}
              hint={isAr ? "انضم لجلسة مباشرة بالكود وستظهر نتائجك هنا" : "Rejoignez une session en direct avec le code et vos résultats apparaîtront ici"} />
          ) : (
            <div className="card overflow-x-auto !p-0">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-th">{isAr ? "الاختبار" : "Examen"}</th>
                    <th className="table-th">{isAr ? "المجموعة" : "Groupe"}</th>
                    <th className="table-th">{isAr ? "درجتي" : "Ma note"}</th>
                    <th className="table-th">{isAr ? "صحيحة" : "Correctes"}</th>
                    <th className="table-th">{isAr ? "الحالة" : "État"}</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.sessionId}>
                      <td className="table-td font-bold">{h.title}</td>
                      <td className="table-td">{h.groupName}</td>
                      <td className="table-td">
                        <span className="font-black text-indigo-600">{fmtPoints(h.pts)}</span>
                        <span className="text-[10px] font-bold text-slate-400"> / {maxScores[h.sessionId] ?? "?"}</span>
                      </td>
                      <td className="table-td font-black text-emerald-600">{h.correct}</td>
                      <td className="table-td">
                        {h.status === "ended" ? (
                          <span className="chip bg-slate-100 text-slate-500">{isAr ? "منتهية" : "Terminée"}</span>
                        ) : (
                          <span className="chip animate-live bg-emerald-500 text-white">{isAr ? "جارية" : "En cours"}</span>
                        )}
                      </td>
                      <td className="table-td">
                        {h.status === "ended" ? (
                          <Link href={`/student/session/${h.code}`} className="btn-ghost btn-sm">{isAr ? "النتائج" : "Résultats"}</Link>
                        ) : (
                          <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[10px]">{isAr ? "أدخل الكود للانضمام" : "Entrez le code"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
