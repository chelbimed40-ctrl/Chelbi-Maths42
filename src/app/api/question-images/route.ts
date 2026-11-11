import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionImages, questions, quizzes } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { IMG, makeFileKey, sniffImage } from "@/lib/images";

/** Upload an image to illustrate a question prompt (teacher only). */
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "تعذّر رفع الصورة" }, { status: 400 });

  const questionId = Number(form.get("questionId"));
  const file = form.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "لم يتم استلام أي صورة" }, { status: 400 });

  // verify ownership
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!q) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, q.quizId), eq(quizzes.teacherId, auth.id))).limit(1);
  if (!quiz) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });

  // limit: max 4 images per question
  const existing = await db.select({ id: questionImages.id }).from(questionImages).where(eq(questionImages.questionId, questionId));
  if (existing.length >= 4) return NextResponse.json({ error: "الحد الأقصى 4 صور لكل سؤال" }, { status: 409 });

  const maxBytes = IMG.maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes) return NextResponse.json({ error: `حجم الصورة يتجاوز الحد المسموح (${IMG.maxUploadMb} ميجابايت)` }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) return NextResponse.json({ error: "نوع الملف غير مدعوم — الصور المقبولة: JPEG و PNG و WebP" }, { status: 415 });

  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${questionImages.orderIndex}), -1)` })
    .from(questionImages)
    .where(eq(questionImages.questionId, questionId));

  const [img] = await db
    .insert(questionImages)
    .values({
      questionId,
      fileKey: makeFileKey(),
      mime: kind,
      bytes: buf.byteLength,
      orderIndex: (max?.m ?? -1) + 1,
      data: buf,
    })
    .returning({ id: questionImages.id, mime: questionImages.mime, bytes: questionImages.bytes });

  return NextResponse.json({ ok: true, image: img, count: existing.length + 1 });
}

/** Delete a question image (teacher only). */
export async function DELETE(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { imageId } = await req.json().catch(() => ({}));
  const [img] = await db.select().from(questionImages).where(eq(questionImages.id, Number(imageId))).limit(1);
  if (!img) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  // verify ownership chain
  const [q] = await db.select().from(questions).where(eq(questions.id, img.questionId)).limit(1);
  if (!q) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, q.quizId), eq(quizzes.teacherId, auth.id))).limit(1);
  if (!quiz) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });

  await db.delete(questionImages).where(eq(questionImages.id, img.id));
  return NextResponse.json({ ok: true });
}
