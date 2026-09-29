"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * PaperToast — a small torn-paper note that rises above the tab bar,
 * lingers, and sinks away (e.g. "your star is resting in moments.").
 */
export function PaperToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          className="paper-toast ds-paper"
          role="status"
          initial={{ opacity: 0, y: 24, rotate: -1.2 }}
          animate={{ opacity: 1, y: 0, rotate: -0.8 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {message}
          <style jsx global>{`
            .paper-toast {
              position: absolute;
              left: 50%;
              bottom: calc(var(--nav-total) + 18px);
              margin-left: calc(min(80vw, 320px) / -2);
              width: min(80vw, 320px);
              padding: 14px 18px;
              text-align: center;
              font-family: var(--font-editorial);
              font-size: var(--text-body);
              line-height: var(--leading-body);
              z-index: 23;
              pointer-events: none;
              border-radius: 3px;
              box-shadow: var(--paper-shadow);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
