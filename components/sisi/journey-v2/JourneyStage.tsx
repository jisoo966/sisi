"use client";

import { ReactNode } from "react";

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
  return <main className={cls}>{children}</main>;
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
