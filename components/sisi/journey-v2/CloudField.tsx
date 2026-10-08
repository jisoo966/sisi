"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_GROUND_SPEED, worldClock } from "@/lib/worldMotion";
import { keepLayer, layerRng, lowPower, restoreLayer, type Rng, envCoord } from "@/lib/journeyWorld";

/**
 * CloudField — the Journey's clouds, from the time-of-day cloud pool.
 *
 *   far     cloud-01..03   0.05–0.09× ground   45–70% opacity   small, high
 *   mid     cloud-04..06   0.10–0.16×         60–85%
 *   accent  cloud-07..09   0.18–0.25×         rare
 *
 *   - 1–3 clouds on screen (2 on low-power devices), long open blue between
 *   - never evenly spaced, never the same cloud twice in a row, never a new
 *     cloud stacked on the previous one
 *   - each cloud's asset, height, size and speed are fixed when it spawns
 *     (seeded per session) — nothing moves or reshuffles on re-render
 *   - spawn beyond the right edge, recycle only once fully past the left
 *   - they keep drifting slowly while Sísí rests; evenings dim them a little
 *     (--tod-cb), never tinting them orange
 */

type Kind = "far" | "mid" | "accent";
type Art = { id: string; kind: Kind; iw: number; ih: number; box: [number, number, number, number] };
const T = (f: string) => `/V2/time-of-day/${f}.webp`;
const POOL: Art[] = [
  { id: "cloud-01-far-wisp", kind: "far", iw: 459, ih: 307, box: [65, 129, 381, 202] },
  { id: "cloud-02-far-fragments", kind: "far", iw: 503, ih: 320, box: [82, 108, 416, 236] },
  { id: "cloud-03-far-flat", kind: "far", iw: 484, ih: 310, box: [106, 114, 433, 207] },
  { id: "cloud-04-mid-rounded", kind: "mid", iw: 512, ih: 340, box: [72, 65, 479, 272] },
  // (a stray fragment at the canvas edge is cropped away by the box)
  { id: "cloud-05-mid-long", kind: "mid", iw: 512, ih: 341, box: [49, 121, 506, 226] },
  { id: "cloud-06-mid-broken", kind: "mid", iw: 495, ih: 339, box: [74, 93, 449, 242] },
  { id: "cloud-07-accent-broad", kind: "accent", iw: 512, ih: 341, box: [50, 34, 504, 255] },
  { id: "cloud-08-accent-tall", kind: "accent", iw: 512, ih: 341, box: [123, 0, 415, 284] },
  { id: "cloud-09-accent-trailing", kind: "accent", iw: 498, ih: 326, box: [31, 78, 498, 225] },
];
const KIND: Record<Kind, { weight: number; ratio: [number, number]; opacity: [number, number]; width: [number, number]; top: [number, number] }> = {
  // width: painted width as a fraction of the stage width; top: % of stage height
  far: { weight: 0.45, ratio: [0.05, 0.09], opacity: [0.45, 0.7], width: [0.22, 0.34], top: [5, 22] },
  mid: { weight: 0.42, ratio: [0.1, 0.16], opacity: [0.6, 0.85], width: [0.34, 0.5], top: [12, 32] },
  accent: { weight: 0.13, ratio: [0.18, 0.25], opacity: [0.8, 0.95], width: [0.42, 0.6], top: [18, 36] },
};

type Cloud = { id: number; art: number; x: number; w: number; top: number; opacity: number; ratio: number };
type State = { rng: Rng; live: Cloud[]; nextId: number; gap: number; lastArt: number; lastTop: number; seeded: boolean };

export function CloudField({ zIndex = 1 }: { zIndex?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const st = useRef<State>(
    restoreLayer<State>("clouds") ?? {
      rng: layerRng("clouds"),
      live: [],
      nextId: 1,
      gap: 0,
      lastArt: -1,
      lastTop: -100,
      seeded: false,
    },
  );
  const [, setVersion] = useState(0);
  const rerender = () => setVersion((v) => v + 1);

  useEffect(() => {
    POOL.forEach((a) => {
      const im = new Image();
      im.src = T(a.id);
    });
  }, []);

  useEffect(() => {
    const s = st.current;
    const maxFor = () => Math.max(1, Math.round((lowPower() ? 2 : 3) * envCoord.cloudDensity));
    const spawn = (W: number, H: number, x?: number) => {
      // weighted kind, then an asset of that kind — never the same one twice
      const r = s.rng.next();
      const kind: Kind = r < KIND.far.weight ? "far" : r < KIND.far.weight + KIND.mid.weight ? "mid" : "accent";
      const options = POOL.map((a, i) => ({ a, i })).filter((o) => o.a.kind === kind && o.i !== s.lastArt);
      const pick = options[Math.floor(s.rng.next() * options.length)];
      const k = KIND[kind];
      // not directly over the previous cloud
      let top = s.rng.range(k.top[0], k.top[1]);
      if (Math.abs(top - s.lastTop) < 7) top = top + (top > s.lastTop ? 7 : -7);
      top = Math.max(4, Math.min(40, top));
      const [bx0, by0, bx1, by1] = pick.a.box;
      let w = W * s.rng.range(k.width[0], k.width[1]) * s.rng.range(0.9, 1.1);
      // tall clouds must not grow into a tower: cap the painted height
      w = Math.min(w, (H * 0.15 * (bx1 - bx0)) / (by1 - by0));
      // the first sky of a walk: every cloud fully inside the view
      if (x !== undefined) x = Math.max(10, Math.min(W - w - 10, x));
      s.live.push({
        id: s.nextId++,
        art: pick.i,
        x: x ?? W + 8,
        w,
        top,
        opacity: s.rng.range(k.opacity[0], k.opacity[1]),
        ratio: s.rng.range(k.ratio[0], k.ratio[1]),
      });
      s.lastArt = pick.i;
      s.lastTop = top;
      // uneven gaps (in px of the next cloud's travel), some quite long
      s.gap = (W * s.rng.range(0.35, 1.25)) / Math.max(0.6, envCoord.cloudDensity);
    };

    return worldClock().subscribe((f) => {
      const root = rootRef.current;
      if (!root) return;
      const W = root.offsetWidth || window.innerWidth;
      const H = root.offsetHeight || window.innerHeight;
      if (!s.seeded) {
        s.seeded = true;
        // a first sky: one or two clouds already in view, never centred
        spawn(W, H, W * s.rng.range(0.02, 0.28));
        if (s.rng.next() < 0.55) spawn(W, H, W * s.rng.range(0.62, 0.9));
        s.gap = W * s.rng.range(0.2, 0.7);
        rerender();
      }
      // clouds drift even while Sísí rests (cloudFactor), slower with reduced motion
      const drift = BASE_GROUND_SPEED * f.multiplier * f.cloudFactor * (f.reducedMotion ? 0.3 : envCoord.wind) * f.dt;
      let changed = false;
      for (const c of s.live) {
        c.x -= drift * c.ratio; // a fraction of the ground speed
        const el = els.current.get(c.id);
        if (el) el.style.transform = `translate3d(${c.x.toFixed(2)}px,0,0)`;
      }
      const before = s.live.length;
      s.live = s.live.filter((c) => c.x + c.w > -4);
      if (s.live.length !== before) changed = true;
      // next cloud once the last one has moved far enough in
      const last = s.live[s.live.length - 1];
      const room = last ? W - (last.x + last.w) : Infinity;
      if (s.live.length < maxFor() && room >= s.gap) {
        spawn(W, H);
        changed = true;
      }
      if (changed) rerender();
    });
  }, []);

  // keep the sky as it was when the user comes back
  useEffect(() => () => keepLayer("clouds", st.current), []);

  return (
    <div ref={rootRef} className="cloud-field" style={{ zIndex }} aria-hidden>
      {st.current.live.map((c) => {
        const a = POOL[c.art];
        const [x0, y0, x1, y1] = a.box;
        const bw = x1 - x0;
        const bh = y1 - y0;
        return (
          <div
            key={c.id}
            ref={(el) => {
              if (el) {
                els.current.set(c.id, el);
                el.style.transform = `translate3d(${c.x.toFixed(2)}px,0,0)`;
              } else els.current.delete(c.id);
            }}
            className="cf-cloud"
            style={{ top: `${c.top}%`, width: c.w, aspectRatio: `${bw} / ${bh}`, opacity: c.opacity }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={T(a.id)}
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
        );
      })}
      <style jsx global>{`
        .cloud-field { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .cf-cloud {
          position: absolute; left: 0; overflow: hidden; will-change: transform;
          filter: brightness(var(--tod-cb, 1));
        }
        .cf-cloud img { position: absolute; max-width: none; display: block; user-select: none; }
      `}</style>
    </div>
  );
}
