"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { useEffect, useRef, useState } from "react";
import { worldClock } from "@/lib/worldMotion";

/**
 * WalkingCat — the companion. Horizontally anchored; the world moves.
 *
 * Walk cycle: the approved walk frames (fox-walk-cycle900.webp) laid out as
 * a 6×5 sheet (every other frame, full resolution), so the cadence can
 * follow the world instead of playing at one fixed speed:
 *
 *   cadence  = the world's speed factor — 100% walking, 40% while Sísí
 *              talks as you walk (Slow Walk), and so on; never a sudden change
 *   stopping when the world has slowed right down, she finishes the step
 *            she is in, then settles into the idle pose (never slides idle)
 *   rest     `rest` = writing / a focused moment: no walk cycle, a quiet
 *            breathing idle (the world may still drift very slowly)
 *   poses    look up at the Star / look toward the user, as before
 *   bob      2–3px lift synced to each step, fading with the speed
 */

const SPRITE = "/V2/fox-walk/fox-walk-sprite30-full.webp";
const IDLE_SRC = "/V2/fox-walk/fox-walk-preview.webp";
const COLS = 6;
const ROWS = 5;
const FRAMES = 30;
/**
 * The sheet holds the original 3.6s walk loop (4 walk cycles = 8 steps, one
 * cycle ≈ 900ms). At 100% it plays exactly as before: once per 3.6s.
 */
const SHEET_PER_S = 1000 / 3600;
const STEPS = 8; // steps in one pass of the sheet
/** below this speed factor she finishes her step and stands */
const STOP_AT_FACTOR = 0.2;

type Props = {
  onTap?: () => void;
  /** Star moment — stop at the next step and look up. */
  lookingUp?: boolean;
  /** Just landed back in the meadow — look toward the user for a beat. */
  lookingAtYou?: boolean;
  /** @deprecated walking state now comes from the shared world clock */
  paused?: boolean;
  /** Turning toward Moments (the past) faces left; the Journey faces right. */
  facing?: "left" | "right";
  /** Walk cycle started / settled into the idle pose. */
  onWalkingChange?: (walking: boolean) => void;
  /** Writing / a focused moment: breathing idle instead of the walk cycle. */
  rest?: boolean;
};

export function WalkingCat({ onTap, lookingUp = false, lookingAtYou = false, facing = "right", onWalkingChange, rest = false }: Props) {
  const [walking, setWalking] = useState(false);
  const onChangeRef = useRef(onWalkingChange);
  onChangeRef.current = onWalkingChange;
  useEffect(() => {
    onChangeRef.current?.(walking);
  }, [walking]);
  const lookingUpRef = useRef(lookingUp);
  lookingUpRef.current = lookingUp;
  const restRef = useRef(rest);
  restRef.current = rest;
  const bobRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = new Image(); // the walk sheet, ready before the first step
    c.src = SPRITE;
  }, []);

  useEffect(() => {
    let phase = 0; // 0…1 through the sheet (8 steps)
    let isWalking = false;
    let finishing = false;
    let frame = -1;
    let env = 0;

    return worldClock().subscribe((f) => {
      const wantWalk = !f.reducedMotion && !restRef.current && f.factor >= STOP_AT_FACTOR && !lookingUpRef.current;
      if (wantWalk) {
        finishing = false;
        if (!isWalking) {
          isWalking = true;
          setWalking(true);
        }
      } else if (isWalking && !finishing) {
        if (f.reducedMotion) {
          isWalking = false;
          setWalking(false);
        } else finishing = true; // complete this step, then stand
      }

      if (isWalking) {
        // cadence follows the world (at least a slow step while finishing)
        const rate = SHEET_PER_S * Math.max(finishing ? 0.45 : 0, f.factor);
        const prevStep = Math.floor(phase * STEPS);
        phase = (phase + rate * f.dt) % 1;
        if (finishing && Math.floor(phase * STEPS) !== prevStep) {
          phase = Math.floor(phase * STEPS) / STEPS;
          isWalking = false;
          finishing = false;
          setWalking(false);
        }
      }

      const fr = isWalking ? Math.floor(phase * FRAMES) % FRAMES : -1;
      if (fr !== frame && spriteRef.current) {
        frame = fr;
        if (fr >= 0) {
          const c = fr % COLS;
          const r = Math.floor(fr / COLS);
          spriteRef.current.style.backgroundPosition = `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;
        }
      }

      // Step-synced bob (lift only, so paws never sink below the path).
      const target = isWalking ? Math.min(1, f.factor / 0.6) : 0;
      env += (target - env) * Math.min(f.dt * 6, 1);
      const amp = 2.5 + 0.5 * Math.sin(f.now / 2300); // 2–3px, slowly varying
      const y = -amp * env * (0.5 - 0.5 * Math.cos(2 * Math.PI * STEPS * phase)); // one lift per step
      const el = bobRef.current;
      if (el) {
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        el.style.willChange = env > 0.01 ? "transform" : "auto";
      }
    });
  }, []);

  const idleSrc = IDLE_SRC;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Sísí"
      className="walking-cat"
      // the Starlight Trail arrives at her chest; ambient magic keeps clear of her face
      ref={(el) => fxAnchorRef("sisi", el, { fx: facing === "left" ? 0.34 : 0.66, fy: 0.56 })}
      style={{ pointerEvents: onTap ? "auto" : "none" }}
    >
      <div ref={bobRef} className="bob-wrap">
        <div className="flip" style={facing === "left" ? { transform: "scaleX(-1)" } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={idleSrc}
            alt=""
            className={`cat-media${rest && !walking ? " is-resting" : ""}`}
            draggable={false}
            style={{ visibility: walking ? "hidden" : "visible" }}
          />
          <div ref={spriteRef} className="cat-sprite" style={{ visibility: walking ? "visible" : "hidden" }} />
        </div>
      </div>

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
        .bob-wrap, .flip { position: relative; width: 100%; height: auto; }
        .cat-media { width: 100%; height: auto; display: block; pointer-events: none; transform-origin: 50% 100%; }
        .cat-sprite {
          position: absolute;
          inset: 0;
          background-image: url(${SPRITE});
          background-size: ${COLS * 100}% ${ROWS * 100}%;
          background-repeat: no-repeat;
          background-position: 0% 0%;
          pointer-events: none;
        }
        /* resting while the user writes: a slow, barely-there breath */
        .cat-media.is-resting { animation: cat-breathe 4.2s ease-in-out infinite; }
        @keyframes cat-breathe {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.006, 1.014); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cat-media.is-resting { animation: none; }
        }
      `}</style>
    </button>
  );
}
