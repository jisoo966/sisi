"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { createStar, saveStar } from "@/lib/myStars";
import { IconButton, IconClose, PrimaryButton, useKeyboardInset } from "@/components/ds";
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
  /** where the paper's top edge is (it moves with the keyboard), in the root's space */
  const [paperTop, setPaperTop] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
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

  // the paper always sits above the keyboard (or the tabs), on every phone
  useKeyboardInset(open && phase === "write");
  useEffect(() => {
    const el = paperRef.current;
    const root = rootRef.current;
    if (!open || phase !== "write" || !el || !root) return;
    const measure = () => setPaperTop(el.getBoundingClientRect().top - root.getBoundingClientRect().top);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(root);
    // the paper rises (0.6s) and slides with the keyboard (0.22s): read again once it settles
    el.addEventListener("transitionend", measure);
    const vv = window.visualViewport;
    let t2 = 0;
    const onViewport = () => {
      measure();
      clearTimeout(t2);
      t2 = window.setTimeout(measure, 260);
    };
    vv?.addEventListener("resize", onViewport);
    const t = window.setTimeout(measure, 750);
    return () => {
      ro.disconnect();
      el.removeEventListener("transitionend", measure);
      vv?.removeEventListener("resize", onViewport);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open, phase]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current;
      if (r) setSize({ w: r.offsetWidth, h: r.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, phase]);

  const sx = size.w * CURRENT_STAR_POS.x;
  const sy = size.h * CURRENT_STAR_POS.y;

  // the Star's light falls from the seed to the paper (write), and from the Star to its note (birth)
  const noteY = sy + Math.min(size.h * 0.2, 170);

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

  const seedScale = phase === "birth" ? CURRENT_STAR_POS.scale : 1.15; // the seed: waiting for the words, clearly there
  // while writing, the seed rests in the middle of the sky that is left above
  // the paper (whatever the phone or keyboard); once born it rises to its place
  const seedY = paperTop === null ? sy : Math.min(sy, Math.max(56, paperTop / 2 + 8));
  const starY = phase === "birth" ? sy : seedY;

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
            style={{ left: sx, top: starY }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: seedScale,
              opacity: phase === "birth" ? 1 : 0.85,
              filter:
                phase === "birth"
                  ? ["brightness(1) drop-shadow(0 0 14px rgba(241, 196, 94, 0.55))", "brightness(1.4) drop-shadow(0 0 22px rgba(241, 196, 94, 0.7))", "brightness(1) drop-shadow(0 0 14px rgba(241, 196, 94, 0.55))"]
                  : "brightness(1) drop-shadow(0 0 14px rgba(241, 196, 94, 0.55))",
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

          {/* while writing there is no light yet: only the quiet seed of a Star
              waits above (the light falls once it is born) */}

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
                <div className="ns-paper ds-paper">
                  <IconButton className="ns-close" label="Not now" onClick={onClose}>
                    <IconClose />
                  </IconButton>
                  <h2 className="ns-title">What do you want to bring into your life?</h2>
                  <p className="ns-sub">Write it in your own words.</p>
                  <textarea
                    className="ds-field ns-input"
                    aria-label="Your wish"
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
                  {error && <p className="ds-error ns-error" role="alert">{error}</p>}
                  <PrimaryButton block loading={busy} disabled={!wish.trim()} onClick={create}>
                    Create my Star
                  </PrimaryButton>
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
              <motion.span
                className="ns-trail"
                aria-hidden
                style={{ left: sx, top: sy + 18, height: Math.max(0, noteY - sy - 18) }}
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                transition={{ duration: 0.6, delay: reduced.current ? 0.2 : 1.45, ease: EASE }}
              />
              <motion.div
                className="ns-note ds-paper ds-paper--memory"
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
              position: absolute; transition: top 0.9s var(--ease-sisi); width: ${STAR_PX}px; height: ${STAR_PX}px;
              margin: -${STAR_PX / 2}px 0 0 -${STAR_PX / 2}px; transform-origin: center;
            }
            .ns-trail {
              position: absolute; width: 48px; margin-left: -24px;
              background: url("/assets/ui/star-trail.webp") 50% 0 / 48px 384px repeat-y;
              /* it begins inside the Star's own glow (no cut edge) and thins as it falls */
              -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 60%, rgba(0, 0, 0, 0.35) 100%);
              mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 60%, rgba(0, 0, 0, 0.35) 100%);
              filter: drop-shadow(0 0 3px rgba(241, 196, 94, 0.45));
              animation: ns-drift 16s linear infinite;
            }
            @keyframes ns-drift { to { background-position: 50% 384px; } }
            @media (prefers-reduced-motion: reduce) { .ns-trail { animation: none; } }
            /* every phone: the paper sits 12px above whichever is higher, the tabs
               or the keyboard; 16px (or the safe area) at the sides, at most 420px
               wide; and at least 112px of night always stays above it for the
               seed. If that leaves too little room, the paper scrolls inside. */
            .ns-root {
              --ns-bottom: max(calc(var(--nav-total) + 12px), calc(var(--ds-kb, 0px) + 12px));
            }
            .ns-paper-wrap {
              position: absolute; left: 0; right: 0; margin: 0 auto;
              width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
              bottom: var(--ns-bottom);
              max-height: calc(100% - var(--ns-bottom) - var(--safe-top) - 112px);
              display: flex; flex-direction: column;
              transition: bottom 220ms var(--ease-sisi);
            }
            .ns-paper {
              position: relative; flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain;
              padding: var(--space-6) var(--space-5) var(--space-5); border-radius: var(--paper-radius);
              box-shadow: 0 10px 30px rgba(16, 45, 50, 0.45); scrollbar-width: none;
            }
            .ns-paper::-webkit-scrollbar { display: none; }
            .ns-close { position: absolute; right: 6px; top: 6px; }
            .ns-title {
              margin: 0 40px 6px 0; font-family: var(--font-editorial); font-weight: 300;
              font-size: clamp(22px, 6.6vw, 27px); line-height: 1.18; letter-spacing: -0.015em; color: var(--sisi-ink);
            }
            .ns-sub { margin: 0 0 20px; font-family: var(--font-editorial); font-style: italic; font-size: 15px; line-height: 1.4; color: var(--ink-60); }
            /* their wish, in their own words: written larger than the guide */
            .ns-input { margin-bottom: 16px; font-family: var(--font-editorial); font-size: 18px; line-height: 1.4; }
            .ns-input::placeholder { font-size: 16px; color: var(--ink-35); }
            .ns-input { min-height: 88px; resize: none; }
            /* short phones (SE, mini): tighter, so the button stays in view above the keyboard */
            @media (max-height: 700px) {
              .ns-paper { padding: var(--space-5) var(--space-4) var(--space-4); }
              .ns-sub { margin-bottom: 14px; }
              .ns-input { min-height: 72px; margin-bottom: 12px; }
            }
            .ns-error { margin: -8px 0 12px; }
            .ns-wish {
              position: absolute; margin: 0; width: min(76vw, 320px); translate: -50% 0;
              text-align: center; font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-card-title); line-height: var(--leading-title);
              color: var(--sisi-paper); overflow-wrap: break-word;
            }
            .ns-note {
              position: absolute; translate: -50% 0; padding: 10px 16px 11px; white-space: nowrap;
              font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--sisi-ink);
              border-radius: 3px; box-shadow: 0 6px 16px rgba(16, 45, 50, 0.35);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
