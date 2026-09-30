"use client";

/**
 * lib/fxAnchors — where effects begin and end, in viewport coordinates.
 *
 * Components register their real elements with ref callbacks:
 *
 *   <div ref={(el) => fxAnchorRef("sisi", el, { fx: 0.5, fy: 0.6 })} />
 *
 * Anchors: "selectedStar" · "sisi" · "starlightCounter" · "star:<id>".
 * Several elements may share a name (the sky Star and the open Star paper);
 * the most recently registered one that is actually visible wins.
 *
 * The effects layer is `position: fixed; inset: 0` directly under <body>,
 * so getBoundingClientRect() is already in its coordinate space: no scroll
 * offsets, no parent offsets, no transforms are ever added.
 */

export type Pt = { x: number; y: number };
export type AnchorName = "selectedStar" | "sisi" | "starlightCounter" | `star:${string}`;

/** which point of the element counts as "the" point (fractions of its box) */
export type AnchorPoint = { fx: number; fy: number };

type Entry = { el: HTMLElement; point: AnchorPoint; seq: number };
const registry = new Map<string, Entry[]>();
let seq = 0;

/**
 * Ref-callback helper. Pass `active = false` to keep an element mounted but
 * not count it (e.g. a sky Star that is no longer the selected one).
 */
export function fxAnchorRef(name: AnchorName, el: HTMLElement | null, point: AnchorPoint = { fx: 0.5, fy: 0.5 }, active = true) {
  if (!el) return; // unmounted elements are pruned on read (isConnected)
  const list = (registry.get(name) ?? []).filter((e) => e.el !== el && e.el.isConnected);
  if (active) {
    const prev = registry.get(name)?.find((e) => e.el === el);
    list.push({ el, point, seq: prev?.seq ?? ++seq });
  }
  registry.set(name, list);
}

function visible(el: HTMLElement): DOMRect | null {
  if (!el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return null;
  const check = (el as HTMLElement & { checkVisibility?: (o: object) => boolean }).checkVisibility;
  if (check && !check.call(el, { opacityProperty: true, visibilityProperty: true })) return null;
  return r;
}

/** The registered element for a name that is mounted and visible right now. */
export function anchorElement(name: AnchorName): { el: HTMLElement; rect: DOMRect; point: AnchorPoint } | null {
  const list = (registry.get(name) ?? []).filter((e) => e.el.isConnected);
  registry.set(name, list);
  for (const e of [...list].sort((a, b) => b.seq - a.seq)) {
    const rect = visible(e.el);
    if (rect) return { el: e.el, rect, point: e.point };
  }
  return null;
}

/** Viewport point of an anchor, or null (then the effect is skipped). */
export function anchorPoint(name: AnchorName): Pt | null {
  const a = anchorElement(name);
  if (!a) return null;
  return { x: a.rect.left + a.rect.width * a.point.fx, y: a.rect.top + a.rect.height * a.point.fy };
}

/** Centre of any element (a control), or null when it has no box. */
export function elementCenter(el: Element | null | undefined): Pt | null {
  if (!el || !(el as HTMLElement).isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* ── the safe area every effect is clamped into ────────────────────── */

export type Bounds = { left: number; right: number; top: number; bottom: number; width: number; height: number; insetTop: number; insetBottom: number };

let insetProbe: HTMLDivElement | null = null;
function insets(): { top: number; bottom: number } {
  if (!insetProbe) {
    insetProbe = document.createElement("div");
    insetProbe.setAttribute("aria-hidden", "true");
    insetProbe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);";
    document.body.appendChild(insetProbe);
  }
  const cs = getComputedStyle(insetProbe);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

/**
 * horizontal 24px … width − 24px;
 * vertical safe-top + 24px … height − safe-bottom − 96px
 */
export function safeBounds(): Bounds {
  const width = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
  const height = window.innerHeight;
  const i = insets();
  return { left: 24, right: width - 24, top: i.top + 24, bottom: height - i.bottom - 96, width, height, insetTop: i.top, insetBottom: i.bottom };
}

const clamp = (lo: number, v: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/** Keep an effect of the given radius fully inside the safe area. */
export function clampPt(p: Pt, radius: number, b: Bounds = safeBounds()): Pt {
  return { x: clamp(b.left + radius, p.x, b.right - radius), y: clamp(b.top + radius, p.y, b.bottom - radius) };
}

/**
 * Wait until an anchor has stopped moving (a sheet sliding, a screen
 * transition) — rect read every 80ms until two reads agree, at most ~1s.
 * Called once when an effect begins, never during it.
 */
export async function settledAnchor(name: AnchorName, maxMs = 1000): Promise<Pt | null> {
  let last = anchorPoint(name);
  const start = performance.now();
  while (performance.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 80));
    const now = anchorPoint(name);
    if (!now) return null;
    if (last && Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5) return now;
    last = now;
  }
  return last;
}
