"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { hintDone } from "@/lib/hints";

import { IconPencil } from "@/components/ds";

/**
 * CaptureFAB — keeping a Moment, the main action, within the thumb's
 * reach: bottom right, just above the tabs. A pencil, not a camera: it opens
 * the writing page (the question first; a photo is optional inside).
 *
 *   paper  a small warm-paper disc with the crayon camera (default — it reads
 *          as the one thing to tap)
 *   quiet  the crayon camera alone in ivory, like the top-right tools
 *   sketch the camera inside a hand-drawn crayon ring (ivory), with a faint
 *          ivory wash inside so it holds its own over the grass (default)
 *
 * Anchor: bottom = --fab-bottom · right = --fab-right · size = --fab-size.
 */

type Props = {
  onClick: () => void;
  look?: "paper" | "quiet" | "sketch";
  /** the first times: its name beside it (until the first moment is kept) */
  showName?: boolean;
};

export function CaptureFAB({ onClick, look = "sketch", showName = false }: Props) {
  const [named, setNamed] = useState(false);
  useEffect(() => setNamed(!hintDone("capture")), []);
  return (
    <>
    {showName && named && <span className="capture-fab-name" aria-hidden>Keep a moment</span>}
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Capture a moment"
      className={`capture-fab is-${look}`}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.28 }}
      whileTap={{ scale: 0.92 }}
    >
      <IconPencil size={26} />
      <style jsx global>{`
        .capture-fab {
          position: absolute;
          bottom: var(--fab-bottom);
          right: var(--fab-right);
          width: var(--fab-size);
          height: var(--fab-size);
          border-radius: 9999px;
          border: 0;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 12;
          -webkit-tap-highlight-color: transparent;
        }
        .capture-fab svg { width: 26px; height: 26px; }
        .capture-fab-name {
          position: absolute; z-index: 12; pointer-events: none; white-space: nowrap;
          right: calc(var(--fab-right) + var(--fab-size) + 8px);
          bottom: calc(var(--fab-bottom) + var(--fab-size) / 2); translate: 0 50%;
          font-family: var(--font-ui); font-size: 12.5px; letter-spacing: 0.02em; color: var(--sisi-paper);
          text-shadow: 0 1px 6px rgba(16, 45, 50, 0.6); animation: fab-name-in 600ms ease 1s both;
        }
        @keyframes fab-name-in { from { opacity: 0; transform: translateX(4px); } to { opacity: 0.95; transform: none; } }
        /* paper: warm paper with its grain, a soft lift */
        .capture-fab.is-paper {
          color: var(--sisi-ink);
          background: var(--sisi-paper) var(--grain-speech) 0 0 / var(--grain-size) repeat;
          background-blend-mode: multiply;
          box-shadow: 0 2px 4px rgba(16, 45, 50, 0.14), 0 8px 18px rgba(16, 45, 50, 0.16), inset 0 0 10px rgba(16, 45, 50, 0.05);
        }
        /* quiet: the mark alone, like the other tools (a faint wash on press) */
        .capture-fab.is-quiet { color: var(--sisi-paper); background: transparent; opacity: 0.92; }
        .capture-fab.is-quiet svg { width: 30px; height: 30px; }
        .capture-fab.is-quiet:active { background: rgba(245, 239, 221, 0.14); }
        /* sketch: a hand-drawn ring around the camera */
        .capture-fab.is-sketch { color: var(--sisi-paper); background: transparent; }
        .capture-fab.is-sketch::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: currentColor;
          -webkit-mask: url("/assets/ui/sketch-ring.svg") center / 100% 100% no-repeat;
          mask: url("/assets/ui/sketch-ring.svg") center / 100% 100% no-repeat;
        }
        .capture-fab.is-sketch::after {
          content: ""; position: absolute; inset: 5px; border-radius: 50%; pointer-events: none;
          background: rgba(245, 239, 221, 0.12);
          transition: background 320ms ease;
        }
        .capture-fab.is-sketch:active::after { background: rgba(245, 239, 221, 0.26); transition-duration: 60ms; }
        .capture-fab.is-sketch svg { position: relative; z-index: 1; }
      `}</style>
    </motion.button>
    </>
  );
}
