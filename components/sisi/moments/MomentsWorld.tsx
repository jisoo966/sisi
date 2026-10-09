"use client";

import { Fragment, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrailEntry, TimelineMotion, Placed } from "@/lib/momentsTimeline";
import { layoutTimeline } from "@/lib/momentsTimeline";
import { isRealPhoto, whenLabel } from "@/lib/moments";
import { ArtFill, ART, Postcard } from "./shared";
import { TrailFox, type TrailFoxHandle } from "./TrailFox";
import { JOURNEY_FOX_X, clearJustSaved, lastMoment, rememberMoment, takeJustSaved } from "@/lib/worldHandoff";
import {
  gateC,
  gateCloudOpacity,
  GATE_HOLD_C,
  GATE_TOTAL_MS,
  RATE,
  smooth as ease5,
} from "@/lib/useStarAscent";
import { TimeOfDaySky } from "@/components/sisi/journey-v2/TimeOfDaySky";
import { useTimeOfDay } from "@/lib/timeOfDay";
import { TOD_GRADE } from "@/lib/worldArt";
import { SisiSpeechBubble } from "@/components/sisi/SisiSpeechBubble";
import { BASE_H, STRIP } from "@/components/sisi/journey-v2/MeadowStrip";
import { PondFish } from "@/components/sisi/journey-v2/PondFish";
import { useSceneTheme, type SceneTheme } from "@/lib/sceneTheme";
import type { SkyPhase } from "@/lib/timeOfDay";

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
/** The shared time-of-day sky (same as the Journey's). */
type Sky = { kind: "sky"; key: string };

const GROUND_BAND_BOTTOM = "calc(var(--walking-baseline) - 1% - 26.95%)";

export const MOMENTS_SCENE: (Band | Scatter | Fixed | Sky)[] = [
  { kind: "sky", key: "sky" },
  {
    kind: "scatter",
    key: "clouds",
    ratio: 0.06,
    period: 2.4,
    items: [
      { src: "/V2/parallax/clouds/cloud-2.webp", x: 0.08, top: "17%", w: 0.38 },
      { src: "/V2/parallax/clouds/cloud-5.webp", x: 0.95, top: "27%", w: 0.2 },
      { src: "/V2/parallax/clouds/cloud-4.webp", x: 1.55, top: "13%", w: 0.3 },
    ],
  },
  {
    kind: "band",
    key: "midground",
    src: "/V2/parallax/journey-midground-vegetation.webp",
    ratio: 13.5 / 32,
    heightPct: 0.18,
    bottom: "calc(var(--walking-baseline) - 1.5%)",
    opacity: 0.8,
    filter: `saturate(0.75) brightness(1.15) contrast(0.85) ${TOD_GRADE}`,
    seam: 1,
  },
  {
    kind: "band",
    key: "ground",
    src: "/V2/parallax/journey-walking-ground.webp",
    ratio: 1,
    heightPct: 1,
    bottom: GROUND_BAND_BOTTOM,
    filter: TOD_GRADE,
    seam: 2,
  },
  {
    // the same walking path as the Journey (journey-walking-path.webp), with
    // the Journey's exact height and baseline so the two worlds match
    kind: "band",
    key: "path",
    src: "/V2/parallax/journey-walking-path.webp",
    ratio: 1,
    heightPct: 0.4,
    bottom: "calc(var(--walking-baseline) - 18.67%)",
    filter: TOD_GRADE,
    seam: 2,
  },
];

/** The Journey's grass line (MeadowStrip) as a band: same height and baseline. */
function stripBand(phase: SkyPhase, override?: SceneTheme["strip"]): Band {
  const S = override ?? STRIP[phase];
  const h = BASE_H * (S.ih / 242);
  const below = ((S.ih - S.bottom) / S.ih) * h; // transparent rows under the grass
  return {
    kind: "band",
    key: `strip-${override ? "theme" : phase}`,
    src: S.src,
    ratio: 1,
    heightPct: h,
    bottom: `calc(var(--walking-baseline) - ${(below * 100).toFixed(3)}%)`,
    seam: 2,
  };
}

/** Memory lights rest on the path's centre line, which sits on the paw line. */
const TRAIL_DROP = 0;

/** Memory lights: rendered size of the painted core, and its anchor (image px). */
const LIGHTS = {
  idle: { src: "/V2/moments/trail-v2/memory-light-idle.webp", iw: 408, ih: 361, cx: 276.1, cy: 128.3, scale: 12 / 156 },
  linked: { src: "/V2/moments/trail-v2/memory-light-linked.webp", iw: 490, ih: 568, cx: 256.4, cy: 429.8, scale: 0.13 },
  selected: { src: "/V2/moments/trail-v2/memory-light-selected.webp", iw: 703, ih: 519, cx: 334.0, cy: 313.0, scale: 30 / 291 },
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
    arrival: { ground: number; via?: "stars"; t0?: number; reduced?: boolean } | null;
    /** Stars → Moments: the ground has come into view (header + tabs may appear) */
    onGround?: () => void;
    /** the Star title / mark on a card was tapped */
    onStar?: (starId: string) => void;
    /** the Moments have loaded (until then only the world is shown) */
    loaded: boolean;
    /** first visit: Sísí says once what this place is (then onHelloDone) */
    hello?: boolean;
    onHelloDone?: () => void;
  }
>(function MomentsWorld({ entries, motion, active, onOpen, arrival, loaded, onGround, onStar, hello = false, onHelloDone }, ref) {
  const fromStars = arrival?.via === "stars";
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tod = useTimeOfDay();
  const foxRef = useRef<TrailFoxHandle>(null);
  // Sísí's note is a passing note: one tap anywhere puts it away
  const [emptyNoteAway, setEmptyNoteAway] = useState(false);
  useEffect(() => {
    if (emptyNoteAway) return;
    const away = () => setEmptyNoteAway(true);
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [emptyNoteAway]);
  // her first-visit hello (with Moments already kept) is said once, then rests
  const sayHello = hello && loaded && entries.length > 0;
  const helloDone = useRef(onHelloDone);
  helloDone.current = onHelloDone;
  useEffect(() => {
    if (!sayHello) return;
    // an explanation stays until you put it away (a tap anywhere), never on a timer
    if (emptyNoteAway) return void helloDone.current?.();
  }, [sayHello, emptyNoteAway]);
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
  const pan = useRef<number | null>(arrival && !fromStars ? 0 : null); // null → Δ once measured

  // Stars → Moments: the second half of the Cloud Gate camera move. Sky,
  // rear clouds, land and front clouds move at the same rates as the
  // ascent; the trail is already in its Moments framing underneath.
  const skyGroupRef = useRef<HTMLDivElement>(null);
  const landGroupRef = useRef<HTMLDivElement>(null);
  const rearRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const gate = useRef<{ t0: number; reduced: boolean; shift: number | null; start: number; grounded: boolean } | null>(
    fromStars ? { t0: arrival?.t0 ?? 0, reduced: !!arrival?.reduced, shift: null, start: 0, grounded: false } : null,
  );
  const [gateDone, setGateDone] = useState(!fromStars);
  const onGroundRef = useRef(onGround);
  onGroundRef.current = onGround;
  const applyGate = useCallback((now: number) => {
    const g = gate.current;
    if (!g) return;
    const move = (el: HTMLElement | null, screens: number, opacity?: number) => {
      if (!el) return;
      el.style.transform = screens ? `translate3d(0, calc(${screens.toFixed(4)} * 100dvh), 0)` : "";
      if (opacity !== undefined) {
        el.style.opacity = opacity.toFixed(3);
        el.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
      }
    };
    let c: number;
    let fade = 1;
    let finished: boolean;
    if (g.reduced) {
      if (!g.start) g.start = now;
      const p = Math.min(1, (now - g.start) / 200);
      c = 0;
      fade = 1 - ease5(p);
      move(rearRef.current, RATE.rear * 1.0, fade);
      move(frontRef.current, RATE.front * 1.0, fade);
      finished = p >= 1;
    } else {
      // Continue the shared curve from the moment the Journey handed over;
      // if the page took long to arrive, resume inside the clouds instead
      // of skipping ahead (never reveal ground the user did not see coming).
      if (g.shift === null) {
        let tHold = 0;
        while (tHold < GATE_TOTAL_MS && gateC(tHold) > GATE_HOLD_C) tHold += 5;
        g.shift = Math.max(0, now - g.t0 - tHold);
      }
      const t = now - g.t0 - g.shift;
      c = gateC(t);
      const o = gateCloudOpacity(c);
      move(skyGroupRef.current, RATE.sky * c);
      move(landGroupRef.current, RATE.meadow * c);
      move(rearRef.current, RATE.rear * c, o.rear);
      move(frontRef.current, RATE.front * c, o.front);
      finished = t >= GATE_TOTAL_MS;
    }
    if (!g.grounded && c < 0.45) {
      g.grounded = true;
      onGroundRef.current?.();
    }
    if (finished) {
      gate.current = null;
      setGateDone(true);
    }
  }, []);
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
  // the path is level: every memory light rests on its centre line
  const ty = useCallback((_x: number) => baselineY + TRAIL_DROP, [baselineY]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const placedAt = useRef(false);
  useLayoutEffect(() => {
    if (!layout) return;
    motion.setSnaps(layout.snaps);
    // Back down from the Stars: land where the user last was in Moments
    // this session (placed while hidden — never a visible scroll). A Moment
    // that no longer exists falls back to Today.
    if (fromStars && loaded && !placedAt.current) {
      placedAt.current = true;
      const key = takeJustSaved() ?? lastMoment(); // an entry just saved → land on it
      const i = key ? layout.placed.findIndex((p) => p.key === key) : -1;
      if (i > 0) {
        motion.jumpTo(layout.snaps[i]);
        focusRef.current = i;
        setFocus(i);
      }
    }
  }, [layout, motion, fromStars, loaded]);

  /* focus → selected light */
  useEffect(() => {
    motion.onSettle = (i) => {
      if (i === 0) returningRef.current = false;
      rememberMoment(layoutRef.current?.placed[i]?.key ?? null);
      focusRef.current = i;
      setFocus(i);
    };
    return () => {
      motion.onSettle = null;
    };
  }, [motion]);

  const focused: Placed | undefined = focus >= 0 ? layout?.placed[focus] : undefined;
  // An entry just saved to a Star: its thread shows for a few seconds.
  const [justSaved] = useState(() => takeJustSaved());
  const [showSavedThread, setShowSavedThread] = useState(false);
  useEffect(() => {
    if (!justSaved || phase !== "ready") return;
    setShowSavedThread(true);
    const t = setTimeout(() => {
      setShowSavedThread(false);
      clearJustSaved();
    }, 4200);
    return () => clearTimeout(t);
  }, [justSaved, phase]);

  useLayoutEffect(() => {
    applyGate(performance.now());
  }, [applyGate]);

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
    applyGate(performance.now());
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
      applyGate(now);

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
        // where Sísí really is on screen (a card fades before it reaches her)
        const foxBox = fr?.querySelector(".tf-root")?.getBoundingClientRect();
        const rootLeft = rootRef.current?.getBoundingClientRect().left ?? 0;
        const foxLeft = foxBox && foxBox.width ? foxBox.left - rootLeft + foxBox.width * 0.18 : focusX + W * 0.14;
        // Only whole cards are readable: fade anything leaving the frame or
        // passing behind Sísí, so nothing rests awkwardly cropped.
        for (const p of layout.placed) {
          const el = itemRefs.current.get(p.key);
          if (!el) continue;
          const sx = p.x + cam;
          const left = sx - p.cardW / 2;
          const right = sx + p.cardW / 2;
          const edge = clamp01((left + 30) / 40) * clamp01((W + 30 - right) / 40);
          // gone by the time its edge is a little way into her (never read through her)
          const behind = 1 - smooth((right - foxLeft + 8) / 36);
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

  /* Stars → Moments: after the landing settles, the nearest memories
     appear with a short, restrained stagger; then input is enabled. */
  useEffect(() => {
    if (!fromStars || !gateDone || !loaded || !layout) return;
    setRevealing(true);
    const t1 = setTimeout(() => setVeiled(false), 30);
    const t2 = setTimeout(() => {
      setRevealing(false);
      setPhase("ready");
    }, 560);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fromStars, gateDone, loaded, layout]);

  /* Journey → Moments: reframe, then the trail and the newest memories appear */
  useEffect(() => {
    if (!arrival || fromStars || !layout || !loaded) return;
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
        rememberMoment(layoutRef.current?.placed[motion.nearestIndex()]?.key ?? null);
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

  // the same ground as the Journey (Customize → the path): its art, its path line
  const scene = useSceneTheme();
  const sceneLayers = useMemo(
    () =>
      MOMENTS_SCENE.map((L) =>
        L.kind !== "band"
          ? L
          : L.key === "midground"
            ? { ...L, src: scene.midground, heightPct: scene.midgroundHeight, bottom: scene.midgroundBottom }
            : L.key === "ground"
              ? { ...L, src: scene.ground, bottom: scene.groundBottom }
              : L.key === "path"
                ? { ...L, src: scene.path, bottom: scene.pathBottom }
                : L,
      ),
    [scene],
  );
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
      {/* Sky group: time-of-day sky + drifting clouds (0.15× in the Cloud Gate) */}
      <div ref={skyGroupRef} className="mw-group mw-group--sky">
        {W > 0 &&
          MOMENTS_SCENE.map((L) =>
            L.kind === "sky" ? (
              <TimeOfDaySky key={L.key} tod={tod} />
            ) : L.kind === "fixed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={L.key} src={L.src} alt="" aria-hidden draggable={false} className={L.className} />
            ) : L.kind === "scatter" ? (
              <ScatterLayer key={L.key} spec={L} W={W} register={register} />
            ) : null,
          )}
      </div>

      {/* Cloud Gate (arriving from the Stars): the same painted banks as the ascent */}
      {!gateDone && (
        <div ref={rearRef} className="mw-gate mw-gate--rear" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/V2/ascent/cloud-bank-rear-v3.webp" alt="" draggable={false} className="jw-cloud-bank jw-cloud-bank--rear" />
        </div>
      )}

      {/* Land group: meadow bands, the trail + memories, Sísí (0.75×) */}
      <div ref={landGroupRef} className="mw-group mw-group--land">
      {W > 0 &&
        sceneLayers.map((L) =>
          L.kind !== "band" ? null : L.key === "path" ? (
            <Fragment key={L.key}>
              {/* the Journey's time-of-day grass line, just behind the path,
                  so the meadow is the same on both pages (nothing appears or
                  disappears when they hand over) */}
              {tod && <BandLayer key={`strip-${tod.phase}-${scene.id}`} spec={stripBand(tod.phase, scene.strip)} H={H} W={W} register={register} />}
              <BandLayer key={`path-${scene.id}`} spec={L} H={H} W={W} register={register} />
              {/* the pond's fish, then its low near bank (Bridge & Pond) */}
              {scene.fish && <PondFish srcs={scene.fish} bottom={GROUND_BAND_BOTTOM} waterSpeed={scene.groundSpeed ?? 32} waterDrift={scene.groundDrift ?? 0} />}
              {scene.foreground && (
                <BandLayer
                  key={`fore-${scene.id}`}
                  spec={{ kind: "band", key: "pond-fore", src: scene.foreground, ratio: 1, heightPct: 1, bottom: GROUND_BAND_BOTTOM, filter: TOD_GRADE, seam: 2 }}
                  H={H}
                  W={W}
                  register={register}
                />
              )}
            </Fragment>
          ) : (
            <BandLayer key={`${L.key}-${scene.id}`} spec={L} H={H} W={W} register={register} />
          ),
        )}

      {/* the world that moves with the timeline */}
      {layout && (
        <div ref={worldRef} className="mw-world">

          {layout.placed.map((p) => {
            const y = ty(p.x);
            const cardBottom = y - p.lift;
            const ly = ty(p.x + p.lightDx) - 3;
            // arrival: newest first
            const rd = {
              ["--rd" as string]: fromStars
                ? `${30 + Math.min(Math.abs(p.index - Math.max(0, focusRef.current)), 3) * 60}ms`
                : `${140 + Math.min(p.index, 4) * 110}ms`,
            } as React.CSSProperties;
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
                  className={`mw-card mw-card--${p.kind}${p.index === focus ? " is-focused" : ""}`}
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
                  <Card p={p} onStar={onStar} />
                  {p.item.type === "moment" && p.item.starId && (
                    // a small Star mark: this memory belongs to a wish
                    // eslint-disable-next-line @next/next/no-img-element
                    <button
                      type="button"
                      className="mw-starmark"
                      aria-label={`Open the Star: ${p.item.starTitle ?? ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.item.type === "moment" && p.item.starId) onStar?.(p.item.starId);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/assets/sisi-star-mark-painted-512.webp" alt="" aria-hidden draggable={false} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* the thread up to its Star — only for the selected Moment, or
              briefly for an entry just saved */}
          {layout.placed.map((p) => {
            const it = p.item;
            const show =
              phase === "ready" &&
              it.type === "moment" &&
              !!it.starId &&
              ((focused && focused.key === p.key) || (showSavedThread && justSaved === p.key));
            if (!show) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`thread-${p.key}`}
                className="mw-light mw-thread"
                src={LIGHTS.linked.src}
                alt=""
                draggable={false}
                style={lightStyle("linked", p.x + p.lightDx, ty(p.x + p.lightDx) - 3)}
              />
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

      {layout && (
        <TrailFox
          ref={foxRef}
          rootRef={foxRootRef}
          initialOffset={(pan.current ?? delta) - delta}
          // Sísí says it herself: a speech bubble above her head (follows her)
          // (one voice: what this place is, she says herself — never a card as well)
          say={
            loaded && phase !== "arriving" && !emptyNoteAway && (entries.length === 0 || sayHello) ? (
              <SisiSpeechBubble
                message={entries.length === 0 ? "Your moments will gather here, from your walks and from your Stars." : "Everything you’ve kept lives here."}
                tailPosition="bottom-right"
                align="left"
              />
            ) : null
          }
        />
      )}
      </div>

      {!gateDone && (
        <div ref={frontRef} className="mw-gate mw-gate--front" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/V2/ascent/cloud-bank-front-v3.webp" alt="" draggable={false} className="jw-cloud-bank jw-cloud-bank--front" />
        </div>
      )}

      {hint && entries.length > 1 && phase === "ready" && (
        <div className="mw-hint" aria-hidden>
          <span>Drag to explore · Tap to read</span>
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
        .mw-group { position: absolute; inset: 0; }
        .mw-group--sky { z-index: 0; pointer-events: none; }
        .mw-group--land { z-index: 2; }
        .mw-gate { position: absolute; inset: 0; pointer-events: none; will-change: transform, opacity; }
        .mw-gate--rear { z-index: 1; }
        .mw-gate--front { z-index: 9; }
        .mw-group--sky, .mw-group--land { will-change: transform; }
        .mw-band, .mw-scatter { position: absolute; left: 0; right: 0; pointer-events: none; overflow: visible; }
        .mw-lane { position: absolute; left: 0; top: 0; height: 100%; display: flex; will-change: transform; }
        .mw-lane img { height: 100%; width: auto; max-width: none; flex: 0 0 auto; display: block; }
        .mw-scatter img { position: absolute; max-width: none; height: auto; }
        .mw-world { position: absolute; left: 0; top: 0; width: 0; height: 100%; z-index: 3; will-change: transform; }
        .mw-item { position: absolute; top: 0; width: 0; height: 100%; }
        .mw-stem { position: absolute; width: 1px; background: rgba(245, 239, 221, 0.38); pointer-events: none; }
        .mw-light { position: absolute; max-width: none; pointer-events: none; }
        .mw-light--selected { animation: mw-light-in 420ms ease-out both; }
        .mw-thread { animation: mw-thread-in 600ms ease-out both; }
        @keyframes mw-thread-in { from { opacity: 0; clip-path: inset(100% 0 0 0); } to { opacity: 1; clip-path: inset(0 0 0 0); } }
        .mw-star-title {
          display: flex; align-items: flex-start; gap: 4px; max-width: 100%; margin: 0 0 5px; padding: 0; border: 0;
          background: transparent; cursor: pointer; text-align: left;
          font-family: var(--font-editorial); font-weight: 500; font-size: 11.5px; color: var(--ink-80);
        }
        /* the Star's name: up to two lines, never cut after a few letters */
        .mw-star-title span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; }
        .mw-star-title img { width: 11px; height: 11px; flex: 0 0 auto; margin-top: 2px; }
        .mw-card--photo .mw-star-title { color: rgba(245, 239, 221, 0.92); margin: 0 0 3px 2px; }
        .mw-starmark img { width: 100%; height: 100%; display: block; }
        .mw-starmark {
          border: 0; padding: 0; background: transparent; cursor: pointer; pointer-events: auto !important;
          position: absolute; right: -5px; top: -6px; width: 16px; height: 16px; z-index: 2; pointer-events: none;
          filter: drop-shadow(0 1px 2px rgba(16, 45, 50, 0.35));
        }
        @keyframes mw-light-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .mw-card { position: absolute; cursor: pointer; transform-origin: 50% 100%; outline: none; translate: 0 0; scale: 0.96; transition: scale 320ms var(--ease-sisi); }
        /* the one you are on reads a little larger */
        .mw-card.is-focused { scale: 1.12; z-index: 1; }
        .mw-card:focus-visible { outline: 2px solid var(--paper-90); outline-offset: 4px; }
        .mw-note { position: relative; padding: 11px 12px 9px; color: var(--sisi-ink); }
        .mw-note > :not(.mm-art) { position: relative; }
        .mw-note-text {
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
          font-family: var(--font-editorial); font-size: 13.5px; line-height: 1.3; margin: 0 0 5px;
        }
        .mw-note-kicker { display: block; font-family: var(--font-ui); font-weight: 500; font-size: var(--text-chip); color: var(--ink-60); margin-bottom: 3px; letter-spacing: 0.005em; }
        .mw-nowrap { white-space: nowrap; }
        .mw-note-date { display: block; font-family: var(--font-ui); font-size: var(--text-helper); color: var(--ink-60); letter-spacing: 0.005em; }
        .mw-label {
          position: absolute; left: 2px; bottom: calc(100% + 7px); white-space: nowrap;
          font-family: var(--font-ui); font-weight: 500; font-size: var(--text-meta); letter-spacing: 0.02em;
          color: rgba(245, 239, 221, 0.86);
        }

        /* ── arrival / departure ─────────────────────────────────── */
        .mw-veiled .mw-scatter, .mw-veiled .mw-light, .mw-veiled .mw-stem { opacity: 0; }
        .mw-veiled .mw-card { opacity: 0; translate: 0 12px; }
        .mw-revealing .mw-scatter { transition: opacity 700ms ease; }
        .mw-revealing .mw-card { transition: opacity 460ms ease var(--rd), translate 560ms cubic-bezier(0.22, 1, 0.36, 1) var(--rd); }
        .mw-revealing .mw-light, .mw-revealing .mw-stem { transition: opacity 420ms ease calc(var(--rd) + 120ms); }
        /* memories settle away: cards lower and fade, then lights + threads,
           — the sky, meadow, path and Sísí stay */
        .mw-leaving .mw-card { opacity: 0; translate: 0 16px; transition: opacity 300ms ease, translate 360ms ease-in; }
        .mw-leaving .mw-label { opacity: 0; transition: opacity 200ms ease; }
        .mw-leaving .mw-light, .mw-leaving .mw-stem { opacity: 0 !important; transition: opacity 280ms ease 80ms; }
        .mw-leaving .mw-scatter { opacity: 0; transition: opacity 420ms ease 120ms; }

        .mw-hint {
          position: absolute; left: 0; right: 0; bottom: calc(var(--nav-total) + 22px); z-index: 7;
          display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;
          color: var(--paper-90); font-family: var(--font-editorial); font-size: var(--text-dialogue);
          animation: mw-hint-in 900ms ease-out 500ms both;
        }
        .mw-hint-track { position: relative; display: block; width: 120px; height: 34px; }
        .mw-hint-track i {
          position: absolute; left: 6px; right: 0; top: 7px; height: 1px; background: rgba(245, 239, 221, 0.4);
        }
        .mw-hand {
          position: absolute; left: 0; top: 0; width: 28px; height: 28px; color: rgba(245, 239, 221, 0.92);
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
          background: var(--sisi-paper) var(--grain-speech) 0 0 / var(--grain-size) repeat; background-blend-mode: multiply;
          color: var(--sisi-ink); box-shadow: 0 2px 6px rgba(16, 45, 50, 0.12), inset 0 0 10px rgba(16, 45, 50, 0.05);
          font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-button);
          animation: mw-hint-in var(--motion-bubble) var(--ease-sisi) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .mw-hint, .mw-hand, .mw-today, .mw-light--selected { animation: none; }
        }
      `}</style>
    </div>
  );
});

function Card({ p, onStar }: { p: Placed; onStar?: (starId: string) => void }) {
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
  // ★ Find work that feels like me — tapping it opens that Star
  const starLine =
    it.starId && it.starTitle ? (
      <button
        type="button"
        className="mw-star-title"
        onClick={(e) => {
          e.stopPropagation();
          onStar?.(it.starId!);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/sisi-star-mark-painted-512.webp" alt="" aria-hidden />
        <span>{it.starTitle}</span>
      </button>
    ) : null;
  if (it.image && isRealPhoto(it.image))
    return (
      <>
        {starLine}
        <Postcard image={it.image} caption={shortDate(it.at)} />
      </>
    );
  return (
    <div className="mw-note">
      <ArtFill art={ART.slip} />
      {starLine}
      {it.mtype === "companion_note" && <span className="mw-note-kicker">A note from Sísí</span>}
      <span className="mw-note-text">{it.text}</span>
      {/* the words first; then only when (the kind is not named — it's the moment that matters) */}
      <span className="mw-note-date">
        <span className="mw-nowrap">{shortDate(it.at)}</span>
      </span>
    </div>
  );
}

/** "Oct 1" — the month and year are already on the trail's month marker */
const shortDate = (iso: string) => whenLabel(iso, false).split(" · ")[0];

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
