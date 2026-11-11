import crypto from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sessionCode(): string {
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function inviteToken(): string {
  // كود انخراط من 4 أرقام
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface Level {
  name: string;
  min: number;
}

export const LEVELS: Level[] = [
  { name: "مبتدئ", min: 0 },
  { name: "مجتهد", min: 50 },
  { name: "متفوق", min: 120 },
  { name: "نجم الرياضيات", min: 250 },
  { name: "عبقري الأرقام", min: 450 },
];

export function levelFor(points: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i].min) idx = i;
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? Math.min(1, (points - current.min) / (next.min - current.min)) : 1;
  return { index: idx, current, next, progress, stars: Math.floor(points / 25) };
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  tf: "صواب / خطأ",
  numeric: "إجابة رقمية",
  short: "إجابة قصيرة",
  manual: "تصحيح يدوي",
};

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function fmtPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
