import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { emailIsConfigured, sendTeacherResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { phone } = await req.json().catch(() => ({}));

  if (typeof phone !== "string" || !phone.trim()) {
    return NextResponse.json({ error: "أدخل رقم الهاتف" }, { status: 400 });
  }

  // Clean phone input for comparison
  const cleanInput = phone.replace(/\D/g, "");
  const expectedPhone = "21622167877";

  if (!cleanInput.endsWith(expectedPhone)) {
    return NextResponse.json({ error: "رقم الهاتف غير مسجّل" }, { status: 404 });
  }

  // Get the teacher account - bypassing email check as requested
  const [teacher] = await db.select().from(teachers).limit(1);
  if (!teacher) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 30 * 60 * 1000);

  await db
    .update(teachers)
    .set({ resetToken: token, resetTokenExpiry: expiry })
    .where(eq(teachers.id, teacher.id));

  // Build the reset URL using the real public host (not 0.0.0.0)
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const origin = `${fwdProto}://${fwdHost}`;
  const resetUrl = `${origin}/teacher/reset-password?token=${token}`;

  return NextResponse.json({
    ok: true,
    resetUrl,
    message: "تم إنشاء رابط الاستعادة بنجاح.",
  });
}
