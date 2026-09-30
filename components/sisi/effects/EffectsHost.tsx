"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { onFx, overlayOrigin, setBigActive, type FxEvent, type Pt } from "@/lib/fx";
import { FX, FX_BIRTH_ALL, FX_BLOOM_ALL, preload } from "@/lib/fxAssets";
import { SisiGlint } from "@/components/sisi/magic/SisiGlint";

/**
 * EffectsHost — plays the feedback effects (lib/fx) in the overlay root.
 * Mounted once in the app layout.
 *
 * Every piece is a hand-printed sprite cropped from the effects sheets;
 * motion is transform + opacity only. Large effects (trail · birth ·
 * bloom) play one at a time — a second waits its turn.
 */

type Live = FxEvent & { id: number };
type Big = Exclude<FxEvent["kind"], "soft">;

const DURATION: Record<Big, number> = { trail: 1700, birth: 2400, bloom: 3200 };

export function EffectsHost() {
  const [soft, setSoft] = useState<Live[]>([]);
  const [big, setBig] = useState<Live | null>(null);
  const [queue, setQueue] = useState<Live[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // small, decoded before they're needed
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const idle = w.requestIdleCallback ? (cb: () => void) => w.requestIdleCallback!(cb) : (cb: () => void) => setTimeout(cb, 1500);
    idle(() => void preload([...FX.trail.motes.slice(1), FX.trail.arrivalRipple, ...FX.ambient.dust, ...FX.bloom.grains, ...FX_BIRTH_ALL]));
    return onFx((e) => {
      if (e.kind === "soft") setSoft((s) => [...s.slice(-2), e]);
      else setQueue((q) => [...q, e]);
    });
  }, []);

  // one large effect at a time
  useEffect(() => {
    if (big || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setBigActive(true);
    // the Bloom waits for its art so it never plays half-drawn
    (next.kind === "bloom" ? preload(FX_BLOOM_ALL) : Promise.resolve()).then(() => {
      setBig(next);
      setTimeout(() => {
        setBig(null);
        setBigActive(false);
      }, DURATION[next.kind as Big] + 150);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big, queue.length]);

  if (!mounted) return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  const o = soft.length || big ? overlayOrigin() : { x: 0, y: 0 };
  return createPortal(
    <div className="fx-root" aria-hidden style={{ transform: o.x || o.y ? `translate(${-o.x}px, ${-o.y}px)` : undefined }}>
      {soft.map((e) => (
        <SoftGlint key={e.id} at={(e as { at: Pt }).at} onDone={() => setSoft((s) => s.filter((x) => x.id !== e.id))} />
      ))}
      {big?.kind === "trail" && <StarlightTrail key={big.id} from={big.from} to={big.to} amount={big.amount} thread={big.thread} />}
      {big?.kind === "birth" && <StarBirth key={big.id} at={big.at} />}
      {big?.kind === "bloom" && <FulfilledBloom key={big.id} at={big.at} />}
      <style jsx global>{`
        .fx-root { position: fixed; inset: 0; z-index: var(--z-toast); pointer-events: none; }
        .fx-s {
          position: absolute; left: 0; top: 0; display: block; pointer-events: none; user-select: none;
          opacity: 0; will-change: transform, opacity; animation-fill-mode: both;
        }
        html.app-hidden .fx-root * { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          .fx-root .fx-s { animation: fx-fade 800ms ease both !important; }
          .fx-root .fx-rm-hide { display: none !important; }
        }
        @keyframes fx-fade { 0%, 100% { opacity: 0; } 40% { opacity: 0.9; } }
        @keyframes fx-arrive { 0% { opacity: 0.95; transform: scale(0.35); } 100% { opacity: 0; transform: scale(1.35); } }
      `}</style>
    </div>,
    root,
  );
}

/** a sprite centred on a point */
function Sprite({ src, at, w, h, className, style }: { src: string; at: Pt; w: number; h?: number; className?: string; style?: CSSProperties }) {
  const hh = h ?? w;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className={`fx-s ${className ?? ""}`}
      style={{ left: at.x - w / 2, top: at.y - hh / 2, width: w, height: hh, objectFit: "contain", ...style }}
    />
  );
}

const cssVar = (name: string, val: string | number) => ({ [name]: typeof val === "number" ? `${val.toFixed(1)}px` : val }) as CSSProperties;

/* ── 1 · Soft Glint: 2–3 tiny printed dots, ~650ms, once ─────────────── */

function SoftGlint({ at, onDone }: { at: Pt; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 850);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dots = [
    { src: FX.ambient.dust[0], dx: 0, dy: 0, s: 11, d: 0 },
    { src: FX.bloom.grains[1], dx: 10, dy: -8, s: 8, d: 90 },
    { src: FX.ambient.dust[1], dx: -8, dy: -11, s: 7, d: 170 },
  ];
  return (
    <>
      {dots.map((p, i) => (
        <Sprite key={i} src={p.src} at={{ x: at.x + p.dx, y: at.y + p.dy }} w={p.s} className="fx-soft" style={{ animationDelay: `${p.d}ms` }} />
      ))}
      <style jsx global>{`
        .fx-soft { animation: fx-soft 600ms var(--ease-sisi); }
        @keyframes fx-soft {
          0% { opacity: 0; transform: scale(0.4); }
          40% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.85) translateY(-4px); }
        }
      `}</style>
    </>
  );
}

/* ── 2 · Starlight Trail: brighten → along the thread → curve to Sísí ─ */

function bezier(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

const TRAVEL = 900;
const BRIGHTEN = 320;

function StarlightTrail({ from, to, amount, thread }: { from: Pt | null; to: Pt; amount: number; thread?: { top: Pt; bottom: Pt } | null }) {
  const [glint, setGlint] = useState(false);
  const arrive = from ? BRIGHTEN + TRAVEL : 0;
  // a short run down the thread, then a soft curve to the arrival point
  const path = useMemo(() => {
    if (!from) return "";
    const along = thread ? { x: thread.top.x, y: Math.min(thread.bottom.y, from.y + 48) } : { x: from.x, y: from.y + 38 };
    const ctrl = { x: (along.x + to.x) / 2 + (to.x > along.x ? -30 : 30), y: Math.min(along.y, to.y) - 34 };
    const pts: Pt[] = [from, along];
    for (let i = 1; i <= 12; i++) pts.push(bezier(along, ctrl, to, i / 12));
    return pts
      .map((p, i) => `${Math.round((i / (pts.length - 1)) * 100)}% { transform: translate(${(p.x - from.x).toFixed(1)}px, ${(p.y - from.y).toFixed(1)}px); }`)
      .join(" ");
  }, [from, to, thread]);
  useEffect(() => {
    const t = setTimeout(() => setGlint(true), arrive + 140);
    return () => clearTimeout(t);
  }, [arrive]);
  return (
    <>
      {from && (
        <>
          {/* the Star brightens for a breath */}
          <Sprite src={FX.trail.motes[1]} at={from} w={44} className="fx-bright" />
          {/* the light, and two fainter echoes behind it */}
          {[0, 70, 140].map((d, i) => (
            <Sprite
              key={d}
              src={FX.trail.motes[i === 0 ? 2 : 4]}
              at={from}
              w={i === 0 ? 26 : 15 - i * 3}
              className="fx-travel fx-rm-hide"
              style={{ animationDelay: `${BRIGHTEN + d}ms`, ...cssVar("--fx-o", String(i === 0 ? 1 : 0.55 - i * 0.18)) }}
            />
          ))}
        </>
      )}
      <Sprite src={FX.trail.arrivalRipple} at={{ x: to.x, y: to.y + 6 }} w={58} h={31} className="fx-arrive" style={{ animationDelay: `${arrive}ms` }} />
      <span className="fx-s fx-amount" style={{ left: to.x + 18, top: to.y - 30, animationDelay: `${arrive + 60}ms` }}>
        +{amount}
      </span>
      {glint && <SisiGlint at={to} size={60} />}
      <style jsx global>{`
        @keyframes fx-trail { ${path} }
        .fx-bright { animation: fx-bright ${BRIGHTEN + 260}ms ease-in-out; }
        @keyframes fx-bright { 0% { opacity: 0; transform: scale(0.6); } 55% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(1); } }
        .fx-travel { animation: fx-trail ${TRAVEL}ms cubic-bezier(0.45, 0, 0.3, 1), fx-travel-o ${TRAVEL}ms linear; animation-fill-mode: both; }
        @keyframes fx-travel-o { 0% { opacity: 0; } 12% { opacity: var(--fx-o); } 88% { opacity: var(--fx-o); } 100% { opacity: 0; } }
        .fx-arrive { animation: fx-arrive 760ms ease-out; }
        .fx-amount {
          font-family: var(--font-editorial); font-size: 15px; letter-spacing: var(--tracking-editorial);
          color: var(--sisi-paper); text-shadow: 0 1px 6px rgba(16, 45, 50, 0.55); animation: fx-amount 1100ms ease-out;
        }
        @keyframes fx-amount { 0% { opacity: 0; transform: translateY(4px); } 25%, 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
      `}</style>
    </>
  );
}

/* ── 3 · Star Birth: seed → gathering → small → opening → glowing → settled ─ */

// when each frame is fully in (ms); each crossfades from the one before
const BIRTH_AT = [0, 330, 680, 1020, 1380, 1760];
const BIRTH_END = 2300;
const FADE = 260;
const BIRTH_SIZE = 150;

function StarBirth({ at }: { at: Pt }) {
  const inward = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 + 0.5;
    return { x: Math.cos(a) * 52, y: Math.sin(a) * 52, d: 200 + i * 55, src: FX.ambient.dust[i % 2] };
  });
  const grains = [0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + 1.0;
    return { x: Math.cos(a) * 62, y: Math.sin(a) * 50 + 14, src: FX.bloom.grains[(i + 1) % 5] };
  });
  return (
    <>
      {FX.birth.map((src, i) => {
        const start = Math.max(0, BIRTH_AT[i] - FADE);
        const end = i < 5 ? BIRTH_AT[i + 1] + FADE : BIRTH_END;
        const dur = end - start;
        const inPct = Math.round((Math.min(FADE, BIRTH_AT[i] - start || FADE) / dur) * 100);
        const outPct = Math.round(((dur - (i < 5 ? FADE : 420)) / dur) * 100);
        return <BirthFrame key={src} src={src} at={at} i={i} start={start} dur={dur} inPct={inPct} outPct={outPct} />;
      })}
      {inward.map((p, i) => (
        <Sprite
          key={`i${i}`}
          src={p.src}
          at={at}
          w={7}
          className="fx-gather fx-rm-hide"
          style={{ animationDelay: `${p.d}ms`, ...cssVar("--fx", p.x), ...cssVar("--fy", p.y) }}
        />
      ))}
      <Sprite src={FX.trail.arrivalRipple} at={{ x: at.x, y: at.y + 4 }} w={120} h={64} className="fx-bripple fx-rm-hide" />
      {grains.map((g, i) => (
        <Sprite
          key={`g${i}`}
          src={g.src}
          at={at}
          w={6}
          className="fx-release fx-rm-hide"
          style={{ animationDelay: `${1450 + i * 60}ms`, ...cssVar("--fx", g.x), ...cssVar("--fy", g.y) }}
        />
      ))}
      <style jsx global>{`
        .fx-gather { animation: fx-gather 700ms cubic-bezier(0.45, 0, 0.3, 1); }
        @keyframes fx-gather { 0% { opacity: 0; transform: translate(var(--fx), var(--fy)); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(0, 0) scale(0.5); } }
        .fx-bripple { animation: fx-arrive 1000ms ease-out 1150ms; }
        .fx-release { animation: fx-release 900ms ease-out; }
        @keyframes fx-release { 0% { opacity: 0; transform: translate(0, 0); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translate(var(--fx), var(--fy)); } }
      `}</style>
    </>
  );
}

function BirthFrame({ src, at, i, start, dur, inPct, outPct }: { src: string; at: Pt; i: number; start: number; dur: number; inPct: number; outPct: number }) {
  const name = `fx-bf-${i}`;
  return (
    <>
      <Sprite src={src} at={at} w={BIRTH_SIZE} className={i === 4 ? "" : "fx-rm-hide"} style={{ animation: `${name} ${dur}ms ease-in-out ${start}ms both` }} />
      <style>{`@keyframes ${name} { 0% { opacity: 0; transform: scale(0.97); } ${inPct}% { opacity: 1; transform: scale(1); } ${outPct}% { opacity: 1; } 100% { opacity: 0; transform: scale(1.01); } }`}</style>
    </>
  );
}

/* ── 5 · Fulfilled Bloom: light rises · halo · petals · one ring · grains ─ */

function FulfilledBloom({ at }: { at: Pt }) {
  // six petals opening outward, each turned to face away from the Star
  const petals = [0, 1, 2, 3, 4, 5].map((i) => {
    const deg = (i / 6) * 360 - 90 + (i % 2 ? 8 : -6);
    const r = (deg * Math.PI) / 180;
    return { src: FX.bloom.petals[i], dx: Math.cos(r) * 58, dy: Math.sin(r) * 58, rot: deg + 90, d: 620 + i * 55 };
  });
  const grains = [0, 1, 2, 3, 4].map((i) => ({ src: FX.bloom.grains[i], x: (i - 2) * 22 + (i % 2 ? 6 : -4), y: 46 + ((i * 29) % 26), d: 1750 + i * 90 }));
  return (
    <>
      {/* a light rises up to the Star */}
      <Sprite src={FX.trail.motes[4]} at={{ x: at.x, y: at.y + 90 }} w={16} className="fx-rise fx-rm-hide" />
      <Sprite src={FX.bloom.halo} at={at} w={190} h={180} className="fx-halo" />
      {petals.map((p, i) => (
        <Sprite
          key={i}
          src={p.src}
          at={at}
          w={26}
          h={32}
          className="fx-petal fx-rm-hide"
          style={{ animationDelay: `${p.d}ms`, ...cssVar("--dx", p.dx), ...cssVar("--dy", p.dy), ...cssVar("--rot", `${p.rot.toFixed(0)}deg`) }}
        />
      ))}
      <Sprite src={FX.bloom.ripple} at={{ x: at.x, y: at.y + 8 }} w={170} h={74} className="fx-bring fx-rm-hide" />
      {grains.map((g, i) => (
        <Sprite
          key={`g${i}`}
          src={g.src}
          at={{ x: at.x + g.x, y: at.y + 10 }}
          w={7}
          className="fx-grain fx-rm-hide"
          style={{ animationDelay: `${g.d}ms`, ...cssVar("--gy", g.y) }}
        />
      ))}
      <style jsx global>{`
        .fx-rise { animation: fx-rise 650ms cubic-bezier(0.45, 0, 0.3, 1); }
        @keyframes fx-rise { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; transform: translateY(-90px) scale(1.4); } }
        .fx-halo { animation: fx-halo 2700ms ease-in-out 450ms; }
        @keyframes fx-halo { 0% { opacity: 0; transform: scale(0.55); } 22% { opacity: 0.9; transform: scale(1); } 70% { opacity: 0.75; transform: scale(1.03); } 100% { opacity: 0; transform: scale(1.08); } }
        .fx-petal { animation: fx-petal 1700ms var(--ease-sisi); }
        @keyframes fx-petal {
          0% { opacity: 0; transform: translate(0, 0) rotate(var(--rot)) scale(0.4); }
          30% { opacity: 1; }
          70% { opacity: 0.9; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); }
          100% { opacity: 0; transform: translate(calc(var(--dx) * 1.15), calc(var(--dy) * 1.15 + 14px)) rotate(calc(var(--rot) + 12deg)) scale(0.95); }
        }
        .fx-bring { animation: fx-arrive 1300ms ease-out 1250ms; }
        .fx-grain { animation: fx-grain 1350ms ease-in; }
        @keyframes fx-grain { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translateY(var(--gy)); } }
      `}</style>
    </>
  );
}
