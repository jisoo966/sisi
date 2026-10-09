"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_GROUND_SPEED, layerDelta, worldClock } from "@/lib/worldMotion";
import { keepLayer, layerRng, lowPower, restoreLayer, worldCoord, type Rng } from "@/lib/journeyWorld";

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
 *
 * Scheduler (lib/journeyWorld):
 *   - seeded per session and layer: varied between walks, stable within one
 *   - `layer` keeps the live objects + schedule in memory, so returning from
 *     Moments / Stars continues the same world
 *   - role "front": reports where the passing tree is (Stars waits for it
 *     to clear Sísí), and spawns nothing while held (conversation, ascent)
 *   - role "flora": no flower patch while a big tree passes; after a few
 *     patches, a stretch of open meadow
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
  /** stable name: seeds this layer and keeps it across page visits */
  layer?: string;
  role?: "far" | "flora" | "front";
  /** relative frequency per asset (default 1 each) */
  weights?: number[];
};

type Kept = {
  rng: Rng;
  live: Live[];
  xs: [number, number][];
  nextId: number;
  untilSpawn: number | null;
  lastArt: number;
  run: number;
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
  layer,
  role,
  weights,
}: Props) {
  const kept = useRef(layer ? restoreLayer<Kept>(`sprites:${layer}`) : undefined).current;
  const rng = useRef<Rng>(kept?.rng ?? layerRng(layer ?? `sprites-${Math.random()}`));
  const rand = (a: number, b: number) => rng.current.range(a, b);
  const [live, setLive] = useState<Live[]>(kept?.live ?? []);
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const xs = useRef(new Map<number, number>(kept?.xs ?? []));
  const nextId = useRef(kept?.nextId ?? 1);
  const untilSpawn = useRef<number | null>(kept?.untilSpawn ?? null); // px of ground travel
  const lastArt = useRef(kept?.lastArt ?? -1);
  const run = useRef(kept?.run ?? 0); // consecutive flora patches
  const liveRef = useRef(live);
  liveRef.current = live;
  // remember this stretch of the world for the next visit
  useEffect(
    () => () => {
      if (!layer) return;
      keepLayer<Kept>(`sprites:${layer}`, {
        rng: rng.current,
        live: liveRef.current,
        xs: Array.from(xs.current.entries()),
        nextId: nextId.current,
        untilSpawn: untilSpawn.current,
        lastArt: lastArt.current,
        run: run.current,
      });
      if (role === "front") worldCoord.frontSpan = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
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
      // weighted, never the same asset twice in a row
      const w = art.map((_, i) => (i === lastArt.current && art.length > 1 ? 0 : weights?.[i] ?? 1));
      let r = rng.current.next() * w.reduce((a, b) => a + b, 0);
      let i = 0;
      while (i < w.length - 1 && r >= w[i]) r -= w[i++];
      lastArt.current = i;
      return i;
    };
    const sparse = lowPower() && role === "flora" ? 1.6 : 1;
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

    let placedInView = !startInView || !!kept;
    return worldClock().subscribe((f) => {
      const W = rootRef.current?.offsetWidth || window.innerWidth;
      if (untilSpawn.current === null) {
        const r = first ?? every;
        untilSpawn.current = rand(r[0], r[1]) * W * sparse;
      }
      if (!placedInView) {
        placedInView = true;
        spawn(rand(0.15, 0.7) * W);
      }

      // move + retire (only once fully past the left edge)
      const gone: number[] = [];
      let onScreen = 0;
      let spanL = Infinity;
      let spanR = -Infinity;
      xs.current.forEach((x, id) => {
        const el = els.current.get(id);
        const r = liveRatio.current.get(id) ?? ratio[0];
        const nx = x - layerDelta(f, BASE_GROUND_SPEED * r);
        xs.current.set(id, nx);
        if (el) {
          el.style.transform = `translate3d(${nx.toFixed(2)}px,0,0)`;
          const w = el.offsetWidth;
          if (w > 0 && nx + w < -2) gone.push(id);
          else if (nx < W) {
            onScreen++;
            spanL = Math.min(spanL, nx);
            spanR = Math.max(spanR, nx + w);
          }
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

      if (role === "front") worldCoord.frontSpan = onScreen ? { left: spanL, right: spanR } : null;

      untilSpawn.current -= f.groundDelta;
      const held =
        (role === "front" || role === "flora") && worldCoord.holdForeground
          ? true // Sísí is talking / about to look up: nothing new passes
          : role === "flora" && !!worldCoord.frontSpan; // no flowers under a passing tree
      if (untilSpawn.current <= 0 && f.walking && !held && onScreen < max && xs.current.size < max + 1) {
        spawn(W + 2); // fully outside the right edge
        untilSpawn.current = rand(every[0], every[1]) * W * sparse;
        if (role === "flora" && ++run.current >= 3) {
          // after a few patches: a stretch of open meadow
          run.current = 0;
          untilSpawn.current = rand(1.4, 2.4) * W;
        }
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
        // (a sprite from another place's set — after switching places — may name
        // a picture this set doesn't have: wrap it, never break the page)
        const a = art.length ? art[s.art % art.length] : null;
        if (!a) return null;
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
        .ps-item { position: absolute; left: 0; overflow: hidden; will-change: transform; }
        .ps-item > div { position: absolute; inset: 0; transform-origin: 50% 100%; }
        .ps-item img { position: absolute; max-width: none; display: block; user-select: none; -webkit-user-drag: none; }
        .ps-sway { animation: ps-sway ease-in-out infinite alternate; }
        @keyframes ps-sway { from { transform: rotate(calc(-1 * var(--sway-deg, 0.9deg))); } to { transform: rotate(var(--sway-deg, 0.9deg)); } }
        @media (prefers-reduced-motion: reduce) { .ps-sway { animation: none; } }
      `}</style>
    </div>
  );
}
