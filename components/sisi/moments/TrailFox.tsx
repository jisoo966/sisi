"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SpeakLines } from "@/components/sisi/SpeakLines";

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
/** the sheet is the original 3.6s loop: 4 walk cycles = 8 steps */
const STEP_FRAMES = FRAMES / 8;

const MOVING_V = 6; // px/s — below this the world is effectively still
const MIN_RATE = 0.2; // sheets/s while moving (≈ a slow walk)
const MAX_RATE = 0.75; // sheets/s cap (≈ 2.7× the Journey pace)
const PX_PER_CYCLE = 115; // world px per sheet — the Journey's pace (32px/s × 3.6s)
const FLIP_V = 18;

export type TrailFoxHandle = {
  update: (vel: number, dt: number, reduced: boolean) => void;
  /** Turn in place (e.g. toward the Journey before leaving Moments). */
  face: (dir: "left" | "right") => void;
  isIdle: () => boolean;
};

export const TrailFox = forwardRef<
  TrailFoxHandle,
  {
    onTap?: () => void;
    rootRef?: React.Ref<HTMLDivElement>;
    initialOffset?: number;
    /** words above Sísí's head (e.g. a SisiSpeechBubble); the tail points at her head */
    say?: React.ReactNode;
  }
>(function TrailFox({ onTap, rootRef, initialOffset = 0, say }, ref) {
  const flipRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLImageElement>(null);
  const s = useRef({ phase: 0, walking: false, finishing: false, facing: -1 as -1 | 1, frame: -1 });
  const [facing, setFacing] = useState<"left" | "right">("left");
  const sayRef = useRef<HTMLDivElement>(null);
  const hasSay = !!say;

  // Keep the speech bubble centred on the stage with its tail on her head,
  // whichever way she faces and wherever the trail has carried her: the tail
  // slides along the bubble's bottom edge to point at her head.
  useEffect(() => {
    if (!hasSay) return;
    let raf = 0;
    const place = () => {
      raf = requestAnimationFrame(place);
      const box = sayRef.current, root = flipRef.current?.parentElement;
      const bubble = box?.querySelector(".sisi-speech") as HTMLElement | null;
      const stage = (root?.offsetParent as HTMLElement | null) ?? document.body;
      if (!box || !root || !bubble) return;
      const rr = root.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const left = root.getAttribute("data-facing") !== "right";
      const headX = rr.left + rr.width * (left ? 0.26 : 0.74);
      const bw = bubble.offsetWidth;
      // centred on the stage; only the tail travels to her head
      const x = sr.left + (sr.width - bw) / 2;
      box.style.left = `${Math.round(x - rr.left)}px`;
      const tail = Math.max(26, Math.min(bw - 26, headX - x));
      bubble.style.setProperty("--tail-x", `${Math.round(tail)}px`);
      box.style.visibility = "visible";
    };
    raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [hasSay]);

  const applyFacing = (f: -1 | 1) => {
    s.current.facing = f;
    if (flipRef.current) flipRef.current.style.transform = `scaleX(${f === -1 ? -1 : 1})`;
    // the speech slot follows her head (left when facing left, right when facing right)
    flipRef.current?.parentElement?.setAttribute("data-facing", f === -1 ? "left" : "right");
    if (say) setFacing(f === -1 ? "left" : "right"); // the speaking lines open in front of her face
  };

  useImperativeHandle(ref, () => ({
    face(dir) {
      applyFacing(dir === "left" ? -1 : 1);
    },
    isIdle() {
      return !s.current.walking;
    },
    update(vel, dt, reduced) {
      const st = s.current;
      const speed = Math.abs(vel);

      if (speed > FLIP_V) {
        const f: -1 | 1 = vel > 0 ? -1 : 1; // into the past → face left
        if (f !== st.facing) applyFacing(f);
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
        const y = st.walking ? -2.2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 8 * st.phase)) : 0;
        b.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }
    },
  }));

  return (
    <div
      ref={rootRef}
      className="tf-root"
      data-facing="left"
      onClick={onTap}
      aria-hidden
      style={initialOffset ? { transform: `translate3d(${initialOffset}px,0,0)` } : undefined}
    >
      {/* the pan wrapper (tf-root) is moved by MomentsWorld during camera reframes */}
      <div ref={flipRef} className="tf-flip" style={{ transform: "scaleX(-1)" }}>
        <div ref={bobRef} className="tf-bob">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={idleRef} className="tf-idle" src={IDLE} alt="" draggable={false} />
          <div ref={spriteRef} className="tf-sprite" style={{ visibility: "hidden" }} />
        </div>
      </div>
      {/* bubble and strokes arrive together and fade out together */}
      <div ref={sayRef} className="tf-say" style={{ visibility: "hidden" }}>
        <AnimatePresence>{say && <div key="say">{say}</div>}</AnimatePresence>
      </div>
      <AnimatePresence>{say && <SpeakLines key="lines" facing={facing} delay={0.2} className="tf-lines" />}</AnimatePresence>
      <style jsx global>{`
        .tf-root {
          position: absolute;
          z-index: 6;
          /* same size and paw line as the Journey's WalkingCat */
          width: var(--cat-width);
          left: calc(var(--mm-fox-x) - var(--cat-width) / 2);
          bottom: calc(var(--walking-baseline) - var(--cat-width) * 0.0401);
          pointer-events: none;
        }
        .tf-flip, .tf-bob { position: relative; width: 100%; }
        /* above her head with breathing room; left and the tail position are
           set live (see the placement effect) */
        .tf-say {
          position: absolute;
          z-index: 1;
          bottom: 118%;
          left: 0;
          width: max-content;
          pointer-events: auto;
        }
        .tf-say .sisi-speech { max-width: 200px; }
        /* the three speaking strokes, just in front of her face */
        .tf-lines { z-index: 1; bottom: 66%; left: 6%; }
        .tf-root[data-facing="right"] .tf-lines { left: 94%; }
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
