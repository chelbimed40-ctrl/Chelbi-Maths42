"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail, KeyRound, Loader2, Save } from "lucide-react";

export default function TeacherAccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/teacher/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCurrentPassword(""); setNewPassword("");
      setMsg("تم تغيير كلمة المرور بنجاح");
    } catch (ex: any) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden px-3 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/teacher" className="btn-ghost btn-sm mb-4 inline-flex"><ArrowRight size={13} /> لوحة التحكم</Link>
        <div className="card space-y-6">
          <h1 className="text-xl font-black text-stone-900">أمان الحساب</h1>

          <form onSubmit={savePassword} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-stone-800"><KeyRound size={18} className="text-[#b8921f]" /> تغيير كلمة المرور</div>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="كلمة المرور الحالية" dir="ltr" />
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة المرور الجديدة" dir="ltr" />
            <button className="btn-primary btn-sm" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ كلمة المرور</button>
          </form>

          {msg && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{msg}</p>}
          {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
        </div>
      </div>
    </main>
  );
}
