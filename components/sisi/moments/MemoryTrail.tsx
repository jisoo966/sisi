"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { unrestStar, updateSign, walkingStars } from "@/lib/myStars";
import { updatePostcardText } from "@/lib/postcards";
import {
  loadTrail,
  monthLabel,
  rangeLabel,
  whenLabel,
  type MomentItem,
  type RestItem,
  type TrailItem,
} from "@/lib/moments";
import { tornEdge } from "@/lib/tornEdge";
import { BottomNavV2 } from "@/components/sisi/journey-v2/BottomNavV2";
import { MomentCapture } from "@/components/sisi/journey-v2/MomentCapture";

/**
 * MemoryTrail — the Moments tab.
 *
 *   1  Enter      night-paper header ("Moments · Things you noticed along the
 *                 way.") and the latest moment, with SiSi resting on it
 *   2  Walk back  a thin blue thread with gold pins winds down through time;
 *                 month tags, moments on alternating sides, small star lights
 *                 where a Star began
 *   3  Unfold     tap a moment → the paper opens: words, date · time, its
 *                 Star, Edit · View Star
 *   4  At rest    a Star at Rest sits on the trail; "Open memories" shows its
 *                 moments and lets it return to the sky
 *
 * Artwork slots (graceful fallbacks until the files arrive):
 *   /V2/moments/sisi-peek.png     SiSi resting over the latest moment
 *   /V2/moments/star-rest.png     the Star-at-Rest illustration
 *   /V2/moments/foliage-left.png  /V2/moments/foliage-right.png  side sprigs
 */

const EDGE_A = tornEdge(71, 26, 1.4);
const EDGE_B = tornEdge(72, 22, 2.2);
const EDGE_TAG = tornEdge(73, 10, 6);
const EDGE_HEADER =
  "polygon(0% 0%, 100% 0%, 100% 86%, 93% 90%, 86% 85%, 78% 91%, 70% 87%, 61% 93%, 52% 88%, 44% 94%, 35% 89%, 27% 95%, 18% 90%, 9% 96%, 0% 91%)";

type Pt = { x: number; y: number };

export function MemoryTrail() {
  const router = useRouter();
  const [items, setItems] = useState<TrailItem[] | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [open, setOpen] = useState<MomentItem | null>(null);
  const [openRest, setOpenRest] = useState<RestItem | null>(null);
  const [capture, setCapture] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadTrail().then(({ items, stars, signs }) => {
      setItems(items);
      setStars(stars);
      setSigns(signs);
    });
  }, []);
  useEffect(reload, [reload]);

  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);
  const currentStar = walkingStars(stars)[0] ?? null;

  const featured = items?.find((i): i is MomentItem => i.type === "moment") ?? null;
  const rest = items?.filter((i) => i !== featured) ?? [];

  const toast = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(null), 3000);
  };

  return (
    <main className="mt-root paper-bg">
      {/* ── 1. Night-paper header ── */}
      <header className="mt-header">
        <div className="mt-night" style={{ clipPath: EDGE_HEADER }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mt-night-img" src="/V2/ascent/night-sky-top.webp" alt="" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mt-night-star" src="/assets/sisi-star-mark-painted-512.png" alt="" aria-hidden />
          <svg className="mt-night-thread" viewBox="0 0 60 40" aria-hidden>
            <path d="M4 2 C 12 14, 22 10, 30 22 S 46 36, 56 34" />
          </svg>
        </div>
        <button type="button" className="mt-camera" aria-label="Keep a moment" onClick={() => setCapture(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
        </button>
        <h1 className="mt-title">Moments</h1>
        <p className="mt-sub">Things you noticed along the way.</p>
      </header>

      {items === null ? null : items.length === 0 ? (
        <div className="mt-empty">
          <p>Your moments will gather here as you walk.</p>
          <button type="button" className="mt-primary" onClick={() => setCapture(true)}>
            Keep a moment
          </button>
        </div>
      ) : (
        <>
          {/* ── Latest moment, with SiSi resting on it ── */}
          {featured && (
            <section className="mt-featured">
              <Decor src="/V2/moments/foliage-left.png" className="mt-foliage mt-foliage--left" />
              <SisiPeek />
              <button type="button" className="mt-fcard" onClick={() => setOpen(featured)} style={{ clipPath: EDGE_A }}>
                {featured.image && (
                  <span className="mt-fphoto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featured.image} alt="" />
                  </span>
                )}
                <span className="mt-ftext">{featured.text}</span>
                <span className="mt-when">{whenLabel(featured.at)}</span>
              </button>
              {featured.starId && starById.get(featured.starId) && <StarStamp className="mt-fstamp" />}
            </section>
          )}

          {/* ── 2. The trail back through time ── */}
          <Trail
            items={rest}
            startMonth={featured ? monthLabel(featured.at) : ""}
            onOpen={setOpen}
            onOpenRest={setOpenRest}
            onViewStar={(id) => router.push(`/journey?to=stars&star=${id}`)}
          />
        </>
      )}

      {/* ── 3. A Moment unfolds ── */}
      <AnimatePresence>
        {open && (
          <MomentDetail
            key={open.key}
            item={open}
            star={open.starId ? starById.get(open.starId) : undefined}
            onClose={() => setOpen(null)}
            onViewStar={(id) => router.push(`/journey?to=stars&star=${id}`)}
            onSaved={() => {
              setOpen(null);
              reload();
              toast("Kept.");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── 4. A Star at Rest ── */}
      <AnimatePresence>
        {openRest && (
          <RestDetail
            key={openRest.key}
            item={openRest}
            moments={signs.filter((s) => s.starId === openRest.star.id)}
            onClose={() => setOpenRest(null)}
            onReturned={() => {
              setOpenRest(null);
              reload();
              toast("Your Star is back in the sky.");
            }}
          />
        )}
      </AnimatePresence>

      <div className="mt-overlay">
        <MomentCapture
          open={capture}
          star={currentStar}
          onClose={() => {
            setCapture(false);
            reload();
          }}
        />
      </div>

      <AnimatePresence>
        {note && (
          <motion.p
            key="note"
            className="mt-note paper-bg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="journey-nav-host">
        <BottomNavV2 theme="light" activeTab="moments" />
      </div>

      <style jsx global>{`
        .mt-root {
          position: relative;
          min-height: 100svh;
          padding-bottom: 130px;
          overflow-x: hidden;
          color: #2b2f45;
          --safe-top: env(safe-area-inset-top, 0px);
          --safe-bottom: env(safe-area-inset-bottom, 0px);
          --safe-left: env(safe-area-inset-left, 0px);
          --safe-right: env(safe-area-inset-right, 0px);
          --nav-height: clamp(52px, 13vw, 62px);
          --nav-margin: clamp(6px, 2vw, 12px);
          --nav-total: calc(var(--nav-height) + var(--nav-margin) + var(--safe-bottom));
          --stage-padding: clamp(16px, 5vw, 24px);
          --thread: #4f7fd6;
          --pin: #e0b04a;
        }
        @media (min-width: 500px) {
          .mt-root { max-width: 430px; margin: 0 auto; box-shadow: 0 0 60px rgba(0, 0, 0, 0.12); }
        }
        .mt-header { position: relative; padding: 0 24px; }
        .mt-night {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: calc(118px + var(--safe-top));
          overflow: hidden;
          background: #06101f;
        }
        .mt-night-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .mt-night-star { position: absolute; width: 38px; left: 50%; top: calc(26px + var(--safe-top)); }
        .mt-night-thread {
          position: absolute; width: 60px; left: calc(50% + 26px); top: calc(46px + var(--safe-top));
          fill: none; stroke: #f1e2b8; stroke-width: 1; opacity: 0.8;
        }
        .mt-camera {
          position: absolute;
          right: 18px;
          top: calc(28px + var(--safe-top));
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 0;
          background: #f7f2e3;
          color: #2b2f45;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          z-index: 2;
        }
        .mt-camera svg { width: 22px; height: 22px; }
        .mt-title {
          position: relative;
          margin: 0;
          padding-top: calc(124px + var(--safe-top));
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 400;
          font-size: clamp(34px, 10vw, 42px);
          letter-spacing: -0.01em;
        }
        .mt-sub {
          position: relative;
          margin: 4px 0 0;
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 18px;
          color: rgba(43, 47, 69, 0.72);
        }
        .mt-empty { padding: 60px 32px; text-align: center; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; color: rgba(43,47,69,0.6); }
        .mt-primary {
          margin-top: 16px; height: 46px; padding: 0 26px; border: 0; border-radius: 999px;
          background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; cursor: pointer;
        }

        /* Featured (latest) moment */
        .mt-featured { position: relative; margin: 54px 22px 0; }
        .mt-fcard {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          padding: 16px 16px 18px;
          border: 0;
          background: #f6efdf;
          text-align: left;
          transform: rotate(-1.2deg);
          box-shadow: 0 10px 24px rgba(31, 42, 68, 0.14);
          cursor: pointer;
        }
        .mt-fphoto { display: block; aspect-ratio: 4 / 3; overflow: hidden; margin-bottom: 14px; }
        .mt-fphoto img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mt-ftext { display: block; font-family: var(--font-fraunces), Georgia, serif; font-size: 20px; line-height: 1.35; margin: 2px 4px 10px; }
        .mt-when { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14px; color: rgba(43, 47, 69, 0.58); margin: 0 4px; }
        .mt-fstamp { position: absolute; right: -6px; top: -14px; z-index: 3; }
        .mt-peek {
          position: absolute;
          z-index: 1;
          left: 6px;
          top: -62px;
          width: 108px;
          pointer-events: none;
        }
        .mt-foliage { position: absolute; z-index: 0; pointer-events: none; width: 90px; }
        .mt-foliage--left { left: -30px; top: -40px; }

        /* Trail */
        .mt-trail { position: relative; margin-top: 18px; padding: 10px 0 24px; }
        .mt-thread { position: absolute; left: 0; top: 0; width: 100%; overflow: visible; pointer-events: none; z-index: 0; }
        .mt-thread path { fill: none; stroke: var(--thread); stroke-width: 1.6; stroke-linecap: round; opacity: 0.8; }
        .mt-thread circle { fill: var(--pin); }
        .mt-row { position: relative; z-index: 1; padding: 12px 0; }
        .mt-row--month { padding: 18px 0 6px; }
        .mt-tag {
          display: inline-block;
          margin-left: 20%;
          padding: 8px 18px 8px 16px;
          background: #efe3c6;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: 17px;
          transform: rotate(-5deg);
          box-shadow: 0 3px 8px rgba(31, 42, 68, 0.12);
        }
        .mt-row--month.is-right .mt-tag { margin-left: 44%; transform: rotate(4deg); }
        .mt-card {
          position: relative;
          display: flex;
          gap: 12px;
          width: 60%;
          padding: 14px 14px 12px;
          border: 0;
          background: #f6efdf;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(31, 42, 68, 0.11);
        }
        .mt-row.is-right .mt-card { margin-left: 36%; transform: rotate(1deg); }
        .mt-row.is-left .mt-card { margin-left: 5%; transform: rotate(-1deg); }
        .mt-card.has-photo { width: 84%; }
        .mt-row.is-right .mt-card.has-photo { margin-left: 12%; }
        .mt-card-photo { flex: 0 0 44%; aspect-ratio: 1; overflow: hidden; }
        .mt-card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mt-card-body { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
        .mt-card-text { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.35; margin: 0 0 10px; }
        .mt-card .mt-when { margin: 0; font-size: 13px; }
        .mt-birth {
          display: flex; align-items: center; gap: 10px; margin-left: 40%;
          border: 0; background: transparent; cursor: pointer; padding: 0; text-align: left;
        }
        .mt-birth img { width: 44px; height: 44px; filter: drop-shadow(0 0 8px rgba(246, 210, 140, 0.9)); }
        .mt-birth span { font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 14px; color: rgba(43, 47, 69, 0.62); }

        /* A Star at Rest */
        .mt-rest { position: relative; margin: 10px 18px; }
        .mt-rest-art { position: relative; height: 180px; overflow: hidden; border-radius: 2px; background: #0b1b38; }
        .mt-rest-art img.bg { width: 100%; height: 100%; object-fit: cover; }
        .mt-rest-art img.mark { position: absolute; width: 52px; left: 50%; top: 42%; transform: translate(-50%, -50%); }
        .mt-rest-card {
          position: relative; margin: -34px 14px 0; padding: 18px 18px 18px; background: #f6efdf;
          text-align: center; box-shadow: 0 8px 20px rgba(31, 42, 68, 0.14);
        }
        .mt-rest-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 26px; margin: 0 0 4px; }
        .mt-rest-wish { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; margin: 0 0 8px; color: rgba(43,47,69,0.8); }
        .mt-rest-meta { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14px; color: rgba(43,47,69,0.55); margin: 0 0 14px; }
        .mt-rest-btn {
          height: 40px; padding: 0 22px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; cursor: pointer;
        }

        /* Detail (unfolded paper) */
        .mt-dim { position: fixed; inset: 0; z-index: 50; background: rgba(20, 24, 40, 0.45); border: 0; padding: 0; }
        .mt-detail {
          position: fixed; z-index: 51; left: 50%; top: 50%;
          width: min(88vw, 380px); max-height: 82svh; overflow-y: auto;
          padding: 22px 20px 20px; background: #f6efdf; color: #2b2f45;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        }
        .mt-close {
          position: absolute; right: 10px; top: 8px; width: 36px; height: 36px; border: 0; background: transparent;
          color: rgba(43,47,69,0.7); cursor: pointer; font-size: 22px; line-height: 1;
        }
        .mt-dphoto { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; margin: 16px 0 16px; }
        .mt-dtext { font-family: var(--font-fraunces), Georgia, serif; font-size: 22px; line-height: 1.32; margin: 12px 0 10px; }
        .mt-dinput {
          width: 100%; resize: none; padding: 10px 12px; margin: 12px 0 10px; border-radius: 10px;
          border: 1px solid rgba(43,47,69,0.16); background: rgba(255,255,255,0.55);
          font-family: var(--font-fraunces), Georgia, serif; font-size: 19px; color: #2b2f45; outline: none;
        }
        .mt-rule { height: 1px; background: rgba(43,47,69,0.13); margin: 14px 0; }
        .mt-star-row {
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 4px 0; border: 0; background: transparent;
          text-align: left; cursor: pointer; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45;
        }
        .mt-star-row .chev { margin-left: auto; color: #3d74d8; font-size: 20px; }
        .mt-actions { display: flex; gap: 10px; margin-top: 16px; }
        .mt-btn {
          flex: 1; height: 46px; border-radius: 999px; border: 1px solid rgba(43,47,69,0.16); background: rgba(255,255,255,0.5);
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .mt-btn--primary { flex: 1.3; border: 0; background: #3d74d8; color: #f7f2e3; }
        .mt-btn img { width: 20px; height: 20px; }
        .mt-rest-list p { font-family: var(--font-eb-garamond), Georgia, serif; }
        .mt-overlay {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          --safe-bottom: env(safe-area-inset-bottom, 0px); --safe-left: 0px; --safe-right: 0px;
        }
        .mt-overlay > * { pointer-events: auto; }
        .mt-note {
          position: fixed; left: 50%; bottom: 110px; z-index: 55; margin: 0; transform: translateX(-50%);
          padding: 12px 18px; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.2);
        }
      `}</style>
    </main>
  );
}

/* ── Trail with a winding thread and gold pins ─────────────────────── */

function Trail({
  items,
  startMonth,
  onOpen,
  onOpenRest,
  onViewStar,
}: {
  items: TrailItem[];
  startMonth: string;
  onOpen: (m: MomentItem) => void;
  onOpenRest: (r: RestItem) => void;
  onViewStar: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<{ path: string; pins: Pt[]; h: number }>({ path: "", pins: [], h: 0 });

  // Rows: month tags whenever the month changes, then items on alternating sides.
  const rows = useMemo(() => {
    const out: ({ kind: "month"; label: string; right: boolean } | { kind: "item"; item: TrailItem; right: boolean })[] = [];
    let month = startMonth;
    let side = true;
    items.forEach((item) => {
      const m = monthLabel(item.at);
      if (m !== month) {
        out.push({ kind: "month", label: m, right: !side });
        month = m;
      }
      out.push({ kind: "item", item, right: side });
      if (item.type === "moment") side = !side;
    });
    return out;
  }, [items, startMonth]);

  // Measure the rows and thread a path through them.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const W = el.offsetWidth;
      const anchors: Pt[] = [{ x: W * 0.5, y: 0 }];
      const pins: Pt[] = [];
      el.querySelectorAll<HTMLElement>("[data-row]").forEach((r) => {
        const kind = r.dataset.row;
        const right = r.dataset.side === "right";
        const y = r.offsetTop + (kind === "month" ? r.offsetHeight / 2 : 30);
        const x = kind === "item-moment" ? (right ? W * 0.24 : W * 0.78) : kind === "month" ? W * 0.5 : W * 0.5;
        anchors.push({ x, y });
        if (kind === "item-moment") pins.push({ x, y });
      });
      anchors.push({ x: W * 0.5, y: el.offsetHeight });
      setPts({ path: catmull(anchors), pins, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows]);

  return (
    <div className="mt-trail" ref={wrap}>
      <svg className="mt-thread" height={pts.h} aria-hidden>
        <path d={pts.path} />
        {pts.pins.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} />
        ))}
      </svg>

      {rows.map((row, i) => {
        if (row.kind === "month") {
          return (
            <div key={`m-${i}`} className={`mt-row mt-row--month${row.right ? " is-right" : ""}`} data-row="month">
              <span className="mt-tag" style={{ clipPath: EDGE_TAG }}>{row.label}</span>
            </div>
          );
        }
        const it = row.item;
        if (it.type === "moment") {
          return (
            <motion.div
              key={it.key}
              className={`mt-row ${row.right ? "is-right" : "is-left"}`}
              data-row="item-moment"
              data-side={row.right ? "right" : "left"}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                className={`mt-card${it.image ? " has-photo" : ""}`}
                style={{ clipPath: EDGE_B }}
                onClick={() => onOpen(it)}
              >
                {it.image && (
                  <span className="mt-card-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image} alt="" />
                  </span>
                )}
                <span className="mt-card-body">
                  <span className="mt-card-text">{it.text}</span>
                  <span className="mt-when">{whenLabel(it.at)}</span>
                </span>
              </button>
            </motion.div>
          );
        }
        if (it.type === "star") {
          return (
            <div key={it.key} className="mt-row" data-row="item-star">
              <button type="button" className="mt-birth" onClick={() => onViewStar(it.star.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/sisi-star-mark-painted-512.png" alt="" />
                <span>A Star began · {it.star.wish}</span>
              </button>
            </div>
          );
        }
        return (
          <div key={it.key} className="mt-row" data-row="item-rest">
            <RestCard item={it} onOpen={() => onOpenRest(it)} />
          </div>
        );
      })}
    </div>
  );
}

function RestCard({ item, onOpen }: { item: RestItem; onOpen: () => void }) {
  const [hasArt, setHasArt] = useState(true);
  return (
    <section className="mt-rest">
      <div className="mt-rest-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="bg"
          src={hasArt ? "/V2/moments/star-rest.png" : "/V2/ascent/night-sky-top.webp"}
          alt=""
          onError={() => setHasArt(false)}
        />
        {!hasArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mark" src="/assets/sisi-star-mark-painted-512.png" alt="" />
        )}
      </div>
      <div className="mt-rest-card" style={{ clipPath: EDGE_A }}>
        <p className="mt-rest-title">A Star at Rest</p>
        <p className="mt-rest-wish">{item.star.wish}</p>
        <p className="mt-rest-meta">
          {item.count} moment{item.count === 1 ? "" : "s"}
          {item.first ? ` · ${rangeLabel(item.first, item.last)}` : ""}
        </p>
        <button type="button" className="mt-rest-btn" onClick={onOpen}>
          Open memories →
        </button>
      </div>
    </section>
  );
}

/* ── 3. A Moment unfolds ───────────────────────────────────────────── */

function MomentDetail({
  item,
  star,
  onClose,
  onViewStar,
  onSaved,
}: {
  item: MomentItem;
  star?: Star;
  onClose: () => void;
  onViewStar: (id: string) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const t = draft.trim();
    if (!t || busy) return;
    setBusy(true);
    if (item.postcardId) await updatePostcardText(item.postcardId, t);
    if (item.signId) await updateSign(item.signId, t);
    onSaved();
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close"
        className="mt-dim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="mt-detail"
        role="dialog"
        aria-label="Moment"
        style={{ clipPath: EDGE_A, x: "-50%", y: "-50%" }}
        initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" className="mt-close" aria-label="Close" onClick={onClose}>×</button>
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mt-dphoto" src={item.image} alt="" />
        )}
        {editing ? (
          <textarea className="mt-dinput" rows={3} maxLength={240} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
        ) : (
          <p className="mt-dtext">{item.text}</p>
        )}
        <p className="mt-when">{whenLabel(item.at, true)}</p>
        {star && (
          <>
            <div className="mt-rule" />
            <button type="button" className="mt-star-row" onClick={() => onViewStar(star.id)}>
              <StarStamp small />
              <span>{star.wish}</span>
              <span className="chev" aria-hidden>›</span>
            </button>
          </>
        )}
        <div className="mt-actions">
          {editing ? (
            <>
              <button type="button" className="mt-btn" onClick={() => { setDraft(item.text); setEditing(false); }}>Cancel</button>
              <button type="button" className="mt-btn mt-btn--primary" disabled={busy || !draft.trim()} onClick={save}>Save</button>
            </>
          ) : (
            <>
              <button type="button" className="mt-btn" onClick={() => setEditing(true)}>✎ Edit</button>
              {star && (
                <button type="button" className="mt-btn mt-btn--primary" onClick={() => onViewStar(star.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/sisi-star-mark-painted-512.png" alt="" /> View Star
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ── 4. A Star at Rest — its memories ──────────────────────────────── */

function RestDetail({
  item,
  moments,
  onClose,
  onReturned,
}: {
  item: RestItem;
  moments: Sign[];
  onClose: () => void;
  onReturned: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <motion.button type="button" aria-label="Close" className="mt-dim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="mt-detail"
        role="dialog"
        aria-label="A Star at Rest"
        style={{ clipPath: EDGE_A, x: "-50%", y: "-50%" }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" className="mt-close" aria-label="Close" onClick={onClose}>×</button>
        <p className="mt-dtext">{item.star.wish}</p>
        <p className="mt-when">This Star is resting.</p>
        <div className="mt-rule" />
        <div className="mt-rest-list">
          {moments.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "rgba(43,47,69,0.55)" }}>No moments were kept for this Star.</p>
          ) : (
            moments
              .slice()
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <p className="mt-when" style={{ margin: 0 }}>{whenLabel(m.createdAt)}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 17 }}>{m.text}</p>
                </div>
              ))
          )}
        </div>
        <div className="mt-actions">
          <button
            type="button"
            className="mt-btn mt-btn--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await unrestStar(item.star.id);
              onReturned();
            }}
          >
            Return to the sky
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ── small pieces ─────────────────────────────────────────────────── */

function StarStamp({ className = "", small = false }: { className?: string; small?: boolean }) {
  const size = small ? 34 : 46;
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1b38",
        border: "2px solid #f6efdf",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        transform: "rotate(4deg)",
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/sisi-star-mark-painted-512.png" alt="" style={{ width: size * 0.72, height: size * 0.72 }} />
    </span>
  );
}

function SisiPeek() {
  const [src, setSrc] = useState("/V2/moments/sisi-peek.png");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="mt-peek"
      src={src}
      alt=""
      aria-hidden
      onError={() => setSrc("/V2/fox-walk/fox-walk-preview.png")}
    />
  );
}

function Decor({ src, className }: { src: string; className: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" aria-hidden onError={() => setOk(false)} />;
}

function catmull(p: Pt[]): string {
  if (p.length < 2) return "";
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
