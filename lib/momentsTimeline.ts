/**
 * lib/momentsTimeline — the horizontal Memory Trail, without any visuals.
 *
 * Direction: Journey walks right (future), Stars rises (wishes), Moments
 * walks LEFT into the past.
 *
 *   cam        how far we have walked back (px). 0 = Today.
 *              Dragging right increases cam: the world follows the finger
 *              and older moments arrive from the left.
 *   world x    a moment's position on the trail at cam = 0.
 *              screen x = world x + cam.
 *   D[i]       the cam value that brings moment i to the focus point
 *              (near Sísí). These are the snap points.
 *
 * Everything here is replaceable-art agnostic: the trail artwork, lights and
 * cards only read positions from this module.
 */

import type { MomentItem, RestItem } from "@/lib/moments";
import { monthLabel } from "@/lib/moments";

/* ── deterministic variation ──────────────────────────────────────── */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** 0…1, stable per key + salt. */
export const rnd = (key: string, salt: number) => (hash(`${key}:${salt}`) % 10000) / 10000;

/* ── placement ────────────────────────────────────────────────────── */

export type TrailEntry = MomentItem | RestItem;
export type LightKind = "idle" | "linked" | null;

export type Placed = {
  key: string;
  item: TrailEntry;
  index: number;
  /** snap cam for this entry */
  D: number;
  /** world x of the card's centre */
  x: number;
  kind: "note" | "photo" | "rest";
  cardW: number;
  /** px between the trail and the card's bottom edge */
  lift: number;
  tilt: number;
  stemDx: number;
  light: LightKind;
  lightDx: number;
  /** small live date text above the first card of each month */
  label: string | null;
};

export type TimelineLayout = {
  placed: Placed[];
  snaps: number[];
  focusX: number;
  foxX: number;
};

export const CARD_W = { note: 104, photo: 88, rest: 112 } as const;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function layoutTimeline(entries: TrailEntry[], W: number): TimelineLayout {
  const focusX = W * 0.52; // where the focused card's centre rests
  const foxX = W * 0.79; // Sísí's centre (lower right)

  // Which Star each entry belongs to, and the first (oldest) entry of each Star.
  const firstOfStar = new Map<string, string>();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "moment" && e.starId && !firstOfStar.has(e.starId)) firstOfStar.set(e.starId, e.key);
  }

  const placed: Placed[] = [];
  const snaps: number[] = [];
  let D = 0;
  let lastLight = -10;
  const today = new Date();

  entries.forEach((item, i) => {
    const key = item.key;
    if (i > 0) {
      // Controlled variation: never equal spacing, always readable.
      D += W * (0.29 + 0.06 * rnd(key, 1));
    }
    const kind: Placed["kind"] = item.type === "rest" ? "rest" : item.image ? "photo" : "note";

    let light: LightKind = null;
    if (item.type === "moment") {
      if (item.starId && firstOfStar.get(item.starId) === key) light = "linked";
      else if (item.image && i - lastLight > 2) light = "idle"; // meaningful + sparse
    }
    if (light) lastLight = i;

    const m = monthLabel(item.at);
    const prevM = i > 0 ? monthLabel(entries[i - 1].at) : null;
    let label: string | null = null;
    if (i === 0) label = isSameDay(new Date(item.at), today) ? "Today" : m;
    else if (m !== prevM) label = m;

    placed.push({
      key,
      item,
      index: i,
      D,
      x: focusX - D,
      kind,
      cardW: CARD_W[kind],
      lift: 30 + 40 * rnd(key, 2) + (i % 2 ? 8 : 0),
      tilt: (rnd(key, 3) - 0.5) * 3.2,
      stemDx: (rnd(key, 4) - 0.5) * 18,
      light,
      lightDx: (rnd(key, 5) - 0.5) * 26,
      label,
    });
    snaps.push(D);
  });

  return { placed, snaps: snaps.length ? snaps : [0], focusX, foxX };
}

/* ── trail geometry ───────────────────────────────────────────────── */

export type SegKind = "straight" | "rise" | "dip";

/** Band centre (image px) at 41 even steps, measured from the PNGs. */
export const TRAIL_ART: Record<SegKind, { src: string; iw: number; ih: number; prof: number[] }> = {
  straight: {
    src: "/V2/moments/trail-v2/trail-straight.png", iw: 2172, ih: 211,
    prof: [137.1, 136.9, 136.4, 137.4, 139.3, 137.3, 136.5, 137.4, 134.9, 137.7, 137.5, 137.3, 136.5, 137.7, 137.6, 137.2, 137.0, 137.5, 137.0, 138.0, 137.5, 138.0, 137.6, 137.6, 137.7, 136.8, 136.5, 133.5, 136.4, 137.1, 136.7, 135.8, 135.5, 135.3, 134.8, 135.3, 136.5, 136.0, 135.7, 136.3, 137.8],
  },
  rise: {
    src: "/V2/moments/trail-v2/trail-rise.png", iw: 2172, ih: 242,
    prof: [158.6, 157.4, 158.1, 158.1, 156.1, 156.4, 153.3, 149.4, 142.0, 135.1, 126.4, 119.5, 115.1, 107.5, 107.8, 110.1, 113.0, 114.5, 120.5, 126.7, 134.5, 140.8, 147.7, 152.1, 154.8, 159.0, 160.0, 162.4, 163.5, 165.6, 166.0, 165.5, 165.3, 164.3, 163.5, 162.2, 160.5, 161.2, 158.1, 159.1, 159.8],
  },
  dip: {
    src: "/V2/moments/trail-v2/trail-dip.png", iw: 2172, ih: 207,
    prof: [110.6, 110.8, 110.3, 111.3, 111.1, 109.9, 109.7, 109.5, 108.6, 111.1, 115.8, 120.1, 120.1, 128.8, 132.9, 135.6, 137.6, 139.2, 140.7, 141.3, 141.5, 142.1, 140.6, 138.5, 138.3, 132.2, 133.1, 129.8, 127.0, 123.1, 120.2, 115.2, 113.6, 111.3, 109.9, 109.3, 109.7, 109.9, 108.4, 109.9, 111.2],
  },
};

/** Scale of the trail art. ≈0.8 gives ~30px visible thickness (band + tufts)
 *  on a 390px viewport; a segment is then ~1740px long, so the rare hills
 *  are long and gentle. */
export const trailScale = (W: number) => 0.8 * Math.max(0.9, Math.min(1.15, W / 390));
/** Each segment's faded tip tucks under the next (px, rendered). */
export const TRAIL_OVERLAP = 6;

export type Seg = { kind: SegKind; left: number; top: number; w: number; h: number; k: number };

/**
 * Segments laid right → left from just beyond Today to past the oldest
 * moment. Mostly straight; a rise or dip now and then, never two in a row.
 */
export function buildTrail(W: number, baselineY: number, fromX: number, toX: number): Seg[] {
  const k = trailScale(W);
  const out: Seg[] = [];
  let right = fromX;
  let prevHill = true; // start with a straight piece near Today
  let n = 0;
  while (right > toX) {
    let kind: SegKind = "straight";
    if (!prevHill) {
      const r = rnd("trail", n);
      if (r < 0.16) kind = "rise";
      else if (r < 0.32) kind = "dip";
    }
    const A = TRAIL_ART[kind];
    const w = A.iw * k;
    const h = A.ih * k;
    const endY = (A.prof[0] + A.prof[40]) / 2;
    out.push({ kind, left: right - w, top: baselineY - endY * k, w, h, k });
    right = right - w + TRAIL_OVERLAP;
    prevHill = kind !== "straight";
    n++;
  }
  return out;
}

export function trailYAt(segs: Seg[], x: number, fallback: number): number {
  for (const s of segs) {
    if (x >= s.left && x <= s.left + s.w) {
      const p = TRAIL_ART[s.kind].prof;
      const t = ((x - s.left) / s.w) * 40;
      const i = Math.max(0, Math.min(39, Math.floor(t)));
      return s.top + (p[i] + (p[i + 1] - p[i]) * (t - i)) * s.k;
    }
  }
  return fallback;
}

/* ── motion ───────────────────────────────────────────────────────── */

export type MotionMode = "rest" | "drag" | "spring" | "travel";

const SPRING_K = 58; // softly damped: settles in ~0.7s
const SPRING_C = 2 * 0.9 * Math.sqrt(SPRING_K);
const MOMENTUM_S = 0.3; // how far a flick carries before the snap target is chosen
const MAX_RELEASE_V = 2600;
const RUBBER = 0.28;

export class TimelineMotion {
  cam = 0;
  vel = 0;
  mode: MotionMode = "rest";
  reduced = false;
  private snaps: number[] = [0];
  private target = 0;
  private travel: { from: number; to: number; t0: number; dur: number } | null = null;
  private samples: { t: number; cam: number }[] = [];
  private dragBase = 0;
  private lastT = 0;
  /** Called once when the timeline comes to rest on a snap index. */
  onSettle: ((index: number) => void) | null = null;

  setSnaps(snaps: number[]) {
    this.snaps = snaps.length ? snaps : [0];
    const max = this.max;
    if (this.cam > max) this.cam = max;
  }
  get max() {
    return this.snaps[this.snaps.length - 1];
  }
  nearestIndex(cam = this.cam) {
    let best = 0;
    for (let i = 1; i < this.snaps.length; i++) if (Math.abs(this.snaps[i] - cam) < Math.abs(this.snaps[best] - cam)) best = i;
    return best;
  }
  private rubber(raw: number) {
    if (raw < 0) return raw * RUBBER;
    if (raw > this.max) return this.max + (raw - this.max) * RUBBER;
    return raw;
  }

  /* drag — follows the finger directly */
  dragStart(now: number) {
    this.mode = "drag";
    this.travel = null;
    this.dragBase = this.cam;
    this.lastT = now;
    this.samples = [{ t: now, cam: this.cam }];
  }
  dragBy(totalDx: number, now: number) {
    const prev = this.cam;
    // un-rubber the base so repeated grabs past an edge stay continuous
    this.cam = this.rubber(this.dragBase + totalDx);
    const dt = Math.max(1, now - this.lastT) / 1000;
    this.vel = (this.cam - prev) / dt;
    this.lastT = now;
    this.samples.push({ t: now, cam: this.cam });
    while (this.samples.length > 2 && now - this.samples[0].t > 100) this.samples.shift();
  }
  dragEnd(now: number) {
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    let v = 0;
    if (a && b && b.t - a.t > 16 && now - b.t < 80) v = ((b.cam - a.cam) / (b.t - a.t)) * 1000;
    this.release(v);
  }

  /* wheel / trackpad */
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  wheel(delta: number, now: number) {
    if (this.mode !== "drag") this.dragStart(now);
    this.dragBase += delta;
    this.dragBy(0, now);
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => this.dragEnd(performance.now() + 1000), 140);
  }

  release(v: number) {
    v = Math.max(-MAX_RELEASE_V, Math.min(MAX_RELEASE_V, v));
    const projected = Math.max(0, Math.min(this.max, this.cam + v * MOMENTUM_S));
    this.target = this.snaps[this.nearestIndex(projected)];
    if (this.reduced) return this.goTo(this.target, 200);
    this.vel = v;
    this.mode = "spring";
  }

  /** Walk (not jump) to a cam value — Today, or a moment picked in the list. */
  goTo(cam: number, durMs?: number) {
    const d = Math.abs(cam - this.cam);
    const dur = durMs ?? (this.reduced ? 250 : Math.max(700, Math.min(3200, (d / 620) * 1000)));
    this.travel = { from: this.cam, to: cam, t0: -1, dur };
    this.target = cam;
    this.mode = "travel";
  }
  goToIndex(i: number, durMs?: number) {
    this.goTo(this.snaps[Math.max(0, Math.min(this.snaps.length - 1, i))], durMs);
  }

  /** Advance one frame. Returns true when cam changed. */
  step(dt: number, now: number): boolean {
    const before = this.cam;
    if (this.mode === "spring") {
      const a = -SPRING_K * (this.cam - this.target) - SPRING_C * this.vel;
      this.vel += a * dt;
      this.cam += this.vel * dt;
      if (Math.abs(this.cam - this.target) < 0.35 && Math.abs(this.vel) < 5) this.settle();
    } else if (this.mode === "travel" && this.travel) {
      const tr = this.travel;
      if (tr.t0 < 0) tr.t0 = now;
      const p = Math.min(1, (now - tr.t0) / tr.dur);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * p); // ease in-out: start and arrive softly
      const next = tr.from + (tr.to - tr.from) * e;
      this.vel = dt > 0 ? (next - this.cam) / dt : 0;
      this.cam = next;
      if (p >= 1) this.settle();
    } else if (this.mode === "rest") {
      this.vel = 0;
    }
    return this.cam !== before;
  }

  private settle() {
    this.cam = this.target;
    this.vel = 0;
    this.mode = "rest";
    this.travel = null;
    this.onSettle?.(this.nearestIndex());
  }
}
