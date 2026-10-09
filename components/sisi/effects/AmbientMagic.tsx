"use client";

import { useEffect, useRef } from "react";
import { bigEffectPlaying, emitFx, prefersReducedMotion, type AmbientKind } from "@/lib/fx";

/**
 * AmbientMagic — the scheduler for rare, unannounced small things on the
 * open Journey. No copy, no numbers, nothing to tap. One at a time, 20–40s
 * apart, only while nothing else is playing and the Journey is
 * unobstructed. The EffectsHost chooses a point inside the allowed sky /
 * ground zones (never near Sísí's face, the navigation, a paper or the
 * viewport edges) and draws it in the effects layer.
 * Skipped entirely with reduced motion.
 */

function pick(evening: boolean): AmbientKind {
  const r = Math.random();
  // (no petals: a petal crossing the open sky with nothing to fall from reads as a stray)
  // fireflies, drifting dust and shooting stars belong to the evening
  if (evening) return r < 0.04 ? "shooting" : r < 0.6 ? "firefly" : r < 0.82 ? "dust" : "grass";
  // daylight: only the glint on the grass (a drifting glow dot reads as a smudge)
  return "grass";
}

export function AmbientMagic({ enabled, evening = false }: { enabled: boolean; evening?: boolean }) {
  const on = useRef(enabled);
  on.current = enabled;

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(fire, 20000 + Math.random() * 20000);
    };
    const fire = () => {
      if (!on.current || bigEffectPlaying() || document.hidden || document.documentElement.classList.contains("app-hidden")) {
        t = setTimeout(fire, 6000); // try again a little later
        return;
      }
      emitFx({ kind: "ambient", variant: pick(evening) });
      schedule();
    };
    schedule();
    return () => clearTimeout(t);
  }, [enabled, evening]);

  return null;
}
