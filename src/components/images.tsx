"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, ImagePlus, X, RefreshCw, Loader2, ZoomIn, PenTool, Eraser, Undo2, Save, Check, Download, MousePointer2 } from "lucide-react";

/* ───────────────── client-side: ترسل الصورة كما هي بدون ضغط ───────────────── */
export async function compressImage(file: File): Promise<Blob> {
  // الصورة ترسل بحجمها الأصلي — لا حد أدنى ولا أقصى
  return file;
}

/* ───────────────── XHR upload with real progress ───────────────── */
export function uploadAnswerImage(
  submissionId: number,
  blob: Blob,
  onProgress: (pct: number) => void
): Promise<{ id: number }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.set("submissionId", String(submissionId));
    fd.set("file", new File([blob], "answer.jpg", { type: blob.type || "image/jpeg" }));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/submissions/images");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve({ id: data.image.id });
        else reject(new Error(data.error || "تعذّر رفع الصورة، يرجى المحاولة مجددًا"));
      } catch {
        reject(new Error("تعذّر رفع الصورة، يرجى المحاولة مجددًا"));
      }
    };
    xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء الرفع — تحقق من الشبكة وأعد المحاولة"));
    xhr.ontimeout = () => reject(new Error("استغرق الرفع وقتًا طويلًا — أعد المحاولة"));
    xhr.timeout = 60000;
    xhr.send(fd);
  });
}

export interface Queued {
  key: number;
  blob: Blob;
  url: string;
  kb: number;
}

/* ───────────────── picker + queue (pre-submit) ───────────────── */
export function ImageQueue({
  maxImages,
  maxMb,
  onQueue,
  disabled = false,
}: {
  maxImages: number;
  maxMb: number;
  onQueue: (q: Queued[]) => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Queued[]>([]);
  const [err, setErr] = useState("");
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(1);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function push(blob: Blob) {
    setErr("");
    setItems((prev) => {
      if (prev.length >= maxImages) {
        setErr(`الحد الأقصى ${maxImages} صور لكل سؤال`);
        return prev;
      }
      const it: Queued = { key: keyRef.current++, blob, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024) };
      const next = [...prev, it];
      onQueue(next);
      return next;
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(f.type)) {
        setErr("نوع الملف غير مدعوم — الصور المقبولة: JPEG و PNG و WebP");
        continue;
      }
      // "ترفع مهما كان حجمها" - we trust server limits (50MB)
      const blob = await compressImage(f);
      push(blob);
    }
  }

  function remove(key: number) {
    setItems((prev) => {
      const it = prev.find((x) => x.key === key);
      if (it) URL.revokeObjectURL(it.url);
      const next = prev.filter((x) => x.key !== key);
      onQueue(next);
      return next;
    });
  }

  return (
    <div className="rounded-3xl bg-amber-50/70 p-4 ring-1 ring-amber-200/70">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-stone-800">إرفاق صورة الإجابة</p>
        <span className="chip bg-white text-stone-500 ring-1 ring-stone-200" dir="ltr">{items.length} / {maxImages}</span>
      </div>
      <p className="mt-1 text-[11px] font-bold leading-5 text-stone-500">
        التقط صورة لإجابتك المكتوبة أو اخترها من المعرض — تُقبل جميع الأحجام.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled || items.length >= maxImages} onClick={() => camRef.current?.click()} className="btn-ghost !py-3">
          <Camera size={17} className="text-[#b8921f]" /> التقاط صورة
        </button>
        <button type="button" disabled={disabled || items.length >= maxImages} onClick={() => galRef.current?.click()} className="btn-ghost !py-3">
          <ImagePlus size={17} className="text-[#b8921f]" /> من المعرض
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {items.map((it) => (
            <div key={it.key} className="group relative overflow-hidden rounded-2xl ring-1 ring-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="معاينة صورة الإجابة" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(it.key)}
                className="absolute top-1 left-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                title="إزالة الصورة"
              >
                <X size={14} />
              </button>
              <span className="absolute bottom-1 right-1 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white" dir="ltr">
                {it.kb} ك.ب
              </span>
            </div>
          ))}
        </div>
      )}
      {err && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">{err}</p>}
    </div>
  );
}

/* ───────────────── post-submit attachment manager ───────────────── */
export function AttachedImages({
  submissionId,
  imageIds,
  annotatedImageIds = [],
  maxImages,
  maxMb,
  sessionOpen,
  onChanged,
}: {
  submissionId: number;
  imageIds: number[];
  annotatedImageIds?: number[];
  maxImages: number;
  maxMb: number;
  sessionOpen: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [removing, setRemoving] = useState(0);
  const galRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files || !files[0]) return;
    setBusy(true);
    setErr("");
    setProgress(0);
    let ok = 0;
    try {
      for (const f of Array.from(files)) {
        if (imageIds.length + ok >= maxImages) throw new Error(`الحد الأقصى ${maxImages} صور لكل سؤال`);
        // "ترفع مهما كان حجمها"
        const blob = await compressImage(f);
        await uploadAnswerImage(submissionId, blob, (p) => setProgress(p));
        ok++;
      }
      onChanged();
    } catch (e: any) {
      setErr(e.message || "تعذّر رفع الصورة، يرجى المحاولة مجددًا");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function remove(id: number) {
    setRemoving(id);
    try {
      await fetch("/api/submissions/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id }),
      });
      onChanged();
    } finally {
      setRemoving(0);
    }
  }

  return (
    <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-stone-800">صور إجابتك المرفقة</p>
        <span className="chip bg-stone-100 text-stone-500" dir="ltr">{imageIds.length} / {maxImages}</span>
      </div>
      {imageIds.length > 0 && (
        <div className="mt-3 grid grid-cols-2 xs:grid-cols-3 gap-2">
          {imageIds.map((id) => {
            const isAnnotated = annotatedImageIds.includes(id);
            return (
              <div key={id} className="flex flex-col gap-1">
                <div className="group relative overflow-hidden rounded-2xl ring-1 ring-stone-200">
                  <ZoomableImage 
                    src={`/api/images/${id}?annotated=1&v=${isAnnotated ? Date.now() : 'orig'}`} 
                    alt="صورة إجابتك" 
                  />
                  {sessionOpen && !isAnnotated && (
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(id); }}
                      disabled={removing === id}
                      className="absolute top-1 left-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      title="حذف الصورة"
                    >
                      {removing === id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  )}
                  {isAnnotated && (
                    <span className="absolute top-1 right-1 z-10 chip bg-amber-500 text-white !px-1.5 !py-0.5 text-[9px]">مصححة</span>
                  )}
                </div>
                <p className="text-[10px] text-center font-bold text-stone-400">
                  {isAnnotated ? "شاهد التصحيح" : "اضغط للتكبير"}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {sessionOpen && imageIds.length < maxImages && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => camRef.current?.click()} className="btn-ghost !py-2.5 btn-sm">
              <Camera size={15} /> كاميرا
            </button>
            <button type="button" disabled={busy} onClick={() => galRef.current?.click()} className="btn-ghost !py-2.5 btn-sm">
              <ImagePlus size={15} /> معرض الصور
            </button>
          </div>
          <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </div>
      )}
      {progress !== null && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-stone-500">
            <RefreshCw size={12} className="animate-spin" /> جارٍ رفع الصورة... {progress}%
          </p>
          <div className="pbar"><span style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {err && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">{err}</p>}
    </div>
  );
}

/* ───────────────── lightbox zoom (shared) ───────────────── */
export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  return (
    <>
      <button className="group relative block w-full overflow-hidden rounded-2xl ring-1 ring-stone-200" onClick={() => { setOpen(true); setZoom(1); }} title="تكبير الصورة">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-72 w-full object-contain bg-stone-950/95" loading="lazy" />
        <span className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-xl bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn size={17} />
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4" onClick={() => setOpen(false)}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-sm bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
              <span className="w-14 text-center text-xs font-black text-white" dir="ltr">{Math.round(zoom * 100)}%</span>
              <button className="btn btn-sm bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
            </div>
            <button className="btn btn-sm bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" onClick={() => setOpen(false)}>
              <X size={14} /> إغلاق
            </button>
          </div>
          <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="grid min-h-full place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }} className="max-w-full transition-transform" />
            </div>
          </div>
          <p className="pt-2 text-center text-[11px] font-bold text-white/50">استخدم أزرار التكبير لفحص خطوات الحل بعناية — اسحب للتنقل</p>
        </div>
      )}
    </>
  );
}

/* ───────────────── Teacher Annotation Tool (Tablette Graphique) ───────────────── */
const ANNOTATION_COLORS = ["#dc2626", "#2563eb", "#059669", "#d4af37", "#000000"];

export function AnnotatableImage({ 
  imageId, 
  src, 
  alt, 
  onSaved 
}: { 
  imageId: number; 
  src: string; 
  alt: string; 
  onSaved: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(ANNOTATION_COLORS[0]);
  const [size, setSize] = useState(4);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const containerWidth = w.clientWidth;
      const scale = containerWidth / img.width;
      const h = img.height * scale;
      
      const dpr = window.devicePixelRatio || 1;
      c.width = containerWidth * dpr;
      c.height = h * dpr;
      c.style.width = `${containerWidth}px`;
      c.style.height = `${h}px`;
      
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, containerWidth, h);
      
      // Load existing annotation if any (future feature, for now just fresh canvas on top)
    };
  }, [src]);

  useEffect(() => {
    if (open) {
      setTimeout(setup, 100);
      window.addEventListener("resize", setup);
    }
    return () => window.removeEventListener("resize", setup);
  }, [open, setup]);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    history.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (history.current.length > 20) history.current.shift();
    drawing.current = true;
    last.current = pos(e);
    c.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // الممحاة ترسم بالأبيض فوق الصورة بدلاً من حذف البكسلات
    ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = mode === "eraser" ? size * 3 : size;

    ctx.beginPath();
    if (last.current) ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() {
    drawing.current = false;
    last.current = null;
  }

  function undo() {
    const c = canvasRef.current!;
    const img = history.current.pop();
    if (img) c.getContext("2d")!.putImageData(img, 0, 0);
  }

  async function save() {
    setBusy(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      const res = await fetch(`/api/images/${imageId}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("فشل حفظ التصحيح");
      setDone(true);
      setTimeout(() => { setDone(false); setOpen(false); }, 1500);
      onSaved();
    } catch (e) {
      alert("خطأ في الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button 
        className="btn-ghost btn-sm w-full mt-2" 
        onClick={() => setOpen(true)}
      >
        <PenTool size={14} /> تصحيح يدوي (Tablette)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-900/95 p-2 sm:p-4 animate-pop">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white p-3 rounded-2xl shadow-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 border-l pl-3 ml-1 border-stone-200">
                {ANNOTATION_COLORS.map(c => (
                  <button 
                    key={c}
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-1 transition-transform hover:scale-110 ${color === c && mode === "pen" ? "ring-indigo-500 scale-110" : "ring-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { setColor(c); setMode("pen"); }}
                  />
                ))}
              </div>
              <input 
                type="range" min={1} max={15} value={size} dir="ltr" 
                onChange={e => setSize(Number(e.target.value))} 
                className="w-20 accent-indigo-500"
              />
              <button 
                className={`btn-sm ${mode === "eraser" ? "btn-primary" : "btn-ghost"}`} 
                onClick={() => setMode("eraser")}
              >
                <Eraser size={14} />
              </button>
              <button className="btn-ghost btn-sm" onClick={undo}><Undo2 size={14} /></button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                className="btn-primary btn-sm min-w-[120px]" 
                disabled={busy} 
                onClick={save}
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : done ? <Check size={14} /> : <Save size={14} />}
                {done ? "تم الحفظ" : "حفظ التصحيح"}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
          </div>

          <div ref={wrapRef} className="flex-1 overflow-auto bg-stone-800 rounded-2xl flex items-start justify-center shadow-inner p-4">
            <canvas 
              ref={canvasRef} 
              className="wb-canvas shadow-2xl bg-white" 
              onPointerDown={down} 
              onPointerMove={move} 
              onPointerUp={up} 
              onPointerLeave={up}
            />
          </div>
          <p className="text-white/60 text-center text-[10px] py-2 font-bold">
            استخدم القلم أو Tablette Graphique للتصحيح المباشر فوق إجابة التلميذ
          </p>
        </div>
      )}
    </>
  );
}
