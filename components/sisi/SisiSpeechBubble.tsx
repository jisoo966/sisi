"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * SisiSpeechBubble — Sísí's speech, built in CSS (no stretched bubble image).
 *
 *   - sizes to its words: fit-content, 150px … min(72vw, 290px); short lines
 *     stay compact, longer ones widen, then wrap and grow downward — and a
 *     wrapped bubble narrows to its longest line (equal margins left/right)
 *   - warm ivory paper with a repeating grain overlay and soft deckled
 *     edges (the design system's .ds-deckle recipe on ::before), a very soft
 *     shadow that follows the edge, and a tail drawn with ::after so it
 *     stays attached at any size
 *   - enters softly (opacity, 6px rise, 0.98 → 1 over 320ms); when the words
 *     change, the height eases to the new size — the text itself never scales
 *
 *   <SisiSpeechBubble message="Tap Sísí whenever you want to talk." tailPosition="bottom-right" align="left" />
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

/**
 * Sísí speaks a sentence to a line: "Nice to meet you, jisoo. / Let's walk a
 * little." Plain strings of two or three short sentences are set one sentence
 * per line (a longer sentence still wraps on its own); anything else is left
 * as it is.
 */
export function bySentence(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string") return text;
  const raw = text.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
  // a very short sentence keeps the next one company ("Hello. I'm Sísí.")
  const parts: string[] = [];
  for (const p of raw) {
    const prev = parts[parts.length - 1];
    if (prev !== undefined && prev.length < 10) parts[parts.length - 1] = `${prev} ${p}`;
    else parts.push(p);
  }
  // …and a very short last one stays with the sentence before ("… up there. Tap it.")
  if (parts.length > 1 && parts[parts.length - 1].length < 10) parts.splice(-2, 2, `${parts[parts.length - 2]} ${parts[parts.length - 1]}`);
  if (parts.length < 2 || parts.length > 3) return text;
  return parts.map((p, i) => (
    <span key={i} className="sisi-line">
      {p}
    </span>
  ));
}

/**
 * Aim a bubble's tail at a point on screen (e.g. Sísí's head) — the bubble
 * itself can sit wherever it reads best (centred). The tip slides along the
 * bottom edge, kept clear of the rounded corners.
 */
export function aimTail(bubble: HTMLElement, targetX: number) {
  const r = bubble.getBoundingClientRect();
  const x = Math.max(26, Math.min(r.width - 26, targetX - r.left));
  bubble.style.setProperty("--tail-x", `${Math.round(x)}px`);
}

export function SisiSpeechBubble({
  message,
  children,
  tailPosition = "bottom-right",
  align = "left",
  className = "",
  onClick,
  ariaLabel,
  delay = 0,
  corner,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const [h, setH] = useState<number | "auto">("auto");

  // Wrapped words leave the box at its widest (CSS can't shrink a box to its
  // longest line), and a box sized before the font arrived keeps its old
  // width — either way the right side looked emptier than the left. Measure
  // the lines as they fall and fit the paper to the longest one: the same
  // margin on both sides, one line or many.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;
    const fit = () => {
      root.style.width = ""; // let the words fall at the natural width first
      // only the words themselves (element boxes would report their full width)
      const rects: DOMRect[] = [];
      const walk = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) if (r.width > 0) rects.push(r);
      }
      // buttons inside count whole (their padding is part of the row)
      inner.querySelectorAll("button, a").forEach((b) => rects.push(b.getBoundingClientRect()));
      if (!rects.length) return;
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      // measured on screen, while the bubble may still be scaling in (0.98):
      // undo that scale, or the words would wrap one word early
      const scale = root.getBoundingClientRect().width / (root.offsetWidth || 1) || 1;
      const cs = getComputedStyle(root);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      root.style.width = `${Math.ceil((right - left) / scale + pad + 2)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [message, children]);
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
      ref={(el: HTMLElement | null) => {
        rootRef.current = el;
      }}
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
          {message !== undefined && <span className="sisi-speech-text">{bySentence(message)}</span>}
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
          /* optically centred: the type's own space sits below the baseline,
             so a little more room above than below (measured: cap-to-baseline
             centre = the paper's centre) */
          padding: 15px 16px 11px;
          box-sizing: border-box;
          border: 0;
          color: var(--sisi-ink);
          /* paper on ::before (deckled edge); the lift follows the torn edge */
          background: none;
          isolation: isolate;
          filter: drop-shadow(0 2px 3px rgba(16, 45, 50, 0.1)) drop-shadow(0 5px 10px rgba(16, 45, 50, 0.07));
          font-family: var(--font-editorial);
          font-weight: 400;
          /* Sísí's voice: a touch smaller than written dialogue */
          font-size: var(--text-speech, clamp(13.5px, 3.6vw, 15px));
          line-height: var(--leading-dialogue);
          letter-spacing: var(--tracking-editorial);
          /* Sísí writes like everything on our paper: left-aligned */
          text-align: left;
          text-wrap: pretty; /* no word left alone on the last line */
          overflow-wrap: break-word;
          white-space: normal;
          transform-origin: 70% 100%;
          -webkit-tap-highlight-color: transparent;
        }
        button.sisi-speech { cursor: pointer; font: inherit; font-family: var(--font-editorial); font-size: var(--text-speech, clamp(13.5px, 3.6vw, 15px)); line-height: var(--leading-dialogue); color: var(--sisi-ink); }
        button.sisi-speech:focus-visible { outline: 2px solid var(--ink-60); outline-offset: 3px; }
        .sisi-speech--left { text-align: left; }
        .sisi-speech--center { text-align: center; text-wrap: balance; }
        .sisi-speech--right { text-align: right; }
        .sisi-speech-clip { position: relative; overflow: hidden; }
        .sisi-speech-inner { display: block; }
        .sisi-speech-text { display: block; }
        .sisi-line { display: block; } /* a sentence to a line */
        .sisi-speech-text em { font-style: italic; }

        .sisi-speech::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: var(--sisi-paper) var(--grain-speech) 0 0 / 180px 180px repeat;
          background-blend-mode: multiply;
          box-shadow: inset 0 0 14px rgba(16, 45, 50, 0.05);
          border-radius: 20px 18px 22px 17px; /* paper edge sits ~3px in: reads as ~15px */
          -webkit-mask: var(--deckle-mask);
          mask: var(--deckle-mask);
        }
        .sisi-speech::after {
          content: "";
          position: absolute;
          z-index: -1;
          bottom: -11px; /* tucked under the deckled bottom edge */
          /* a soft tail: its shoulders curve out of the bubble's body and the
             tip is rounded (never a sharp triangle stuck on) */
          width: 28px;
          height: 18px;
          background: var(--sisi-paper) var(--grain-speech) 0 0 / 180px 180px repeat;
          background-blend-mode: multiply;
        }
        .sisi-speech--bottom-right { transform-origin: calc(100% - 30px) 100%; }
        .sisi-speech--bottom-right::after { right: 18px; clip-path: path("M0 0 L28 0 C19 1 13 6 10.6 15 Q9 18.6 7.8 15 C6.5 7 4 1.5 0 0 Z"); }
        .sisi-speech--bottom-left { transform-origin: 30px 100%; }
        .sisi-speech--bottom-left::after { left: 18px; clip-path: path("M0 0 L28 0 C24 1.5 21.5 7 20.2 15 Q19 18.6 17.4 15 C15 6 9 1 0 0 Z"); }
        .sisi-speech--bottom-center { transform-origin: 50% 100%; }
        .sisi-speech--bottom-center::after { left: calc(50% - 14px); clip-path: path("M0 0 L28 0 C21 1 17.5 6 15.6 15 Q14 18.6 12.4 15 C10.5 6 7 1 0 0 Z"); }
        .sisi-speech--no-tail::after { display: none; }
        /* a caller may aim the tail: --tail-x = the tip's distance from the left edge */
        .sisi-speech[style*="--tail-x"]::after { left: calc(var(--tail-x) - 14px); right: auto; clip-path: path("M0 0 L28 0 C21 1 17.5 6 15.6 15 Q14 18.6 12.4 15 C10.5 6 7 1 0 0 Z"); }

        @media (prefers-reduced-motion: reduce) {
          .sisi-speech { transform: none !important; }
        }
      `}</style>
    </Tag>
  );
}
