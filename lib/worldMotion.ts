/**
 * Journey world motion — ONE shared clock for every moving layer.
 *
 * Why a single clock:
 *   - Walking ground and walking path must move as one locked unit. Both read
 *     the SAME accumulated value (`groundDistance`) — never two timers.
 *   - Every other layer moves proportionally to the ground, so start / stop
 *     easing is automatically shared and the depth relationship holds.
 *   - Time-based (px per second × delta time) → identical speed on 60Hz and
 *     120Hz displays.
 *
 * Speeds are in CSS pixels per second at speedMultiplier = 1.
 */

export const BASE_GROUND_SPEED = 32; // pixels per second

export const LAYER_SPEED = {
  fixedSky: 0,
  smallCloud: [1.5, 2] as const,
  largeCloud: [2.5, 3.5] as const,
  farVegetation: 7, // 6–8
  midgroundVegetation: 13.5, // 12–15
  walkingGround: BASE_GROUND_SPEED,
  walkingPath: BASE_GROUND_SPEED, // must equal walkingGround
  foregroundGrass: [42, 48] as const,
  foregroundTree: [50, 58] as const,
};

const START_MS = 1200; // 0 → 32px/s
const STOP_MS = 1150; // 32px/s → 0
const CLOUD_IDLE_FACTOR = 0.32; // clouds keep drifting at ~1/3 when stopped
const BREATH_AMP = 0.03; // ±3% shared speed variation (all layers together)

/** cubic-bezier(0.33, 1, 0.68, 1) — soft start / soft settle. */
function makeBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dsx(t);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
export const softEase = makeBezier(0.33, 1, 0.68, 1);

/** Breakpoint multiplier — NOT derived continuously from viewport width. */
function computeMultiplier(): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth;
  if (w < 360) return 0.9; // narrow phones
  if (w < 768) return 1.0; // standard phones
  return 1.1; // tablets / wide desktop previews
}

export type WorldFrame = {
  now: number;
  /** seconds since last frame (clamped) */
  dt: number;
  /** 0 (stopped) … 1 (walking), eased */
  factor: number;
  /** true while the world is asked to walk (target), even during ease-in */
  walking: boolean;
  reducedMotion: boolean;
  multiplier: number;
  /** total px the ground has travelled — THE shared source value */
  groundDistance: number;
  /** px the ground moved this frame (at BASE_GROUND_SPEED) */
  groundDelta: number;
  /** 0.32 … 1 — clouds slow down but keep drifting when stopped */
  cloudFactor: number;
};

type Listener = (f: WorldFrame) => void;

class WorldClock {
  private listeners = new Set<Listener>();
  private raf: number | null = null;
  private last = 0;
  private walking = false;
  private from = 0;
  private to = 0;
  private tStart = 0;
  private dur = START_MS;
  private factor = 0;
  private distance = 0;
  private multiplier = 1;
  private reduced = false;
  private started = false;

  private init() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.multiplier = computeMultiplier();
    window.addEventListener("resize", () => {
      this.multiplier = computeMultiplier();
    });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = mq.matches;
    mq.addEventListener("change", () => {
      this.reduced = mq.matches;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.stopLoop();
      else this.ensureLoop();
    });
  }

  subscribe(fn: Listener): () => void {
    this.init();
    this.listeners.add(fn);
    this.ensureLoop();
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) this.stopLoop();
    };
  }

  /**
   * Ask the world to walk / stop. Eases from the CURRENT speed.
   * `durationMs` overrides the default ease (e.g. 450ms deceleration when
   * the camera is about to look up at the star).
   */
  setWalking(walking: boolean, durationMs?: number) {
    this.init();
    if (walking === this.walking) return;
    this.walking = walking;
    this.from = this.factor;
    this.to = walking ? 1 : 0;
    this.tStart = performance.now();
    // Scale duration by remaining distance so a mid-way reversal stays soft.
    const full = durationMs ?? (walking ? START_MS : STOP_MS);
    this.dur = Math.max(durationMs ? 120 : 250, full * Math.abs(this.to - this.from));
  }

  /** Back to a standstill (e.g. leaving the Journey page). */
  reset() {
    this.walking = false;
    this.factor = this.from = this.to = 0;
  }

  /** Where the meadow is (px of ground travel). Used to hand the exact
   *  frame over between Journey and Moments. */
  getDistance() {
    return this.distance;
  }
  setDistance(d: number) {
    this.distance = d;
  }

  isWalking() {
    return this.walking && !this.reduced;
  }

  private ensureLoop() {
    if (this.raf !== null || this.listeners.size === 0) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private stopLoop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private tick = (now: number) => {
    const dt = Math.min(Math.max((now - this.last) / 1000, 0), 0.1);
    this.last = now;

    if (this.reduced) {
      this.factor = 0;
    } else {
      const p = this.dur > 0 ? (now - this.tStart) / this.dur : 1;
      this.factor = this.from + (this.to - this.from) * softEase(p);
    }

    const t = now / 1000;
    const breath =
      1 + BREATH_AMP * (0.7 * Math.sin(t * 0.33) + 0.3 * Math.sin(t * 0.87 + 1.3));
    const groundDelta = BASE_GROUND_SPEED * this.multiplier * this.factor * breath * dt;
    this.distance += groundDelta;

    const frame: WorldFrame = {
      now,
      dt,
      factor: this.factor,
      walking: this.walking && !this.reduced,
      reducedMotion: this.reduced,
      multiplier: this.multiplier,
      groundDistance: this.distance,
      groundDelta,
      cloudFactor: CLOUD_IDLE_FACTOR + (1 - CLOUD_IDLE_FACTOR) * this.factor,
    };
    this.listeners.forEach((fn) => fn(frame));
    this.raf = requestAnimationFrame(this.tick);
  };
}

let clock: WorldClock | null = null;
export function worldClock(): WorldClock {
  if (!clock) clock = new WorldClock();
  return clock;
}

/** Scale a layer speed (px/s) to this frame's movement (px). */
export function layerDelta(f: WorldFrame, speed: number): number {
  return f.groundDelta * (speed / BASE_GROUND_SPEED);
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
