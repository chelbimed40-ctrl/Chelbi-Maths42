import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { inviteToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { name, grade } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "اكتب اسم المجموعة" }, { status: 400 });
  }
  const [g] = await db
    .insert(groups)
    .values({ teacherId: auth.id, name: name.trim(), grade: typeof grade === "string" ? grade.trim() : "", inviteToken: inviteToken() })
    .returning();
  return NextResponse.json({ ok: true, id: g.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { groupId, action, name, grade } = body;
  const [g] = await db.select().from(groups).where(and(eq(groups.id, Number(groupId)), eq(groups.teacherId, auth.id))).limit(1);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
  if (action === "regen") {
    await db.update(groups).set({ inviteToken: inviteToken() }).where(eq(groups.id, g.id));
    return NextResponse.json({ ok: true });
  }
  if (action === "update") {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "اكتب اسم المجموعة" }, { status: 400 });
    }
    await db
      .update(groups)
      .set({ name: name.trim(), grade: typeof grade === "string" ? grade.trim() : "" })
      .where(eq(groups.id, g.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { groupId } = await req.json().catch(() => ({}));
  await db.delete(groups).where(and(eq(groups.id, Number(groupId)), eq(groups.teacherId, auth.id)));
  return NextResponse.json({ ok: true });
}
