"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { addSign, loadSignsForStar, updateStar, type EntryKind } from "@/lib/myStars";
import { tornEdge } from "@/lib/tornEdge";
import { hintDone, markHint } from "@/lib/hints";
import { thoughtAfterCheckIn, isKept, type Thought } from "@/lib/sisiThoughts";
import { keepThought } from "@/components/sisi/journey-v2/CompanionCues";

/**
 * StarMemoryCard — the Star check-in, on torn ivory paper hanging from the
 * selected Star by a thin thread (the black Star World stays around it).
 *
 *   quick    date · wish · Still walking · "Your Star is still here."
 *            → Check in with this Star   ·   View full journey →
 *   choose   the paper grows upward: "What would you like to share with this
 *            Star today?" — Something good | A step I took (one branch only)
 *   write    one short reflection → Save to my Star
 *   saved    the paper folds into a small torn note on the thread, the Star
 *            brightens once; Back to My Stars · View full journey →
 *   journey  the Star's whole path: small notes on its thread, newest
 *            nearest the Star, down to when it was created
 *
 * The wish itself is never edited here (only via the quiet ⋯ menu on the
 * full journey). Back: write → choose → quick. Close → My Stars.
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
  /** Placeholder star → open the Create Star flow. */
  onCreateStar?: () => void;
  /** Unsaved edits in the card (so leaving can ask first). */
  onDirty?: (dirty: boolean) => void;
  /** A check-in was saved to this Star. */
  onEntrySaved?: (entry: Sign) => void;
};

type Mode = "quick" | "choose" | "write" | "saved" | "journey";
type Overlay = null | "menu" | "confirm-rest";

const EASE = [0.22, 1, 0.36, 1] as const;
const SOFT = [0.45, 0, 0.25, 1] as const; // soft ease-in-out

const CHOICE: Record<EntryKind, { title: string; desc: string; q: string; sub: string; ph: string }> = {
  something_good: {
    title: "Something good",
    desc: "Something that made you feel hopeful or grateful.",
    q: "What felt good or meaningful today?",
    sub: "A kind word, a small opportunity, or anything that gave you hope.",
    ph: "My friend encouraged me to keep going.",
  },
  small_step: {
    title: "A step I took",
    desc: "Something you did, however small.",
    q: "What small step did you take?",
    sub: "Even a very small step counts.",
    ph: "I reviewed my plan and took one small action.",
  },
};
const NOTE_EDGE = tornEdge(23, 18, 2.2);
const JOURNEY_NOTE_EDGES = [tornEdge(31, 16, 3), tornEdge(37, 16, 3), tornEdge(43, 16, 3)];

export function StarMemoryCard({ star, anchor, placeholder = false, onClose, onRest, onEdited, onCreateStar, onDirty, onEntrySaved }: Props) {
  const [mode, setMode] = useState<Mode>("quick");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [kind, setKind] = useState<EntryKind | null>(null);
  // Typed text is kept per branch for this session (Back never loses it).
  const [drafts, setDrafts] = useState<Record<EntryKind, string>>({ something_good: "", small_step: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Sign | null>(null);
  // under the saved note: the first time, where to find it; otherwise, now
  // and then, a thought for the walk
  const [after, setAfter] = useState<{ hint: true } | { thought: Thought; kept: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(star.wish);
  const [signs, setSigns] = useState<Sign[] | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Unsaved words → the page asks before leaving.
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const dirty =
    (editing && draft.trim() !== star.wish.trim()) ||
    (mode === "write" && !!kind && drafts[kind].trim().length > 0);
  useEffect(() => {
    onDirtyRef.current?.(dirty);
  }, [dirty]);
  useEffect(() => () => onDirtyRef.current?.(false), []);

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
    const t = setTimeout(measure, 520); // after a layout change settles
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [mode, kind, signs, saved]);

  // Thin, slightly imperfect ivory thread from just under the star to a bead
  // on the paper's top edge.
  const threadEnd = mode === "journey" || cardTop === null ? null : Math.max(anchor.y + 42, cardTop + 1);
  const lineD = useMemo(() => {
    if (threadEnd === null) return "";
    const x0 = anchor.x;
    const y0 = anchor.y + 30;
    const len = threadEnd - y0;
    const j = (k: number) => Math.sin(anchor.x * 0.37 + k * 2.1) * 2.4;
    return `M ${x0} ${y0} C ${x0 + j(1)} ${y0 + len * 0.3}, ${x0 + j(2)} ${y0 + len * 0.62}, ${x0} ${threadEnd}`;
  }, [anchor.x, anchor.y, threadEnd]);

  const choose = (k: EntryKind) => {
    setKind(k);
    setMode("write");
  };
  const save = async () => {
    if (!kind || saving) return;
    const t = drafts[kind].trim();
    if (!t) return;
    setSaving(true); // no duplicate submissions
    try {
      const sign = await addSign(star.id, t, "manual", kind);
      setSigns((list) => [sign, ...(list ?? [])]);
      setSaved(sign);
      if (!hintDone("starSaved")) {
        markHint("starSaved");
        setAfter({ hint: true });
      } else {
        const t = thoughtAfterCheckIn();
        setAfter(t ? { thought: t, kept: isKept(t.id) } : null);
      }
      setDrafts((d) => ({ ...d, [kind]: "" }));
      setMode("saved");
      onEntrySaved?.(sign);
    } finally {
      setSaving(false);
    }
  };
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

  const onCard = mode !== "journey";
  const isNote = mode === "saved";
  // journey: notes hang on the Star's thread, centred under it (kept on screen)
  const colX = Math.min(Math.max(anchor.x, 150), (typeof window !== "undefined" ? window.innerWidth : 390) - 150);

  return (
    <MotionConfig reducedMotion="user">
      {/* Tap outside the paper to put it away (back to My Stars). */}
      <motion.button
        type="button"
        aria-label="Back to My Stars"
        className="smc-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {onCard && lineD && threadEnd !== null && (
        <svg className="smc-line" aria-hidden>
          <motion.path
            d={lineD}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, d: lineD }}
            exit={{ pathLength: 0, transition: { duration: 0.35, ease: "easeIn" } }}
            transition={{ pathLength: { duration: 0.55, delay: 0.35, ease: EASE }, d: { duration: 0.45, ease: SOFT } }}
          />
          <motion.circle
            r={3}
            className="smc-bead"
            initial={{ opacity: 0, cx: anchor.x, cy: threadEnd }}
            animate={{ opacity: 1, cx: anchor.x, cy: threadEnd }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ opacity: { delay: 0.8, duration: 0.25 }, cy: { duration: 0.45, ease: SOFT } }}
          />
        </svg>
      )}

      <AnimatePresence>
        {onCard && (
          <motion.div
            key="card"
            ref={cardRef}
            layout
            className={`smc-card${isNote ? " is-note" : ""}`}
            style={{ rotate: isNote ? -1.2 : -0.5 }}
            initial={{ y: "115%" }}
            animate={{ y: 0 }}
            exit={{ y: "120%", transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] } }}
            transition={{
              y: { duration: 0.6, delay: 0.12, ease: EASE },
              // paper grows ~0.4s; folding into a note ~0.5s
              layout: { duration: isNote ? 0.52 : 0.4, ease: SOFT },
            }}
            role="dialog"
            aria-label={placeholder ? "Your waiting star" : `Star: ${star.wish}`}
          >
            <span className="smc-shadow" aria-hidden />
            <motion.div layout className="smc-paper paper-bg" style={isNote ? { clipPath: NOTE_EDGE } : undefined}>
              {!isNote && <span className="smc-handle" aria-hidden />}
              <AnimatePresence mode="wait" initial={false}>
                {mode === "quick" && (
                  <motion.div key="quick" className="smc-content" {...fade}>
                    <p className="smc-when">{placeholder ? "Tonight" : formatDate(star.createdAt)}</p>
                    <h2 className="smc-title">{placeholder ? "a star, waiting" : star.wish || "your star"}</h2>
                    {placeholder ? (
                      <>
                        <p className="smc-sentence">this star is waiting for your wish.</p>
                        <div className="smc-actions">
                          <button
                            type="button"
                            className="smc-link"
                            onClick={() => {
                              onClose();
                              onCreateStar?.();
                            }}
                          >
                            make a wish <span aria-hidden>→</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <StatusMark arrived={!!star.fulfilledAt} />
                        <p className="smc-body">Your Star is still here.</p>
                        <p className="smc-support">Pause for a moment and reconnect with your wish.</p>
                        <button type="button" className="smc-primary" onClick={() => setMode("choose")}>
                          Check in with this Star
                        </button>
                        <button type="button" className="smc-journey-link" onClick={() => setMode("journey")}>
                          View full journey <span aria-hidden>→</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}

                {mode === "choose" && (
                  <motion.div key="choose" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode("quick")} onClose={onClose} />
                    <h2 className="smc-title smc-q">What would you like to share with this Star today?</h2>
                    <div className="smc-choices" role="list">
                      {(Object.keys(CHOICE) as EntryKind[]).map((k) => (
                        <button key={k} type="button" role="listitem" className="smc-choice" onClick={() => choose(k)}>
                          <span className="smc-choice-icon" aria-hidden>
                            {k === "something_good" ? <SunIcon /> : <SproutIcon />}
                          </span>
                          <span className="smc-choice-text">
                            <span className="smc-choice-title">{CHOICE[k].title}</span>
                            <span className="smc-choice-desc">{CHOICE[k].desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {mode === "write" && kind && (
                  <motion.div key={`write-${kind}`} className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode("choose")} onClose={onClose} />
                    <h2 className="smc-title smc-q">{CHOICE[kind].q}</h2>
                    <p className="smc-support">{CHOICE[kind].sub}</p>
                    <textarea
                      className="smc-entry"
                      rows={3}
                      maxLength={240}
                      autoFocus
                      value={drafts[kind]}
                      placeholder={CHOICE[kind].ph}
                      aria-label={CHOICE[kind].q}
                      onChange={(e) => setDrafts((d) => ({ ...d, [kind]: e.target.value }))}
                    />
                    <button type="button" className="smc-primary" disabled={!drafts[kind].trim() || saving} onClick={save}>
                      Save to my Star
                    </button>
                  </motion.div>
                )}

                {mode === "saved" && saved && (
                  <motion.div
                    key="saved"
                    className="smc-content smc-saved"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.3 } }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  >
                    <p className="smc-saved-text">{saved.text}</p>
                    <p className="smc-saved-when">{dayLabel(saved.createdAt)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* After saving: only these two, below the note (no "reflect again") */}
      <AnimatePresence>
        {mode === "saved" && (
          <motion.div
            key="saved-actions"
            className="smc-after"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {after && "hint" in after && (
              <p className="smc-after-line">Saved to your Star. You can also find this in Moments.</p>
            )}
            {after && "thought" in after && (
              <div className="smc-after-thought">
                <p className="smc-after-kicker">A thought for your walk</p>
                <p className="smc-after-line">{after.thought.text}</p>
                <button
                  type="button"
                  className="smc-after-keep"
                  disabled={after.kept}
                  onClick={async () => {
                    setAfter({ ...after, kept: true });
                    await keepThought(after.thought);
                  }}
                >
                  {after.kept ? "Kept in your Moments" : "Keep this"}
                </button>
              </div>
            )}
            <button type="button" className="smc-primary" onClick={onClose}>
              Back to My Stars
            </button>
            <button type="button" className="smc-journey-link smc-journey-link--light" onClick={() => setMode("journey")}>
              View full journey <span aria-hidden>→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full journey: the Star's path in notes on its thread ── */}
      <AnimatePresence>
        {mode === "journey" && (
          <motion.div
            key="journey"
            className="smj-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: SOFT }}
          >
            <header className="smj-head">
              <button type="button" className="smj-icon" aria-label="Back to this Star" onClick={() => setMode("quick")}>
                <ArrowLeft />
              </button>
              <div className="smj-titles">
                {editing ? (
                  <div className="smj-edit paper-bg">
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
                  <h2 className="smj-title">{star.wish || "your star"}</h2>
                )}
                <span className="smj-status">
                  <span className="smc-status-dot" aria-hidden />
                  {star.fulfilledAt ? "It arrived" : "Still walking"}
                </span>
              </div>
              <button
                type="button"
                className="smj-icon"
                aria-label="Manage this star"
                aria-expanded={overlay === "menu"}
                onClick={() => setOverlay(overlay === "menu" ? null : "menu")}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="smj-dots">
                  <circle cx="6" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="18" cy="12" r="1.6" />
                </svg>
              </button>
            </header>

            <div className="smj-scroll" ref={listRef} style={{ top: anchor.y + 34 }}>
              <div className="smj-col" style={{ ["--thread-x" as string]: `${anchor.x - colX}px`, left: colX }}>
                <span className="smj-thread" aria-hidden />
                {(signs ?? []).map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="smj-note paper-bg"
                    style={{ clipPath: JOURNEY_NOTE_EDGES[i % 3], rotate: i % 2 ? 1 : -1.2 }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + Math.min(i, 5) * 0.06, ease: SOFT }}
                  >
                    <span className="smj-bead" aria-hidden />
                    {s.kind ? (
                      <span className="smj-kind">{CHOICE[s.kind].title}</span>
                    ) : s.momentType === "companion_note" ? (
                      <span className="smj-kind">A note from Sísí</span>
                    ) : null}
                    {s.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="smj-photo" src={s.image} alt="" loading="lazy" />
                    )}
                    <span className="smj-text">{s.text}</span>
                    <span className="smj-when">{dayLabel(s.createdAt)}</span>
                  </motion.div>
                ))}
                <motion.div
                  className="smj-note smj-note--origin paper-bg"
                  style={{ clipPath: JOURNEY_NOTE_EDGES[2], rotate: -0.6 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                >
                  <span className="smj-bead" aria-hidden />
                  <span className="smj-text">Created this Star</span>
                  <span className="smj-when">{formatDate(star.createdAt)}</span>
                </motion.div>
              </div>
            </div>

            <div className="smj-foot">
              <button type="button" className="smc-primary" onClick={() => setMode("choose")}>
                Check in with this Star
              </button>
            </div>

            {/* the quiet ⋯ menu: edit the wish · let this star rest */}
            <AnimatePresence>
              {overlay && (
                <motion.button
                  type="button"
                  aria-label="Close"
                  className="smc-dim smj-dim"
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
                  className="smc-menu smj-menu paper-bg"
                  role="menu"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
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
        )}
      </AnimatePresence>

      <style jsx global>{`
        .smc-body { margin: 10px 0 2px; font-family: var(--font-fraunces), Georgia, serif; font-size: 18px; line-height: 1.3; color: #2b2f45; }
        .smc-support { margin: 0 0 14px; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; line-height: 1.38; color: rgba(43, 47, 69, 0.66); }
        .smc-primary {
          display: block; width: 100%; min-height: 48px; border: 0; border-radius: 999px; cursor: pointer;
          background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px;
        }
        .smc-primary:disabled { opacity: 0.45; cursor: default; }
        .smc-journey-link {
          display: block; margin: 8px auto 0; min-height: 44px; padding: 0 12px; border: 0; background: transparent; cursor: pointer;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; color: #3d74d8;
        }
        .smc-journey-link--light { color: rgba(247, 241, 227, 0.9); }
        .smc-navrow { display: flex; justify-content: space-between; margin: -6px -10px 2px; }
        .smc-navbtn {
          width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: rgba(43, 47, 69, 0.72);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .smc-navbtn svg { width: 20px; height: 20px; }
        .smc-q { font-size: clamp(19px, 5.4vw, 22px); margin-bottom: 12px; }
        .smc-choices { display: flex; flex-direction: column; gap: 10px; margin: 4px 0 4px; }
        .smc-choice {
          display: flex; align-items: center; gap: 14px; width: 100%; min-height: 76px; padding: 12px 16px; text-align: left;
          border-radius: 14px; border: 1px solid rgba(43, 47, 69, 0.12); background: rgba(255, 255, 255, 0.5); cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .smc-choice:hover, .smc-choice:focus-visible { background: rgba(255, 255, 255, 0.75); border-color: rgba(61, 116, 216, 0.35); outline: none; }
        .smc-choice-icon { flex: 0 0 34px; width: 34px; height: 34px; color: #3d74d8; }
        .smc-choice-icon svg { width: 100%; height: 100%; }
        .smc-choice-text { display: flex; flex-direction: column; gap: 3px; }
        .smc-choice-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 18px; color: #2b2f45; }
        .smc-choice-desc { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14.5px; line-height: 1.3; color: rgba(43, 47, 69, 0.64); }
        .smc-entry {
          width: 100%; resize: none; padding: 12px 14px; margin: 0 0 12px; border-radius: 10px;
          border: 1px solid rgba(43, 47, 69, 0.16); background: rgba(255, 255, 255, 0.55); outline: none;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.35; color: #2b2f45;
        }
        .smc-entry::placeholder { font-style: italic; color: rgba(43, 47, 69, 0.4); }
        /* saved: a small torn note on the thread; the actions sit below it */
        .smc-card.is-note { left: 18%; right: 18%; bottom: calc(var(--nav-total) + 132px); }
        .smc-card.is-note .smc-paper { padding: 18px 18px 14px; }
        .smc-saved-text { margin: 0 0 8px; font-family: var(--font-fraunces), Georgia, serif; font-size: 17px; line-height: 1.32; color: #2b2f45; }
        .smc-saved-when { margin: 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14px; color: rgba(43, 47, 69, 0.6); }
        .smc-after-line { margin: 0 0 12px; text-align: center; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15.5px; line-height: 1.4; color: rgba(247, 241, 227, 0.86); }
        .smc-after-thought { text-align: center; margin-bottom: 6px; }
        .smc-after-thought .smc-after-line { margin-bottom: 2px; font-style: normal; font-family: var(--font-fraunces), Georgia, serif; font-size: 16px; }
        .smc-after-kicker { margin: 0 0 4px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13px; color: rgba(247, 241, 227, 0.6); }
        .smc-after-keep { min-height: 40px; margin-bottom: 6px; padding: 0 8px; border: 0; background: transparent; cursor: pointer; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: #f1e2b8; }
        .smc-after-keep:disabled { color: rgba(247, 241, 227, 0.55); cursor: default; }
        .smc-after {
          position: absolute; z-index: 23; left: max(22px, var(--safe-left)); right: max(22px, var(--safe-right));
          bottom: calc(var(--nav-total) + 14px);
        }

        /* ── full journey ── */
        .smj-root { position: absolute; inset: 0; z-index: 22; pointer-events: none; }
        .smj-root > * { pointer-events: auto; }
        .smj-head {
          position: absolute; left: 0; right: 0; top: var(--header-top); z-index: 3;
          display: flex; align-items: flex-start; gap: 6px; padding: 0 max(8px, var(--safe-right)) 0 max(8px, var(--safe-left));
        }
        .smj-icon {
          flex: 0 0 44px; width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer;
          color: rgba(247, 241, 227, 0.85); display: inline-flex; align-items: center; justify-content: center;
        }
        .smj-icon svg { width: 20px; height: 20px; }
        .smj-dots { fill: rgba(247, 241, 227, 0.85); }
        .smj-titles { flex: 1; min-width: 0; padding-top: 6px; }
        .smj-title { margin: 0 0 4px; font-family: var(--font-fraunces), Georgia, serif; font-weight: 400; font-size: clamp(22px, 6.4vw, 27px); line-height: 1.2; color: #f7f1e3; }
        .smj-status { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15px; color: rgba(247, 241, 227, 0.8); }
        .smj-edit { padding: 10px 12px; border-radius: 6px; margin-bottom: 6px; }
        .smj-scroll {
          position: absolute; left: 0; right: 0; bottom: calc(var(--nav-total) + 80px);
          overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 36px), transparent);
          mask-image: linear-gradient(to bottom, #000 calc(100% - 36px), transparent);
        }
        .smj-col { position: relative; width: min(66vw, 260px); transform: translateX(-50%); padding: 18px 0 40px; display: flex; flex-direction: column; gap: 26px; align-items: center; }
        .smj-thread {
          position: absolute; top: -34px; bottom: 30px; width: 1.2px; left: calc(50% + var(--thread-x, 0px));
          background: rgba(241, 226, 184, 0.8);
        }
        .smj-note {
          position: relative; width: 100%; padding: 14px 16px 12px; color: #2b2f45;
          display: flex; flex-direction: column; gap: 4px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
        }
        .smj-bead { position: absolute; top: 3px; left: calc(50% - 3px + var(--thread-x, 0px)); width: 6px; height: 6px; border-radius: 50%; background: #e9b949; }
        .smj-photo { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 2px; margin: 2px 0 4px; }
        .smj-kind { font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13px; color: rgba(43, 47, 69, 0.58); }
        .smj-text { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16.5px; line-height: 1.34; }
        .smj-when { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13.5px; color: rgba(43, 47, 69, 0.58); }
        .smj-note--origin { width: 78%; text-align: center; align-items: center; }
        .smj-foot { position: absolute; left: max(22px, var(--safe-left)); right: max(22px, var(--safe-right)); bottom: calc(var(--nav-total) + 16px); }
        .smj-dim { position: fixed !important; }
        .smj-menu { position: absolute; top: calc(var(--header-top) + 48px); right: 14px; bottom: auto; transform-origin: top right; }
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
        .smc-moment.is-quiet .smc-moment-text { font-style: italic; color: rgba(43, 47, 69, 0.6); }
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
    </MotionConfig>
  );
}

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

function NavRow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div className="smc-navrow">
      <button type="button" className="smc-navbtn" aria-label="Back" onClick={onBack}>
        <ArrowLeft />
      </button>
      <button type="button" className="smc-navbtn" aria-label="Close" onClick={onClose}>
        <CloseIcon />
      </button>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
/** Something good — a small, refined sun */
function SunIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="16" cy="16" r="5.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={16 + Math.cos(r) * 8.6} y1={16 + Math.sin(r) * 8.6} x2={16 + Math.cos(r) * 11.6} y2={16 + Math.sin(r) * 11.6} />;
      })}
    </svg>
  );
}
/** A step I took — a sprout */
function SproutIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 27V15" />
      <path d="M16 17c0-4.5-3.2-7.4-8-7.4 0 4.6 3.4 7.4 8 7.4z" />
      <path d="M16 15c0-4.2 3-7.2 7.8-7.2 0 4.4-3.2 7.2-7.8 7.2z" />
      <path d="M11 27h10" />
    </svg>
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

function StatusMark({ arrived }: { arrived: boolean }) {
  return (
    <span className={`smc-status${arrived ? " is-arrived" : ""}`}>
      <span className="smc-status-dot" aria-hidden />
      {arrived ? "It arrived" : "Still walking"}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
/** "Today" · "Yesterday" · "3 days ago" · "Jul 1" */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 864e5);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
