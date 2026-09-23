"use client";

/**
 * SkyJourney — the tall vertical sky asset.
 *
 * Height: var(--sky-height) = 250dvh (2.5 screens tall).
 * Vertical layout (top → bottom of the element):
 *   0–22%   celestial ink-black
 *   22–32%  celestial → cloud transition
 *   32–58%  dense white cloud bank ← acts as visual transition mask
 *   58–72%  cloud → day transition
 *   72–100% day periwinkle blue
 *
 * Color spec:
 *   celestial: #0d1620 (near-black with a cool blue/green undertone,
 *              matching the darkest ink used in existing SiSi grass/foliage,
 *              NOT navy, NOT purple, NOT pure #000)
 *   clouds:    white with subtle periwinkle-blue shadow highlights,
 *              never pink
 *   day:       SiSi periwinkle #a5c9e8 (matches meadow-day.png sky)
 *
 * When the real vertical PNG (/V2/Background/sky-vertical.png) is added,
 * it will layer on top of the gradient. Until then the gradient IS the sky.
 * Painted decorative stars in the celestial section will come from the PNG.
 */
export function SkyJourney() {
  return (
    <div className="sky-journey" aria-hidden>
      {/* Optional PNG overlay — loads if the file exists, ignored otherwise. */}
      <div className="sky-image" />
      {/* Baseline gradient always paints beneath. */}
      <div className="sky-gradient" />

      {/* Placeholder painted stars in the celestial section — top ~22% of the
          element. Removed once the real PNG (with hand-painted stars) is in place. */}
      <div className="sky-stars" aria-hidden>
        {STAR_DOTS.map((s, i) => (
          <span
            key={i}
            className="sky-star-dot"
            style={{ top: `${s.top}%`, left: `${s.left}%`, opacity: s.o }}
          />
        ))}
      </div>

      <style jsx>{`
        .sky-journey {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%; /* Fills journey-sky-group which is var(--sky-height) tall */
          overflow: hidden;
          isolation: isolate;
        }
        .sky-gradient,
        .sky-image {
          position: absolute;
          inset: 0;
        }
        .sky-gradient {
          /* Cloud band spans 20–80% (150dvh, larger than the 100dvh viewport)
             so during the transition the viewport is FULLY covered in cloud
             from ~500ms to ~1000ms. Dense white core at 40–60% ensures the
             mask never breaks. Colors: celestial ink-black, cool periwinkle
             cloud shadow, near-white pale ivory. No pink. */
          background: linear-gradient(
            to bottom,
            #0d1620 0%,
            #0d1620 18%,
            #1c2a3f 22%,
            #4c5b7a 26%,
            #96a5c0 30%,
            #d3dae5 34%,
            #ececde 38%,
            #ffffff 46%,
            #ffffff 54%,
            #ececde 62%,
            #d3dae5 66%,
            #96a5c0 70%,
            #a5c9e8 78%,
            #a5c9e8 100%
          );
          z-index: 0;
        }
        .sky-image {
          background-image: url(/V2/Background/sky-vertical.png);
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-position: top center;
          z-index: 1;
        }
        .sky-stars {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 22%; /* the celestial band */
          z-index: 2;
          pointer-events: none;
        }
        .sky-star-dot {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: #f5efe4;
          box-shadow: 0 0 6px rgba(246, 200, 110, 0.55);
        }
      `}</style>
    </div>
  );
}

/** Deterministic placeholder star positions in the celestial band (top 22%). */
const STAR_DOTS = [
  { top: 8,  left: 12, o: 0.85 },
  { top: 4,  left: 30, o: 0.5  },
  { top: 12, left: 48, o: 0.75 },
  { top: 6,  left: 62, o: 0.9  },
  { top: 14, left: 78, o: 0.6  },
  { top: 18, left: 20, o: 0.5  },
  { top: 20, left: 40, o: 0.7  },
  { top: 16, left: 66, o: 0.85 },
  { top: 3,  left: 88, o: 0.65 },
  { top: 10, left: 92, o: 0.55 },
  { top: 21, left: 58, o: 0.6  },
  { top: 15, left: 8,  o: 0.7  },
];
