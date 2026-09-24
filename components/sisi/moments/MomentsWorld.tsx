"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrailEntry, TimelineMotion, Placed } from "@/lib/momentsTimeline";
import { buildTrail, layoutTimeline, TRAIL_ART, trailYAt } from "@/lib/momentsTimeline";
import { whenLabel } from "@/lib/moments";
import { ArtFill, ART, Postcard } from "./shared";
import { TrailFox, type TrailFoxHandle } from "./TrailFox";
import { JOURNEY_FOX_X } from "@/lib/worldHandoff";

/**
 * MomentsWorld — the horizontal Memory Trail.
 *
 * Every visual layer is data (MOMENTS_SCENE below): swap the artwork paths
 * and ratios without touching the gestures or the timeline.
 *
 *   gestures  drag right pulls the past closer, drag left returns toward
 *             Today. Direction locks after ~11px; a horizontal drag stays
 *             horizontal until release. Touches starting in the left 28px are
 *             never captured (the iOS / Safari back gesture keeps working).
 *             Cards, buttons and inputs never start a drag. Mouse wheel /
 *             trackpad over the trail moves the timeline on desktop.
 *   handoff  Journey ⇄ Moments is one continuous world: arriving, the camera
 *             eases from the Journey framing (Sísí at 37%) to the Moments
 *             framing while the memories appear; leaving plays it in reverse
 *             and hands the exact meadow frame back (lib/worldHandoff).
 *   motion    follows the finger 1:1, then gentle momentum and a softly
 *             damped spring onto the nearest Moment (lib/momentsTimeline).
 *   Sísí      walks with the world's velocity; idles only when it is still.
 */

/* ── Scene (replaceable art) ──────────────────────────────────────── */

type Band = {
  kind: "band";
  key: string;
  src: string;
  /** world px moved per px of timeline travel */
  ratio: number;
  heightPct: number;
  bottom: string;
  opacity?: number;
  filter?: string;
  /** px each copy overlaps the next — must match the Journey's layer so
   *  the meadow lines up exactly when the two pages hand over */
  seam: number;
};
type Scatter = {
  kind: "scatter";
  key: string;
  ratio: number;
  /** repeat period as a multiple of the stage width */
  period: number;
  items: { src: string; x: number; top: string; w: number }[];
};
type Fixed = { kind: "fixed"; key: string; src: string; className: string };

export const MOMENTS_SCENE: (Band | Scatter | Fixed)[] = [
  { kind: "fixed", key: "sky", src: "/V2/parallax/journey-sky-fixed.png", className: "journey-sky-fixed" },
  {
    kind: "scatter",
    key: "clouds",
    ratio: 0.06,
    period: 2.4,
    items: [
      { src: "/V2/parallax/clouds/cloud-2.png", x: 0.08, top: "17%", w: 0.38 },
      { src: "/V2/parallax/clouds/cloud-5.png", x: 0.95, top: "27%", w: 0.2 },
      { src: "/V2/parallax/clouds/cloud-4.png", x: 1.55, top: "13%", w: 0.3 },
    ],
  },
  {
    kind: "band",
    key: "midground",
    src: "/V2/parallax/journey-midground-vegetation.png",
    ratio: 13.5 / 32,
    heightPct: 0.18,
    bottom: "calc(var(--walking-baseline) - 1.5%)",
    opacity: 0.8,
    filter: "saturate(0.75) brightness(1.15) contrast(0.85)",
    seam: 1,
  },
  {
    kind: "band",
    key: "ground",
    src: "/V2/parallax/journey-walking-ground.png",
    ratio: 1,
    heightPct: 1,
    bottom: "calc(var(--walking-baseline) - 1% - 26.95%)",
    seam: 2,
  },
];

/** The trail overlay: faint, behind Sísí and the cards, no glow or outline. */
const TRAIL_OPACITY = 0.55;
/** Trail band centre sits this many px below the paw line. */
const TRAIL_DROP = 2;

/** Memory lights: rendered size of the painted core, and its anchor (image px). */
const LIGHTS = {
  idle: { src: "/V2/moments/trail-v2/memory-light-idle.png", iw: 408, ih: 361, cx: 276.1, cy: 128.3, scale: 12 / 156 },
  linked: { src: "/V2/moments/trail-v2/memory-light-linked.png", iw: 490, ih: 568, cx: 256.4, cy: 429.8, scale: 0.13 },
  selected: { src: "/V2/moments/trail-v2/memory-light-selected.png", iw: 703, ih: 519, cx: 334.0, cy: 313.0, scale: 30 / 291 },
} as const;

type LightKey = keyof typeof LIGHTS;
function lightStyle(k: LightKey, x: number, y: number): React.CSSProperties {
  const L = LIGHTS[k];
  return { left: x - L.cx * L.scale, top: y - L.cy * L.scale, width: L.iw * L.scale, height: L.ih * L.scale };
}

const LEARNED_KEY = "sisi:moments-swipe-learned";
const EDGE_IGNORE = 28;
const LOCK_PX = 11;
const NO_DRAG = "button, a, input, textarea, select, label, [data-mkey], [role='button'], [contenteditable='true']";

type Apply = (cam: number) => void;
export type MomentsWorldHandle = {
  /** Moments → Journey: settle the memories away, turn Sísí toward the
   *  Journey, reframe the camera. Resolves with the meadow's ground offset. */
  leave: (onTurned?: () => void) => Promise<number>;
};
type Phase = "arriving" | "ready" | "leaving";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const MomentsWorld = forwardRef<
  MomentsWorldHandle,
  {
    entries: TrailEntry[];
    motion: TimelineMotion;
    /** false while the list or a detail sheet is open */
    active: boolean;
    onOpen: (entry: TrailEntry, el: Element) => void;
    /** set when Journey handed over (Sísí has already turned left) */
    arrival: { ground: number } | null;
    /** the Moments have loaded (until then only the world is shown) */
    loaded: boolean;
  }
>(function MomentsWorld({ entries, motion, active, onOpen, arrival, loaded }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const foxRef = useRef<TrailFoxHandle>(null);
  const foxRootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const appliers = useRef(new Set<Apply>());
  const [size, setSize] = useState({ W: 0, H: 0, base: 0.26 });
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  const [showToday, setShowToday] = useState(false);
  const todayRef = useRef(false);
  const returningRef = useRef(false);
  const [hint, setHint] = useState(false);
  const [phase, setPhase] = useState<Phase>(arrival ? "arriving" : "ready");
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const [veiled, setVeiled] = useState(true);
  const [revealing, setRevealing] = useState(false);

  // Camera reframe between the Journey framing (p = 0) and Moments (p = Δ).
  const pan = useRef<number | null>(arrival ? 0 : null); // null → Δ once measured
  const panAnim = useRef<{ from: number; to: number; t0: number; dur: number; done?: () => void } | null>(null);
  // Background offset so the meadow sits exactly where the Journey left it.
  // (At p = 0 the view is −Δ, so the handed-over ground maps to −ground + Δ.)
  const base = useRef<number | null>(arrival ? null : 0);

  /* size */
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const v = parseFloat(getComputedStyle(el).getPropertyValue("--walking-baseline")) || 26;
      setSize({ W: el.offsetWidth, H: el.offsetHeight, base: v / 100 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try {
      setHint(localStorage.getItem(LEARNED_KEY) !== "1");
    } catch {
      setHint(false);
    }
    motion.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, [motion]);

  const { W, H, base: baseFrac } = size;
  const baselineY = H * (1 - baseFrac);
  const layout = useMemo(() => (W ? layoutTimeline(entries, W) : null), [entries, W]);
  const delta = layout ? layout.foxX - W * JOURNEY_FOX_X : 0;
  const trail = useMemo(() => {
    if (!layout) return [];
    const oldest = layout.placed.length ? layout.placed[layout.placed.length - 1].x : 0;
    return buildTrail(W, baselineY + TRAIL_DROP, W * 1.9, Math.min(-W, oldest - W * 1.6));
  }, [layout, W, baselineY]);

  const ty = useCallback((x: number) => trailYAt(trail, x, baselineY + TRAIL_DROP), [trail, baselineY]);

  useEffect(() => {
    if (layout) motion.setSnaps(layout.snaps);
  }, [layout, motion]);

  /* focus → selected light */
  useEffect(() => {
    motion.onSettle = (i) => {
      if (i === 0) returningRef.current = false;
      focusRef.current = i;
      setFocus(i);
    };
    return () => {
      motion.onSettle = null;
    };
  }, [motion]);

  const focused: Placed | undefined = focus >= 0 ? layout?.placed[focus] : undefined;

  /** The background offset for the current camera (used by layers). */
  const layerCam = useRef(0);
  // First frame before paint: camera, base offset and layers in place.
  useLayoutEffect(() => {
    if (!layout) return;
    if (pan.current === null) pan.current = delta;
    if (base.current === null) base.current = -(arrival?.ground ?? 0) + delta;
    const off = pan.current - delta;
    layerCam.current = motion.cam + off + base.current;
    appliers.current.forEach((fn) => fn(layerCam.current));
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${(motion.cam + off).toFixed(2)}px,0,0)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, delta]);

  /* one frame loop: timeline + camera → world, layers, cards, Sísí */
  useEffect(() => {
    if (!layout) return;
    let raf = 0;
    let last = performance.now();
    let lastKey = "";
    let lastMove = 0;
    const { focusX } = layout;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      motion.step(dt, now);
      if (motion.mode === "drag" && now - lastMove > 60) motion.vel = 0; // finger held still

      // camera reframe
      if (pan.current === null) pan.current = delta;
      if (base.current === null) base.current = -(arrival?.ground ?? 0) + delta;
      const a = panAnim.current;
      if (a) {
        if (a.t0 < 0) a.t0 = now;
        const t = Math.min(1, (now - a.t0) / a.dur);
        pan.current = a.from + (a.to - a.from) * (0.5 - 0.5 * Math.cos(Math.PI * t));
        if (t >= 1) {
          panAnim.current = null;
          a.done?.();
        }
      }
      const off = pan.current - delta; // 0 in the Moments framing
      const cam = motion.cam;
      const key = `${cam}|${off}`;

      // background layers: cheap, and always current (tiles may measure late)
      layerCam.current = motion.cam + off + (base.current ?? 0);
      appliers.current.forEach((fn) => fn(layerCam.current));

      if (key !== lastKey) {
        if (cam !== Number(lastKey.split("|")[0])) lastMove = now;
        lastKey = key;
        const view = cam + off;
        const w = worldRef.current;
        if (w) w.style.transform = `translate3d(${view.toFixed(2)}px,0,0)`;
        const fr = foxRootRef.current;
        if (fr) fr.style.transform = off ? `translate3d(${off.toFixed(2)}px,0,0)` : "";
        // Only whole cards are readable: fade anything leaving the frame or
        // passing behind Sísí, so nothing rests awkwardly cropped.
        for (const p of layout.placed) {
          const el = itemRefs.current.get(p.key);
          if (!el) continue;
          const sx = p.x + cam;
          const left = sx - p.cardW / 2;
          const right = sx + p.cardW / 2;
          const edge = clamp01((left + 30) / 40) * clamp01((W + 30 - right) / 40);
          const behind = 1 - smooth((sx - (focusX + W * 0.14)) / (W * 0.12));
          const o = edge * behind;
          el.style.opacity = o.toFixed(3);
          el.style.visibility = o < 0.01 ? "hidden" : "visible";
        }
      }

      if (motion.mode !== "rest" && focusRef.current !== -1) {
        focusRef.current = -1;
        setFocus(-1);
      }
      const t = phaseRef.current === "ready" && (cam > W * 0.4 || returningRef.current);
      if (t !== todayRef.current) {
        todayRef.current = t;
        setShowToday(t);
      }
      foxRef.current?.update(motion.vel, dt, motion.reduced);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, motion, W, delta]);

  /* Direct visit: show everything as soon as the Moments have loaded. */
  useEffect(() => {
    if (arrival || !loaded || !layout) return;
    setVeiled(false);
  }, [arrival, loaded, layout]);

  /* Journey → Moments: reframe, then the trail and the newest memories appear */
  useEffect(() => {
    if (!arrival || !layout || !loaded) return;
    const quick = motion.reduced;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        panAnim.current = { from: pan.current ?? 0, to: delta, t0: -1, dur: quick ? 1 : 720 };
      }, 60),
    );
    timers.push(
      setTimeout(() => {
        setRevealing(true);
        setVeiled(false);
      }, quick ? 80 : 420),
    );
    timers.push(
      setTimeout(() => {
        setRevealing(false);
        setPhase("ready");
      }, quick ? 300 : 1500),
    );
    return () => timers.forEach(clearTimeout);
    // run once per arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival, !!layout, loaded]);

  /* Moments → Journey */
  useImperativeHandle(
    ref,
    () => ({
      async leave(onTurned) {
        setPhase("leaving");
        setShowToday(false);
        motion.brake(260);
        const t0 = performance.now();
        // memories settle away while the timeline slows and Sísí finishes her step
        while (performance.now() - t0 < 1000) {
          const idle = foxRef.current?.isIdle() ?? true;
          if (idle && motion.mode === "rest" && performance.now() - t0 > 320) break;
          await wait(30);
        }
        foxRef.current?.face("right");
        onTurned?.();
        await wait(150); // let the turn read
        await new Promise<void>((done) => {
          panAnim.current = { from: pan.current ?? delta, to: 0, t0: -1, dur: motion.reduced ? 1 : 420, done };
        });
        return -(motion.cam - delta + (base.current ?? 0));
      },
    }),
    [motion, delta],
  );

  /* gestures */
  const g = useRef<{ id: number; x0: number; y0: number; xl: number; lock: "h" | "v" | null } | null>(null);
  const learn = () => {
    setHint(false);
    try {
      localStorage.setItem(LEARNED_KEY, "1");
    } catch {
      // ignore
    }
  };
  const canDrag = active && phase === "ready";

  const onPointerDown = (e: React.PointerEvent) => {
    // Never capture near the left edge — the system back gesture lives there.
    if (!canDrag || e.button !== 0 || e.clientX < EDGE_IGNORE) return;
    if ((e.target as Element).closest?.(NO_DRAG)) return;
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, xl: 0, lock: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.lock) {
      if (Math.hypot(dx, dy) < LOCK_PX) return;
      s.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (s.lock === "h") {
        s.xl = e.clientX;
        rootRef.current?.setPointerCapture(e.pointerId);
        motion.dragStart(e.timeStamp);
      }
    }
    if (s.lock === "h") {
      returningRef.current = false;
      motion.dragBy(e.clientX - s.xl, e.timeStamp);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    g.current = null;
    if (s.lock === "h") {
      motion.dragEnd(e.timeStamp);
      if (Math.abs(e.clientX - s.x0) > 40) learn();
    }
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    const s = g.current;
    g.current = null;
    if (s?.lock === "h") motion.dragEnd(e.timeStamp);
  };

  const openCard = (p: Placed, el: Element) => {
    if (!canDrag) return;
    if (parseFloat((el.closest(".mw-item") as HTMLElement | null)?.style.opacity || "1") < 0.5) return;
    if (Math.abs(motion.cam - p.D) > 1) motion.goToIndex(p.index, 650);
    onOpen(p.item, el);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!canDrag) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.offsetWidth : 1;
      const d = (-e.deltaX + e.deltaY) * unit;
      if (Math.abs(d) < 0.5) return;
      e.preventDefault();
      returningRef.current = false;
      motion.wheel(d, performance.now());
      if (Math.abs(motion.cam) > 60) learn();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canDrag, motion]);

  const goToday = () => {
    returningRef.current = true;
    motion.goTo(0);
  };

  const register = useCallback((fn: Apply) => {
    appliers.current.add(fn);
    fn(layerCam.current);
    return () => {
      appliers.current.delete(fn);
    };
  }, []);

  const rootClass = `mw-root${veiled ? " mw-veiled" : ""}${revealing ? " mw-revealing" : ""}${phase === "leaving" ? " mw-leaving" : ""}`;

  return (
    <div
      ref={rootRef}
      className={rootClass}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={layout ? ({ ["--mm-fox-x" as string]: `${layout.foxX}px` } as React.CSSProperties) : undefined}
    >
      {/* background layers */}
      {W > 0 &&
        MOMENTS_SCENE.map((L) =>
          L.kind === "fixed" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={L.key} src={L.src} alt="" aria-hidden draggable={false} className={L.className} />
          ) : L.kind === "band" ? (
            <BandLayer key={L.key} spec={L} H={H} W={W} register={register} />
          ) : (
            <ScatterLayer key={L.key} spec={L} W={W} register={register} />
          ),
        )}

      {/* the world that moves with the timeline */}
      {layout && (
        <div ref={worldRef} className="mw-world">
          <div className="mw-trail" aria-hidden>
            {trail.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={TRAIL_ART[s.kind].src}
                alt=""
                draggable={false}
                style={{ left: s.left, top: s.top, width: s.w, height: s.h }}
              />
            ))}
          </div>

          {layout.placed.map((p) => {
            const y = ty(p.x);
            const cardBottom = y - p.lift;
            const ly = ty(p.x + p.lightDx) - 3;
            // arrival: newest first
            const rd = { ["--rd" as string]: `${140 + Math.min(p.index, 4) * 110}ms` } as React.CSSProperties;
            return (
              <div
                key={p.key}
                className="mw-item"
                ref={(el) => {
                  if (el) itemRefs.current.set(p.key, el);
                  else itemRefs.current.delete(p.key);
                }}
                style={{ left: p.x, ...rd }}
              >
                <span className="mw-stem" style={{ left: p.stemDx, top: cardBottom, height: Math.max(0, y - cardBottom - 2) }} />
                {p.light && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mw-light" src={LIGHTS[p.light].src} alt="" draggable={false} style={lightStyle(p.light, p.lightDx, ly)} />
                )}
                <div
                  className={`mw-card mw-card--${p.kind}`}
                  data-mkey={p.key}
                  role="button"
                  tabIndex={0}
                  aria-label={p.item.type === "rest" ? `A Star at Rest: ${p.item.star.wish}` : p.item.text}
                  onClick={(e) => openCard(p, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openCard(p, e.currentTarget);
                  }}
                  style={{
                    width: p.cardW,
                    left: -p.cardW / 2,
                    top: cardBottom,
                    transform: `translateY(-100%) rotate(${p.tilt.toFixed(2)}deg)`,
                  }}
                >
                  {p.label && <span className="mw-label">{p.label}</span>}
                  <Card p={p} />
                </div>
              </div>
            );
          })}

          {/* the one selected light — the focused Moment, only at rest */}
          {focused && phase === "ready" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`sel-${focused.key}`}
              className="mw-light mw-light--selected"
              src={LIGHTS.selected.src}
              alt=""
              draggable={false}
              style={lightStyle("selected", focused.x + focused.lightDx, ty(focused.x + focused.lightDx) - 3)}
            />
          )}
        </div>
      )}

      {layout && loaded && entries.length === 0 && phase !== "arriving" && (
        <div className="mw-empty">Your moments will gather here as you walk.</div>
      )}

      {layout && (
        <TrailFox ref={foxRef} rootRef={foxRootRef} initialOffset={(pan.current ?? delta) - delta} />
      )}

      {hint && entries.length > 1 && phase === "ready" && (
        <div className="mw-hint" aria-hidden>
          <span>Pull the past closer</span>
          <span className="mw-hint-track">
            <i />
            <svg className="mw-hand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
              <path d="M14 10V9a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1" />
              <path d="M10 9.5V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v10" />
              <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </span>
        </div>
      )}

      {showToday && (
        <button type="button" className="mw-today" onClick={goToday}>
          Today
        </button>
      )}

      <style jsx global>{`
        .mw-root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          /* horizontal pans are ours; vertical stays with the browser.
             Nothing global — the system back gesture is never blocked. */
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
        }
        .mw-band, .mw-scatter { position: absolute; left: 0; right: 0; pointer-events: none; overflow: visible; }
        .mw-lane { position: absolute; left: 0; top: 0; height: 100%; display: flex; will-change: transform; }
        .mw-lane img { height: 100%; width: auto; max-width: none; flex: 0 0 auto; display: block; }
        .mw-scatter img { position: absolute; max-width: none; height: auto; }
        .mw-world { position: absolute; left: 0; top: 0; width: 0; height: 100%; z-index: 3; will-change: transform; }
        .mw-trail { position: absolute; left: 0; top: 0; pointer-events: none; opacity: ${TRAIL_OPACITY}; }
        .mw-trail img { position: absolute; max-width: none; display: block; }
        .mw-item { position: absolute; top: 0; width: 0; height: 100%; }
        .mw-stem { position: absolute; width: 1px; background: rgba(245, 239, 230, 0.38); pointer-events: none; }
        .mw-light { position: absolute; max-width: none; pointer-events: none; }
        .mw-light--selected { animation: mw-light-in 420ms ease-out both; }
        @keyframes mw-light-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .mw-card { position: absolute; cursor: pointer; transform-origin: 50% 100%; outline: none; translate: 0 0; }
        .mw-card:focus-visible { outline: 1px dashed rgba(245, 239, 230, 0.7); outline-offset: 4px; }
        .mw-note { position: relative; padding: 11px 12px 9px; color: #2b2f45; }
        .mw-note > :not(.mm-art) { position: relative; }
        .mw-note-text {
          display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13.5px; line-height: 1.28; margin: 0 0 5px;
        }
        .mw-note-kicker { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 11.5px; color: rgba(43, 47, 69, 0.6); margin-bottom: 2px; }
        .mw-note-date { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 10.5px; color: rgba(43, 47, 69, 0.58); }
        .mw-label {
          position: absolute; left: 2px; bottom: calc(100% + 7px); white-space: nowrap;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13px; letter-spacing: 0.02em;
          color: rgba(245, 239, 230, 0.86);
        }

        /* ── arrival / departure ─────────────────────────────────── */
        .mw-veiled .mw-trail, .mw-veiled .mw-scatter, .mw-veiled .mw-light, .mw-veiled .mw-stem { opacity: 0; }
        .mw-veiled .mw-card { opacity: 0; translate: 0 12px; }
        .mw-revealing .mw-trail { transition: opacity 520ms ease; }
        .mw-revealing .mw-scatter { transition: opacity 700ms ease; }
        .mw-revealing .mw-card { transition: opacity 460ms ease var(--rd), translate 560ms cubic-bezier(0.22, 1, 0.36, 1) var(--rd); }
        .mw-revealing .mw-light, .mw-revealing .mw-stem { transition: opacity 420ms ease calc(var(--rd) + 120ms); }
        /* memories settle away: cards lower and fade, then lights + threads,
           then the trail — the sky, meadow and Sísí stay */
        .mw-leaving .mw-card { opacity: 0; translate: 0 16px; transition: opacity 300ms ease, translate 360ms ease-in; }
        .mw-leaving .mw-label { opacity: 0; transition: opacity 200ms ease; }
        .mw-leaving .mw-light, .mw-leaving .mw-stem { opacity: 0 !important; transition: opacity 280ms ease 80ms; }
        .mw-leaving .mw-trail { opacity: 0; transition: opacity 320ms ease 160ms; }
        .mw-leaving .mw-scatter { opacity: 0; transition: opacity 420ms ease 120ms; }

        .mw-empty {
          position: absolute; left: 12%; width: 46%; bottom: calc(var(--walking-baseline) + 48px); z-index: 4;
          padding: 12px 14px; background: rgba(245, 239, 230, 0.92); color: #2b2f45; border-radius: 2px;
          font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15px; line-height: 1.35;
        }
        .mw-hint {
          position: absolute; left: 0; right: 0; bottom: calc(var(--nav-total) + 22px); z-index: 7;
          display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;
          color: rgba(245, 239, 230, 0.92); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px;
          animation: mw-hint-in 900ms ease-out 500ms both;
        }
        .mw-hint-track { position: relative; display: block; width: 120px; height: 34px; }
        .mw-hint-track i {
          position: absolute; left: 6px; right: 0; top: 7px; height: 1px; background: rgba(245, 239, 230, 0.4);
        }
        .mw-hand {
          position: absolute; left: 0; top: 0; width: 28px; height: 28px; color: rgba(245, 239, 230, 0.92);
          animation: mw-hand 2.6s ease-in-out infinite;
        }
        @keyframes mw-hint-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes mw-hand {
          0% { transform: translateX(0); opacity: 0; }
          14% { opacity: 1; }
          66% { transform: translateX(84px); opacity: 1; }
          84%, 100% { transform: translateX(84px); opacity: 0; }
        }
        .mw-today {
          position: absolute; z-index: 8; right: var(--stage-padding); top: calc(var(--header-top) + 58px);
          min-height: 44px; min-width: 44px; padding: 0 18px; border: 0; border-radius: 999px; cursor: pointer;
          background: rgba(245, 239, 230, 0.94); color: #2b2f45; box-shadow: 0 2px 8px rgba(10, 18, 30, 0.18);
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
          animation: mw-hint-in 380ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .mw-hint, .mw-hand, .mw-today, .mw-light--selected { animation: none; }
        }
      `}</style>
    </div>
  );
});

function Card({ p }: { p: Placed }) {
  const it = p.item;
  if (it.type === "rest") {
    return (
      <div className="mw-note">
        <ArtFill art={ART.slip} />
        <span className="mw-note-kicker">A Star at Rest</span>
        <span className="mw-note-text">{it.star.wish}</span>
      </div>
    );
  }
  if (it.image) return <Postcard image={it.image} caption={shortDate(it.at)} />;
  return (
    <div className="mw-note">
      <ArtFill art={ART.slip} />
      <span className="mw-note-text">{it.text}</span>
      <span className="mw-note-date">{shortDate(it.at)}</span>
    </div>
  );
}

const shortDate = (iso: string) => whenLabel(iso, true).split(" · ")[0];

/* ── background layers ─────────────────────────────────────────────── */

function BandLayer({ spec, H, W, register }: { spec: Band; H: number; W: number; register: (fn: Apply) => () => void }) {
  const lane = useRef<HTMLDivElement>(null);
  const tileRef = useRef(0);
  const [copies, setCopies] = useState(3);
  const h = H * spec.heightPct;

  // Tile width measured exactly like the Journey's ParallaxLayer (rendered
  // width − seam), so both pages put the meadow at the same pixel.
  const measure = useCallback(() => {
    const first = lane.current?.firstElementChild as HTMLImageElement | null;
    if (!first || !first.complete || first.offsetWidth === 0) return;
    tileRef.current = first.offsetWidth - spec.seam;
    const need = Math.max(2, Math.ceil(W / tileRef.current) + 2);
    setCopies((c) => (c === need ? c : need));
  }, [spec.seam, W]);
  const lastView = useRef(0);
  const place = useCallback(
    (view: number) => {
      lastView.current = view;
      const tile = tileRef.current;
      if (!tile || !lane.current) return;
      const t = view * spec.ratio;
      const x = (((t % tile) + tile) % tile) - tile;
      lane.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    },
    [spec.ratio],
  );
  useLayoutEffect(() => {
    measure();
    place(lastView.current);
  }, [measure, place, h]);
  useLayoutEffect(() => register(place), [register, place]);

  return (
    <div
      className="mw-band"
      aria-hidden
      style={{ bottom: spec.bottom, height: h, opacity: spec.opacity, filter: spec.filter, zIndex: 1 }}
    >
      <div ref={lane} className="mw-lane">
        {Array.from({ length: copies }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={spec.src} alt="" draggable={false} onLoad={i === 0 ? () => { measure(); place(lastView.current); } : undefined} style={{ marginRight: -spec.seam }} />
        ))}
      </div>
    </div>
  );
}

function ScatterLayer({ spec, W, register }: { spec: Scatter; W: number; register: (fn: Apply) => () => void }) {
  const refs = useRef<(HTMLImageElement | null)[]>([]);
  const P = W * spec.period;
  useEffect(
    () =>
      register((cam) => {
        spec.items.forEach((it, i) => {
          const el = refs.current[i];
          if (!el) return;
          const raw = it.x * W + cam * spec.ratio;
          const x = ((((raw + W * 0.5) % P) + P) % P) - W * 0.5;
          el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        });
      }),
    [register, spec, W, P],
  );
  return (
    <div className="mw-scatter" aria-hidden style={{ top: 0, height: "100%", zIndex: 1 }}>
      {spec.items.map((it, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          src={it.src}
          alt=""
          draggable={false}
          style={{ left: 0, top: it.top, width: it.w * W }}
        />
      ))}
    </div>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
