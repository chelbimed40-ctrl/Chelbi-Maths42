"use client";

import { useState } from "react";
import { Settings, Pencil, ShieldCheck } from "lucide-react";
import { EditGroupForm, RegenInviteButton } from "./teacher-forms";
import { CopyButton } from "./auth-forms";

export function GroupSettings({ group, inviteUrl, shortUrl }: { group: { id: number; name: string; grade: string | null; approvedCount: number; inviteToken: string }; inviteUrl: string; shortUrl: string }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="card !p-4 sm:!p-6">
        <h2 className="mb-4 text-base font-black text-stone-900 flex items-center gap-2">
          <Pencil size={18} className="text-[#b8921f]" /> تعديل بيانات المجموعة
        </h2>
        <EditGroupForm group={group} onDone={() => setEditing(false)} />
      </section>
    );
  }

  return (
    <section className="card !p-4 sm:!p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-black text-stone-900 break-words leading-tight mb-1">{group.name}</h1>
          <p className="text-xs font-bold text-stone-400">{group.grade || "بدون صف محدد"} · {group.approvedCount} تلميذ مقبول</p>
        </div>
        <button onClick={() => setEditing(true)} className="btn-ghost btn-sm shrink-0">
          <Settings size={16} /> تعديل
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3 sm:p-4 ring-1 ring-indigo-100 overflow-hidden">
        <p className="mb-2.5 flex items-start gap-2 text-xs font-black text-indigo-700 leading-relaxed">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" /> 
          <span>كود الانخراط — يدخله التلميذ من صفحة تسجيل الدخول</span>
        </p>
        <div className="space-y-2.5">
          <div className="rounded-xl bg-white px-4 py-5 ring-1 ring-stone-200 text-center">
            <p className="text-[10px] font-bold text-stone-400 mb-1">كود المجموعة</p>
            <p className="font-display text-4xl sm:text-5xl font-black tracking-[0.4em] text-[#b8921f]" dir="ltr">
              {group.inviteToken}
            </p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2">
            <div className="flex-1"><CopyButton text={group.inviteToken} label="نسخ الكود" /></div>
            <div className="flex-1"><RegenInviteButton groupId={group.id} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
