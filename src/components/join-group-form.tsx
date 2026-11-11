"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Check, Eye, EyeOff } from "lucide-react";

export function JoinGroupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: fd.get("code"),
          name: fd.get("name"),
          password: fd.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الانضمام");
      setGroupName(data.groupName || "");
      setDone(true);
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card !p-5 sm:!p-8 text-center space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
          <Check size={28} />
        </div>
        <h3 className="text-base font-black text-stone-900">تم طلب الانضمام بنجاح</h3>
        <p className="text-sm font-bold text-stone-500 leading-7">
          {groupName && <>طلبك للانضمام إلى مجموعة «{groupName}» </>}
          بانتظار موافقة الأستاذ. بعد القبول يمكنك الدخول بالاسم وكلمة المرور.
        </p>
      </div>
    );
  }

  return (
    <div className="card !p-5 sm:!p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-[#b8921f]">
          <Users size={22} />
        </span>
        <div>
          <h2 className="text-base font-black text-stone-900">الانخراط في مجموعة</h2>
          <p className="text-xs font-bold text-stone-400">أدخل الكود المكوّن من 4 أرقام الذي أعطاك إياه الأستاذ</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">كود المجموعة (4 أرقام)</label>
          <input
            name="code"
            className="input text-center font-black tracking-[0.5em] text-2xl !py-4"
            required
            pattern="[0-9]{4}"
            maxLength={4}
            inputMode="numeric"
            placeholder="• • • •"
            dir="ltr"
          />
        </div>
        <div>
          <label className="label">الاسم واللقب</label>
          <input name="name" className="input" required minLength={3} dir="rtl" placeholder="مثلاً: أحمد سامي" />
        </div>
        <div>
          <label className="label">كلمة المرور (3 أرقام — يعطيها لك الأستاذ)</label>
          <div className="relative">
            <input
              name="password"
              type={showPwd ? "text" : "password"}
              className="input text-center font-black tracking-[0.5em] text-xl !py-3.5 pr-10"
              required
              pattern="[0-9]{3}"
              maxLength={3}
              inputMode="numeric"
              placeholder="• • •"
              dir="ltr"
            />
            <button
              type="button"
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-300 hover:text-stone-600"
              onClick={() => setShowPwd(!showPwd)}
            >
              {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
        <button className="btn-primary w-full !py-3.5 !text-base" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />} طلب الانخراط
        </button>
      </form>
    </div>
  );
}
