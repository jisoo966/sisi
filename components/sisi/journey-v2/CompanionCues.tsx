"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createMoment } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { finishTodaysThought, isKept, markKept, thoughtForToday, type Thought } from "@/lib/sisiThoughts";

/**
 * CompanionCues — small, quiet things that sit beside Sísí in the Journey.
 *
 *   talk hint   first Journey visit only: "Tap Sísí whenever you want to talk."
 *               (gone once the user taps Sísí or dismisses it)
 *   thought     some days: a tiny star near Sísí. Opening it shows
 *               "A thought for your walk" — Keep this · Talk to Sísí · ×.
 *               Never a modal, never on every open.
 */

/** Save a thought as one Moment ("A note from Sísí") — once, however many taps. */
export async function keepThought(t: Thought): Promise<void> {
  if (isKept(t.id)) return;
  markKept(t.id); // claim first, so repeated taps can't save twice
  await createMoment({ source: "sisi_note", type: "companion_note", text: t.text });
}

export function CompanionCues({ visible, onTalk }: { visible: boolean; onTalk: (opening?: string) => void }) {
  const [talkHint, setTalkHint] = useState(false);
  const [thought, setThought] = useState<Thought | null>(null);
  const [openThought, setOpenThought] = useState(false);
  const [kept, setKept] = useState(false);

  useEffect(() => {
    const first = !hintDone("talk");
    setTalkHint(first);
    // the first visit teaches talking; thoughts wait for another day
    if (!first) {
      const t = thoughtForToday();
      setThought(t);
      if (t) setKept(isKept(t.id));
    }
  }, []);

  // talked already (e.g. tapped Sísí) → the talk hint has done its work
  useEffect(() => {
    if (visible && talkHint && hintDone("talk")) setTalkHint(false);
  }, [visible, talkHint]);

  const dismissThought = () => {
    finishTodaysThought();
    setOpenThought(false);
    setThought(null);
  };

  return (
    <div className="cc-root" aria-live="polite">
      <AnimatePresence>
        {visible && talkHint && (
          <motion.div
            key="talk"
            className="cc-note paper-bg"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.4, duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <button
              type="button"
              className="cc-x"
              aria-label="Got it"
              onClick={() => {
                markHint("talk");
                setTalkHint(false);
              }}
            >
              ×
            </button>
            <p className="cc-text cc-text--hint">
              Tap <em>Sísí</em> whenever you want to talk.
            </p>
          </motion.div>
        )}

        {visible && !talkHint && thought && !openThought && (
          <motion.button
            key="spark"
            type="button"
            className="cc-spark"
            aria-label="A thought for your walk"
            onClick={() => setOpenThought(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.6 } }}
            exit={{ opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/sisi-star-mark-painted-512.png" alt="" aria-hidden />
          </motion.button>
        )}

        {visible && thought && openThought && (
          <motion.div
            key="thought"
            className="cc-note cc-note--thought paper-bg"
            role="dialog"
            aria-label="A thought for your walk"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button type="button" className="cc-x" aria-label="Dismiss" onClick={dismissThought}>
              ×
            </button>
            <p className="cc-kicker">A thought for your walk</p>
            <p className="cc-text">{thought.text}</p>
            <div className="cc-actions">
              <button
                type="button"
                className="cc-link"
                disabled={kept}
                onClick={async () => {
                  setKept(true);
                  await keepThought(thought);
                }}
              >
                {kept ? "Kept in your Moments" : "Keep this"}
              </button>
              <button
                type="button"
                className="cc-link"
                onClick={() => {
                  finishTodaysThought();
                  setOpenThought(false);
                  setThought(null);
                  onTalk(thought.text);
                }}
              >
                Talk to Sísí
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .cc-root {
          position: absolute; z-index: 6; pointer-events: none;
          left: max(12px, calc(var(--companion-x, 37%) - var(--cat-width) * 0.3));
          bottom: calc(var(--walking-baseline) + var(--cat-width) * 0.86);
          width: min(76vw, 300px);
        }
        .cc-root > * { pointer-events: auto; }
        .cc-note {
          position: relative; padding: 12px 40px 12px 14px; color: #2b2f45; border-radius: 2px;
          box-shadow: 0 8px 18px rgba(10, 18, 30, 0.22);
        }
        .cc-note::after {
          content: ""; position: absolute; left: 34px; bottom: -7px; width: 14px; height: 14px;
          background: inherit; transform: rotate(45deg); box-shadow: 3px 3px 6px rgba(10, 18, 30, 0.08);
        }
        .cc-note--thought { padding: 14px 40px 10px 16px; }
        .cc-kicker { margin: 0 0 4px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13px; color: rgba(43, 47, 69, 0.6); }
        .cc-text { margin: 0; font-family: var(--font-fraunces), Georgia, serif; font-size: 16.5px; line-height: 1.34; }
        .cc-text--hint { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; }
        .cc-actions { display: flex; gap: 16px; margin-top: 6px; }
        .cc-link {
          min-height: 40px; padding: 0; border: 0; background: transparent; cursor: pointer;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; color: #3d74d8;
        }
        .cc-link:disabled { color: rgba(43, 47, 69, 0.55); cursor: default; }
        .cc-x {
          position: absolute; right: 2px; top: 2px; width: 40px; height: 40px; border: 0; background: transparent;
          font-size: 20px; color: rgba(43, 47, 69, 0.5); cursor: pointer;
        }
        .cc-spark {
          position: relative; left: calc(var(--cat-width) * 0.42); width: 44px; height: 44px; padding: 10px;
          border: 0; background: transparent; cursor: pointer; animation: cc-breathe 3s ease-in-out infinite;
        }
        .cc-spark img { width: 100%; height: 100%; display: block; }
        @keyframes cc-breathe { 0%, 100% { opacity: 0.75; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.04); } }
        @media (prefers-reduced-motion: reduce) { .cc-spark { animation: none; } }
      `}</style>
    </div>
  );
}
