import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships } from "@/db/schema";
import { getAuth } from "@/lib/auth";

async function ownedGroup(id: number, teacherId: number) {
  const [g] = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.teacherId, teacherId))).limit(1);
  return g;
}

// approve | reject member requests
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const g = await ownedGroup(Number(id), auth.id);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });

  const { membershipId, action } = await req.json().catch(() => ({}));
  if (!["approve", "reject", "pending"].includes(action)) {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
  await db
    .update(memberships)
    .set({ status, approvedAt: status === "approved" ? new Date() : null })
    .where(and(eq(memberships.id, Number(membershipId)), eq(memberships.groupId, g.id)));
  return NextResponse.json({ ok: true });
}

// remove a member entirely
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const g = await ownedGroup(Number(id), auth.id);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
  const { membershipId } = await req.json().catch(() => ({}));
  await db.delete(memberships).where(and(eq(memberships.id, Number(membershipId)), eq(memberships.groupId, g.id)));
  return NextResponse.json({ ok: true });
}
