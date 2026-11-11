import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/* ───────────────────────────── Teachers ───────────────────────────── */
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  resetToken: varchar("reset_token", { length: 64 }),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ───────────────────────────── Groups ─────────────────────────────── */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 140 }).notNull(),
  grade: varchar("grade", { length: 80 }).default(""),
  inviteToken: varchar("invite_token", { length: 40 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ───────────────────────────── Students ───────────────────────────── */
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  loginCode: varchar("login_code", { length: 3 }), // 3 digits plain text for teacher reference
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 12 }).notNull().default("pending"), // pending | approved | rejected
    cumulativePoints: real("cumulative_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("membership_unique").on(t.groupId, t.studentId)]
);

/* ───────────────────────────── Quizzes ────────────────────────────── */
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const QUESTION_TYPES = ["mcq", "tf", "numeric", "short", "manual"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    type: varchar("type", { length: 12 }).notNull(), // QUESTION_TYPES
    prompt: text("prompt").notNull(),
    points: integer("points").notNull().default(1),
    options: jsonb("options").$type<string[]>(),
    correctOption: integer("correct_option"),
    correctBool: boolean("correct_bool"),
    correctNumber: text("correct_number"),
    tolerance: text("tolerance").default("0"),
    acceptedAnswers: jsonb("accepted_answers").$type<string[]>(),
    allowImages: boolean("allow_images").notNull().default(false),
    maxImages: integer("max_images").notNull().default(3),
    allowExplanation: boolean("allow_explanation").notNull().default(true),
  },
  (t) => [index("questions_quiz_idx").on(t.quizId)]
);

/* ──────────────── Question prompt images (teacher-uploaded) ────────── */
export const questionImages = pgTable(
  "question_images",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    fileKey: varchar("file_key", { length: 64 }).notNull().unique(),
    mime: varchar("mime", { length: 40 }).notNull(),
    bytes: integer("bytes").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("qimg_question_idx").on(t.questionId)]
);

/* ───────────────────────────── Sessions ───────────────────────────── */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 8 }).notNull().unique(),
    status: varchar("status", { length: 12 }).notNull().default("lobby"), // lobby | active | ended
    currentIndex: integer("current_index").notNull().default(-1),
    timeLimitSec: integer("time_limit_sec").notNull().default(60),
    questionStartedAt: timestamp("question_started_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_teacher_idx").on(t.teacherId)]
);

export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    totalPoints: real("total_points").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    answeredCount: integer("answered_count").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("participant_unique").on(t.sessionId, t.studentId)]
);

/* ──────────────────────────── Submissions ─────────────────────────── */
export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    answerOption: integer("answer_option"),
    answerBool: boolean("answer_bool"),
    answerNumber: text("answer_number"),
    answerText: text("answer_text"),
    needsManual: boolean("needs_manual").notNull().default(false),
    isCorrect: boolean("is_correct"),
    awardedPoints: real("awarded_points").notNull().default(0),
    feedback: text("feedback").notNull().default(""),
    reviewStatus: varchar("review_status", { length: 16 }).notNull().default("pending"), // pending | graded | resubmit
    gradeReleased: boolean("grade_released").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedBy: integer("graded_by"),
  },
  (t) => [uniqueIndex("submission_unique").on(t.sessionId, t.questionId, t.studentId)]
);

/* ─────────────── Handwritten answer images ────────────────────────── */
export const answerImages = pgTable(
  "answer_images",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    fileKey: varchar("file_key", { length: 64 }).notNull().unique(),
    mime: varchar("mime", { length: 40 }).notNull(),
    bytes: integer("bytes").notNull(),
    data: bytea("data").notNull(),
    annotatedData: bytea("annotated_data"), // للتصحيح اليدوي بواسطة الأستاذ
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    annotatedAt: timestamp("annotated_at", { withTimezone: true }),
  },
  (t) => [index("images_submission_idx").on(t.submissionId), index("images_session_idx").on(t.sessionId)]
);

/* ────────────────── Grading audit history ─────────────────────────── */
export const gradeAudit = pgTable(
  "grade_audit",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    sessionId: integer("session_id").notNull(),
    questionId: integer("question_id").notNull(),
    studentId: integer("student_id").notNull(),
    teacherId: integer("teacher_id").notNull(),
    oldPoints: real("old_points").notNull(),
    newPoints: real("new_points").notNull(),
    feedback: text("feedback").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_submission_idx").on(t.submissionId)]
);

/* ───────────────────────────── Polls ──────────────────────────────── */
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  status: varchar("status", { length: 8 }).notNull().default("open"), // open | closed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("vote_unique").on(t.pollId, t.studentId)]
);


