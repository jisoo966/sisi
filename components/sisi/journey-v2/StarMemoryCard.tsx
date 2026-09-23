"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { loadSignsForStar, updateStar } from "@/lib/myStars";

/**
 * StarMemoryCard — one star's memory on torn paper, hanging from its star
 * by a thin ivory thread (the night sky stays visible around it).
 *
 *   summary   rises from the bottom: date, the wish, the latest moment,
 *             "open star →"
 *   timeline  the same paper grows upward, still hanging from the star:
 *             every moment with date · time; a quiet status mark
 *             ("still walking") and a "⋯" button
 *   manage    "⋯" → small paper menu: edit star · let this star rest · cancel
 *   rest      "let this star rest?" confirmation → onRest (the parent closes
 *             the card and lets the star drift down off the path)
 *   dismiss   paper slides down, the thread retracts toward the star
 *             (AnimatePresence exit in the parent)
 */

type Props = {
  star: Star;
  /** Star centre in screen coordinates (stage space). */
  anchor: { x: number; y: number };
  /** The star has no wish yet — the card invites one. */
  placeholder?: boolean;
  onClose: () => void;
  /** Confirmed "let it rest". */
  onRest: (star: Star) => void;
  /** Wish edited in place. */
  onEdited: (star: Star) => void;
};

type Mode = "summary" | "timeline";
type Overlay = null | "menu" | "confirm-rest";

const EASE = [0.22, 1, 0.36, 1] as const;

export function StarMemoryCard({ star, anchor, placeholder = false, onClose, onRest, onEdited }: Props) {
  const [mode, setMode] = useState<Mode>("summary");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(star.wish);
  const [signs, setSigns] = useState<Sign[] | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);
  const expanded = mode === "timeline";

  useEffect(() => {
    if (placeholder) {
      setSigns([]);
      return;
    }
    let cancelled = false;
    loadSignsForStar(star.id)
      .then((s) => !cancelled && setSigns(s))
      .catch(() => !cancelled && setSigns([]));
    return () => {
      cancelled = true;
    };
  }, [star.id, placeholder]);

  // Where the paper's top edge rests (layout box, ignores transforms).
  useLayoutEffect(() => {
    const measure = () => {
      const card = cardRef.current;
      if (card) setCardTop(card.offsetTop);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode, signs, editing]);

  const latest = signs && signs.length > 0 ? signs[0] : null;

  // Thin, slightly imperfect ivory thread from just under the star to a bead
  // on the paper's top edge.
  const threadEnd = cardTop === null ? null : Math.max(anchor.y + 42, cardTop + 1);
  const lineD = useMemo(() => {
    if (threadEnd === null) return "";
    const x0 = anchor.x;
    const y0 = anchor.y + 30;
    const len = threadEnd - y0;
    const j = (k: number) => Math.sin(anchor.x * 0.37 + k * 2.1) * 2.4;
    return `M ${x0} ${y0} C ${x0 + j(1)} ${y0 + len * 0.3}, ${x0 + j(2)} ${y0 + len * 0.62}, ${x0} ${threadEnd}`;
  }, [anchor.x, anchor.y, threadEnd]);

  // Expanded paper hangs just under the star, down to the tab bar.
  const expandedTop = Math.max(anchor.y + 70, 104);

  const saveEdit = async () => {
    const wish = draft.trim();
    if (!wish || wish === star.wish) {
      setEditing(false);
      return;
    }
    await updateStar(star.id, { wish });
    onEdited({ ...star, wish });
    setEditing(false);
  };

  return (
    <>
      {/* Tap outside the paper to put the memory away. */}
      <motion.button
        type="button"
        aria-label="Close this memory"
        className="smc-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {lineD && threadEnd !== null && (
        <svg className="smc-line" aria-hidden>
          <motion.path
            d={lineD}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, d: lineD }}
            exit={{ pathLength: 0, transition: { duration: 0.35, ease: "easeIn" } }}
            transition={{ pathLength: { duration: 0.55, delay: 0.35, ease: EASE }, d: { duration: 0.6, ease: EASE } }}
          />
          <motion.circle
            r={3}
            className="smc-bead"
            initial={{ opacity: 0, cx: anchor.x, cy: threadEnd }}
            animate={{ opacity: 1, cx: anchor.x, cy: threadEnd }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ opacity: { delay: 0.8, duration: 0.25 }, cy: { duration: 0.6, ease: EASE } }}
          />
        </svg>
      )}

      <motion.div
        ref={cardRef}
        layout
        className={`smc-card${expanded ? " is-expanded" : ""}`}
        style={expanded ? { top: expandedTop, rotate: 0 } : { rotate: -0.5 }}
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        exit={{ y: "120%", transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] } }}
        transition={{ y: { duration: 0.6, delay: 0.12, ease: EASE }, layout: { duration: 0.6, ease: EASE } }}
        role="dialog"
        aria-label={placeholder ? "Your waiting star" : "Star memory"}
      >
        <span className="smc-shadow" aria-hidden />
        <motion.div layout className="smc-paper paper-bg">
          <span className="smc-handle" aria-hidden />

          <AnimatePresence mode="wait" initial={false}>
            {!expanded ? (
              /* ── Summary ─────────────────────────────── */
              <motion.div
                key="summary"
                className="smc-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <p className="smc-when">{placeholder ? "tonight" : formatDate(star.createdAt)}</p>
                <h2 className="smc-title">{placeholder ? "a star, waiting" : star.wish || "your star"}</h2>
                <p className="smc-sentence">
                  {placeholder
                    ? "this star is waiting for your wish."
                    : latest?.text ?? "no moments yet. the first one is on its way."}
                </p>
                <div className="smc-rule" />
                <div className="smc-actions">
                  <button
                    type="button"
                    className="smc-link"
                    onClick={() => {
                      if (placeholder) window.location.href = "/my-stars";
                      else setMode("timeline");
                    }}
                  >
                    {placeholder ? "make a wish" : "open star"} <span aria-hidden>→</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── Timeline ────────────────────────────── */
              <motion.div
                key="timeline"
                className="smc-content smc-timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.35, duration: 0.35 } }}
                exit={{ opacity: 0 }}
              >
                <p className="smc-when">{formatDate(star.createdAt)}</p>
                {editing ? (
                  <div className="smc-edit">
                    <textarea
                      className="smc-edit-input"
                      value={draft}
                      rows={2}
                      maxLength={140}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="smc-edit-actions">
                      <button type="button" className="smc-link" onClick={() => { setDraft(star.wish); setEditing(false); }}>
                        cancel
                      </button>
                      <button type="button" className="smc-link smc-link--strong" onClick={saveEdit}>
                        save
                      </button>
                    </div>
                  </div>
                ) : (
                  <h2 className="smc-title smc-title--lg">{star.wish || "your star"}</h2>
                )}
                <div className="smc-rule" />

                <div className="smc-moments">
                  {signs === null ? (
                    <p className="smc-empty">…</p>
                  ) : signs.length === 0 ? (
                    <p className="smc-empty">no moments yet. the first one is on its way.</p>
                  ) : (
                    signs.map((s) => (
                      <div key={s.id} className="smc-moment">
                        <p className="smc-moment-when">{formatWhen(s.createdAt)}</p>
                        <p className="smc-moment-text">{s.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="smc-footer">
                  {/* A status mark, not a button. */}
                  <span className={`smc-status${star.fulfilledAt ? " is-arrived" : ""}`}>
                    <span className="smc-status-dot" aria-hidden />
                    {star.fulfilledAt ? "it arrived" : "still walking"}
                  </span>
                  <button
                    type="button"
                    className="smc-more"
                    aria-label="Manage this star"
                    aria-expanded={overlay === "menu"}
                    onClick={() => setOverlay(overlay === "menu" ? null : "menu")}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <circle cx="6" cy="12" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="18" cy="12" r="1.6" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Paper dims under the manage menu / rest confirmation. */}
          <AnimatePresence>
            {overlay && (
              <motion.button
                type="button"
                aria-label="Close"
                className="smc-dim"
                onClick={() => setOverlay(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {overlay === "menu" && (
              <motion.div
                key="menu"
                className="smc-menu paper-bg"
                role="menu"
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <button type="button" role="menuitem" onClick={() => { setOverlay(null); setEditing(true); }}>
                  <PencilIcon /> edit star
                </button>
                <button type="button" role="menuitem" onClick={() => setOverlay("confirm-rest")}>
                  <MoonIcon /> let this star rest
                </button>
                <button type="button" role="menuitem" onClick={() => setOverlay(null)}>
                  <CloseIcon /> cancel
                </button>
              </motion.div>
            )}

            {overlay === "confirm-rest" && (
              <motion.div
                key="confirm"
                className="smc-confirm paper-bg"
                role="alertdialog"
                aria-label="Let this star rest?"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <h3>let this star rest?</h3>
                <p>it will leave your star path, but stay safely in your moments.</p>
                <button type="button" className="smc-btn smc-btn--primary" onClick={() => onRest(star)}>
                  let it rest
                </button>
                <button type="button" className="smc-btn" onClick={() => setOverlay(null)}>
                  keep walking
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        .smc-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: transparent;
          /* Below the tab bar (z 12) so "Journey" still works while a card
             is open (it closes the card first, then descends). */
          z-index: 11;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
        }
        .smc-line {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
          z-index: 21;
        }
        .smc-line path {
          fill: none;
          stroke: #f1e2b8;
          stroke-width: 1.2;
          stroke-linecap: round;
          opacity: 0.9;
        }
        .smc-bead { fill: #e9b949; }
        .smc-card {
          position: absolute;
          left: max(18px, var(--safe-left));
          right: max(18px, var(--safe-right));
          bottom: calc(var(--nav-total) + 16px);
          z-index: 22;
          pointer-events: auto;
        }
        .smc-card.is-expanded { bottom: calc(var(--nav-total) + 8px); }
        .smc-shadow {
          position: absolute;
          inset: 12px 6px -8px 6px;
          background: rgba(0, 0, 0, 0.45);
          border-radius: 10px;
          filter: blur(14px);
          pointer-events: none;
        }
        .smc-paper {
          position: relative;
          height: 100%;
          padding: 20px 22px 20px;
          clip-path: ${TORN_EDGE};
          color: #2b2f45;
          overflow: hidden;
        }
        .smc-handle {
          position: absolute;
          top: 9px;
          left: 50%;
          width: 34px;
          height: 3px;
          margin-left: -17px;
          border-radius: 3px;
          background: rgba(43, 47, 69, 0.18);
        }
        .smc-content { position: relative; height: 100%; }
        .smc-when {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 13px;
          color: rgba(43, 47, 69, 0.6);
          margin: 4px 0 4px;
        }
        .smc-title {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 400;
          font-size: clamp(19px, 5.4vw, 22px);
          line-height: 1.25;
          margin: 0 0 8px;
        }
        .smc-title--lg { font-size: clamp(21px, 6vw, 25px); margin-bottom: 14px; }
        .smc-sentence {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 16px;
          line-height: 1.4;
          color: rgba(43, 47, 69, 0.82);
          margin: 0 0 12px;
        }
        .smc-rule { height: 1px; background: rgba(43, 47, 69, 0.13); margin: 0 0 10px; }
        .smc-actions { display: flex; justify-content: flex-end; }
        .smc-link {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 16px;
          color: var(--journey-cobalt);
          background: transparent;
          border: 0;
          padding: 4px 0;
          cursor: pointer;
        }
        .smc-link--strong { font-weight: 600; }

        .smc-timeline { display: flex; flex-direction: column; }
        .smc-moments {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          -webkit-overflow-scrolling: touch;
        }
        .smc-moment {
          padding: 10px 0 12px;
          border-bottom: 1px solid rgba(43, 47, 69, 0.1);
        }
        .smc-moment:last-child { border-bottom: 0; }
        .smc-moment-when {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 12px;
          color: rgba(43, 47, 69, 0.55);
          margin: 0 0 3px;
        }
        .smc-moment-text,
        .smc-empty {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 16px;
          line-height: 1.4;
          margin: 0;
        }
        .smc-empty { font-style: italic; color: rgba(43, 47, 69, 0.55); padding-top: 6px; }
        .smc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
        }
        .smc-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-style: italic;
          font-size: 15px;
          color: rgba(43, 47, 69, 0.75);
        }
        .smc-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--journey-cobalt);
          box-shadow: 0 0 0 3px rgba(59, 91, 184, 0.15);
        }
        .smc-status.is-arrived .smc-status-dot {
          background: var(--gold-mustard);
          box-shadow: 0 0 0 3px rgba(212, 168, 42, 0.18);
        }
        .smc-more {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(43, 47, 69, 0.12);
          background: rgba(255, 255, 255, 0.45);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .smc-more svg { width: 20px; height: 20px; fill: rgba(43, 47, 69, 0.75); }

        .smc-edit-input {
          width: 100%;
          resize: none;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: 21px;
          line-height: 1.25;
          color: #2b2f45;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(43, 47, 69, 0.15);
          border-radius: 8px;
          padding: 6px 8px;
          outline: none;
        }
        .smc-edit-actions { display: flex; justify-content: flex-end; gap: 18px; margin: 4px 0 8px; }

        .smc-dim {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: rgba(36, 34, 40, 0.38);
          z-index: 5;
          cursor: default;
        }
        .smc-menu {
          position: absolute;
          right: 18px;
          bottom: 68px;
          z-index: 6;
          min-width: 210px;
          padding: 6px 4px;
          border-radius: 10px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
          transform-origin: bottom right;
        }
        .smc-menu button {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border: 0;
          background: transparent;
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 16px;
          color: #2b2f45;
          text-align: left;
          cursor: pointer;
        }
        .smc-menu button + button { border-top: 1px solid rgba(43, 47, 69, 0.1); }
        .smc-menu svg { width: 18px; height: 18px; flex-shrink: 0; }
        .smc-confirm {
          position: absolute;
          left: 16px;
          right: 16px;
          top: 16%;
          z-index: 6;
          padding: 24px 22px 20px;
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
          text-align: center;
        }
        .smc-confirm h3 {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 400;
          font-size: 22px;
          margin: 0 0 10px;
        }
        .smc-confirm p {
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 15px;
          line-height: 1.4;
          color: rgba(43, 47, 69, 0.75);
          margin: 0 0 18px;
        }
        .smc-btn {
          display: block;
          width: 100%;
          height: 44px;
          margin-top: 10px;
          border-radius: 999px;
          border: 1px solid rgba(43, 47, 69, 0.14);
          background: rgba(255, 255, 255, 0.5);
          font-family: var(--font-eb-garamond), Georgia, serif;
          font-size: 16px;
          color: var(--journey-cobalt);
          cursor: pointer;
        }
        .smc-btn--primary {
          background: var(--journey-cobalt);
          border-color: var(--journey-cobalt);
          color: #f7f2e3;
        }
      `}</style>
    </>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** Deterministic torn-paper edge (clip-path polygon). */
const TORN_EDGE = (() => {
  const pts: string[] = [];
  const jag = (i: number, seed: number) => 0.9 * Math.abs((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1);
  const N = 28;
  for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${(jag(i, 1) * 1.4).toFixed(2)}%`);
  for (let i = 1; i <= N; i++) pts.push(`${(100 - jag(i, 2) * 1.1).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  for (let i = N - 1; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% ${(100 - jag(i, 3) * 1.4).toFixed(2)}%`);
  for (let i = N - 1; i >= 1; i--) pts.push(`${(jag(i, 4) * 1.1).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(", ")})`;
})();

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase();
  } catch {
    return "";
  }
}
function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`.toLowerCase();
  } catch {
    return "";
  }
}
