"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FALLBACK, MAGIC, useAsset } from "@/lib/envAssets";
import { WORLD_LOOK, worldAsset, type WorldId } from "@/lib/worlds";
import { SisiGlint } from "./SisiGlint";

/**
 * JourneyReveal — one recognizable thing appears a little ahead of Sísí in
 * the meadow: an element of a newly found World, or the small flower a
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
        className={`jr-object jr-${reveal.kind}`}
        aria-hidden
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={leaving ? { opacity: 0, y: 6, transition: { duration: 0.6 } } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      >
        {object !== "fallback" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={object} alt="" draggable={false} />
        ) : reveal.kind === "world" ? (
          // until the World's own discovery object arrives: a small postcard of it
          <span className="jr-card ds-paper ds-paper--memory">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={WORLD_LOOK[reveal.world].preview} alt="" style={{ filter: WORLD_LOOK[reveal.world].grade }} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="jr-flower-fallback" src={FALLBACK.fulfilledFlower} alt="" draggable={false} />
        )}
      </motion.div>
      {glintAt && <SisiGlint at={glintAt} size={60} onDone={() => setGlintAt(null)} />}
      <style jsx global>{`
        .jr-object {
          position: absolute; z-index: 5; pointer-events: none;
          left: calc(var(--companion-x, 37%) + var(--cat-width) * 0.9);
          bottom: calc(var(--walking-baseline) - 1%);
        }
        .jr-object img { display: block; width: 100%; height: auto; }
        .jr-world { width: clamp(64px, 20vw, 92px); }
        .jr-flower { width: clamp(40px, 12vw, 56px); bottom: calc(var(--walking-baseline) - 3%); }
        .jr-card { display: block; padding: 5px 5px 14px; border-radius: 2px; box-shadow: var(--paper-shadow-soft); transform: rotate(-3deg); }
        .jr-card img { aspect-ratio: 4 / 3; object-fit: cover; }
        .jr-flower-fallback { filter: var(--tod-grade, none); }
      `}</style>
    </>
  );
}
