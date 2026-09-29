"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * SisiSpeechBubble — Sísí's speech, built in CSS (no stretched bubble image).
 *
 *   - sizes to its words: fit-content, 150px … min(72vw, 290px); short lines
 *     stay compact, longer ones widen, then wrap and grow downward
 *   - warm ivory paper with a repeating grain overlay, gently irregular
 *     corners, a very soft shadow, and a tail drawn with ::after so it stays
 *     attached at any size
 *   - enters softly (opacity, 6px rise, 0.98 → 1 over 320ms); when the words
 *     change, the height eases to the new size — the text itself never scales
 *
 *   <SisiSpeechBubble message="Tap Sísí whenever you want to talk." tailPosition="bottom-right" align="center" />
 *
 * `children` may replace or follow the message (e.g. small actions).
 */

export type TailPosition =
  | "bottom-right" | "bottom-left" | "bottom-center" | "no-tail"
  // design-system shorthands
  | "right" | "left" | "center" | "none";

const TAIL_ALIAS: Record<string, string> = { right: "bottom-right", left: "bottom-left", center: "bottom-center", none: "no-tail" };

type Props = {
  message?: React.ReactNode;
  children?: React.ReactNode;
  tailPosition?: TailPosition;
  align?: "left" | "center" | "right";
  className?: string;
  /** render as a button (the whole bubble is tappable) */
  onClick?: () => void;
  ariaLabel?: string;
  /** entrance delay (s) */
  delay?: number;
  /** placed on the bubble itself, outside the text flow (e.g. a close ×) */
  corner?: React.ReactNode;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function SisiSpeechBubble({
  message,
  children,
  tailPosition = "bottom-right",
  align = "center",
  className = "",
  onClick,
  ariaLabel,
  delay = 0,
  corner,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | "auto">("auto");
  const first = useRef(true);

  // follow the content's height (words changed / wrapped) — smoothly
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    first.current = false;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Tag = onClick ? motion.button : motion.div;
  const tail = TAIL_ALIAS[tailPosition] ?? tailPosition;
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`sisi-speech sisi-speech--${tail} sisi-speech--${align} ${className}`}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // closing: fade and lift slightly
      exit={{ opacity: 0, y: -6, transition: { duration: 0.22, ease: "easeOut" } }}
      transition={{ duration: 0.32, ease: EASE, delay }}
    >
      <motion.div
        className="sisi-speech-clip"
        initial={false}
        animate={{ height: h }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <div ref={innerRef} className="sisi-speech-inner">
          {message !== undefined && <span className="sisi-speech-text">{message}</span>}
          {children}
        </div>
      </motion.div>
      {corner}

      <style jsx global>{`
        .sisi-speech {
          position: relative;
          display: inline-block;
          width: fit-content;
          min-width: 150px;
          max-width: min(72vw, 290px);
          margin: 0;
          padding: 14px 18px 16px;
          box-sizing: border-box;
          border: 0;
          color: var(--sisi-ink);
          background-color: var(--sisi-paper);
          /* the supplied paper tile (seamless, 256px) repeats — never stretched */
          background-image: var(--grain-speech);
          background-blend-mode: multiply;
          background-repeat: repeat;
          background-size: 180px 180px;
          border-radius: 15px 13px 17px 12px;
          box-shadow: 0 3px 8px rgba(16, 45, 50, 0.12), inset 0 0 14px rgba(16, 45, 50, 0.05);
          font-family: var(--font-editorial);
          font-weight: 400;
          font-size: var(--text-dialogue);
          line-height: var(--leading-dialogue);
          letter-spacing: -0.01em;
          text-align: center;
          overflow-wrap: break-word;
          white-space: normal;
          transform-origin: 70% 100%;
          -webkit-tap-highlight-color: transparent;
        }
        button.sisi-speech { cursor: pointer; font: inherit; font-family: var(--font-editorial); font-size: var(--text-dialogue); line-height: var(--leading-dialogue); color: var(--sisi-ink); }
        button.sisi-speech:focus-visible { outline: 2px solid var(--ink-60); outline-offset: 3px; }
        .sisi-speech--left { text-align: left; }
        .sisi-speech--right { text-align: right; }
        .sisi-speech-clip { position: relative; overflow: hidden; }
        .sisi-speech-inner { display: block; }
        .sisi-speech-text { display: block; }
        .sisi-speech-text em { font-style: italic; }

        .sisi-speech::after {
          content: "";
          position: absolute;
          bottom: -13px;
          width: 22px;
          height: 18px;
          background: var(--sisi-paper) var(--grain-speech) 0 0 / 180px 180px repeat;
          background-blend-mode: multiply;
          filter: drop-shadow(0 3px 2px rgba(16, 45, 50, 0.08));
        }
        .sisi-speech--bottom-right { transform-origin: calc(100% - 30px) 100%; }
        .sisi-speech--bottom-right::after { right: 22px; clip-path: polygon(0 0, 100% 0, 32% 100%); }
        .sisi-speech--bottom-left { transform-origin: 30px 100%; }
        .sisi-speech--bottom-left::after { left: 22px; clip-path: polygon(0 0, 100% 0, 68% 100%); }
        .sisi-speech--bottom-center { transform-origin: 50% 100%; }
        .sisi-speech--bottom-center::after { left: calc(50% - 11px); clip-path: polygon(0 0, 100% 0, 50% 100%); }
        .sisi-speech--no-tail::after { display: none; }

        @media (prefers-reduced-motion: reduce) {
          .sisi-speech { transform: none !important; }
        }
      `}</style>
    </Tag>
  );
}
