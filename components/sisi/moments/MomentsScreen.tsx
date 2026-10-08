"use client";

import { AnimatePresence, motion as fm } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { isRealPhoto, loadTrail, type MomentItem, type RestItem } from "@/lib/moments";
import { layoutTimeline, TimelineMotion, type TrailEntry } from "@/lib/momentsTimeline";
import { FilterChip, IconButton, IconFilter, SegmentedSwitch, StarGlyph, IconClose, IconLandscape, IconList, IconSearch, StickerNavigation, TextAction } from "@/components/ds";
import { MomentDetail, MomentsSharedStyles, originOf, RestDetail, type Origin } from "./shared";
import { MomentsWorld, type MomentsWorldHandle } from "./MomentsWorld";
import { clearHandoff, handOff, readHandoff } from "@/lib/worldHandoff";
import { MomentsList } from "./MomentsList";
import { onMomentsChanged } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { walkingStars } from "@/lib/myStars";

import { KINDS, MomentsFilter, kindOf, type MomentsFilterValue } from "./MomentsFilter";

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

  // Opening Moments shows every Moment. Finding (by wish, by kind) is only
  // in the filter sheet; while one is on, a chip says what is shown.
  const [find, setFind] = useState<MomentsFilterValue>({ wish: null, kind: null });
  const [findOpen, setFindOpen] = useState(false);
  const starFilter = find.wish;
  useEffect(() => {
    // from a Star's screen ("See your steps"): that wish's Moments, as a list
    const id = new URLSearchParams(window.location.search).get("star");
    if (!id) return;
    setFind({ wish: id, kind: null });
    setView("list");
  }, []);
  // Search opens only when asked for (browsing by date comes first).
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const openSearch = () => {
    if (leaving) return;
    setView("list");
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 60);
  };
  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };
  const matches = useCallback(
    (v: MomentsFilterValue) =>
      (entries ?? []).filter(
        (e) => (!v.wish && !v.kind) || (e.type === "moment" && (!v.wish || e.starId === v.wish) && (!v.kind || kindOf(e) === v.kind)),
      ),
    [entries],
  );
  const shown = useMemo(() => (entries ? matches(find) : entries), [entries, find, matches]);
  const applyFind = (v: MomentsFilterValue) => {
    setFindOpen(false);
    if (v.wish === find.wish && v.kind === find.kind) return;
    motion.jumpTo(0); // a different set of Moments: start again at Today
    setFind(v);
    // leaving one Star's history: the address no longer names it
    if (!v.wish && window.location.search.includes("star=")) router.replace("/gallery", { scroll: false });
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
          // first visit: Sísí says what Moments is (her bubble — no card)
          hello={explain && view === "trail"}
          onHelloDone={() => {
            markHint("moments");
            setExplain(false);
          }}
        />
      )}

      <header className={`mm-header${headerIn && !turned ? "" : " is-out"}`}>
        <h1 className="ds-screen-title mm-title">Moments</h1>
      </header>

      {/* filters */}
      {/* on the trail the row rests on the sky; in the list it sits at the top
          of the paper, with the list it filters (search takes its place) */}
      <div
        className={`mm-filters ds-chip-row${headerIn && !turned ? "" : " is-out"}${view === "list" ? " is-on-paper" : ""}${view === "list" && searchOpen ? " is-searching" : ""}`}
        role="group"
        aria-label="Find"
      >
        {/* how to see them (left) · what to see (right): one row of tools under the title */}
        <SegmentedSwitch
          label="See your Moments as"
          surface={view === "list" ? "paper" : "sky"}
          className="mm-view"
          value={view}
          onChange={(v) => {
            if (leaving) return;
            if (v === "trail") closeSearch();
            setView(v);
          }}
          options={[
            { value: "trail", label: "Trail", icon: <IconLandscape /> },
            { value: "list", label: "List", icon: <IconList /> },
          ]}
        />
        {/* what is shown, only while a filter is on (× returns to everything) */}
        {find.wish && (
          <FilterChip
            surface={view === "list" ? "paper" : "sky"}
            selected
            className="mm-star-chip"
            onClick={() => applyFind({ ...find, wish: null })}
          >
            <StarGlyph size={12} />
            <span className="mm-star-chip-label">{starById.get(find.wish)?.wish ?? "This Star"}</span>
            <IconClose size={14} />
            <span className="sr-only">Show all wishes</span>
          </FilterChip>
        )}
        {find.kind && (
          <FilterChip surface={view === "list" ? "paper" : "sky"} selected className="mm-star-chip" onClick={() => applyFind({ ...find, kind: null })}>
            <span className="mm-star-chip-label">{KINDS.find((k) => k.key === find.kind)?.label}</span>
            <IconClose size={14} />
            <span className="sr-only">Show every kind</span>
          </FilterChip>
        )}
        <span className="mm-tools">
        <IconButton
            quiet
            surface={view === "list" ? "paper" : "dark"}
            className="mm-toggle"
            label="Search your Moments"
            aria-expanded={searchOpen}
            onClick={() => (searchOpen ? searchRef.current?.focus() : openSearch())}
          >
            <IconSearch />
          </IconButton>
          <IconButton
            quiet
            surface={view === "list" ? "paper" : "dark"}
            className="mm-toggle"
            label="Find moments by wish or kind"
            aria-expanded={findOpen}
            onClick={() => !leaving && setFindOpen(true)}
          >
            <IconFilter />
          </IconButton>
        </span>
      </div>

      {/* search: a compact field beneath the filters, only when asked for */}
      <AnimatePresence>
        {searchOpen && view === "list" && headerIn && !turned && (
          <fm.div
            key="search"
            className="mm-search"
            role="search"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
          >
            <label className="mm-search-field">
              <IconSearch size={20} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                placeholder="Words, a Star, a month…"
                aria-label="Search your Moments"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" className="mm-search-clear" aria-label="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>
                  <IconClose size={20} />
                </button>
              )}
            </label>
            <TextAction className="mm-search-cancel" onClick={closeSearch}>
              Cancel
            </TextAction>
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
              hideStar={!!find.wish}
              query={searchOpen ? query : ""}
              placed={listPlaced}
              // a row opens its Moment right here (the list stays underneath)
              onPick={(i, el) => {
                const hit = listPlaced.find((p) => p.index === i);
                if (hit) openEntry(hit.item, el);
              }}
            />
          </fm.div>
        )}
      </AnimatePresence>

      {/* finding: by wish, by kind (only the wishes that have Moments) */}
      <MomentsFilter
        open={findOpen}
        value={find}
        stars={stars.filter((st) => (entries ?? []).some((e) => e.type === "moment" && e.starId === st.id))}
        count={(v) => matches(v).length}
        onApply={applyFind}
        onClose={() => setFindOpen(false)}
      />

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
          onPaper={view === "list"}
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
        /* one rhythm (design-system spacing): title · 12 · tools row; the list's
           paper starts 12px under the title, its row 16px into the paper (the
           same as the writing page's top row: paper edge · 16 · 44px row) */
        .mm-root { --mm-title-h: calc(var(--text-screen-title) * 1.2); --mm-paper-top: calc(var(--header-top) + var(--mm-title-h) + var(--space-3)); }
        .mm-header {
          position: absolute; z-index: 10; left: 0; right: 0; top: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--header-top) var(--stage-padding) 0; pointer-events: none;
          transition: opacity 420ms ease;
        }
        .mm-header.is-out { opacity: 0; }
        .mm-filters {
          position: absolute; z-index: 10; left: var(--stage-padding); right: var(--stage-padding); top: calc(var(--header-top) + var(--mm-title-h) + var(--space-3)); /* 12px under the title */
          transition: opacity 420ms ease;
        }
        .mm-filters.is-out { opacity: 0; pointer-events: none; }
        .mm-nav { transition: opacity 360ms ease; }
        /* arriving from the Stars: the dock stays faintly visible (and
           locked) under the clouds, then clears as the ground appears */
        .mm-nav.is-waiting { opacity: 0.25; pointer-events: none; }
        .mm-nav.is-waiting * { pointer-events: none !important; }
        .mm-header.is-out * { pointer-events: none !important; }
        .mm-title { margin: 0; color: var(--on-sky); transition: color 4s ease; } /* the sky's colour rule */
        .mm-tools .ds-icon-btn { color: var(--on-sky); }
        /* list view: the paper rises to just under the title; the filters,
           tools and search sit at its top, with the list */
        .mm-filters { transition: top var(--motion-paper) var(--ease-sisi), opacity 300ms ease; }
        .mm-filters.is-on-paper { z-index: 21; top: calc(var(--mm-paper-top) + var(--space-4)); } /* 16px into the paper: as the writing page's top row */
        .mm-filters.is-on-paper .mm-tools .ds-icon-btn { color: var(--sisi-ink); }
        .mm-filters.is-searching { opacity: 0; pointer-events: none; }
        .mm-list-wrap { --ml-top: var(--mm-paper-top); }
        /* the list begins 16px under the tools row (16 + 44 + 16) */
        .mm-list-wrap .ml-scroll { padding-top: calc(var(--space-4) + 44px + var(--space-4)); }
        .mm-list-wrap .ml-scroll > :first-child { margin-top: 0; } /* the row above is the only space */
        .mm-filters { display: flex; align-items: center; flex-wrap: nowrap; }
        /* tools at the row's end; their 44px targets overhang so the marks sit on the gutter */
        .mm-tools { margin-left: auto; margin-right: -10px; display: inline-flex; align-items: center; gap: 1px; flex: none; }
        .mm-header .mm-title { flex: 1; min-width: 0; }
        .mm-star-chip { min-width: 0; flex: 0 1 auto; display: inline-flex; align-items: center; gap: 5px; }
        .mm-star-chip-label { min-width: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mm-view { pointer-events: auto; flex: none; }
        .mm-search {
          position: absolute; z-index: 22; left: var(--stage-padding); right: calc(var(--stage-padding) - 8px);
          top: calc(var(--mm-paper-top) + var(--space-4)); /* exactly the tools row's line, on the paper */
          display: flex; align-items: center; gap: 2px;
        }
        .mm-search-field {
          flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 6px 0 14px;
          border-radius: 14px; background: none; color: var(--ink-60);
          /* the design system's hand-drawn field */
          border: 1px solid transparent;
          border-image: url("/assets/ui/sketch-box-thin-ink.svg") 24 / 24px / 0 stretch;
        }
        .mm-search-field:focus-within { border-image-source: url("/assets/ui/sketch-box-bold-ink.svg"); }
        .mm-search-field input {
          flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; outline: none; color: var(--sisi-ink);
          font-family: var(--font-editorial); font-size: 16px; -webkit-appearance: none; appearance: none;
        }
        .mm-search-field input::-webkit-search-cancel-button { display: none; }
        .mm-search-field input::placeholder { color: var(--ink-35); }
        .mm-search-clear {
          position: relative; flex: none; width: 28px; height: 28px; border: 0; border-radius: 50%; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--ink-08); color: var(--ink-80); cursor: pointer;
        }
        .mm-search-clear::before { content: ""; position: absolute; inset: -8px; }
        .mm-search-cancel { flex: none; color: var(--sisi-ink) !important; }
        .mm-list-wrap { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
        .mm-list-wrap > * { pointer-events: auto; }
      `}</style>
    </main>
  );
}
