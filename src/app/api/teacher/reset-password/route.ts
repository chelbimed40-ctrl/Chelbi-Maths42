import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));

  if (typeof token !== "string" || token.length < 20) {
    return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل." }, { status: 400 });
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.resetToken, token), gt(teachers.resetTokenExpiry, new Date())))
    .limit(1);

  if (!teacher) {
    return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." }, { status: 400 });
  }

  await db
    .update(teachers)
    .set({
      passwordHash: hashPassword(password),
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(teachers.id, teacher.id));

  return NextResponse.json({ ok: true });
}
