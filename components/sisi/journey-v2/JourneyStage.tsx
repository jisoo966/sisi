"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";

/** the first arrival of this page load (later visits are already warm) */
let arrived = false;

/**
 * JourneyStage — the responsive Journey viewport root.
 *
 * Owns the actual mobile stage (100dvh / min-h 100svh / overflow hidden).
 * Provides the CSS variables scope (defined in globals.css as .journey-stage-v2).
 *
 * All world coordinates, safe areas, cat size, typography, and FAB anchors
 * derive from CSS custom properties scoped here. Tune globally in globals.css
 * without touching component code.
 */
export function JourneyStage({
  children,
  phaseClass,
}: {
  children: ReactNode;
  /** Optional phase class ("phase-walking" | "phase-star-view"). Drives
   *  the sky-group + landscape-group translateY animation defined in
   *  globals.css. Provided by useJourneyPhase(). */
  phaseClass?: string;
}) {
  const cls = phaseClass
    ? `journey-stage-v2 ${phaseClass}`
    : "journey-stage-v2";
  const ref = useRef<HTMLElement>(null);
  // Opening the app: the sky, the meadow and Sísí appear together, once
  // their pictures are ready (never the background first and Sísí after).
  // Only on a cold start; at most 1.5s; moving between tabs is never held.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || arrived) return;
    arrived = true;
    if (performance.now() > 6000) return;
    el.classList.add("is-arriving");
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      el.classList.remove("is-arriving");
    };
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>(".journey-world-layer img"));
    const ready = imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : img.decode?.().catch(() => undefined) ?? new Promise<void>((r) => img.addEventListener("load", () => r(), { once: true })),
    );
    // the fox's walk sheet is a background image: wait a breath for it too
    Promise.all([...ready, new Promise((r) => setTimeout(r, 120))]).then(() => requestAnimationFrame(show));
    const t = setTimeout(show, 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <main ref={ref} className={cls}>
      {children}
    </main>
  );
}

/**
 * WorldLayer — everything that can move (background, clouds, cat, foreground).
 * position:absolute inset:0. pointer-events:none by default so world doesn't
 * intercept taps; opt in per child (e.g. SkyStar link).
 */
export function WorldLayer({ children }: { children: ReactNode }) {
  return <div className="journey-world-layer">{children}</div>;
}

/**
 * UILayer — everything that stays stationary (greeting, capture, sheets).
 * Above the world in z-order. Container is pointer-events:none, direct
 * children auto (defined in globals.css). World animation never touches UI.
 */
export function UILayer({ children }: { children: ReactNode }) {
  return <div className="journey-ui-layer">{children}</div>;
}
