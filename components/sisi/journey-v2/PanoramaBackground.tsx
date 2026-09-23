"use client";

/**
 * PanoramaBackground — wide illustrated environment behind the cat.
 *
 * Rules (from Phase 3 spec):
 *   - height: 100% (fills the Journey viewport vertically)
 *   - width: auto, max-width: none (natural horizontal overflow)
 *   - aspect ratio preserved — never stretched, never shrunk to fit portrait
 *   - horizontal cropping is INTENTIONAL
 *   - the oversized panorama can translate horizontally behind the cat
 *
 * We render TWO copies side-by-side inside a translating lane so the drift
 * loops seamlessly (image ends match closely; two copies mask the wrap).
 * Drift duration = --world-speed. Pause with the `paused` prop.
 */

type Props = {
  /** Path to panorama PNG (must be roughly 2:1 or wider) */
  src?: string;
  /** Pause the drift animation */
  paused?: boolean;
};

export function PanoramaBackground({
  src = "/V2/Background/meadow-day.png",
  paused = false,
}: Props) {
  return (
    <div className="panorama-bg" aria-hidden>
      <div className={`panorama-lane ${paused ? "is-paused" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="panorama-img" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="panorama-img" draggable={false} />
      </div>

      <style jsx>{`
        .panorama-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          /* neutral fallback so we don't flash white before image loads */
          background: #b6d3ea;
        }
        .panorama-lane {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: max-content;    /* fits two full-height images */
          display: flex;
          will-change: transform;
          animation: panoramaDrift var(--world-speed, 90s) linear infinite;
        }
        .panorama-lane.is-paused {
          animation-play-state: paused;
        }
        .panorama-img {
          height: 100%;
          width: auto;
          max-width: none;       /* never scale down to viewport width */
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }
        @keyframes panoramaDrift {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        /* Respect user reduced-motion preference */
        @media (prefers-reduced-motion: reduce) {
          .panorama-lane {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
