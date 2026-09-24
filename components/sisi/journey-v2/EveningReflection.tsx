"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
import { earnLight } from "@/lib/littleLights";
import { tornEdge } from "@/lib/tornEdge";

/**
 * EveningReflection — at night SiSi pauses beneath the Current Star and asks
 * one short thing: "What felt good today?"
 *
 * Offered at most once per evening (after 7pm), only when nothing else is
 * open, and never required: "Not tonight" closes it until tomorrow.
 * The sentence is saved to the Current Star's timeline; one Little Light.
 */

const EDGE = tornEdge(41);
const KEY = "sisi:evening-offered";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Should the evening reflection be offered right now? */
export function eveningDue(): boolean {
  if (typeof window === "undefined") return false;
  const h = new Date().getHours();
  if (h < 19 && h >= 4) return false;
  try {
    return localStorage.getItem(KEY) !== todayKey();
  } catch {
    return false;
  }
}
function markOffered() {
  try {
    localStorage.setItem(KEY, todayKey());
  } catch {
    // ignore
  }
}

export function EveningReflection({
  open,
  star,
  onClose,
}: {
  open: boolean;
  star: Star | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState<null | boolean>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      markOffered();
      setText("");
      setDone(null);
      setSaving(false);
    }
  }, [open]);

  const leave = async () => {
    const note = text.trim();
    if (!note || saving) return;
    setSaving(true);
    if (star) {
      try {
        await addSign(star.id, note);
      } catch {
        // ignore — keep the evening gentle
      }
    }
    setDone(await earnLight("evening", star?.id));
    setTimeout(onClose, 2200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ev"
          className="ev-sheet"
          role="dialog"
          aria-label="Evening reflection"
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "115%", transition: { duration: 0.35 } }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ev-shadow" aria-hidden />
          <div className="ev-paper paper-bg">
            {done === null ? (
              <>
                <p className="ev-title">What felt good today?</p>
                <textarea
                  className="ev-input"
                  rows={2}
                  maxLength={200}
                  placeholder="One sentence is enough."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="button" className="ev-primary" disabled={!text.trim() || saving} onClick={leave}>
                  Leave a little light
                </button>
                <button type="button" className="ev-link" onClick={onClose}>
                  Not tonight
                </button>
              </>
            ) : (
              <>
                <p className="ev-title">{done ? "A Little Light found you." : "Kept with your Star."}</p>
                {done && (
                  <p className="ev-plus">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/sisi-star-mark-painted-512.png" alt="" /> +1
                  </p>
                )}
              </>
            )}
          </div>
          <style jsx global>{`
            .ev-sheet { position: absolute; left: max(14px, var(--safe-left)); right: max(14px, var(--safe-right)); bottom: calc(var(--safe-bottom) + 14px); z-index: 25; pointer-events: auto; }
            .ev-shadow { position: absolute; inset: 14px 6px -6px 6px; border-radius: 12px; background: rgba(0,0,0,0.38); filter: blur(14px); }
            .ev-paper { position: relative; padding: 24px 22px 18px; clip-path: ${EDGE}; color: #2b2f45; text-align: center; }
            .ev-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 21px; margin: 2px 0 12px; }
            .ev-input { width: 100%; resize: none; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; border: 1px solid rgba(43,47,69,0.16); background: rgba(255,255,255,0.55); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; outline: none; text-align: left; }
            .ev-input::placeholder { font-style: italic; color: rgba(43,47,69,0.4); }
            .ev-primary { display: block; width: 100%; height: 48px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; cursor: pointer; }
            .ev-primary:disabled { opacity: 0.45; }
            .ev-link { margin-top: 10px; border: 0; background: transparent; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: rgba(43,47,69,0.6); cursor: pointer; }
            .ev-plus { display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-fraunces), Georgia, serif; font-size: 24px; margin: 0 0 6px; }
            .ev-plus img { width: 28px; height: 28px; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
