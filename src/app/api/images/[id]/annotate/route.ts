import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { answerImages, sessions } from "@/db/schema";
import { getAuth } from "@/lib/auth";

/**
 * Save teacher's annotations on a student's answer image.
 * Payload: { dataUrl } - Base64 PNG data from canvas.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  const { dataUrl } = await req.json().catch(() => ({}));
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "بيانات الرسم غير صالحة" }, { status: 400 });
  }

  // verify ownership (image -> session -> teacher)
  const [img] = await db.select().from(answerImages).where(eq(answerImages.id, Number(id))).limit(1);
  if (!img) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  const [s] = await db.select().from(sessions).where(eq(sessions.id, img.sessionId)).limit(1);
  if (!s || s.teacherId !== auth.id) return NextResponse.json({ error: "غير مصرّح بعرض هذه الصورة" }, { status: 403 });

  // extract base64 data
  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");

  await db
    .update(answerImages)
    .set({
      annotatedData: buffer,
      annotatedAt: new Date(),
    })
    .where(eq(answerImages.id, img.id));

  return NextResponse.json({ ok: true });
}
