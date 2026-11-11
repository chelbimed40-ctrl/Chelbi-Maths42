"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Download, Loader2, MessageSquareText, RotateCcw, Save,
  User, Users, ClipboardList, Hash, CalendarClock, BadgeCheck, Hourglass,
} from "lucide-react";
import { ZoomableImage, AnnotatableImage } from "@/components/images";
import { QUESTION_TYPE_LABELS, fmtPoints } from "@/lib/utils";

export interface ReviewCard {
  submissionId: number;
  studentName: string;
  groupName: string;
  quizTitle: string;
  sessionCode: string;
  sessionId: number;
  sessionStatus: string;
  prompt: string;
  qPoints: number;
  qType: string;
  explanation: string | null;
  awardedPoints: number;
  needsManual: boolean;
  reviewStatus: string;
  gradeReleased: boolean;
  feedback: string;
  submittedAt: string;
  imagesCount: number;
  imageIds: number[];
}

function SubmissionCard({ card }: { card: ReviewCard }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(String(card.awardedPoints || ""));
  const [feedback, setFeedback] = useState(card.feedback || "");
  const [release, setRelease] = useState(card.gradeReleased);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    setSavedMsg("");
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: card.submissionId, awardedPoints: score, feedback, release }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الحفظ");
      setSavedMsg("تم حفظ التصحيح بنجاح");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestResubmit() {
    if (!confirm("طلب إعادة التسليم؟ سيتمكن التلميذ من إرسال إجابة جديدة لهذا السؤال أثناء الجلسة.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: card.submissionId, action: "resubmit" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر التنفيذ");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const date = new Date(card.submittedAt);
  const graded = card.reviewStatus === "graded";

  return (
    <div className="card !p-0 overflow-hidden">
      {/* info header */}
      <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-stone-500">
          <span className="flex items-center gap-1 text-stone-800"><User size={13} className="text-[#b8921f]" /> {card.studentName}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {card.groupName}</span>
          <span className="flex items-center gap-1"><ClipboardList size={13} /> {card.quizTitle}</span>
          <span className="flex items-center gap-1" dir="ltr"><Hash size={13} /> {card.sessionCode}</span>
          <span className="flex items-center gap-1"><CalendarClock size={13} /> {date.toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
          <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200">{QUESTION_TYPE_LABELS[card.qType]} · {card.qPoints} درجة</span>
        </div>
        <p className="mt-2 text-sm font-black leading-7 text-stone-900" dir="auto">{card.prompt}</p>
        {card.explanation && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-6 text-stone-600 ring-1 ring-stone-200" dir="auto">
            <MessageSquareText size={14} className="mt-0.5 shrink-0 text-[#b8921f]" /> {card.explanation}
          </p>
        )}
        <div className="mt-2">
          {graded ? (
            <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><BadgeCheck size={12} /> تم التصحيح</span>
          ) : (
            <span className="chip bg-violet-50 text-violet-700 ring-1 ring-violet-200"><Hourglass size={12} /> بانتظار التصحيح</span>
          )}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.35fr_1fr]">
        {/* images or text-only */}
        <div className="p-4 sm:p-5">
          {card.imageIds.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-stone-500">الصورة {idx + 1} من {card.imageIds.length}</p>
                {card.imageIds.length > 1 && (
                  <div className="flex gap-1.5">
                    <button className="btn-ghost btn-sm" onClick={() => setIdx((i) => (i - 1 + card.imageIds.length) % card.imageIds.length)}><ChevronRight size={14} /></button>
                    <button className="btn-ghost btn-sm" onClick={() => setIdx((i) => (i + 1) % card.imageIds.length)}><ChevronLeft size={14} /></button>
                  </div>
                )}
              </div>
              <ZoomableImage key={card.imageIds[idx]} src={`/api/images/${card.imageIds[idx]}`} alt={`حل ${card.studentName} المكتوب`} />
              <AnnotatableImage 
                imageId={card.imageIds[idx]} 
                src={`/api/images/${card.imageIds[idx]}`} 
                alt="تصحيح يدوي" 
                onSaved={() => router.refresh()} 
              />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {card.imageIds.map((id, i) => (
                  <button key={id} onClick={() => setIdx(i)} className={`shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${i === idx ? "ring-[#d4af37]" : "ring-stone-200 opacity-70 hover:opacity-100"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/images/${id}`} alt={`صورة ${i + 1}`} className="h-16 w-16 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
              <a
                href={`/api/images/${card.imageIds[idx]}?download=1`}
                className="btn-ghost btn-sm mt-3"
              >
                <Download size={14} /> تحميل الصورة الحالية
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-bold text-stone-400">لم يرفق التلميذ صورًا لهذا السؤال</p>
              {card.explanation && (
                <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm font-bold text-stone-600 ring-1 ring-stone-200 w-full text-right" dir="auto">
                  {card.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* grading */}
        <div className="border-t border-stone-100 bg-stone-50/50 p-5 lg:border-t-0 lg:border-r">
          <h3 className="text-sm font-black text-stone-900">رصد الدرجة</h3>
          <p className="mb-3 text-[11px] font-bold text-stone-400">لا تُحتسب أي درجة تلقائيًا برفع الصورة — أنت من يقرر.</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="label">الدرجة المستحقة</label>
                <input
                  className="input text-center !py-3 text-lg font-black"
                  dir="ltr"
                  inputMode="decimal"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="pt-6 text-2xl font-black text-stone-300" dir="ltr">/ {card.qPoints}</div>
            </div>
            <div>
              <label className="label">ملاحظة أو تصويب للتلميذ</label>
              <textarea
                className="input"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="مثال: برهان صحيح، لكن راجع الخطوة الأخيرة في التعويض..."
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-stone-600">
              <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} className="h-4 w-4 accent-[#b8921f]" />
              إظهار الدرجة والملاحظة للتلميذ فور الحفظ
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn-primary flex-1" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} حفظ التصحيح
              </button>
              {card.sessionStatus !== "ended" && (
                <button className="btn-danger" onClick={requestResubmit} disabled={busy}>
                  <RotateCcw size={15} /> طلب إعادة تسليم
                </button>
              )}
            </div>
            {savedMsg && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{savedMsg}</p>}
            {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">{err}</p>}
            {card.awardedPoints > 0 && !savedMsg && (
              <p className="text-center text-[11px] font-bold text-stone-400">الدرجة المرصودة حاليًا: {fmtPoints(card.awardedPoints)} من {card.qPoints}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageReviewBoard({ cards }: { cards: ReviewCard[] }) {
  const pending = cards.filter((c) => c.reviewStatus !== "graded");
  const graded = cards.filter((c) => c.reviewStatus === "graded");
  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black text-stone-500">بانتظار المراجعة ({pending.length})</h2>
          <div className="space-y-5">
            {pending.map((c) => <SubmissionCard key={c.submissionId} card={c} />)}
          </div>
        </section>
      )}
      {graded.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black text-stone-500">مصحّحة ({graded.length})</h2>
          <div className="space-y-5">
            {graded.map((c) => <SubmissionCard key={c.submissionId} card={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
