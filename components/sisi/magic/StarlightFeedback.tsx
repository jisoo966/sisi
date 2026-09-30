"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onStarlight, starlightMessage, type AwardResult } from "@/lib/starlight";
import { centerOf, emitFx } from "@/lib/fx";

/**
 * StarlightFeedback — what happens after a qualifying activity is saved:
 *   (the activity is saved and its paper Moment connected to the Star;
 *    the Star softly brightens — done by the caller)
 *   → Starlight Trail (lib/fx): the Star brightens, a light runs a little
 *     way down its thread, curves toward Sísí, a small ripple, +N, SisiGlint
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
          if (r.awarded > 0) {
            const star = centerOf(".sms-star, .sw-star.is-selected, .sky-star-btn");
            // the light arrives just above Sísí's head, where it reads against the sky
            const cat = document.querySelector<HTMLElement>(".smc-sisi .scc-stage, .walking-cat");
            const cr = cat?.getBoundingClientRect();
            const sisi = cr && cr.width > 0 && cr.bottom > 0 && cr.top < window.innerHeight ? { x: cr.left + cr.width * 0.55, y: cr.top + cr.height * 0.08 } : null;
            // toward Sísí when she's here; otherwise the light blooms on the Star itself
            const at = sisi ?? star ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
            // the thread under the open Star, when there is one
            const th = document.querySelector<HTMLElement>(".sms-thread");
            const tr = th?.getBoundingClientRect();
            const thread = tr && tr.height > 0 ? { top: { x: tr.left + tr.width / 2, y: tr.top }, bottom: { x: tr.left + tr.width / 2, y: tr.bottom } } : null;
            emitFx({ kind: "trail", from: sisi ? star : null, to: at, amount: r.awarded, thread });
          }
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
