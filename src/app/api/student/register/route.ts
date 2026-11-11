import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships, students } from "@/db/schema";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
try {
  const body = await req.json().catch(() => ({}));
  const { token, name, password } = body;
  if (typeof token !== "string" || typeof name !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }
  const cleanName = name.trim();
  if (cleanName.length < 3) return NextResponse.json({ error: "اكتب الاسم الكامل (3 أحرف على الأقل)" }, { status: 400 });
  if (password.length !== 3 || !/^\d{3}$/.test(password)) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تتكون من 3 أرقام فقط" }, { status: 400 });
  }

  const [group] = await db.select().from(groups).where(eq(groups.inviteToken, token)).limit(1);
  if (!group) return NextResponse.json({ error: "رابط التسجيل غير صالح" }, { status: 404 });

  const [existing] = await db.select().from(students).where(eq(students.name, cleanName)).limit(1);
  let studentId: number;
  
  if (existing) {
    // If student exists, verify they know their password before letting them join another group
    if (existing.passwordHash !== "" && !verifyPassword(password, existing.passwordHash)) {
      return NextResponse.json({ error: "هذا الاسم مستخدم بكلمة مرور مختلفة" }, { status: 401 });
    }
    studentId = existing.id;
  } else {
    try {
      const [s] = await db
        .insert(students)
        .values({ 
          name: cleanName, 
          passwordHash: hashPassword(password),
          loginCode: password // Store plain text for teacher reference
        })
        .returning();
      studentId = s.id;
    } catch (e: any) {
      // Handle race condition for unique name
      const [s] = await db.select().from(students).where(eq(students.name, cleanName)).limit(1);
      if (!s) throw e;
      studentId = s.id;
    }
  }

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.groupId, group.id), eq(memberships.studentId, studentId)))
    .limit(1);
  if (membership) {
    const msg =
      membership.status === "pending"
        ? "طلبك موجود بالفعل وبانتظار موافقة الأستاذ"
        : membership.status === "approved"
          ? "أنت عضو مقبول في هذه المجموعة بالفعل"
          : "تم رفض طلبك سابقًا — تواصل مع أستاذك";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await db.insert(memberships).values({ groupId: group.id, studentId, status: "pending" });
  const res = NextResponse.json({ ok: true, status: "pending" });
  setSessionCookie(res, { role: "student", id: studentId });
  return res;
} catch (error: any) {
  console.error("REGISTER ERROR:", error);
  return NextResponse.json({ error: error.message || "Internal Server Error", stack: error.stack }, { status: 500 });
}
}
