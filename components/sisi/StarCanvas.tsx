"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Point = { x: number; y: number };

// Sparkle positions relative to canvas center
const SPARKLES = [
  { x: -72, y: -72, delay: 0     },
  { x:  72, y: -72, delay: 0.05  },
  { x: -72, y:  72, delay: 0.10  },
  { x:  72, y:  72, delay: 0.15  },
  { x:   0, y: -95, delay: 0.03  },
  { x:   0, y:  95, delay: 0.08  },
  { x: -95, y:   0, delay: 0.12  },
  { x:  95, y:   0, delay: 0.06  },
  { x: -50, y: -88, delay: 0.18  },
  { x:  50, y:  88, delay: 0.22  },
];

function addPaperGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i]     = Math.min(255, Math.max(0, d[i]     + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);
}

function flashStrokes(canvas: HTMLCanvasElement) {
  // Briefly brighten all gold strokes with an overlay glow
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;

  let frame = 0;
  const total = 18;

  function tick() {
    const progress = frame / total;
    // overlay: warm glow that fades
    const alpha = Math.sin(progress * Math.PI) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(255,215,80,${alpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    frame++;
    if (frame < total) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

type Props = {
  onComplete: (dataUrl: string) => void;
  onSkip: () => void;
};

export default function StarCanvas({ onComplete, onSkip }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dpr          = useRef(1);
  const canvasSize   = useRef(300);

  const points       = useRef<Point[]>([]);
  const totalMs      = useRef(0);
  const strokeStart  = useRef(0);
  const drawing      = useRef(false);

  const [hasDrawn,    setHasDrawn]    = useState(false);
  const [sealed,      setSealed]      = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  // ── Setup canvas ──────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ratio     = window.devicePixelRatio || 1;
    dpr.current     = ratio;

    const size = Math.min(container.clientWidth, 300);
    canvasSize.current = size;

    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width        = size * ratio;
    canvas.height       = size * ratio;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);

    // Paper background
    ctx.fillStyle = "#F9F4EC";
    ctx.fillRect(0, 0, size, size);
    addPaperGrain(ctx, size * ratio, size * ratio);
  }, []);

  // ── Pointer helpers ───────────────────────────────────────────
  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (sealed) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current  = true;
    strokeStart.current = Date.now();
    const pos = toCanvasPoint(e);
    points.current = [pos];
    if (!hasDrawn) setHasDrawn(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current || sealed) return;
    const pos = toCanvasPoint(e);
    points.current.push(pos);

    const pts = points.current;
    const len = pts.length;
    if (len < 3) return;

    const ctx  = canvasRef.current!.getContext("2d")!;
    const p0   = pts[len - 3];
    const p1   = pts[len - 2];
    const p2   = pos;
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    ctx.strokeStyle  = "#D4A82A";
    ctx.lineWidth    = 3.2;
    ctx.lineCap      = "round";
    ctx.lineJoin     = "round";
    ctx.globalAlpha  = 0.9;

    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const onPointerUp = useCallback(() => {
    if (!drawing.current || sealed) return;
    drawing.current = false;

    totalMs.current += Date.now() - strokeStart.current;

    if (totalMs.current >= 800 && !canContinue) {
      setCanContinue(true);
    }
  }, [sealed, canContinue]);

  // ── Seal & complete ───────────────────────────────────────────
  function handleContinue() {
    if (!canContinue || sealed) return;
    seal();
  }

  function seal() {
    setSealed(true);
    setShowSparkle(true);
    const canvas = canvasRef.current;
    if (canvas) flashStrokes(canvas);

    setTimeout(() => setShowMessage(true), 650);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) onComplete(canvas.toDataURL("image/png"));
    }, 2500);
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Canvas container */}
      <div ref={containerRef} className="relative w-full max-w-[300px]">
        <div className="relative inline-block w-full">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ touchAction: "none", cursor: sealed ? "default" : "crosshair", display: "block" }}
            className="w-full border border-[#D4A82A]/40 shadow-sm"
          />

          {/* Sparkle burst — positioned relative to canvas center */}
          <AnimatePresence>
            {showSparkle && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
                {SPARKLES.map((s, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      x: s.x,
                      y: s.y,
                      scale: [0, 1.3, 1, 0.6],
                    }}
                    transition={{ duration: 1.4, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute font-caveat text-[#D4A82A] select-none"
                    style={{ fontSize: i % 3 === 0 ? "20px" : "14px" }}
                  >
                    ✦
                  </motion.span>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint overlay — disappears after first stroke */}
        <AnimatePresence>
          {!hasDrawn && !sealed && (
            <motion.div
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <p className="font-garamond italic text-[#6B5648]/30 text-sm text-center px-6 leading-relaxed">
                손가락으로 자유롭게 그려봐
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sísí message */}
      <div className="h-10 mt-5 flex items-center justify-center">
        <AnimatePresence>
          {showMessage && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-fraunces italic text-[#D4A82A] text-base text-center"
            >
              좋아. 이제 시작이야.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue button */}
      <AnimatePresence>
        {canContinue && !sealed && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={handleContinue}
            className="mt-2 w-full max-w-[300px] py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors"
          >
            continue
          </motion.button>
        )}
      </AnimatePresence>

      {/* Disabled state hint */}
      {!hasDrawn && !sealed && (
        <p className="mt-4 font-garamond text-xs text-[#6B5648]/30 text-center">
          별을 그리면 다음으로 넘어갈 수 있어
        </p>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-5 font-garamond text-xs text-[#6B5648]/35 hover:text-[#6B5648]/60 transition-colors"
      >
        그리기 어려우면 — 그냥 시작하기
      </button>
    </div>
  );
}
