"use client";

import { AnimatePresence, motion as fm } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { loadTrail, type MomentItem, type RestItem } from "@/lib/moments";
import { layoutTimeline, TimelineMotion, type TrailEntry } from "@/lib/momentsTimeline";
import { FilterChip, IconButton, IconClose, IconList, MemoryPaper, StickerNavigation } from "@/components/ds";
import { MomentDetail, MomentsSharedStyles, originOf, RestDetail, type Origin } from "./shared";
import { MomentsWorld, type MomentsWorldHandle } from "./MomentsWorld";
import { clearHandoff, handOff, readHandoff } from "@/lib/worldHandoff";
import { MomentsList } from "./MomentsList";
import { onMomentsChanged } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { walkingStars } from "@/lib/myStars";

/** Keep the first version simple: everything · connected to a Star · photos. */
type Filter = "all" | "stars" | "photos";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stars", label: "Stars" },
  { key: "photos", label: "Photos" },
];

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

const NO_ENTRIES: TrailEntry[] = [];

export function MomentsScreen() {
  const router = useRouter();
  const motion = useRef(new TimelineMotion()).current;
  const [entries, setEntries] = useState<TrailEntry[] | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [view, setView] = useState<"trail" | "list">("trail");
  const [open, setOpen] = useState<{ item: MomentItem; from: Origin } | null>(null);
  const [openRest, setOpenRest] = useState<{ item: RestItem; from: Origin } | null>(null);

  // Arriving from the Journey: continue from the exact frame it left.
  const [arrival] = useState(() => readHandoff("moments"));
  useEffect(() => {
    if (!arrival) return;
    const t = setTimeout(clearHandoff, 1600);
    return () => clearTimeout(t);
  }, [arrival]);
  const worldRef = useRef<MomentsWorldHandle>(null);
  const [leaving, setLeaving] = useState(false);
  const [turned, setTurned] = useState(false);
  const [headerIn, setHeaderIn] = useState(!arrival);
  // From the Stars the header and tabs wait until the ground comes into view
  // (onGround); from the Journey they follow the reframe.
  const fromStars = arrival?.via === "stars";
  const [navIn, setNavIn] = useState(!fromStars);
  useEffect(() => {
    if (!arrival || fromStars) return;
    const t = setTimeout(() => setHeaderIn(true), 260);
    return () => clearTimeout(t);
  }, [arrival, fromStars]);

  /** Moments → Journey (or on to Stars): "I looked back for a moment. Now
   *  I'm ready to keep going." The memories settle away, Sísí turns right,
   *  the camera returns to the Journey framing, and the Journey continues
   *  from this exact frame. */
  const leaveTo = async (href: string) => {
    if (leaving) return;
    setLeaving(true);
    setOpen(null);
    setOpenRest(null);
    if (view === "list") {
      setView("trail"); // the paper closes downward, like a journal
      await new Promise((r) => setTimeout(r, 380));
    }
    const w = worldRef.current;
    if (!w) {
      router.push(href);
      return;
    }
    const ground = await w.leave(() => setTurned(true));
    handOff("journey", ground);
    router.push(href);
  };

  const reload = useCallback(() => {
    loadTrail().then(({ items, stars, signs }) => {
      setEntries(items.filter((i): i is TrailEntry => i.type === "moment" || i.type === "rest"));
      setStars(stars);
      setSigns(signs);
    });
  }, []);
  useEffect(reload, [reload]);
  // Edited / deleted / connected anywhere → every view shows the same record.
  useEffect(() => onMomentsChanged(reload), [reload]);

  const [filter, setFilter] = useState<Filter>("all");
  const shown = useMemo(() => {
    if (!entries || filter === "all") return entries;
    return entries.filter((e) =>
      filter === "stars" ? (e.type === "moment" ? !!e.starId : true) : e.type === "moment" && !!e.image,
    );
  }, [entries, filter]);
  const pickFilter = (f: Filter) => {
    if (f === filter) return;
    motion.jumpTo(0); // a different set of Moments: start again at Today
    setFilter(f);
  };

  // First visit: one quiet explanation (never again once dismissed, or once
  // the user has captured their first Moment).
  const [explain, setExplain] = useState(false);
  // (Journey Capture marks it done when the user saves their first Moment.)
  useEffect(() => {
    if (!entries) return;
    setExplain(!hintDone("moments"));
  }, [entries]);

  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);
  const listPlaced = useMemo(() => (shown ? layoutTimeline(shown, 390).placed : []), [shown]);
  const viewStar = (id: string) => router.push(`/journey?to=stars&star=${id}`);

  const openEntry = (e: TrailEntry, el: Element) => {
    if (e.type === "rest") setOpenRest({ item: e, from: originOf(el) });
    else setOpen({ item: e, from: originOf(el) });
  };

  return (
    <main className={`journey-stage-v2 mm-root${arrival ? " jl-handoff" : ""}`}>
      <MomentsSharedStyles />

      {/* The world is drawn from the first frame (sky, meadow, Sísí); the
          memories join as soon as they have loaded. */}
      {(
        <MomentsWorld
          ref={worldRef}
          entries={shown ?? NO_ENTRIES}
          onStar={(id) => viewStar(id)}
          loaded={entries !== null}
          motion={motion}
          arrival={arrival}
          onGround={() => {
            setHeaderIn(true);
            setNavIn(true);
          }}
          active={view === "trail" && !open && !openRest && !leaving}
          onOpen={openEntry}
        />
      )}

      <header className={`mm-header${headerIn && !turned ? "" : " is-out"}`}>
        <h1 className="ds-screen-title mm-title">Moments</h1>
        <IconButton
          filled
          className="mm-toggle"
          label={view === "trail" ? "Show as a list" : "Show the Memory Trail"}
          onClick={() => !leaving && setView((v) => (v === "trail" ? "list" : "trail"))}
        >
          {view === "trail" ? (
            <IconList />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M3 16c3 0 3.5-5 7-5s3.5 4 6.5 4S20 9 21 8" />
            </svg>
          )}
        </IconButton>
      </header>

      {/* filters */}
      <div className={`mm-filters ds-chip-row${headerIn && !turned ? "" : " is-out"}`} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <FilterChip key={f.key} surface="sky" selected={filter === f.key} onClick={() => pickFilter(f.key)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {/* first visit: what Moments is */}
      <AnimatePresence>
        {explain && headerIn && !turned && view === "trail" && (
          <fm.div
            key="explain"
            className="mm-explain"
            role="note"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.22 } }}
          >
            <MemoryPaper compact title="Your life along the way" text="Moments you capture and reflections you add to your Stars live here.">
              <IconButton
                className="mm-explain-x"
                label="Got it"
                onClick={() => {
                  markHint("moments");
                  setExplain(false);
                }}
              >
                <IconClose size={18} />
              </IconButton>
            </MemoryPaper>
          </fm.div>
        )}
      </AnimatePresence>

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
            stars={walkingStars(stars)}
            onClose={() => setOpen(null)}
            onViewStar={viewStar}
            onSaved={() => {
              reload();
            }}
            onDeleted={() => {
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

      <div className={`ds-nav-host journey-nav-host mm-nav${navIn ? "" : " is-waiting"}`}>
        <StickerNavigation
          activeTab={turned ? "journey" : "moments"}
          still={!!arrival}
          dock={navIn ? "ground" : "sky"}
          onJourneySelect={() => leaveTo("/journey")}
          onStarsSelect={() => leaveTo("/journey?to=stars")}
          onMomentsSelect={() => {
            if (view === "list" && !leaving) setView("trail");
          }}
        />
      </div>

      <style jsx global>{`
        .mm-root { background: var(--sisi-ink); }
        @media (min-width: 500px) {
          .mm-root { max-width: 430px; margin: 0 auto; }
        }
        .mm-header {
          position: absolute; z-index: 10; left: 0; right: 0; top: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--header-top) var(--stage-padding) 0; pointer-events: none;
          transition: opacity 420ms ease;
        }
        .mm-header.is-out { opacity: 0; }
        .mm-filters {
          position: absolute; z-index: 10; left: var(--stage-padding); right: var(--stage-padding); top: calc(var(--header-top) + 56px);
          transition: opacity 420ms ease;
        }
        .mm-filters.is-out { opacity: 0; pointer-events: none; }
        .mm-explain {
          position: absolute; z-index: 10; left: var(--stage-padding); right: var(--stage-padding);
          top: calc(var(--header-top) + 104px);
        }
        .mm-explain .ds-memory-sheet { padding-right: 52px; }
        .mm-explain-x { position: absolute; right: 4px; top: 6px; }
        .mm-nav { transition: opacity 360ms ease; }
        /* arriving from the Stars: the dock stays faintly visible (and
           locked) under the clouds, then clears as the ground appears */
        .mm-nav.is-waiting { opacity: 0.25; pointer-events: none; }
        .mm-nav.is-waiting * { pointer-events: none !important; }
        .mm-header.is-out * { pointer-events: none !important; }
        .mm-title { margin: 0; color: var(--sisi-ink); }
        .mm-header .mm-toggle { pointer-events: auto; }
        .mm-list-wrap { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
        .mm-list-wrap > * { pointer-events: auto; }
      `}</style>
    </main>
  );
}
