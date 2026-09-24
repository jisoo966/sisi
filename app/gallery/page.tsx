"use client";

import { MomentsScreen } from "@/components/sisi/moments/MomentsScreen";

export const dynamic = "force-dynamic";

/**
 * /gallery — Moments: the horizontal Memory Trail (walk left into the past)
 * with a List View. Earlier versions are kept at /gallery-trail-vertical
 * (MemoryTrail.tsx) and /gallery-legacy.
 */
export default function GalleryPage() {
  return <MomentsScreen />;
}
