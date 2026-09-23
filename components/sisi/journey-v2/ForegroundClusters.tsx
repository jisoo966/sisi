"use client";

import { useEffect, useRef, useState } from "react";
import { layerDelta, rand, worldClock } from "@/lib/worldMotion";

/**
 * ForegroundClusters — individual grass clumps passing IN FRONT of the
 * companion (42–48px/s, faster than the 32px/s ground).
 *
 * The artist's strip was cut into separate clusters (pixels untouched).
 * Never a continuous strip:
 *   - one clump every 4–9 seconds of walking (irregular)
 *   - each clump: its own speed, scale 0.85–1.15, slight sway
 *   - most reach only the paws / lower legs; rarely a taller one
 *   - spawned fully outside the right edge, removed only after fully
 *     leaving the left edge
 */

type Cluster = { src: string; tall?: boolean };

type Props = {
  clusters: Cluster[];
  speedMin?: number;
  speedMax?: number;
  /** Seconds of walking between clumps. */
  intervalMin?: number;
  intervalMax?: number;
  /** Probability a clump is a taller, lower-body-covering one. */
  tallChance?: number;
  zIndex?: number;
};

type Live = {
  id: number;
  idx: number;
  /** % of stage height below the baseline where the clump's base sits */
  drop: number;
  /** % of stage height the clump rises above the baseline */
  reach: number;
  scale: number;
  swayDur: number;
  swayDelay: number;
};

export function ForegroundClusters({
  clusters,
  speedMin = 42,
  speedMax = 48,
  intervalMin = 4,
  intervalMax = 9,
  tallChance = 0.1,
  zIndex = 7,
}: Props) {
  const [live, setLive] = useState<Live[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const xs = useRef(new Map<number, number>());
  const speeds = useRef(new Map<number, number>());
  const nextId = useRef(1);
  const untilSpawn = useRef(rand(1.5, 4));
  const lastIdx = useRef(-1);

  useEffect(() => {
    if (clusters.length === 0) return;
    const shortIdx = clusters.map((c, i) => (c.tall ? -1 : i)).filter((i) => i >= 0);
    const tallIdx = clusters.map((c, i) => (c.tall ? i : -1)).filter((i) => i >= 0);

    const spawn = (x: number) => {
      const tall = tallIdx.length > 0 && Math.random() < tallChance;
      const pool = tall ? tallIdx : shortIdx.length ? shortIdx : tallIdx;
      let idx = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1 && idx === lastIdx.current) {
        idx = pool[(pool.indexOf(idx) + 1) % pool.length];
      }
      lastIdx.current = idx;
      const id = nextId.current++;
      xs.current.set(id, x);
      speeds.current.set(id, rand(speedMin, speedMax));
      setLive((l) => [
        ...l,
        {
          id,
          idx,
          drop: rand(1.5, 4),
          // paws ≈ 0.5–1.8% above the baseline; lower legs/body ≈ 4–5.5%
          reach: tall ? rand(4, 5.5) : rand(0.5, 1.8),
          scale: rand(0.85, 1.15),
          swayDur: rand(3.6, 6.2),
          swayDelay: -rand(0, 6),
        },
      ]);
    };

    return worldClock().subscribe((f) => {
      const W = containerRef.current?.offsetWidth ?? window.innerWidth;

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
        setLive((l) => l.filter((c) => !gone.includes(c.id)));
      }

      untilSpawn.current -= f.dt * f.factor;
      if (untilSpawn.current <= 0 && f.walking) {
        spawn(W + 1); // fully outside the right edge
        untilSpawn.current = rand(intervalMin, intervalMax);
      }
    });
  }, [clusters, speedMin, speedMax, intervalMin, intervalMax, tallChance]);

  return (
    <div ref={containerRef} className="fg-clusters" style={{ zIndex }} aria-hidden>
      {live.map((c) => (
        <div
          key={c.id}
          ref={(el) => {
            if (el) {
              els.current.set(c.id, el);
              el.style.transform = `translate3d(${xs.current.get(c.id) ?? 99999}px,0,0)`;
            }
          }}
          className="fg-cluster"
          style={{
            bottom: `calc(var(--walking-baseline) - ${(c.drop * c.scale).toFixed(2)}%)`,
            height: `${((c.drop + c.reach) * c.scale).toFixed(2)}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clusters[c.idx].src}
            alt=""
            draggable={false}
            className="fg-cluster-img"
            style={{
              animationDuration: `${c.swayDur.toFixed(2)}s`,
              animationDelay: `${c.swayDelay.toFixed(2)}s`,
            }}
          />
        </div>
      ))}
      <style jsx>{`
        .fg-clusters {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .fg-cluster {
          position: absolute;
          left: 0;
          will-change: transform;
        }
        .fg-cluster-img {
          height: 100%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          transform-origin: 50% 100%;
          animation-name: grass-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes grass-sway {
          from { transform: rotate(-0.9deg); }
          to   { transform: rotate(0.9deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fg-cluster-img { animation: none; }
        }
      `}</style>
    </div>
  );
}
