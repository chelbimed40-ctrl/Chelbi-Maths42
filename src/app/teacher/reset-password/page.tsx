"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/ui";

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ direction: "ltr" }} className="relative">
      <input
        type={show ? "text" : "password"}
        className="input w-full !text-left"
        style={{ direction: "ltr", textAlign: "left", paddingLeft: "2.5rem" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button type="button" className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-700" onClick={() => setShow(!show)}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function ResetPasswordInner() {
  const search = useSearchParams();
  const token = useMemo(() => search.get("token") || "", [search]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (password !== confirm) {
      setErr("كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/teacher/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر إعادة التعيين");
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
                  <KeyRound size={22} />
                </span>
                <div>
                  <h1 className="text-lg font-black text-slate-900">كلمة مرور جديدة</h1>
                  <p className="text-xs font-bold text-slate-400">اختر كلمة مرور قوية لحساب الأستاذ</p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">كلمة المرور الجديدة</label>
                  <PasswordField value={password} onChange={setPassword} placeholder="********" />
                </div>
                <div>
                  <label className="label">تأكيد كلمة المرور</label>
                  <PasswordField value={confirm} onChange={setConfirm} placeholder="********" />
                </div>
                {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
                <button className="btn-primary w-full" disabled={busy || !token}>
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} حفظ كلمة المرور الجديدة
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-lg font-black text-slate-900">تم تغيير كلمة المرور بنجاح</h2>
              <p className="text-sm font-bold text-slate-500">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <Link href="/teacher/login" className="btn-primary w-full">الانتقال لتسجيل الدخول</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="ink-bg min-h-screen grid place-items-center text-white"><Loader2 className="animate-spin" size={36} /></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
