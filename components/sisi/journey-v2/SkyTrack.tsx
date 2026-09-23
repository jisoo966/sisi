"use client";

/**
 * SkyTrack — the vertical Journey sky as ONE continuous artwork.
 *
 * Renders a single tall PNG whose native aspect determines the total height.
 * The parent group (.journey-sky-group in globals.css) translates the whole
 * track as one unit for the walking ↔ star-view look-up transition:
 *
 *   Walking:   transform: translate3d(0, calc(100dvh - 100%), 0)
 *              → viewport shows the BOTTOM slice (day)
 *   Star-view: transform: translate3d(0, 0, 0)
 *              → viewport shows the TOP slice (celestial / stars)
 *
 * The vertical sky asset contains its own painted stars, clouds, and day sky.
 * We do not add, remove, recolor, or overlay anything on it.
 *
 * Legacy note: an earlier version rendered three sliced webp files
 * (sky-star / sky-cloud-gate / sky-day). Those files are still on disk for
 * future reuse if the artist re-exports the sky in slices.
 */

type Props = {
  /** Path to the vertical sky PNG. Default: /V2/sky/sky-vertical.png */
  src?: string;
};

export function SkyTrack({ src = "/V2/sky/sky-vertical.png" }: Props) {
  return (
    <div className="sky-track" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="sky-image"
        src={src}
        alt=""
        draggable={false}
      />

      <style jsx>{`
        .sky-track {
          position: absolute;
          inset: 0;
          font-size: 0;   /* kill any inline whitespace */
          line-height: 0;
          overflow: visible;   /* image intentionally wider than sky-group */
        }
        .sky-image {
          /* Scale by HEIGHT so the sky is always taller than the viewport
             (guaranteed vertical travel for the look-up transition).
             The image's natural aspect is preserved; width overflows
             equally on both sides thanks to left:50% + translateX(-50%). */
          display: block;
          height: 100%;
          width: auto;
          max-width: none;
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          user-select: none;
          -webkit-user-drag: none;
          image-rendering: -webkit-optimize-contrast;
        }
      `}</style>
    </div>
  );
}
