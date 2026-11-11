"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus, LogOut, Copy, Check, Hash, Eye, EyeOff } from "lucide-react";

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || "حدث خطأ غير متوقع");
  return data as any;
}

/* ═══════════ حقل كلمة المرور مع زر الإظهار/الإخفاء ═══════════ */
function PasswordField({ name = "password", placeholder = "••••••••" }: { name?: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ direction: "ltr" }} className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        className="input w-full !text-left"
        style={{ direction: "ltr", textAlign: "left", paddingLeft: "2.5rem" }}
        required
        autoComplete="current-password"
        placeholder={placeholder}
      />
      <button
        type="button"
        className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-300 hover:text-stone-600 transition-colors"
        onClick={() => setShow(!show)}
        title={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور للتحقق"}
      >
        {show ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}

/* ═══════════ حقل LTR عام (اسم مستخدم / كود) ═══════════ */
function LtrInput({ name, placeholder, required = true, autoComplete, className = "" }: { name: string; placeholder: string; required?: boolean; autoComplete?: string; className?: string }) {
  return (
    <input
      name={name}
      className={`input !text-left ${className}`}
      style={{ direction: "ltr", textAlign: "left" }}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
    />
  );
}

/* ═══════════ تسجيل دخول الأستاذ ═══════════ */
export function TeacherLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      await postJSON("/api/teacher/login", { username: fd.get("username"), password: fd.get("password") });
      router.push("/teacher");
      router.refresh();
    } catch (ex: any) {
      setErr(ex.message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {/* اسم المستخدم مخفي — يُرسل تلقائياً */}
      <input type="hidden" name="username" value="ChelbiMohamed-42" />
      <div>
        <label className="label">كلمة المرور</label>
        <PasswordField />
      </div>
      {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} دخول الأستاذ
      </button>
      <p className="text-center pt-1">
        <a href="/teacher/forgot-password" className="text-xs font-bold text-[#b8921f] hover:underline">
          نسيت كلمة المرور؟ استرجاع عبر whatsApp
        </a>
      </p>
    </form>
  );
}

/* ═══════════ تسجيل دخول التلميذ ═══════════ */
export function StudentLoginForm({ next = "/student" }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      await postJSON("/api/student/login", { 
        name: fd.get("name"),
        password: fd.get("password") 
      });
      router.push(next);
      router.refresh();
    } catch (ex: any) {
      setErr(ex.message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">الاسم واللقب</label>
        <input name="name" className="input" required dir="rtl" placeholder="مثلاً: أحمد سامي" />
      </div>
      <div>
        <label className="label">كلمة المرور (3 أرقام)</label>
        <div className="relative">
          <input 
            name="password" 
            type={showPassword ? "text" : "password"} 
            className="input pr-10 text-center font-black tracking-widest text-lg" 
            required 
            pattern="[0-9]{3}"
            maxLength={3}
            inputMode="numeric"
            autoComplete="current-password" 
            placeholder="مثلاً: 123" 
            dir="ltr"
          />
          <button 
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "إخفاء الأرقام" : "إظهار الأرقام للتحقق"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} دخول التلميذ
      </button>
    </form>
  );
}

/* ═══════════ تسجيل تلميذ جديد ═══════════ */
export function RegisterForm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      await postJSON("/api/student/register", {
        token,
        name: fd.get("name"),
        password: fd.get("password"),
      });
      setDone(true);
      router.refresh();
    } catch (ex: any) {
      setErr(ex.message);
      setBusy(false);
    }
  }
  
  if (done)
    return (
      <div className="animate-pop space-y-4 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
          <Check size={30} />
        </div>
        <h3 className="text-lg font-black text-stone-900">تم إرسال طلب الانضمام بنجاح</h3>
        <p className="text-sm font-bold text-stone-500">
          أنت الآن بانتظار موافقة الأستاذ. احتفظ بكلمة المرور الخاصة بك لتتمكن من الدخول لاحقاً.
        </p>
        <a href="/student/login" className="btn-primary w-full">
          <LogIn size={16} /> الانتقال لتسجيل الدخول
        </a>
      </div>
    );
    
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="label">الاسم واللقب</label>
        <input name="name" className="input !py-4 text-base" required minLength={3} dir="rtl" placeholder="مثلاً: أحمد سامي" />
      </div>
      <div>
        <label className="label">كلمة المرور (اطلبها من الأستاذ — 3 أرقام)</label>
        <div className="relative">
          <input 
            name="password" 
            type={showPassword ? "text" : "password"} 
            className="input !py-4 text-center font-black tracking-[0.5em] text-xl pr-10" 
            required 
            pattern="[0-9]{3}"
            maxLength={3}
            inputMode="numeric"
            placeholder="•••" 
            dir="ltr"
          />
          <button 
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-stone-600"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "إخفاء" : "إظهار"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] font-bold text-stone-400 text-center">ستحتاج هذه الأرقام الثلاثة لدخول حسابك في كل مرة</p>
      </div>
      {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
      <button className="btn-primary w-full !py-4 !text-base" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} طلب الانضمام للمجموعة
      </button>
    </form>
  );
}

/* ═══════════ الانضمام لجلسة بكود ═══════════ */
export function JoinSessionForm({ big = false }: { big?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      const data = await postJSON("/api/sessions/join", { code: fd.get("code") });
      router.push(`/student/session/${data.code}`);
    } catch (ex: any) {
      setErr(ex.message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <input
          name="code"
          required
          maxLength={6}
          placeholder="ABC123"
          className={`input !text-center font-black uppercase tracking-[0.4em] ${big ? "!py-4 text-2xl" : ""}`}
          style={{ direction: "ltr", textAlign: "center" }}
        />
        <button className="btn-dark shrink-0" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Hash size={16} />} انضمام
        </button>
      </div>
      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100 break-words">{err}</p>}
    </form>
  );
}

/* ═══════════ زر تسجيل الخروج ═══════════ */
export function LogoutButton({ role, className }: { role: "teacher" | "student"; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className || "btn-ghost btn-sm"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch(`/api/${role}/logout`, { method: "POST" });
        } finally {
          router.push("/");
          router.refresh();
        }
      }}
    >
      <LogOut size={13} /> خروج
    </button>
  );
}

/* ═══════════ نسخ الرابط ═══════════ */
export function CopyButton({ text, label = "نسخ الرابط" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={copied ? "btn-mint btn-sm" : "btn-ghost btn-sm"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "تم النسخ" : label}
    </button>
  );
}
