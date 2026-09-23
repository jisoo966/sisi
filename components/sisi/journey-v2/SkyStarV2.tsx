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
  const gradId = `sky-star-grad-${star.id}`;

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
        scale: isStarView ? 2.0 : 1,
      }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      // framer-motion writes its own `transform` (for scale), which would
      // wipe a CSS translate — so the centering offset lives here instead.
      style={{
        width: "var(--star-walking-size)",
        height: "var(--star-walking-size)",
        x: "-50%",
        y: "-50%",
      }}
    >
      <span className="halo halo-outer" aria-hidden />
      <span className="halo halo-inner" aria-hidden />
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
      <svg viewBox="0 0 100 100" className="star-svg" aria-hidden>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgb(255,248,225)" />
            <stop offset="35%" stopColor="rgb(255,236,189)" />
            <stop offset="100%" stopColor="rgb(251,198,106)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
          fill={`url(#${gradId})`}
        />
        <circle cx="50" cy="50" r="7" fill="rgb(255,248,225)" opacity="0.85" />
      </svg>

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
        .halo {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
        }
        .halo-outer {
          width: 260%;
          height: 260%;
          background: radial-gradient(
            circle,
            rgba(238, 137, 79, 0.5) 0%,
            rgba(238, 137, 79, 0.2) 50%,
            transparent 90%
          );
          filter: blur(6px);
          z-index: 1;
          animation: haloPulse 4s ease-in-out infinite;
        }
        .halo-inner {
          width: 160%;
          height: 160%;
          background: radial-gradient(
            circle,
            rgba(255, 181, 112, 1) 0%,
            rgba(255, 181, 112, 0.35) 55%,
            transparent 100%
          );
          filter: blur(4px);
          z-index: 2;
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.08); }
        }
        .star-svg {
          position: relative;
          width: 100%;
          height: 100%;
          z-index: 3;
          display: block;
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
