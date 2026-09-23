"use client";

import { useEffect, useRef, useState } from "react";
import { layerDelta, rand, worldClock } from "@/lib/worldMotion";

/**
 * ForegroundOccluder — complete individual trees passing through the world.
 * Used for both depth roles (each instance has ONE role):
 *   far silhouettes  — small, faint, bluish, ~7px/s, behind everything near
 *   foreground trees — large, dark, 50–58px/s, in front of the companion
 *
 * Rules:
 *   - A tree spawns with its left edge AT the right border (fully outside).
 *   - It is removed only once its right edge has passed the left border.
 *   - Never tiled, wrapped or repositioned. Moves only via translate3d.
 *   - Spawn timing counts "walking time" (dt × speed factor), so trees
 *     don't pile up while the companion is stopped, and gaps are irregular.
 *   - Each tree gets its own speed within [speedMin, speedMax].
 */

type Props = {
  sources: string[];
  /** px/s while walking (at multiplier 1) */
  speedMin: number;
  speedMax: number;
  /** Seconds of walking between spawns (random in range). */
  intervalMin: number;
  intervalMax: number;
  /** Seconds of walking before the first tree. */
  initialDelay?: number;
  /** Tree height as a fraction of the stage. */
  heightPct: number;
  /** CSS `bottom` for the tree base. */
  groundBase: string;
  opacity?: number;
  filter?: string;
  zIndex?: number;
};

type Live = { id: number; src: string; speed: number };

export function ForegroundOccluder({
  sources,
  speedMin,
  speedMax,
  intervalMin,
  intervalMax,
  initialDelay = 8,
  heightPct,
  groundBase,
  opacity = 1,
  filter = "none",
  zIndex = 6,
}: Props) {
  const [live, setLive] = useState<Live[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLImageElement>());
  const xs = useRef(new Map<number, number>());
  const speeds = useRef(new Map<number, number>());
  const nextId = useRef(1);
  const untilSpawn = useRef(initialDelay);
  const lastSrc = useRef("");

  // Preload so each tree's width is known before it reaches the viewport.
  useEffect(() => {
    sources.forEach((s) => {
      const im = new Image();
      im.src = s;
    });
  }, [sources]);

  useEffect(() => {
    if (sources.length === 0) return;
    return worldClock().subscribe((f) => {
      const W = containerRef.current?.offsetWidth ?? window.innerWidth;

      // Move + retire
      const gone: number[] = [];
      xs.current.forEach((x, id) => {
        const nx = x - layerDelta(f, speeds.current.get(id) ?? speedMin);
        xs.current.set(id, nx);
        const el = els.current.get(id);
        if (el) {
          el.style.transform = `translate3d(${nx}px,0,0)`;
          if (el.offsetWidth > 0 && nx + el.offsetWidth < -2) gone.push(id);
        }
      });
      if (gone.length) {
        gone.forEach((id) => {
          xs.current.delete(id);
          els.current.delete(id);
          speeds.current.delete(id);
        });
        setLive((l) => l.filter((t) => !gone.includes(t.id)));
      }

      // Irregular spawns, counted in walking time
      untilSpawn.current -= f.dt * f.factor;
      if (untilSpawn.current <= 0 && f.walking) {
        let src = sources[Math.floor(Math.random() * sources.length)];
        if (sources.length > 1 && src === lastSrc.current) {
          src = sources[(sources.indexOf(src) + 1) % sources.length];
        }
        lastSrc.current = src;
        const id = nextId.current++;
        const speed = rand(speedMin, speedMax);
        xs.current.set(id, W + 1); // fully outside the right edge
        speeds.current.set(id, speed);
        setLive((l) => [...l, { id, src, speed }]);
        untilSpawn.current = rand(intervalMin, intervalMax);
      }
    });
  }, [sources, speedMin, speedMax, intervalMin, intervalMax]);

  return (
    <div ref={containerRef} className="passing-trees" style={{ zIndex }} aria-hidden>
      {live.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.id}
          ref={(el) => {
            if (el) {
              els.current.set(t.id, el);
              el.style.transform = `translate3d(${xs.current.get(t.id) ?? 99999}px,0,0)`;
            }
          }}
          src={t.src}
          alt=""
          className="passing-tree"
          draggable={false}
          onError={() => {
            xs.current.delete(t.id);
            els.current.delete(t.id);
            setLive((l) => l.filter((x) => x.id !== t.id));
          }}
        />
      ))}

      <style jsx>{`
        .passing-trees {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .passing-tree {
          position: absolute;
          left: 0;
          bottom: ${groundBase};
          height: ${Math.max(0, Math.min(1, heightPct)) * 100}%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
          opacity: ${opacity};
          filter: ${filter};
        }
      `}</style>
    </div>
  );
}
