"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PrimaryButton, StatusChip } from "@/components/ds";
import { COMPANIONS } from "@/lib/companion";
import { hasGift, unlockGift } from "@/lib/gifts";

/**
 * A thank-you gift, for one person (lib/server/gifts decides who).
 *
 * Once, on the Journey: a small note on paper, Fern sitting on its lower edge,
 * "You unlocked a new character", and "Open the Map" — which unlocks Fern and
 * opens the Map on "Who walks with you", where she can be chosen.
 */
export type Gift = { gift: "fern"; body: string[]; from: string };

/** Asks the server once whether there is a gift for this account. */
export function usePendingGift(enabled: boolean): Gift | null {
  const [gift, setGift] = useState<Gift | null>(null);
  useEffect(() => {
    // development only: /journey?gift=preview shows the note (to look at it)
    const preview = process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("gift") === "preview";
    if (!enabled || (hasGift("fern") && !preview)) return;
    let alive = true;
    fetch(preview ? "/api/gift?preview=1" : "/api/gift")
      .then((r) => r.json())
      .then((d) => alive && d?.ok && (preview || !hasGift(d.note.gift)) && setGift(d.note))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);
  return gift;
}

export function GiftNote({ gift, open, onOpenMap }: { gift: Gift | null; open: boolean; onOpenMap: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !gift) return null;
  const fern = COMPANIONS.poodle;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="gift" className="gn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <motion.div
            className="gn-col"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatusChip surface="dark" tone="star">
              You unlocked a new character
            </StatusChip>
            <article className="ds-paper gn-note">
              <p className="t-meta gn-eyebrow">A small thank you</p>
              {gift.body.map((p, i) => (
                <p key={i} className="t-dialogue gn-p">
                  {p}
                </p>
              ))}
              <p className="t-dialogue gn-from">{gift.from}</p>
              {/* Fern sits on the note's lower edge, never floating */}
              <div className="gn-fern-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="gn-fern" src={fern.idle} alt="Fern, a little poodle" draggable={false} />
                <span className="t-meta gn-name">Fern</span>
              </div>
            </article>
          </motion.div>
          <div className="gn-foot">
            <PrimaryButton surface="dark"
              block
              onClick={() => {
                unlockGift(gift.gift);
                onOpenMap();
              }}
            >
              Open the Map
            </PrimaryButton>
          </div>
          <style jsx global>{`
            .gn {
              position: fixed;
              inset: 0;
              z-index: var(--z-modal, 900);
              background: linear-gradient(to bottom, rgba(16, 45, 50, 0.35), rgba(16, 45, 50, 0.55));
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: calc(var(--safe-top, 0px) + 40px) 24px calc(var(--safe-bottom, 0px) + 120px);
            }
            .gn-col { display: flex; flex-direction: column; align-items: center; gap: 16px; }
            .gn-note {
              width: 100%;
              max-width: 360px;
              padding: 24px 24px 0;
              border-radius: 18px;
              box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
            }
            .gn-eyebrow { margin: 0 0 12px; color: var(--ink-60); }
            .gn-p { margin: 0 0 10px; }
            .gn-from { margin: 14px 0 0; text-align: right; font-style: italic; color: var(--ink-80); }
            .gn-fern-row { position: relative; height: 118px; margin: 0 -24px; overflow: hidden; border-radius: 0 0 18px 18px; }
            /* the art has ~4% empty alpha under the paws: her paws rest on the edge */
            .gn-fern { position: absolute; left: 50%; bottom: -5px; width: 132px; transform: translateX(-50%); }
            .gn-name { position: absolute; right: 22px; bottom: 14px; color: var(--ink-60); }
            .gn-foot { position: absolute; left: 24px; right: 24px; bottom: calc(var(--safe-bottom, 0px) + 40px); }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("sisi-overlay-root") ?? document.body,
  );
}
