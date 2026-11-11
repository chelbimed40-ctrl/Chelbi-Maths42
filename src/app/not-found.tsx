import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandMark } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="ink-bg grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md !p-10 text-center">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-indigo-50 text-indigo-500">
          <Compass size={30} />
        </span>
        <h1 className="font-display text-2xl font-black text-slate-900">صفحة غير موجودة</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">الرابط الذي تحاول الوصول إليه غير صحيح أو لم يعد متاحًا.</p>
        <Link href="/" className="btn-primary mt-6 w-full">العودة للرئيسية</Link>
      </div>
    </main>
  );
}
