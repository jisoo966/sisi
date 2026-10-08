"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onStarlight, type AwardResult } from "@/lib/starlight";
import { haptic } from "@/lib/haptics";

/**
 * StarlightFeedback — a small, warm "you did it" after a qualifying activity:
 *
 *   gather   eight painted dabs of light drift in (a gentle swirl) and meet
 *   land     a soft glow blooms; "✦ +1" springs up once, its ✦ glints, and
 *            three little dabs twinkle beside it — with one light haptic
 *   release  the mark floats up a little and fades
 *
 * No confetti, no counters. Starlight is time spent with Sísí (it opens
 * Worlds) and stays apart from any one wish, so nothing flies to or from a
 * Star. When today's light is already full nothing shows at all.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const DABS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3;
  const r = 64 + (i % 3) * 14;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, d: i * 0.035, s: 0.8 + (i % 3) * 0.2 };
});
const TWINKLES = [
  { x: -34, y: -14, d: 0.78 },
  { x: 36, y: -18, d: 0.86 },
  { x: 28, y: 16, d: 0.94 },
];

export function StarlightFeedback() {
  const [gain, setGain] = useState<{ id: number; n: number } | null>(null);
  const seq = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return onStarlight((r: AwardResult) => {
      if (r.silent || r.awarded <= 0) return;
      const id = ++seq.current;
      // let the saved paper settle first
      setTimeout(() => setGain({ id, n: r.awarded }), 450);
      // the moment the light lands
      setTimeout(() => haptic("starlight"), 450 + (reduced.current ? 100 : 640));
      setTimeout(() => setGain((g) => (g && g.id === id ? null : g)), 450 + 2200);
    });
  }, []);

  if (typeof document === "undefined") return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  const still = reduced.current;
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {gain && (
            <motion.div
              key={gain.id}
              className="sl-gain"
              role="status"
              aria-label={`${gain.n} Starlight`}
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.6, ease: EASE } }}
            >
              {/* gather: dabs drift in with a gentle swirl and meet */}
              {!still &&
                DABS.map((d, i) => (
                  <motion.span
                    key={i}
                    className="sl-dab"
                    aria-hidden
                    initial={{ x: d.x, y: d.y, opacity: 0, scale: d.s, rotate: 0 }}
                    animate={{ x: [d.x, d.x * 0.45 - d.y * 0.25, 0], y: [d.y, d.y * 0.45 + d.x * 0.25, 0], opacity: [0, 1, 0.9, 0], scale: [d.s, 1, 0.4] }}
                    transition={{ duration: 0.62, delay: d.d, ease: "easeIn", times: [0, 0.55, 1] }}
                  />
                ))}
              {/* land: a soft bloom where they meet */}
              <motion.span
                className="sl-bloom"
                aria-hidden
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 0.95, 0], scale: [0.3, 1, 1.5] }}
                transition={{ duration: 0.9, delay: still ? 0 : 0.58, ease: "easeOut", times: [0, 0.35, 1] }}
              />
              {/* the mark springs up once */}
              <motion.span
                className="sl-mark"
                initial={{ opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={still ? { duration: 0.2 } : { delay: 0.6, type: "spring", stiffness: 420, damping: 15, mass: 0.7 }}
              >
                <motion.svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  aria-hidden
                  initial={{ rotate: -40, filter: "brightness(1)" }}
                  animate={{ rotate: 0, filter: still ? "brightness(1)" : ["brightness(1)", "brightness(1.8)", "brightness(1)"] }}
                  transition={{ delay: still ? 0 : 0.62, duration: 0.7, ease: EASE }}
                >
                  <path d="M12 2.4L13.7 10.3L20.4 12L13.7 13.7L12 21.2L10.3 13.7L4 12L10.3 10.3Z" fill="#F1C45E" />
                </motion.svg>
                +{gain.n}
              </motion.span>
              {/* and a few little dabs twinkle beside it */}
              {!still &&
                TWINKLES.map((t, i) => (
                  <motion.span
                    key={`t${i}`}
                    className="sl-dab sl-twinkle"
                    aria-hidden
                    style={{ left: t.x - 3, top: t.y - 3 }}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.5] }}
                    transition={{ duration: 0.7, delay: t.d, ease: "easeOut" }}
                  />
                ))}
            </motion.div>
          )}
        </AnimatePresence>,
        root,
      )}
      <style jsx global>{`
        .sl-gain {
          position: fixed; z-index: var(--z-toast); left: 50%; bottom: calc(var(--safe-bottom) + 168px);
          width: 0; height: 0; pointer-events: none;
        }
        .sl-dab {
          position: absolute; left: -4px; top: -4px; width: 8px; height: 8px;
          border-radius: 46% 54% 42% 58% / 52% 44% 56% 48%;
          background: radial-gradient(circle at 40% 38%, #fffaf0, #f6d58c 55%, rgba(241, 160, 90, 0.9));
          box-shadow: 0 0 6px rgba(241, 196, 94, 0.7);
        }
        .sl-twinkle { width: 6px; height: 6px; }
        .sl-bloom {
          position: absolute; left: -56px; top: -40px; width: 112px; height: 80px; border-radius: 50%;
          background: radial-gradient(closest-side, rgba(255, 232, 178, 0.7), rgba(241, 196, 94, 0.25) 55%, rgba(241, 196, 94, 0));
          filter: blur(2px);
        }
        .sl-mark {
          position: absolute; left: 0; top: 0; translate: -50% -50%;
          display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
          padding: 7px 14px 7px 12px; border-radius: 999px;
          background: rgba(16, 45, 50, 0.6); color: var(--sisi-paper);
          font-family: var(--font-ui); font-size: 15px; font-weight: 600; letter-spacing: 0.01em;
          box-shadow: 0 0 18px rgba(241, 196, 94, 0.35), inset 0 0 0 1px rgba(245, 239, 221, 0.12);
        }
        .sl-mark svg { overflow: visible; }
      `}</style>
    </>
  );
}
