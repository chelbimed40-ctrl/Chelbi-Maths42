import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { BrandMark } from "@/components/ui";
import { StudentLoginForm } from "@/components/auth-forms";
import { JoinGroupForm } from "@/components/join-group-form";

export const dynamic = "force-dynamic";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const auth = await getAuth();
  const { next } = await searchParams;
  if (auth?.role === "teacher") redirect("/teacher");
  if (auth?.role === "student") redirect(next || "/student");

  return (
    <main className="ink-bg min-h-screen px-3 py-8 overflow-x-hidden">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandMark dark size="lg" />
        </div>

        {/* تسجيل الدخول */}
        <div className="card !p-5 sm:!p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
              <GraduationCap size={22} />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-900">دخول التلميذ</h1>
              <p className="text-xs font-bold text-slate-400">للوصول إلى مجموعتك واختباراتك</p>
            </div>
          </div>
          <StudentLoginForm next={next || "/student"} />
        </div>

        {/* الانخراط بكود المجموعة */}
        <JoinGroupForm />

        <p className="text-center text-xs font-bold text-indigo-200/70">
          <Link href="/" className="underline">الرئيسية</Link>
        </p>
      </div>
    </main>
  );
}
