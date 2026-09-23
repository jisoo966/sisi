"use client";

import { motion } from "framer-motion";

/**
 * CaptureFAB — a soft warm-cream capture button.
 *
 * Matches the mockup "Quiet main journey": a rounded cream disc with a
 * simple navy camera outline. No glass, no blur, no purple — it lives IN
 * the illustrated world.
 *
 * Anchor: directly to the safe area + bottom-nav offset (globals.css).
 *   bottom = --fab-bottom
 *   right  = --fab-right
 *   size   = --fab-size
 *
 * Scales in on mount so it feels placed rather than blitted.
 */

type Props = { onClick: () => void };

export function CaptureFAB({ onClick }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Capture a moment"
      className="capture-fab"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.28 }}
      whileTap={{ scale: 0.94 }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 8a2 2 0 0 1 2-2h2.5l1.6-2h3.8l1.6 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <circle cx="12" cy="12.5" r="3.6" />
      </svg>

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
          background: #f5efe4;
          color: var(--journey-navy);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.85) inset,
            0 6px 16px rgba(28, 35, 64, 0.18);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 12;
          -webkit-tap-highlight-color: transparent;
        }
        .capture-fab svg {
          width: 46%;
          height: 46%;
        }
      `}</style>
    </motion.button>
  );
}
