"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { effectsLayer, onFx, prefersReducedMotion, setBigActive, type AmbientKind, type FxEvent } from "@/lib/fx";
import { anchorElement, anchorPoint, clampPt, safeBounds, settledAnchor, type Bounds, type Pt } from "@/lib/fxAnchors";
import { FX, FX_BIRTH_ALL, FX_BLOOM_ALL, HEADED, aspect, preload } from "@/lib/fxAssets";
import { SisiGlint } from "@/components/sisi/magic/SisiGlint";

/**
 * EffectsHost — plays every feedback effect (lib/fx) in ONE viewport layer:
 * #sisi-effects-layer, `position: fixed; inset: 0`, directly under <body>.
 *
 * Geometry is read from real anchors (lib/fxAnchors) when an effect begins
 * — after its anchor has stopped moving — and again only on resize or
 * orientation change; never continuously while it plays. Every point is
 * clamped into the effects safe area. A missing anchor skips the effect.
 *
 * Each element on screen is one cropped sprite drawn at its own visible
 * aspect ratio; motion is transform + opacity only. Large effects (trail ·
 * birth · bloom) play one at a time; ambient only while nothing else plays.
 */

const FxDebug = process.env.NODE_ENV !== "production" ? dynamic(() => import("./FxDebug"), { ssr: false }) : null;

type BigKind = "trail" | "birth" | "bloom";
type Queued = FxEvent & { id: number };

const DURATION: Record<BigKind, number> = { trail: 1750, birth: 2400, bloom: 3200 };
const AMBIENT_LIFE: Record<AmbientKind, number> = { firefly: 6500, petal: 7500, grass: 2800, dust: 3400, shooting: 1500 };

/* ── geometry ─────────────────────────────────────────────────────── */

type TrailGeo = { start: Pt; end: Pt; ctrl: Pt; text: Pt; path: { x: number; y: number; a: number }[] };
type BirthGeo = { at: Pt; size: number; el: HTMLElement | null };
type BloomGeo = { at: Pt; halo: number; ripple: number; petals: { dx: number; dy: number; rot: number }[]; grains: { dx: number; fall: number }[]; rise: number };
type AmbientGeo = { variant: AmbientKind; start: Pt; end: Pt; rot: number };
type Geo = TrailGeo | BirthGeo | BloomGeo;

type BigLive = { id: number; kind: BigKind; geo: Geo; ev: Queued };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function bezier(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}
function tangentDeg(a: Pt, c: Pt, b: Pt, t: number): number {
  const dx = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x);
  const dy = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Starlight Trail: selected Star → Sísí (chest / front paws) → else the Starlight counter */
async function trailGeo(settle: boolean): Promise<TrailGeo | null> {
  const s0 = settle ? await settledAnchor("selectedStar") : anchorPoint("selectedStar");
  const e0 = anchorPoint("sisi") ?? anchorPoint("starlightCounter");
  if (!s0 || !e0) return null;
  const b = safeBounds();
  const start = clampPt(s0, 16, b);
  const end = clampPt(e0, 20, b);
  const ctrl = { x: (start.x + end.x) / 2 + 24, y: Math.max(b.top, Math.min(start.y, end.y) - 48) };
  const path: TrailGeo["path"] = [];
  let prev: number | null = null;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = bezier(start, ctrl, end, t);
    let a = tangentDeg(start, ctrl, end, t);
    if (prev !== null) while (a - prev > 180) a -= 360;
    if (prev !== null) while (a - prev < -180) a += 360;
    prev = a;
    path.push({ x: p.x, y: p.y, a });
  }
  return { start, end, ctrl, path, text: clampPt({ x: end.x, y: end.y - 30 }, 14, b) };
}

/** Star Birth: the exact place the new Star will remain */
async function birthGeo(ev: Extract<FxEvent, { kind: "birth" }>, settle: boolean): Promise<BirthGeo | null> {
  const p = settle ? await settledAnchor(ev.anchor, 1200) : anchorPoint(ev.anchor);
  if (!p) return null;
  const size = 120;
  return { at: clampPt(p, size / 2), size, el: ev.hideAnchor ? (anchorElement(ev.anchor)?.el ?? null) : null };
}

/** Fulfilled Bloom: everything on the selected Star's centre */
async function bloomGeo(settle: boolean): Promise<BloomGeo | null> {
  const p = settle ? await settledAnchor("selectedStar") : anchorPoint("selectedStar");
  const a = anchorElement("selectedStar");
  if (!p || !a) return null;
  const b = safeBounds();
  const at = clampPt(p, 24, b);
  const star = Math.max(a.rect.width, a.rect.height);
  const petals = [0, 1, 2, 3, 4, 5].map((i) => {
    const deg = (i / 6) * 360 - 90 + (i % 2 ? 8 : -6);
    const r = (deg * Math.PI) / 180;
    const dist = 56; // 40–72px
    // each petal's end stays inside the safe area
    const end = clampPt({ x: at.x + Math.cos(r) * dist, y: at.y + Math.sin(r) * dist }, 14, b);
    return { dx: end.x - at.x, dy: end.y - at.y, rot: deg + 90 };
  });
  const room = Math.max(0, b.bottom - (at.y + 14));
  const grains = [0, 1, 2, 3, 4].map((i) => ({ dx: (i - 2) * 20 + (i % 2 ? 5 : -4), fall: Math.min(room, 40 + ((i * 29) % 22)) }));
  return {
    at,
    halo: Math.round(star * 1.45), // 130–160% of the visible Star
    ripple: Math.min(220, b.width * 0.55),
    petals,
    grains,
    rise: Math.min(80, Math.max(0, b.bottom - at.y)),
  };
}

/** Ambient Magic: a random point inside the allowed Journey zones only */
function ambientGeo(variant?: AmbientKind): AmbientGeo | null {
  const b = safeBounds();
  const W = b.width;
  const H = b.height;
  // never inside an open paper or modal
  if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return null;
  const sisi = anchorElement("sisi");
  const face = sisi ? { x: sisi.rect.left + sisi.rect.width * 0.5, y: sisi.rect.top + sisi.rect.height * 0.3 } : null;
  const baseline = sisi ? sisi.rect.bottom - sisi.rect.height * 0.06 : null;
  const nav = document.querySelector(".ds-nav")?.getBoundingClientRect();
  const kind: AmbientKind = variant ?? pickAmbient();
  const edge = (p: Pt) => p.x >= 24 && p.x <= W - 24 && p.y >= b.insetTop + 24 && p.y <= H - b.insetBottom - 24;
  const ok = (p: Pt) =>
    edge(p) &&
    (!face || Math.hypot(p.x - face.x, p.y - face.y) >= 80) &&
    (!nav || !(p.x > nav.left - 16 && p.x < nav.right + 16 && p.y > nav.top - 16 && p.y < nav.bottom + 16)) &&
    p.y <= b.bottom;
  const sky = (): Pt => ({ x: rand(0.15, 0.85) * W, y: rand(0.12, 0.38) * H });
  const ground = (): Pt | null => (baseline === null ? null : { x: rand(0.15, 0.85) * W, y: rand(baseline - 48, baseline + 8) });

  if (kind === "shooting") {
    for (let i = 0; i < 12; i++) {
      const start = { x: rand(0.6, 0.85) * W, y: rand(0.1, 0.24) * H };
      const end = { x: rand(0.25, 0.5) * W, y: rand(0.22, 0.36) * H };
      if (ok(start) && ok(end)) {
        const rot = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI - HEADED.heading;
        return { variant: kind, start, end, rot };
      }
    }
    return null;
  }
  for (let i = 0; i < 16; i++) {
    const start = kind === "petal" ? sky() : ground();
    if (!start) return null; // ground events need Sísí's baseline
    const end =
      kind === "firefly" ? { x: start.x + 8, y: start.y - 72 } : kind === "petal" ? { x: start.x - 120, y: start.y + 80 } : kind === "dust" ? { x: start.x, y: start.y - 40 } : start;
    if (ok(start) && ok(end)) return { variant: kind, start, end, rot: 0 };
  }
  return null;
}

function pickAmbient(evening = false): AmbientKind {
  const r = Math.random();
  if (r < 0.04) return "shooting"; // very rare
  if (evening) return r < 0.55 ? "firefly" : r < 0.75 ? "dust" : r < 0.9 ? "grass" : "petal";
  return r < 0.35 ? "petal" : r < 0.6 ? "grass" : r < 0.8 ? "dust" : "firefly";
}

/* ── debug channel (development only) ─────────────────────────────── */

export type FxDebugInfo = { kind: string; start?: Pt; end?: Pt; box?: { x: number; y: number; w: number; h: number }; skipped?: string };
function debug(info: FxDebugInfo) {
  if (process.env.NODE_ENV === "production") return;
  window.dispatchEvent(new CustomEvent<FxDebugInfo>("sisi:fx-debug", { detail: info }));
}

/* ── host ─────────────────────────────────────────────────────────── */

export function EffectsHost() {
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [soft, setSoft] = useState<{ id: number; at: Pt }[]>([]);
  const [big, setBig] = useState<BigLive | null>(null);
  const [ambient, setAmbient] = useState<{ id: number; geo: AmbientGeo } | null>(null);
  const queue = useRef<Queued[]>([]);
  const busy = useRef(false);
  const ambientOn = useRef(false);
  const bigRef = useRef<BigLive | null>(null);
  bigRef.current = big;

  const pump = useCallback(async () => {
    if (busy.current) return;
    const ev = queue.current.shift();
    if (!ev) return;
    busy.current = true;
    setBigActive(true);
    const done = () => {
      busy.current = false;
      setBigActive(false);
      void pump();
    };
    if ("delay" in ev && ev.delay) await wait(ev.delay);
    if (ev.kind === "bloom") await preload(FX_BLOOM_ALL); // never half-drawn
    const geo =
      ev.kind === "trail" ? await trailGeo(true) : ev.kind === "birth" ? await birthGeo(ev, true) : ev.kind === "bloom" ? await bloomGeo(true) : null;
    const finished = () => {
      if (ev.kind === "birth") ev.onDone?.();
    };
    if (!geo) {
      debug({ kind: ev.kind, skipped: "anchor not mounted / not visible" });
      finished();
      done();
      return;
    }
    const kind = ev.kind as BigKind;
    const live: BigLive = { id: ev.id, kind, geo, ev };
    publish(live);
    let revealT: ReturnType<typeof setTimeout> | undefined;
    if (kind === "birth" && (geo as BirthGeo).el) {
      const el = (geo as BirthGeo).el!;
      el.classList.add("fx-birth-hidden");
      // the real Star takes over, in place, as the last frame fades
      revealT = setTimeout(() => el.classList.remove("fx-birth-hidden"), prefersReducedMotion() ? 300 : 2000);
    }
    setBig(live);
    await wait(DURATION[kind] + 150);
    if (revealT) {
      clearTimeout(revealT);
      (geo as BirthGeo).el?.classList.remove("fx-birth-hidden");
    }
    setBig(null);
    finished();
    done();
  }, []);

  useEffect(() => {
    setLayer(effectsLayer());
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const idle = w.requestIdleCallback ? (cb: () => void) => w.requestIdleCallback!(cb) : (cb: () => void) => setTimeout(cb, 1500);
    idle(() => void preload([...FX.glint, FX.trail.trailShort, FX.trail.motes[1], FX.trail.arrivalRipple, ...FX.ambient.dust, ...FX.bloom.grains, ...FX_BIRTH_ALL]));
    return onFx((e) => {
      if (e.kind === "soft") {
        const at = clampPt(e.at, 15);
        debug({ kind: "soft", start: at, box: { x: at.x - 15, y: at.y - 15, w: 30, h: 30 } });
        setSoft((s) => [...s.slice(-2), { id: e.id, at }]);
      } else if (e.kind === "ambient") {
        // only when nothing else is playing
        if (busy.current || ambientOn.current || prefersReducedMotion()) return debug({ kind: "ambient", skipped: "another effect is playing" });
        const geo = ambientGeo(e.variant);
        if (!geo) return debug({ kind: "ambient", skipped: "no safe spot (anchor / zone)" });
        ambientOn.current = true;
        debug({ kind: `ambient:${geo.variant}`, start: geo.start, end: geo.end });
        setAmbient({ id: e.id, geo });
        setTimeout(() => {
          ambientOn.current = false;
          setAmbient((a) => (a && a.id === e.id ? null : a));
        }, AMBIENT_LIFE[geo.variant] + 80);
      } else {
        queue.current.push(e);
        void pump();
      }
    });
  }, [pump]);

  // viewport resize / orientation change: re-read the playing effect's anchors once
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const again = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const cur = bigRef.current;
        if (!cur) return;
        const geo = cur.kind === "trail" ? await trailGeo(false) : cur.kind === "birth" ? await birthGeo(cur.ev as Extract<FxEvent, { kind: "birth" }>, false) : await bloomGeo(false);
        if (!geo || bigRef.current?.id !== cur.id) return;
        if (cur.kind === "birth") (geo as BirthGeo).el = (cur.geo as BirthGeo).el;
        const next = { ...cur, geo };
        publish(next);
        setBig(next);
      }, 150);
    };
    window.addEventListener("resize", again);
    window.addEventListener("orientationchange", again);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", again);
      window.removeEventListener("orientationchange", again);
    };
  }, []);

  if (!layer) return null;
  return createPortal(
    <>
      {soft.map((e) => (
        <SoftGlint key={e.id} at={e.at} onDone={() => setSoft((s) => s.filter((x) => x.id !== e.id))} />
      ))}
      {big?.kind === "trail" && <StarlightTrail key={big.id} id={big.id} g={big.geo as TrailGeo} amount={(big.ev as { amount: number }).amount} />}
      {big?.kind === "birth" && <StarBirth key={big.id} g={big.geo as BirthGeo} />}
      {big?.kind === "bloom" && <FulfilledBloom key={big.id} g={big.geo as BloomGeo} />}
      {ambient && <Ambient key={ambient.id} id={ambient.id} g={ambient.geo} />}
      {FxDebug && <FxDebug />}
      <style jsx global>{`
        #sisi-effects-layer .fx-s {
          position: absolute; left: 0; top: 0; display: block; pointer-events: none; user-select: none;
          opacity: 0; will-change: transform, opacity; animation-fill-mode: both;
        }
        #sisi-effects-layer .fx-box { position: absolute; display: block; pointer-events: none; }
        @keyframes am-grass { 0% { opacity: 0; transform: scaleY(0.7); } 35% { opacity: 0.8; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1); } }
        html.app-hidden #sisi-effects-layer * { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          #sisi-effects-layer .fx-s { animation: fx-fade 800ms ease both !important; }
          #sisi-effects-layer .fx-rm-hide { display: none !important; }
        }
        @keyframes fx-fade { 0%, 100% { opacity: 0; } 40% { opacity: 0.9; } }
        @keyframes fx-ripple { 0% { opacity: 0.95; transform: scale(0.4); } 100% { opacity: 0; transform: scale(1.25); } }
        /* a Star being born is drawn by its frames until the last one */
        .fx-birth-hidden { opacity: 0 !important; }
      `}</style>
    </>,
    layer,
  );
}

function publish(b: BigLive) {
  if (b.kind === "trail") {
    const g = b.geo as TrailGeo;
    const xs = g.path.map((p) => p.x);
    const ys = g.path.map((p) => p.y);
    debug({ kind: "trail", start: g.start, end: g.end, box: { x: Math.min(...xs) - 22, y: Math.min(...ys) - 22, w: Math.max(...xs) - Math.min(...xs) + 44, h: Math.max(...ys) - Math.min(...ys) + 44 } });
  } else if (b.kind === "birth") {
    const g = b.geo as BirthGeo;
    debug({ kind: "birth", start: g.at, box: { x: g.at.x - g.size / 2, y: g.at.y - g.size / 2, w: g.size, h: g.size } });
  } else {
    const g = b.geo as BloomGeo;
    const r = Math.max(g.halo / 2, g.ripple / 2, 72);
    debug({ kind: "bloom", start: g.at, box: { x: g.at.x - r, y: g.at.y - r, w: r * 2, h: r * 2 } });
  }
}

/* ── drawing ──────────────────────────────────────────────────────── */

/** one sprite, centred on a point, at its own visible aspect ratio */
function Sprite({ src, at, w, className, style }: { src: string; at: Pt; w: number; className?: string; style?: CSSProperties }) {
  const h = w / aspect(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" draggable={false} className={`fx-s ${className ?? ""}`} style={{ left: at.x - w / 2, top: at.y - h / 2, width: w, height: h, ...style }} />
  );
}

const cssVar = (name: string, val: string | number) => ({ [name]: typeof val === "number" ? `${val.toFixed(1)}px` : val }) as CSSProperties;

/* 1 · Soft Glint — 2–3 tiny printed grains in a 30px cluster, once */
function SoftGlint({ at, onDone }: { at: Pt; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 850);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dots = [
    { src: FX.ambient.dust[0], dx: 0, dy: 2, s: 10, d: 0 },
    { src: FX.bloom.grains[1], dx: 8, dy: -6, s: 7, d: 90 },
    { src: FX.ambient.dust[1], dx: -7, dy: -8, s: 6, d: 170 },
  ];
  return (
    <>
      {dots.map((p, i) => (
        <Sprite key={i} src={p.src} at={{ x: at.x + p.dx, y: at.y + p.dy }} w={p.s} className="fx-soft" style={{ animationDelay: `${p.d}ms` }} />
      ))}
      <style jsx global>{`
        .fx-soft { animation: fx-soft 600ms var(--ease-sisi); }
        @keyframes fx-soft { 0% { opacity: 0; transform: scale(0.4); } 40% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.85) translateY(-4px); } }
      `}</style>
    </>
  );
}

/* 2 · Starlight Trail — Star brightens → a 44px trail rides a quadratic
   Bézier to Sísí → a 36px ripple exactly on the end point → +N above it */
const BRIGHTEN = 320;
const TRAVEL = 900;
const TRAIL_W = 44;

function StarlightTrail({ id, g, amount }: { id: number; g: TrailGeo; amount: number }) {
  const [glint, setGlint] = useState(false);
  const reduced = prefersReducedMotion();
  const arrive = reduced ? 0 : BRIGHTEN + TRAVEL;
  useEffect(() => {
    const t = setTimeout(() => setGlint(true), arrive + 140);
    return () => clearTimeout(t);
  }, [arrive]);
  const th = TRAIL_W / aspect(FX.trail.trailShort);
  const head = HEADED.trailShortHead;
  const name = `fx-trail-${id}`;
  // the trail's head sits on the path; the sprite turns with the curve
  const keyframes = g.path
    .map((p, i) => `${((i / (g.path.length - 1)) * 100).toFixed(1)}% { transform: translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${(p.a - HEADED.heading).toFixed(1)}deg); }`)
    .join(" ");
  return (
    <>
      <Sprite src={FX.trail.motes[1]} at={g.start} w={40} className="fx-bright fx-rm-hide" />
      <span className="fx-box fx-rm-hide" style={{ left: 0, top: 0, width: 0, height: 0, animation: `${name} ${TRAVEL}ms cubic-bezier(0.45, 0, 0.3, 1) ${BRIGHTEN}ms both` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FX.trail.trailShort}
          alt=""
          draggable={false}
          className="fx-s fx-trail-img"
          style={{ left: -TRAIL_W * head.fx, top: -th * head.fy, width: TRAIL_W, height: th, transformOrigin: `${head.fx * 100}% ${head.fy * 100}%`, animationDelay: `${BRIGHTEN}ms` }}
        />
      </span>
      <Sprite src={FX.trail.arrivalRipple} at={g.end} w={36} className="fx-arrive" style={{ animationDelay: `${arrive}ms` }} />
      <span className="fx-box" style={{ left: g.text.x, top: g.text.y, transform: "translate(-50%, -50%)" }}>
        <span className="fx-s fx-amount" style={{ position: "relative", animationDelay: `${arrive + 60}ms` }}>
          +{amount}
        </span>
      </span>
      {glint && <SisiGlint at={g.end} size={48} />}
      <style>{`@keyframes ${name} { ${keyframes} }`}</style>
      <style jsx global>{`
        .fx-bright { animation: fx-bright ${BRIGHTEN + 260}ms ease-in-out; }
        @keyframes fx-bright { 0% { opacity: 0; transform: scale(0.6); } 55% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(1); } }
        .fx-trail-img { animation: fx-trail-o ${TRAVEL}ms linear both; }
        @keyframes fx-trail-o { 0% { opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { opacity: 0; } }
        .fx-arrive { animation: fx-ripple 760ms ease-out; }
        .fx-amount {
          font-family: var(--font-editorial); font-size: 15px; letter-spacing: var(--tracking-editorial); white-space: nowrap;
          color: var(--sisi-paper); text-shadow: 0 1px 6px rgba(16, 45, 50, 0.55); animation: fx-amount 1100ms ease-out;
        }
        @keyframes fx-amount { 0% { opacity: 0; transform: translateY(4px); } 25%, 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
      `}</style>
    </>
  );
}

/* 3 · Star Birth — six frames in ONE box on ONE centre; only visibility changes */
const BIRTH_AT = [0, 330, 680, 1020, 1380, 1760];
const BIRTH_END = 2300;
const FADE = 260;

function StarBirth({ g }: { g: BirthGeo }) {
  const s = g.size;
  const c = { x: s / 2, y: s / 2 }; // box-local centre
  const inward = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 + 0.5;
    return { x: Math.cos(a) * 46, y: Math.sin(a) * 46, d: 200 + i * 55, src: FX.ambient.dust[i % 2] };
  });
  const grains = [0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + 1.0;
    return { x: Math.cos(a) * 48, y: Math.sin(a) * 40 + 8, src: FX.bloom.grains[(i + 1) % 5] };
  });
  return (
    <span className="fx-box" style={{ left: g.at.x - s / 2, top: g.at.y - s / 2, width: s, height: s }}>
      {FX.birth.map((src, i) => {
        const start = Math.max(0, BIRTH_AT[i] - FADE);
        const end = i < 5 ? BIRTH_AT[i + 1] + FADE : BIRTH_END;
        const dur = end - start;
        const inPct = ((Math.min(FADE, BIRTH_AT[i] - start || FADE) / dur) * 100).toFixed(1);
        const outPct = (((dur - (i < 5 ? FADE : 420)) / dur) * 100).toFixed(1);
        const name = `fx-bf-${i}`;
        return (
          <span key={src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className={`fx-s fx-bframe${i === 4 ? "" : " fx-rm-hide"}`}
              style={{ inset: 0, width: s, height: s, animation: `${name} ${dur}ms ease-in-out ${start}ms both` }}
            />
            <style>{`@keyframes ${name} { 0% { opacity: 0; } ${inPct}% { opacity: 1; } ${outPct}% { opacity: 1; } 100% { opacity: 0; } }`}</style>
          </span>
        );
      })}
      {inward.map((p, i) => (
        <Sprite key={`i${i}`} src={p.src} at={c} w={7} className="fx-gather fx-rm-hide" style={{ animationDelay: `${p.d}ms`, ...cssVar("--fx", p.x), ...cssVar("--fy", p.y) }} />
      ))}
      <Sprite src={FX.trail.arrivalRipple} at={{ x: c.x, y: c.y + 4 }} w={104} className="fx-bripple fx-rm-hide" />
      {grains.map((p, i) => (
        <Sprite key={`g${i}`} src={p.src} at={c} w={6} className="fx-release fx-rm-hide" style={{ animationDelay: `${1450 + i * 60}ms`, ...cssVar("--fx", p.x), ...cssVar("--fy", p.y) }} />
      ))}
      <style jsx global>{`
        .fx-gather { animation: fx-gather 700ms cubic-bezier(0.45, 0, 0.3, 1); }
        @keyframes fx-gather { 0% { opacity: 0; transform: translate(var(--fx), var(--fy)); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(0, 0) scale(0.5); } }
        .fx-bripple { animation: fx-ripple 1000ms ease-out 1150ms; }
        .fx-release { animation: fx-release 900ms ease-out; }
        @keyframes fx-release { 0% { opacity: 0; transform: translate(0, 0); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translate(var(--fx), var(--fy)); } }
      `}</style>
    </span>
  );
}

/* 5 · Fulfilled Bloom — light rises · halo behind the Star · six petals
   40–72px out · one ripple ≤ min(220px, 55vw) · settling grains */
function FulfilledBloom({ g }: { g: BloomGeo }) {
  const at = g.at;
  return (
    <>
      <Sprite src={FX.trail.motes[3]} at={{ x: at.x, y: at.y + g.rise }} w={16} className="fx-rise fx-rm-hide" style={cssVar("--rise", -g.rise)} />
      <Sprite src={FX.bloom.halo} at={at} w={g.halo} className="fx-halo" />
      {g.petals.map((p, i) => (
        <Sprite
          key={i}
          src={FX.bloom.petals[i]}
          at={at}
          w={20}
          className="fx-petal fx-rm-hide"
          style={{ animationDelay: `${620 + i * 55}ms`, ...cssVar("--dx", p.dx), ...cssVar("--dy", p.dy), ...cssVar("--rot", `${p.rot.toFixed(0)}deg`) }}
        />
      ))}
      <Sprite src={FX.bloom.ripple} at={{ x: at.x, y: at.y + 6 }} w={g.ripple} className="fx-bring fx-rm-hide" />
      {g.grains.map((q, i) => (
        <Sprite key={`g${i}`} src={FX.bloom.grains[i]} at={{ x: at.x + q.dx, y: at.y + 10 }} w={7} className="fx-grain fx-rm-hide" style={{ animationDelay: `${1750 + i * 90}ms`, ...cssVar("--gy", q.fall) }} />
      ))}
      <style jsx global>{`
        .fx-rise { animation: fx-rise 650ms cubic-bezier(0.45, 0, 0.3, 1); }
        @keyframes fx-rise { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; transform: translateY(var(--rise)) scale(1.3); } }
        .fx-halo { animation: fx-halo 2700ms ease-in-out 450ms; }
        @keyframes fx-halo { 0% { opacity: 0; transform: scale(0.6); } 22% { opacity: 0.9; transform: scale(1); } 70% { opacity: 0.75; } 100% { opacity: 0; transform: scale(1.05); } }
        .fx-petal { animation: fx-petal 1700ms var(--ease-sisi); }
        @keyframes fx-petal {
          0% { opacity: 0; transform: translate(0, 0) rotate(var(--rot)) scale(0.4); }
          30% { opacity: 1; }
          75% { opacity: 0.9; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) + 10deg)) scale(0.95); }
        }
        .fx-bring { animation: fx-ripple 1300ms ease-out 1250ms; }
        .fx-grain { animation: fx-grain 1350ms ease-in; }
        @keyframes fx-grain { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translateY(var(--gy)); } }
      `}</style>
    </>
  );
}

/* 7 · Ambient Magic — one small thing, from/to points inside the safe zones */
function Ambient({ id, g }: { id: number; g: AmbientGeo }) {
  const life = AMBIENT_LIFE[g.variant];
  const dx = g.end.x - g.start.x;
  const dy = g.end.y - g.start.y;
  const v = id % 3;
  const move = (name: string, frames: string) => (
    <style>{`@keyframes ${name}-${id} { ${frames} }`}</style>
  );
  if (g.variant === "firefly")
    return (
      <>
        <Sprite src={FX.ambient.fireflies[v]} at={g.start} w={18} className="fx-am" style={{ animation: `am-firefly-${id} ${life}ms ease-in-out both` }} />
        {move("am-firefly", `0% { opacity: 0; transform: translate(0,0); } 15% { opacity: .9; } 35% { transform: translate(${dx * 0.9 + 6}px, ${dy * 0.35}px); opacity: .6; } 60% { transform: translate(${dx * 0.3 - 4}px, ${dy * 0.62}px); opacity: .95; } 85% { transform: translate(${dx}px, ${dy * 0.88}px); opacity: .7; } 100% { opacity: 0; transform: translate(${dx}px, ${dy}px); }`)}
      </>
    );
  if (g.variant === "petal")
    return (
      <>
        <Sprite src={FX.ambient.petals[v % 2]} at={g.start} w={16} className="fx-am" style={{ animation: `am-petal-${id} ${life}ms linear both` }} />
        {move("am-petal", `0% { opacity: 0; transform: translate(0,0) rotate(-10deg); } 10% { opacity: .9; } 40% { transform: translate(${dx * 0.35}px, ${dy * 0.4}px) rotate(40deg); } 70% { transform: translate(${dx * 0.7}px, ${dy * 0.65}px) rotate(-5deg); } 90% { opacity: .85; } 100% { opacity: 0; transform: translate(${dx}px, ${dy}px) rotate(50deg); }`)}
      </>
    );
  if (g.variant === "grass")
    return (
      <Sprite src={FX.ambient.grassGlow} at={{ x: g.start.x, y: g.start.y - 12 }} w={40} className="fx-am" style={{ transformOrigin: "50% 100%", animation: `am-grass ${life}ms ease-in-out both` }} />
    );
  if (g.variant === "dust")
    return (
      <>
        {[0, 1, 2].map((i) => (
          <Sprite key={i} src={FX.ambient.dust[(v + i) % 3]} at={{ x: g.start.x + i * 12 - 12, y: g.start.y }} w={5} className="fx-am" style={{ animation: `am-dust-${id} 2600ms ease-out ${i * 380}ms both` }} />
        ))}
        {move("am-dust", `0% { opacity: 0; transform: translateY(0); } 30% { opacity: .9; } 100% { opacity: 0; transform: translateY(${dy}px); }`)}
      </>
    );
  // shooting star: its head leads along start → end, gone at the end of the path
  const w = 80;
  const h = w / aspect(FX.ambient.shootingStar);
  const head = HEADED.shootingHead;
  return (
    <>
      <span className="fx-box" style={{ left: g.start.x, top: g.start.y, width: 0, height: 0, animation: `am-shoot-${id} ${life}ms cubic-bezier(0.3, 0, 0.5, 1) both` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FX.ambient.shootingStar}
          alt=""
          draggable={false}
          className="fx-s"
          style={{ left: -w * head.fx, top: -h * head.fy, width: w, height: h, opacity: 1, transformOrigin: `${head.fx * 100}% ${head.fy * 100}%`, transform: `rotate(${g.rot.toFixed(1)}deg)` }}
        />
      </span>
      {move("am-shoot", `0% { opacity: 0; transform: translate(0,0); } 20% { opacity: .85; } 85% { opacity: .85; } 100% { opacity: 0; transform: translate(${dx}px, ${dy}px); }`)}
    </>
  );
}
