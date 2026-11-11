import Link from "next/link";
import type { ReactNode } from "react";
import { Sigma, LayoutDashboard, Vote, Wrench, Medal, Star, ImageIcon, Award } from "lucide-react";
import { levelFor, LEVELS } from "@/lib/utils";
import { LangSwitcher } from "@/lib/i18n";

export function BrandMark({ dark = false, size = "md" }: { dark?: boolean; size?: "md" | "lg" }) {
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span
        className={`grid place-items-center rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#f2d47e] text-[#241a02] shadow-lg shadow-amber-500/40 shrink-0 ${
          size === "lg" ? "h-11 w-11 sm:h-14 sm:w-14" : "h-9 w-9 sm:h-11 sm:w-11"
        }`}
      >
        <Sigma size={size === "lg" ? 22 : 18} className="sm:scale-110" strokeWidth={2.4} />
      </span>
      <span className="leading-tight min-w-0 overflow-hidden">
        <span className={`block font-black ${dark ? "text-white" : "text-stone-900"} ${size === "lg" ? "text-[13px] sm:text-xl" : "text-[11px] sm:text-base"} whitespace-normal leading-tight break-words`}>
          النجاح في الرياضيات
        </span>
        <span className={`block text-[8px] sm:text-[11px] font-bold ${dark ? "text-amber-100/80" : "text-stone-500"} whitespace-normal leading-tight`}>
          الأستاذ محمد شلبي
          <span className="hidden md:inline">
            {" "}
            <span dir="ltr" style={{ direction: "ltr", unicodeBidi: "embed" }}>{"\u200E"}+216 22 167 877</span>
          </span>
        </span>
        <span className={`hidden xs:block text-[7px] sm:text-[10px] font-bold opacity-60 ${dark ? "text-amber-100" : "text-stone-400"}`} dir="ltr" style={{ direction: "ltr", unicodeBidi: "embed" }}>
          Success-In-Maths
        </span>
      </span>
    </Link>
  );
}

export function TeacherHeader() {
  const links = [
    { href: "/teacher", label: "لوحة", icon: LayoutDashboard },
    { href: "/teacher/images", label: "إجابات", icon: ImageIcon },
    { href: "/teacher/polls", label: "استفتاء", icon: Vote },
    { href: "/teacher/tools", label: "أدوات", icon: Wrench },
  ];
  return (
    <header className="sticky top-0 z-40 glass border-b border-stone-200/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5">
        <div className="min-w-0 flex-1 sm:flex-none">
          <BrandMark />
        </div>
        <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 rounded-xl px-1.5 sm:px-3 py-1 sm:py-2 text-[9px] sm:text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <l.icon size={14} className="sm:size-4" /> 
              <span className="whitespace-nowrap hidden xs:inline">{l.label}</span>
            </Link>
          ))}
          <LangSwitcher className="bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100" />
        </nav>
      </div>
    </header>
  );
}

export function StudentHeader() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-stone-200/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3">
        <div className="min-w-0 flex-1"><BrandMark /></div>
        <div className="flex items-center gap-1.5 shrink-0">
          <LangSwitcher className="bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100" />
          <span className="chip bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 text-[9px] xs:text-[10px] sm:text-[11px] whitespace-nowrap">بوابة التلميذ</span>
        </div>
      </div>
    </header>
  );
}

export function Stat({ label, value, icon: Icon, tint = "indigo" }: { label: string; value: ReactNode; icon: any; tint?: "indigo" | "amber" | "mint" | "rose" }) {
  const tints: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    mint: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="card flex items-center gap-3 sm:gap-4 !p-4 sm:!p-5">
      <span className={`grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl ${tints[tint]}`}>
        <Icon size={20} className="sm:size-[22px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 truncate">{label}</p>
        <p className="text-lg sm:text-xl font-black text-stone-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function LevelChip({ points, showProgress = true }: { points: number; showProgress?: boolean }) {
  const lv = levelFor(points);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="chip bg-gradient-to-l from-indigo-600 to-violet-600 text-white">
          <Medal size={12} /> {lv.current.name}
        </span>
        <span className="chip bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <Star size={12} fill="currentColor" /> {lv.stars} نجمة
        </span>
        <span className="text-xs font-black text-slate-700">{points} نقطة</span>
      </div>
      {showProgress && lv.next && (
        <div className="flex items-center gap-2">
          <div className="pbar w-32">
            <span style={{ width: `${Math.round(lv.progress * 100)}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {lv.next.min - points} نقطة للوصول إلى «{lv.next.name}»
          </span>
        </div>
      )}
    </div>
  );
}

export function RankRow({ rank, name, value, highlight = false, suffix = "نقطة" }: { rank: number; name: string; value: ReactNode; highlight?: boolean; suffix?: string }) {
  const medalTone = rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-400" : null;
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
        highlight ? "bg-gradient-to-l from-[#b8921f] to-[#d4af37] text-white shadow-lg shadow-amber-500/30" : rank <= 3 ? "bg-amber-50/70 ring-1 ring-amber-100" : "bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${highlight ? "bg-white/20" : "bg-white ring-1 ring-slate-200 text-slate-500"}`}>
          {medalTone && !highlight ? <Award size={15} className={medalTone} /> : rank}
        </span>
        <span className={`font-bold ${highlight ? "text-white" : "text-slate-800"}`}>{name}</span>
      </div>
      <span className={`font-black ${highlight ? "text-amber-100" : "text-[#b8921f]"}`}>
        {value} <span className="text-[10px] font-bold">{suffix}</span>
      </span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 py-12 text-center">
      <Icon size={30} className="text-slate-300" />
      <p className="text-sm font-black text-slate-500">{title}</p>
      {hint && <p className="text-xs font-bold text-slate-400">{hint}</p>}
    </div>
  );
}

export function LevelLadder() {
  return (
    <div className="flex flex-wrap gap-2">
      {LEVELS.map((l) => (
        <span key={l.name} className="chip bg-white ring-1 ring-slate-200 text-slate-600">
          <Medal size={12} className="text-indigo-500" /> {l.name} <span className="text-slate-400">+{l.min}</span>
        </span>
      ))}
    </div>
  );
}
