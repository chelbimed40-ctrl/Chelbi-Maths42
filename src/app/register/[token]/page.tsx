import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Link2, ShieldCheck, TriangleAlert, Clock, Check } from "lucide-react";
import { db } from "@/db";
import { groups, teachers, memberships } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { BrandMark } from "@/components/ui";
import { RegisterForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [group] = await db.select().from(groups).where(eq(groups.inviteToken, token)).limit(1);
  const auth = await getAuth();

  if (!group) {
    return (
      <main className="ink-bg grid min-h-screen place-items-center px-4 py-10">
        <div className="card w-full max-w-md !p-8 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-500 ring-1 ring-rose-100">
            <TriangleAlert size={28} />
          </span>
          <h1 className="text-xl font-black text-slate-900">رابط التسجيل غير صالح</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            هذا الرابط غير موجود أو تم إلغاؤه. تأكد من نسخ الرابط كاملًا، أو اطلب من أستاذك إرساله مرة أخرى.
          </p>
          <Link href="/" className="btn-ghost mt-6 w-full">العودة للرئيسية</Link>
        </div>
      </main>
    );
  }

  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, group.teacherId)).limit(1);
  const approvedCount = await db.$count(memberships, eq(memberships.status, "approved"));

  // already logged in as student → show membership status
  let membershipStatus: string | null = null;
  if (auth?.role === "student") {
    const [m] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.studentId, auth.id))
      .limit(1);
    const rows = await db.select().from(memberships).where(eq(memberships.studentId, auth.id));
    const mine = rows.find((r) => r.groupId === group.id);
    membershipStatus = mine?.status ?? null;
    void m;
  }

  return (
    <main className="ink-bg grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark dark size="lg" />
        </div>

        <div className="card !p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Link2 size={22} />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-900">انضم إلى «{group.name}»</h1>
              <p className="text-xs font-bold text-stone-400">
                {group.grade ? `${group.grade} · ` : ""}{teacher?.name?.replace("الأستاذ ", "") || "محمد شلبي"}
              </p>
            </div>
          </div>

          {membershipStatus === "approved" ? (
            <div className="space-y-4 text-center">
              <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                <Check size={16} /> أنت عضو مقبول في هذه المجموعة بالفعل
              </p>
              <Link href="/student" className="btn-primary w-full">الذهاب إلى حسابي</Link>
            </div>
          ) : membershipStatus === "pending" ? (
            <div className="space-y-4 text-center">
              <p className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-4 text-sm font-black text-amber-700 ring-1 ring-amber-100">
                <Clock size={16} /> طلبك قيد المراجعة من الأستاذ
              </p>
              <Link href="/student" className="btn-ghost w-full">الذهاب إلى حسابي</Link>
            </div>
          ) : (
            <>
              <RegisterForm token={token} />
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[11px] font-bold leading-5 text-slate-500">
                <ShieldCheck size={28} className="shrink-0 text-indigo-400" />
                بعد إنشاء الحساب سيبقى انضمامك معلقًا حتى يوافق عليه الأستاذ. هذا يحمي المجموعة من أي دخول غير مصرّح به.
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-xs font-bold text-indigo-200/70">
          لديك حساب بالفعل؟ <Link href="/student/login" className="text-white underline">تسجيل الدخول</Link>
        </p>
        <p className="mt-2 text-center text-[11px] font-bold text-indigo-200/40" dir="ltr">{approvedCount >= 0 ? "" : ""}</p>
      </div>
    </main>
  );
}
