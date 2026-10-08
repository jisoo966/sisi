"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MOMENT_DELETED, restoreMoment, type Moment } from "@/lib/momentStore";
import { haptic } from "@/lib/haptics";

/**
 * UndoDelete — after a Moment is deleted, a small paper note for a few
 * seconds: "Deleted · Undo". Undo puts it back exactly as it was (same day,
 * same Star). Mounted once, for every screen.
 */
const SHOW_MS = 6000;

export function UndoDelete() {
  const [gone, setGone] = useState<Moment | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const h = (e: Event) => {
      setFailed(false);
      setGone((e as CustomEvent<Moment>).detail);
    };
    window.addEventListener(MOMENT_DELETED, h);
    return () => window.removeEventListener(MOMENT_DELETED, h);
  }, []);
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setGone(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [gone]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {gone && (
        <motion.div
          key={gone.id}
          className="undo-note ds-note"
          role="status"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>{failed ? "It didn’t come back just now." : "Moment deleted."}</span>
          <button
            type="button"
            className="ds-text-action undo-btn"
            onClick={async () => {
              const m = gone;
              try {
                await restoreMoment(m);
                haptic("select");
                setGone(null);
              } catch {
                setFailed(true); // the button stays: try once more
              }
            }}
          >
            {failed ? "Try again" : "Undo"}
          </button>
          <style jsx global>{`
            .undo-note {
              position: fixed; z-index: 1000; left: 50%; translate: -50% 0;
              bottom: calc(var(--safe-bottom, 0px) + 96px);
              display: flex; align-items: center; gap: 14px; padding: 10px 10px 10px 18px; white-space: nowrap;
              font-family: var(--font-editorial); font-size: var(--text-body); color: var(--sisi-ink);
            }
            .undo-btn { min-height: 40px; padding: 0 10px; font-weight: 600; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
