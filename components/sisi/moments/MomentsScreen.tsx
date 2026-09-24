"use client";

import { AnimatePresence, motion as fm } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { loadTrail, type MomentItem, type RestItem } from "@/lib/moments";
import { layoutTimeline, TimelineMotion, type TrailEntry } from "@/lib/momentsTimeline";
import { BottomNavV2 } from "@/components/sisi/journey-v2/BottomNavV2";
import { MomentDetail, MomentsSharedStyles, originOf, RestDetail, type Origin } from "./shared";
import { MomentsWorld } from "./MomentsWorld";
import { MomentsList } from "./MomentsList";

/**
 * MomentsScreen — the Moments tab.
 *
 *   Memory Trail (default)  the same meadow as Journey; Sísí turns left and
 *                           walks back through what you noticed
 *   List View               warm paper over the world: search, months, jump
 *
 * The world stays mounted under the list, so returning from the list walks
 * from where you were to the Moment you picked.
 */

export function MomentsScreen() {
  const router = useRouter();
  const motion = useRef(new TimelineMotion()).current;
  const [entries, setEntries] = useState<TrailEntry[] | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [view, setView] = useState<"trail" | "list">("trail");
  const [open, setOpen] = useState<{ item: MomentItem; from: Origin } | null>(null);
  const [openRest, setOpenRest] = useState<{ item: RestItem; from: Origin } | null>(null);

  const reload = useCallback(() => {
    loadTrail().then(({ items, stars, signs }) => {
      setEntries(items.filter((i): i is TrailEntry => i.type === "moment" || i.type === "rest"));
      setStars(stars);
      setSigns(signs);
    });
  }, []);
  useEffect(reload, [reload]);

  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);
  const listPlaced = useMemo(() => (entries ? layoutTimeline(entries, 390).placed : []), [entries]);
  const viewStar = (id: string) => router.push(`/journey?to=stars&star=${id}`);

  const openEntry = (e: TrailEntry, el: Element) => {
    if (e.type === "rest") setOpenRest({ item: e, from: originOf(el) });
    else setOpen({ item: e, from: originOf(el) });
  };

  return (
    <main className="journey-stage-v2 mm-root">
      <MomentsSharedStyles />

      {entries && (
        <MomentsWorld entries={entries} motion={motion} active={view === "trail" && !open && !openRest} onOpen={openEntry} />
      )}

      <header className="mm-header">
        <h1 className="mm-title">Moments</h1>
        <button
          type="button"
          className="mm-toggle"
          aria-label={view === "trail" ? "Show as a list" : "Show the Memory Trail"}
          onClick={() => setView((v) => (v === "trail" ? "list" : "trail"))}
        >
          {view === "trail" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M9 7h10M9 12h10M9 17h10" />
              <circle cx="5" cy="7" r="0.9" fill="currentColor" />
              <circle cx="5" cy="12" r="0.9" fill="currentColor" />
              <circle cx="5" cy="17" r="0.9" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M3 16c3 0 3.5-5 7-5s3.5 4 6.5 4S20 9 21 8" />
            </svg>
          )}
        </button>
      </header>

      <AnimatePresence>
        {view === "list" && entries && (
          <fm.div
            key="list"
            className="mm-list-wrap"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MomentsList
              placed={listPlaced}
              onPick={(i) => {
                setView("trail");
                motion.goToIndex(i);
              }}
            />
          </fm.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <MomentDetail
            key={open.item.key}
            item={open.item}
            from={open.from}
            star={open.item.starId ? starById.get(open.item.starId) : undefined}
            onClose={() => setOpen(null)}
            onViewStar={viewStar}
            onSaved={() => {
              setOpen(null);
              reload();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {openRest && (
          <RestDetail
            key={openRest.item.key}
            item={openRest.item}
            from={openRest.from}
            moments={signs.filter((s) => s.starId === openRest.item.star.id)}
            onClose={() => setOpenRest(null)}
            onReturned={() => {
              setOpenRest(null);
              reload();
            }}
          />
        )}
      </AnimatePresence>

      <div className="journey-nav-host">
        <BottomNavV2 theme="light" activeTab="moments" />
      </div>

      <style jsx global>{`
        .mm-root { background: #0f2233; }
        @media (min-width: 500px) {
          .mm-root { max-width: 430px; margin: 0 auto; }
        }
        .mm-header {
          position: absolute; z-index: 10; left: 0; right: 0; top: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--header-top) var(--stage-padding) 0; pointer-events: none;
        }
        .mm-title {
          margin: 0; font-family: var(--font-fraunces), Georgia, serif; font-weight: 400;
          font-size: clamp(32px, 9.5vw, 40px); letter-spacing: -0.01em; color: #1d2744;
        }
        .mm-toggle {
          pointer-events: auto; width: var(--icon-btn-size); height: var(--icon-btn-size); border-radius: 50%; border: 0;
          background: #f7f2e3; color: #2b2f45; display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(10, 18, 30, 0.2); cursor: pointer;
        }
        .mm-toggle svg { width: 21px; height: 21px; }
        .mm-list-wrap { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
        .mm-list-wrap > * { pointer-events: auto; }
      `}</style>
    </main>
  );
}
