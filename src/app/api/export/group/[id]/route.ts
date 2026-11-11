import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { groups, participants, sessions, students, memberships } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { groupLeaderboard } from "@/lib/grading";
import { toCsv, levelFor } from "@/lib/utils";

/** Export a group's cumulative standings + per-session history as CSV. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;

  const [g] = await db.select().from(groups).where(and(eq(groups.id, Number(id)), eq(groups.teacherId, auth.id))).limit(1);
  if (!g) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });

  const board = await groupLeaderboard(g.id);
  const sRow = await db.select().from(sessions).where(eq(sessions.groupId, g.id));
  const parts = await db
    .select({
      sessionId: participants.sessionId,
      name: students.name,
      totalPoints: participants.totalPoints,
      correctCount: participants.correctCount,
    })
    .from(participants)
    .innerJoin(students, eq(students.id, participants.studentId));

  const rows: unknown[][] = [];
  rows.push(["تقرير المجموعة", g.name, g.grade ?? ""]);
  rows.push(["إجمالي الجلسات", sRow.length]);
  rows.push([]);
  rows.push(["الترتيب", "التلميذ", "النقاط التراكمية", "المستوى", "النجوم"]);
  board.forEach((b, i) => {
    const lv = levelFor(b.cumulativePoints);
    rows.push([i + 1, b.name, b.cumulativePoints, lv.current.name, lv.stars]);
  });
  rows.push([]);
  rows.push(["سجل الجلسات"]);
  rows.push(["التلميذ", "جلسة رقم", "نقاط الجلسة", "إجابات صحيحة"]);
  for (const s of sRow) {
    for (const p of parts.filter((x) => x.sessionId === s.id)) {
      rows.push([p.name, s.code, p.totalPoints, p.correctCount]);
    }
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="group-${g.id}-report.csv"`,
    },
  });
}
