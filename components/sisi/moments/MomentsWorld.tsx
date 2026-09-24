"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrailEntry, TimelineMotion, Placed } from "@/lib/momentsTimeline";
import { buildTrail, layoutTimeline, TRAIL_ART, trailYAt } from "@/lib/momentsTimeline";
import { whenLabel } from "@/lib/moments";
import { ArtFill, ART, Postcard } from "./shared";
import { TrailFox, type TrailFoxHandle } from "./TrailFox";

/**
 * MomentsWorld — the horizontal Memory Trail.
 *
 * Every visual layer is data (MOMENTS_SCENE below): swap the artwork paths
 * and ratios without touching the gestures or the timeline.
 *
 *   gestures  drag right → the past, drag left → Today. Direction locks after
 *             ~11px; a horizontal drag stays horizontal until release. Touches
 *             starting in the left 24px are ignored (iOS back gesture).
 *             Mouse wheel / trackpad moves the timeline on desktop.
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
  },
  {
    kind: "band",
    key: "ground",
    src: "/V2/parallax/journey-walking-ground.png",
    ratio: 1,
    heightPct: 1,
    bottom: "calc(var(--walking-baseline) - 1% - 26.95%)",
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
const EDGE_IGNORE = 24;
const LOCK_PX = 11;

type Apply = (cam: number) => void;

export function MomentsWorld({
  entries,
  motion,
  active,
  onOpen,
}: {
  entries: TrailEntry[];
  motion: TimelineMotion;
  /** false while the list or a detail sheet is open */
  active: boolean;
  onOpen: (entry: TrailEntry, el: Element) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const foxRef = useRef<TrailFoxHandle>(null);
  const selRef = useRef<HTMLImageElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const appliers = useRef(new Set<Apply>());
  const [size, setSize] = useState({ W: 0, H: 0, base: 0.26 });
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  const [showToday, setShowToday] = useState(false);
  const todayRef = useRef(false);
  const returningRef = useRef(false);
  const [hint, setHint] = useState(false);

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

  const { W, H, base } = size;
  const baselineY = H * (1 - base);
  const layout = useMemo(() => (W ? layoutTimeline(entries, W) : null), [entries, W]);
  const trail = useMemo(() => {
    if (!layout) return [];
    const oldest = layout.placed.length ? layout.placed[layout.placed.length - 1].x : 0;
    return buildTrail(W, baselineY + TRAIL_DROP, W * 1.4, Math.min(-W, oldest - W * 1.6));
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

  /* one frame loop: timeline → world, layers, cards, Sísí */
  useEffect(() => {
    if (!layout) return;
    let raf = 0;
    let last = performance.now();
    let first = true;
    let lastCam = NaN;
    let lastMove = 0;
    const { focusX } = layout;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      motion.step(dt, now);
      const cam = motion.cam;
      if (motion.mode === "drag" && now - lastMove > 60) motion.vel = 0; // finger held still

      if (cam !== lastCam || first) {
        if (cam !== lastCam) lastMove = now;
        first = false;
        lastCam = cam;
        const w = worldRef.current;
        if (w) w.style.transform = `translate3d(${cam.toFixed(2)}px,0,0)`;
        appliers.current.forEach((fn) => fn(cam));
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
      const t = cam > W * 0.4 || returningRef.current;
      if (t !== todayRef.current) {
        todayRef.current = t;
        setShowToday(t);
      }
      foxRef.current?.update(motion.vel, dt, motion.reduced);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, motion, W]);

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

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active || e.button !== 0 || e.clientX < EDGE_IGNORE) return;
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
      return;
    }
    if (!s.lock) {
      const el = (e.target as Element).closest?.("[data-mkey]");
      const p = el && layout?.placed.find((q) => q.key === el.getAttribute("data-mkey"));
      if (p && el && parseFloat((el.closest(".mw-item") as HTMLElement)?.style.opacity || "1") > 0.5) {
        if (Math.abs(motion.cam - p.D) > 1) motion.goToIndex(p.index, 650);
        onOpen(p.item, el);
      }
    }
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    const s = g.current;
    g.current = null;
    if (s?.lock === "h") motion.dragEnd(e.timeStamp);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!active) return;
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
  }, [active, motion]);

  const goToday = () => {
    returningRef.current = true;
    motion.goTo(0);
  };

  const register = useCallback((fn: Apply) => {
    appliers.current.add(fn);
    fn(motion.cam);
    return () => {
      appliers.current.delete(fn);
    };
  }, [motion]);

  return (
    <div
      ref={rootRef}
      className="mw-root"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={
        layout
          ? ({ ["--mm-fox-x" as string]: `${layout.foxX}px` } as React.CSSProperties)
          : undefined
      }
    >
      {/* background layers */}
      {W > 0 &&
        MOMENTS_SCENE.map((L) =>
          L.kind === "fixed" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={L.key} src={L.src} alt="" aria-hidden draggable={false} className={L.className} />
          ) : L.kind === "band" ? (
            <BandLayer key={L.key} spec={L} W={W} H={H} register={register} />
          ) : (
            <ScatterLayer key={L.key} spec={L} W={W} register={register} />
          ),
        )}

      {/* the world that moves with the timeline */}
      {layout && (
        <div ref={worldRef} className="mw-world">
          <div className="mw-trail" style={{ opacity: TRAIL_OPACITY }} aria-hidden>
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
            return (
              <div
                key={p.key}
                className="mw-item"
                ref={(el) => {
                  if (el) itemRefs.current.set(p.key, el);
                  else itemRefs.current.delete(p.key);
                }}
                style={{ left: p.x }}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpen(p.item, e.currentTarget);
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
          {focused && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={selRef}
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

      {layout && entries.length === 0 && (
        <div className="mw-empty">Your moments will gather here as you walk.</div>
      )}

      <TrailFox ref={foxRef} />

      {hint && entries.length > 1 && (
        <div className="mw-hint" aria-hidden>
          <span>Swipe to walk back →</span>
          <i />
        </div>
      )}

      {showToday && (
        <button type="button" className="mw-today" onClick={goToday} onPointerDown={(e) => e.stopPropagation()}>
          Today
        </button>
      )}

      <style jsx global>{`
        .mw-root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          --mm-fox-w: clamp(92px, 25vw, 132px);
        }
        .mw-band, .mw-scatter { position: absolute; left: 0; right: 0; pointer-events: none; overflow: visible; }
        .mw-lane { position: absolute; left: 0; top: 0; height: 100%; display: flex; will-change: transform; }
        .mw-lane img { height: 100%; width: auto; max-width: none; flex: 0 0 auto; display: block; margin-right: -2px; }
        .mw-scatter img { position: absolute; max-width: none; height: auto; }
        .mw-world { position: absolute; left: 0; top: 0; width: 0; height: 100%; z-index: 3; will-change: transform; }
        .mw-trail { position: absolute; left: 0; top: 0; pointer-events: none; }
        .mw-trail img { position: absolute; max-width: none; display: block; }
        .mw-item { position: absolute; top: 0; width: 0; height: 100%; }
        .mw-stem { position: absolute; width: 1px; background: rgba(245, 239, 230, 0.38); pointer-events: none; }
        .mw-light { position: absolute; max-width: none; pointer-events: none; }
        .mw-light--selected { animation: mw-light-in 420ms ease-out both; }
        @keyframes mw-light-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .mw-card { position: absolute; cursor: pointer; transform-origin: 50% 100%; outline: none; }
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
        .mw-empty {
          position: absolute; left: 12%; width: 46%; bottom: calc(var(--walking-baseline) + 48px); z-index: 4;
          padding: 12px 14px; background: rgba(245, 239, 230, 0.92); color: #2b2f45; border-radius: 2px;
          font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15px; line-height: 1.35;
        }
        .mw-hint {
          position: absolute; left: 0; right: 0; bottom: calc(var(--nav-total) + 26px); z-index: 7;
          display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none;
          color: rgba(245, 239, 230, 0.9); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px;
          animation: mw-hint-in 900ms ease-out 600ms both;
        }
        .mw-hint i {
          position: relative; display: block; width: 110px; height: 1px; background: rgba(245, 239, 230, 0.45);
        }
        .mw-hint i::after {
          content: ""; position: absolute; top: -3px; left: 0; width: 7px; height: 7px; border-radius: 50%;
          background: rgba(245, 239, 230, 0.9); animation: mw-hint-dot 2.4s ease-in-out infinite;
        }
        @keyframes mw-hint-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes mw-hint-dot { 0% { transform: translateX(0); opacity: 0; } 15% { opacity: 1; } 70% { transform: translateX(103px); opacity: 1; } 100% { transform: translateX(103px); opacity: 0; } }
        .mw-today {
          position: absolute; z-index: 8; right: var(--stage-padding); top: calc(var(--header-top) + 58px);
          height: 34px; padding: 0 16px; border: 0; border-radius: 999px; cursor: pointer;
          background: rgba(245, 239, 230, 0.94); color: #2b2f45; box-shadow: 0 2px 8px rgba(10, 18, 30, 0.18);
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
          animation: mw-hint-in 380ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .mw-hint, .mw-hint i::after, .mw-today, .mw-light--selected { animation: none; }
        }
      `}</style>
    </div>
  );
}

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

function BandLayer({ spec, W, H, register }: { spec: Band; W: number; H: number; register: (fn: Apply) => () => void }) {
  const lane = useRef<HTMLDivElement>(null);
  const [tile, setTile] = useState(0);
  const h = H * spec.heightPct;
  const copies = tile ? Math.ceil(W / tile) + 2 : 2;

  useEffect(() => {
    const img = new Image();
    img.onload = () => setTile((img.naturalWidth / img.naturalHeight) * h - 2);
    img.src = spec.src;
  }, [spec.src, h]);

  useEffect(() => {
    if (!tile) return;
    return register((cam) => {
      const t = cam * spec.ratio;
      const x = (((t % tile) + tile) % tile) - tile;
      if (lane.current) lane.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  }, [tile, spec.ratio, register]);

  return (
    <div
      className="mw-band"
      aria-hidden
      style={{ bottom: spec.bottom, height: h, opacity: spec.opacity, filter: spec.filter, zIndex: 1 }}
    >
      <div ref={lane} className="mw-lane">
        {Array.from({ length: copies }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={spec.src} alt="" draggable={false} />
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
