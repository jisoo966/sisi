"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { addSign, loadSignsForStar, updateStar, type EntryKind } from "@/lib/myStars";
import { tornEdge } from "@/lib/tornEdge";
import { SisiSpeechBubble } from "@/components/sisi/SisiSpeechBubble";
import { SisiChatCharacter, type SisiChatExpression } from "@/components/sisi/journey-v2/SisiChatCharacter";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";

/**
 * StarMemoryCard — spending a moment with one Star, on torn ivory paper
 * hanging from it by a thin thread, with Sísí resting on the paper's edge.
 * The black Star World and the tabs stay around it.
 *
 *   invite         Sísí: "Your Star is still here. Shall we spend a quiet
 *                  moment with it?" — Yes, stay with me · View its journey
 *   practice       Sísí: "How would you like to be with your Star today?"
 *                  Picture it · Walk with it · Reflect on today (choose one)
 *   picture-intro  Sísí closes her eyes: "Picture this wish as part of an
 *                  ordinary day…" — Begin
 *   picture        silence: no words, no timer; only "End quietly"
 *   note-ask       "Would you like to leave a small note for this Star?"
 *   reflect        "What would you like your Star to remember about today?"
 *                  Something good · A small step, one short field, Save
 *   saved          the paper folds into a note on the thread; the Star
 *                  brightens once; "I’ll keep this close to your Star."
 *   done           "That was enough for today. Your Star is still here."
 *   journey        the Star's whole path (notes on its thread)
 *
 * Rhythm: Sísí speaks → the user chooses / rests / writes → the bubble
 * fades → Sísí returns for the conclusion. Her words are in a speech
 * bubble; the wish, choices and writing on paper; status in small text.
 * No streaks, points, badges or progress. "Walk with it" hands over to the
 * Journey (onWalkWith). A reflection is ONE record (Star + Moments).
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
  /** A reflection was saved to this Star. */
  onEntrySaved?: (entry: Sign) => void;
  /** where to begin (e.g. "reflect" after walking with this Star) */
  initialMode?: "quick" | "reflect";
  /** "Walk with it": carry this wish down into the Journey */
  onWalkWith?: (star: Star) => void;
  /** "Return to Journey" */
  onReturnToJourney?: () => void;
};

type Mode = "invite" | "practice" | "picture-intro" | "picture" | "note-ask" | "reflect" | "saved" | "done" | "journey";
type Overlay = null | "menu" | "confirm-rest";

const EASE = [0.22, 1, 0.36, 1] as const;
const SOFT = [0.45, 0, 0.25, 1] as const; // soft ease-in-out

/** Journal kinds (the same Star-entry record as before). */
const KIND: Record<EntryKind, { chip: string; label: string; ph: string }> = {
  something_good: { chip: "Something good", label: "Something good", ph: "My friend encouraged me to keep going." },
  small_step: { chip: "A small step", label: "A step I took", ph: "I reviewed my plan and took one small action." },
};
const PRACTICES = [
  { id: "picture", title: "Picture it", desc: "Imagine this wish as part of your life." },
  { id: "walk", title: "Walk with it", desc: "Let Sísí carry this wish with you." },
  { id: "reflect", title: "Reflect on today", desc: "Remember something good or a small step." },
] as const;

/** What Sísí says (and how she looks) in each moment. */
const SAY: Partial<Record<Mode, { text: React.ReactNode; face: SisiChatExpression }>> = {
  invite: { text: <>Your Star is still here.<br />Shall we spend a quiet moment with it?</>, face: "listening" },
  practice: { text: "How would you like to be with your Star today?", face: "listening" },
  "picture-intro": {
    text: <>Picture this wish as part of an ordinary day.<br />Where are you? How do you feel?</>,
    face: "comfort",
  },
  "note-ask": { text: "Would you like to leave a small note for this Star?", face: "listening" },
  reflect: { text: "What would you like your Star to remember about today?", face: "listening" },
  saved: { text: "I’ll keep this close to your Star.", face: "comfort" },
  done: { text: <>That was enough for today.<br />Your Star is still here.</>, face: "comfort" },
};
const FACE: Partial<Record<Mode, SisiChatExpression>> = { picture: "comfort" };

const NOTE_EDGE = tornEdge(23, 18, 2.2);
const JOURNEY_NOTE_EDGES = [tornEdge(31, 16, 3), tornEdge(37, 16, 3), tornEdge(43, 16, 3)];

export function StarMemoryCard({
  star,
  anchor,
  placeholder = false,
  onClose,
  onRest,
  onEdited,
  onCreateStar,
  onDirty,
  onEntrySaved,
  initialMode = "quick",
  onWalkWith,
  onReturnToJourney,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode === "reflect" ? "reflect" : "invite");
  const [reflectBack, setReflectBack] = useState<Mode>(initialMode === "reflect" ? "invite" : "practice");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [kind, setKind] = useState<EntryKind>("something_good");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Sign | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(star.wish);
  const [signs, setSigns] = useState<Sign[] | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Unsaved words → the page asks before leaving.
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const dirty = (editing && draft.trim() !== star.wish.trim()) || (mode === "reflect" && text.trim().length > 0);
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
  }, [mode, signs, saved]);

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

  const openReflect = (from: Mode) => {
    setReflectBack(from);
    setMode("reflect");
  };
  const save = async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true); // no duplicate submissions
    try {
      // the same Star-entry record as the check-in: shown on this Star AND in Moments
      const sign = await addSign(star.id, t, "manual", kind);
      setSigns((list) => [sign, ...(list ?? [])]);
      setSaved(sign);
      setText("");
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
  const choosePractice = (id: (typeof PRACTICES)[number]["id"]) => {
    if (id === "picture") setMode("picture-intro");
    else if (id === "reflect") openReflect("practice");
    else onWalkWith?.(star);
  };

  // journey + completion use the three-zone screen (header · scroll · controls)
  // Every step of the Star detail uses the same three-zone screen.
  const onScreen = true;
  const hasHeader = mode === "journey" || mode === "saved" || mode === "done";
  // each step starts with its Star in view (not wherever the last one scrolled)
  useLayoutEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [mode]);
  // the world's own copy of this Star steps aside while the screen draws it
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("sms-open", onScreen);
    return () => el.classList.remove("sms-open");
  }, [onScreen]);
  const isNote = mode === "saved";
  const say = placeholder ? null : SAY[mode];
  const face: SisiChatExpression = FACE[mode] ?? say?.face ?? "listening";
  // journey: notes hang on the Star's thread, centred under it (kept on screen)
  const colX = Math.min(Math.max(anchor.x, 150), (typeof window !== "undefined" ? window.innerWidth : 390) - 150);

  return (
    <MotionConfig reducedMotion="user">
      {/* Tap outside the paper to put it away (back to My Stars). */}
      <motion.button
        type="button"
        aria-label="Back to My Stars"
        className="smc-backdrop"
        onClick={() => mode !== "picture" && onClose()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* ── Journey + completion: three zones ──────────────────────────
          FixedHeader · ScrollableStarContent (only this scrolls) ·
          BottomControls (CTA above the tabs). Cards and notes sit in
          normal document flow; only the thread is positioned, and it
          stretches with the content. */}
      <AnimatePresence>
        {onScreen && (
          <motion.div
            key="sms"
            className="sms-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: SOFT }}
          >
            {hasHeader && (
            <header className="sms-header">
              {mode === "journey" ? (
                <button type="button" className="smj-icon" aria-label="Back to this Star" onClick={() => setMode("invite")}>
                  <ArrowLeft />
                </button>
              ) : (
                <span className="smj-icon" aria-hidden />
              )}
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
              {mode === "journey" ? (
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
              ) : (
                <span className="smj-icon" aria-hidden />
              )}
            </header>
            )}

            <div
              className="sms-scroll"
              ref={listRef}
              // without a header, the Star sits where it was in the sky
              style={hasHeader ? undefined : { paddingTop: Math.max(8, anchor.y - 44) }}
              onClick={(e) => {
                // a tap on the open sky puts the paper away (not mid-visualization)
                const t = e.target as HTMLElement;
                if (mode !== "picture" && (t === e.currentTarget || t.classList.contains("sms-path"))) onClose();
              }}
            >
              <div className="sms-path">
                <span className="sms-thread" aria-hidden />
                <div className="sms-star" aria-hidden>
                  <span className="sms-star-inner">
                    <StarLayers staged revealed focused />
                  </span>
                </div>

                {!hasHeader && (
                  <div className="sms-stage">
                    {/* Sísí's words above her; she rests on the paper's edge */}
                    {!placeholder && (
                      <div className="sms-say sms-say--card" aria-live="polite">
                        <AnimatePresence mode="wait">
                          {say && (
                            <SisiSpeechBubble key={mode} tailPosition="bottom-right" align="center" delay={0.2} message={say.text} />
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <motion.div
                      className={`sms-paper-wrap${mode === "picture" ? " is-quiet" : ""}`}
                      layout
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ y: { duration: 0.55, ease: EASE }, opacity: { duration: 0.3 }, layout: { duration: 0.4, ease: SOFT } }}
                      role="dialog"
                      aria-label={placeholder ? "Your waiting star" : `Star: ${star.wish}`}
                    >
                      {!placeholder && (
                        <div className="smc-sisi" aria-hidden>
                          <SisiChatCharacter expression={face} />
                        </div>
                      )}
                      <motion.div layout className="sms-paper paper-bg">
                        <AnimatePresence mode="wait" initial={false}>
                {mode === "invite" && (
                  <motion.div key="invite" className="smc-content" {...fade}>
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
                        <button type="button" className="smc-journey-link smc-mt" onClick={() => setMode("journey")}>
                          View its journey <span aria-hidden>→</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}

                {mode === "practice" && (
                  <motion.div key="practice" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode("invite")} onClose={onClose} />
                    <div className="smc-choices" role="list">
                      {PRACTICES.map((p) => (
                        <button key={p.id} type="button" role="listitem" className="smc-choice" onClick={() => choosePractice(p.id)}>
                          <span className="smc-choice-icon" aria-hidden>
                            {p.id === "picture" ? <EyeIcon /> : p.id === "walk" ? <PathIcon /> : <LeafIcon />}
                          </span>
                          <span className="smc-choice-text">
                            <span className="smc-choice-title">{p.title}</span>
                            <span className="smc-choice-desc">{p.desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {mode === "picture-intro" && (
                  <motion.div key="picture-intro" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode("practice")} onClose={onClose} />
                    <h2 className="smc-title smc-center">{star.wish}</h2>
                  </motion.div>
                )}

                {mode === "picture" && (
                  <motion.div key="picture" className="smc-content smc-center" {...fade}>
                    {/* silence is intentional: no words, no timer */}
                    <button type="button" className="smc-quiet-link" onClick={() => setMode("note-ask")}>
                      End quietly
                    </button>
                  </motion.div>
                )}

                {mode === "note-ask" && (
                  <motion.div key="note-ask" className="smc-content" {...fade}>
                    <button type="button" className="smc-primary" onClick={() => openReflect("note-ask")}>
                      Reflect on today
                    </button>
                    <button type="button" className="smc-journey-link" onClick={() => setMode("done")}>
                      Not now
                    </button>
                  </motion.div>
                )}

                {mode === "reflect" && (
                  <motion.div key="reflect" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode(reflectBack)} onClose={onClose} />
                    <div className="smc-chips" role="radiogroup" aria-label="What kind of note">
                      {(Object.keys(KIND) as EntryKind[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={kind === k}
                          className={`smc-chip${kind === k ? " is-on" : ""}`}
                          onClick={() => setKind(k)}
                        >
                          {KIND[k].chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="smc-entry"
                      rows={3}
                      maxLength={240}
                      autoFocus
                      value={text}
                      placeholder={KIND[kind].ph}
                      aria-label="What would you like your Star to remember about today?"
                      onChange={(e) => setText(e.target.value)}
                    />
                  </motion.div>
                )}

                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                {mode === "journey" && (
                  <>
                    {(signs ?? []).map((s, i) => (
                      <motion.article
                        key={s.id}
                        className="sms-card paper-bg"
                        style={{ clipPath: JOURNEY_NOTE_EDGES[i % 3], rotate: i % 2 ? 0.8 : -1 }}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 + Math.min(i, 5) * 0.06, ease: SOFT }}
                      >
                        <span className="sms-bead" aria-hidden />
                        {s.kind ? (
                          <p className="sms-kind">{KIND[s.kind].label}</p>
                        ) : s.momentType === "companion_note" ? (
                          <p className="sms-kind">A note from Sísí</p>
                        ) : null}
                        {s.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="sms-photo" src={s.image} alt="" loading="lazy" />
                        )}
                        <p className="sms-text">{s.text}</p>
                        <p className="sms-date">{dayLabel(s.createdAt)}</p>
                      </motion.article>
                    ))}
                    <article className="sms-card sms-card--origin paper-bg" style={{ clipPath: JOURNEY_NOTE_EDGES[2], transform: "rotate(-0.5deg)" }}>
                      <span className="sms-bead" aria-hidden />
                      <p className="sms-text">Created this Star</p>
                      <p className="sms-date">{formatDate(star.createdAt)}</p>
                    </article>
                  </>
                )}

                {mode === "saved" && saved && (
                  <motion.article
                    className="sms-card paper-bg"
                    style={{ clipPath: NOTE_EDGE, rotate: -1 }}
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: SOFT }}
                  >
                    <span className="sms-bead" aria-hidden />
                    {saved.kind && <p className="sms-kind">{KIND[saved.kind].label}</p>}
                    <p className="sms-text">{saved.text}</p>
                    <p className="sms-date">{dayLabel(saved.createdAt)}</p>
                  </motion.article>
                )}
              </div>

              {(mode === "saved" || mode === "done") && (
                <div className="sms-completion">
                  <div className="sms-say">
                    <SisiSpeechBubble
                      tailPosition="bottom-right"
                      align="center"
                      delay={0.35}
                      message={mode === "saved" ? SAY.saved!.text : SAY.done!.text}
                    />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="sms-sisi" src="/assets/sisi-chat/sisi-chat-seated-neutral.webp" alt="" aria-hidden />
                  {mode === "saved" && <p className="sms-status">Also saved in Moments.</p>}
                  <button type="button" className="sms-secondary" onClick={onClose}>
                    Stay with my Star
                  </button>
                </div>
              )}
            </div>

            <div className="sms-controls">
              {mode === "journey" ? (
                <button type="button" className="smc-primary sms-cta" onClick={() => setMode("practice")}>
                  Spend a moment with this Star
                </button>
              ) : mode === "saved" || mode === "done" ? (
                <button type="button" className="smc-primary sms-cta" onClick={() => onReturnToJourney?.()}>
                  Return to Journey
                </button>
              ) : mode === "invite" && !placeholder ? (
                <button type="button" className="smc-primary sms-cta" onClick={() => setMode("practice")}>
                  Yes, stay with me
                </button>
              ) : mode === "picture-intro" ? (
                <button type="button" className="smc-primary sms-cta" onClick={() => setMode("picture")}>
                  Begin
                </button>
              ) : mode === "reflect" ? (
                <button type="button" className="smc-primary sms-cta" disabled={!text.trim() || saving} onClick={save}>
                  Save to my Star
                </button>
              ) : null}
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
        /* ── three-zone Star screen ── */
        .sms-screen {
          --cta-height: 52px;
          --bottom-gap: 12px;
          /* --nav-total = tab height + margin + safe-area (shared with the dock) */
          --bottom-controls-height: calc(var(--nav-total) + var(--cta-height) + var(--bottom-gap));
          position: absolute; inset: 0; z-index: 11; /* below the tabs (12) */
          display: flex; flex-direction: column; overflow: hidden;
          pointer-events: none;
        }
        .sms-screen > * { pointer-events: auto; }
        .sms-header {
          flex: none; position: relative; z-index: 3;
          display: flex; align-items: flex-start; gap: 6px;
          padding: var(--header-top) max(8px, var(--safe-right)) 8px max(8px, var(--safe-left));
          background: linear-gradient(to bottom, rgba(3, 7, 10, 0.72) 60%, rgba(3, 7, 10, 0));
        }
        .sms-scroll {
          flex: 1; min-height: 0; position: relative; z-index: 1;
          overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          padding: 4px 16px calc(var(--bottom-controls-height) + 32px);
          scrollbar-width: none;
        }
        .sms-scroll::-webkit-scrollbar { display: none; }
        .sms-path { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        /* the thread runs from the Star down through every note */
        .sms-thread {
          position: absolute; z-index: 0; left: 50%; top: 44px; bottom: 28px; width: 1.2px; margin-left: -0.6px;
          background: rgba(241, 226, 184, 0.8);
        }
        .sms-star { position: relative; z-index: 1; width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; }
        .sms-star-inner { display: block; width: 48px; height: 48px; transform: scale(1.7); }
        .sms-card {
          position: relative; z-index: 2; width: min(76vw, 300px); height: auto; margin: 0;
          padding: 16px 18px 14px; color: #2b2f45; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
        }
        .sms-card--origin { width: min(60vw, 240px); text-align: center; }
        .sms-bead { position: absolute; top: 4px; left: calc(50% - 3px); width: 6px; height: 6px; border-radius: 50%; background: #e9b949; }
        .sms-kind { margin: 0 0 6px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13.5px; line-height: 1.2; color: rgba(43, 47, 69, 0.6); }
        .sms-photo { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 2px; margin: 0 0 8px; }
        .sms-text { margin: 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.35; overflow-wrap: break-word; }
        .sms-date { margin: 7px 0 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14px; line-height: 1.2; color: rgba(43, 47, 69, 0.6); }
        .sms-completion { display: flex; flex-direction: column; align-items: center; gap: 0; margin-top: 28px; }
        .sms-say { display: flex; justify-content: flex-end; width: min(86vw, 330px); }
        .sms-sisi { display: block; width: 92px; height: auto; margin: 10px 0 0 min(40vw, 150px); pointer-events: none; user-select: none; }
        .sms-status { margin: 16px 0 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14px; line-height: 1.3; color: rgba(247, 241, 227, 0.72); }
        .sms-secondary {
          margin-top: 24px; min-height: 44px; padding: 0 18px; border: 0; background: transparent; cursor: pointer;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; color: rgba(247, 241, 227, 0.9);
        }
        .sms-controls {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
          height: calc(var(--bottom-controls-height) + 36px);
          padding: 36px max(22px, var(--safe-right)) 0 max(22px, var(--safe-left));
          /* a soft dark fade for readability — never an opaque panel */
          background: linear-gradient(to bottom, rgba(3, 7, 10, 0) 0%, rgba(3, 7, 10, 0.72) 45%, rgba(3, 7, 10, 0.82) 100%);
          pointer-events: none;
        }
        .sms-cta { pointer-events: auto; height: var(--cta-height); min-height: var(--cta-height); }
        .sms-stage { position: relative; z-index: 2; width: min(100%, 400px); display: flex; flex-direction: column; }
        /* bubble tail (≈29px in from its right edge) points at Sísí (72px in from the paper's right) */
        .sms-say--card { width: 100%; justify-content: flex-end; padding-right: 43px; margin-bottom: 72px; min-height: 1px; }
        .sms-say--card .sisi-speech { max-width: min(76vw, 290px); }
        .sms-paper-wrap { position: relative; }
        .sms-paper-wrap.is-quiet { width: min(60%, 220px); margin: 0 auto; }
        .sms-paper-wrap.is-quiet .smc-sisi { right: 50%; transform: scale(0.74) translateX(50%); }
        .sms-paper {
          position: relative; z-index: 1; padding: 20px 22px 18px; color: #2b2f45; clip-path: ${TORN_EDGE};
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
        }
        .sms-screen .smc-sisi { z-index: 2; } /* paws over the paper edge */
        .smc-primary:disabled { opacity: 0.5; }
        /* the world's copy of the open Star steps aside (the screen draws it) */
        html.sms-open .sw-star.is-selected { opacity: 0 !important; }

        /* Sísí on the paper's edge (right), her words above her */
        .smc-sisi { position: absolute; top: 0; right: 72px; width: 0; height: 0; z-index: 3; transform: scale(0.74); transform-origin: 0 0; pointer-events: none; }
        .smc-say { position: absolute; right: 42px; bottom: calc(100% + 84px); z-index: 4; display: flex; justify-content: flex-end; pointer-events: auto; }
        .smc-say .sisi-speech { max-width: min(78vw, 300px); }
        .smc-card.is-note .smc-sisi { right: 20px; }
        .smc-card.is-note .smc-say { right: -8px; }
        .smc-mt { margin-top: 12px; }
        .smc-center { text-align: center; }
        .smc-card.is-quiet { left: 30%; right: 30%; }
        .smc-card.is-quiet .smc-sisi { right: 50%; transform: scale(0.74) translateX(50%); }
        .smc-quiet-link {
          display: block; width: 100%; min-height: 44px; border: 0; background: transparent; cursor: pointer;
          font-family: var(--font-editorial), Georgia, serif; font-size: 15px; color: rgba(24, 51, 58, 0.62);
        }
        .smc-chips { display: flex; gap: 8px; margin: 0 0 10px; }
        .smc-chip {
          flex: 1; min-height: 42px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(43, 47, 69, 0.14);
          background: rgba(255, 255, 255, 0.5); color: #2b2f45; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px;
        }
        .smc-chip.is-on { background: #3d74d8; border-color: #3d74d8; color: #f7f2e3; }
        .smc-status-line { margin: 0 0 10px; text-align: center; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13.5px; color: rgba(247, 241, 227, 0.72); }
        .smc-saved-kind { margin: 0 0 4px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13px; color: rgba(43, 47, 69, 0.58); }
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
        /* the ⋯ menu on the full journey: a small paper menu right under ⋯
           (more specific than .smc-menu, which is anchored to the bottom) */
        .smc-menu.smj-menu {
          position: absolute; top: calc(var(--header-top) + 46px); right: 12px; bottom: auto; left: auto;
          height: auto; min-width: 200px; transform-origin: top right;
        }
        .smj-icon:focus { outline: none; }
        .smj-icon:focus-visible { outline: 1.5px solid rgba(247, 241, 227, 0.7); outline-offset: 2px; border-radius: 50%; }
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
/** Picture it — an eye, gently open */
function EyeIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16c3.2-5 7.3-7.5 12-7.5S24.8 11 28 16c-3.2 5-7.3 7.5-12 7.5S7.2 21 4 16z" />
      <circle cx="16" cy="16" r="3.6" />
    </svg>
  );
}
/** Walk with it — a winding path */
function PathIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 27c0-4 6-4 7-8s-6-4-5-8 5-3.5 7-6" />
      <path d="M19 27c0-3 5-3.5 5.5-7" opacity=".55" />
      <circle cx="23" cy="5" r="1.4" />
    </svg>
  );
}
/** Reflect on today — a small leaf, like a note */
function LeafIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 25C7 14 13 7 26 6c0 12-7 19-19 19z" />
      <path d="M7 25 18 14" />
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
