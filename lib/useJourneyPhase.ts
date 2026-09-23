"use client";

import { useCallback, useState } from "react";

/**
 * useJourneyPhase — the Journey world's top-level state machine.
 *
 * Phases:
 *   walking    — normal Journey. Cat walks toward the star in upper-right.
 *                Panorama drifts. Sky group parked at bottom of sky asset (day).
 *   star-view  — camera "looked up". Landscape has translated off-screen,
 *                sky asset has translated so celestial section fills viewport.
 *                Cat is IDLE; star is centered; StarView UI is visible.
 *
 * Architecturally we keep the door open for an intermediate LOOK_UP state
 * (cat animation asset) — right now the transition itself is CSS-driven
 * so no explicit intermediate phase is needed. When the LOOK_UP fox asset
 * arrives we can insert a transient phase and time the animation to
 * --look-up-duration without changing the transform math.
 */
export type JourneyPhase = "walking" | "star-view";

export function useJourneyPhase(initial: JourneyPhase = "walking") {
  const [phase, setPhase] = useState<JourneyPhase>(initial);

  const enterStarView = useCallback(() => setPhase("star-view"), []);
  const backToWalking = useCallback(() => setPhase("walking"), []);

  return {
    phase,
    enterStarView,
    backToWalking,
    isWalking: phase === "walking",
    isStarView: phase === "star-view",
    /** Convenience class to apply on JourneyStage — drives sky/landscape groups. */
    stageClass: phase === "star-view" ? "phase-star-view" : "phase-walking",
  };
}
