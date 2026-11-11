"use client";

import { useState } from "react";

const MATH_SYMBOLS = [
  // الأقواس
  "(", ")", "[", "]", "{", "}",
  // العمليات الحسابية الأساسية
  "=", "+", "-", "×", "÷", "±",
  // رموز المقارنة
  "≤", "≥", "≠", "≈", "<", ">",
  // رموز الأس والجذر
  "²", "³", "√", "∛",
  // ثوابت ودوال
  "π", "∞", "∫", "∑",
  // زوايا وهندسة
  "°", "∠", "∆", "⊥", "∥",
  // حروف يونانية
  "θ", "α", "β", "γ", "λ",
  // نظرية المجموعات
  "∈", "∉", "∪", "∩", "∅", "⊂", "⊃",
  // منطق رياضي
  "⇒", "⇔",
  // كسور شائعة
  "¼", "½", "¾",
];

const QUICK_SYMBOLS = ["(", ")", "[", "]", "=", "+", "-", "×", "÷", "²", "³", "√", "π", "≤", "≥", "°", "∠", "∆"];

function insertInto(targetId: string, sym: string) {
  const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.substring(0, start);
  const after = el.value.substring(end);

  el.value = before + sym + after;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(start + sym.length, start + sym.length);
}

/** Full math keyboard — for question prompt and student answer textareas */
export function MathKeyboard({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 rounded-t-xl bg-stone-100 px-3 py-1.5 text-[11px] font-black text-stone-600 hover:bg-stone-200 transition-colors border-b border-stone-200"
      >
        <span>∑ </span> {open ? "إخفاء الرموز الرياضية والهندسية" : "إظهار الرموز الرياضية والهندسية"}
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 bg-stone-50 p-2 rounded-b-xl border border-t-0 border-stone-200">
          {MATH_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => insertInto(targetId, sym)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-[#d4af37] hover:text-white hover:ring-[#d4af37] transition-all"
              style={{ direction: "ltr" }}
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact inline math symbols — for MCQ option inputs */
export function MiniMathBar({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[9px] font-bold text-[#b8921f] hover:underline"
      >
        {open ? "إخفاء ∑" : "∑ رموز"}
      </button>
      {open && (
        <div className="flex flex-wrap gap-0.5 mt-1" style={{ direction: "ltr" }}>
          {QUICK_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => insertInto(targetId, sym)}
              className="flex h-6 w-6 items-center justify-center rounded bg-stone-50 text-[11px] font-black text-stone-600 ring-1 ring-stone-200 hover:bg-[#d4af37] hover:text-white hover:ring-[#d4af37] transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
