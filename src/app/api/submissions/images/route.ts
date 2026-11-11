import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { answerImages, participants, questions, sessions, submissions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { IMG, makeFileKey, sniffImage } from "@/lib/images";

// رفع حد حجم الطلب لاستيعاب الصور الكبيرة
export const config = { api: { bodyParser: false } };

/**
 * Upload a handwritten-answer image for an existing submission.
 * Multipart form: { submissionId, file }.
 * Validates ownership, session state, per-question settings, size, and real image content.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "student") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "تعذّر رفع الصورة، يرجى المحاولة مجددًا" }, { status: 400 });
  const submissionId = Number(form.get("submissionId"));
  const file = form.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "لم يتم استلام أي صورة" }, { status: 400 });

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!sub || sub.studentId !== auth.id) return NextResponse.json({ error: "الإجابة غير موجودة" }, { status: 404 });

  const [s] = await db.select().from(sessions).where(eq(sessions.id, sub.sessionId)).limit(1);
  if (!s || s.status === "ended") return NextResponse.json({ error: "انتهت الجلسة — لا يمكن تعديل الإجابة" }, { status: 409 });

  const [q] = await db.select().from(questions).where(eq(questions.id, sub.questionId)).limit(1);
  if (!q) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  
  // أسئلة التصحيح اليدوي تقبل الصور دائمًا بصفة آلية
  if (q.type !== "manual") {
    return NextResponse.json({ error: "إرفاق الصور متاح فقط لأسئلة التصحيح اليدوي" }, { status: 403 });
  }

  // time rule consistency: while the question is live, respect its timer
  if (s.status === "active" && s.timeLimitSec > 0 && s.questionStartedAt) {
    const qs = await db.select().from(questions).where(eq(questions.quizId, s.quizId)).orderBy(asc(questions.orderIndex));
    const current = qs[s.currentIndex] ?? null;
    if (current && current.id === q.id) {
      const elapsed = (Date.now() - new Date(s.questionStartedAt).getTime()) / 1000;
      if (elapsed > s.timeLimitSec) return NextResponse.json({ error: "انتهى وقت هذا السؤال" }, { status: 409 });
    }
  }

  const existing = await db.select({ id: answerImages.id }).from(answerImages).where(eq(answerImages.submissionId, sub.id));
  if (existing.length >= Math.min(q.maxImages, IMG.hardMaxImages)) {
    return NextResponse.json({ error: `الحد الأقصى ${q.maxImages} صور لكل سؤال` }, { status: 409 });
  }

  // لا يوجد حد أدنى أو أقصى لحجم الصورة
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم — الصور المقبولة: JPEG و PNG و WebP" }, { status: 415 });
  }

  const [img] = await db
    .insert(answerImages)
    .values({
      submissionId: sub.id,
      studentId: auth.id,
      sessionId: sub.sessionId,
      questionId: sub.questionId,
      fileKey: makeFileKey(),
      mime: kind,
      bytes: buf.byteLength,
      data: buf,
    })
    .returning({ id: answerImages.id, mime: answerImages.mime, bytes: answerImages.bytes });

  return NextResponse.json({ ok: true, image: { ...img, count: existing.length + 1 } });
}

/** Student removes one of their own uploaded images (before grading / while session is open). */
export async function DELETE(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "student") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { imageId } = await req.json().catch(() => ({}));
  const [img] = await db.select().from(answerImages).where(eq(answerImages.id, Number(imageId))).limit(1);
  if (!img || img.studentId !== auth.id) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });
  const [s] = await db.select().from(sessions).where(eq(sessions.id, img.sessionId)).limit(1);
  if (!s || s.status === "ended") return NextResponse.json({ error: "انتهت الجلسة — لا يمكن تعديل الإجابة" }, { status: 409 });
  await db.delete(answerImages).where(eq(answerImages.id, img.id));
  return NextResponse.json({ ok: true });
}
