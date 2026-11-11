import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizzes, QUESTION_TYPES } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { parseNumber } from "@/lib/grading";

async function ownedQuiz(id: number, teacherId: number) {
  const [q] = await db.select().from(quizzes).where(and(eq(quizzes.id, id), eq(quizzes.teacherId, teacherId))).limit(1);
  return q;
}

function validateQuestion(body: any): { error?: string; row?: any } {
  const { type, prompt, points } = body;
  if (!QUESTION_TYPES.includes(type)) return { error: "نوع السؤال غير معروف" };
  // السماح بنص قصير أو فارغ إذا كان الأستاذ سيعوضه بصورة
  const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const pts = Number(points);
  if (!Number.isInteger(pts) || pts < 1 || pts > 100) return { error: "درجة السؤال يجب أن تكون عددًا صحيحًا بين 1 و 100" };

  const maxImages = Math.max(1, Math.min(6, Number(body.maxImages) || 3));
  const row: any = {
    type,
    prompt: cleanPrompt || "(سؤال مصور)",
    points: pts,
    allowImages: body.allowImages === true,
    maxImages,
    allowExplanation: body.allowExplanation !== false,
  };

  if (type === "mcq") {
    const options = (Array.isArray(body.options) ? body.options : []).map((o: any) => String(o).trim()).filter(Boolean);
    if (options.length < 2 || options.length > 6) return { error: "أضف من 2 إلى 6 اختيارات" };
    const co = Number(body.correctOption);
    if (!Number.isInteger(co) || co < 0 || co >= options.length) return { error: "حدد الإجابة الصحيحة" };
    row.options = options;
    row.correctOption = co;
    row.correctBool = null;
    row.correctNumber = null;
    row.tolerance = "0";
    row.acceptedAnswers = null;
  } else if (type === "tf") {
    if (typeof body.correctBool !== "boolean") return { error: "حدد الإجابة الصحيحة (صواب/خطأ)" };
    row.options = null;
    row.correctOption = null;
    row.correctBool = body.correctBool;
    row.correctNumber = null;
    row.tolerance = "0";
    row.acceptedAnswers = null;
  } else if (type === "numeric") {
    const n = parseNumber(body.correctNumber ?? "");
    if (n === null) return { error: "اكتب الإجابة الرقمية الصحيحة" };
    const tol = parseNumber(body.tolerance ?? "0");
    row.options = null;
    row.correctOption = null;
    row.correctBool = null;
    row.correctNumber = String(n);
    row.tolerance = String(tol ?? 0);
    row.acceptedAnswers = null;
  } else if (type === "short") {
    const answers = String(body.acceptedAnswers ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (answers.length === 0) return { error: "اكتب إجابة واحدة مقبولة على الأقل (كل سطر = إجابة)" };
    row.options = null;
    row.correctOption = null;
    row.correctBool = null;
    row.correctNumber = null;
    row.tolerance = "0";
    row.acceptedAnswers = answers;
  } else if (type === "manual") {
    row.options = null;
    row.correctOption = null;
    row.correctBool = null;
    row.correctNumber = null;
    row.tolerance = "0";
    row.acceptedAnswers = null;
  }
  return { row };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const quiz = await ownedQuiz(Number(id), auth.id);
  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { error, row } = validateQuestion(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${questions.orderIndex}), -1)` })
    .from(questions)
    .where(eq(questions.quizId, quiz.id));
  const [inserted] = await db.insert(questions).values({ ...row, quizId: quiz.id, orderIndex: (max?.m ?? -1) + 1 }).returning({ id: questions.id });
  return NextResponse.json({ ok: true, id: inserted.id });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const quiz = await ownedQuiz(Number(id), auth.id);
  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const qid = Number(body.questionId);
  const [q] = await db.select().from(questions).where(and(eq(questions.id, qid), eq(questions.quizId, quiz.id))).limit(1);
  if (!q) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });

  // reorder
  if (body.action === "up" || body.action === "down") {
    const all = await db.select().from(questions).where(eq(questions.quizId, quiz.id)).orderBy(asc(questions.orderIndex));
    const idx = all.findIndex((x) => x.id === q.id);
    const swap = body.action === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= all.length) return NextResponse.json({ ok: true });
    const other = all[swap];
    await db.update(questions).set({ orderIndex: other.orderIndex }).where(eq(questions.id, q.id));
    await db.update(questions).set({ orderIndex: q.orderIndex }).where(eq(questions.id, other.id));
    return NextResponse.json({ ok: true });
  }

  const { error, row } = validateQuestion(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  await db.update(questions).set(row).where(eq(questions.id, q.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (auth?.role !== "teacher") return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const quiz = await ownedQuiz(Number(id), auth.id);
  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  const { questionId } = await req.json().catch(() => ({}));
  await db.delete(questions).where(and(eq(questions.id, Number(questionId)), eq(questions.quizId, quiz.id)));
  return NextResponse.json({ ok: true });
}
