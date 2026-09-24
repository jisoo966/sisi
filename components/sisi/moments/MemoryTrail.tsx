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
import { BottomNavV2 } from "@/components/sisi/journey-v2/BottomNavV2";
import { MomentCapture } from "@/components/sisi/journey-v2/MomentCapture";

/**
 * MemoryTrail — the Moments tab.
 *
 *   1  Enter      night-paper header and the latest moment, SiSi resting on it
 *   2  Walk back  a painted blue path winds down through time; signposts mark
 *                 the months, moments sit beside the path (never on it), paw
 *                 prints appear along the way, a sparkle marks where a Star began
 *   3  Unfold     tap a moment → the paper opens in place over the trail
 *   4  At rest    a Star at Rest sits on the trail with its memories
 *
 * Artwork: /public/V2/moments/* (the SiSi Moments asset pack). Every PNG is
 * used as supplied — transparent, unrecoloured, native aspect for the path.
 * Copy, dates, photos and controls are live layers on top.
 * (photo-postcard-tapes.png is the pack's own tape pixels, lifted into a
 * separate layer so the tapes can sit above a photo.)
 */

/* ── Artwork ──────────────────────────────────────────────────────── */

type Art = { src: string; iw: number; ih: number; box: [number, number, number, number] };
const A = (f: string) => `/V2/moments/${f}`;
const ART = {
  slip: { src: A("note-slip.png"), iw: 528, ih: 496, box: [12, 157, 528, 337] },
  postcard: { src: A("photo-postcard.png"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  tapes: { src: A("photo-postcard-tapes.png"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  paper: { src: A("detail-paper.png"), iw: 578, ih: 832, box: [0, 27, 534, 805] },
  stamp: { src: A("coral-star-stamp.png"), iw: 445, ih: 437, box: [131, 129, 322, 302] },
  sparkle: { src: A("memory-sparkle.png"), iw: 497, ih: 487, box: [109, 113, 436, 468] },
  paws: { src: A("paw-prints.png"), iw: 509, ih: 491, box: [143, 184, 410, 450] },
  grass: { src: A("grass-accent.png"), iw: 495, ih: 488, box: [49, 183, 469, 395] },
  sign: { src: A("date-signpost.png"), iw: 512, ih: 473, box: [99, 69, 477, 473] },
  rest: { src: A("star-at-rest.png"), iw: 511, ih: 470, box: [33, 141, 451, 411] },
} satisfies Record<string, Art>;

/** Path pieces, joined vertically at native aspect. `prof` = the band's
 *  centre (fraction of piece width) at 21 even steps from top to bottom. */
type PieceKind = "L" | "R" | "S";
const PIECES: Record<PieceKind, { src: string; iw: number; ih: number; prof: number[] }> = {
  L: {
    src: A("path-curve-left.png"), iw: 511, ih: 1007,
    prof: [0.3, 0.326, 0.33, 0.432, 0.506, 0.563, 0.649, 0.669, 0.684, 0.636, 0.603, 0.506, 0.425, 0.386, 0.341, 0.339, 0.433, 0.5, 0.569, 0.59, 0.59],
  },
  R: {
    src: A("path-curve-right.png"), iw: 506, ih: 1009,
    prof: [0.59, 0.6, 0.594, 0.51, 0.469, 0.386, 0.336, 0.308, 0.285, 0.33, 0.371, 0.471, 0.567, 0.601, 0.654, 0.63, 0.607, 0.541, 0.492, 0.44, 0.433],
  },
  S: {
    src: A("path-straight.png"), iw: 510, ih: 1009,
    prof: [0.54, 0.553, 0.577, 0.556, 0.562, 0.558, 0.564, 0.562, 0.587, 0.555, 0.566, 0.578, 0.548, 0.563, 0.579, 0.568, 0.579, 0.579, 0.563, 0.565, 0.578],
  },
};
const STEP = 0.92; // pieces overlap; each top fades in over the solid path above
const JOIN = 0.045; // where two pieces are aligned: this far into the lower one
const profAt = (prof: number[], f: number) => {
  const t = Math.max(0, Math.min(1, f)) * 20;
  const i = Math.min(19, Math.floor(t));
  return prof[i] + (prof[i + 1] - prof[i]) * (t - i);
};
const EDGE = 14; // page margin beside cards

type Piece = { kind: PieceKind; left: number; top: number; w: number; h: number };

function buildPath(W: number, H: number): Piece[] {
  const pw = Math.max(140, Math.min(185, W * 0.4));
  const center = W / 2;
  const out: Piece[] = [];
  let y = 0;
  let x = center - 0.12 * pw;
  let prev: PieceKind | null = null;
  while (y < H) {
    let kind: PieceKind = "L";
    if (prev) {
      let best = Infinity;
      (["L", "R", "S"] as PieceKind[]).forEach((k) => {
        const p = PIECES[k].prof;
        const end = x + (profAt(p, STEP + JOIN) - profAt(p, JOIN)) * pw;
        const cost = Math.abs(end - center) + (k === prev ? 0.3 * pw : 0) + (k === "S" ? 0.12 * pw : 0);
        if (cost < best) {
          best = cost;
          kind = k;
        }
      });
    }
    const P = PIECES[kind];
    const h = (pw * P.ih) / P.iw;
    const left = x - profAt(P.prof, prev ? JOIN : 0) * pw;
    out.push({ kind, left, top: y, w: pw, h });
    x = left + profAt(P.prof, STEP + JOIN) * pw;
    y += h * STEP;
    prev = kind;
  }
  return out;
}

function centerAt(pieces: Piece[], y: number): number {
  let p = pieces[0];
  for (const q of pieces) if (q.top <= y) p = q;
  if (!p) return 0;
  const prof = PIECES[p.kind].prof;
  return p.left + profAt(prof, (y - p.top) / p.h) * p.w;
}

/* ── Page ─────────────────────────────────────────────────────────── */

type Origin = { x: number; y: number; w: number } | null;
const originOf = (el: Element): Origin => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
};

export function MemoryTrail() {
  const router = useRouter();
  const [items, setItems] = useState<TrailItem[] | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [open, setOpen] = useState<{ item: MomentItem; from: Origin } | null>(null);
  const [openRest, setOpenRest] = useState<{ item: RestItem; from: Origin } | null>(null);
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
  const viewStar = (id: string) => router.push(`/journey?to=stars&star=${id}`);

  const toast = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(null), 3000);
  };

  return (
    <main className="mt-root paper-bg">
      {/* ── 1. Night-paper header ── */}
      <header className="mt-header">
        <div className="mt-night">
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
          {featured && (
            <Featured
              item={featured}
              hasStar={!!(featured.starId && starById.get(featured.starId))}
              onOpen={(el) => setOpen({ item: featured, from: originOf(el) })}
            />
          )}
          <Trail
            items={rest}
            startMonth={featured ? monthLabel(featured.at) : ""}
            onOpen={(item, el) => setOpen({ item, from: originOf(el) })}
            onOpenRest={(item, el) => setOpenRest({ item, from: originOf(el) })}
            onViewStar={viewStar}
          />
        </>
      )}

      {/* ── 3. A Moment unfolds ── */}
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
              toast("Kept.");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── 4. A Star at Rest ── */}
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
          --serif: var(--font-eb-garamond), Georgia, serif;
          --display: var(--font-fraunces), Georgia, serif;
        }
        @media (min-width: 500px) {
          .mt-root { max-width: 430px; margin: 0 auto; box-shadow: 0 0 60px rgba(0, 0, 0, 0.12); }
        }
        .mt-crop { position: relative; display: block; }
        .mt-art { position: absolute; max-width: none; pointer-events: none; user-select: none; }

        /* Header */
        .mt-header { position: relative; padding: 0 24px; }
        .mt-night {
          position: absolute; left: 0; right: 0; top: 0; height: calc(118px + var(--safe-top));
          overflow: hidden; background: #06101f;
          clip-path: polygon(0% 0%, 100% 0%, 100% 86%, 93% 90%, 86% 85%, 78% 91%, 70% 87%, 61% 93%, 52% 88%, 44% 94%, 35% 89%, 27% 95%, 18% 90%, 9% 96%, 0% 91%);
        }
        .mt-night-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .mt-night-star { position: absolute; width: 38px; left: 50%; top: calc(26px + var(--safe-top)); }
        .mt-night-thread {
          position: absolute; width: 60px; left: calc(50% + 26px); top: calc(46px + var(--safe-top));
          fill: none; stroke: #f1e2b8; stroke-width: 1; opacity: 0.8;
        }
        .mt-camera {
          position: absolute; right: 18px; top: calc(28px + var(--safe-top)); width: 46px; height: 46px;
          border-radius: 50%; border: 0; background: #f7f2e3; color: #2b2f45;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25); cursor: pointer; z-index: 2;
        }
        .mt-camera svg { width: 22px; height: 22px; }
        .mt-title {
          position: relative; margin: 0; padding-top: calc(124px + var(--safe-top));
          font-family: var(--display); font-weight: 400; font-size: clamp(34px, 10vw, 42px); letter-spacing: -0.01em;
        }
        .mt-sub { position: relative; margin: 4px 0 0; font-family: var(--serif); font-size: 18px; color: rgba(43, 47, 69, 0.72); }
        .mt-empty { padding: 60px 32px; text-align: center; font-family: var(--serif); font-style: italic; color: rgba(43, 47, 69, 0.6); }
        .mt-primary {
          margin-top: 16px; height: 46px; padding: 0 26px; border: 0; border-radius: 999px;
          background: #3d74d8; color: #f7f2e3; font-family: var(--serif); font-size: 17px; cursor: pointer;
        }

        /* Paper pieces */
        .mt-slip { position: relative; padding: 16px 20px 14px; }
        .mt-slip > :not(.mt-art) { position: relative; }
        .mt-text { display: block; font-family: var(--serif); font-size: 17px; line-height: 1.34; margin: 0 0 6px; }
        .mt-when { display: block; font-family: var(--serif); font-size: 13.5px; color: rgba(43, 47, 69, 0.58); }
        .mt-pc { position: relative; aspect-ratio: 428 / 567; }
        .mt-pc > .mt-art:first-child { filter: drop-shadow(0 6px 10px rgba(31, 42, 68, 0.16)); }
        .mt-pc-win { position: absolute; left: 9.35%; top: 11.64%; width: 79.21%; height: 70.9%; overflow: hidden; }
        .mt-pc-win img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mt-pc-date {
          position: absolute; left: 10%; right: 10%; top: 84%; text-align: center;
          font-family: var(--font-caveat), cursive; font-size: 17px; color: rgba(43, 47, 69, 0.7);
        }
        .mt-cardbtn { display: block; width: 100%; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; color: inherit; }

        /* Featured (latest) moment */
        .mt-featured { position: relative; z-index: 2; margin: 58px 0 0; padding: 0 16px; }
        .mt-f-pc { position: relative; width: 62%; margin-left: 5%; transform: rotate(-2.5deg); }
        .mt-f-slip { width: 78%; margin: -58px 2% 0 auto; transform: rotate(1.2deg); padding: 20px 24px 16px; }
        .mt-f-slip.solo { width: 92%; margin: 0 auto; }
        .mt-f-slip .mt-text { font-family: var(--display); font-size: 19px; line-height: 1.32; }
        .mt-f-stamp { position: absolute !important; right: -4px; top: -20px; width: 46px; }
        .mt-peek { position: absolute; z-index: 3; left: 6%; top: -60px; width: 104px; pointer-events: none; }
        .mt-f-grass { position: absolute; left: -10px; bottom: -8px; width: 92px; z-index: -1; }

        /* Trail */
        .mt-trail { position: relative; margin-top: -40px; padding: 60px 0 40px; }
        .mt-path {
          position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 90px), transparent);
          mask-image: linear-gradient(to bottom, #000 calc(100% - 90px), transparent);
        }
        .mt-path img {
          position: absolute; max-width: none;
          -webkit-mask-image: linear-gradient(to bottom, transparent 1%, #000 5.5%);
          mask-image: linear-gradient(to bottom, transparent 1%, #000 5.5%);
        }
        .mt-path img:first-child { -webkit-mask-image: none; mask-image: none; }
        .mt-paws { position: absolute; width: 38px; z-index: 1; pointer-events: none; }
        .mt-row { position: relative; z-index: 2; padding: 12px 0; }
        .mt-row--month { padding: 6px 0 2px; }
        .mt-card { position: relative; }
        .mt-card .mt-slip { transform: rotate(var(--tilt, 0deg)); }
        .mt-card .mt-pc { width: 74%; transform: rotate(var(--tilt, 0deg)); }
        .mt-card.is-right .mt-pc { margin-left: auto; }
        .mt-card .mt-pc + .mt-slip { width: 92%; margin-top: -34px; }
        .mt-card.is-right .mt-pc + .mt-slip { margin-right: 10%; }
        .mt-card.is-left .mt-pc + .mt-slip { margin-left: 10%; }
        .mt-grass { position: absolute; width: 70px; bottom: -4px; z-index: -1; }
        .mt-card.is-left .mt-grass { left: -6px; }
        .mt-card.is-right .mt-grass { right: -6px; }
        .mt-sign { position: relative; width: 132px; aspect-ratio: 378 / 404; }
        .mt-sign span {
          position: absolute; left: 3%; top: 13%; width: 84%; height: 34%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-size: 15px; color: #2b2f45; transform: rotate(-1.5deg);
        }
        .mt-birth { position: relative; height: 76px; }
        .mt-sparkle { position: absolute; top: 6px; width: 58px; border: 0; padding: 0; background: transparent; cursor: pointer; }
        .mt-sparkle .mt-crop { animation: mt-breathe 2.8s ease-in-out infinite; }
        .mt-birth-cap {
          position: absolute; top: 20px; font-family: var(--serif); font-style: italic; font-size: 14.5px;
          line-height: 1.3; color: rgba(43, 47, 69, 0.66);
        }
        @keyframes mt-breathe {
          0%, 100% { transform: scale(0.94); opacity: 0.86; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        /* A Star at Rest */
        .mt-rest { position: relative; margin: 8px auto; width: min(86%, 340px); padding: 30px 26px 26px; text-align: center; }
        .mt-rest > :not(.mt-art) { position: relative; }
        .mt-rest-art { width: 70%; margin: 0 auto 6px; animation: mt-sway 5s ease-in-out infinite; }
        @keyframes mt-sway { 0%, 100% { transform: translateX(-1px) rotate(-0.3deg); } 50% { transform: translateX(1.5px) rotate(0.3deg); } }
        .mt-rest-title { font-family: var(--display); font-size: 25px; margin: 0 0 4px; }
        .mt-rest-wish { font-family: var(--serif); font-size: 16px; margin: 0 0 6px; color: rgba(43, 47, 69, 0.8); }
        .mt-rest-meta { font-family: var(--serif); font-size: 14px; color: rgba(43, 47, 69, 0.55); margin: 0 0 14px; }
        .mt-rest-btn {
          height: 40px; padding: 0 22px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3;
          font-family: var(--serif); font-size: 16px; cursor: pointer;
        }

        /* Detail — the paper opens in place */
        .mt-dim { position: fixed; inset: 0; z-index: 50; background: rgba(30, 28, 44, 0.3); border: 0; padding: 0; }
        .mt-stage { position: fixed; inset: 0; z-index: 51; display: grid; place-items: center; pointer-events: none; }
        .mt-detail {
          position: relative; pointer-events: auto; width: min(88vw, 380px); max-height: 84svh; overflow-y: auto;
          padding: 34px 28px 28px; color: #2b2f45; filter: drop-shadow(0 16px 30px rgba(0, 0, 0, 0.28));
          scrollbar-width: none;
        }
        .mt-detail > :not(.mt-art) { position: relative; }
        .mt-close {
          position: absolute !important; right: 14px; top: 14px; width: 36px; height: 36px; border: 0; background: transparent;
          color: rgba(43, 47, 69, 0.7); cursor: pointer; font-size: 24px; line-height: 1; z-index: 2;
        }
        .mt-d-pc { width: 80%; margin: 4px auto 14px; transform: rotate(-1.5deg); }
        .mt-dtext { font-family: var(--display); font-size: 22px; line-height: 1.32; margin: 8px 0 10px; }
        .mt-dinput {
          width: 100%; resize: none; padding: 10px 12px; margin: 8px 0 10px; border-radius: 10px;
          border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.55);
          font-family: var(--display); font-size: 19px; color: #2b2f45; outline: none;
        }
        .mt-rule { height: 1px; background: rgba(43, 47, 69, 0.13); margin: 14px 0; }
        .mt-star-row {
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 2px 0; border: 0; background: transparent;
          text-align: left; cursor: pointer; font-family: var(--serif); font-size: 17px; color: #2b2f45;
        }
        .mt-star-row .chev { margin-left: auto; color: #3d74d8; font-size: 22px; }
        .mt-actions { display: flex; gap: 10px; margin-top: 18px; }
        .mt-btn {
          flex: 1; height: 46px; border-radius: 999px; border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.5);
          font-family: var(--serif); font-size: 17px; color: #2b2f45; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .mt-btn--primary { flex: 1.3; border: 0; background: #3d74d8; color: #f7f2e3; }
        .mt-btn img { width: 20px; height: 20px; }
        .mt-rest-list .mt-text { font-size: 17px; }
        .mt-overlay {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          --safe-bottom: env(safe-area-inset-bottom, 0px); --safe-left: 0px; --safe-right: 0px;
        }
        .mt-overlay > * { pointer-events: auto; }
        .mt-note {
          position: fixed; left: 50%; bottom: 110px; z-index: 55; margin: 0; transform: translateX(-50%);
          padding: 12px 18px; font-family: var(--serif); font-size: 15px; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        }
        @media (prefers-reduced-motion: reduce) {
          .mt-sparkle .mt-crop, .mt-rest-art { animation: none; }
        }
      `}</style>
    </main>
  );
}

/* ── Featured (latest) moment ─────────────────────────────────────── */

function Featured({ item, hasStar, onOpen }: { item: MomentItem; hasStar: boolean; onOpen: (el: Element) => void }) {
  return (
    <section className="mt-featured">
      <button type="button" className="mt-cardbtn" onClick={(e) => onOpen(e.currentTarget)}>
        {item.image ? (
          <>
            <div className="mt-f-pc">
              <SisiPeek />
              <Postcard image={item.image} />
            </div>
            <div className="mt-slip mt-f-slip">
              <ArtFill art={ART.slip} />
              <Crop art={ART.grass} className="mt-f-grass" />
              {hasStar && <Crop art={ART.stamp} className="mt-f-stamp" />}
              <span className="mt-text">{item.text}</span>
              <span className="mt-when">{whenLabel(item.at)}</span>
            </div>
          </>
        ) : (
          <div className="mt-slip mt-f-slip solo">
            <SisiPeek />
            <ArtFill art={ART.slip} />
            {hasStar && <Crop art={ART.stamp} className="mt-f-stamp" />}
            <span className="mt-text">{item.text}</span>
            <span className="mt-when">{whenLabel(item.at)}</span>
          </div>
        )}
      </button>
    </section>
  );
}

/* ── 2. The trail back through time ───────────────────────────────── */

type Row =
  | { key: string; kind: "month"; label: string }
  | { key: string; kind: "moment"; item: MomentItem; n: number }
  | { key: string; kind: "star"; item: Extract<TrailItem, { type: "star" }> }
  | { key: string; kind: "rest"; item: RestItem };

type Place = { side: "left" | "right"; w: number; c: number };
type Layout = { W: number; pieces: Piece[]; place: Record<string, Place>; paws: { x: number; y: number; flip: boolean }[] };

function Trail({
  items,
  startMonth,
  onOpen,
  onOpenRest,
  onViewStar,
}: {
  items: TrailItem[];
  startMonth: string;
  onOpen: (m: MomentItem, el: Element) => void;
  onOpenRest: (r: RestItem, el: Element) => void;
  onViewStar: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);

  const rows = useMemo(() => {
    const out: Row[] = [];
    let month = startMonth;
    let n = 0;
    items.forEach((item) => {
      const m = monthLabel(item.at);
      if (m !== month) {
        out.push({ key: `m-${m}`, kind: "month", label: m });
        month = m;
      }
      if (item.type === "moment") out.push({ key: item.key, kind: "moment", item, n: n++ });
      else if (item.type === "star") out.push({ key: item.key, kind: "star", item });
      else out.push({ key: item.key, kind: "rest", item });
    });
    return out;
  }, [items, startMonth]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVw((w) => (Math.abs(w - el.offsetWidth) > 1 ? el.offsetWidth : w)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lay the path, then set each row beside it (on the side with more room).
  // Two passes: widths change text wrapping, which moves rows a little.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !vw) return;
    const measure = () => {
      const W = el.offsetWidth;
      const pieces = buildPath(W, el.offsetHeight + 200);
      const band = 0.1 * pieces[0].w;
      const place: Record<string, Place> = {};
      const paws: Layout["paws"] = [];
      let lastMomentBottom: number | null = null;
      el.querySelectorAll<HTMLElement>("[data-key]").forEach((r) => {
        const top = r.offsetTop;
        const h = r.offsetHeight;
        const cs = [0.15, 0.5, 0.85].map((f) => centerAt(pieces, top + h * f));
        const lo = Math.min(...cs);
        const hi = Math.max(...cs);
        const roomL = lo - band - 6 - EDGE;
        const roomR = W - EDGE - (hi + band + 6);
        const side = roomL >= roomR ? "left" : "right";
        const kind = r.dataset.kind;
        const max = kind === "moment-photo" ? 250 : W * 0.64;
        const min = kind === "moment-photo" ? 200 : 168;
        place[r.dataset.key!] = { side, w: Math.max(min, Math.min(max, Math.max(roomL, roomR))), c: cs[1] };
        if (kind?.startsWith("moment")) {
          if (lastMomentBottom !== null && paws.length < 40 && place[r.dataset.key!] && (top - lastMomentBottom) < 60) {
            const y = (top + lastMomentBottom) / 2;
            paws.push({ x: centerAt(pieces, y), y, flip: paws.length % 2 === 1 });
          }
          lastMomentBottom = top + h;
        } else {
          lastMomentBottom = null;
        }
      });
      setLayout({ W, pieces, place, paws });
    };
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [rows, vw]);

  const W = layout?.W ?? vw ?? 390;
  const posFor = (key: string, fallbackSide: "left" | "right", w?: number): { side: "left" | "right"; style: React.CSSProperties } => {
    const p = layout?.place[key];
    const side = p?.side ?? fallbackSide;
    const width = w ?? p?.w ?? W * 0.56;
    return { side, style: { width, marginLeft: side === "left" ? EDGE : Math.max(EDGE, W - EDGE - width) } };
  };

  return (
    <div className="mt-trail" ref={wrap}>
      <div className="mt-path" aria-hidden>
        {layout?.pieces.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={PIECES[p.kind].src} alt="" style={{ left: p.left, top: p.top, width: p.w, height: p.h }} />
        ))}
      </div>
      {layout?.paws.map((p, i) => (
        <motion.span
          key={`paw-${i}`}
          className="mt-paws"
          style={{ left: p.x - 19, top: p.y - 19, scaleX: p.flip ? -1 : 1 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          aria-hidden
        >
          <Crop art={ART.paws} />
        </motion.span>
      ))}

      {rows.map((row) => {
        if (row.kind === "month") {
          const { style } = posFor(row.key, "left", 132);
          return (
            <div key={row.key} className="mt-row mt-row--month" data-key={row.key} data-kind="month">
              <div className="mt-sign" style={style}>
                <ArtFill art={ART.sign} />
                <span>{row.label}</span>
              </div>
            </div>
          );
        }

        if (row.kind === "moment") {
          const it = row.item;
          const photo = !!it.image;
          const { side, style } = posFor(row.key, row.n % 2 ? "left" : "right");
          const tilt = `${side === "left" ? -1 : 1.2}deg`;
          return (
            <motion.div
              key={row.key}
              className="mt-row"
              data-key={row.key}
              data-kind={photo ? "moment-photo" : "moment"}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                className={`mt-cardbtn mt-card is-${side}`}
                style={{ ...style, ["--tilt" as string]: tilt }}
                onClick={(e) => onOpen(it, e.currentTarget)}
              >
                {row.n % 3 === 2 && <Crop art={ART.grass} className="mt-grass" />}
                {photo && <Postcard image={it.image!} />}
                <div className="mt-slip">
                  <ArtFill art={ART.slip} />
                  <span className="mt-text">{it.text}</span>
                  <span className="mt-when">{whenLabel(it.at)}</span>
                </div>
              </button>
            </motion.div>
          );
        }

        if (row.kind === "star") {
          const p = layout?.place[row.key];
          const c = p?.c ?? W / 2;
          const capStyle: React.CSSProperties =
            (p?.side ?? "right") === "left"
              ? { left: EDGE, width: Math.max(80, c - 40 - EDGE), textAlign: "right" }
              : { left: c + 40, width: Math.max(80, W - EDGE - (c + 40)) };
          return (
            <div key={row.key} className="mt-row mt-birth" data-key={row.key} data-kind="star">
              <button type="button" className="mt-sparkle" style={{ left: c - 29 }} aria-label={`View ${row.item.star.wish}`} onClick={() => onViewStar(row.item.star.id)}>
                <Crop art={ART.sparkle} />
              </button>
              <span className="mt-birth-cap" style={capStyle}>A Star began · {row.item.star.wish}</span>
            </div>
          );
        }

        const it = row.item;
        return (
          <div key={row.key} className="mt-row" data-key={row.key} data-kind="rest">
            <section className="mt-rest">
              <ArtFill art={ART.paper} />
              <Crop art={ART.rest} className="mt-rest-art" />
              <p className="mt-rest-title">A Star at Rest</p>
              <p className="mt-rest-wish">{it.star.wish}</p>
              <p className="mt-rest-meta">
                {it.count} moment{it.count === 1 ? "" : "s"}
                {it.first ? ` · ${rangeLabel(it.first, it.last)}` : ""}
              </p>
              <button type="button" className="mt-rest-btn" onClick={(e) => onOpenRest(it, e.currentTarget.closest(".mt-rest") ?? e.currentTarget)}>
                Open memories →
              </button>
            </section>
          </div>
        );
      })}
    </div>
  );
}

/* ── 3. A Moment unfolds ──────────────────────────────────────────── */

function Unfold({ from, label, onClose, children }: { from: Origin; label: string; onClose: () => void; children: React.ReactNode }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  const W = Math.min(vw * 0.88, 380);
  const start = from
    ? { x: from.x - vw / 2, y: from.y - vh / 2, scale: Math.max(0.35, Math.min(0.9, from.w / W)), opacity: 0.4 }
    : { x: 0, y: 20, scale: 0.94, opacity: 0 };
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
      <div className="mt-stage">
        <motion.div
          className="mt-detail"
          role="dialog"
          aria-label={label}
          initial={start}
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          exit={{ ...start, opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <ArtFill art={ART.paper} />
          <button type="button" className="mt-close" aria-label="Close" onClick={onClose}>×</button>
          {children}
        </motion.div>
      </div>
    </>
  );
}

function MomentDetail({
  item,
  from,
  star,
  onClose,
  onViewStar,
  onSaved,
}: {
  item: MomentItem;
  from: Origin;
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
    <Unfold from={from} label="Moment" onClose={onClose}>
      {item.image && <Postcard image={item.image} className="mt-d-pc" />}
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
            <Crop art={ART.stamp} style={{ width: 30, flex: "0 0 auto" }} />
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
    </Unfold>
  );
}

/* ── 4. A Star at Rest — its memories ─────────────────────────────── */

function RestDetail({
  item,
  from,
  moments,
  onClose,
  onReturned,
}: {
  item: RestItem;
  from: Origin;
  moments: Sign[];
  onClose: () => void;
  onReturned: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Unfold from={from} label="A Star at Rest" onClose={onClose}>
      <Crop art={ART.rest} style={{ width: "52%", margin: "0 auto 4px" }} />
      <p className="mt-dtext" style={{ textAlign: "center" }}>{item.star.wish}</p>
      <p className="mt-when" style={{ textAlign: "center" }}>This Star is resting.</p>
      <div className="mt-rule" />
      <div className="mt-rest-list">
        {moments.length === 0 ? (
          <p className="mt-text" style={{ fontStyle: "italic", color: "rgba(43,47,69,0.55)" }}>No moments were kept for this Star.</p>
        ) : (
          moments
            .slice()
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((m) => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <span className="mt-when">{whenLabel(m.createdAt)}</span>
                <span className="mt-text">{m.text}</span>
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
    </Unfold>
  );
}

/* ── small pieces ─────────────────────────────────────────────────── */

/** Stretches an artwork's painted area (its `box`) over the parent box. */
function ArtFill({ art }: { art: Art }) {
  const [x0, y0, x1, y1] = art.box;
  const bw = x1 - x0;
  const bh = y1 - y0;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="mt-art"
      src={art.src}
      alt=""
      aria-hidden
      draggable={false}
      style={{
        left: `${(-x0 / bw) * 100}%`,
        top: `${(-y0 / bh) * 100}%`,
        width: `${(art.iw / bw) * 100}%`,
        height: `${(art.ih / bh) * 100}%`,
      }}
    />
  );
}

/** An artwork at its native aspect, sized by its painted area. */
function Crop({ art, className = "", style }: { art: Art; className?: string; style?: React.CSSProperties }) {
  const [x0, y0, x1, y1] = art.box;
  return (
    <span
      className={`mt-crop ${className}`}
      style={{ aspectRatio: `${x1 - x0} / ${y1 - y0}`, ...style }}
      aria-hidden
    >
      <ArtFill art={art} />
    </span>
  );
}

function Postcard({ image, className = "" }: { image: string; className?: string }) {
  return (
    <div className={`mt-pc ${className}`}>
      <ArtFill art={ART.postcard} />
      <span className="mt-pc-win">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" />
      </span>
      <ArtFill art={ART.tapes} />
    </div>
  );
}

function SisiPeek() {
  const [src, setSrc] = useState("/V2/moments/sisi-peek.png");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mt-peek" src={src} alt="" aria-hidden onError={() => setSrc("/V2/fox-walk/fox-walk-preview.png")} />
  );
}
