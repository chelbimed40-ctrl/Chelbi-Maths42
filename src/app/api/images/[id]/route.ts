import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { answerImages, sessions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { MIME_EXT } from "@/lib/images";

/**
 * Authorized image streaming: only the owning student or the session's teacher.
 * Images are never exposed through public, unauthenticated URLs.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;

  const [img] = await db.select().from(answerImages).where(eq(answerImages.id, Number(id))).limit(1);
  if (!img) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  if (auth.role === "student") {
    if (img.studentId !== auth.id) return NextResponse.json({ error: "غير مصرّح بعرض هذه الصورة" }, { status: 403 });
  } else {
    const [s] = await db.select().from(sessions).where(eq(sessions.id, img.sessionId)).limit(1);
    if (!s || s.teacherId !== auth.id) return NextResponse.json({ error: "غير مصرّح بعرض هذه الصورة" }, { status: 403 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const annotated = req.nextUrl.searchParams.get("annotated") === "1";
  
  const hasAnnotation = !!img.annotatedData;
  const data = (annotated && hasAnnotation) ? img.annotatedData! : img.data;
  const mime = (annotated && hasAnnotation) ? "image/png" : img.mime;
  const ext = annotated ? "png" : (MIME_EXT[img.mime] ?? "jpg");

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.length),
      "Cache-Control": annotated ? "no-cache, no-store, must-revalidate" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": `attachment; filename="answer-${img.id}${annotated ? "-corrected" : ""}.${ext}"` } : {}),
    },
  });
}
