"use client";

import { elementCenter, type AnchorName, type Pt } from "@/lib/fxAnchors";

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
 *   discovery  World Discovery   a World threshold was reached (JourneyReveal)
 *   bloom      Fulfilled Bloom   "Let it shine" (the most important)
 *   ambient    Ambient Magic     rare, unannounced, Journey only
 *
 * Every effect plays in ONE viewport layer (#sisi-effects-layer, fixed,
 * directly under <body>) and is placed from real element anchors
 * (lib/fxAnchors) read when the effect begins. If an anchor is missing,
 * the effect is skipped — never drawn at (0, 0).
 *
 * Rules shared by every effect (components/sisi/effects/EffectsHost):
 *   - one cropped sprite per element (lib/fxAssets); transform + opacity only
 *   - ivory, pale blue, restrained coral-gold; normal blending, no neon
 *   - plays once; pauses while the app is hidden; reduced motion → fades
 *   - clamped into the effects safe area
 *   - one large effect at a time; ambient only while nothing else plays
 */

export type { Pt } from "@/lib/fxAnchors";
export type AmbientKind = "firefly" | "petal" | "grass" | "dust" | "shooting";

export type FxEvent =
  /** at a control: x = its centre, y = its top − 8px (resolved at emit time) */
  | { kind: "soft"; at: Pt }
  /** from the selected Star to Sísí (or the Starlight counter) */
  | { kind: "trail"; amount: number }
  /** at the exact place the new Star will remain; that element is hidden until the last frame */
  | { kind: "birth"; anchor: AnchorName; hideAnchor?: boolean; delay?: number; onDone?: () => void }
  /** on the selected Star */
  | { kind: "bloom"; delay?: number }
  /** one small unannounced thing (the Journey scheduler, or debug) */
  | { kind: "ambient"; variant?: AmbientKind };

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
let bigActive = false;
export function setBigActive(on: boolean) {
  bigActive = on;
}
export function bigEffectPlaying(): boolean {
  return bigActive;
}

/* ── helpers ─────────────────────────────────────────────────────── */

/**
 * Where a control's Soft Glint goes: x = its centre, y = its top − 8px.
 * Read it at click time when the control may disappear before the action
 * completes (a Save button that closes its paper), then pass the point to
 * softGlint() once the save succeeded.
 */
export function glintPoint(control: Element | null | undefined): Pt | null {
  const c = elementCenter(control);
  if (!c || !control) return null;
  return { x: c.x, y: control.getBoundingClientRect().top - 8 };
}

/** Soft Glint at a control (or a point from glintPoint). No anchor → no glint. */
export function softGlint(control: Element | Pt | null | undefined) {
  if (!control) return;
  const at = control instanceof Element ? glintPoint(control) : control;
  if (at) emitFx({ kind: "soft", at });
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The single viewport-level effects layer, created directly under <body>. */
export function effectsLayer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById("sisi-effects-layer");
  if (!el) {
    el = document.createElement("div");
    el.id = "sisi-effects-layer";
    el.setAttribute("aria-hidden", "true");
    // above the illustrated world, below modals, buttons and navigation
    el.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100dvh;overflow:hidden;pointer-events:none;z-index:60;contain:strict;";
    document.body.appendChild(el);
  }
  return el;
}
