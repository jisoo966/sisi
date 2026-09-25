"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { unrestStar, updateSign } from "@/lib/myStars";
import { updatePostcardText } from "@/lib/postcards";
import { ENTRY_LABEL, whenLabel, type MomentItem, type RestItem } from "@/lib/moments";

/**
 * Shared Moments pieces — paper artwork helpers and the "paper opens in
 * place" detail sheets, used by the horizontal Memory Trail and the list.
 * (The earlier vertical trail keeps its own copy in MemoryTrail.tsx so it
 * can be restored unchanged.)
 */

export type Art = { src: string; iw: number; ih: number; box: [number, number, number, number] };
const A = (f: string) => `/V2/moments/${f}`;
export const ART = {
  slip: { src: A("note-slip.png"), iw: 528, ih: 496, box: [12, 157, 528, 337] },
  postcard: { src: A("photo-postcard.png"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  tapes: { src: A("photo-postcard-tapes.png"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  paper: { src: A("detail-paper.png"), iw: 578, ih: 832, box: [0, 27, 534, 805] },
  stamp: { src: A("coral-star-stamp.png"), iw: 445, ih: 437, box: [131, 129, 322, 302] },
} satisfies Record<string, Art>;

/** Stretches an artwork's painted area (its `box`) over the parent box. */
export function ArtFill({ art }: { art: Art }) {
  const [x0, y0, x1, y1] = art.box;
  const bw = x1 - x0;
  const bh = y1 - y0;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="mm-art"
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
export function Crop({ art, className = "", style }: { art: Art; className?: string; style?: React.CSSProperties }) {
  const [x0, y0, x1, y1] = art.box;
  return (
    <span className={`mm-crop ${className}`} style={{ aspectRatio: `${x1 - x0} / ${y1 - y0}`, ...style }} aria-hidden>
      <ArtFill art={art} />
    </span>
  );
}

export function Postcard({ image, caption, className = "" }: { image: string; caption?: string; className?: string }) {
  return (
    <div className={`mm-pc ${className}`}>
      <ArtFill art={ART.postcard} />
      <span className="mm-pc-win">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" loading="lazy" draggable={false} />
      </span>
      <ArtFill art={ART.tapes} />
      {caption && <span className="mm-pc-cap">{caption}</span>}
    </div>
  );
}

/* ── The paper opens in place ─────────────────────────────────────── */

export type Origin = { x: number; y: number; w: number } | null;
export const originOf = (el: Element): Origin => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
};

function Unfold({ from, label, onClose, children }: { from: Origin; label: string; onClose: () => void; children: React.ReactNode }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  const W = Math.min(vw * 0.88, 380);
  const start = from
    ? { x: from.x - vw / 2, y: from.y - vh / 2, scale: Math.max(0.3, Math.min(0.9, from.w / W)), opacity: 0.4 }
    : { x: 0, y: 20, scale: 0.94, opacity: 0 };
  return (
    <>
      <motion.button
        type="button"
        aria-label="Close"
        className="mm-dim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className="mm-stage">
        <motion.div
          className="mm-detail"
          role="dialog"
          aria-label={label}
          initial={start}
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          exit={{ ...start, opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <ArtFill art={ART.paper} />
          <button type="button" className="mm-close" aria-label="Close" onClick={onClose}>×</button>
          {children}
        </motion.div>
      </div>
    </>
  );
}

export function MomentDetail({
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
      {item.image && <Postcard image={item.image} className="mm-d-pc" />}
      {editing ? (
        <textarea className="mm-dinput" rows={3} maxLength={240} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p className="mm-dtext">{item.text}</p>
      )}
      <p className="mm-when">
        {item.kind ? `${ENTRY_LABEL[item.kind]} · ` : ""}
        {whenLabel(item.at, true)}
      </p>
      {star && (
        <>
          <div className="mm-rule" />
          <button type="button" className="mm-star-row" onClick={() => onViewStar(star.id)}>
            <Crop art={ART.stamp} style={{ width: 26, flex: "0 0 auto" }} />
            <span>{star.wish}</span>
            <span className="chev" aria-hidden>›</span>
          </button>
        </>
      )}
      <div className="mm-actions">
        {editing ? (
          <>
            <button type="button" className="mm-btn" onClick={() => { setDraft(item.text); setEditing(false); }}>Cancel</button>
            <button type="button" className="mm-btn mm-btn--primary" disabled={busy || !draft.trim()} onClick={save}>Save</button>
          </>
        ) : (
          <>
            <button type="button" className="mm-btn" onClick={() => setEditing(true)}>✎ Edit</button>
            {star && (
              <button type="button" className="mm-btn mm-btn--primary" onClick={() => onViewStar(star.id)}>
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

export function RestDetail({
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
      <p className="mm-kicker">A Star at Rest</p>
      <p className="mm-dtext">{item.star.wish}</p>
      <div className="mm-rule" />
      <div>
        {moments.length === 0 ? (
          <p className="mm-text mm-muted">No moments were kept for this Star.</p>
        ) : (
          moments
            .slice()
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((m) => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <span className="mm-when">{whenLabel(m.createdAt)}</span>
                <span className="mm-text">{m.text}</span>
              </div>
            ))
        )}
      </div>
      <div className="mm-actions">
        <button
          type="button"
          className="mm-btn mm-btn--primary"
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

/** Styles for the pieces above (mounted once by the Moments screen). */
export function MomentsSharedStyles() {
  return (
    <style jsx global>{`
      .mm-art { position: absolute; max-width: none; pointer-events: none; user-select: none; -webkit-user-drag: none; }
      .mm-crop { position: relative; display: block; }
      .mm-text { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.34; margin: 0 0 6px; }
      .mm-muted { font-style: italic; color: rgba(43, 47, 69, 0.55); }
      .mm-when { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13.5px; color: rgba(43, 47, 69, 0.58); }
      .mm-kicker { margin: 0; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 14px; color: rgba(43, 47, 69, 0.6); }
      .mm-pc { position: relative; aspect-ratio: 428 / 567; }
      .mm-pc > .mm-art:first-child { filter: drop-shadow(0 4px 8px rgba(10, 18, 30, 0.22)); }
      .mm-pc-win { position: absolute; left: 9.35%; top: 11.64%; width: 79.21%; height: 70.9%; overflow: hidden; }
      .mm-pc-win img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .mm-pc-cap {
        position: absolute; left: 8%; right: 8%; top: 84.5%; text-align: center; white-space: nowrap;
        font-family: var(--font-eb-garamond), Georgia, serif; font-size: 10.5px; color: rgba(43, 47, 69, 0.7);
      }

      .mm-dim { position: fixed; inset: 0; z-index: 50; background: rgba(12, 18, 32, 0.34); border: 0; padding: 0; }
      .mm-stage { position: fixed; inset: 0; z-index: 51; display: grid; place-items: center; pointer-events: none; }
      .mm-detail {
        position: relative; pointer-events: auto; width: min(88vw, 380px); max-height: 84svh; overflow-y: auto;
        overscroll-behavior-y: contain; padding: 34px 28px 28px; color: #2b2f45;
        filter: drop-shadow(0 16px 30px rgba(0, 0, 0, 0.3)); scrollbar-width: none;
      }
      .mm-detail > :not(.mm-art) { position: relative; }
      .mm-close {
        position: absolute !important; right: 14px; top: 14px; width: 36px; height: 36px; border: 0; background: transparent;
        color: rgba(43, 47, 69, 0.7); cursor: pointer; font-size: 24px; line-height: 1; z-index: 2;
      }
      .mm-d-pc { width: 78%; margin: 4px auto 14px; transform: rotate(-1.5deg); }
      .mm-dtext { font-family: var(--font-fraunces), Georgia, serif; font-size: 22px; line-height: 1.32; margin: 8px 0 10px; }
      .mm-dinput {
        width: 100%; resize: none; padding: 10px 12px; margin: 8px 0 10px; border-radius: 10px;
        border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.55);
        font-family: var(--font-fraunces), Georgia, serif; font-size: 19px; color: #2b2f45; outline: none;
      }
      .mm-rule { height: 1px; background: rgba(43, 47, 69, 0.13); margin: 14px 0; }
      .mm-star-row {
        display: flex; align-items: center; gap: 12px; width: 100%; padding: 2px 0; border: 0; background: transparent;
        text-align: left; cursor: pointer; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45;
      }
      .mm-star-row .chev { margin-left: auto; color: #3d74d8; font-size: 22px; }
      .mm-actions { display: flex; gap: 10px; margin-top: 18px; }
      .mm-btn {
        flex: 1; height: 46px; border-radius: 999px; border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.5);
        font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      }
      .mm-btn--primary { flex: 1.3; border: 0; background: #3d74d8; color: #f7f2e3; }
      .mm-btn img { width: 20px; height: 20px; }
    `}</style>
  );
}
