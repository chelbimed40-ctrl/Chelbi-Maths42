import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Link2,
  ClipboardCheck,
  Zap,
  Trophy,
  Timer,
  Shuffle,
  PenTool,
  BarChart3,
  FileDown,
  ShieldCheck,
  Star,
  Vote,
  Sparkles,
} from "lucide-react";
import { getAuth } from "@/lib/auth";
import { BrandMark } from "@/components/ui";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Link2, title: "أكواد تسجيل", desc: "كود من 4 أرقام خاص بكل مجموعة يشاركه الأستاذ مع التلاميذ للانخراط بسهولة." },
  { icon: ShieldCheck, title: "موافقة الأستاذ", desc: "كل طلب تسجيل يمر بمراجعة الأستاذ قبل تفعيل حساب التلميذ." },
  { icon: ClipboardCheck, title: "بنك أسئلة واختبارات", desc: "اختيار من متعدد، صواب/خطأ، إجابة رقمية، إجابة قصيرة وأسئلة مصححة يدويًا." },
  { icon: Zap, title: "جلسات مباشرة", desc: "غرفة تحكم حية بكود انضمام، سؤالًا بسؤال، مع مراقبة إجابات التلاميذ لحظيًا." },
  { icon: Trophy, title: "نقاط وترتيب ونجوم", desc: "درجات مخصصة لكل سؤال، ترتيب الجلسة والترتيب التراكمي للمجموعة، ومستويات إنجاز." },
  { icon: Vote, title: "استفتاءات سريعة", desc: "قيّم الفهم فورًا باستفتاء سريع ونتائج مرئية." },
  { icon: Timer, title: "مؤقّت وساعة إيقاف", desc: "عدّاد تنازلي لكل سؤال وأدوات توقيت مستقلة للفصل." },
  { icon: Shuffle, title: "اختيار عشوائي", desc: "عجلة اختيار تلميذ عشوائي بطريقة عادلة وممتعة." },
  { icon: PenTool, title: "سبورة رقمية", desc: "لوح رسم تفاعلي للشرح والتدوين تحفظ صورته بضغطة." },
  { icon: FileDown, title: "صور تقارير النتائج", desc: "صدّر نتائج الجلسات وتقارير التلاميذ كصور عالية الجودة." },
];

const STEPS = [
  { n: "1", t: "الأستاذ ينشئ المجموعة والاختبار", d: "ويحدد درجة كل سؤال على حدة." },
  { n: "2", t: "مشاركة كود المجموعة", d: "الأستاذ يرسل كود من 4 أرقام والتلاميذ ينضمون وينتظرون الموافقة." },
  { n: "3", t: "انطلاق الجلسة المباشرة", d: "كود انضمام سريع، إجابات فورية وتصحيح آلي." },
  { n: "4", t: "النتائج والترتيب", d: "نقاط تراكمية ونجوم وشارات تحفّز التلاميذ." },
];

export default async function HomePage() {
  const auth = await getAuth();
  if (auth?.role === "teacher") redirect("/teacher");
  if (auth?.role === "student") redirect("/student");

  return (
    <main className="mesh-bg min-h-screen overflow-x-hidden">
      <header className="w-full px-3 py-3 sm:px-4 sm:py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <BrandMark size="lg" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Link href="/student/login" className="btn-ghost btn-sm !px-2.5 sm:!px-5 sm:!py-2.5 sm:!text-sm">
                <GraduationCap size={15} /> دخول التلميذ
              </Link>
              <Link href="/teacher/login" className="btn-primary btn-sm !px-2.5 sm:!px-5 sm:!py-2.5 sm:!text-sm">
                دخول الأستاذ <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
            <Link href="/teacher/login" className="btn-primary btn-sm !justify-center !py-3">
              أستاذ <ArrowLeft size={14} />
            </Link>
            <Link href="/student/login" className="btn-ghost btn-sm !justify-center !py-3">
              <GraduationCap size={14} /> تلميذ
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pt-6 pb-16 sm:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="chip mb-4 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Sparkles size={13} /> منصة صفية تفاعلية — جيل جديد من التعليم
            </p>
            <h1 className="font-display text-[2.4rem] font-black leading-tight text-stone-900 sm:text-6xl sm:leading-[1.25]">
              <span className="block">الرياضيات</span>
              <span className="block">
                <span>تصبح </span>
                <span className="bg-gradient-to-l from-[#b8921f] via-[#d4af37] to-[#f2d47e] bg-clip-text text-transparent">مغامرةً</span>
              </span>
              <span className="block">يعشقها التلاميذ</span>
            </h1>
            <p className="mt-4 text-sm font-bold leading-7 text-slate-500 sm:text-base sm:leading-8">
              منصة <span className="text-slate-800">Success-In-Maths</span> بإشراف الأستاذ <span className="text-slate-800">محمد شلبي</span>:
              مجموعات، اختبارات مباشرة، تصحيح آلي، ترتيب ونجوم، وأدوات فصل ذكية.
            </p>
            <div className="mt-6 flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-3">
              <Link href="/teacher/login" className="btn-primary !py-3.5 !text-base !justify-center">
                ابدأ كأستاذ <ArrowLeft size={18} />
              </Link>
              <Link href="/student/login" className="btn-ghost !py-3.5 !text-base !justify-center">
                أنا تلميذ — دخول
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-xs font-bold text-slate-400">
              <Users size={14} className="shrink-0 mt-0.5" /> التلاميذ ينضمون عبر رابط تسجيل من أستاذهم — لا يحتاجون أي تطبيق آخر.
            </p>
          </div>

          {/* live mock card */}
          <div className="relative hidden lg:block">
              <div className="card animate-floaty relative mx-auto max-w-md !rounded-[2rem] !p-6">
              <div className="flex items-center justify-between">
                <span className="chip animate-live bg-[#b8921f] text-white">جلسة مباشرة</span>
                <span className="chip bg-slate-100 text-slate-500" dir="ltr">K7W2QB</span>
              </div>
              <p className="mt-5 text-sm font-black text-slate-800">ما ناتج: ٧ × ٨ ؟</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {["54", "56", "48", "64"].map((o, i) => (
                  <div
                    key={o}
                    className={`rounded-2xl px-4 py-3 text-center text-sm font-black ring-1 ${
                      i === 1 ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"
                    }`}
                  >
                    {o}
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>أجاب التلاميذ</span>
                  <span className="text-indigo-600">23 / 30</span>
                </div>
                <div className="pbar"><span style={{ width: "77%" }} /></div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#17140c] to-[#3a2f10] px-4 py-3 text-white">
                <span className="flex items-center gap-2 text-xs font-bold"><Trophy size={15} className="text-amber-300" /> المتصدر الآن</span>
                <span className="text-sm font-black">سارة م. — ١٨ نقطة</span>
              </div>
            </div>
            <div className="absolute -top-6 -left-4 -z-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="absolute -bottom-8 -right-6 -z-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="ink-bg py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-2xl font-black text-white sm:text-3xl">رحلة الدرس في أربع خطوات</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-black text-amber-950">
                  {s.n}
                </span>
                <p className="mt-4 text-sm font-black text-white">{s.t}</p>
                <p className="mt-1.5 text-xs font-bold leading-6 text-indigo-200/80">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-black text-slate-900 sm:text-3xl">كل أدوات الفصل التفاعلي</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">مستوحاة من أفضل منصات التعليم التفاعلي — بتصميم وتنفيذ مستقل تمامًا.</p>
          </div>
          <BarChart3 size={32} className="hidden text-indigo-300 sm:block" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card !p-5 transition-transform duration-300 hover:-translate-y-1.5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <f.icon size={20} />
              </span>
              <p className="mt-3.5 text-sm font-black text-slate-800">{f.title}</p>
              <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-l from-[#17140c] to-[#3a2f10] px-6 py-12 text-center shadow-2xl shadow-amber-900/30 ring-1 ring-amber-500/20 sm:px-16">
          <Star size={120} className="absolute -top-10 -right-8 text-white/10" fill="currentColor" />
          <Trophy size={90} className="absolute -bottom-6 -left-4 text-white/10" />
          <h2 className="font-display text-2xl font-black text-white sm:text-3xl">جاهز لتحويل حصتك القادمة؟</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-7 text-indigo-100">
            أنشئ مجموعتك الأولى واختبارك خلال دقائق، ودع التلاميذ يتنافسون نحو قمة الترتيب.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/teacher/login" className="btn bg-white !text-indigo-700 shadow-xl hover:-translate-y-0.5">
              دخول الأستاذ <ArrowLeft size={16} />
            </Link>
            <Link href="/student/login" className="btn bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25">
              <GraduationCap size={16} /> دخول التلميذ
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center">
        <p className="text-xs font-bold text-slate-400">
          النجاح في الرياضيات · الأستاذ محمد شلبي — <span dir="ltr" className="inline-block whitespace-nowrap">{"\u200E"}+216 22 167 877</span> — منصة تعليمية تفاعلية © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
