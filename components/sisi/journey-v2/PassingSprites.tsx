"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_GROUND_SPEED, layerDelta, rand, worldClock } from "@/lib/worldMotion";

/**
 * PassingSprites — individual objects that pass through the world while
 * Sísí walks: far trees, grass accents, foreground trees.
 *
 * Rhythm is measured in DISTANCE (viewport widths of ground travel), so it
 * feels the same on every screen and pauses while Sísí rests:
 *   far trees    every 2–4 widths      0.12–0.18× ground   35–55% opacity
 *   grass        every ~0.5–1.4 widths 1.15–1.35×
 *   front trees  every 5–8 widths      1.55–1.9×           one at a time
 *
 * Each sprite shows only its painted area (`box`, image px): the frame is
 * cropped with overflow:hidden, so stray bits at the edges of a source PNG
 * never appear — the PNG itself is untouched. Aspect ratio is preserved;
 * `base` is where the painted bottom sits relative to the walking baseline.
 *
 * Objects spawn fully outside the right edge, are never wrapped, and are
 * recycled only after they have fully left the left edge. The same asset
 * never appears twice in a row.
 */

export type SpriteArt = { src: string; iw: number; ih: number; box: [number, number, number, number] };

type Props = {
  art: SpriteArt[];
  /** × ground speed */
  ratio: [number, number];
  /** viewport widths of ground travel between spawns */
  every: [number, number];
  /** widths before the first one (default: every) */
  first?: [number, number];
  /** also place one inside the view on mount (far layers) */
  startInView?: boolean;
  /** painted height as a fraction of the stage height */
  height: [number, number];
  /** painted bottom, in % of stage height relative to the baseline
   *  (negative = below the path, in the meadow) */
  base?: [number, number];
  /** or: how far the painted top reaches above the baseline (%), with the
   *  rest of the sprite in the meadow below (grass over the paws) */
  reach?: [number, number];
  opacity?: [number, number];
  /** at most this many on screen */
  max?: number;
  sway?: boolean;
  /** extra CSS filter (the time-of-day grade uses CSS vars) */
  filter?: string;
  zIndex?: number;
  className?: string;
};

type Live = { id: number; art: number; h: number; base: number; opacity: number; ratio: number; sway: number };

export function PassingSprites({
  art,
  ratio,
  every,
  first,
  startInView = false,
  height,
  base = [0, 0],
  reach,
  opacity = [1, 1],
  max = 99,
  sway = false,
  filter,
  zIndex = 1,
  className = "",
}: Props) {
  const [live, setLive] = useState<Live[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const xs = useRef(new Map<number, number>());
  const nextId = useRef(1);
  const untilSpawn = useRef<number | null>(null); // px of ground travel
  const lastArt = useRef(-1);
  /** per-sprite speed ratio, read by the frame loop */
  const liveRatio = useRef(new Map<number, number>());

  useEffect(() => {
    art.forEach((a) => {
      const im = new Image();
      im.src = a.src;
    });
  }, [art]);

  useEffect(() => {
    if (art.length === 0) return;
    const pick = () => {
      let i = Math.floor(Math.random() * art.length);
      if (art.length > 1 && i === lastArt.current) i = (i + 1 + Math.floor(Math.random() * (art.length - 1))) % art.length;
      lastArt.current = i;
      return i;
    };
    const spawn = (x: number) => {
      const id = nextId.current++;
      xs.current.set(id, x);
      const h = rand(height[0], height[1]);
      setLive((l) => [
        ...l,
        {
          id,
          art: pick(),
          h,
          base: reach ? rand(reach[0], reach[1]) - h * 100 : rand(base[0], base[1]),
          opacity: rand(opacity[0], opacity[1]),
          ratio: rand(ratio[0], ratio[1]),
          sway: rand(3.8, 6.4),
        },
      ]);
    };

    let placedInView = !startInView;
    return worldClock().subscribe((f) => {
      const W = rootRef.current?.offsetWidth || window.innerWidth;
      if (untilSpawn.current === null) {
        const r = first ?? every;
        untilSpawn.current = rand(r[0], r[1]) * W;
      }
      if (!placedInView) {
        placedInView = true;
        spawn(rand(0.15, 0.7) * W);
      }

      // move + retire (only once fully past the left edge)
      const gone: number[] = [];
      let onScreen = 0;
      xs.current.forEach((x, id) => {
        const el = els.current.get(id);
        const r = liveRatio.current.get(id) ?? ratio[0];
        const nx = x - layerDelta(f, BASE_GROUND_SPEED * r);
        xs.current.set(id, nx);
        if (el) {
          el.style.transform = `translate3d(${nx.toFixed(2)}px,0,0)`;
          const w = el.offsetWidth;
          if (w > 0 && nx + w < -2) gone.push(id);
          else if (nx < W) onScreen++;
        }
      });
      if (gone.length) {
        gone.forEach((id) => {
          xs.current.delete(id);
          els.current.delete(id);
          liveRatio.current.delete(id);
        });
        setLive((l) => l.filter((s) => !gone.includes(s.id)));
      }

      untilSpawn.current -= f.groundDelta;
      if (untilSpawn.current <= 0 && f.walking && onScreen < max && xs.current.size < max + 1) {
        spawn(W + 2); // fully outside the right edge
        untilSpawn.current = rand(every[0], every[1]) * W;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art]);

  live.forEach((s) => {
    if (!liveRatio.current.has(s.id)) liveRatio.current.set(s.id, s.ratio);
  });

  return (
    <div ref={rootRef} className={`passing-sprites ${className}`} style={{ zIndex }} aria-hidden>
      {live.map((s) => {
        const a = art[s.art];
        const [x0, y0, x1, y1] = a.box;
        const bw = x1 - x0;
        const bh = y1 - y0;
        return (
          <div
            key={s.id}
            ref={(el) => {
              if (el) {
                els.current.set(s.id, el);
                el.style.transform = `translate3d(${xs.current.get(s.id) ?? 99999}px,0,0)`;
              }
            }}
            className="ps-item"
            style={{
              bottom: `calc(var(--walking-baseline) + ${s.base.toFixed(2)}%)`,
              height: `${(s.h * 100).toFixed(2)}%`,
              aspectRatio: `${bw} / ${bh}`,
              opacity: s.opacity,
              filter,
            }}
          >
            <div className={sway ? "ps-sway" : undefined} style={sway ? { animationDuration: `${s.sway.toFixed(2)}s` } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.src}
                alt=""
                draggable={false}
                style={{
                  left: `${(-x0 / bw) * 100}%`,
                  top: `${(-y0 / bh) * 100}%`,
                  width: `${(a.iw / bw) * 100}%`,
                  height: `${(a.ih / bh) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      })}
      <style jsx global>{`
        .passing-sprites { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .ps-item { position: absolute; left: 0; overflow: hidden; will-change: transform; transition: filter 3s ease; }
        .ps-item > div { position: absolute; inset: 0; transform-origin: 50% 100%; }
        .ps-item img { position: absolute; max-width: none; display: block; user-select: none; -webkit-user-drag: none; }
        .ps-sway { animation: ps-sway ease-in-out infinite alternate; }
        @keyframes ps-sway { from { transform: rotate(-0.9deg); } to { transform: rotate(0.9deg); } }
        @media (prefers-reduced-motion: reduce) { .ps-sway { animation: none; } }
      `}</style>
    </div>
  );
}
