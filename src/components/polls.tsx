"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Vote, Lock, LockOpen, CircleCheck, Trash2 } from "lucide-react";

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || "حدث خطأ");
  return data as any;
}

export function PollVoteCard({ poll }: { poll: { id: number; question: string; options: string[]; status: string; groupName: string; myVote: number | null; counts: number[] } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const total = poll.counts.reduce((a, c) => a + c, 0);
  const showResults = poll.myVote !== null || poll.status === "closed";

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black leading-6 text-slate-800">{poll.question}</p>
        <span className="chip shrink-0 bg-violet-50 text-violet-600 ring-1 ring-violet-100">{poll.groupName}</span>
      </div>

      {showResults ? (
        <div className="mt-4 space-y-2">
          {poll.options.map((o, i) => {
            const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <div className={`absolute inset-y-0 right-0 transition-all duration-700 ${poll.myVote === i ? "bg-indigo-200/70" : "bg-violet-100/60"}`} style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    {poll.myVote === i && <CircleCheck size={13} className="text-indigo-600" />} {o}
                  </span>
                  <span className="text-indigo-600">{pct}%</span>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] font-bold text-slate-400">{total} صوت · {poll.status === "open" ? "الاستفتاء مفتوح" : "الاستفتاء مغلق"}{poll.myVote !== null ? " · تم تسجيل صوتك" : ""}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {poll.options.map((o, i) => (
            <button
              key={i}
              disabled={busy}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-right text-xs font-black text-slate-700 ring-1 ring-slate-100 transition-all hover:bg-violet-50 hover:ring-violet-200 active:scale-[0.99] disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                setErr("");
                try {
                  await call("/api/polls/vote", "POST", { pollId: poll.id, optionIndex: i });
                  router.refresh();
                } catch (e: any) {
                  setErr(e.message);
                  setBusy(false);
                }
              }}
            >
              {o}
            </button>
          ))}
          {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
          <p className="text-[10px] font-bold text-slate-400">صوت واحد فقط لكل تلميذ — لا يمكن تغييره</p>
        </div>
      )}
    </div>
  );
}

export function PollCreateForm({ groups }: { groups: { id: number; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        setErr("");
        try {
          await call("/api/polls", "POST", {
            groupId: Number(fd.get("groupId")),
            question: fd.get("question"),
            options: String(fd.get("options") ?? "").split("\n"),
          });
          form.reset();
          router.refresh();
        } catch (ex: any) {
          setErr(ex.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label">المجموعة</label>
        <select name="groupId" className="input" required>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">السؤال</label>
        <input name="question" className="input" required placeholder="مثال: ما أصعب درس في الوحدة الأولى؟" />
      </div>
      <div>
        <label className="label">الخيارات — كل سطر خيار (2 إلى 6)</label>
        <textarea name="options" className="input" rows={3} required placeholder={"الكسور\nالمعادلات\nالهندسة"} />
      </div>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} نشر الاستفتاء
      </button>
    </form>
  );
}

export function PollAdminCard({ poll }: { poll: { id: number; question: string; options: string[]; status: string; groupName: string; counts: number[] } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const total = poll.counts.reduce((a, c) => a + c, 0);
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Vote size={16} /></span>
          <div>
            <p className="text-sm font-black leading-6 text-slate-800">{poll.question}</p>
            <p className="text-[11px] font-bold text-slate-400">{poll.groupName} · {total} صوت</p>
          </div>
        </div>
        <button
          className={poll.status === "open" ? "btn-danger btn-sm shrink-0" : "btn-mint btn-sm shrink-0"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await call("/api/polls", "PATCH", { pollId: poll.id, action: poll.status === "open" ? "close" : "open" });
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {poll.status === "open" ? <><Lock size={12} /> إغلاق</> : <><LockOpen size={12} /> فتح</>}
        </button>
        <button
          className="btn-ghost btn-sm shrink-0 text-rose-500 hover:bg-rose-50"
          disabled={busy}
          onClick={async () => {
            if (!confirm("حذف هذا الاستفتاء نهائيًا؟")) return;
            setBusy(true);
            try {
              await call("/api/polls", "DELETE", { pollId: poll.id });
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          <Trash2 size={12} /> حذف
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {poll.options.map((o, i) => {
          const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
          return (
            <div key={i} className="relative overflow-hidden rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
              <div className="absolute inset-y-0 right-0 bg-violet-200/60 transition-all duration-700" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-700">{o}</span>
                <span className="text-violet-600">{poll.counts[i]} · {pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
