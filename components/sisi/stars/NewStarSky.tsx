"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { createStar, saveStar } from "@/lib/myStars";
import { tornEdge } from "@/lib/tornEdge";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";
import { CURRENT_STAR_POS } from "@/components/sisi/journey-v2/StarWorld";

/**
 * NewStarSky — writing a new wish, inside the black Star World.
 *
 *   write   a small, dim seed-star waits where the Current Star lives; a thin
 *           hand-drawn thread falls from it to an ivory paper rising from the
 *           bottom (≥ 45% of the night sky stays visible)
 *   birth   the paper folds away, the seed brightens and grows into a Star
 *           (soft bloom, one gentle pulse), its wish appears beside it, and a
 *           small ivory note hangs from it: "Your journey begins here."
 *   done    onBorn(star) — the page places it on the path (same spot, no
 *           jump) and opens its detail
 *
 * No confetti, points, badges or bounce.
 */

const EDGE = tornEdge(47);
const EASE = [0.22, 1, 0.36, 1] as const;
const STAR_PX = 48; // StarLayers base size (as in StarWorld)

type Phase = "write" | "birth";

export function NewStarSky({
  open,
  existing,
  onClose,
  onBorn,
  onDirty,
}: {
  open: boolean;
  existing: Star[];
  onClose: () => void;
  onBorn: (star: Star) => void;
  onDirty?: (dirty: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("write");
  const [wish, setWish] = useState("");
  const [born, setBorn] = useState<Star | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [paperTop, setPaperTop] = useState<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPhase("write");
    setWish("");
    setBorn(null);
    setError("");
    setBusy(false);
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, [open]);

  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  useEffect(() => {
    onDirtyRef.current?.(open && phase === "write" && wish.trim().length > 0);
  }, [open, phase, wish]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current;
      if (r) setSize({ w: r.offsetWidth, h: r.offsetHeight });
      const p = paperRef.current;
      if (p) setPaperTop(p.offsetTop);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, phase]);

  const sx = size.w * CURRENT_STAR_POS.x;
  const sy = size.h * CURRENT_STAR_POS.y;

  // Thin, slightly imperfect thread: seed → paper (write), star → note (birth).
  const thread = (y0: number, y1: number) => {
    const len = y1 - y0;
    const j = (k: number) => Math.sin(k * 2.3 + 0.7) * 2.6;
    return `M ${sx} ${y0} C ${sx + j(1)} ${y0 + len * 0.3}, ${sx + j(2)} ${y0 + len * 0.66}, ${sx} ${y1}`;
  };
  const writeThread = paperTop !== null ? thread(sy + 14, paperTop + 1) : "";
  const noteY = sy + Math.min(size.h * 0.2, 170);
  const birthThread = thread(sy + 44, noteY);

  const create = async () => {
    const w = wish.trim();
    if (!w || busy) return;
    setBusy(true);
    setError("");
    try {
      const s = createStar(w, "someday", existing);
      await saveStar(s);
      setBorn(s);
      setPhase("birth");
      const hold = reduced.current ? 1400 : 3300;
      setTimeout(() => onBorn(s), hold);
    } catch {
      setError("Your Star didn’t save just now. Try once more?");
      setBusy(false);
    }
  };

  const seedScale = phase === "birth" ? CURRENT_STAR_POS.scale : 0.5;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-star"
          ref={rootRef}
          className="ns-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.35 }}
        >
          {/* the seed-star, in the Current Star's place on the path */}
          <motion.div
            className="ns-star"
            style={{ left: sx, top: sy }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: seedScale,
              opacity: phase === "birth" ? 1 : 0.45,
              filter: phase === "birth" ? ["brightness(1)", "brightness(1.4)", "brightness(1)"] : "brightness(0.9)",
            }}
            transition={
              phase === "birth"
                ? {
                    scale: { duration: reduced.current ? 0.2 : 1.1, delay: reduced.current ? 0 : 0.25, ease: EASE },
                    opacity: { duration: 0.6, delay: 0.25 },
                    filter: { duration: 1.2, delay: 1.0, times: [0, 0.4, 1] },
                  }
                : { duration: 0.8, ease: EASE }
            }
            aria-hidden
          >
            <StarLayers staged revealed focused={phase === "birth"} />
          </motion.div>

          <AnimatePresence>
            {phase === "write" && writeThread && (
              <motion.svg key="wt" className="ns-thread" aria-hidden exit={{ opacity: 0, transition: { duration: 0.3 } }}>
                <motion.path
                  d={writeThread}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                />
              </motion.svg>
            )}
          </AnimatePresence>

          {/* ── write ── */}
          <AnimatePresence>
            {phase === "write" && (
              <motion.div
                key="paper"
                ref={paperRef}
                className="ns-paper-wrap"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{ y: "30%", scaleY: 0.6, opacity: 0, transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] } }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                role="dialog"
                aria-label="New Star"
              >
                <span className="ns-shadow" aria-hidden />
                <div className="ns-paper paper-bg" style={{ clipPath: EDGE }}>
                  <button type="button" className="ns-close" aria-label="Not now" onClick={onClose}>
                    ×
                  </button>
                  <h2 className="ns-title">What do you want to bring into your life?</h2>
                  <p className="ns-sub">Write it in your own words.</p>
                  <textarea
                    className="ns-input"
                    rows={3}
                    maxLength={140}
                    autoFocus
                    value={wish}
                    placeholder="For example: Find work that feels like me."
                    onChange={(e) => setWish(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create();
                    }}
                  />
                  {error && <p className="ns-error">{error}</p>}
                  <button type="button" className="ns-primary" disabled={!wish.trim() || busy} onClick={create}>
                    Create my Star
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── birth ── */}
          {phase === "birth" && born && (
            <>
              <motion.p
                className="ns-wish"
                style={{ left: sx, top: sy + 46 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: reduced.current ? 0.1 : 0.95, ease: EASE }}
              >
                {born.wish}
              </motion.p>
              <svg className="ns-thread" aria-hidden>
                <motion.path
                  d={birthThread}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: reduced.current ? 0.2 : 1.45, ease: EASE }}
                />
              </svg>
              <motion.div
                className="ns-note paper-bg"
                style={{ left: sx, top: noteY }}
                initial={{ opacity: 0, y: -6, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -1.2 }}
                transition={{ duration: 0.7, delay: reduced.current ? 0.3 : 1.9, ease: EASE }}
              >
                Your journey begins here.
              </motion.div>
            </>
          )}

          <style jsx global>{`
            .ns-root { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
            .ns-root > * { pointer-events: none; }
            .ns-root .ns-paper-wrap { pointer-events: auto; }
            .ns-star {
              position: absolute; width: ${STAR_PX}px; height: ${STAR_PX}px;
              margin: -${STAR_PX / 2}px 0 0 -${STAR_PX / 2}px; transform-origin: center;
            }
            .ns-thread { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
            .ns-thread path { fill: none; stroke: #f1e2b8; stroke-width: 1.2; stroke-linecap: round; opacity: 0.85; }
            .ns-paper-wrap {
              position: absolute;
              left: max(14px, var(--safe-left));
              right: max(14px, var(--safe-right));
              /* sits above the dock; never taller than the lower ~55% */
              bottom: calc(var(--nav-total) + 12px);
              max-height: calc(55% - var(--nav-total) - 12px);
            }
            .ns-shadow { position: absolute; inset: 14px 6px -6px 6px; border-radius: 12px; background: rgba(0, 0, 0, 0.5); filter: blur(14px); }
            .ns-paper {
              position: relative; max-height: inherit; overflow-y: auto; overscroll-behavior-y: contain;
              padding: 26px 22px 20px; color: #2b2f45;
            }
            .ns-close {
              position: absolute; right: 10px; top: 8px; width: 44px; height: 44px; border: 0; background: transparent;
              color: rgba(43, 47, 69, 0.55); font-size: 24px; line-height: 1; cursor: pointer;
            }
            .ns-title { margin: 4px 30px 6px 0; font-family: var(--font-fraunces), Georgia, serif; font-weight: 400; font-size: 21px; line-height: 1.28; }
            .ns-sub { margin: 0 0 12px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15.5px; color: rgba(43, 47, 69, 0.66); }
            .ns-input {
              width: 100%; resize: none; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px;
              border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.55);
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; outline: none;
            }
            .ns-input::placeholder { font-style: italic; color: rgba(43, 47, 69, 0.42); }
            .ns-error { margin: 0 0 10px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 14px; color: #a4574a; }
            .ns-primary {
              display: block; width: 100%; height: 48px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; cursor: pointer;
            }
            .ns-primary:disabled { opacity: 0.45; }
            .ns-wish {
              position: absolute; margin: 0; width: min(76vw, 320px); translate: -50% 0;
              text-align: center; font-family: var(--font-fraunces), Georgia, serif; font-size: 20px; line-height: 1.3;
              color: rgba(247, 241, 227, 0.95);
            }
            .ns-note {
              position: absolute; translate: -50% 0; padding: 10px 16px 11px; white-space: nowrap;
              font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15.5px; color: #2b2f45;
              clip-path: ${tornEdge(9, 14, 3)};
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
