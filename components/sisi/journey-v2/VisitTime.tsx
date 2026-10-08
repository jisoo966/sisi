"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { FilterChip, PrimaryButton, TextAction } from "@/components/ds";
import type { VisitTime as Time } from "@/lib/sisiVisits";

/**
 * VisitTime — after Sísí asked to visit and you said yes: when is good?
 * One small floating paper (the same as everywhere), two choices; the system
 * permission comes after "That's good".
 */
export function VisitTime({ open, onChoose, onSkip, onAway }: { open: boolean; onChoose: (t: Time) => void; onSkip: () => void; onAway?: () => void }) {
  const [time, setTime] = useState<Time>("morning");
  return (
    <AnimatePresence>
      {open && (
        <motion.button key="away" type="button" className="vt-away" aria-label="Close" tabIndex={-1} onClick={onAway ?? onSkip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      )}
      {open && (
        <motion.section
          key="visit"
          className="vt-wrap"
          aria-label="When Sísí visits"
          initial={{ y: "130%" }}
          animate={{ y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ y: "130%", transition: { duration: 0.4, ease: [0.55, 0, 0.75, 0.2] } }}
        >
          <div className="vt-paper ds-paper ds-deckle">
            <h2 className="vt-title">When is good for you?</h2>
            <div className="ds-chip-row vt-chips" role="radiogroup" aria-label="When">
              <FilterChip selected={time === "morning"} onClick={() => setTime("morning")}>
                In the morning
              </FilterChip>
              <FilterChip selected={time === "evening"} onClick={() => setTime("evening")}>
                In the evening 🌙
              </FilterChip>
            </div>
            <PrimaryButton block onClick={() => onChoose(time)}>
              That’s good
            </PrimaryButton>
            <TextAction className="vt-quiet" onClick={onSkip}>
              Not now
            </TextAction>
          </div>
          <style jsx global>{`
            .vt-wrap {
              position: fixed; left: 0; right: 0; margin: 0 auto; z-index: var(--z-modal);
              width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
              bottom: calc(16px + var(--safe-bottom));
            }
            .vt-away { position: fixed; inset: 0; z-index: var(--z-modal); border: 0; padding: 0; background: none; cursor: default; -webkit-tap-highlight-color: transparent; }
            .vt-paper { padding: var(--space-5); color: var(--sisi-ink); --paper-grain-layer: var(--grain-focus); filter: drop-shadow(0 10px 24px rgba(16, 45, 50, 0.32)); }
            .vt-title { margin: 0 0 var(--space-4); font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-paper-title); line-height: 1.2; letter-spacing: -0.01em; }
            .vt-chips { margin-bottom: var(--space-5); }
            .vt-quiet { display: block; margin: var(--space-2) auto 0; }
          `}</style>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
