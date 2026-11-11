import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { getAuth, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const [teacher] = await db.select({ name: teachers.name, username: teachers.username }).from(teachers).where(eq(teachers.id, auth.id)).limit(1);
  return NextResponse.json({ teacher });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, auth.id)).limit(1);
  if (!teacher) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const updates: any = {};

  if (newPassword !== undefined) {
    if (typeof currentPassword !== "string" || !verifyPassword(currentPassword, teacher.passwordHash)) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 401 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }
    updates.passwordHash = hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "لا توجد تغييرات لإرسالها" }, { status: 400 });
  }

  await db.update(teachers).set(updates).where(eq(teachers.id, teacher.id));
  return NextResponse.json({ ok: true });
}
