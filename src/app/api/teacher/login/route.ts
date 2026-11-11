import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور" }, { status: 400 });
  }

  // First-run bootstrap: create the admin account from ADMIN_PASSWORD (or default).
  const count = await db.$count(teachers);
  if (count === 0) {
    if (username !== "ChelbiMohamed-42") {
      return NextResponse.json({ error: "الحساب الرئيسي لم يُنشأ بعد — استخدم ChelbiMohamed-42" }, { status: 400 });
    }
    const expected = process.env.ADMIN_PASSWORD || "Maths@1984";
    if (password !== expected) {
      return NextResponse.json({ error: "كلمة المرور الافتراضية غير صحيحة — راجع إعداد النظام" }, { status: 401 });
    }
    const [t] = await db
      .insert(teachers)
      .values({ 
        name: "الأستاذ محمد شلبي", 
        username: "ChelbiMohamed-42", 
        passwordHash: hashPassword(password) 
      })
      .returning();
    const res = NextResponse.json({ ok: true, id: t.id });
    setSessionCookie(res, { role: "teacher", id: t.id });
    return res;
  }

  const [t] = await db.select().from(teachers).where(eq(teachers.username, username)).limit(1);
  if (!t || !verifyPassword(password, t.passwordHash)) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, id: t.id });
  setSessionCookie(res, { role: "teacher", id: t.id });
  return res;
}
