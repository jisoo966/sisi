"use client";

import { useEffect, useRef, useState } from "react";
import { LAYER_SPEED, rand, worldClock } from "@/lib/worldMotion";

/**
 * CloudDrift — a few single clouds in an otherwise open sky.
 *
 *   small distant clouds  1.5–2   px/s, small, higher in the sky
 *   larger nearer clouds  2.5–3.5 px/s, bigger, a little lower
 *
 *   - at most 3 clouds on screen, often 1–2, with long empty stretches
 *   - clouds arrive alone or as a loose pair ("group"), at random intervals
 *   - they keep drifting at ~1/3 speed while the companion is stopped
 *   - reduced motion: every cloud drifts at only 0.5–1px/s
 * Clouds are cut from slow-clouds.png (pixels untouched).
 */

type CloudAsset = { src: string };

type Props = {
  clouds: CloudAsset[];
  maxVisible?: number;
  /** Real seconds between cloud groups (random in range). */
  gapMinSec?: number;
  gapMaxSec?: number;
  zIndex?: number;
};

type Live = {
  id: number;
  idx: number;
  small: boolean;
  /** width as % of stage width */
  w: number;
  /** top as % of stage height */
  top: number;
  speed: number;
};

export function CloudDrift({
  clouds,
  maxVisible = 3,
  gapMinSec = 30,
  gapMaxSec = 85,
  zIndex = 1,
}: Props) {
  const [live, setLive] = useState<Live[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLImageElement>());
  const xs = useRef(new Map<number, number>());
  const meta = useRef(new Map<number, Live>());
  const nextId = useRef(1);
  const untilSpawn = useRef(0);
  const lastIdx = useRef(-1);
  const lastTop = useRef(-100);

  useEffect(() => {
    if (clouds.length === 0) return;

    const make = (x: number, small: boolean): Live => {
      let idx = Math.floor(Math.random() * clouds.length);
      if (clouds.length > 1 && idx === lastIdx.current) idx = (idx + 1) % clouds.length;
      lastIdx.current = idx;
      // Varied heights; never the same line as the previous cloud.
      let top = small ? rand(5, 18) : rand(12, 36);
      if (Math.abs(top - lastTop.current) < 6) top = Math.min(38, top + 9);
      lastTop.current = top;
      const [s0, s1] = small ? LAYER_SPEED.smallCloud : LAYER_SPEED.largeCloud;
      const c: Live = {
        id: nextId.current++,
        idx,
        small,
        w: small ? rand(12, 20) : rand(30, 44),
        top,
        speed: rand(s0, s1),
      };
      xs.current.set(c.id, x);
      meta.current.set(c.id, c);
      return c;
    };

    // Seed: one larger + one small cloud already in view, unevenly placed.
    const W0 = containerRef.current?.offsetWidth ?? window.innerWidth;
    setLive([make(W0 * rand(-0.08, 0.2), false), make(W0 * rand(0.55, 0.78), true)]);
    untilSpawn.current = rand(gapMinSec, gapMaxSec);

    const unsub = worldClock().subscribe((f) => {
      const W = containerRef.current?.offsetWidth ?? window.innerWidth;

      const gone: number[] = [];
      xs.current.forEach((x, id) => {
        const m = meta.current.get(id);
        if (!m) return;
        const v = f.reducedMotion
          ? (m.small ? 0.5 : 1.0)
          : m.speed * f.multiplier * f.cloudFactor;
        const nx = x - v * f.dt;
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
          meta.current.delete(id);
        });
        setLive((l) => l.filter((c) => !gone.includes(c.id)));
      }

      untilSpawn.current -= f.dt;
      if (untilSpawn.current <= 0) {
        const room = maxVisible - xs.current.size;
        if (room > 0) {
          const first = make(W + 2, Math.random() < 0.5);
          const add = [first];
          // Sometimes a loose pair: a small cloud trailing a bit behind.
          if (room > 1 && Math.random() < 0.35) add.push(make(W + 2 + rand(60, 220), true));
          setLive((l) => [...l, ...add]);
        }
        untilSpawn.current = rand(gapMinSec, gapMaxSec);
      }
    });
    return () => {
      unsub();
      xs.current.clear();
      meta.current.clear();
      els.current.clear();
    };
  }, [clouds, maxVisible, gapMinSec, gapMaxSec]);

  return (
    <div ref={containerRef} className="cloud-drift" style={{ zIndex }} aria-hidden>
      {live.map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c.id}
          ref={(el) => {
            if (el) {
              els.current.set(c.id, el);
              el.style.transform = `translate3d(${xs.current.get(c.id) ?? 99999}px,0,0)`;
            }
          }}
          src={clouds[c.idx].src}
          alt=""
          draggable={false}
          className="cloud"
          style={{ width: `${c.w.toFixed(1)}%`, top: `${c.top.toFixed(1)}%` }}
        />
      ))}
      <style jsx>{`
        .cloud-drift {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .cloud {
          position: absolute;
          left: 0;
          height: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </div>
  );
}
