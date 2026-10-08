"use client";

import { useId, useState } from "react";
import {
  ConfirmationDialog,
  IconCheck,
  IconPencil,
  IconTrash,
  ModalDialog,
  ModalPortal,
  IconButton,
  PrimaryButton,
  StarConnectionRow,
  StarGlyph,
  TextAction,
} from "@/components/ds";
import type { Sign, Star } from "@/lib/myStars";
import { unrestStar } from "@/lib/myStars";
import { softGlint } from "@/lib/fx";
import { isRealPhoto, whenLabel, type MomentItem, type RestItem } from "@/lib/moments";
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
  slip: { src: A("note-slip.webp"), iw: 528, ih: 496, box: [12, 157, 528, 337] },
  postcard: { src: A("photo-postcard.webp"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  tapes: { src: A("photo-postcard-tapes.webp"), iw: 550, ih: 719, box: [64, 138, 492, 705] },
  paper: { src: A("detail-paper.webp"), iw: 578, ih: 832, box: [0, 27, 534, 805] },
  stamp: { src: A("coral-star-stamp.webp"), iw: 445, ih: 437, box: [131, 129, 322, 302] },
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
        <img src={image} alt="" loading="lazy" draggable={false} onError={(e) => e.currentTarget.setAttribute("data-failed", "")} />
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
 * Moment details open in the shared modal system (components/ds):
 * ModalPortal → backdrop + a paper dialog that expands from the card the
 * person tapped. Information order: date · text · image · linked Star ·
 * actions. Delete and Disconnect live in the three-dot menu, with a
 * confirmation. The paper's height follows its content.
 */
function expandFrom(from: Origin): React.CSSProperties | undefined {
  if (!from || typeof window === "undefined") return undefined;
  const W = Math.min(window.innerWidth - 32, 390);
  return {
    ["--fx" as string]: `${Math.round(from.x - window.innerWidth / 2)}px`,
    ["--fy" as string]: `${Math.round(from.y - window.innerHeight / 2)}px`,
    ["--fs" as string]: String(Math.max(0.3, Math.min(0.9, from.w / W))),
  };
}

function starStatus(s: Star): string {
  if (s.fulfilledAt) return "Fulfilled";
  if (s.restedAt) return "Resting";
  return "Still walking";
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
  const [mode, setMode] = useState<"view" | "edit" | "connect">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState(item.text);
  const [draft, setDraft] = useState(item.text);
  const [busy, setBusy] = useState(false);
  const [starNow, setStarNow] = useState<Star | undefined>(star);
  const [style] = useState(() => expandFrom(from));
  const id = item.momentId;
  const titleId = useId();
  // A Star reflection belongs to its Star; other Moments may be (re)connected.
  const canReconnect = item.source !== "star_check_in";
  // in edit: which Star it will belong to (null = none)
  const [draftStar, setDraftStar] = useState<Star | null>(star ?? null);
  // the Stars to choose from, with its current one (even fulfilled) first
  const choices = starNow && !stars.some((s) => s.id === starNow.id) ? [starNow, ...stars] : stars;
  const startEdit = () => {
    setDraft(text);
    setDraftStar(starNow ?? null);
    setMode("edit");
  };
  const cancelEdit = () => {
    setDraft(text);
    setMode("view");
  };
  const starChanged = (draftStar?.id ?? null) !== (starNow?.id ?? null);

  const save = async () => {
    const t = draft.trim();
    if ((!t && !item.image) || busy) return;
    setBusy(true);
    const btn = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    // the same record, everywhere (text, and which Star it belongs to)
    await updateMoment(id, { text: t || null, ...(canReconnect && starChanged ? { starId: draftStar?.id ?? null } : {}) });
    softGlint(btn);
    setText(t);
    if (canReconnect) setStarNow(draftStar ?? undefined);
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
    setConfirmDelete(false);
    onDeleted?.();
  };

  const typeLabel = TYPE_LABEL[item.mtype];

  return (
    <>
      <ModalPortal open onClose={mode === "edit" ? cancelEdit : onClose} labelledBy={titleId}>
        <ModalDialog
          className={`ds-paper--memory${style ? " ds-dialog--from" : ""}`}
          style={style}
          onClose={onClose}
          title={
            <p id={titleId} className="t-meta" style={{ margin: 0, color: "var(--ink-60)" }}>
              {whenLabel(item.at, true)}
              {typeLabel && item.mtype !== "companion_note" ? ` · ${typeLabel}` : ""}
              {item.mtype === "companion_note" ? " · A note from Sísí" : ""}
            </p>
          }
          // looking: a quiet pencil; editing: the bin takes its place (deleting is rare, and asks first)
          menu={
            mode === "view" ? (
              <IconButton label="Edit moment" onClick={startEdit}>
                <IconPencil />
              </IconButton>
            ) : mode === "edit" ? (
              <IconButton label="Delete moment" onClick={() => setConfirmDelete(true)}>
                <IconTrash />
              </IconButton>
            ) : undefined
          }
          actions={
            mode === "edit" ? (
              <div className="ds-actions ds-actions--row">
                <TextAction onClick={cancelEdit}>Cancel</TextAction>
                <PrimaryButton loading={busy} disabled={!draft.trim() && !item.image} onClick={save}>Save</PrimaryButton>
              </div>
            ) : undefined /* looking needs no buttons: the memory, then its Star */
          }
        >
          {mode === "edit" ? (
            <>
            <p className="ds-kicker">Your words</p>
            <textarea
              className="ds-field mm-dinput"
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
            </>
          ) : (
            text && <p className="t-dialogue mm-dtext">{text}</p>
          )}

          {isRealPhoto(item.image) && item.image && (
            <div className="mm-dimg">
              <Postcard image={item.image} className="mm-d-pc" />
            </div>
          )}

          {/* edit: choose which Star it belongs to, or none */}
          {mode === "edit" && canReconnect && choices.length > 0 && (
            <div className="mm-dsection" role="radiogroup" aria-label="Connected to">
              <p className="ds-kicker">Connected to</p>
              <div className="mm-dchoices">
                {choices.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={draftStar?.id === s.id}
                    className="ds-star-row ds-star-row--choice"
                    onClick={() => setDraftStar(s)}
                  >
                    <StarGlyph size={18} className="ds-star-row-glyph" />
                    <span className="ds-star-row-main"><span className="ds-star-row-title">{s.wish}</span></span>
                    {draftStar?.id === s.id && <IconCheck size={20} />}
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={!draftStar}
                  className="ds-star-row ds-star-row--choice ds-star-row--none"
                  onClick={() => setDraftStar(null)}
                >
                  <span className="ds-star-row-main"><span className="ds-star-row-title">No Star</span></span>
                  {!draftStar && <IconCheck size={20} />}
                </button>
              </div>
            </div>
          )}

          {starNow && mode !== "connect" && !(mode === "edit" && canReconnect) && (
            <div className="mm-dsection">
              <StarConnectionRow plain title={starNow.wish} status={starStatus(starNow)} onClick={() => onViewStar(starNow.id)} />
            </div>
          )}

          {!starNow && mode === "view" && stars.length > 0 && (
            <div className="mm-dsection">
              <TextAction onClick={() => setMode("connect")} style={{ paddingLeft: 0 }}>
                <StarGlyph size={14} /> Connect to a Star
              </TextAction>
            </div>
          )}

          {mode === "connect" && (
            <div className="mm-dsection">
              <p className="ds-kicker">Connect to a Star</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stars.map((s) => (
                  <button key={s.id} type="button" className="ds-star-row" disabled={busy} onClick={() => connect(s)}>
                    <StarGlyph size={18} className="ds-star-row-glyph" />
                    <span className="ds-star-row-main"><span className="ds-star-row-title">{s.wish}</span></span>
                  </button>
                ))}
              </div>
              <TextAction onClick={() => setMode("view")}>Not now</TextAction>
            </div>
          )}
        </ModalDialog>
      </ModalPortal>
      <ConfirmationDialog
        open={confirmDelete}
        destructive
        title="Delete this Moment?"
        message="It will be removed everywhere it appears, including its Star."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
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
  const [style] = useState(() => expandFrom(from));
  const titleId = useId();
  return (
    <ModalPortal open onClose={onClose} labelledBy={titleId}>
      <ModalDialog
        className={`ds-paper--memory${style ? " ds-dialog--from" : ""}`}
        style={style}
        onClose={onClose}
        title={<p id={titleId} className="t-meta" style={{ margin: 0, color: "var(--ink-60)" }}>A Star at rest</p>}
        actions={
          <PrimaryButton
            block
            loading={busy}
            onClick={async (e) => {
              setBusy(true);
              softGlint(e.currentTarget);
              await unrestStar(item.star.id);
              onReturned();
            }}
          >
            Return to the sky
          </PrimaryButton>
        }
      >
        <p className="t-card-title" style={{ margin: 0 }}>
          <StarGlyph size={16} /> {item.star.wish}
        </p>
        <div className="mm-dsection">
          {moments.length === 0 ? (
            <p className="t-body mm-muted" style={{ margin: 0 }}>No moments were kept for this Star.</p>
          ) : (
            moments
              .slice()
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <span className="t-meta" style={{ display: "block", color: "var(--ink-60)" }}>{whenLabel(m.createdAt)}</span>
                  <span className="t-body" style={{ display: "block" }}>{m.text}</span>
                </div>
              ))
          )}
        </div>
      </ModalDialog>
    </ModalPortal>
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
      /* while the paper art and photos arrive, a plain paper shape holds their place (never a broken image) */
      .mw-note, .mm-pc { background: rgba(245, 239, 230, 0.92); border-radius: 3px; }
      .mm-pc-win { background: #e8dfcf; }
      .mm-pc-win img[data-failed] { visibility: hidden; }
      .mm-crop { position: relative; display: block; }
      .mm-text { display: block; font-family: var(--font-editorial); font-size: var(--text-body); line-height: var(--leading-body); margin: 0 0 6px; }
      .mm-muted { font-style: italic; color: var(--ink-60); }
      .mm-when { display: block; font-family: var(--font-ui); font-size: var(--text-meta); line-height: var(--leading-meta); color: var(--ink-60); letter-spacing: 0.005em; }
      .mm-kicker { margin: 0; font-family: var(--font-ui); font-weight: 500; font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
      .mm-pc { position: relative; aspect-ratio: 428 / 567; }
      .mm-pc > .mm-art:first-child { filter: drop-shadow(0 4px 8px rgba(16, 45, 50, 0.22)); }
      .mm-pc-win { position: absolute; left: 9.35%; top: 11.64%; width: 79.21%; height: 70.9%; overflow: hidden; }
      .mm-pc-win img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .mm-pc-cap {
        position: absolute; left: 8%; right: 8%; top: 84.5%; text-align: center; white-space: nowrap;
        font-family: var(--font-ui); font-size: var(--text-helper); color: var(--ink-60);
          letter-spacing: 0.005em;
        }

      /* detail content (the dialog itself is components/ds) */
      .mm-dtext { margin: 0; white-space: pre-wrap; }
      .mm-dinput { min-height: 96px; }
      .mm-dimg { display: flex; justify-content: center; margin: 16px 0 4px; }
      /* the photo keeps its aspect; its height never pushes the text or the actions away */
      .mm-d-pc { height: clamp(190px, 35dvh, 300px); width: auto; max-width: 100%; margin: 0; transform: rotate(-1.5deg); }
      .mm-dsection { margin-top: 20px; }
      .mm-dchoices { display: flex; flex-direction: column; gap: 8px; }
    `}</style>
  );
}
