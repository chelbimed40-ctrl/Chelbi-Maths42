"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Phone, ArrowRight, Loader2, CheckCircle2, KeyRound, MessageSquare } from "lucide-react";
import { BrandMark } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/teacher/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fd.get("phone") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر إرسال الطلب");
      if (data.resetUrl) setResetUrl(data.resetUrl);
      setDone(true);
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ink-bg grid min-h-screen place-items-center px-3 py-8 overflow-x-hidden">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark dark size="lg" />
        </div>
        <div className="card !p-5 sm:!p-8">
          {!done ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Phone size={22} />
                </span>
                <div>
                  <h1 className="text-lg font-black text-slate-900">استرجاع كلمة المرور</h1>
                  <p className="text-xs font-bold text-slate-400">أدخل رقم الهاتف المرتبط بحسابك</p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">رقم الهاتف</label>
                  <input name="phone" className="input" required dir="ltr" placeholder="+216 22 167 877" />
                </div>
                {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />} الحصول على رابط الاستعادة
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-lg font-black text-slate-900">جاهز لإعادة التعيين</h2>
              <p className="text-sm font-bold text-slate-500 leading-7">
                اضغط الزر أدناه لإرسال الرابط إلى هاتفك عبر واتساب أو المتابعة هنا.
              </p>
              {resetUrl && (
                <a
                  href={`https://wa.me/21622167877?text=${encodeURIComponent("رابط إعادة تعيين كلمة المرور النجاح في الرياضيات:\n" + resetUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full !py-3.5 !text-base font-black shadow-xl"
                >
                  <MessageSquare size={18} /> إرسال الرابط إلى واتساب
                </a>
              )}
              {resetUrl && (
                <a href={resetUrl} className="btn-ghost w-full !py-3.5 !text-sm font-bold border-stone-200">
                  <KeyRound size={16} /> المتابعة في هذا المتصفح
                </a>
              )}
              <Link href="/teacher/login" className="btn-ghost w-full text-stone-400 border-transparent hover:bg-stone-50">العودة لتسجيل الدخول</Link>
            </div>
          )}
        </div>
        <p className="mt-5 text-center text-xs font-bold text-indigo-200/70">
          <Link href="/teacher/login" className="underline">رجوع</Link>
          {" · "}
          <Link href="/" className="underline">الرئيسية</Link>
        </p>
      </div>
    </main>
  );
}
