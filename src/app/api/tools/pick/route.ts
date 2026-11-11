import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { groups, memberships, students } from "@/db/schema";
import { getAuth } from "@/lib/auth";

/** Random student picker: returns the approved roster + a crypto-random index. */
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const groupId = Number(req.nextUrl.searchParams.get("group"));
  const [g] = await db.select().from(groups).where(and(eq(groups.id, groupId), eq(groups.teacherId, auth.id))).limit(1);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });

  const roster = await db
    .select({ id: students.id, name: students.name, points: memberships.cumulativePoints })
    .from(memberships)
    .innerJoin(students, eq(students.id, memberships.studentId))
    .where(and(eq(memberships.groupId, groupId), eq(memberships.status, "approved")))
    .orderBy(asc(students.name));

  if (roster.length === 0) return NextResponse.json({ error: "لا يوجد تلاميذ مقبولون في هذه المجموعة بعد" }, { status: 404 });

  // crypto-fair uniform index (rejection sampling)
  const n = roster.length;
  const max = Math.floor(0xffffffff / n) * n;
  let x = crypto.randomBytes(4).readUInt32BE(0);
  while (x >= max) x = crypto.randomBytes(4).readUInt32BE(0);
  return NextResponse.json({ ok: true, roster, pick: x % n });
}
