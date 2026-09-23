"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadSignsForStar } from "@/lib/myStars";
import { STAR_CARD_DELAY_S } from "@/lib/useStarAscent";

/**
 * StarView — storyboard frame 6: above the clouds, under the star, a small
 * torn-edge postcard of the journey toward it.
 *
 *   photo  — a miniature of the Journey world (the same sky / path / meadow
 *            / fox artwork, just framed small; nothing redrawn)
 *   text   — the wish, "walking toward this since …", number of moments
 *   stamp  — a small star stamp, bottom-right
 *
 * The card rises in only after the camera has arrived in the night sky
 * (see lib/useStarAscent.ts). The star itself is drawn
 * by SkyStarV2. Tapping the card opens the star's journey (or, with no wish
 * yet, the place to make one).
 */

type Props = {
  star: Star;
  onBack: () => void;
  /** No wish saved yet — the sky still holds a star, waiting for one. */
  placeholder?: boolean;
};

export function StarView({ star, onBack, placeholder = false }: Props) {
  // The postcard rises in once the camera has arrived in the star world
  // (reduced motion: right after the 250ms crossfade).
  const [CARD_DELAY] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0.35
      : STAR_CARD_DELAY_S,
  );
  const [signCount, setSignCount] = useState<number | null>(null);

  useEffect(() => {
    if (placeholder) return;
    let cancelled = false;
    loadSignsForStar(star.id)
      .then((signs) => {
        if (!cancelled) setSignCount(signs.length);
      })
      .catch(() => {
        if (!cancelled) setSignCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [star.id, placeholder]);

  const href = placeholder ? "/my-stars" : `/my-stars/${star.id}`;
  const title = placeholder ? "this star is waiting for your wish" : star.wish || "your star";
  const sub = placeholder
    ? "what is meant for you is on its way."
    : `walking toward this since ${formatSince(star.createdAt)}`;

  return (
    <motion.div
      className="star-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }}
      transition={{ duration: 0.3, delay: CARD_DELAY - 0.3 }}
    >
      <motion.button
        type="button"
        className="postcard-wrap"
        onClick={() => {
          window.location.href = href;
        }}
        aria-label={placeholder ? "make a wish" : "view journey"}
        initial={{ opacity: 0, y: 36, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={{ duration: 0.8, delay: CARD_DELAY, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Static soft shadow (a blurred block rasterized once) instead of a
            drop-shadow filter, which would repaint on every frame of the
            card's rise-in. */}
        <span className="postcard-shadow" aria-hidden />
        <div className="postcard paper-bg">
          <div className="photo" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="p-sky" src="/V2/parallax/journey-sky-fixed.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="p-ground" src="/V2/parallax/journey-walking-ground.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="p-path" src="/V2/parallax/journey-walking-path.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="p-fox" src="/V2/fox-walk/fox-walk-preview.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="p-star" src="/assets/sisi-star-mark-painted-512.png" alt="" />
          </div>

          <p className="title">{title}</p>
          <div className="rule" />
          <p className="sub">{sub}</p>
          <div className="rule" />
          {!placeholder && signCount !== null && signCount > 0 && (
            <p className="count">
              {signCount} moment{signCount === 1 ? "" : "s"}
            </p>
          )}

          <span className="stamp" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
            </svg>
          </span>
        </div>
      </motion.button>

      <motion.p
        className="card-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: CARD_DELAY + 0.5 }}
      >
        {placeholder ? "tap to make a wish" : "tap to view journey"}
      </motion.p>

      <button
        type="button"
        onClick={onBack}
        aria-label="Return to the walk"
        className="back-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="back-label">return</span>
      </button>

      <style jsx>{`
        :global(.star-view) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 8;
        }
        :global(.postcard-wrap) {
          position: absolute;
          top: calc(var(--star-view-top) + 13vh);
          left: 50%;
          margin-left: calc(min(66vw, 264px) / -2);
          width: min(66vw, 264px);
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
          will-change: transform, opacity;
          -webkit-tap-highlight-color: transparent;
        }
        .postcard-shadow {
          position: absolute;
          inset: 14px 8px -10px 8px;
          background: rgba(0, 0, 0, 0.42);
          border-radius: 10px;
          filter: blur(14px);
          pointer-events: none;
        }
        .postcard {
          position: relative;
          padding: 14px 14px 18px;
          text-align: left;
          clip-path: ${TORN_EDGE};
        }
        .photo {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border-radius: 2px;
          margin-bottom: 14px;
          background: #4384e3;
        }
        .photo img {
          position: absolute;
          display: block;
          max-width: none;
          user-select: none;
        }
        .p-sky {
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* Miniature of the world: path centre at 30% from the bottom. */
        .p-ground {
          height: 150%;
          width: auto;
          left: -40%;
          bottom: calc(30% - 1.5% - 40.4%);
        }
        .p-path {
          height: 62%;
          width: auto;
          left: -60%;
          bottom: calc(30% - 28.9%);
        }
        .p-fox {
          width: 24%;
          height: auto;
          left: 26%;
          bottom: calc(30% - 1%);
        }
        .p-star {
          position: absolute;
          width: 12%;
          left: 69%;
          top: 11%;
        }
        .title {
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(15px, 4.4vw, 18px);
          line-height: 1.3;
          color: #2b2f45;
          margin: 0 44px 6px 2px;
        }
        .sub {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-style: italic;
          font-size: clamp(12px, 3.4vw, 13.5px);
          color: rgba(43, 47, 69, 0.62);
          margin: 6px 44px 6px 2px;
        }
        .count {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 12px;
          color: rgba(43, 47, 69, 0.55);
          margin: 6px 0 0 2px;
        }
        .rule {
          height: 1px;
          background: rgba(43, 47, 69, 0.14);
          margin-right: 44px;
        }
        .stamp {
          position: absolute;
          right: 14px;
          bottom: 16px;
          width: 34px;
          height: 34px;
          border: 1.5px dashed rgba(196, 132, 124, 0.85);
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transform: rotate(5deg);
        }
        .stamp svg {
          width: 20px;
          height: 20px;
          fill: #d98673;
        }
        :global(.star-view) :global(.card-hint) {
          position: absolute;
          top: calc(var(--star-view-top) + 13vh + min(66vw, 264px) * 1.22 + 16px);
          left: 0;
          right: 0;
          text-align: center;
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-style: italic;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }
        .back-btn {
          position: absolute;
          bottom: calc(var(--safe-bottom) + clamp(20px, 5vw, 34px));
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          background: transparent;
          border: 0;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          pointer-events: auto;
          transition: color 0.2s ease;
        }
        .back-btn:hover {
          color: rgba(255, 255, 255, 0.95);
        }
        .back-btn svg {
          width: 22px;
          height: 22px;
        }
        .back-label {
          font-family: var(--font-eb-garamond), Georgia, serif;
          letter-spacing: 0.1em;
          text-transform: lowercase;
          font-size: 11px;
        }
      `}</style>
    </motion.div>
  );
}

/**
 * Deterministic torn-paper edge as a clip-path polygon (small irregular
 * bites along all four sides). Computed once at module load.
 */
const TORN_EDGE = (() => {
  const pts: string[] = [];
  const jag = (i: number, seed: number) =>
    0.9 * Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453 % 1);
  const N = 26;
  for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${jag(i, 1).toFixed(2)}%`);
  for (let i = 1; i <= N; i++) pts.push(`${(100 - jag(i, 2) * 1.2).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  for (let i = N - 1; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% ${(100 - jag(i, 3)).toFixed(2)}%`);
  for (let i = N - 1; i >= 1; i--) pts.push(`${(jag(i, 4) * 1.2).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(", ")})`;
})();

function formatSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "recently";
  }
}
