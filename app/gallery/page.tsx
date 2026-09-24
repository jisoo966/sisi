"use client";

import { MemoryTrail } from "@/components/sisi/moments/MemoryTrail";

export const dynamic = "force-dynamic";

/**
 * /gallery — Moments, as a Memory Trail.
 * The previous gallery is kept at /gallery-legacy (app/gallery-legacy/page.tsx).
 */
export default function GalleryPage() {
  return <MemoryTrail />;
}
