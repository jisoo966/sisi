"use client";

/**
 * lib/fx — the Sísí feedback-effects system.
 *
 * Effects speak to how much a moment matters; they are never one sparkle
 * for everything. Hierarchy (quietest → most important):
 *
 *   soft       Soft Glint        a Moment saved · a World equipped ·
 *                                a Star's state changed · Picture it begins
 *   trail      Starlight Trail   a reward-eligible activity was saved
 *   birth      Star Birth        a new wish was created (no Starlight)
 *   discovery  World Discovery   a World threshold was reached
 *   bloom      Fulfilled Bloom   "Let it shine" (the most important)
 *   ambient    Ambient Magic     rare, unannounced, Journey only
 *
 * Rules shared by every effect (see components/sisi/effects):
 *   - hand-printed raster sprites (lib/fxAssets), motion by transform/opacity
 *   - ivory, pale blue, restrained coral-gold; normal blending, no neon
 *   - plays once; pauses while the app is hidden; reduced motion → fades
 *   - never over text, navigation or Sísí's face
 *   - one large effect at a time (a second waits its turn);
 *     ambient magic only while nothing else is playing
 */

export type Pt = { x: number; y: number };

export type FxEvent =
  | { kind: "soft"; at: Pt }
  | { kind: "trail"; from: Pt | null; to: Pt; amount: number; thread?: { top: Pt; bottom: Pt } | null }
  | { kind: "birth"; at: Pt }
  | { kind: "bloom"; at: Pt };

const EVENT = "sisi:fx";
type Queued = FxEvent & { id: number };
let nextId = 1;

export function emitFx(e: FxEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Queued>(EVENT, { detail: { ...e, id: nextId++ } }));
}
export function onFx(fn: (e: Queued) => void): () => void {
  const h = (ev: Event) => fn((ev as CustomEvent<Queued>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/* ── large-effect lock (read by ambient magic, set by the host) ──── */
let bigActive = 0;
export function setBigActive(on: boolean) {
  bigActive = Math.max(0, bigActive + (on ? 1 : -1));
}
export function bigEffectPlaying(): boolean {
  return bigActive > 0;
}

/* ── helpers ─────────────────────────────────────────────────────── */

/** Centre of an element (viewport px), or of the first visible match. */
export function centerOf(target: Element | string | null | undefined): Pt | null {
  if (!target) return null;
  const list = typeof target === "string" ? target.split(",").map((s) => document.querySelector(s.trim())) : [target];
  for (const el of list) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

/** Soft Glint near a control (a little above-right of it, never on its label). */
export function softGlint(target: Element | Pt | null | undefined) {
  if (!target) return;
  let at: Pt | null;
  if ("x" in (target as Pt) && "y" in (target as Pt) && !(target instanceof Element)) at = target as Pt;
  else {
    const r = (target as Element).getBoundingClientRect();
    at = { x: r.right - Math.min(18, r.width * 0.2), y: r.top + 2 };
  }
  if (at) emitFx({ kind: "soft", at });
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Where viewport (0,0) lands inside the overlay root. On desktop the phone
 * frame is transformed, so `position: fixed` there is frame-relative; effects
 * measure in viewport px and subtract this.
 */
export function overlayOrigin(): Pt {
  if (typeof document === "undefined") return { x: 0, y: 0 };
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;";
  root.appendChild(probe);
  const r = probe.getBoundingClientRect();
  probe.remove();
  return { x: r.left, y: r.top };
}
