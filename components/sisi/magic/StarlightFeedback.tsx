"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onStarlight, starlightMessage, type AwardResult } from "@/lib/starlight";
import { emitFx } from "@/lib/fx";

/**
 * StarlightFeedback — what happens after a qualifying activity is saved:
 *   (the activity is saved and its paper Moment connected to the Star;
 *    the Star softly brightens — done by the caller)
 *   → Starlight Trail (lib/fx): the selected Star brightens, a short trail
 *     curves to Sísí's chest, a small ripple on arrival, +N, SisiGlint
 *   → "A little light for the path. +1" (or +2)
 *   → the balance updates (lib/starlight event) → the note leaves after ~2s
 * When today's light is already full: only the quiet line
 * "Your Star is carrying today’s light with you." — never an error.
 */


export function StarlightFeedback() {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const n = useRef(0);

  useEffect(
    () =>
      onStarlight((r: AwardResult) => {
        const text = starlightMessage(r);
        if (!text || r.silent) return;
        const id = ++n.current;
        // let the saved paper settle and the Star brighten first
        setTimeout(() => {
          // selected Star → Sísí (or the Starlight counter); skipped if either isn't on screen
          if (r.awarded > 0) emitFx({ kind: "trail", amount: r.awarded });
          setMsg({ id, text });
        }, 450);
        setTimeout(() => setMsg((m) => (m && m.id === id ? null : m)), 450 + 2100);
      }),
    [],
  );

  if (typeof document === "undefined") return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {msg && (
            <motion.p
              key={msg.id}
              className="sl-note ds-paper ds-paper--memory"
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.3 } }}
            >
              {msg.text}
            </motion.p>
          )}
        </AnimatePresence>,
        root,
      )}
      <style jsx global>{`
        .sl-note {
          position: fixed; z-index: var(--z-toast); left: 0; right: 0; width: fit-content;
          bottom: calc(var(--safe-bottom) + 150px); margin: 0 auto; max-width: min(84vw, 320px); padding: 12px 18px;
          border-radius: 3px; box-shadow: var(--paper-shadow); text-align: center; pointer-events: none;
          font-family: var(--font-editorial); font-size: var(--text-body); line-height: var(--leading-body);
        }
      `}</style>
    </>
  );
}
