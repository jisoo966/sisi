"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { addSign, loadSignsForStar, updateStar, type EntryKind } from "@/lib/myStars";
import {
  ConfirmationDialog,
  FilterChip,
  IconBack,
  IconButton,
  IconChevronRight,
  IconClose,
  IconPencil,
  OverflowMenu,
  PrimaryButton,
  StatusChip,
  TextAction,
} from "@/components/ds";
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
  /** where to begin:
   *   journey    the Star's timeline (default for every visit)
   *   quick      Sísí's invitation (an occasional later visit)
   *   reflect    straight to "Reflect on today" (after walking with this Star)
   *   celebrate  a quiet "Your Star is here." right after creating it */
  initialMode?: StarEntry;
  /** "Walk with it": carry this wish down into the Journey */
  onWalkWith?: (star: Star) => void;
  /** "Return to Journey" */
  onReturnToJourney?: () => void;
};

export type StarEntry = "journey" | "quick" | "reflect" | "celebrate";
type Mode = "invite" | "practice" | "picture-intro" | "picture" | "note-ask" | "reflect" | "saved" | "done" | "journey" | "celebrate";
type Overlay = null | "confirm-rest";

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
  celebrate: { text: "Your Star is here.", face: "comfort" },
};
const FACE: Partial<Record<Mode, SisiChatExpression>> = { picture: "comfort" };


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
  initialMode = "journey",
  onWalkWith,
  onReturnToJourney,
}: Props) {
  const [mode, setMode] = useState<Mode>(
    placeholder ? "invite" : initialMode === "reflect" ? "reflect" : initialMode === "celebrate" ? "celebrate" : initialMode === "quick" ? "invite" : "journey",
  );
  const [reflectBack, setReflectBack] = useState<Mode>(initialMode === "reflect" ? "journey" : "practice");
  /** where "back" from the activity choice returns (the timeline, or the invitation) */
  const [practiceBack, setPracticeBack] = useState<Mode>("journey");
  const startPractice = (from: Mode) => {
    setPracticeBack(from);
    setMode("practice");
  };
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
  /** the chosen card settles (0.98), the others fade, then the practice begins */
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (id: (typeof PRACTICES)[number]["id"]) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => {
      choosePractice(id);
      setPicked(null);
    }, 240);
  };

  // journey + completion use the three-zone screen (header · scroll · controls)
  // Every step of the Star detail uses the same three-zone screen.
  const onScreen = true;
  const hasHeader = mode === "journey";
  /** completion moments: one clear way on, then back to this Star */
  const completion = mode === "saved" || mode === "done" || mode === "celebrate";
  // A focused choice: the paper is a bottom sheet, the Star and Sísí's words
  // share the rest of the screen, and the global tabs step aside.
  const focus = mode === "practice";
  /** the global tabs step aside during the choice and the completion moments */
  const hideNav = focus || completion;
  useEffect(() => {
    const el = document.documentElement;
    if (hideNav) {
      el.classList.add("sms-focus");
      return;
    }
    // the paper begins to close first, then the tabs return
    const t = setTimeout(() => el.classList.remove("sms-focus"), 120);
    return () => clearTimeout(t);
  }, [hideNav]);
  useEffect(() => () => document.documentElement.classList.remove("sms-focus"), []);
  const hasControls =
    mode === "journey" || completion || (mode === "invite" && !placeholder) || mode === "picture-intro" || mode === "reflect";
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
            className={`sms-screen${focus ? " is-focus" : ""}${hideNav ? " no-nav" : ""}${completion ? " is-completion" : ""}`}
            style={{ ["--star-top" as string]: `${Math.max(8, anchor.y - 44)}px` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: SOFT }}
          >
            {hasHeader && (
            <header className="sms-header">
              {mode === "journey" ? (
                <IconButton surface="dark" label="Back to My Stars" onClick={onClose}>
                  <IconBack />
                </IconButton>
              ) : (
                <span className="smj-icon" aria-hidden />
              )}
              <div className="smj-titles">
                {editing ? (
                  <div className="smj-edit ds-paper">
                    <textarea
                      className="ds-field smc-edit-input"
                      aria-label="Your wish"
                      value={draft}
                      rows={2}
                      maxLength={140}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="smc-edit-actions">
                      <TextAction onClick={() => { setDraft(star.wish); setEditing(false); }}>Cancel</TextAction>
                      <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <h2 className="smj-title">{star.wish || "Your Star"}</h2>
                )}
                <StatusChip surface="dark" tone="star">{star.fulfilledAt ? "Fulfilled" : "Still walking"}</StatusChip>
              </div>
              {mode === "journey" ? (
                <OverflowMenu
                  surface="dark"
                  label="Manage this Star"
                  items={[
                    { label: "Edit Star", icon: <IconPencil size={18} />, destructive: false, onSelect: () => setEditing(true) },
                    { label: "Let this Star rest", icon: <MoonIcon />, destructive: true, onSelect: () => setOverlay("confirm-rest") },
                  ]}
                />
              ) : (
                <span className="smj-icon" aria-hidden />
              )}
            </header>
            )}

            <div
              className="sms-scroll"
              ref={listRef}
              // without a header, the Star sits where it was in the sky
              style={hasHeader || focus ? undefined : { paddingTop: Math.max(8, anchor.y - 44) }}
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
                      <motion.div layout className="sms-paper ds-paper">
                        <AnimatePresence mode="wait" initial={false}>
                {mode === "invite" && (
                  <motion.div key="invite" className="smc-content" {...fade}>
                    <p className="t-meta smc-when">{placeholder ? "Tonight" : formatDate(star.createdAt)}</p>
                    <h2 className="t-card-title smc-title">{placeholder ? "A Star, waiting" : star.wish || "Your Star"}</h2>
                    {placeholder ? (
                      <>
                        <p className="t-body smc-sentence">This Star is waiting for your wish.</p>
                        <PrimaryButton
                          block
                          onClick={() => {
                            onClose();
                            onCreateStar?.();
                          }}
                        >
                          Make a wish
                        </PrimaryButton>
                      </>
                    ) : (
                      <>
                        <StatusChip tone="star">{star.fulfilledAt ? "Fulfilled" : "Still walking"}</StatusChip>
                        <TextAction className="smc-journey-link" onClick={() => setMode("journey")}>
                          View journey <IconChevronRight size={16} />
                        </TextAction>
                      </>
                    )}
                  </motion.div>
                )}

                {mode === "practice" && (
                  <motion.div key="practice" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode(practiceBack)} onClose={onClose} />
                    <ChoiceList>
                      {PRACTICES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`smc-choice${picked === p.id ? " is-picked" : picked ? " is-faded" : ""}`}
                          onClick={() => pick(p.id)}
                        >
                          <span className="smc-choice-icon" aria-hidden>
                            {p.id === "picture" ? <EyeIcon /> : p.id === "walk" ? <PathIcon /> : <LeafIcon />}
                          </span>
                          <span className="smc-choice-text">
                            <span className="smc-choice-title">{p.title}</span>
                            <span className="smc-choice-desc">{p.desc}</span>
                          </span>
                        </button>
                      ))}
                    </ChoiceList>
                  </motion.div>
                )}

                {mode === "picture-intro" && (
                  <motion.div key="picture-intro" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode("practice")} onClose={onClose} />
                    <h2 className="t-card-title smc-title smc-center">{star.wish}</h2>
                  </motion.div>
                )}

                {mode === "picture" && (
                  <motion.div key="picture" className="smc-content smc-center" {...fade}>
                    {/* silence is intentional: no words, no timer */}
                    <TextAction className="smc-quiet-link" onClick={() => setMode("note-ask")}>
                      End quietly
                    </TextAction>
                  </motion.div>
                )}

                {mode === "note-ask" && (
                  <motion.div key="note-ask" className="smc-content" {...fade}>
                    <PrimaryButton block onClick={() => openReflect("note-ask")}>
                      Reflect on today
                    </PrimaryButton>
                    <TextAction className="smc-journey-link" onClick={() => setMode("done")}>
                      Not now
                    </TextAction>
                  </motion.div>
                )}

                {mode === "saved" && saved && (
                  <motion.div key="saved" className="smc-content" {...fade}>
                    <p className="t-meta smc-when">
                      {dayLabel(saved.createdAt)}
                      {saved.kind ? ` · ${KIND[saved.kind].label}` : ""}
                    </p>
                    <p className="t-dialogue smc-saved-text">{saved.text}</p>
                    <p className="t-meta smc-saved-also">Also saved in Moments.</p>
                  </motion.div>
                )}

                {(mode === "done" || mode === "celebrate") && (
                  <motion.div key={mode} className="smc-content" {...fade}>
                    <p className="t-meta smc-when">{mode === "celebrate" ? "Created today" : formatDate(star.createdAt)}</p>
                    <h2 className="t-card-title smc-title">{star.wish || "Your Star"}</h2>
                    <StatusChip tone="star">{star.fulfilledAt ? "Fulfilled" : "Still walking"}</StatusChip>
                  </motion.div>
                )}

                {mode === "reflect" && (
                  <motion.div key="reflect" className="smc-content" {...fade}>
                    <NavRow onBack={() => setMode(reflectBack)} onClose={onClose} />
                    <div className="ds-chip-row smc-chips" role="group" aria-label="What kind of note">
                      {(Object.keys(KIND) as EntryKind[]).map((k) => (
                        <FilterChip key={k} selected={kind === k} onClick={() => setKind(k)}>
                          {KIND[k].chip}
                        </FilterChip>
                      ))}
                    </div>
                    <textarea
                      className="ds-field smc-entry"
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
                        className="ds-memory sms-card"
                        style={{ rotate: i % 2 ? 0.8 : -1 }}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 + Math.min(i, 5) * 0.06, ease: SOFT }}
                      >
                        <div className="ds-memory-sheet ds-paper">
                          <p className="sms-date">
                            {dayLabel(s.createdAt)}
                            {s.kind ? ` · ${KIND[s.kind].label}` : s.momentType === "companion_note" ? " · A note from Sísí" : ""}
                          </p>
                          <p className="sms-text">{s.text}</p>
                          {s.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="ds-memory-image" src={s.image} alt="" loading="lazy" />
                          )}
                        </div>
                        <span className="sms-bead" aria-hidden />
                      </motion.article>
                    ))}
                    <article className="ds-memory sms-card sms-card--origin" style={{ transform: "rotate(-0.5deg)" }}>
                      <div className="ds-memory-sheet ds-paper">
                        <p className="sms-date">{formatDate(star.createdAt)}</p>
                        <p className="sms-text">Created this Star</p>
                      </div>
                      <span className="sms-bead" aria-hidden />
                    </article>
                  </>
                )}

              </div>

            </div>

            {hasControls && <div className="sms-controls">
              {mode === "journey" ? (
                <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" onClick={() => startPractice("journey")}>
                  Spend a moment with this Star
                </button>
              ) : completion ? (
                <div className="sms-cta-pair">
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta"
                    onClick={() => {
                      setSaved(null);
                      setMode("journey");
                    }}
                  >
                    {mode === "celebrate" ? "View my Star" : "Stay with my Star"}
                  </button>
                  <TextAction surface="dark" className="sms-cta-secondary" onClick={() => onReturnToJourney?.()}>
                    Return to Journey
                  </TextAction>
                </div>
              ) : mode === "invite" && !placeholder ? (
                <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" onClick={() => startPractice("invite")}>
                  Spend a quiet moment
                </button>
              ) : mode === "picture-intro" ? (
                <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" onClick={() => setMode("picture")}>
                  Begin
                </button>
              ) : mode === "reflect" ? (
                <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" disabled={!text.trim() || saving} onClick={save}>
                  Save to my Star
                </button>
              ) : null}
            </div>}

            <ConfirmationDialog
              open={overlay === "confirm-rest"}
              title="Let this Star rest?"
              message="It will leave your Star path, but stay safely in your Moments."
              confirmLabel="Let it rest"
              cancelLabel="Keep walking"
              onConfirm={() => onRest(star)}
              onCancel={() => setOverlay(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        /* ── three-zone Star screen: header · scroll · controls ── */
        .sms-screen {
          --cta-height: 52px;
          --bottom-gap: 12px;
          /* --nav-total = tab height + margin + safe-area (shared with the dock) */
          --bottom-controls-height: calc(var(--nav-total) + var(--cta-height) + var(--bottom-gap));
          position: absolute; inset: 0; z-index: 11; /* below the tabs */
          display: flex; flex-direction: column; overflow: hidden;
          pointer-events: none;
        }
        .sms-screen > * { pointer-events: auto; }
        .sms-header {
          flex: none; position: relative; z-index: 3;
          display: flex; align-items: flex-start; gap: 6px;
          padding: var(--header-top) max(8px, var(--safe-right)) 8px max(8px, var(--safe-left));
          background: linear-gradient(to bottom, rgba(16, 45, 50, 0.72) 60%, rgba(16, 45, 50, 0));
        }
        .sms-scroll {
          flex: 1; min-height: 0; position: relative; z-index: 1;
          overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          padding: 4px 16px calc(var(--bottom-controls-height) + 32px);
          scrollbar-width: none;
        }
        .sms-scroll::-webkit-scrollbar { display: none; }
        .sms-path { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        /* the thread runs from the Star down through every note (Star Gold family) */
        .sms-thread {
          position: absolute; z-index: 0; left: 50%; top: 44px; bottom: 28px; width: 1.2px; margin-left: -0.6px;
          background: var(--paper-80);
        }
        .sms-star { position: relative; z-index: 1; width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; }
        .sms-star-inner { display: block; width: 48px; height: 48px; transform: scale(1.7); }
        .sms-card { position: relative; z-index: 2; width: min(76vw, 300px); margin: 0; color: var(--sisi-ink); }
        .sms-card .ds-memory-sheet { padding: 18px 18px 16px; }
        .sms-card--origin { width: min(60vw, 240px); text-align: center; }
        .sms-bead { position: absolute; top: 3px; left: calc(50% - 3px); width: 6px; height: 6px; border-radius: 50%; background: var(--sisi-gold); }
        .sms-text { margin: 6px 0 0; font-family: var(--font-editorial); font-size: var(--text-body); line-height: var(--leading-body); overflow-wrap: break-word; white-space: pre-wrap; }
        .sms-date { margin: 0; font-family: var(--font-ui); font-size: var(--text-meta); line-height: var(--leading-meta); color: var(--ink-60); }
        .sms-completion { display: flex; flex-direction: column; align-items: center; margin-top: 28px; }
        .sms-say { display: flex; justify-content: flex-end; width: min(86vw, 330px); }
        .sms-sisi { display: block; width: 92px; height: auto; margin: 10px 0 0 min(40vw, 150px); pointer-events: none; user-select: none; }
        .sms-status { margin: 16px 0 0; color: var(--paper-60); }
        .sms-secondary { margin-top: 20px; }
        .sms-controls {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
          height: calc(var(--bottom-controls-height) + 36px);
          padding: 36px max(20px, var(--safe-right)) 0 max(20px, var(--safe-left));
          /* a soft dark fade for readability — never an opaque panel */
          background: linear-gradient(to bottom, rgba(16, 45, 50, 0) 0%, rgba(16, 45, 50, 0.72) 45%, rgba(16, 45, 50, 0.82) 100%);
          pointer-events: none;
        }
        .sms-cta { pointer-events: auto; min-height: var(--cta-height); }
        .sms-stage { position: relative; z-index: 2; width: min(100%, 400px); display: flex; flex-direction: column; }
        /* bubble tail (≈29px in from its right edge) points at Sísí (72px in from the paper's right) */
        .sms-say--card { width: 100%; justify-content: flex-end; padding-right: 43px; margin-bottom: 72px; min-height: 1px; }
        .sms-paper-wrap { position: relative; }
        .sms-paper-wrap.is-quiet { width: min(60%, 220px); margin: 0 auto; }
        .sms-paper-wrap.is-quiet .smc-sisi { right: 50%; transform: scale(0.74) translateX(50%); }
        .sms-paper {
          position: relative; z-index: 1; padding: var(--space-5) var(--space-5) var(--space-5);
          border-radius: var(--paper-radius); box-shadow: 0 8px 22px rgba(16, 45, 50, 0.4);
        }
        .sms-screen .smc-sisi { z-index: 2; } /* paws over the paper edge */
        /* the world's copy of the open Star steps aside (the screen draws it) */
        html.sms-open .sw-star.is-selected { opacity: 0 !important; }

        /* Sísí on the paper's edge (right) */
        .smc-sisi { position: absolute; top: 0; right: 72px; width: 0; height: 0; z-index: 3; transform: scale(0.74); transform-origin: 0 0; pointer-events: none; }
        .smc-content { position: relative; }
        .smc-center { text-align: center; }
        .smc-when { margin: 0 0 4px; color: var(--ink-60); }
        .smc-title { margin: 0 0 10px; }
        .smc-sentence { margin: 0 0 20px; color: var(--ink-80); }
        .smc-journey-link { display: flex; margin: 12px auto 0; }
        .smc-quiet-link { display: flex; margin: 0 auto; }
        .smc-navrow { display: flex; justify-content: space-between; margin: -8px -10px 4px; }
        .smc-chips { margin: 0 0 12px; }
        .smc-entry { margin: 0; }
        .smc-choices { display: flex; flex-direction: column; gap: 10px; margin: 4px 0; }
        .smc-choice {
          display: flex; align-items: center; gap: 14px; width: 100%; min-height: 72px; padding: 12px 16px; text-align: left;
          border-radius: 14px; border: 1px solid var(--ink-14); background: var(--paper-60); cursor: pointer; color: var(--sisi-ink);
          transition: border-color var(--motion-instant) ease;
        }
        .smc-choice:hover { border-color: var(--ink-35); }
        .smc-choice-icon { flex: 0 0 32px; width: 32px; height: 32px; color: var(--sisi-ink); }
        .smc-choice-icon svg { width: 100%; height: 100%; }
        .smc-choice-text { display: flex; flex-direction: column; gap: 3px; }
        .smc-choice-title { font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-card-title); line-height: var(--leading-title); }
        .smc-choice-desc { font-family: var(--font-editorial); font-size: var(--text-body); line-height: 1.3; color: var(--ink-60); }

        /* ── focused choice (practice): Star + words above, a bottom sheet below ── */
        html.sms-focus .ds-nav { opacity: 0 !important; pointer-events: none !important; transition: opacity 320ms var(--ease-sisi) !important; }
        html.sms-focus .ds-nav * { pointer-events: none !important; }
        .sms-screen.is-focus { height: 100dvh; }
        .sms-screen.is-focus .sms-scroll {
          display: flex; flex-direction: column; overflow: hidden; padding: 0;
        }
        .sms-screen.is-focus .sms-path { flex: 1 1 auto; min-height: 0; gap: 0; }
        /* the Star keeps its place in the sky, but never pushes the sheet off screen */
        .sms-screen.is-focus .sms-star { margin-top: min(var(--star-top), 12dvh); flex: none; }
        .sms-screen.is-focus .sms-stage {
          flex: 1 1 auto; min-height: 150px; width: 100%; justify-content: flex-end;
        }
        .sms-screen.is-focus .sms-say--card { padding: 0 43px 0 16px; }
        .sms-screen.is-focus .sms-say--card .sisi-speech {
          max-width: min(68vw, 290px); min-width: 0; padding: 12px 16px;
          font-size: clamp(14px, 3.8vw, 17px);
        }
        .sms-screen.is-focus .sms-paper-wrap { flex: 0 0 auto; }

        .sms-screen.is-focus .sms-paper {
          display: flex; flex-direction: column;
          max-height: calc(100dvh - var(--safe-top) - 170px);
          padding: 0 14px calc(16px + var(--safe-bottom));
          border-radius: 20px 18px 0 0;
          box-shadow: 0 -6px 26px rgba(16, 45, 50, 0.3);
        }
        .sms-screen.is-focus .sms-paper > * { min-height: 0; display: flex; flex-direction: column; }
        .sms-screen.is-focus .smc-content { min-height: 0; flex: 1 1 auto; }
        .sms-screen.is-focus .smc-navrow { flex: none; height: 44px; margin: 0 -8px; align-items: center; }
        .smc-choice-list {
          display: flex; flex-direction: column; gap: 8px; min-height: 0;
          overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
          padding-bottom: 2px;
        }
        .smc-choice-list::-webkit-scrollbar { display: none; }
        /* a quiet paper-coloured edge, only while there is more below */
        .smc-choice-list.has-more {
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 18px), transparent);
          mask-image: linear-gradient(to bottom, #000 calc(100% - 18px), transparent);
        }
        .sms-screen.is-focus .smc-choice {
          min-height: 68px; max-height: 76px; padding: 11px 14px; gap: 12px; border-radius: 14px; flex: none;
          transition: transform var(--motion-instant) var(--ease-sisi), opacity 200ms ease, border-color var(--motion-instant) ease;
        }
        .smc-choice.is-picked { transform: scale(0.98); border-color: var(--sisi-ink); }
        .smc-choice.is-faded { opacity: 0.35; }
        .sms-screen.is-focus .smc-choice-icon { flex: 0 0 32px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; }
        .sms-screen.is-focus .smc-choice-icon svg { width: 22px; height: 22px; }
        .sms-screen.is-focus .smc-choice-text { gap: 3px; min-width: 0; }
        .sms-screen.is-focus .smc-choice-title { font-size: 17.5px; line-height: 1.15; }
        .sms-screen.is-focus .smc-choice-desc {
          font-size: 13px; line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        @media (max-height: 640px) {
          .sms-screen.is-focus .sms-star { margin-top: min(var(--star-top), 6dvh); transform: scale(0.82); }
          .sms-screen.is-focus .sms-stage { min-height: 120px; }
          .sms-screen.is-focus .sms-paper { padding: 0 12px calc(12px + var(--safe-bottom)); }
          .sms-screen.is-focus .smc-choice { min-height: 64px; max-height: 68px; padding: 9px 12px; }
          .sms-screen.is-focus .smc-choice-desc { font-size: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .smc-choice.is-picked { transform: none; }
        }

        /* tabs stepped aside: the controls sit on the safe area instead */
        .sms-screen.no-nav { --nav-total: calc(var(--safe-bottom) + 12px); }
        .sms-screen.is-completion { --cta-height: 100px; }
        .sms-cta-pair { display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: auto; }
        .sms-cta-pair .sms-cta { min-height: 52px; height: 52px; }
        .smc-saved-text { margin: 6px 0 0; white-space: pre-wrap; }
        .smc-saved-also { margin: 12px 0 0; color: var(--ink-60); }

        /* ── full journey header ── */
        .smj-icon { flex: 0 0 44px; width: 44px; height: 44px; }
        .smj-titles { flex: 1; min-width: 0; padding-top: 6px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .smj-title {
          margin: 0; font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-card-title);
          line-height: var(--leading-title); color: var(--sisi-paper); overflow-wrap: anywhere;
        }
        .smj-edit { width: 100%; padding: 10px 12px; border-radius: var(--paper-radius); }
        .smc-edit-input { font-size: var(--text-card-title); }
        .smc-edit-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 8px 0 0; }
        .smc-edit-actions .ds-btn { min-height: 44px; }
      `}</style>
    </MotionConfig>
  );
}

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** The practice choices; scrolls only as a last resort on very short screens. */
function ChoiceList({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <div ref={ref} className={`smc-choice-list${more ? " has-more" : ""}`} role="group" aria-label="Ways to be with your Star">
      {children}
    </div>
  );
}

function NavRow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div className="smc-navrow">
      <IconButton label="Back" onClick={onBack}>
        <IconBack />
      </IconButton>
      <IconButton label="Close" onClick={onClose}>
        <IconClose />
      </IconButton>
    </div>
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

function MoonIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
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
