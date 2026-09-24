"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

/**
 * TrailFox — Sísí on the Memory Trail, driven by the timeline's velocity
 * (not by a clock), so the walk always matches how the world moves.
 *
 * Art: the approved walk frames (fox-walk-cycle900.webp), every other frame
 * laid out as a 6×5 sheet (fox-walk-sprite30.webp) so the playback speed can
 * follow the finger. The idle pose is the approved fox-walk-preview.png.
 *
 *   facing   left while travelling into the past, right toward Today
 *   speed    cycle rate follows |velocity|, capped
 *   stopping the current step finishes, then the idle pose — the fox never
 *            slides while idle, and never idles while the world moves
 */

const SPRITE = "/V2/fox-walk/fox-walk-sprite30.webp";
const IDLE = "/V2/fox-walk/fox-walk-preview.png";
const COLS = 6;
const ROWS = 5;
const FRAMES = 30;
const STEP_FRAMES = FRAMES / 2; // two steps per cycle; frames 0 and 15 are step boundaries

const MOVING_V = 6; // px/s — below this the world is effectively still
const MIN_RATE = 0.8; // cycles/s while moving
const MAX_RATE = 2.3; // cycles/s cap
const PX_PER_CYCLE = 150; // world px travelled per full cycle at mid speeds
const FLIP_V = 18;

export type TrailFoxHandle = { update: (vel: number, dt: number, reduced: boolean) => void };

export const TrailFox = forwardRef<TrailFoxHandle, { onTap?: () => void }>(function TrailFox({ onTap }, ref) {
  const flipRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLImageElement>(null);
  const s = useRef({ phase: 0, walking: false, finishing: false, facing: -1 as -1 | 1, frame: -1 });

  useImperativeHandle(ref, () => ({
    update(vel, dt, reduced) {
      const st = s.current;
      const speed = Math.abs(vel);

      if (speed > FLIP_V) {
        const f: -1 | 1 = vel > 0 ? -1 : 1; // into the past → face left
        if (f !== st.facing) {
          st.facing = f;
          if (flipRef.current) flipRef.current.style.transform = `scaleX(${f === -1 ? -1 : 1})`;
        }
      }

      if (reduced) {
        st.walking = false;
      } else if (speed > MOVING_V) {
        st.walking = true;
        st.finishing = false;
      } else if (st.walking) {
        st.finishing = true; // finish this step, then rest
      }

      if (st.walking) {
        const rate = Math.max(MIN_RATE, Math.min(MAX_RATE, speed / PX_PER_CYCLE));
        const prevStep = Math.floor((st.phase * FRAMES) / STEP_FRAMES);
        st.phase = (st.phase + rate * dt) % 1;
        const nowStep = Math.floor((st.phase * FRAMES) / STEP_FRAMES);
        if (st.finishing && nowStep !== prevStep) {
          st.walking = false;
          st.finishing = false;
          st.phase = nowStep * (STEP_FRAMES / FRAMES);
        }
      }

      const frame = st.walking ? Math.floor(st.phase * FRAMES) % FRAMES : -1;
      if (frame !== st.frame) {
        st.frame = frame;
        const sp = spriteRef.current;
        const idle = idleRef.current;
        if (sp && idle) {
          if (frame < 0) {
            sp.style.visibility = "hidden";
            idle.style.visibility = "visible";
          } else {
            const c = frame % COLS;
            const r = Math.floor(frame / COLS);
            sp.style.backgroundPosition = `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;
            sp.style.visibility = "visible";
            idle.style.visibility = "hidden";
          }
        }
      }

      // 2px step-synced lift while walking (never sinks below the path)
      const b = bobRef.current;
      if (b) {
        const y = st.walking ? -2.2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 2 * st.phase)) : 0;
        b.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }
    },
  }));

  return (
    <div className="tf-root" onClick={onTap} aria-hidden>
      <div ref={flipRef} className="tf-flip" style={{ transform: "scaleX(-1)" }}>
        <div ref={bobRef} className="tf-bob">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={idleRef} className="tf-idle" src={IDLE} alt="" draggable={false} />
          <div ref={spriteRef} className="tf-sprite" style={{ visibility: "hidden" }} />
        </div>
      </div>
      <style jsx global>{`
        .tf-root {
          position: absolute;
          z-index: 6;
          width: var(--mm-fox-w);
          left: calc(var(--mm-fox-x) - var(--mm-fox-w) / 2);
          /* the paws sit 26/648 of the width above the frame bottom */
          bottom: calc(var(--walking-baseline) - var(--mm-fox-w) * 0.0401);
          pointer-events: none;
        }
        .tf-flip, .tf-bob { position: relative; width: 100%; }
        .tf-idle { display: block; width: 100%; height: auto; user-select: none; }
        .tf-sprite {
          position: absolute;
          inset: 0;
          background-image: url(${SPRITE});
          background-size: ${COLS * 100}% ${ROWS * 100}%;
          background-repeat: no-repeat;
          background-position: 0% 0%;
        }
      `}</style>
    </div>
  );
});
