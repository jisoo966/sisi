"use client";

import { useEffect, useRef, useState } from "react";
import { bigEffectPlaying, prefersReducedMotion } from "@/lib/fx";
import { FX } from "@/lib/fxAssets";

/**
 * AmbientMagic — rare, unannounced small things on the open Journey.
 * No copy, no numbers, nothing to tap. One at a time, 20–40s apart, only
 * while nothing else is playing and the Journey is unobstructed.
 * Lives behind Sísí (the mid weather layer), so it never covers her face,
 * text or navigation. Skipped entirely with reduced motion.
 */

type Kind = "firefly" | "petal" | "grass" | "dust" | "shooting";
type Event = { id: number; kind: Kind; x: number; y: number; flip: boolean; v: number };

const LIFE: Record<Kind, number> = { firefly: 6500, petal: 7500, grass: 2800, dust: 3400, shooting: 1500 };

function pick(evening: boolean): Kind {
  const r = Math.random();
  if (r < 0.04) return "shooting"; // very rare
  if (evening) return r < 0.55 ? "firefly" : r < 0.75 ? "dust" : r < 0.9 ? "grass" : "petal";
  return r < 0.35 ? "petal" : r < 0.6 ? "grass" : r < 0.8 ? "dust" : "firefly";
}

/** somewhere away from Sísí (she walks around 30–50% of the width) */
function awayX(): number {
  return Math.random() < 0.5 ? 6 + Math.random() * 18 : 58 + Math.random() * 32;
}

export function AmbientMagic({ enabled, evening = false }: { enabled: boolean; evening?: boolean }) {
  const [ev, setEv] = useState<Event | null>(null);
  const n = useRef(0);
  const on = useRef(enabled);
  on.current = enabled;

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(fire, 20000 + Math.random() * 20000);
    };
    const fire = () => {
      if (!on.current || bigEffectPlaying() || document.hidden || document.documentElement.classList.contains("app-hidden")) {
        t = setTimeout(fire, 6000); // try again a little later
        return;
      }
      const kind = pick(evening);
      const id = ++n.current;
      const e: Event = {
        id,
        kind,
        flip: Math.random() < 0.5,
        v: Math.floor(Math.random() * 3),
        x: kind === "petal" ? 70 + Math.random() * 20 : kind === "shooting" ? 55 + Math.random() * 30 : awayX(),
        y: kind === "shooting" ? 8 + Math.random() * 12 : kind === "petal" ? 30 + Math.random() * 12 : 0,
      };
      setEv(e);
      setTimeout(() => setEv((c) => (c && c.id === id ? null : c)), LIFE[kind] + 100);
      schedule();
    };
    schedule();
    return () => clearTimeout(t);
  }, [enabled, evening]);

  if (!ev || !enabled) return null;
  const common = { key: ev.id, alt: "", draggable: false, "aria-hidden": true } as const;
  /* eslint-disable @next/next/no-img-element */
  return (
    <div className="am-root" aria-hidden>
      {ev.kind === "firefly" && (
        <img {...common} className="am am-firefly" src={FX.ambient.fireflies[ev.v]} style={{ left: `${ev.x}%` }} />
      )}
      {ev.kind === "petal" && (
        <img {...common} className="am am-petal" src={FX.ambient.petals[ev.v % 2]} style={{ left: `${ev.x}%`, top: `${ev.y}%` }} />
      )}
      {ev.kind === "grass" && <img {...common} className="am am-grass" src={FX.ambient.grassGlow} style={{ left: `${ev.x}%` }} />}
      {ev.kind === "dust" &&
        [0, 1, 2].map((i) => (
          <img
            key={`${ev.id}-${i}`}
            alt=""
            draggable={false}
            className="am am-dust"
            src={FX.ambient.dust[(ev.v + i) % 3]}
            style={{ left: `calc(${ev.x}% + ${i * 14 - 14}px)`, animationDelay: `${i * 380}ms` }}
          />
        ))}
      {ev.kind === "shooting" && (
        <img {...common} className="am am-shooting" src={FX.ambient.shootingStar} style={{ left: `${ev.x}%`, top: `${ev.y}%` }} />
      )}
      <style jsx global>{`
        .am-root { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .am { position: absolute; display: block; opacity: 0; pointer-events: none; animation-fill-mode: both; will-change: transform, opacity; }
        html.app-hidden .am { animation-play-state: paused !important; }
        /* a firefly rises from the grass, wanders, and fades */
        .am-firefly { width: 18px; bottom: calc(var(--walking-baseline) + 4%); animation: am-firefly ${LIFE.firefly}ms ease-in-out; }
        @keyframes am-firefly {
          0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
          15% { opacity: 0.9; }
          35% { transform: translate(14px, -26px) scale(1); opacity: 0.6; }
          55% { transform: translate(-6px, -44px); opacity: 0.95; }
          80% { transform: translate(10px, -62px); opacity: 0.7; }
          100% { opacity: 0; transform: translate(4px, -78px) scale(0.9); }
        }
        /* one petal drifts down across the meadow */
        .am-petal { width: 16px; animation: am-petal ${LIFE.petal}ms linear; }
        @keyframes am-petal {
          0% { opacity: 0; transform: translate(0, 0) rotate(-10deg); }
          10% { opacity: 0.9; }
          35% { transform: translate(-60px, 40px) rotate(40deg); }
          65% { transform: translate(-130px, 70px) rotate(-5deg); }
          90% { opacity: 0.85; }
          100% { opacity: 0; transform: translate(-190px, 110px) rotate(55deg); }
        }
        /* a small patch of grass glows for a moment */
        .am-grass { width: 44px; bottom: calc(var(--walking-baseline) - 1%); transform-origin: 50% 100%; animation: am-grass ${LIFE.grass}ms ease-in-out; }
        @keyframes am-grass { 0% { opacity: 0; transform: scaleY(0.7); } 35% { opacity: 0.8; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1); } }
        /* three grains of light lift from the grass */
        .am-dust { width: 5px; bottom: calc(var(--walking-baseline) + 1%); animation: am-dust 2600ms ease-out; }
        @keyframes am-dust { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-42px); } }
        /* very rarely, a shooting star low in the sky */
        .am-shooting { width: 96px; animation: am-shooting ${LIFE.shooting}ms cubic-bezier(0.3, 0, 0.5, 1); }
        @keyframes am-shooting { 0% { opacity: 0; transform: translate(40px, -18px); } 25% { opacity: 0.85; } 100% { opacity: 0; transform: translate(-110px, 46px); } }
      `}</style>
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}
