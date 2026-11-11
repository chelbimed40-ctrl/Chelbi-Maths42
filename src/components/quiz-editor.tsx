"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Trash2, ArrowUp, ArrowDown, Pencil, X, CheckCircle2, Circle, BadgeHelp,
  Camera, ImagePlus,
} from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/utils";
import { MathKeyboard, MiniMathBar } from "@/components/math-keyboard";

export interface QRow {
  id: number;
  quizId: number;
  orderIndex: number;
  type: string;
  prompt: string;
  points: number;
  options: string[] | null;
  correctOption: number | null;
  correctBool: boolean | null;
  correctNumber: string | null;
  tolerance: string | null;
  acceptedAnswers: string[] | null;
  allowImages: boolean;
  maxImages: number;
  allowExplanation: boolean;
  promptImageIds: number[];
}

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || "حدث خطأ");
  return data as any;
}

function correctSummary(q: QRow): string {
  if (q.type === "mcq" && q.options && q.correctOption !== null) return `الإجابة: ${q.options[q.correctOption]}`;
  if (q.type === "tf") return q.correctBool ? "صواب" : "خطأ";
  if (q.type === "numeric") return `${q.correctNumber}${Number(q.tolerance) ? ` (±${q.tolerance})` : ""}`;
  if (q.type === "short" && q.acceptedAnswers?.length) return q.acceptedAnswers.join("، ");
  return "يدوي";
}

/* ────── Prompt image uploader on existing question card ────── */
function PromptImageUploader({ questionId, existingIds, onChanged }: { questionId: number; existingIds: number[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setErr("");
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.set("questionId", String(questionId));
        fd.set("file", f);
        const res = await fetch("/api/question-images", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "فشل رفع الصورة");
      }
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(imgId: number) {
    setBusy(true);
    try {
      await call("/api/question-images", "DELETE", { imageId: imgId });
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {existingIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {existingIds.map((id) => (
            <div key={id} className="group relative overflow-hidden rounded-xl ring-1 ring-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/question-images/${id}`} alt="صورة السؤال" className="h-16 w-16 object-cover" />
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={busy}
                className="absolute top-0.5 left-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {existingIds.length < 4 && (
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn-ghost btn-sm">
          <ImagePlus size={13} className="text-[#b8921f]" /> إضافة صورة للسؤال
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      {err && <p className="mt-1 text-[11px] font-bold text-rose-600">{err}</p>}
    </div>
  );
}

export function QuizEditor({ quizId, questions }: { quizId: number; questions: QRow[] }) {
  const router = useRouter();
  const [type, setType] = useState("mcq");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<QRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const currentCount = (editing?.promptImageIds.length || 0) + pendingImages.length;
    const slots = 4 - currentCount;
    if (slots <= 0) return;
    const newFiles = Array.from(files).slice(0, slots);
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setPendingImages((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previewUrls[i]);
    setPendingImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  function clearFiles() {
    previewUrls.forEach(URL.revokeObjectURL);
    setPendingImages([]);
    setPreviewUrls([]);
  }

  async function submitQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const t = editing?.type ?? type;
    const promptText = String(fd.get("prompt") ?? "").trim();
    const hasImages = (editing && editing.promptImageIds.length > 0) || pendingImages.length > 0;
    if (!promptText && !hasImages) {
      setErr("اكتب نص السؤال أو أرفق صورة للسؤال");
      return;
    }
    const payload: any = {
      type: t,
      prompt: promptText || "(سؤال مصوّر)",
      points: fd.get("points"),
      allowImages: fd.get("allowImages") === "on",
      maxImages: Number(fd.get("maxImages")) || 3,
      allowExplanation: fd.get("allowExplanation") === "on",
    };
    if (t === "mcq") {
      payload.options = ["o0", "o1", "o2", "o3", "o4", "o5"].map((k) => fd.get(k)).filter((v) => typeof v === "string" && v.trim());
      payload.correctOption = Number(fd.get("correctOption"));
    } else if (t === "tf") {
      payload.correctBool = fd.get("correctBool") === "true";
    } else if (t === "numeric") {
      payload.correctNumber = fd.get("correctNumber");
      payload.tolerance = fd.get("tolerance");
    } else if (t === "short") {
      payload.acceptedAnswers = fd.get("acceptedAnswers");
    }
    setBusy(true);
    setErr("");
    try {
      let currentQId = editing?.id;
      if (editing) {
        payload.questionId = editing.id;
        await call(`/api/quizzes/${quizId}/questions`, "PATCH", payload);
      } else {
        const res = await call(`/api/quizzes/${quizId}/questions`, "POST", payload);
        currentQId = res.id;
      }
      if (pendingImages.length > 0 && currentQId) {
        for (const f of pendingImages) {
          const fdImg = new FormData();
          fdImg.set("questionId", String(currentQId));
          fdImg.set("file", f);
          await fetch("/api/question-images", { method: "POST", body: fdImg });
        }
      }
      form.reset();
      setEditing(null);
      clearFiles();
      setFormKey((k) => k + 1);
      router.refresh();
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function reorder(q: QRow, dir: "up" | "down") {
    await call(`/api/quizzes/${quizId}/questions`, "PATCH", { questionId: q.id, action: dir });
    router.refresh();
  }

  async function remove(q: QRow) {
    if (!confirm("حذف هذا السؤال؟")) return;
    await call(`/api/quizzes/${quizId}/questions`, "DELETE", { questionId: q.id });
    router.refresh();
  }

  const shownType = editing?.type ?? type;
  const totalImgCount = (editing?.promptImageIds.length || 0) + pendingImages.length;

  return (
    <div className="space-y-4">
      {/* ━━━ بطاقات الأسئلة الموجودة ━━━ */}
      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 py-8 text-center text-sm font-black text-stone-400">
            لا توجد أسئلة بعد
          </div>
        )}
        {questions.map((q, i) => (
          <div key={q.id} className="card !p-4">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-xs font-black text-[#b8921f]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-6 text-stone-800 break-words" dir="auto">{q.prompt}</p>
                {q.promptImageIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.promptImageIds.map((imgId) => (
                      <div key={imgId} className="overflow-hidden rounded-lg ring-1 ring-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/question-images/${imgId}`} alt="صورة السؤال" className="h-16 max-w-[120px] object-contain bg-stone-50" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="chip bg-stone-100 text-stone-500">{QUESTION_TYPE_LABELS[q.type]}</span>
                  <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-100">{q.points} د</span>
                  {q.promptImageIds.length > 0 && <span className="chip bg-blue-50 text-blue-700 ring-1 ring-blue-200"><Camera size={10} /> {q.promptImageIds.length}</span>}
                  {q.allowImages && <span className="chip bg-stone-100 text-stone-500">إجابة مصوّرة</span>}
                </div>
                <PromptImageUploader questionId={q.id} existingIds={q.promptImageIds} onChanged={() => router.refresh()} />
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button type="button" className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600" onClick={() => reorder(q, "up")}><ArrowUp size={14} /></button>
                <button type="button" className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600" onClick={() => reorder(q, "down")}><ArrowDown size={14} /></button>
                <button type="button" className="rounded-lg p-1.5 text-stone-300 hover:bg-amber-50 hover:text-[#b8921f]" onClick={() => { setEditing(q); clearFiles(); setFormKey((k) => k + 1); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }}><Pencil size={14} /></button>
                <button type="button" className="rounded-lg p-1.5 text-stone-300 hover:bg-rose-50 hover:text-rose-500" onClick={() => remove(q)}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ نموذج إضافة / تعديل سؤال ━━━ */}
      <form key={`${formKey}-${editing?.id ?? "new"}`} onSubmit={submitQuestion} className="card">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-stone-900 sm:text-base">
            <BadgeHelp size={18} className="text-[#b8921f]" /> {editing ? `تعديل السؤال ${editing.orderIndex + 1}` : "إضافة سؤال جديد"}
          </h3>
          {editing && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditing(null); clearFiles(); setFormKey((k) => k + 1); }}>
              <X size={13} /> إلغاء
            </button>
          )}
        </div>

        {/* اختيار نوع السؤال */}
        {!editing && (
          <div className="mt-3 grid grid-cols-5 gap-1 rounded-xl bg-stone-50 p-1 ring-1 ring-stone-100 sm:flex sm:flex-wrap sm:gap-1.5 sm:p-1.5">
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setType(k)}
                className={`rounded-lg px-2 py-2 text-[10px] font-bold transition-all sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-xs ${
                  type === k ? "bg-white text-[#b8921f] shadow ring-1 ring-stone-200" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* الدرجة */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs font-black text-stone-600">درجة السؤال:</label>
          <input name="points" type="number" required min={1} max={100} defaultValue={editing?.points ?? 1} className="input !w-20 !py-2 text-center font-black" dir="auto" />
        </div>

        {/* ═══ نص السؤال + صورة السؤال: side-by-side على الحاسوب، فوق-تحت على الجوال ═══ */}
        <div className="mt-3 grid gap-3 md:grid-cols-2">

          {/* ── الجانب الأيمن: نص السؤال ── */}
          <div className="flex flex-col">
            <label className="label">نص السؤال</label>
            <MathKeyboard targetId={`prompt-textarea-${editing?.id ?? "new"}`} />
            <textarea
              id={`prompt-textarea-${editing?.id ?? "new"}`}
              name="prompt"
              rows={4}
              className="input flex-1 resize-none !rounded-t-none math-field"
              dir="auto"
              defaultValue={editing?.prompt ?? ""}
              placeholder="اكتب نص السؤال هنا... (مثال: 7 + 45 + 4)"
            />
          </div>

          {/* ── الجانب الأيسر: صورة السؤال ── */}
          <div>
            <label className="label">صورة السؤال (اختياري)</label>
            <div className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200 min-h-[120px]">
              {/* صور موجودة (تعديل) + صور جديدة (معاينة) */}
              {totalImgCount > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2 sm:grid-cols-4">
                  {editing?.promptImageIds.map((id) => (
                    <div key={id} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-stone-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/question-images/${id}`} alt="صورة" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg ring-2 ring-amber-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="معاينة" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-0.5 left-0.5 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-white"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* أزرار رفع الصور — كبيرة وواضحة للجوال */}
              {totalImgCount < 4 && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white py-4 text-xs font-bold text-stone-600 ring-1 ring-stone-200 active:bg-stone-100 sm:py-3"
                  >
                    <Camera size={20} className="text-[#b8921f]" />
                    <span>التقاط صورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white py-4 text-xs font-bold text-stone-600 ring-1 ring-stone-200 active:bg-stone-100 sm:py-3"
                  >
                    <ImagePlus size={20} className="text-[#b8921f]" />
                    <span>اختيار صورة</span>
                  </button>
                </div>
              )}
              <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <p className="mt-2 text-center text-[10px] font-bold text-stone-400">
                {totalImgCount > 0 ? `${totalImgCount} / 4 صور` : "صوّر السؤال من الكتاب أو ارفعه من المعرض"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ إعدادات حسب نوع السؤال ═══ */}
        {shownType === "mcq" && (
          <div className="mt-3 space-y-3">
            {(editing?.options ?? ["", "", "", ""]).concat(["", ""]).slice(0, 6).map((opt, i) => (
              <div key={i} className="rounded-xl bg-stone-50/50 p-2 ring-1 ring-stone-100">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-[10px] font-black text-stone-400">{i + 1}</span>
                  <input 
                    id={`option-input-${i}`}
                    name={`o${i}`} 
                    className="input !py-2 math-field" 
                    dir="auto"
                    defaultValue={opt} 
                    placeholder={i < 2 ? `الاختيار ${i + 1} (مطلوب)` : `اختياري`} 
                  />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <input type="radio" name="correctOption" value={i} required defaultChecked={editing?.correctOption === i} className="accent-emerald-600" />
                    صحيح
                  </label>
                </div>
                <MiniMathBar targetId={`option-input-${i}`} />
              </div>
            ))}
          </div>
        )}

        {shownType === "tf" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ v: "true", l: "صواب" }, { v: "false", l: "خطأ" }].map(({ v, l }) => (
              <label key={v} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-50 px-4 py-3 text-sm font-black text-stone-600 ring-1 ring-stone-200 has-checked:bg-amber-50 has-checked:text-amber-700 has-checked:ring-amber-300">
                <input type="radio" name="correctBool" value={v} required defaultChecked={String(editing?.correctBool ?? "") === v} className="accent-[#b8921f]" />
                {l}
              </label>
            ))}
          </div>
        )}

        {shownType === "numeric" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="label">الإجابة الصحيحة</label>
              <input name="correctNumber" required className="input" dir="auto" defaultValue={editing?.correctNumber ?? ""} placeholder="56" />
            </div>
            <div>
              <label className="label">هامش الخطأ ±</label>
              <input name="tolerance" className="input" dir="auto" defaultValue={editing?.tolerance ?? "0"} placeholder="0" />
            </div>
          </div>
        )}

        {shownType === "short" && (
          <div className="mt-3">
            <label className="label">الإجابات المقبولة (كل سطر = إجابة)</label>
            <textarea name="acceptedAnswers" required rows={3} className="input" defaultValue={editing?.acceptedAnswers?.join("\n") ?? ""} placeholder={"الوتر\nوتر المثلث"} />
          </div>
        )}

        {shownType === "manual" && (
          <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2.5 text-[11px] font-bold leading-5 text-violet-700 ring-1 ring-violet-100">
            سؤال للإجابة الحرة — ستراجع الإجابات يدويًا وتحدد الدرجة.
          </p>
        )}

        {/* إعدادات إجابة التلميذ بالصورة - متاحة الآن لجميع أنواع الأسئلة */}
        <div className="mt-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
          <p className="mb-2 text-[11px] font-black text-stone-600">إعدادات إجابة التلميذ (إضافية لجميع أنواع الأسئلة)</p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-stone-700">
              <input type="checkbox" name="allowImages" defaultChecked={editing?.allowImages ?? shownType === "manual"} className="h-4 w-4 accent-[#b8921f]" />
              السماح بإرفاق صور للإجابة (مثال: برهان مكتوب يدويًا بجانب الإجابة الآلية)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-stone-700">
              <input type="checkbox" name="allowExplanation" defaultChecked={editing?.allowExplanation ?? true} className="h-4 w-4 accent-[#b8921f]" />
              السماح بشرح مكتوب
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-700">عدد صور الإجابة:</span>
              <input name="maxImages" type="number" min={1} max={6} defaultValue={editing?.maxImages ?? 3} className="input !w-14 !px-2 !py-1 text-center" dir="auto" />
            </div>
          </div>
        </div>

        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">{err}</p>}

        <button className="btn-primary mt-4 w-full !py-3.5" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : editing ? <Pencil size={16} /> : <Plus size={16} />}
          {editing ? "حفظ التعديلات" : "إضافة السؤال"}
        </button>
      </form>
    </div>
  );
}
