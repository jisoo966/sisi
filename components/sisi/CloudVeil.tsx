"use client";

import { useEffect, useState } from "react";
import { onVeil, veilState, type VeilState } from "@/lib/cloudVeil";

/**
 * The clouds of the onboarding → Journey descent (see lib/cloudVeil.ts).
 * The same soft cloud banks as the Stars ⇄ Journey move. The camera goes
 * down, so the clouds move up: from below the screen, across it, out the top.
 */
export function CloudVeil() {
  const [s, setS] = useState<VeilState>("none");
  useEffect(() => {
    setS(veilState());
    return onVeil(setS);
  }, []);
  if (s === "none") return null;
  return (
    <div className={`cloud-veil is-${s}`} aria-hidden>
      <img src="/V2/ascent/cloud-bank-rear-v3.webp" alt="" className="cv-bank cv-rear" draggable={false} />
      <img src="/V2/ascent/cloud-bank-front-v3.webp" alt="" className="cv-bank cv-front" draggable={false} />
    </div>
  );
}
