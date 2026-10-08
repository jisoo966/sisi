"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
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
  /** walking with this wish: the Star rests in the sky ahead of Sísí (it does
   *  not grow or come closer — the walk is time with the wish, not progress) */
  carrying?: boolean;
  /** increment once when the walk is finished: a brief, warm brightening */
  warm?: number;
  /** the first time (onboarding): a soft ring of light asks to be tapped */
  beckon?: boolean;
};

export function SkyStarV2({ star, selected, disabled = false, onTap, carrying = false, warm = 0, beckon = false }: Props) {
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
      className={`sky-star-btn${pressed ? " is-pressed" : ""}${carrying ? " is-carrying" : ""}${beckon ? " is-beckon" : ""}`}
      ref={(el) => fxAnchorRef("selectedStar", el)}
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
      {warm > 0 && <span key={warm} className="sky-warm" aria-hidden />}
      <StarLayers selected={selected} alt="Current Star" />
      {/* the wish being carried, quietly under its Star */}
      {carrying && star.wish && <span className="sky-wish">{star.wish}</span>}

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
          transition: transform 90ms ease-out, top 1.4s var(--ease-sisi), left 1.4s var(--ease-sisi);
        }
        /* ahead of Sísí, above the path, clear of the header — and it stays there */
        .sky-star-btn.is-carrying { top: 24%; left: 74%; }
        /* tap me (first time): a soft ring of light breathes around the Star */
        .sky-star-btn.is-beckon::after {
          content: ""; position: absolute; left: 50%; top: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px; border-radius: 50%;
          border: 2px solid rgba(255, 236, 180, 0.9); box-shadow: 0 0 14px rgba(255, 236, 180, 0.55); pointer-events: none;
          animation: skyBeckon 2.2s ease-in-out infinite;
        }
        @keyframes skyBeckon { 0%, 100% { transform: scale(0.92); opacity: 0.55; } 50% { transform: scale(1.06); opacity: 1; } }
        .sky-wish {
          position: absolute; left: 50%; top: calc(100% + 6px); width: max-content; max-width: 150px; translate: -50% 0;
          font-family: var(--font-editorial); font-style: italic; font-size: 13px; line-height: 1.3; text-align: center;
          color: var(--on-sky); opacity: 0.85; pointer-events: none;
          animation: skyWishIn 1.2s ease 1s both;
        }
        @keyframes skyWishIn { from { opacity: 0; } to { opacity: 0.85; } }
        /* finished: a brief warm light, then calm again */
        .sky-warm {
          position: absolute; left: 50%; top: 50%; width: 150px; height: 150px; margin: -75px 0 0 -75px; border-radius: 50%;
          pointer-events: none; z-index: 0;
          background: radial-gradient(circle, rgba(255, 226, 160, 0.75), rgba(241, 168, 94, 0.28) 40%, rgba(241, 168, 94, 0) 70%);
          animation: skyWarm 2.2s ease-out both;
        }
        @keyframes skyWarm { 0% { opacity: 0; transform: scale(0.5); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.25); } }
        @media (prefers-reduced-motion: reduce) { .sky-warm { animation-duration: 1.2s; } .sky-star-btn { transition: none; } }
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
          background: radial-gradient(circle, rgba(245, 239, 221, 0.95) 0%,
                                              rgba(245, 239, 221, 0.5) 40%,
                                              transparent 75%);
          filter: blur(2px);
          z-index: 4;
          animation: spawnFlash 1.4s ease-out forwards;
        }
        .spawn-ring {
          left: 50%; top: 50%;
          width: 100%; height: 100%;
          border-radius: 9999px;
          border: 2px solid rgba(245, 239, 221, 0.85);
          transform: translate(-50%, -50%);
          z-index: 4;
          animation: spawnRing 1.4s ease-out forwards;
        }
        .sparkle {
          left: 50%; top: 50%;
          width: 4px; height: 4px;
          border-radius: 9999px;
          background: var(--sisi-paper);
          box-shadow: 0 0 8px rgba(245, 239, 221, 0.9);
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
