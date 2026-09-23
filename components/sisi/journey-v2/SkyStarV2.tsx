"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Star } from "@/lib/myStars";
import type { JourneyPhase } from "@/lib/useJourneyPhase";

/**
 * SkyStarV2 — the user's current wish, present in the sky.
 *
 * Two phases (drives its own transform via framer-motion):
 *   walking   — small, positioned in the upper-right of the day sky.
 *               Tapping it triggers the world's upward transition (onTap).
 *   star-view — large, centered above the clouds. Tapping does nothing here;
 *               the containing StarView owns the back gesture.
 *
 * The star does NOT translate with the sky/landscape groups. It stays
 * anchored to the viewport so the transition feels like the world moves
 * around it, not that the star flies through the sky.
 */

type Props = {
  star: Star;
  phase: JourneyPhase;
  onTap: () => void;
};

export function SkyStarV2({ star, phase, onTap }: Props) {
  const isStarView = phase === "star-view";

  // One-time spawn sparkle — plays only the first time this specific star
  // is shown to the user (persisted per star id in localStorage). After that
  // the star settles into its normal ambient pulse.
  const [showSpawn, setShowSpawn] = useState(false);
  useEffect(() => {
    try {
      const key = `sisi:star-seen-${star.id}`;
      if (!localStorage.getItem(key)) {
        setShowSpawn(true);
        // Mark seen right away — even if the user leaves, it won't replay.
        localStorage.setItem(key, "1");
        // Auto-clear after animation finishes
        const t = setTimeout(() => setShowSpawn(false), 2400);
        return () => clearTimeout(t);
      }
    } catch {
      // no localStorage (SSR / privacy mode) — skip spawn
    }
  }, [star.id]);

  return (
    <motion.button
      type="button"
      onClick={onTap}
      aria-label={
        isStarView ? "Your star" : "Look toward your star"
      }
      className="sky-star-btn"
      // We animate top/left/scale on a single element so the position and size
      // interpolate together over the same duration/easing as the world groups.
      initial={false}
      animate={{
        top: isStarView ? "var(--star-view-top)" : "var(--star-walking-top)",
        left: isStarView ? "var(--star-view-left)" : "var(--star-walking-left)",
        scale: isStarView ? 1.7 : 1,
        // Hidden while the camera is inside the clouds (storyboard frame 4).
        opacity: isStarView ? [1, 1, 0.08, 0.08, 1] : 1,
      }}
      // Synced with lib/useLookUpTimeline.ts: the star holds its place while
      // the fox looks up and the clouds pass, then settles at top-centre as
      // the night sky arrives (2.6s → 3.7s). Returning: ~1.9s together.
      transition={
        isStarView
          ? {
              default: { duration: 1.1, delay: 2.6, ease: [0.65, 0, 0.35, 1] },
              opacity: { duration: 3.3, times: [0, 0.33, 0.45, 0.72, 1] },
            }
          : { duration: 1.9, ease: [0.65, 0, 0.35, 1] }
      }
      // framer-motion writes its own `transform` (for scale), which would
      // wipe a CSS translate — so the centering offset lives here instead.
      style={{
        width: 48,
        height: 48,
        x: "-50%",
        y: "-50%",
      }}
    >
      {showSpawn && (
        <>
          <span className="spawn-flash" aria-hidden />
          <span className="spawn-ring" aria-hidden />
          <span className="sparkle sparkle-1" aria-hidden />
          <span className="sparkle sparkle-2" aria-hidden />
          <span className="sparkle sparkle-3" aria-hidden />
          <span className="sparkle sparkle-4" aria-hidden />
        </>
      )}
      {/* Three hand-painted PNG layers on the same 1254×1254 canvas and
          centre point, stacked uncropped: aura (bottom), glow, mark (top). */}
      <div className={`sisi-star${isStarView ? " is-selected" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__aura" src="/assets/sisi-star-aura-painted.png" alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__glow" src="/assets/sisi-star-glow-painted.png" alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__mark" src="/assets/sisi-star-mark-painted.png" alt="Current Star" draggable={false} />
      </div>

      <style jsx>{`
        :global(.sky-star-btn) {
          position: absolute;
          transform: translate(-50%, -50%);
          transform-origin: center;
          z-index: 6;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        /* ── Current Star: painted aura + glow + mark, stacked ──
           Same canvas, same centre, absolutely positioned on top of each
           other. Only opacity/scale are animated (no CSS glow, no rotation). */
        .sisi-star {
          position: relative;
          width: 48px;
          aspect-ratio: 1;
          transform: scale(1);
          transform-origin: center;
          transition: transform 500ms cubic-bezier(0.33, 1, 0.68, 1);
        }
        .sisi-star > img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
          transform-origin: center;
        }
        /* Aura — faint, large, breathing slowly (scale 1.15 ↔ 1.25). */
        .sisi-star__aura {
          z-index: 1;
          opacity: 0.34;
          transform: scale(1.2);
          animation: starAura 6.4s ease-in-out infinite;
          transition: filter 500ms ease;
        }
        /* Glow — slightly smaller than the canvas, soft opacity drift. */
        .sisi-star__glow {
          z-index: 2;
          opacity: 0.62;
          transform: scale(0.94);
          animation: starGlow 4.3s ease-in-out infinite;
          transition: filter 500ms ease;
        }
        /* Mark — crisp, full opacity, a very small irregular twinkle. */
        .sisi-star__mark {
          z-index: 3;
          opacity: 1;
          transform: scale(1);
          animation: starTwinkle 5.7s ease-in-out infinite;
        }
        @keyframes starAura {
          0%, 100% { transform: scale(1.15); opacity: 0.3; }
          50%      { transform: scale(1.25); opacity: 0.38; }
        }
        @keyframes starGlow {
          0%, 100% { opacity: 0.56; }
          45%      { opacity: 0.72; }
          70%      { opacity: 0.64; }
        }
        /* Uneven beats so it reads as a twinkle, not a pulse. */
        @keyframes starTwinkle {
          0%, 100% { transform: scale(1);     opacity: 1; }
          13%      { transform: scale(1.018); opacity: 1; }
          21%      { transform: scale(0.992); opacity: 0.94; }
          47%      { transform: scale(1);     opacity: 1; }
          58%      { transform: scale(1.012); opacity: 0.97; }
          81%      { transform: scale(0.996); opacity: 1; }
        }
        /* Selected (star tapped / Stars tab): swell to 1.18 over 500ms and
           brighten the aura + glow, then the camera tilts up. */
        .sisi-star.is-selected {
          transform: scale(1.18);
        }
        .sisi-star.is-selected .sisi-star__aura,
        .sisi-star.is-selected .sisi-star__glow {
          filter: brightness(1.2);
        }
        @media (prefers-reduced-motion: reduce) {
          .sisi-star__aura,
          .sisi-star__glow,
          .sisi-star__mark { animation: none; }
        }

        /* ── One-time spawn animation ─────────────────────
         * A single burst of light + expanding ring + 4 sparkle points.
         * Everything is aria-hidden and pointer-events:none. Runs ~1.6s.
         */
        .spawn-flash,
        .spawn-ring,
        .sparkle {
          position: absolute;
          pointer-events: none;
        }
        .spawn-flash {
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 100%; height: 100%;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255, 240, 200, 0.95) 0%,
                                              rgba(255, 220, 150, 0.5) 40%,
                                              transparent 75%);
          filter: blur(2px);
          z-index: 4;
          animation: spawnFlash 1.4s ease-out forwards;
        }
        .spawn-ring {
          left: 50%; top: 50%;
          width: 100%; height: 100%;
          border-radius: 9999px;
          border: 2px solid rgba(255, 220, 150, 0.85);
          transform: translate(-50%, -50%);
          z-index: 4;
          animation: spawnRing 1.4s ease-out forwards;
        }
        .sparkle {
          left: 50%; top: 50%;
          width: 4px; height: 4px;
          border-radius: 9999px;
          background: #fff8dc;
          box-shadow: 0 0 8px rgba(255, 220, 150, 0.9);
          z-index: 5;
          animation: sparkleFly 1.6s ease-out forwards;
        }
        .sparkle-1 { --dx:  120%; --dy: -90%; animation-delay: 0.05s; }
        .sparkle-2 { --dx: -140%; --dy: -70%; animation-delay: 0.15s; }
        .sparkle-3 { --dx:  110%; --dy: 110%; animation-delay: 0.25s; }
        .sparkle-4 { --dx: -100%; --dy: 130%; animation-delay: 0.35s; }

        @keyframes spawnFlash {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          25%  { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.4); }
        }
        @keyframes spawnRing {
          0%   { opacity: 0.9; transform: translate(-50%, -50%) scale(0.4); border-width: 3px; }
          70%  { opacity: 0.7; transform: translate(-50%, -50%) scale(3.5); border-width: 1px; }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(4.2); border-width: 1px; }
        }
        @keyframes sparkleFly {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx, 0)),
                                                  calc(-50% + var(--dy, 0)))
                                       scale(0.4); }
        }
      `}</style>
    </motion.button>
  );
}
