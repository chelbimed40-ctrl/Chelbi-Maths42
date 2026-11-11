"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, EyeOff, Eye, Loader2, ImageIcon } from "lucide-react";

export interface ExportRow {
  rank: number;
  name: string;
  points: number;
  correct?: number;
  answered?: number;
}

export function ExportResultsImage({
  title,
  subtitle,
  rows,
  maxScore,
  label = "تصدير النتائج كصورة",
}: {
  title: string;
  subtitle: string;
  rows: ExportRow[];
  maxScore?: number;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [hideNames, setHideNames] = useState(false);
  const [preview, setPreview] = useState(false);

  function maskName(name: string): string {
    if (!hideNames) return name;
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0] + "***").join(" ");
  }

  async function exportPng() {
    if (!ref.current) return;
    setBusy(true);
    try {
      // Add a tiny delay to ensure everything is settled
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: "#faf7ef",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `results-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert("تعذّر تصدير الصورة");
    } finally {
      setBusy(false);
    }
  }

  const now = new Date();
  // الأرقام الإنجليزية — نبني التاريخ يدوياً للضمان الكامل
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${h}:${m}`;

  return (
    <div>
      {/* controls */}
      <div className="flex flex-col xs:flex-row gap-2 items-stretch xs:items-center">
        <button className="btn-primary btn-sm flex-1 xs:flex-none !justify-center" onClick={() => setPreview(true)} disabled={busy}>
          <ImageIcon size={15} /> {label}
        </button>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-[11px] font-bold text-stone-600 ring-1 ring-stone-200 select-none">
          <input type="checkbox" checked={hideNames} onChange={(e) => setHideNames(e.target.checked)} className="h-3.5 w-3.5 accent-[#b8921f]" />
          {hideNames ? <EyeOff size={13} /> : <Eye size={13} />}
          إخفاء الأسماء
        </label>
      </div>

      {/* preview + hidden render target */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-3 sm:p-6 overflow-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button className="btn-primary !px-6 !py-3" onClick={exportPng} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              تحميل الصورة
            </button>
            <button className="btn-ghost bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" onClick={() => setPreview(false)}>
              إغلاق
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-start justify-center pb-12">
            {/* The actual image content */}
            <div
              ref={ref}
              dir="rtl"
              className="shadow-2xl"
              style={{
                width: "720px",
                minHeight: "400px",
                fontFamily: "Cairo, Tajawal, sans-serif",
                backgroundColor: "#faf7ef",
                padding: "40px",
                borderRadius: "24px",
              }}
            >
              {/* header */}
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #d4af37, #f2d47e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#241a02",
                  }}>
                    Σ
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917" }}>النجاح في الرياضيات</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#78716c" }}>الأستاذ محمد شلبي · Success-In-Maths</div>
                  </div>
                </div>
                <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#1c1917", margin: "0 0 4px 0" }}>{title}</h1>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#78716c", margin: 0 }}>{subtitle}</p>
                {maxScore !== undefined && (
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#b8921f", marginTop: "6px" }}>الدرجة القصوى: {maxScore}</p>
                )}
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#a8a29e", marginTop: "8px" }}>
                  {dateStr} — {timeStr}
                </p>
              </div>

              {/* table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#17140c", color: "#f2d47e" }}>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 900, borderRadius: "0 12px 0 0", width: "50px" }}>الترتيب</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900 }}>التلميذ</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 900, width: "90px" }}>النقاط</th>
                    {rows[0]?.correct !== undefined && (
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 900, borderRadius: "12px 0 0 0", width: "90px" }}>صحيحة</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isTop3 = r.rank <= 3;
                    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
                    const bg = i % 2 === 0 ? "#ffffff" : "#f5f5f0";
                    return (
                      <tr key={i} style={{ backgroundColor: isTop3 ? "#fef9e7" : bg }}>
                        <td style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          fontWeight: 900,
                          fontSize: isTop3 ? "18px" : "14px",
                          color: isTop3 ? "#b8921f" : "#57534e",
                          borderBottom: "1px solid #e7e5e4",
                        }}>
                          {medal || r.rank}
                        </td>
                        <td style={{
                          padding: "10px 16px",
                          textAlign: "right",
                          fontWeight: isTop3 ? 900 : 700,
                          color: "#1c1917",
                          borderBottom: "1px solid #e7e5e4",
                          fontSize: isTop3 ? "15px" : "14px",
                        }}>
                          {maskName(r.name)}
                        </td>
                        <td style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          fontWeight: 900,
                          color: "#b8921f",
                          borderBottom: "1px solid #e7e5e4",
                          fontSize: isTop3 ? "16px" : "14px",
                        }}>
                          {Number.isInteger(r.points) ? r.points : r.points.toFixed(1)}
                        </td>
                        {r.correct !== undefined && (
                          <td style={{
                            padding: "10px 16px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#059669",
                            borderBottom: "1px solid #e7e5e4",
                          }}>
                            {r.correct}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {rows.length === 0 && (
                <p style={{ textAlign: "center", color: "#a8a29e", fontSize: "14px", fontWeight: 700, padding: "40px 0" }}>
                  لا توجد نتائج بعد
                </p>
              )}

              {/* footer */}
              <div style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #e7e5e4",
                textAlign: "center",
                fontSize: "10px",
                fontWeight: 700,
                color: "#a8a29e",
              }}>
                النجاح في الرياضيات — الأستاذ محمد شلبي{" "}
                {/* رقم الهاتف يجب أن يُعرض من اليسار إلى اليمين */}
                <span dir="ltr" style={{ direction: "ltr", unicodeBidi: "embed", display: "inline-block" }}>
                  +216 22 167 877
                </span>
                <br />
                {hideNames && <span style={{ color: "#d4af37" }}>تم إخفاء الأسماء لحماية الخصوصية</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
