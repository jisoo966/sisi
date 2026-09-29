"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Sign, Star } from "@/lib/myStars";
import { unrestStar } from "@/lib/myStars";
import { whenLabel, type MomentItem, type RestItem } from "@/lib/moments";
import { deleteMoment, TYPE_LABEL, updateMoment } from "@/lib/momentStore";

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

/**
 * Unfold — an app-level modal, rendered through a portal straight under
 * <body> so it never inherits the page's transforms, filters, overflow,
 * opacity or stacking (the Moments stage has all of these).
 *
 *   ModalPortal
 *   ├── ModalBackdrop   fixed, full viewport, inky 50% + a light blur,
 *   │                   z 1000 — the tabs (z ≤ 40) sit beneath it
 *   └── Dialog          z 1001 · FixedModalHeader · ScrollableModalBody ·
 *                       FixedModalActions (only the body scrolls)
 *
 * The page underneath can't scroll or be tapped while it's open; its
 * scroll position is restored on close.
 */
function Unfold({
  from,
  label,
  onClose,
  children,
  actions,
}: {
  from: Origin;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // body scroll lock (restoring the exact position afterwards)
  useEffect(() => {
    const body = document.body;
    const y = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      Object.assign(body.style, prev);
      window.scrollTo(0, y);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const W = Math.min(vw - 32, 390);
  const start = from
    ? { x: from.x - vw / 2, y: from.y - vh / 2, scale: Math.max(0.3, Math.min(0.9, from.w / W)), opacity: 0.4 }
    : { x: 0, y: 20, scale: 0.94, opacity: 0 };
  return createPortal(
    <div className="mm-modal">
      <motion.div
        className="mm-backdrop"
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        className="mm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        initial={start}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        exit={{ ...start, opacity: 0, transition: { duration: 0.3 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ArtFill art={ART.paper} />
        <div className="mm-dhead">
          <button type="button" className="mm-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mm-dbody">{children}</div>
        {actions && <div className="mm-dactions">{actions}</div>}
      </motion.div>
    </div>,
    document.body,
  );
}

export function MomentDetail({
  item,
  from,
  star,
  stars = [],
  onClose,
  onViewStar,
  onSaved,
  onDeleted,
}: {
  item: MomentItem;
  from: Origin;
  star?: Star;
  /** Stars it could be connected to */
  stars?: Star[];
  onClose: () => void;
  onViewStar: (id: string) => void;
  /** the record changed (edit / connect / disconnect) */
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "connect" | "delete">("view");
  const [text, setText] = useState(item.text);
  const [draft, setDraft] = useState(item.text);
  const [busy, setBusy] = useState(false);
  const [starNow, setStarNow] = useState<Star | undefined>(star);
  const id = item.momentId;
  // A Star reflection belongs to its Star; other Moments may be (dis)connected.
  const canDisconnect = !!starNow && item.source !== "star_check_in";

  const save = async () => {
    const t = draft.trim();
    if ((!t && !item.image) || busy) return;
    setBusy(true);
    await updateMoment(id, { text: t || null }); // the same record, everywhere
    setText(t);
    setBusy(false);
    setMode("view");
    onSaved();
  };
  const connect = async (s: Star | null) => {
    setBusy(true);
    await updateMoment(id, { starId: s ? s.id : null });
    setStarNow(s ?? undefined);
    setBusy(false);
    setMode("view");
    onSaved();
  };
  const remove = async () => {
    setBusy(true);
    await deleteMoment(id); // gone from Moments and the Star's journey alike
    onDeleted?.();
  };

  const typeLabel = TYPE_LABEL[item.mtype];
  return (
    <Unfold
      from={from}
      label={mode === "edit" ? "Edit Moment" : "Moment"}
      onClose={onClose}
      actions={
        mode === "delete" ? (
          <>
            <button type="button" className="mm-btn" onClick={() => setMode("view")}>Keep it</button>
            <button type="button" className="mm-btn mm-btn--danger" disabled={busy} onClick={remove}>Delete</button>
          </>
        ) : mode === "edit" ? (
          <>
            <button type="button" className="mm-btn" onClick={() => { setDraft(text); setMode("view"); }}>Cancel</button>
            <button type="button" className="mm-btn mm-btn--primary" disabled={busy || (!draft.trim() && !item.image)} onClick={save}>Save</button>
          </>
        ) : mode === "view" ? (
          <>
            <button type="button" className="mm-btn" onClick={() => setMode("edit")}>✎ Edit</button>
            {starNow ? (
              <button type="button" className="mm-btn mm-btn--primary" onClick={() => onViewStar(starNow.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/sisi-star-mark-painted-512.png" alt="" /> View Star
              </button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {item.image && (
        <div className="mm-dimg">
          <Postcard image={item.image} className="mm-d-pc" />
        </div>
      )}
      {item.mtype === "companion_note" && <p className="mm-kicker">A note from Sísí</p>}
      {mode === "edit" ? (
        <textarea
          className="mm-dinput"
          rows={3}
          maxLength={240}
          value={draft}
          autoFocus
          aria-label="Edit this Moment"
          autoComplete="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          ref={(el) => fitField(el)}
          onChange={(e) => {
            setDraft(e.target.value);
            fitField(e.target);
          }}
        />
      ) : (
        text && <p className="mm-dtext">{text}</p>
      )}
      <p className="mm-when mm-when--below">
        {typeLabel && item.mtype !== "companion_note" ? `${typeLabel} · ` : ""}
        {whenLabel(item.at, true)}
      </p>

      {starNow && mode !== "connect" && (
        <>
          <div className="mm-rule" />
          <button type="button" className="mm-star-row" onClick={() => onViewStar(starNow.id)}>
            <Crop art={ART.stamp} style={{ width: 26, flex: "0 0 auto" }} />
            <span>{starNow.wish}</span>
            <span className="chev" aria-hidden>›</span>
          </button>
        </>
      )}

      {mode === "connect" && (
        <div className="mm-connect">
          <div className="mm-rule" />
          <p className="mm-kicker">Connect to a Star</p>
          {stars.map((s) => (
            <button key={s.id} type="button" className="mm-star-row" disabled={busy} onClick={() => connect(s)}>
              <Crop art={ART.stamp} style={{ width: 22, flex: "0 0 auto" }} />
              <span>{s.wish}</span>
            </button>
          ))}
          <button type="button" className="mm-textbtn" onClick={() => setMode("view")}>
            Not now
          </button>
        </div>
      )}

      {mode === "delete" && (
        <p className="mm-kicker mm-confirm">Delete this Moment? It will be removed everywhere it appears.</p>
      )}

      {mode === "view" && (
        <div className="mm-secondary">
          {!starNow && stars.length > 0 && (
            <button type="button" className="mm-textbtn" onClick={() => setMode("connect")}>Connect to a Star</button>
          )}
          {canDisconnect && (
            <button type="button" className="mm-textbtn" disabled={busy} onClick={() => connect(null)}>
              Disconnect from this Star
            </button>
          )}
          <button type="button" className="mm-textbtn mm-textbtn--quiet" onClick={() => setMode("delete")}>Delete</button>
        </div>
      )}
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
    <Unfold
      from={from}
      label="A Star at Rest"
      onClose={onClose}
      actions={
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
      }
    >
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
    </Unfold>
  );
}

/** The field grows with its words (up to ~7 lines, then scrolls inside). */
function fitField(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight + 2, 196)}px`;
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

      /* ── app-level modal (portal under <body>) ── */
      .mm-modal {
        position: fixed; inset: 0; z-index: 1000;
        display: flex; align-items: center; justify-content: center;
        padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
          max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        overscroll-behavior: contain;
      }
      .mm-backdrop {
        position: fixed; inset: 0; z-index: 1000; pointer-events: auto;
        background: rgba(8, 14, 26, 0.5);
        -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
      }
      .mm-dialog {
        position: relative; z-index: 1001; isolation: isolate;
        width: min(calc(100vw - 32px), 390px);
        max-height: calc(100dvh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        display: flex; flex-direction: column; overflow: hidden;
        color: #2b2f45; filter: drop-shadow(0 16px 30px rgba(0, 0, 0, 0.3));
      }
      .mm-dialog > :not(.mm-art) { position: relative; }
      .mm-dhead { flex: none; height: 60px; }
      .mm-close {
        position: absolute; right: 16px; top: 16px; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 0;
        background: none; box-shadow: none; color: rgba(43, 47, 69, 0.7); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mm-close svg { width: 20px; height: 20px; }
      .mm-close:focus-visible { outline: 1.5px solid rgba(43, 47, 69, 0.45); outline-offset: -4px; border-radius: 50%; }
      .mm-dbody {
        flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain;
        padding: 0 28px 8px; scrollbar-width: none;
      }
      .mm-dbody::-webkit-scrollbar { display: none; }
      .mm-dactions { flex: none; display: flex; gap: 12px; padding: 14px 28px 22px; }
      .mm-dimg { display: flex; justify-content: center; margin: 0 0 14px; }
      /* the photo keeps its aspect; its height never pushes the field or the actions away */
      .mm-d-pc { height: clamp(190px, 35dvh, 300px); width: auto; max-width: 100%; margin: 0; transform: rotate(-1.5deg); }
      .mm-when--below { margin-top: 10px; }
      .mm-confirm { margin-top: 14px; }
      .mm-dtext { font-family: var(--font-fraunces), Georgia, serif; font-size: 22px; line-height: 1.32; margin: 8px 0 10px; }
      .mm-dinput {
        /* roomy right padding so browser writing tools never sit on the words */
        display: block; width: 100%; resize: none; padding: 12px 40px 12px 14px; margin: 6px 0 0; border-radius: 10px;
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
      .mm-btn--danger { flex: 1; border: 0; background: #a4574a; color: #f7f2e3; }
      .mm-secondary { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 16px; margin-top: 10px; }
      .mm-textbtn {
        min-height: 44px; padding: 0 6px; border: 0; background: transparent; cursor: pointer;
        font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; color: #3d74d8;
      }
      .mm-textbtn--quiet { color: rgba(43, 47, 69, 0.55); }
      .mm-connect .mm-star-row { min-height: 44px; }
      .mm-confirm { margin-top: 16px; }
    `}</style>
  );
}
