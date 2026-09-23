"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadSignsForStar } from "@/lib/myStars";

/**
 * StarView — the celestial UI that appears above the clouds.
 *
 * Renders text and controls BELOW the centered star (star itself is drawn by
 * SkyStarV2). Fades in with a delay so it appears after the cinematic
 * upward transition mostly completes.
 *
 * Contents:
 *   - Star title (star.wish)
 *   - "walking toward this since {date}"
 *   - N moments (signs count)
 *   - View journey button (future: navigates to star's timeline)
 *   - Back gesture (chevron-down) → onBack()
 */

type Props = {
  star: Star;
  onBack: () => void;
};

export function StarView({ star, onBack }: Props) {
  const [signCount, setSignCount] = useState<number | null>(null);

  useEffect(() => {
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
  }, [star.id]);

  const sinceLabel = formatSince(star.createdAt);

  return (
    <motion.div
      className="star-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.95 }} /* wait for the sky transition */
    >
      <div className="star-content">
        <p className="star-title">{star.wish || "your star"}</p>
        <p className="star-since">walking toward this since {sinceLabel}</p>
        {signCount !== null && signCount > 0 && (
          <p className="star-count">
            {signCount} moment{signCount === 1 ? "" : "s"}
          </p>
        )}
        <button
          type="button"
          className="view-journey-btn"
          onClick={() => {
            // Future: navigate to star journey timeline. For now nav to detail.
            window.location.href = `/my-stars/${star.id}`;
          }}
        >
          view journey
        </button>
      </div>

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
        .star-view {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 0 var(--stage-padding);
          pointer-events: none;
          z-index: 8;
        }
        .star-content {
          position: absolute;
          top: calc(var(--star-view-top) + 12vh);
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          color: rgba(255, 255, 255, 0.92);
          max-width: min(320px, 82vw);
          pointer-events: auto;
        }
        .star-title {
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(20px, 6vw, 26px);
          letter-spacing: 0.01em;
          line-height: 1.3;
          margin: 0 0 10px 0;
        }
        .star-since {
          font-family: var(--font-sentient), Georgia, serif;
          font-weight: 300;
          letter-spacing: -0.02em;
          font-style: italic;
          font-size: clamp(12px, 3.5vw, 14px);
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 4px 0;
        }
        .star-count {
          font-family: var(--font-sentient), Georgia, serif;
          font-weight: 300;
          letter-spacing: -0.02em;
          font-size: clamp(11px, 3.2vw, 13px);
          color: rgba(255, 255, 255, 0.55);
          margin: 0 0 26px 0;
        }
        .view-journey-btn {
          font-family: var(--font-sentient), Georgia, serif;
          font-weight: 300;
          letter-spacing: 0.02em;
          font-size: clamp(13px, 3.8vw, 15px);
          color: rgba(255, 255, 255, 0.88);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 9999px;
          padding: 10px 22px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .view-journey-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.42);
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
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          pointer-events: auto;
          transition: color 0.2s ease;
        }
        .back-btn:hover {
          color: rgba(255, 255, 255, 0.85);
        }
        .back-btn svg {
          width: 22px;
          height: 22px;
          transform: rotate(180deg); /* up-chevron */
        }
        .back-label {
          font-family: var(--font-sentient), Georgia, serif;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: lowercase;
          font-size: 10px;
        }
      `}</style>
    </motion.div>
  );
}

function formatSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "recently";
  }
}
