"use client";

import { useEffect, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { loadSigns, loadStars } from "@/lib/myStars";

/**
 * WrittenMoments — the words noticed along the way (one-sentence practices,
 * signs, evening reflections, what was kept from a talk with SiSi), each
 * shown with the Star it belongs to. Newest first.
 */
export function WrittenMoments() {
  const [items, setItems] = useState<{ sign: Sign; star?: Star }[] | null>(null);

  useEffect(() => {
    Promise.all([loadSigns(), loadStars()]).then(([signs, stars]) => {
      const byId = new Map(stars.map((s) => [s.id, s]));
      setItems(
        signs
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((sign) => ({ sign, star: byId.get(sign.starId) })),
      );
    });
  }, []);

  if (items === null) return null;
  if (items.length === 0) {
    return (
      <p className="font-sentient text-[15px] italic text-journey-navy/55 mt-10 text-center">
        your moments will gather here as you walk.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(({ sign, star }) => (
        <div
          key={sign.id}
          className="rounded-[6px] bg-[#fbf6ea] px-5 py-4 shadow-[0_2px_10px_rgba(31,42,68,0.08)]"
          style={{ clipPath: EDGE }}
        >
          <p className="font-sentient text-[12px] text-journey-navy/55">{formatWhen(sign.createdAt)}</p>
          <p className="font-sentient text-[17px] leading-snug text-journey-navy/90 mt-1">{sign.text}</p>
          {star && (
            <p className="font-sentient text-[12px] italic text-journey-navy/50 mt-2">✦ {star.wish}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const EDGE =
  "polygon(0% 1.5%, 12% 0%, 30% 1.2%, 48% 0%, 66% 1.4%, 84% 0%, 100% 1%, 99.5% 50%, 100% 99%, 80% 100%, 58% 98.8%, 36% 100%, 16% 98.9%, 0% 100%, 0.5% 50%)";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`.toLowerCase();
  } catch {
    return "";
  }
}
