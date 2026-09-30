/**
 * lib/journeyWorld — what keeps the Journey one living, continuous world.
 *
 *   seeded variety   every walk is a little different (seed = local date +
 *                    this app session), but nothing reshuffles within a
 *                    session: each layer draws from its own stable stream
 *   coordinator      layers respect each other: no flower patch while a big
 *                    tree passes, no new foreground while Sísí is talking or
 *                    about to look up at the Stars
 *   continuity       each layer's live objects and scheduler state are kept
 *                    in memory, so leaving for Moments / Stars and coming
 *                    back continues the same world instead of a new one
 *   low power        fewer clouds and flora on weaker devices
 *
 * All motion still comes from the ONE shared clock (lib/worldMotion).
 */

/* ── seeded randomness ─────────────────────────────────────────────── */

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

let sessionSeed: string | null = null;
function seedBase(): string {
  if (sessionSeed) return sessionSeed;
  let sid = "s";
  try {
    sid = sessionStorage.getItem("sisi:journey-session") ?? "";
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("sisi:journey-session", sid);
    }
  } catch {
    // ignore
  }
  sessionSeed = `${new Date().toLocaleDateString("en-CA")}:${sid}`;
  return sessionSeed;
}

export type Rng = { next: () => number; range: (a: number, b: number) => number };
/** A stable random stream for one layer (same session → same sequence). */
export function layerRng(layer: string): Rng {
  const next = mulberry32(hash(`${seedBase()}:${layer}`));
  return { next, range: (a, b) => a + next() * (b - a) };
}

/* ── coordinator ───────────────────────────────────────────────────── */

export const worldCoord = {
  /** a large foreground object is on screen (screen-x range, px) */
  frontSpan: null as null | { left: number; right: number },
  /** no new foreground objects (conversation open, Stars ascent pending) */
  holdForeground: false,
  /** testing only: pretend a tree is covering Sísí */
  testOcclude: false,
};

/** Is a foreground tree covering Sísí right now? (x = her centre, px) */
export function occludingSisi(sisiX: number, halfWidth: number): boolean {
  if (worldCoord.testOcclude) return true;
  const s = worldCoord.frontSpan;
  return !!s && s.right > sisiX - halfWidth && s.left < sisiX + halfWidth;
}

/**
 * The environment's gentle modifiers (set by the Journey from the World
 * and the weather): how many clouds, how briskly they drift.
 */
export const envCoord = {
  /** × the usual number of clouds on screen (partly cloudy / cloudy / Cloud Garden) */
  cloudDensity: 1,
  /** × cloud drift speed (windy) — never shakes Sísí or the screen */
  wind: 1,
};

/* ── continuity across page visits (memory only) ──────────────────── */

const kept = new Map<string, unknown>();
export function keepLayer<T>(key: string, state: T) {
  kept.set(key, state);
}
export function restoreLayer<T>(key: string): T | undefined {
  return kept.get(key) as T | undefined;
}

/* ── device ────────────────────────────────────────────────────────── */

export function lowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 3;
}

// Inspectable in the browser (read-only use; handy for testing the world).
if (typeof window !== "undefined") (window as unknown as { __sisiWorld?: typeof worldCoord }).__sisiWorld = worldCoord;
