"use client";

import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { StarLayers } from "./StarLayers";

/**
 * SkyStarV2 — the Current Star as seen from the meadow (day sky).
 *
 * Lives inside the distant-sky group (.jw-day), so during the ascent it
 * travels with the day sky (0.15×) and disappears behind the clouds; the
 * star world has its own NightStar at the arrival position.
 *
 *   tap      → immediate ~90ms press response, then onTap (ascent)
 *   selected → StarLayers swell to 1.18 and brighten (500ms)
 *   disabled → ignores taps while the camera transition runs
 */

type Props = {
  star: Star;
  selected: boolean;
  disabled?: boolean;
  onTap: () => void;
};

export function SkyStarV2({ star, selected, disabled = false, onTap }: Props) {
  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();

  // One-time spawn sparkle — only the first time this star is ever shown.
  const [showSpawn, setShowSpawn] = useState(false);
  useEffect(() => {
    try {
      const key = `sisi:star-seen-${star.id}`;
      if (!localStorage.getItem(key)) {
        setShowSpawn(true);
        localStorage.setItem(key, "1");
        const t = setTimeout(() => setShowSpawn(false), 2400);
        return () => clearTimeout(t);
      }
    } catch {
      // no localStorage — skip spawn
    }
  }, [star.id]);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  return (
    <button
      type="button"
      className={`sky-star-btn${pressed ? " is-pressed" : ""}`}
      aria-label="Look toward your star"
      aria-disabled={disabled}
      onPointerDown={() => {
        if (disabled) return;
        setPressed(true);
        clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => setPressed(false), 90);
      }}
      onClick={() => {
        if (!disabled) onTap();
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
      <StarLayers selected={selected} alt="Current Star" />

      <style jsx>{`
        .sky-star-btn {
          position: absolute;
          top: var(--star-walking-top);
          left: var(--star-walking-left);
          width: 48px;
          height: 48px;
          margin: -24px 0 0 -24px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
          z-index: 6;
          transform: scale(1);
          transition: transform 90ms ease-out;
        }
        /* Immediate tactile press (80–100ms). */
        .sky-star-btn.is-pressed {
          transform: scale(0.9);
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
    </button>
  );
}
