"use client";

import { useEffect, useRef, useState } from "react";
import { worldClock } from "@/lib/worldMotion";

/**
 * WalkingCat — the companion. Horizontally anchored (0px/s); the world moves.
 *
 * Walk cycle: fox-walk-cycle900.webp — the original walk frames re-timed to
 * ~900ms per full cycle (2 steps ≈ 450ms each). Pixels are unchanged. (The
 * older fox-walk.webp is kept on disk; it blended frames without clearing,
 * which left faint ghost legs.)
 *
 * Driven by the shared world clock:
 *   start — the ground begins easing in; the walk cycle starts ~150ms later
 *   stop  — the ground eases out; once it has mostly slowed, the fox
 *           finishes its current step, then settles into the idle pose
 *   bob   — 2–3px lift synchronized to each step; amplitude drifts slightly
 *           so it never reads as a robotic bounce; fades with the speed
 *   reduced motion — always idle
 */

const WALK_SRC = "/V2/fox-walk/fox-walk-cycle900.webp";
const IDLE_SRC = "/V2/fox-walk/fox-walk-preview.png";
const CYCLE_MS = 900;
const STEP_MS = CYCLE_MS / 2;
const START_DELAY_MS = 150;
/** The fox keeps stepping until the ground has slowed below this factor. */
const STOP_AT_FACTOR = 0.3;

type Props = {
  onTap?: () => void;
  /** @deprecated walking state now comes from the shared world clock */
  paused?: boolean;
};

export function WalkingCat({ onTap }: Props) {
  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);
  const bobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let walkRequestedAt = -1;
    let walkStartedAt = 0;
    let stopAt = -1;
    let env = 0;

    return worldClock().subscribe((f) => {
      const now = f.now;

      if (f.walking && !f.reducedMotion) {
        stopAt = -1;
        if (!walkingRef.current) {
          if (walkRequestedAt < 0) walkRequestedAt = now;
          if (now - walkRequestedAt >= START_DELAY_MS) {
            walkingRef.current = true;
            walkStartedAt = now;
            setWalking(true);
          }
        }
      } else {
        walkRequestedAt = -1;
        if (walkingRef.current) {
          if (f.reducedMotion) {
            walkingRef.current = false;
            setWalking(false);
          } else if (stopAt < 0) {
            if (f.factor < STOP_AT_FACTOR) {
              // finish the current step, then idle
              const t = now - walkStartedAt;
              stopAt = walkStartedAt + Math.ceil(t / STEP_MS) * STEP_MS;
            }
          } else if (now >= stopAt) {
            walkingRef.current = false;
            stopAt = -1;
            setWalking(false);
          }
        }
      }

      // Step-synced bob (lift only, so paws never sink below the path).
      const target = walkingRef.current ? Math.min(1, f.factor / 0.6) : 0;
      env += (target - env) * Math.min(f.dt * 6, 1);
      const t = now - walkStartedAt;
      const amp = 2.5 + 0.5 * Math.sin(now / 2300); // 2–3px, slowly varying
      const y = -amp * env * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / STEP_MS));
      const el = bobRef.current;
      if (el) {
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        el.style.willChange = env > 0.01 ? "transform" : "auto";
      }
    });
  }, []);

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Sísí"
      className="walking-cat"
      style={{ pointerEvents: onTap ? "auto" : "none" }}
    >
      <div ref={bobRef} className="bob-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={walking ? WALK_SRC : IDLE_SRC}
          alt=""
          className="cat-media"
          draggable={false}
        />
      </div>
      {/* Preload both so the swap is instantaneous */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={walking ? IDLE_SRC : WALK_SRC} alt="" aria-hidden style={{ display: "none" }} />

      <style jsx>{`
        .walking-cat {
          position: absolute;
          left: var(--companion-x, 37%);
          /* The fox art has 26px of empty alpha under the paws
             (26 / 648 of its width ≈ 4.0%) — pull it down by that much so
             the paws sit exactly on the walking baseline. */
          bottom: calc(var(--walking-baseline) - var(--cat-width) * 0.0401);
          transform: translateX(-50%);
          width: var(--cat-width);
          height: auto;
          z-index: 5;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: ${onTap ? "pointer" : "default"};
          -webkit-tap-highlight-color: transparent;
        }
        .bob-wrap {
          width: 100%;
          height: auto;
        }
        .cat-media {
          width: 100%;
          height: auto;
          display: block;
          pointer-events: none;
        }
      `}</style>
    </button>
  );
}
