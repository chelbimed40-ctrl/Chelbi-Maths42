"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Hourglass, Shuffle, PenTool, Play, Pause, RotateCcw, Flag, Eraser, Download, Trash2, Sparkles, Undo2, Circle, Square, Triangle, Minus, Compass } from "lucide-react";

function beep(times = 3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.35);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.35 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.3);
      o.start(ctx.currentTime + i * 0.35);
      o.stop(ctx.currentTime + i * 0.35 + 0.32);
    }
  } catch { /* no audio context */ }
}

/* ─────────────── COUNTDOWN TIMER ─────────────── */
function CountdownTimer() {
  const [totalSec, setTotalSec] = useState(300);
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setRunning(false);
          beep(4);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const presets = [60, 120, 300, 600, 900];

  return (
    <div className="text-center">
      <div className="flex flex-wrap justify-center gap-2">
        {presets.map((p) => (
          <button key={p} className={`btn-sm ${totalSec === p && !running ? "btn-primary" : "btn-ghost"}`} onClick={() => { setTotalSec(p); setLeft(p); setRunning(false); }}>
            {p / 60 >= 1 ? `${p / 60} د` : `${p} ث`}
          </button>
        ))}
      </div>
      <div className="my-8 font-display text-8xl font-black tracking-tight text-slate-900 sm:text-9xl" dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
        {mm}:{ss}
      </div>
      <div className="pbar mx-auto max-w-md"><span style={{ width: `${totalSec ? (left / totalSec) * 100 : 0}%` }} /></div>
      <div className="mt-8 flex justify-center gap-3">
        <button className="btn-primary !px-8 !py-3.5" onClick={() => setRunning((r) => !r)}>
          {running ? <><Pause size={17} /> إيقاف مؤقت</> : <><Play size={17} /> تشغيل</>}
        </button>
        <button className="btn-ghost !px-8 !py-3.5" onClick={() => { setRunning(false); setLeft(totalSec); }}>
          <RotateCcw size={17} /> إعادة
        </button>
      </div>
      <div className="mt-6 flex items-center justify-center gap-2">
        <span className="text-xs font-bold text-slate-400">مدة مخصصة (دقائق):</span>
        <input
          type="number" min={1} max={120} defaultValue={5} dir="ltr"
          className="input !w-24 !py-2 text-center"
          onBlur={(e) => {
            const m = Math.max(1, Number(e.target.value) || 5);
            setTotalSec(m * 60);
            if (!running) setLeft(m * 60);
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────── STOPWATCH ─────────────── */
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((v) => v + 1), 100);
    return () => clearInterval(t);
  }, [running]);

  const fmt = (d: number) => {
    const mm = String(Math.floor(d / 600)).padStart(2, "0");
    const ss = String(Math.floor((d % 600) / 10)).padStart(2, "0");
    const ds = String(d % 10);
    return `${mm}:${ss}.${ds}`;
  };

  return (
    <div className="text-center">
      <div className="my-8 font-display text-8xl font-black tracking-tight text-slate-900 sm:text-9xl" dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
        {fmt(elapsed)}
      </div>
      <div className="flex justify-center gap-3">
        <button className="btn-primary !px-8 !py-3.5" onClick={() => setRunning((r) => !r)}>
          {running ? <><Pause size={17} /> إيقاف</> : <><Play size={17} /> بدء</>}
        </button>
        <button className="btn-ghost !px-8 !py-3.5" onClick={() => setLaps((l) => [elapsed, ...l])} disabled={!running}>
          <Flag size={17} /> لفة
        </button>
        <button className="btn-ghost !px-8 !py-3.5" onClick={() => { setRunning(false); setElapsed(0); setLaps([]); }}>
          <RotateCcw size={17} /> تصفير
        </button>
      </div>
      {laps.length > 0 && (
        <div className="mx-auto mt-6 max-w-xs space-y-1.5">
          {laps.map((l, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-xs font-black ring-1 ring-slate-100">
              <span className="text-slate-400">لفة {laps.length - i}</span>
              <span dir="ltr" className="text-slate-700">{fmt(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── NAME PICKER ─────────────── */
function NamePicker({ groups }: { groups: { id: number; name: string }[] }) {
  const [groupId, setGroupId] = useState<number | "">(groups[0]?.id ?? "");
  const [display, setDisplay] = useState("؟");
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const intervalRef = useRef<any>(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  async function pick() {
    if (!groupId) return;
    setErr("");
    setWinner(null);
    setSpinning(true);
    try {
      const res = await fetch(`/api/tools/pick?group=${groupId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الاختيار");
      const roster: { name: string }[] = data.roster;
      const target = data.pick as number;
      const winName = roster[target].name;

      // slot-machine animation: fast cycles, then slow down, land on winner
      let step = 0;
      const totalSteps = 26 + target;
      const tick = () => {
        setDisplay(roster[(step + totalSteps - target) % roster.length] === undefined ? "؟" : roster[step % roster.length].name);
        step++;
        if (step < totalSteps) {
          const delay = step > totalSteps - 8 ? 60 + (step - (totalSteps - 8)) * 45 : 55;
          intervalRef.current = setTimeout(tick, delay);
        } else {
          setDisplay(winName);
          setWinner(winName);
          setSpinning(false);
          beep(2);
        }
      };
      tick();
    } catch (e: any) {
      setErr(e.message);
      setSpinning(false);
    }
  }

  return (
    <div className="text-center">
      {groups.length === 0 ? (
        <p className="mx-auto max-w-sm rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
          أنشئ مجموعة وأضف تلاميذًا مقبولين أولًا ليظهروا في عجلة الاختيار.
        </p>
      ) : (
        <>
          <div className="mx-auto max-w-xs">
            <label className="label">المجموعة</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(Number(e.target.value))}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className={`mx-auto my-8 grid h-40 max-w-md place-items-center rounded-[2rem] px-6 transition-all duration-300 ${winner ? "bg-gradient-to-l from-amber-400 to-orange-400 shadow-2xl shadow-amber-400/40" : "bg-slate-900"}`}>
            {winner && <Sparkles className="absolute mt-[-7rem] text-amber-300 animate-pop" size={36} />}
            <p className={`truncate font-display text-3xl font-black sm:text-4xl ${winner ? "text-white drop-shadow" : spinning ? "text-indigo-200" : "text-white/60"}`}>
              {display}
            </p>
          </div>
          <button className="btn-primary !px-10 !py-4 !text-lg" onClick={pick} disabled={spinning}>
            <Shuffle size={19} /> {winner ? "اختر تلميذًا آخر" : "اختر تلميذًا عشوائيًا"}
          </button>
          {err && <p className="mt-4 text-xs font-bold text-rose-600">{err}</p>}
          <p className="mt-4 text-[10px] font-bold text-slate-400">اختيار عشوائي عادل رياضيًا بين التلاميذ المقبولين فقط</p>
        </>
      )}
    </div>
  );
}

/* ─────────────── WHITEBOARD ─────────────── */
const COLORS = [
  "#1c1917", // حبر / أسود
  "#2563eb", // أزرق
  "#d4af37", // ذهبي
  "#dc2626", // أحمر
  "#16a34a", // أخضر
  "#9333ea"  // بنفسجي
];

type DrawMode = "pen" | "eraser" | "line" | "rect" | "triangle" | "circle";

function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [mode, setMode] = useState<DrawMode>("pen");
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const prev = c.width ? c.getContext("2d")?.getImageData(0, 0, c.width, c.height) : null;
    const dpr = window.devicePixelRatio || 1;
    c.width = w.clientWidth * dpr;
    c.height = Math.max(320, Math.round(w.clientWidth * 0.56)) * dpr;
    c.style.height = `${Math.max(320, Math.round(w.clientWidth * 0.56))}px`;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (prev) ctx.putImageData(prev, 0, 0);
  }, []);

  useEffect(() => {
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [setup]);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
  }

  function down(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    history.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (history.current.length > 30) history.current.shift();
    drawing.current = true;
    const p = pos(e);
    startPos.current = p;
    last.current = p;
    c.setPointerCapture(e.pointerId);

    if (mode === "pen" || mode === "eraser") {
      const dpr = window.devicePixelRatio || 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = (mode === "eraser" ? size * 4 : size) * dpr;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current || !startPos.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    const dpr = window.devicePixelRatio || 1;
    const start = startPos.current;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = (mode === "eraser" ? size * 4 : size) * dpr;

    if (mode === "pen" || mode === "eraser") {
      if (last.current) {
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      last.current = p;
    } else {
      // Shape drawing preview (restore last state then draw shape)
      const lastImg = history.current[history.current.length - 1];
      if (lastImg) ctx.putImageData(lastImg, 0, 0);

      ctx.beginPath();
      if (mode === "line") {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(p.x, p.y);
      } else if (mode === "rect") {
        ctx.rect(start.x, start.y, p.x - start.x, p.y - start.y);
      } else if (mode === "triangle") {
        ctx.moveTo(start.x + (p.x - start.x) / 2, start.y);
        ctx.lineTo(start.x, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
      } else if (mode === "circle") {
        const r = Math.hypot(p.x - start.x, p.y - start.y);
        ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  }

  function up() {
    drawing.current = false;
    last.current = null;
    startPos.current = null;
  }

  function undo() {
    const c = canvasRef.current!;
    const img = history.current.pop();
    if (img) c.getContext("2d")!.putImageData(img, 0, 0);
  }

  function clearAll() {
    if (!confirm("مسح السبورة بالكامل؟")) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    history.current.push(ctx.getImageData(0, 0, c.width, c.height));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }

  function download() {
    const a = document.createElement("a");
    a.download = `whiteboard-${Date.now()}.png`;
    a.href = canvasRef.current!.toDataURL("image/png");
    a.click();
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`h-9 w-9 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110 ${(mode !== "eraser" && color === c) ? "ring-stone-900" : "ring-transparent"}`}
              style={{ backgroundColor: c }}
              onClick={() => { setColor(c); if (mode === "eraser") setMode("pen"); }}
              title="لون الأداة"
            />
          ))}
          <span className="mx-1 h-6 w-px bg-stone-200" />
          <input
            type="range" min={2} max={16} value={size} dir="ltr"
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24 accent-[#d4af37]"
            title="سمك الخط"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button className={`btn-sm ${mode === "pen" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("pen")}><PenTool size={13} /> قلم</button>
          <button className={`btn-sm ${mode === "line" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("line")}><Minus size={13} /> مستقيم</button>
          <button className={`btn-sm ${mode === "rect" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("rect")}><Square size={13} /> مستطيل</button>
          <button className={`btn-sm ${mode === "triangle" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("triangle")}><Triangle size={13} /> مثلث</button>
          <button className={`btn-sm ${mode === "circle" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("circle")}><Compass size={13} /> بركار</button>
          <button className={`btn-sm ${mode === "eraser" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("eraser")}><Eraser size={13} /> ممحاة</button>
          <span className="mx-1 h-6 w-px bg-stone-200" />
          <button className="btn-ghost btn-sm" onClick={undo}><Undo2 size={13} /> تراجع</button>
          <button className="btn-danger btn-sm" onClick={clearAll}><Trash2 size={13} /> مسح</button>
          <button className="btn-mint btn-sm" onClick={download}><Download size={13} /> حفظ PNG</button>
        </div>
      </div>
      <div ref={wrapRef} className="overflow-hidden rounded-3xl ring-2 ring-stone-200 shadow-inner">
        <canvas
          ref={canvasRef}
          className="wb-canvas block w-full"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
      </div>
      <p className="mt-3 text-center text-[10px] font-bold text-slate-400">ارسم بالفأرة أو القلم أو باللمس مباشرة — يعمل على الجوال والسبورة التفاعلية</p>
    </div>
  );
}

/* ─────────────── TABS WRAPPER ─────────────── */
export function ClassroomTools({ groups, initialTab }: { groups: { id: number; name: string }[]; initialTab: string }) {
  const [tab, setTab] = useState(initialTab);
  const tabs = [
    { id: "timer", label: "المؤقّت", icon: Timer },
    { id: "stopwatch", label: "ساعة الإيقاف", icon: Hourglass },
    { id: "picker", label: "الاختيار العشوائي", icon: Shuffle },
    { id: "whiteboard", label: "السبورة الرقمية", icon: PenTool },
  ];
  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2 rounded-3xl bg-white p-2 ring-1 ring-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn flex-1 !justify-center ${tab === t.id ? "btn-primary" : "!text-slate-500 hover:bg-slate-50"}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      <div className="card !p-8">
        {tab === "timer" && <CountdownTimer />}
        {tab === "stopwatch" && <Stopwatch />}
        {tab === "picker" && <NamePicker groups={groups} />}
        {tab === "whiteboard" && <Whiteboard />}
      </div>
    </div>
  );
}
