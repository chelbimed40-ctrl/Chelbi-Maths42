import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { memberships, participants, sessions } from "@/db/schema";
import { getAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (auth?.role !== "student") return NextResponse.json({ error: "سجّل دخولك كتلميذ أولًا" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const clean = String(code ?? "").trim().toUpperCase();
  if (clean.length < 4) return NextResponse.json({ error: "اكتب كود الجلسة" }, { status: 400 });

  const [s] = await db.select().from(sessions).where(eq(sessions.code, clean)).limit(1);
  if (!s) return NextResponse.json({ error: "لا توجد جلسة بهذا الكود" }, { status: 404 });
  if (s.status === "ended") return NextResponse.json({ error: "انتهت هذه الجلسة بالفعل", finished: true }, { status: 409 });

  // must be an approved member of the session's group
  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.groupId, s.groupId), eq(memberships.studentId, auth.id), eq(memberships.status, "approved")))
    .limit(1);
  if (!m) return NextResponse.json({ error: "أنت لست عضوًا مقبولًا في مجموعة هذه الجلسة" }, { status: 403 });

  const [p] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.sessionId, s.id), eq(participants.studentId, auth.id)))
    .limit(1);
  if (!p) {
    try {
      await db.insert(participants).values({ sessionId: s.id, studentId: auth.id });
    } catch {
      // concurrent join — unique constraint guarantees single row
    }
  }
  return NextResponse.json({ ok: true, id: s.id, code: s.code });
}
