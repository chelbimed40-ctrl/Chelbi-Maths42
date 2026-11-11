"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, RefreshCcw, Check, X, Ban, Radio, Save } from "lucide-react";

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || "حدث خطأ");
  return data as any;
}

export function CreateGroupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="flex flex-col sm:grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setErr("");
        try {
          await call("/api/groups", "POST", { name: fd.get("name"), grade: fd.get("grade") });
          (e.target as HTMLFormElement).reset();
          router.refresh();
        } catch (ex: any) {
          setErr(ex.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input name="name" className="input" required placeholder="اسم المجموعة — مثال: الصف الثالث أ" />
      <input name="grade" className="input" placeholder="الصف / المستوى (اختياري)" />
      <button className="btn-primary !py-3 sm:!py-2.5" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} إنشاء المجموعة
      </button>
      {err && <p className="col-span-full text-xs font-bold text-rose-600">{err}</p>}
    </form>
  );
}

export function CreateQuizForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setErr("");
        try {
          const r = await call("/api/quizzes", "POST", { title: fd.get("title"), description: fd.get("description") });
          router.push(`/teacher/quizzes/${r.id}`);
        } catch (ex: any) {
          setErr(ex.message);
          setBusy(false);
        }
      }}
    >
      <input name="title" className="input" required placeholder="عنوان الاختبار — مثال: جدول الضرب" />
      <input name="description" className="input" placeholder="وصف قصير (اختياري)" />
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} إنشاء وتحرير
      </button>
      {err && <p className="col-span-full text-xs font-bold text-rose-600">{err}</p>}
    </form>
  );
}

export function DeleteGroupButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      className="rounded-xl p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
      title="حذف المجموعة"
      onClick={async () => {
        if (!confirm("حذف المجموعة سيحذف عضويات التلاميذ والجلسات المرتبطة بها. متابعة؟")) return;
        await call("/api/groups", "DELETE", { groupId: id });
        router.refresh();
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

export function DeleteQuizButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      className="rounded-xl p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
      title="حذف الاختبار"
      onClick={async () => {
        if (!confirm("حذف الاختبار سيحذف أسئلته وجلساته ونتائجها. متابعة؟")) return;
        await call("/api/quizzes", "DELETE", { quizId: id });
        router.refresh();
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

export function MemberAction({ groupId, membershipId, action, label, tone }: { groupId: number; membershipId: number; action: string; label: string; tone: "approve" | "reject" | "remove" | "pending" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const icon = action === "approve" ? <Check size={13} /> : action === "reject" ? <Ban size={13} /> : action === "pending" ? <RefreshCcw size={13} /> : <X size={13} />;
  const style = tone === "approve" ? "btn-mint btn-sm" : tone === "reject" ? "btn-danger btn-sm" : tone === "remove" ? "btn-danger btn-sm" : "btn-ghost btn-sm";
  return (
    <button
      className={style}
      disabled={busy}
      onClick={async () => {
        if (action === "remove" && !confirm("إزالة هذا التلميذ من المجموعة؟")) return;
        setBusy(true);
        try {
          if (action === "remove") await call(`/api/groups/${groupId}/members`, "DELETE", { membershipId });
          else await call(`/api/groups/${groupId}/members`, "PATCH", { membershipId, action });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {icon} {label}
    </button>
  );
}

export function RegenInviteButton({ groupId }: { groupId: number }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={async () => {
        if (!confirm("توليد رابط جديد سيوقف الرابط القديم تمامًا. متابعة؟")) return;
        await call("/api/groups", "PATCH", { groupId, action: "regen" });
        router.refresh();
      }}
    >
      <RefreshCcw size={13} /> رابط جديد
    </button>
  );
}

export function LaunchSessionForm({ quizId, groups }: { quizId: number; groups: { id: number; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (groups.length === 0) {
    return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 ring-1 ring-amber-100">أنشئ مجموعة أولًا من لوحة التحكم لتتمكن من بدء جلسة.</p>;
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setErr("");
        try {
          const r = await call("/api/sessions", "POST", {
            quizId,
            groupId: Number(fd.get("groupId")),
            timeLimitSec: Number(fd.get("timeLimitSec")) || 0,
          });
          router.push(`/teacher/sessions/${r.id}`);
        } catch (ex: any) {
          setErr(ex.message);
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">المجموعة</label>
          <select name="groupId" className="input" required>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">مؤقّت السؤال (ثوانٍ — 0 بدون مؤقت)</label>
          <input name="timeLimitSec" type="number" min={0} max={600} defaultValue={45} className="input" dir="ltr" />
        </div>
      </div>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Radio size={16} />} بدء جلسة مباشرة
      </button>
    </form>
  );
}

export function EditGroupForm({ group, onDone }: { group: { id: number; name: string; grade: string | null }; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setErr("");
        try {
          await call("/api/groups", "PATCH", { groupId: group.id, action: "update", name: fd.get("name"), grade: fd.get("grade") });
          onDone();
          router.refresh();
        } catch (ex: any) {
          setErr(ex.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label">اسم المجموعة</label>
        <input name="name" className="input" required defaultValue={group.name} placeholder="مثال: الصف التاسع أساسي" />
      </div>
      <div>
        <label className="label">الصف / المستوى</label>
        <input name="grade" className="input" defaultValue={group.grade || ""} placeholder="مثال: تاسعة أساسي" />
      </div>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ التعديلات
        </button>
        <button type="button" className="btn-ghost" onClick={onDone} disabled={busy}>إلغاء</button>
      </div>
    </form>
  );
}
