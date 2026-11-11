import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships, students } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, name, password } = body;

  if (typeof code !== "string" || !/^\d{4}$/.test(code.trim())) {
    return NextResponse.json({ error: "أدخل كود الانخراط المكوّن من 4 أرقام" }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length < 3) {
    return NextResponse.json({ error: "اكتب الاسم واللقب (3 أحرف على الأقل)" }, { status: 400 });
  }
  if (typeof password !== "string" || !/^\d{3}$/.test(password)) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تتكون من 3 أرقام" }, { status: 400 });
  }

  const cleanCode = code.trim();
  const cleanName = name.trim();

  // Find group by invite code
  const [group] = await db.select().from(groups).where(eq(groups.inviteToken, cleanCode)).limit(1);
  if (!group) {
    return NextResponse.json({ error: "كود الانخراط غير صحيح" }, { status: 404 });
  }

  // Find or create student
  const [existing] = await db.select().from(students).where(eq(students.name, cleanName)).limit(1);
  let studentId: number;

  if (existing) {
    studentId = existing.id;
  } else {
    try {
      const [s] = await db
        .insert(students)
        .values({ name: cleanName, passwordHash: hashPassword(password), loginCode: password })
        .returning();
      studentId = s.id;
    } catch {
      const [s] = await db.select().from(students).where(eq(students.name, cleanName)).limit(1);
      if (!s) return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
      studentId = s.id;
    }
  }

  // Check existing membership
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
          : "تم رفض طلبك سابقاً — تواصل مع أستاذك";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await db.insert(memberships).values({ groupId: group.id, studentId, status: "pending" });

  return NextResponse.json({ ok: true, groupName: group.name, status: "pending" });
}
