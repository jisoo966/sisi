"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { StarLayers } from "./StarLayers";

/**
 * StarWorld — the user's stars, above the clouds (inside .jw-night).
 *
 *   - Stars sit along a loose, irregular walked path going DOWN the sky:
 *     the most recent (Current Star) near the upper centre, older ones below.
 *   - Gentle vertical exploration only (drag / wheel). On release the field
 *     softly settles so the nearest star rests in the viewing area.
 *     No pinch zoom, no free-space panning.
 *   - Tapping a star: brief press-down, then onSelect(star, screen point).
 *     While a star is selected, the others and the sky dim slightly and the
 *     selected star pulses (1 → 1.12 → 1) with only its glow expanding.
 *   - The sky position is kept while a card opens/closes; it resets to the
 *     Current Star each time the Star World is entered from the meadow.
 */

type Props = {
  stars: Star[]; // newest first
  nightSkySrc: string;
  /** Layers revealed (after the ascent has cleared the clouds). */
  revealed: boolean;
  /** Accept exploration + taps (Star World settled, no transition). */
  active: boolean;
  selectedId: string | null;
  /** Freeze exploration (a memory card is open). */
  locked: boolean;
  onSelect: (star: Star, at: { x: number; y: number }) => void;
  /** A star that is going to rest: it drifts down off the path and fades. */
  leavingId?: string | null;
  /** Increment to glide back to the Current Star (Stars tab tapped again). */
  recenter?: number;
};

/** Where a focused star rests (fraction of screen height from the top). */
const FOCUS_Y = 0.22;
/** Vertical distance between consecutive stars on the path (screen heights). */
const GAP = 0.3;
const MAX_STARS = 40;

/** Deterministic 0..1 from a string (stable layout per star). */
function hash01(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

type Placed = { star: Star; x: number; y: number; scale: number };

export function StarWorld({
  stars,
  nightSkySrc,
  revealed,
  active,
  selectedId,
  locked,
  onSelect,
  leavingId = null,
  recenter = 0,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });

  // ── Layout ──────────────────────────────────────────────
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth || 390, h: el.offsetHeight || 844 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed: Placed[] = useMemo(() => {
    const list = stars.slice(0, MAX_STARS);
    const { w, h } = size;
    return list.map((star, i) => {
      // Loose walked path: a slow meander + a little per-star wander.
      const meander = 0.17 * Math.sin(i * 1.25 + 0.6);
      const wander = (hash01(star.id, 7) - 0.5) * 0.12;
      const xf = i === 0 ? 0.5 : Math.min(0.8, Math.max(0.2, 0.5 + meander + wander));
      const yj = i === 0 ? 0 : (hash01(star.id, 11) - 0.5) * 0.06;
      return {
        star,
        x: xf * w,
        y: (FOCUS_Y + i * GAP + yj) * h,
        scale: i === 0 ? 1.7 : 0.95 + hash01(star.id, 3) * 0.35,
      };
    });
  }, [stars, size]);

  /** Scroll offsets (px) that bring each star to the focus line. */
  const stops = useMemo(() => placed.map((p) => p.y - FOCUS_Y * size.h), [placed, size.h]);
  const maxScroll = stops.length ? stops[stops.length - 1] : 0;

  // Hand-drawn walked path through the stars (Catmull-Rom → cubic Bézier).
  const pathD = useMemo(() => {
    if (placed.length < 2) return "";
    const pts = placed.map((p) => [p.x, p.y]);
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }, [placed]);

  // When a star leaves the path, let the others glide into their new places
  // (position transitions are enabled only for this moment).
  const [reflowing, setReflowing] = useState(false);
  const prevCount = useRef(stars.length);
  useEffect(() => {
    if (stars.length < prevCount.current) {
      setReflowing(true);
      const t = setTimeout(() => setReflowing(false), 1000);
      prevCount.current = stars.length;
      return () => clearTimeout(t);
    }
    prevCount.current = stars.length;
  }, [stars.length]);

  // ── Scroll engine (rAF, transform only) ─────────────────
  const scroll = useRef(0);
  const target = useRef(0);
  const anim = useRef(0);
  const dragging = useRef(false);

  const write = useCallback(() => {
    const f = fieldRef.current;
    if (f) f.style.transform = `translate3d(0, ${(-scroll.current).toFixed(2)}px, 0)`;
    // The night sky drifts a touch (parallax) — within its painted height.
    const s = skyRef.current;
    if (s) s.style.transform = `translate3d(0, ${(-Math.min(scroll.current * 0.05, size.h * 0.2)).toFixed(2)}px, 0)`;
  }, [size.h]);

  const settleTo = useCallback(
    (to: number) => {
      target.current = Math.min(maxScroll, Math.max(0, to));
      cancelAnimationFrame(anim.current);
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        // Critically-damped-style approach: soft, no overshoot.
        scroll.current += (target.current - scroll.current) * (1 - Math.exp(-dt * 7));
        write();
        if (Math.abs(target.current - scroll.current) > 0.3) anim.current = requestAnimationFrame(step);
        else {
          scroll.current = target.current;
          write();
        }
      };
      anim.current = requestAnimationFrame(step);
    },
    [maxScroll, write],
  );

  const nearestStop = useCallback(
    (v: number) =>
      stops.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), stops[0] ?? 0),
    [stops],
  );

  // Entering the Star World from the meadow → present the Current Star.
  useEffect(() => {
    if (revealed) return;
    cancelAnimationFrame(anim.current);
    scroll.current = 0;
    target.current = 0;
    write();
  }, [revealed, write]);

  useEffect(() => write(), [write]);
  // Stars tab tapped again with the full sky in view: glide back to the
  // Current Star (no reload, no replayed ascent).
  useEffect(() => {
    if (recenter > 0) settleTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter]);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // Drag (window listeners so star buttons still receive their clicks).
  const moved = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (!active || locked || e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    dragging.current = true;
    moved.current = false;
    const startY = e.clientY;
    const startScroll = scroll.current;
    let lastY = startY;
    let lastT = performance.now();
    let vel = 0; // px/ms (scroll direction)

    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 6) moved.current = true;
      let next = startScroll - dy;
      // Soft resistance past the first / last star.
      if (next < 0) next *= 0.35;
      if (next > maxScroll) next = maxScroll + (next - maxScroll) * 0.35;
      scroll.current = next;
      write();
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vel = 0.8 * vel + 0.2 * (-(ev.clientY - lastY) / dt);
      lastY = ev.clientY;
      lastT = now;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragging.current = false;
      if (!moved.current) return;
      // Carry a little momentum, then settle on the nearest star.
      settleTo(nearestStop(scroll.current + vel * 220));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // Wheel / trackpad: glide, then settle after a short pause.
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>();
  const onWheel = (e: React.WheelEvent) => {
    if (!active || locked) return;
    cancelAnimationFrame(anim.current);
    scroll.current = Math.min(maxScroll + 60, Math.max(-60, scroll.current + e.deltaY * 0.6));
    write();
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => settleTo(nearestStop(scroll.current)), 160);
  };

  // A quiet hint under the Current Star until the user taps a star once.
  const [hinted, setHinted] = useState(false);
  useEffect(() => {
    if (selectedId) setHinted(true);
  }, [selectedId]);

  // Press feedback per star.
  const [pressedId, setPressedId] = useState<string | null>(null);

  const hasSelection = selectedId !== null;

  return (
    <div
      ref={rootRef}
      className={`sw-root${hasSelection ? " has-selection" : ""}${revealed ? " is-revealed" : ""}${reflowing ? " is-reflowing" : ""}${leavingId ? " is-resting" : ""}`}
      style={{ pointerEvents: active ? "auto" : "none" }}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
    >
      <div ref={skyRef} className="sw-sky">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={nightSkySrc} alt="" draggable={false} className="sw-sky-img" />
      </div>

      <div ref={fieldRef} className="sw-field">
        {pathD && (
          <svg className="sw-path" width={size.w} height={placed[placed.length - 1].y + size.h} aria-hidden>
            <path d={pathD} />
          </svg>
        )}
        {placed[0] && (
          <p
            className={`sw-hint${revealed && !hinted && !hasSelection ? " is-shown" : ""}`}
            style={{ left: placed[0].x, top: placed[0].y + 58 }}
            aria-hidden
          >
            tap your star
          </p>
        )}
        {placed.map((p, i) => {
          const isSel = p.star.id === selectedId;
          return (
            <button
              key={p.star.id}
              type="button"
              className={`sw-star${isSel ? " is-selected" : ""}${pressedId === p.star.id ? " is-pressed" : ""}${leavingId === p.star.id ? " is-leaving" : ""}`}
              style={{ left: p.x, top: p.y }}
              aria-label={p.star.wish ? `star: ${p.star.wish}` : "your star"}
              onPointerDown={() => {
                if (!active || locked) return;
                setPressedId(p.star.id);
                setTimeout(() => setPressedId((v) => (v === p.star.id ? null : v)), 90);
              }}
              onClick={() => {
                if (!active || locked || moved.current) return;
                onSelect(p.star, { x: p.x, y: p.y - scroll.current });
              }}
            >
              <span
                className={`sw-star-reveal${i === 0 ? " is-current" : ""}`}
                style={{ transitionDelay: revealed && i > 0 ? `${1100 + i * 90}ms` : "0ms" }}
              >
              <span className="sw-star-scale" style={{ transform: `scale(${p.scale})` }}>
                <span className="sw-star-pulse">
                  <StarLayers
                    staged={i === 0}
                    revealed={revealed}
                    focused={isSel}
                    alt={i === 0 ? "Current Star" : ""}
                  />
                </span>
              </span>
              </span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .sw-root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          touch-action: none;
        }
        .sw-sky {
          position: absolute;
          inset: 0;
          /* Deep night that continues below the painted sky. */
          background: linear-gradient(to bottom, #03070a 0%, #050c16 55%, #0b1b38 100%);
          transition: opacity 450ms ease;
        }
        .sw-sky-img {
          position: absolute;
          top: 0;
          left: 50%;
          height: 96%;
          width: auto;
          min-width: 100%;
          max-width: none;
          transform: translateX(-50%);
          display: block;
          user-select: none;
          -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
        }
        .sw-field {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          will-change: transform;
        }
        .sw-path {
          position: absolute;
          left: 0;
          top: 0;
          overflow: visible;
          pointer-events: none;
          opacity: 0;
          transition: opacity 900ms ease;
        }
        .sw-path path {
          fill: none;
          stroke: rgba(246, 236, 214, 0.9);
          stroke-width: 1;
          stroke-dasharray: 1.5 7;
          stroke-linecap: round;
        }
        .sw-root.is-revealed .sw-path {
          opacity: 0.22;
          transition-delay: 1400ms;
        }
        .sw-hint {
          position: absolute;
          transform: translateX(-50%);
          margin: 0;
          white-space: nowrap;
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-style: italic;
          font-size: 14px;
          letter-spacing: 0.04em;
          color: rgba(246, 236, 214, 0.75);
          opacity: 0;
          transition: opacity 600ms ease;
          pointer-events: none;
        }
        .sw-hint.is-shown {
          opacity: 1;
          transition-delay: 1800ms;
          animation: swHintBreathe 3.2s ease-in-out 2.4s infinite;
        }
        @keyframes swHintBreathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .sw-star {
          position: absolute;
          width: 48px;
          height: 48px;
          margin: -24px 0 0 -24px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          pointer-events: auto;
          opacity: 1;
          transform: scale(1);
          transition:
            opacity 450ms ease,
            transform 90ms ease-out;
        }
        /* Older stars fade in one by one after the Current Star's reveal
           (the Current Star has its own staged aura → glow → mark). */
        .sw-star-reveal {
          display: block;
          opacity: 0;
          transition: opacity 700ms ease;
        }
        .sw-star-reveal.is-current,
        .sw-root.is-revealed .sw-star-reveal {
          opacity: 1;
        }
        .sw-star.is-pressed {
          transform: scale(0.9);
        }
        .sw-star-scale,
        .sw-star-pulse {
          display: block;
          width: 48px;
          height: 48px;
          transform-origin: center;
        }
        .sw-star.is-selected .sw-star-pulse {
          animation: swPulse 700ms cubic-bezier(0.33, 1, 0.68, 1) 90ms both;
        }
        @keyframes swPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        /* A star is open: the others and the sky dim slightly. */
        .sw-root.has-selection .sw-sky { opacity: 0.72; }
        .sw-root.has-selection .sw-path { opacity: 0.08; transition-delay: 0ms; }
        .sw-root.has-selection .sw-star:not(.is-selected) {
          opacity: 0.4;
        }
        /* "Let this star rest": it drifts gently down the path and fades,
           leaving a short fall of light. */
        .sw-star.is-leaving { pointer-events: none; }
        .sw-star.is-leaving .sw-star-reveal {
          animation: swRest 1.6s cubic-bezier(0.45, 0, 0.55, 1) forwards;
        }
        .sw-star.is-leaving::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: 34vh;
          margin-left: -1px;
          background: linear-gradient(to bottom, rgba(246, 226, 170, 0.55), rgba(246, 226, 170, 0));
          transform-origin: top center;
          animation: swRestTrail 1.6s ease-out forwards;
          pointer-events: none;
        }
        @keyframes swRest {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          55%  { transform: translateY(20vh) scale(0.7); opacity: 0.85; }
          100% { transform: translateY(38vh) scale(0.45); opacity: 0; }
        }
        @keyframes swRestTrail {
          0%   { transform: scaleY(0); opacity: 0; }
          40%  { transform: scaleY(0.6); opacity: 0.7; }
          100% { transform: scaleY(1) translateY(10vh); opacity: 0; }
        }
        .sw-root.is-resting .sw-path { opacity: 0.06; transition-delay: 0ms; }
        /* Others glide into their new places once it has gone. */
        .sw-root.is-reflowing .sw-star {
          transition:
            left 900ms cubic-bezier(0.22, 1, 0.36, 1),
            top 900ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 450ms ease,
            transform 90ms ease-out;
        }
        .sw-root.is-reflowing .sw-path { opacity: 0.06; transition-delay: 0ms; }

        @media (prefers-reduced-motion: reduce) {
          .sw-star.is-selected .sw-star-pulse { animation: none; }
          .sw-star.is-leaving .sw-star-reveal { animation: none; opacity: 0; transition: opacity 250ms; }
          .sw-star.is-leaving::after { display: none; }
        }
      `}</style>
    </div>
  );
}
