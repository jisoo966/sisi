"use client";

import { motion } from "framer-motion";
import { tornEdge } from "@/lib/tornEdge";

/**
 * SpendTimeCTA — the ONE primary action on the Journey home.
 * A warm-ivory torn-paper pill resting above the tabs. Everything else on
 * the home screen stays visually quieter than this.
 */
const EDGE = tornEdge(11, 22, 4);

export function SpendTimeCTA({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      className="spend-cta"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="spend-cta__shadow" aria-hidden />
      <span className="spend-cta__paper paper-bg">Spend time with your Star</span>
      <style jsx global>{`
        .spend-cta {
          position: absolute;
          left: 50%;
          bottom: calc(var(--nav-total) + clamp(12px, 3.5vw, 18px));
          width: min(78vw, 300px);
          margin-left: calc(min(78vw, 300px) / -2);
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          z-index: 12;
          -webkit-tap-highlight-color: transparent;
        }
        .spend-cta__shadow {
          position: absolute;
          inset: 8px 8px -4px 8px;
          border-radius: 18px;
          background: rgba(10, 20, 40, 0.35);
          filter: blur(10px);
        }
        .spend-cta__paper {
          position: relative;
          display: block;
          padding: 17px 20px;
          clip-path: ${EDGE};
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(17px, 4.8vw, 19px);
          color: #2b2f45;
          text-align: center;
        }
      `}</style>
    </motion.button>
  );
}
