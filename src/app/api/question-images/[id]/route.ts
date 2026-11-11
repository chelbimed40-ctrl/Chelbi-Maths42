import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questionImages } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { MIME_EXT } from "@/lib/images";

/**
 * Serve a question image. Accessible by any authenticated user
 * (teachers view in editor, students view during sessions).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;

  const [img] = await db.select().from(questionImages).where(eq(questionImages.id, Number(id))).limit(1);
  if (!img) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const ext = MIME_EXT[img.mime] ?? "jpg";
  return new NextResponse(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(img.bytes),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": `attachment; filename="question-${img.id}.${ext}"` } : {}),
    },
  });
}
