import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { normalizeText } from "@/lib/grading";

export async function POST(req: NextRequest) {
  const { name, password } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim() || typeof password !== "string") {
    return NextResponse.json({ error: "أدخل الاسم واللقب وكلمة المرور" }, { status: 400 });
  }
  
  const cleanName = name.trim();
  
  // Try exact match first
  const rows = await db.select().from(students).where(eq(students.name, cleanName)).limit(1);
  let student = rows[0] || null;
  
  // If not found, try normalized match (more robust for Arabic names)
  if (!student) {
    const allStudents = await db.select().from(students);
    const found = allStudents.find(curr => normalizeText(curr.name) === normalizeText(cleanName));
    if (found) student = found;
  }
  
  if (!student) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  
  // Backward compatibility for existing students who don't have a password set yet
  if (student.passwordHash !== "" && !verifyPassword(password, student.passwordHash)) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  
  const res = NextResponse.json({ ok: true, id: student.id });
  setSessionCookie(res, { role: "student", id: student.id });
  return res;
}
