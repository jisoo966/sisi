"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FALLBACK, MAGIC, PACK, SNOW_FLAKES, useAsset } from "@/lib/envAssets";
import { FX, FX_STANDIN } from "@/lib/fxAssets";
import { WORLD_LOOK, worldAsset, type WorldId } from "@/lib/worlds";
import { SisiGlint } from "./SisiGlint";

/**
 * JourneyReveal — one recognizable thing appears a little ahead of Sísí in
 * the meadow: an element of a newly found World (Cloud Garden a small
 * cloud · Golden Afternoon a warm flower · Evening Field a firefly · Quiet
 * Winter the first snowflake), or the small flower a
 * fulfilled Star leaves along the path. It settles in softly and a
 * SisiGlint blooms on it. The words and choices (for a World) are spoken by
 * Sísí through CompanionCues; this component only draws the object.
 */

export type Reveal = { kind: "world"; world: WorldId } | { kind: "flower"; id: string };

export function JourneyReveal({ reveal, leaving = false }: { reveal: Reveal; leaving?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [glintAt, setGlintAt] = useState<{ x: number; y: number } | null>(null);
  const object = useAsset(reveal.kind === "world" ? worldAsset(reveal.world, "discovery-object", "png") : MAGIC.fulfilledFlower, "fallback");

  useEffect(() => {
    const t = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setGlintAt({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 });
    }, 700);
    return () => clearTimeout(t);
  }, []);

  if (object === null) return null; // still checking for the artwork
  return (
    <>
      <motion.div
        ref={ref}
        className={`jr-object jr-${reveal.kind}${reveal.kind === "world" && reveal.world === "cloud-garden" && object === "fallback" ? " is-cloud" : ""}`}
        aria-hidden
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={leaving ? { opacity: 0, y: 6, transition: { duration: 0.6 } } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      >
        {object !== "fallback" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={object} alt="" draggable={false} />
        ) : reveal.kind === "world" ? (
          <WorldObject world={reveal.world} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="jr-flower-fallback" src={FALLBACK.fulfilledFlower} alt="" draggable={false} />
        )}
      </motion.div>
      {glintAt && <SisiGlint at={glintAt} size={60} onDone={() => setGlintAt(null)} />}
      <style jsx global>{`
        /* ahead of Sísí (never on her), resting on the shared walking baseline:
           x = min(62%, width − 120px), centred on that x */
        .jr-object {
          position: absolute; z-index: 5; pointer-events: none;
          left: min(62%, calc(100% - 120px)); translate: -50% 0;
          bottom: var(--walking-baseline);
        }
        .jr-object img { display: block; width: 100%; height: auto; }
        .jr-world { width: clamp(64px, 20vw, 92px); }
        /* a flower or path light: a little further along the path */
        .jr-flower { width: clamp(40px, 12vw, 56px); left: min(68%, calc(100% - 120px)); }
        /* a cloud belongs to the sky: 58–72% across, 16–28% down */
        .jr-object.is-cloud { left: 65%; top: 20%; bottom: auto; width: clamp(96px, 28%, 140px); }
        .jr-obj-cloud { width: 100%; opacity: 0.95; }
        .jr-obj-flower { width: 70%; margin: 0 auto; }
        /* a firefly and the first snowflake float a little above the grass */
        .jr-obj-firefly { width: 46%; margin: 0 auto 36px; animation: jr-bob 4.8s ease-in-out infinite; }
        .jr-obj-snow { margin: 0 auto 48px; animation: jr-fall 5.5s ease-in-out infinite; }
        @keyframes jr-bob { 0%, 100% { translate: 0 0; } 50% { translate: 4px -8px; } }
        @keyframes jr-fall { 0%, 100% { translate: 0 0; rotate: 0deg; } 50% { translate: -5px 6px; rotate: 20deg; } }
        html.app-hidden .jr-object * { animation-play-state: paused !important; }
        .jr-card { display: block; padding: 5px 5px 14px; border-radius: 2px; box-shadow: var(--paper-shadow-soft); transform: rotate(-3deg); }
        .jr-card img { aspect-ratio: 4 / 3; object-fit: cover; }
        .jr-flower-fallback { filter: var(--tod-grade, none); }
      `}</style>
    </>
  );
}

/** The one recognizable thing each World brings along. */
function WorldObject({ world }: { world: WorldId }) {
  /* eslint-disable @next/next/no-img-element */
  switch (world) {
    case "cloud-garden":
      return <img className="jr-obj-cloud" src={FX_STANDIN.cloud} alt="" draggable={false} />;
    case "golden-afternoon":
      return <img className="jr-obj-flower" src={FX_STANDIN.warmFlower} alt="" draggable={false} style={{ filter: "var(--tod-grade, none)" }} />;
    case "evening-field":
      return <img className="jr-obj-firefly" src={FX.ambient.fireflies[0]} alt="" draggable={false} />;
    case "quiet-winter": {
      // the first large flake, cut from the snow sheet
      const [x, y, w, h] = SNOW_FLAKES[0];
      const k = 34 / Math.max(w, h);
      return (
        <span
          className="jr-obj-snow"
          style={{
            display: "block",
            backgroundImage: `url(${PACK.snow.src})`,
            backgroundSize: `${PACK.snow.w * k}px ${PACK.snow.h * k}px`,
            backgroundPosition: `${-x * k}px ${-y * k}px`,
            width: w * k,
            height: h * k,
          }}
        />
      );
    }
    default:
      return (
        <span className="jr-card ds-paper ds-paper--memory">
          <img src={WORLD_LOOK[world].preview} alt="" style={{ filter: WORLD_LOOK[world].grade }} />
        </span>
      );
  }
  /* eslint-enable @next/next/no-img-element */
}
