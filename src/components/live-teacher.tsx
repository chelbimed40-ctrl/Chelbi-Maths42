"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play, ChevronRight, ChevronLeft, Square, Users, Loader2, CheckCircle2, XCircle,
  Timer, ArrowRight, Copy, Check, PenLine, Trophy, Hourglass, ImageIcon, Send,
} from "lucide-react";
import { QUESTION_TYPE_LABELS, fmtPoints } from "@/lib/utils";
import { ExportResultsImage } from "@/components/export-image";

type State = {
  session: { id: number; code: string; status: string; currentIndex: number; timeLimitSec: number };
  quiz: { title: string; questions: any[] };
  groupName: string;
  maxScore: number;
  timeLeft: number | null;
  participants: { studentId: number; name: string; totalPoints: number; correctCount: number; answeredCount: number }[];
  answers: {
    submissionId: number; studentId: number; name: string;
    answerOption: number | null; answerBool: boolean | null; answerNumber: string | null; answerText: string | null;
    isCorrect: boolean | null; awardedPoints: number; needsManual: boolean; imagesCount?: number;
  }[];
  leaderboard: { studentId: number; name: string; totalPoints: number; correctCount: number; answeredCount: number }[];
  pendingManualCount: number;
};

function describeAnswer(a: State["answers"][number], q: any): string {
  if (!q) return "—";
  if (q.type === "mcq") return q.options?.[a.answerOption ?? -1] ?? "—";
  if (q.type === "tf") return a.answerBool === null ? "—" : a.answerBool ? "صواب" : "خطأ";
  if (q.type === "numeric") return a.answerNumber ?? "—";
  return a.answerText ?? "—";
}

export function LiveTeacherConsole({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [st, setSt] = useState<State | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [grades, setGrades] = useState<Record<number, string>>({});
  const timerRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state?for=teacher`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر التحميل");
      setSt(data);
      setErr("");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [sessionId]);

  // smooth local countdown between polls
  const [displayLeft, setDisplayLeft] = useState<number | null>(null);
  useEffect(() => setDisplayLeft(st?.timeLeft ?? null), [st?.timeLeft]);
  useEffect(() => {
    if (displayLeft === null || displayLeft <= 0) return;
    const t = setInterval(() => setDisplayLeft((v) => (v && v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [displayLeft !== null]);

  async function control(action: string, extra: any = {}) {
    setBusy(true);
    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, ...extra }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function grade(subId: number) {
    const raw = grades[subId] ?? "";
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: subId, awardedPoints: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGrades((g) => ({ ...g, [subId]: "" }));
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (err && !st) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="card max-w-md text-center">
          <p className="text-sm font-black text-rose-600">{err}</p>
          <button className="btn-ghost mt-4" onClick={() => router.push("/teacher")}>عودة للوحة التحكم</button>
        </div>
      </main>
    );
  }
  if (!st) {
    return (
      <main className="ink-bg grid min-h-screen place-items-center text-white">
        <Loader2 className="animate-spin" size={36} />
      </main>
    );
  }

  const q = st.session.status === "active" ? st.quiz.questions[st.session.currentIndex] ?? null : null;
  const answeredSet = new Set(st.answers.map((a) => a.studentId));

  /* ─────────── ENDED ─────────── */
  if (st.session.status === "ended") {
    const top3 = st.leaderboard.slice(0, 3);
    return (
      <main className="ink-bg min-h-screen px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="chip mx-auto bg-white/10 text-indigo-100 ring-1 ring-white/15">انتهت الجلسة</p>
            <h1 className="font-display mt-3 text-3xl font-black text-white">{st.quiz.title}</h1>
            <p className="mt-1 text-sm font-bold text-indigo-200/80">{st.groupName} · الدرجة القصوى {st.maxScore} نقطة</p>
          </div>

          {top3.length > 0 && (
            <div className="mt-8 flex items-end justify-center gap-3">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((p, vi) => {
                const realRank = st.leaderboard.indexOf(p) + 1;
                const h = realRank === 1 ? "h-36" : realRank === 2 ? "h-28" : "h-24";
                const grad = realRank === 1 ? "from-amber-300 to-amber-500" : realRank === 2 ? "from-slate-200 to-slate-400" : "from-orange-300 to-orange-500";
                return (
                  <div key={p.studentId} className="flex w-24 flex-col items-center gap-2 sm:w-28">
                    <p className="w-full truncate text-center text-xs font-black text-white">{p.name}</p>
                    <div className={`w-full ${h} rounded-t-3xl bg-gradient-to-b ${grad} p-2 text-center shadow-xl`}>
                      <p className="text-2xl font-black text-white drop-shadow">#{realRank}</p>
                      <p className="mt-2 text-lg font-black text-white drop-shadow">{fmtPoints(p.totalPoints)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card mt-6 sm:mt-8">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Trophy className="text-amber-500" size={18} /> الترتيب النهائي</h2>
            <div className="mt-4 space-y-2">
              {st.leaderboard.map((p, i) => {
                const medal = i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                const msg = i === 0 ? "بطل الجلسة!" : i === 1 ? "أداء رائع!" : i === 2 ? "ممتاز!" : null;
                return (
                  <div key={p.studentId} className={`rounded-2xl px-4 py-3 ${i === 0 ? "bg-gradient-to-l from-[#b8921f] to-[#d4af37] text-white ring-2 ring-amber-300/40" : i <= 2 ? "bg-amber-50/70 ring-1 ring-amber-100" : "bg-stone-50"}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-black">
                        <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${i === 0 ? "bg-white/20 text-white" : "bg-white text-stone-500 ring-1 ring-stone-200"}`}>
                          {medal ?? (i + 1)}
                        </span>
                        {p.name}
                      </span>
                      <span className={`text-sm font-black ${i === 0 ? "text-amber-100" : "text-[#b8921f]"}`}>
                        {fmtPoints(p.totalPoints)} <span className={`text-[10px] font-bold ${i === 0 ? "text-white/70" : "text-stone-400"}`}>· صحيحة {p.correctCount}</span>
                      </span>
                    </div>
                    {msg && (
                      <p className={`mt-1.5 text-[11px] font-bold ${i === 0 ? "text-amber-100/90" : "text-amber-700/80"}`}>
                        {msg}
                      </p>
                    )}
                  </div>
                );
              })}
              {st.leaderboard.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">لم يشارك أحد في هذه الجلسة.</p>}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ExportResultsImage
                title={st.quiz.title}
                subtitle={st.groupName}
                maxScore={st.maxScore}
                rows={st.leaderboard.map((p, i) => ({ rank: i + 1, name: p.name, points: p.totalPoints, correct: p.correctCount }))}
                label="تصدير النتائج كصورة"
              />
              <Link href={`/teacher/images?session=${sessionId}`} className="btn-ghost"><ImageIcon size={15} /> إجابات بالصور</Link>
              <button className="btn-dark" onClick={() => control("release-grades")} disabled={busy}>
                <Send size={15} /> نشر الدرجات والملاحظات للتلاميذ
              </button>
              <Link href="/teacher" className="btn-ghost"><ArrowRight size={15} /> لوحة التحكم</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ─────────── LOBBY / ACTIVE ─────────── */
  return (
    <main className="ink-bg min-h-screen px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-black text-white sm:text-2xl">{st.quiz.title}</h1>
            <p className="text-xs font-bold text-indigo-200/70">{st.groupName} · الدرجة القصوى {st.maxScore} نقطة</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 transition-colors hover:bg-white/20"
              onClick={async () => {
                await navigator.clipboard.writeText(st.session.code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              title="نسخ كود الجلسة"
            >
              <span className="text-[10px] font-bold text-indigo-200">كود الدخول</span>
              <span className="text-xl font-black tracking-[0.3em] text-amber-300" dir="ltr">{st.session.code}</span>
              {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} className="text-indigo-200" />}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* main panel */}
          <div>
            {st.session.status === "lobby" ? (
              <div className="rounded-[2rem] bg-white/[0.06] p-5 sm:p-8 text-center ring-1 ring-white/10 backdrop-blur">
                <p className="text-xs sm:text-sm font-black text-indigo-200">غرفة الانتظار — اطلب من التلاميذ إدخال الكود</p>
                <p className="my-4 sm:my-6 font-display text-4xl sm:text-6xl font-black tracking-[0.2em] sm:tracking-[0.25em] text-white" dir="ltr">{st.session.code}</p>
                <p className="mb-4 sm:mb-6 text-sm font-bold text-indigo-200/70">
                  <Users size={14} className="mb-0.5 inline" /> انضم {st.participants.length} تلميذ
                </p>
                <button className="btn mx-auto w-full sm:w-auto bg-gradient-to-l from-emerald-500 to-teal-500 !px-8 sm:!px-10 !py-3.5 sm:!py-4 !text-base sm:!text-lg text-white shadow-xl shadow-emerald-500/30 hover:-translate-y-0.5" onClick={() => control("start")} disabled={busy}>
                  <Play size={20} /> ابدأ الأسئلة الآن
                </button>
              </div>
            ) : q ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="chip bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    سؤال {st.session.currentIndex + 1} من {st.quiz.questions.length} · {QUESTION_TYPE_LABELS[q.type]} · {q.points} درجة
                  </span>
                  {displayLeft !== null && (
                    <div ref={timerRef} className="flex items-center gap-2">
                      <div className={`pbar w-24 ${displayLeft <= 10 ? "[&>span]:from-rose-500 [&>span]:to-rose-400" : ""}`}>
                        <span style={{ width: `${(displayLeft / st.session.timeLimitSec) * 100}%` }} />
                      </div>
                      <span className={`flex items-center gap-1 text-sm font-black ${displayLeft <= 10 ? "text-rose-500" : "text-slate-600"}`} dir="ltr">
                        <Timer size={14} /> {displayLeft}s
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-5 font-display text-xl font-black leading-9 text-slate-900 sm:text-2xl sm:leading-10" dir="auto">{q.prompt}</p>
                {/* question prompt images */}
                {q.promptImageIds && q.promptImageIds.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {q.promptImageIds.map((imgId: number) => (
                      <div key={imgId} className="overflow-hidden rounded-2xl ring-1 ring-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/question-images/${imgId}`} alt="صورة السؤال" className="max-h-56 w-full object-contain bg-stone-50" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "mcq" && (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {q.options.map((o: string, i: number) => {
                      const count = st.answers.filter((a) => a.answerOption === i).length;
                      return (
                        <div key={i} className={`relative overflow-hidden rounded-2xl px-4 py-3 ring-1 ${i === q.correctOption ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-200"}`}>
                          <div className={`absolute inset-y-0 right-0 ${i === q.correctOption ? "bg-emerald-200/40" : "bg-indigo-100/50"}`} style={{ width: `${st.answers.length ? (count / st.answers.length) * 100 : 0}%` }} />
                          <div className="relative flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">
                              {o} {i === q.correctOption && <CheckCircle2 size={14} className="mb-0.5 inline text-emerald-600" />}
                            </span>
                            <span className="text-xs font-black text-slate-500">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {q.type === "tf" && (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {[true, false].map((v) => {
                      const count = st.answers.filter((a) => a.answerBool === v).length;
                      return (
                        <div key={String(v)} className={`relative overflow-hidden rounded-2xl px-4 py-4 ring-1 ${v === q.correctBool ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-200"}`}>
                          <div className={`absolute inset-y-0 right-0 ${v === q.correctBool ? "bg-emerald-200/40" : "bg-indigo-100/50"}`} style={{ width: `${st.answers.length ? (count / st.answers.length) * 100 : 0}%` }} />
                          <div className="relative flex items-center justify-between text-sm font-black text-slate-700">
                            <span>{v ? "صواب" : "خطأ"}</span><span>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {["numeric", "short", "manual"].includes(q.type) && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-bold text-slate-400">
                      {q.type === "numeric" && <>الإجابة الصحيحة: <b className="text-emerald-600">{q.correctNumber}</b>{Number(q.tolerance) ? ` (±${q.tolerance})` : ""}</>}
                      {q.type === "short" && <>المقبولة: <b className="text-emerald-600">{q.acceptedAnswers?.join("، ")}</b></>}
                      {q.type === "manual" && "سؤال تصحيح يدوي — قيّم الإجابات من القائمة بالأسفل"}
                    </p>
                  </div>
                )}

                {/* progress + controls */}
                <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>أجاب {answeredSet.size} من {st.participants.length}</span>
                  {st.pendingManualCount > 0 && (
                    <span className="flex items-center gap-1 text-violet-600"><PenLine size={13} /> {st.pendingManualCount} بانتظار تصحيحك</span>
                  )}
                </div>
                <div className="pbar mt-2"><span style={{ width: `${st.participants.length ? (answeredSet.size / st.participants.length) * 100 : 0}%` }} /></div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <button className="btn-ghost" onClick={() => control("prev")} disabled={busy || st.session.currentIndex <= 0}>
                    <ChevronRight size={16} /> السابق
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => control("next")}
                    disabled={busy || st.session.currentIndex >= st.quiz.questions.length - 1}
                  >
                    التالي <ChevronLeft size={16} />
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      if (confirm("إنهاء الجلسة؟ يمكنك تصحيح الإجابات اليدوية ورصد النقاط بعد الإنهاء من صفحة «إجابات بالصور».")) control("end");
                    }}
                    disabled={busy}
                  >
                    <Square size={14} /> إنهاء
                  </button>
                </div>
              </div>
            ) : null}

            {/* answers feed */}
            {st.session.status === "active" && st.answers.length > 0 && (
              <div className="mt-5 rounded-[2rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
                <h3 className="mb-3 text-sm font-black text-white">إجابات هذا السؤال</h3>
                <div className="max-h-80 space-y-2 overflow-y-auto pl-1">
                  {st.answers.map((a) => (
                    <div key={a.submissionId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-black text-white">
                          {a.name}
                          {(a.imagesCount ?? 0) > 0 && (
                            <Link
                              href={`/teacher/images?session=${sessionId}`}
                              className="chip animate-pulse bg-amber-400 text-amber-950 ring-1 ring-amber-300 hover:bg-amber-300"
                              title="عرض صور الإجابة وتصحيحها يدوياً"
                            >
                              <ImageIcon size={11} /> {a.imagesCount} صورة جديدة
                            </Link>
                          )}
                        </p>
                        <p className="line-clamp-2 text-[11px] font-bold text-stone-300 leading-5">{describeAnswer(a, q)}</p>
                      </div>
                      {a.needsManual ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="w-16 rounded-xl border-0 bg-white/10 px-2 py-1.5 text-center text-xs font-black text-white ring-1 ring-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            dir="ltr"
                            placeholder={`≤ ${q?.points ?? ""}`}
                            value={grades[a.submissionId] ?? ""}
                            onChange={(e) => setGrades((g) => ({ ...g, [a.submissionId]: e.target.value }))}
                          />
                          <button className="btn btn-sm bg-amber-400 text-amber-950 hover:bg-amber-300" onClick={() => grade(a.submissionId)}>
                            رصد
                          </button>
                        </div>
                      ) : a.isCorrect ? (
                        <span className="chip bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"><CheckCircle2 size={12} /> +{fmtPoints(a.awardedPoints)}</span>
                      ) : (
                        <span className="chip bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30"><XCircle size={12} /> 0</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* side panel */}
          <div className="space-y-5">
            <div className="rounded-[2rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
              <h3 className="flex items-center gap-2 text-sm font-black text-white"><Users size={15} /> المشاركون ({st.participants.length})</h3>
              <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pl-1">
                {st.participants.map((p) => (
                  <div key={p.studentId} className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10">
                    <span className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className={`h-2 w-2 rounded-full ${answeredSet.has(p.studentId) ? "bg-emerald-400" : "bg-white/20"}`} />
                      {p.name}
                    </span>
                    <span className="text-xs font-black text-amber-300" dir="ltr">{fmtPoints(p.totalPoints)}</span>
                  </div>
                ))}
                {st.participants.length === 0 && (
                  <p className="py-6 text-center text-xs font-bold text-indigo-200/50">بانتظار انضمام التلاميذ بالكود...</p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
              <h3 className="flex items-center gap-2 text-sm font-black text-white"><Hourglass size={15} /> مؤقّت الأسئلة</h3>
              <form
                className="mt-3 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await control("set-limit", { timeLimitSec: Number(fd.get("limit")) || 0 });
                }}
              >
                <input name="limit" type="number" min={0} max={600} defaultValue={st.session.timeLimitSec} className="w-full rounded-xl border-0 bg-white/10 px-3 py-2 text-center text-sm font-black text-white ring-1 ring-white/20" dir="ltr" />
                <button className="btn btn-sm shrink-0 bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">ضبط</button>
              </form>
              <p className="mt-2 text-[10px] font-bold text-indigo-200/50">0 = بدون مؤقت · يبدأ العد مع كل سؤال جديد</p>
            </div>

            <div className="rounded-[2rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
              <h3 className="text-sm font-black text-white">الأسئلة</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {st.quiz.questions.map((qq: any, i: number) => (
                  <span
                    key={qq.id}
                    className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ring-1 ${
                      i === st.session.currentIndex && st.session.status === "active"
                        ? "bg-amber-400 text-amber-950 ring-amber-300"
                        : i < st.session.currentIndex || st.session.status === "ended"
                          ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30"
                          : "bg-white/[0.06] text-indigo-200 ring-white/10"
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {err && <p className="mt-4 text-center text-xs font-bold text-rose-300">{err}</p>}
      </div>
    </main>
  );
}
