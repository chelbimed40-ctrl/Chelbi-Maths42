import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Wrench, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { TeacherHeader } from "@/components/ui";
import { ClassroomTools } from "@/components/tools";

export const dynamic = "force-dynamic";

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") redirect("/teacher/login");
  const { tab } = await searchParams;
  const myGroups = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.teacherId, auth.id));

  return (
    <main className="mesh-bg min-h-screen">
      <TeacherHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/teacher" className="btn-ghost btn-sm mb-5"><ArrowRight size={13} /> لوحة التحكم</Link>
        <h1 className="mb-1 flex items-center gap-2 font-display text-2xl font-black text-slate-900 sm:text-3xl">
          <Wrench size={26} className="text-indigo-600" /> أدوات الفصل الذكية
        </h1>
        <p className="mb-6 text-sm font-bold text-slate-500">مؤقت وعداد إيقاف، اختيار تلميذ عشوائي، وسبورة رقمية للشرح — كلها جاهزة للعرض على شاشة الفصل.</p>
        <ClassroomTools groups={myGroups} initialTab={tab ?? "timer"} />
      </div>
    </main>
  );
}
