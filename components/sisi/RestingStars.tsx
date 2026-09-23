"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { loadSignsForStar, unrestStar } from "@/lib/myStars";

/**
 * RestingStars — stars that were let to rest. They left the Star path but
 * stay here in Moments, and can return to the sky at any time.
 *
 *   list    paper rows: date · time, the wish, a small "resting" mark
 *   detail  tap a row → it opens in place: moments, "this star is resting.",
 *           "return to the sky"
 */
export function RestingStars({
  stars,
  onReturned,
}: {
  stars: Star[];
  onReturned: (star: Star) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (stars.length === 0) {
    return (
      <p className="font-sentient text-[15px] italic text-journey-navy/55 mt-10 text-center">
        no stars are resting right now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stars.map((star) => (
        <RestingRow
          key={star.id}
          star={star}
          open={openId === star.id}
          onToggle={() => setOpenId((v) => (v === star.id ? null : star.id))}
          onReturned={onReturned}
        />
      ))}
    </div>
  );
}

function RestingRow({
  star,
  open,
  onToggle,
  onReturned,
}: {
  star: Star;
  open: boolean;
  onToggle: () => void;
  onReturned: (star: Star) => void;
}) {
  const [signs, setSigns] = useState<Sign[] | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (!open || signs) return;
    loadSignsForStar(star.id).then(setSigns).catch(() => setSigns([]));
  }, [open, signs, star.id]);

  return (
    <motion.div
      layout
      className="relative rounded-[6px] bg-[#fbf6ea] px-5 py-4 shadow-[0_2px_10px_rgba(31,42,68,0.08)]"
      style={{ clipPath: ROW_EDGE }}
      transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
    >
      <button type="button" onClick={onToggle} className="block w-full text-left" aria-expanded={open}>
        <p className="font-sentient text-[12px] text-journey-navy/55">{formatWhen(star.createdAt)}</p>
        <p className="font-sentient text-[18px] leading-snug text-journey-navy/90 mt-1 pr-16">{star.wish}</p>
        <span className="absolute right-4 top-4 rounded-full bg-journey-ice/60 px-3 py-[3px] font-sentient text-[12px] text-journey-cobalt">
          resting
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-journey-navy/10 pt-3">
              {signs === null ? (
                <p className="font-sentient text-[14px] italic text-journey-navy/50">…</p>
              ) : signs.length === 0 ? (
                <p className="font-sentient text-[14px] italic text-journey-navy/50">no moments were kept for this star.</p>
              ) : (
                signs.slice(0, 5).map((s) => (
                  <div key={s.id} className="mb-2">
                    <p className="font-sentient text-[11px] text-journey-navy/50">{formatWhen(s.createdAt)}</p>
                    <p className="font-sentient text-[15px] text-journey-navy/85">{s.text}</p>
                  </div>
                ))
              )}
              <p className="font-sentient text-[14px] text-journey-navy/70 text-center mt-3">this star is resting.</p>
              <button
                type="button"
                disabled={returning}
                onClick={async () => {
                  setReturning(true);
                  await unrestStar(star.id);
                  onReturned(star);
                }}
                className="mt-3 h-[44px] w-full rounded-full bg-journey-cobalt font-sentient text-[16px] text-[#f7f2e3] disabled:opacity-60"
              >
                return to the sky
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const ROW_EDGE =
  "polygon(0% 2%, 10% 0%, 25% 1.5%, 42% 0%, 60% 1.8%, 78% 0%, 92% 1.2%, 100% 0%, 99.4% 30%, 100% 70%, 99.3% 100%, 82% 98.5%, 64% 100%, 45% 98.4%, 26% 100%, 9% 98.6%, 0% 100%, 0.6% 60%)";

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
