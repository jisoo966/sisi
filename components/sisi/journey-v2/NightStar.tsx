"use client";

import { StarLayers } from "./StarLayers";

/**
 * NightStar — the Current Star in the star world (inside .jw-night).
 *
 * Sits at its arrival position (top-centre). Its layers stay hidden until the
 * clouds have parted, then appear in order: aura → glow → painted mark.
 */
export function NightStar({ revealed }: { revealed: boolean }) {
  return (
    <div className="night-star" aria-hidden={!revealed}>
      <StarLayers staged revealed={revealed} alt="Current Star" />
      <style jsx>{`
        .night-star {
          position: absolute;
          top: var(--star-view-top);
          left: var(--star-view-left);
          width: 48px;
          height: 48px;
          margin: -24px 0 0 -24px;
          transform: scale(1.7);
          transform-origin: center;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
