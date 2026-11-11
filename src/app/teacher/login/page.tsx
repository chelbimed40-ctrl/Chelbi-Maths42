import { redirect } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { BrandMark } from "@/components/ui";
import { TeacherLoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function TeacherLoginPage() {
  const auth = await getAuth();
  if (auth?.role === "teacher") redirect("/teacher");
  if (auth?.role === "student") redirect("/student");

  return (
    <main className="ink-bg grid min-h-screen place-items-center px-3 py-8 overflow-x-hidden">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark dark size="lg" />
        </div>
        <div className="card !p-5 sm:!p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <KeyRound size={22} />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-900">تسجيل دخول الأستاذ</h1>
              <p className="text-xs font-bold text-slate-400">لوحة تحكم الأستاذ محمد شلبي</p>
            </div>
          </div>
          <TeacherLoginForm />
        </div>
        <p className="mt-5 text-center text-xs font-bold text-indigo-200/70">
          تلميذ؟ <Link href="/student/login" className="text-white underline">ادخل من بوابة التلاميذ</Link>
          {" · "}
          <Link href="/" className="underline">الرئيسية</Link>
        </p>
      </div>
    </main>
  );
}
