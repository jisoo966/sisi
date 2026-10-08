"use client";

import { AnimatePresence, motion } from "framer-motion";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";

/**
 * NightBackdrop — the one night of the beginning (onboarding, signing in):
 * the Stars sky, the first soft crests of its cloud bank, and (optionally)
 * a single waiting star. With the keyboard up, the star rests in the sky
 * that is left.
 */
export function NightBackdrop({ star = true }: { star?: boolean }) {
  return (
    <>
      <div className="nb-sky" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="nb-clouds" src="/V2/ascent/cloud-bank-front-v3.webp" alt="" aria-hidden draggable={false} />
      <AnimatePresence>
        {star && (
          <motion.span
            key="waiting"
            className="nb-star"
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <span className="nb-star-in">
              <StarLayers staged revealed focused />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      <style jsx global>{`
        .nb-sky { position: absolute; inset: 0; background: #06101f url(/V2/ascent/night-sky-top.webp) center top / cover; }
        .nb-clouds { position: absolute; left: 50%; top: 82%; height: 280%; width: auto; max-width: none; translate: -50% 0; pointer-events: none; user-select: none; }
        .nb-star { position: absolute; left: 50%; top: 22%; width: 48px; height: 48px; translate: -50% -50%; scale: 1.5; transition: top 260ms var(--ease-sisi); }
        html.kb-open .nb-star { top: 10%; }
        .nb-star-in { position: absolute; inset: 0; display: block; animation: nbTwinkle 3.6s ease-in-out infinite; }
        @keyframes nbTwinkle { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25) drop-shadow(0 0 12px rgba(241, 196, 94, 0.6)); } }
      `}</style>
    </>
  );
}
