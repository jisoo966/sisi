"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * SisiChatCharacter — Sísí resting on the conversation paper, with a few
 * quiet expressions (one fixed stage, so changing expression never shifts
 * the layout or the character's size).
 *
 *   seated     the first welcome / an empty conversation (not for switching)
 *   listening  the default: paws over the paper edge
 *   thinking   while a reply is being prepared (held, not a loading loop)
 *   comfort    eyes closed — reassurance, calm presence, after keeping a thought
 *
 * Art: /public/assets/sisi-chat/ — the supplied transparent PNGs are the
 * masters; the page uses 900px WebP copies (alpha and grain intact).
 */

export type SisiChatExpression = "seated" | "listening" | "thinking" | "comfort";

export const sisiChatAssets: Record<SisiChatExpression, string> = {
  seated: "/assets/sisi-chat/sisi-chat-seated-neutral.webp",
  listening: "/assets/sisi-chat/sisi-chat-paws-neutral.webp",
  thinking: "/assets/sisi-chat/sisi-chat-thinking.webp",
  comfort: "/assets/sisi-chat/sisi-chat-paws-eyes-closed.webp",
};

/**
 * Measured on the master PNGs (image px): canvas size, top of the ears,
 * bottom of the paws (feet when seated), and the midpoint between the eyes.
 *   h     character height as a fraction of the stage height
 *   sink  how far the paws rest below the stage bottom (onto the paper)
 * Tuned so the eye line stays within ~1% for listening / comfort / thinking
 * and the heads read as the same size; seated sits a little smaller.
 */
const LAYOUT: Record<SisiChatExpression, { iw: number; ih: number; top: number; bottom: number; eyeX: number; h: number; sink: number }> = {
  listening: { iw: 1536, ih: 1024, top: 74, bottom: 965, eyeX: 714, h: 0.92, sink: 0 },
  comfort: { iw: 1536, ih: 1024, top: 106, bottom: 928, eyeX: 722, h: 0.9, sink: 0.012 },
  thinking: { iw: 1417, ih: 1110, top: 45, bottom: 1077, eyeX: 680, h: 1.06, sink: 0.135 },
  seated: { iw: 1218, ih: 1292, top: 154, bottom: 1201, eyeX: 601, h: 1.08, sink: 0.1 },
};
/** stage height / width */
const STAGE_AR = 0.8;

function poseStyle(e: SisiChatExpression): React.CSSProperties {
  const L = LAYOUT[e];
  const perPxH = L.h / (L.bottom - L.top); // stage heights per image px
  const perPxW = perPxH * STAGE_AR; // stage widths per image px
  return {
    width: `${(L.iw * perPxW * 100).toFixed(3)}%`,
    left: `${(50 - L.eyeX * perPxW * 100).toFixed(3)}%`,
    top: `${((1 + L.sink - L.bottom * perPxH) * 100).toFixed(3)}%`,
  };
}

/* Load each expression once (not per message), decoded before it's shown. */
const loaded = new Map<string, Promise<void>>();
function ensure(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  let p = loaded.get(src);
  if (!p) {
    const img = new Image();
    img.src = src;
    p = (img.decode ? img.decode() : new Promise<void>((r) => (img.onload = () => r()))).catch(() => undefined);
    loaded.set(src, p);
  }
  return p;
}

export function SisiChatCharacter({ expression, still = false }: { expression: SisiChatExpression; still?: boolean }) {
  const [shown, setShown] = useState<SisiChatExpression>(expression);

  useEffect(() => {
    Object.values(sisiChatAssets).forEach(ensure);
  }, []);

  // keep the current expression until the next one is ready, then crossfade
  useEffect(() => {
    if (expression === shown) return;
    let cancelled = false;
    ensure(sisiChatAssets[expression]).then(() => {
      if (!cancelled) setShown(expression);
    });
    return () => {
      cancelled = true;
    };
  }, [expression, shown]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`scc-stage${still ? " is-still" : ""}`} aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.div
            key={shown}
            className="scc-pose"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
            transition={{ opacity: { duration: 0.18, ease: "easeOut" }, y: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
          >
            <div className={`scc-idle scc-idle--${shown}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sisiChatAssets[shown]} alt="" draggable={false} style={poseStyle(shown)} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <style jsx global>{`
        .scc-stage {
          position: absolute;
          left: 50%;
          top: 0;
          width: clamp(150px, 42vw, 200px);
          aspect-ratio: 5 / 4;
          /* the stage sits on the paper; the paws overlap its top edge */
          transform: translate(-50%, -88%);
          z-index: 3;
          pointer-events: none;
          user-select: none;
        }
        .scc-pose, .scc-idle { position: absolute; inset: 0; }
        .scc-idle img { position: absolute; height: auto; max-width: none; display: block; -webkit-user-drag: none; }
        /* only the visible expression moves, and barely */
        .scc-idle { animation: scc-float 4.4s ease-in-out infinite; transform-origin: 50% 100%; }
        .scc-idle--comfort { animation: scc-breathe 4.8s ease-in-out infinite; }
        .scc-stage.is-still .scc-idle { animation-play-state: paused; }
        @keyframes scc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes scc-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.008); } }
        @media (prefers-reduced-motion: reduce) {
          .scc-idle, .scc-idle--comfort { animation: none; }
        }
      `}</style>
    </MotionConfig>
  );
}
