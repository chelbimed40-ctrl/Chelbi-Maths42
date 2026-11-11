"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, XCircle, Timer, Hourglass, Trophy, Send, Sparkles, PenLine,
  ImageIcon, MessageSquareText, CloudUpload, BadgeCheck, Camera, PenTool,
} from "lucide-react";
import { fmtPoints } from "@/lib/utils";
import { ImageQueue, AttachedImages, uploadAnswerImage, type Queued } from "@/components/images";
import { MathKeyboard } from "@/components/math-keyboard";

type State = {
  session: { id: number; code: string; status: string; currentIndex: number; timeLimitSec: number };
  quizTitle: string;
  groupName: string;
  questionsCount: number;
  participantsCount: number;
  uploadLimits: { maxMb: number };
  currentQuestion: {
    id: number; type: string; prompt: string; points: number; options: string[];
    allowImages: boolean; maxImages: number; allowExplanation: boolean;
    promptImageIds?: number[];
    correctOption?: number;
    correctBool?: boolean;
    correctNumber?: string;
    acceptedAnswers?: string[];
  } | null;
  timeLeft: number | null;
  my: { totalPoints: number; correctCount: number; answeredCount: number; rank: number };
  mySubmission: {
    submissionId: number; isCorrect: boolean | null; awardedPoints: number; needsManual: boolean;
    graded: boolean; reviewStatus: string; gradeReleased: boolean; feedback: string;
    imagesCount: number; imageIds: number[];
    annotatedImageIds?: number[];
  } | null;
  ended: null | {
    leaderboard: { rank: number; name: string; totalPoints: number; me: boolean }[];
    myResults: {
      submissionId: number; prompt: string; points: number; awardedPoints: number;
      isCorrect: boolean | null; needsManual: boolean; feedback: string;
      gradeReleased: boolean; reviewStatus: string; imagesCount: number;
    }[];
  };
};

function StatusChip({ children, tone }: { children: React.ReactNode; tone: "gold" | "green" | "violet" | "rose" | "stone" }) {
  const styles = {
    gold: "bg-amber-50 text-amber-700 ring-amber-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    stone: "bg-stone-100 text-stone-600 ring-stone-200",
  } as const;
  return <span className={`chip ring-1 ${styles[tone]}`}>{children}</span>;
}

export function LiveStudentPlayer({ sessionId }: { sessionId: number; studentName: string }) {
  const [st, setSt] = useState<State | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state?for=student`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر التحميل");
      setSt(data);
      setErr(""); // Clear error on success
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [sessionId]);

  const [displayLeft, setDisplayLeft] = useState<number | null>(null);
  
  useEffect(() => {
    setDisplayLeft(st?.timeLeft ?? null);
  }, [st?.timeLeft]);

  useEffect(() => {
    setQueue([]);
  }, [st?.currentQuestion?.id]);

  useEffect(() => {
    if (displayLeft === null || displayLeft <= 0) return;
    const t = setInterval(() => setDisplayLeft((v) => (v && v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [displayLeft !== null]);

  /** Create the submission, then upload any queued photos. */
  async function submit(payload: any, photos: Queued[]) {
    if (busy) return;
    setBusy(true);
    setErr("");
    setUploadErr("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId: st?.currentQuestion?.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الإرسال");

      if (photos.length > 0) {
        setUploadPct(0);
        let sent = 0;
        for (const ph of photos) {
          await uploadAnswerImage(data.submissionId, ph.blob, (p) => setUploadPct(Math.round(((sent + p / 100) / photos.length) * 100)));
          sent++;
        }
        setUploadPct(100);
      }
      setQueue([]);
      await load();
    } catch (e: any) {
      if (photos.length > 0 && uploadPct !== null) setUploadErr(e.message || "تعذّر رفع الصورة، يرجى المحاولة مجددًا");
      else setErr(e.message);
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  }

  if (err && !st) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-4">
        <div className="card max-w-md text-center">
          <p className="text-sm font-black text-rose-600">{err}</p>
          <Link href="/student" className="btn-ghost mt-4">عودة لحسابي</Link>
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

  const q = st.currentQuestion;

  /* ─────────── ENDED ─────────── */
  if (st.session.status === "ended" && st.ended) {
    const myTotal = st.ended.myResults.reduce((a, r) => a + r.awardedPoints, 0);
    const maxPossible = st.ended.myResults.reduce((a, r) => a + r.points, 0);
    const pct = maxPossible > 0 ? Math.round((myTotal / maxPossible) * 100) : 0;
    const rank = st.my.rank || 0;

    // رسائل تحفيزية حسب الأداء
    let congratMsg = "";
    let congratIcon = "";
    if (rank === 1) {
      congratMsg = "مبروك! أنت بطل هذه الجلسة — أداء استثنائي يستحق الفخر!";
      congratIcon = "🏆";
    } else if (rank === 2) {
      congratMsg = "أحسنت! المركز الثاني — أنت قريب جداً من القمة، واصل التألق!";
      congratIcon = "🥈";
    } else if (rank === 3) {
      congratMsg = "ممتاز! المركز الثالث — أداء رائع يدل على مجهود حقيقي!";
      congratIcon = "🥉";
    } else if (pct >= 80) {
      congratMsg = "أداء متميز! نتيجة ممتازة تدل على فهم عميق للدرس.";
      congratIcon = "⭐";
    } else if (pct >= 60) {
      congratMsg = "عمل جيد! واصل بنفس الحماس وستصل للقمة.";
      congratIcon = "👏";
    } else if (pct >= 40) {
      congratMsg = "بداية جيدة! راجع الدرس وستتحسن في المرة القادمة.";
      congratIcon = "💪";
    } else {
      congratMsg = "لا تستسلم! كل محاولة هي خطوة نحو النجاح.";
      congratIcon = "📚";
    }

    return (
      <main className="ink-bg min-h-screen px-3 sm:px-4 py-8 sm:py-10 overflow-x-hidden">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <Sparkles className="mx-auto text-amber-300" size={36} />
            <h1 className="font-display mt-3 text-2xl sm:text-3xl font-black text-white">انتهت الجلسة!</h1>
            <p className="mt-1 text-sm font-bold text-amber-100/70">{st.quizTitle} · {st.groupName}</p>
            <div className="mx-auto mt-4 flex w-fit items-center gap-4 sm:gap-6 rounded-3xl bg-white/10 px-5 sm:px-8 py-3 sm:py-4 ring-1 ring-white/15">
              <div className="text-center">
                <p className="text-[10px] font-bold text-amber-100/70">نتيجتك</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-300" dir="ltr">{fmtPoints(myTotal)}/{maxPossible}</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-white/15" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-amber-100/70">ترتيبك</p>
                <p className="text-2xl sm:text-3xl font-black text-white">#{rank || "—"}</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-white/15" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-amber-100/70">النسبة</p>
                <p className={`text-2xl sm:text-3xl font-black ${pct >= 60 ? "text-emerald-400" : pct >= 40 ? "text-amber-300" : "text-rose-400"}`} dir="ltr">{pct}%</p>
              </div>
            </div>

            {/* رسالة تحفيزية */}
            <div className="mt-5 rounded-2xl bg-white/[0.08] px-5 py-4 ring-1 ring-white/10">
              <p className="text-2xl mb-2">{congratIcon}</p>
              <p className="text-sm font-black text-white leading-relaxed">{congratMsg}</p>
            </div>
          </div>

          <div className="card mt-6">
            <h2 className="flex items-center gap-2 text-base font-black text-stone-900"><Trophy size={17} className="text-amber-500" /> ترتيب الجلسة</h2>
            <div className="mt-3 space-y-2">
              {st.ended.leaderboard.map((p) => (
                <div key={p.rank} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${p.me ? "bg-gradient-to-l from-[#b8921f] to-[#d4af37] text-white" : "bg-stone-50"}`}>
                  <span className="font-black">#{p.rank} · {p.name}{p.me ? " (أنت)" : ""}</span>
                  <span className={`font-black ${p.me ? "text-amber-100" : "text-[#b8921f]"}`}>{fmtPoints(p.totalPoints)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-5">
            <h2 className="text-base font-black text-stone-900">مراجعة إجاباتك</h2>
            <div className="mt-3 space-y-2.5">
              {st.ended.myResults.length === 0 && <p className="text-xs font-bold text-stone-400">لم ترسل إجابات في هذه الجلسة.</p>}
              {st.ended.myResults.map((r, i) => (
                <div key={i} className="rounded-2xl bg-stone-50 px-4 py-3">
                  <p className="w-full text-xs font-bold text-stone-600 leading-6 break-all overflow-hidden mb-2 whitespace-pre-wrap">{r.prompt}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.imagesCount > 0 && (
                      <StatusChip tone="stone"><ImageIcon size={11} /> {r.imagesCount}</StatusChip>
                    )}
                    {r.reviewStatus === "graded" && !r.needsManual ? (
                      <StatusChip tone="green"><BadgeCheck size={11} /> تم التصحيح</StatusChip>
                    ) : r.needsManual || r.reviewStatus === "pending" ? (
                      <StatusChip tone="violet"><PenLine size={11} /> بانتظار التصحيح</StatusChip>
                    ) : null}
                    {!r.needsManual && (
                      r.isCorrect ? (
                        <StatusChip tone="green"><CheckCircle2 size={11} /> +{fmtPoints(r.awardedPoints)}/{r.points}</StatusChip>
                      ) : (
                        <StatusChip tone="rose"><XCircle size={11} /> {fmtPoints(r.awardedPoints)}/{r.points}</StatusChip>
                      )
                    )}
                  </div>
                  {r.gradeReleased && r.feedback && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
                      <MessageSquareText size={13} className="mt-0.5 shrink-0" /> ملاحظة الأستاذ: {r.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Link href="/student" className="btn-primary mt-5 w-full">عودة إلى حسابي</Link>
          </div>
        </div>
      </main>
    );
  }

  /* ─────────── LOBBY ─────────── */
  if (st.session.status === "lobby" || !q) {
    return (
      <main className="ink-bg grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
            <Hourglass className="animate-pulse text-amber-300" size={34} />
          </div>
          <h1 className="font-display text-2xl font-black text-white">بانتظار بدء الجلسة...</h1>
          <p className="mt-2 text-sm font-bold text-amber-100/70">{st.quizTitle} · انضم معك {st.participantsCount} تلميذ</p>
          <p className="mt-6 rounded-2xl bg-white/10 px-5 py-2.5 text-xs font-black tracking-[0.3em] text-amber-300 ring-1 ring-white/15" dir="auto">{st.session.code}</p>
        </div>
      </main>
    );
  }

  /* ─────────── ACTIVE QUESTION ─────────── */
  const sub = st.mySubmission;
  const submitted = !!sub;
  const canAttachMore = submitted && q.type === "manual" && sub!.imagesCount < q.maxImages && st.session.status === "active";
  const writtenTypes = ["numeric", "short", "manual"];

  function writtenSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const textVal = q!.type === "numeric" ? String(fd.get("n") ?? "") : String(fd.get("t") ?? "");
    
    if (q!.type === "manual") {
      // سؤال يدوي: يكفي إرفاق صور فقط بدون أي نص
      if (!textVal.trim() && queue.length === 0) {
        setErr("أرفق صورة لإجابتك أو اكتب حلًا");
        return;
      }
    } else if (q!.type === "numeric") {
      if (!textVal.trim()) {
        setErr("اكتب الإجابة الرقمية");
        return;
      }
    } else {
      if (!textVal.trim()) {
        setErr("اكتب إجابتك");
        return;
      }
    }
    
    if (q!.type === "numeric") submit({ answerNumber: textVal, answerText: String(fd.get("t") ?? "") || null }, queue);
    else submit({ answerText: textVal || "(إجابة مصوّرة)" }, queue);
  }

  return (
    <main className="ink-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="chip bg-white/10 text-amber-100 ring-1 ring-white/15">
            سؤال {st.session.currentIndex + 1} / {st.questionsCount}
          </span>
          <div className="flex items-center gap-3 text-xs font-black">
            <span className="text-amber-300" dir="auto">{fmtPoints(st.my.totalPoints)} نقطة</span>
            <span className="text-amber-100/70">#{st.my.rank || "—"}</span>
          </div>
        </div>

        {displayLeft !== null && (
          <div className="mt-4 flex items-center gap-3">
            <Timer size={16} className={displayLeft <= 10 ? "text-rose-400" : "text-amber-200/70"} />
            <div className="pbar flex-1 !bg-white/10">
              <span
                className={displayLeft <= 10 ? "!from-rose-500 !to-rose-400" : ""}
                style={{ width: `${Math.min(100, (displayLeft / (st.session.timeLimitSec || 60)) * 100)}%` }}
              />
            </div>
            <span className={`text-sm font-black ${displayLeft <= 10 ? "text-rose-400" : "text-white"}`} dir="auto">{displayLeft}</span>
          </div>
        )}

          <div key={q.id} className="animate-pop mt-6 rounded-[2rem] bg-white p-5 sm:p-8 shadow-2xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200">هذا السؤال بـ {q.points} درجة</span>
            {q.type === "manual" && (
              <span className="chip bg-stone-100 text-stone-600 ring-1 ring-stone-200"><Camera size={11} /> أرفق إجابتك مصوّرة</span>
            )}
          </div>
          <p className="mt-4 font-display text-xl font-black leading-relaxed text-stone-900 sm:text-2xl sm:leading-relaxed whitespace-pre-wrap break-words" dir="auto">{q.prompt}</p>
          {/* question prompt images (teacher-uploaded) */}
          {q.promptImageIds && q.promptImageIds.length > 0 && (
            <div className="mt-4 space-y-2">
              {q.promptImageIds.map((imgId) => (
                <div key={imgId} className="overflow-hidden rounded-2xl ring-1 ring-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/question-images/${imgId}`} alt="صورة السؤال" className="max-h-64 w-full object-contain bg-stone-50" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {submitted ? (
            <div className="animate-pop mt-6">
              <div className={`rounded-3xl p-5 text-center ring-1 ${sub.needsManual ? "bg-violet-50 ring-violet-200" : sub.isCorrect ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
                {sub.needsManual ? (
                  <>
                    <PenLine size={30} className="mx-auto text-violet-500" />
                    <p className="mt-2 text-sm font-black text-stone-800">تم إرسال الإجابة بنجاح</p>
                    <p className="mt-1 text-xs font-bold text-violet-600">الإجابة بانتظار التصحيح — ستظهر الدرجة بعد مراجعة الأستاذ</p>
                  </>
                ) : sub.isCorrect ? (
                  <>
                    <CheckCircle2 size={34} className="mx-auto text-emerald-500" />
                    <p className="mt-2 text-sm font-black text-emerald-600">إجابة صحيحة! +{fmtPoints(sub.awardedPoints)} درجة</p>
                    {/* ─── عرض الإجابة الصحيحة للتأكيد ─── */}
                    {q.type !== "manual" && (
                      <div className="mt-4 rounded-2xl bg-stone-50 border border-stone-100 px-4 py-3 text-right">
                         <p className="text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-wider text-center">تأكيد الإجابة الصحيحة</p>
                         <div className="text-center font-black text-emerald-600">
                           {q.type === "mcq" && q.options && q.correctOption !== undefined && (
                             <span>{["أ","ب","ج","د","هـ","و"][q.correctOption as number] ?? (q.correctOption! + 1)} — {q.options[q.correctOption as number]}</span>
                           )}
                           {q.type === "tf" && q.correctBool !== undefined && (
                             <span>{q.correctBool ? "صواب ✓" : "خطأ ✗"}</span>
                           )}
                           {q.type === "numeric" && q.correctNumber && (
                             <span dir="auto">{q.correctNumber}</span>
                           )}
                           {q.type === "short" && q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                             <span className="leading-relaxed">{q.acceptedAnswers[0]}</span>
                           )}
                         </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle size={34} className="mx-auto text-rose-400" />
                    <p className="mt-2 text-sm font-black text-rose-500">إجابة غير صحيحة هذه المرة</p>
                    {/* ─── عرض الإجابة الصحيحة ─── */}
                    {q.type !== "manual" && (
                      <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-right">
                        <p className="text-[11px] font-black text-emerald-700 mb-1 text-center">الإجابة الصحيحة كانت:</p>
                        <div className="text-center font-black text-emerald-800">
                          {q.type === "mcq" && q.options && q.correctOption !== undefined && (
                            <span>{["أ","ب","ج","د","هـ","و"][q.correctOption as number] ?? (q.correctOption! + 1)} — {q.options[q.correctOption as number]}</span>
                          )}
                          {q.type === "tf" && q.correctBool !== undefined && (
                            <span>{q.correctBool ? "صواب ✓" : "خطأ ✗"}</span>
                          )}
                          {q.type === "numeric" && q.correctNumber && (
                            <span dir="auto">{q.correctNumber}</span>
                          )}
                          {q.type === "short" && q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                            <span className="leading-relaxed">{q.acceptedAnswers[0]}</span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="mt-4 text-xs font-bold text-stone-400">واصل التركيز — القادم أفضل</p>
                  </>
                )}
              </div>

              {q.type === "manual" && (sub.imagesCount > 0 || canAttachMore) && (
                <div className="space-y-2">
                  {sub.annotatedImageIds && sub.annotatedImageIds.length > 0 && sub.gradeReleased && (
                    <div className="mt-3 p-3 bg-[#b8921f]/10 rounded-2xl ring-1 ring-[#b8921f]/30">
                      <p className="text-[11px] font-black text-[#b8921f] flex items-start gap-1.5 leading-5">
                        <PenTool size={13} className="shrink-0 mt-0.5" />
                        <span>الأستاذ وضع تصحيحات يدوية على صور إجابتك. اضغط على الصور أدناه لمشاهدتها.</span>
                      </p>
                    </div>
                  )}
                  <AttachedImages
                    key={`${sub.submissionId}-${sub.imagesCount}`}
                    submissionId={sub.submissionId}
                    imageIds={sub.imageIds}
                    annotatedImageIds={sub.annotatedImageIds}
                    maxImages={q.maxImages}
                    maxMb={st.uploadLimits.maxMb}
                    sessionOpen={st.session.status === "active"}
                    onChanged={load}
                  />
                </div>
              )}

              {sub.gradeReleased && sub.feedback && (
                <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800 ring-1 ring-amber-200">
                  <MessageSquareText size={15} className="mt-0.5 shrink-0" /> ملاحظة الأستاذ: {sub.feedback}
                </p>
              )}
              <p className="mt-4 text-center text-[11px] font-bold text-stone-400">انتظر السؤال التالي من الأستاذ...</p>
            </div>
          ) : (
            <form className="mt-6" onSubmit={writtenSubmit}>
              {!submitted && (
                <p className="mb-3 text-center text-[11px] font-bold text-stone-400">لم يتم إرسال الإجابة</p>
              )}

              {q.type === "mcq" && (
                <div className="grid gap-2.5">
                  {q.options.map((o, i) => (
                    <button
                      type="button"
                      key={i}
                      disabled={busy}
                      onClick={() => submit({ answerOption: i }, [])}
                      className="group flex items-center gap-3 rounded-2xl bg-stone-50 px-5 py-4 text-right ring-1 ring-stone-200 transition-all hover:bg-amber-50 hover:ring-amber-300 active:scale-[0.98]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-stone-400 ring-1 ring-stone-200 transition-colors group-hover:bg-[#b8921f] group-hover:text-white group-hover:ring-[#b8921f]">
                        {["أ", "ب", "ج", "د", "هـ", "و"][i] ?? i + 1}
                      </span>
                      <span className="text-sm font-black text-stone-700" dir="auto">{o}</span>
                    </button>
                  ))}
                </div>
              )}

              {q.type === "tf" && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={busy} onClick={() => submit({ answerBool: true }, [])}
                    className="rounded-2xl bg-emerald-50 px-5 py-6 text-lg font-black text-emerald-700 ring-1 ring-emerald-200 transition-all hover:bg-emerald-100 active:scale-[0.98]">
                    صواب
                  </button>
                  <button type="button" disabled={busy} onClick={() => submit({ answerBool: false }, [])}
                    className="rounded-2xl bg-rose-50 px-5 py-6 text-lg font-black text-rose-600 ring-1 ring-rose-200 transition-all hover:bg-rose-100 active:scale-[0.98]">
                    خطأ
                  </button>
                </div>
              )}

              {writtenTypes.includes(q.type) && (
                <div className="space-y-4">
                  {q.type === "numeric" && (
                    <input name="n" dir="auto" inputMode="decimal" autoComplete="off" className="input !py-4 text-center text-xl font-black" placeholder="اكتب الناتج" />
                  )}

                  {q.type === "short" && (
                    <div className="flex flex-col">
                      <MathKeyboard targetId={`student-short-${q.id}`} />
                      <textarea 
                        id={`student-short-${q.id}`} 
                        name="t" 
                        rows={3} 
                        className="input !py-4 !rounded-t-none math-field" 
                        dir="auto"
                        placeholder="اكتب إجابتك هنا..." 
                      />
                    </div>
                  )}

                  {q.type === "manual" && (
                    <>
                      {/* الصور أولاً — هي الإجابة الأساسية */}
                      <ImageQueue
                        key={q.id}
                        maxImages={q.maxImages}
                        maxMb={st.uploadLimits.maxMb}
                        onQueue={setQueue}
                        disabled={busy}
                      />
                      {/* الشرح المكتوب اختياري تمامًا */}
                      <div className="flex flex-col mt-4">
                        <label className="label">شرح مكتوب (اختياري)</label>
                        <MathKeyboard targetId={`student-manual-${q.id}`} />
                        <textarea 
                          id={`student-manual-${q.id}`} 
                          name="t" 
                          rows={3} 
                          className="input !rounded-t-none math-field" 
                          dir="auto"
                          placeholder="يمكنك إضافة ملاحظة أو كتابة خطوات الحل هنا..." 
                        />
                      </div>
                    </>
                  )}

                  {uploadPct !== null && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-stone-500">
                        <CloudUpload size={13} className="animate-bounce" /> جارٍ رفع الصورة... {uploadPct}%
                      </p>
                      <div className="pbar"><span style={{ width: `${uploadPct}%` }} /></div>
                    </div>
                  )}
                  {uploadErr && (
                    <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">{uploadErr}</p>
                  )}
                  <button className="btn-primary w-full !py-4 !text-base" disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={17} />} إرسال الإجابة
                  </button>
                </div>
              )}
            </form>
          )}

          {err && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs font-bold text-rose-600 break-words">{err}</p>}
        </div>

        <p className="mt-6 text-center text-[11px] font-bold text-amber-100/40">إجابة واحدة فقط لكل سؤال — لا يمكن تعديل النص بعد الإرسال</p>
      </div>
    </main>
  );
}
