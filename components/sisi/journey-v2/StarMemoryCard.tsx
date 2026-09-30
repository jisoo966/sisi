"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { addSign, fulfillStar, loadSignsForStar, updateStar, type EntryKind } from "@/lib/myStars";
import { addFulfilledFlower } from "@/lib/pathGifts";
import { emitFx, glintPoint, softGlint } from "@/lib/fx";
import { RitualAudio, VOICE_LINES, appSoundOn, type VoiceId } from "@/lib/ritualAudio";
import { haptic } from "@/lib/haptics";
import { FX_BLOOM_ALL, preload } from "@/lib/fxAssets";
import { awardStarlight, localDate, starlightMessage } from "@/lib/starlight";
import {
  ConfirmationDialog,
  FilterChip,
  IconBack,
  IconButton,
  IconChevronRight,
  IconClose,
  IconSound,
  IconSoundOff,
  IconPencil,
  OverflowMenu,
  PrimaryButton,
  StarGlyph,
  StatusChip,
  TextAction,
} from "@/components/ds";
import { SisiSpeechBubble } from "@/components/sisi/SisiSpeechBubble";
import { SisiChatCharacter, type SisiChatExpression } from "@/components/sisi/journey-v2/SisiChatCharacter";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";
import { PictureItAtmosphere } from "@/components/sisi/journey-v2/PictureItAtmosphere";

/**
 * StarMemoryCard — spending a moment with one Star, on torn ivory paper
 * hanging from it by a thin thread, with Sísí resting on the paper's edge.
 * The black Star World and the tabs stay around it.
 *
 *   invite         Sísí: "Your Star is still here. Shall we spend a quiet
 *                  moment with it?" — Yes, stay with me · View its journey
 *   practice       Sísí: "How would you like to be with your Star today?"
 *                  Picture it · Walk with it · Reflect on today (choose one)
 *   picture-intro  SETTLE — Sísí: "Let’s picture it together. Take one slow
 *                  breath." — I’m ready (sound / vibration optional)
 *   picture        the ritual (~40s, no countdown): BREATHE one cycle (in 4s,
 *                  out 6s) → PICTURE four prompts, one at a time → the wish
 *                  shimmer rises into the Star → "Open your eyes when you’re
 *                  ready."
 *   picture-anchor ANCHOR — "What stayed with you?" (optional; saved as a
 *                  Visualization Moment on this Star)
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
type Mode = "invite" | "practice" | "picture-intro" | "picture" | "picture-anchor" | "note-ask" | "reflect" | "saved" | "done" | "journey" | "celebrate" | "ceremony" | "fulfilled";
type Overlay = null | "confirm-rest" | "confirm-fulfil";

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
  "picture-anchor": { text: "What stayed with you?", face: "listening" },
  "note-ask": { text: "Would you like to leave a small note for this Star?", face: "listening" },
  reflect: { text: "What would you like your Star to remember about today?", face: "listening" },
  saved: { text: "I’ll keep this close to your Star.", face: "comfort" },
  done: { text: <>That was enough for today.<br />Your Star is still here.</>, face: "comfort" },
  celebrate: { text: "Your Star is here.", face: "comfort" },
  fulfilled: { text: <>You carried this wish all the way here.<br />It will keep shining in your sky.</>, face: "comfort" },
};
const FACE: Partial<Record<Mode, SisiChatExpression>> = { picture: "comfort", "picture-intro": "comfort" };

/**
 * Picture it with Sísí — a quiet minute to see a wish more clearly.
 * It helps a wish feel vivid and ordinary; it never promises an outcome.
 *
 * Two ways in (chosen once, on the entry card):
 *   sound   voice-guided, may be done with closed eyes: Sísí's recorded
 *           voice carries every step; ambient music joins at the exhale
 *   silent  no voice, no "close your eyes": written prompts, tap to go on
 * Never advances past the end by itself: "Continue" leads to the Anchor.
 */
type RitualMode = "sound" | "silent";
type Phase = "open" | "in" | "out" | "p0" | "p1" | "p2" | "p3" | "rest" | "wish" | "return";
const SOUND_STEPS: { phase: Phase; at: number; voice?: VoiceId }[] = [
  { phase: "open", at: 0, voice: "close-eyes" },
  { phase: "in", at: 3000, voice: "breathe-in" }, // halo 0.86 → 1.06
  { phase: "out", at: 7000, voice: "breathe-out" }, // halo 1.06 → 0.90 · music begins
  { phase: "p0", at: 13000, voice: "picture" },
  { phase: "p1", at: 18000, voice: "where" },
  { phase: "p2", at: 24000, voice: "doing" },
  { phase: "p3", at: 30000, voice: "feel" },
  { phase: "rest", at: 36000 }, // no voice: music and the Star
  { phase: "wish", at: 44000 }, // the shimmer travels into the Star
  { phase: "return", at: 46300, voice: "open-eyes" },
];
const SOUND_CONTINUE_AT = 49000;
/** silent: the breath is timed; the prompts wait for a tap */
const SILENT_STEPS: { phase: Phase; at: number }[] = [
  { phase: "open", at: 0 },
  { phase: "in", at: 3000 },
  { phase: "out", at: 7000 },
  { phase: "p0", at: 13000 },
];
const PROMPT_ORDER: Phase[] = ["p0", "p1", "p2", "p3"];
const WISH_MS = 2800;
const WISH_TOUCH_MS = 2150; // when the shimmer reaches the Star's centre
function ritualWords(phase: Phase, rm: RitualMode): string {
  switch (phase) {
    case "open":
      return rm === "sound" ? VOICE_LINES["close-eyes"] : "Keep your eyes softly on your Star.";
    case "in":
      return VOICE_LINES["breathe-in"];
    case "out":
      return VOICE_LINES["breathe-out"];
    case "p0":
      return VOICE_LINES.picture;
    case "p1":
      return VOICE_LINES.where;
    case "p2":
      return VOICE_LINES.doing;
    case "p3":
      return VOICE_LINES.feel;
    case "return":
      return rm === "sound" ? VOICE_LINES["open-eyes"] : "";
    default:
      return "";
  }
}
const PIC = {
  halo: "/sisi-assets/picture-it/breathing-star-halo.webp",
  wish: "/sisi-assets/picture-it/wish-shimmer-trail.webp",
  /** the trail's bright head star, as fractions of the (trimmed) image */
  wishHead: { fx: 0.391, fy: 0.208 },
  wishAspect: 0.3171,
  mist: "/sisi-assets/picture-it/dream-mist-overlay.webp",
  footprint: "/sisi-assets/picture-it/footprint.webp",
};
const FINISH_SHOWN_AFTER_MS = 8000;


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
  const save = async (e?: React.MouseEvent<HTMLElement>) => {
    const t = text.trim();
    if (!t || saving) return;
    const glint = glintPoint(e?.currentTarget); // the Save button, read before the paper changes
    setSaving(true); // no duplicate submissions
    try {
      // the same Star-entry record as the check-in: shown on this Star AND in Moments
      const sign = await addSign(star.id, t, "manual", kind);
      setSigns((list) => [sign, ...(list ?? [])]);
      setSaved(sign);
      setText("");
      setMode("saved");
      onEntrySaved?.(sign); // the Star brightens
      softGlint(glint);
      // saved and connected to the Star → Starlight (once per saved Moment)
      awardStarlight({ source: kind === "small_step" ? "small_step_saved" : "something_good_saved", sourceId: sign.id, starId: star.id });
    } catch {
      haptic("error", e?.currentTarget ?? null); // could not be saved
    } finally {
      setSaving(false);
    }
  };
  const saveEdit = async (e?: React.MouseEvent<HTMLElement>) => {
    const glint = glintPoint(e?.currentTarget);
    const wish = draft.trim();
    if (!wish || wish === star.wish) {
      setEditing(false);
      return;
    }
    await updateStar(star.id, { wish });
    onEdited({ ...star, wish });
    setEditing(false);
    softGlint(glint);
  };
  const choosePractice = (id: (typeof PRACTICES)[number]["id"]) => {
    if (id === "picture") setMode("picture-intro");
    else if (id === "reflect") openReflect("practice");
    else onWalkWith?.(star);
  };
  /**
   * "This came true" — not a status toggle, a small ceremony:
   * papers fold down → warm light climbs the thread → the Star brightens
   * (~1.5s) → Fulfilled Bloom → it turns coral-gold → saved as fulfilled (never
   * removed) → "You carried this wish all the way here." A small flower
   * waits on the Journey for the next return.
   */
  const [shine, setShine] = useState<null | "fold" | "climb" | "bright" | "warm">(null);
  const letItShine = async () => {
    void preload(FX_BLOOM_ALL); // decoded while the papers fold
    setOverlay(null);
    setMode("ceremony");
    setShine("fold");
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await wait(650);
    setShine("climb");
    await wait(900);
    setShine("bright");
    emitFx({ kind: "bloom" }); // Fulfilled Bloom on the selected Star — the most important moment
    haptic("fulfilled"); // medium · pause · light
    const fulfilledAt = new Date().toISOString();
    await fulfillStar(star.id); // persisted; the Star stays in the sky and in Moments
    addFulfilledFlower(star.id);
    await wait(1500);
    setShine("warm");
    onEdited({ ...star, fulfilledAt });
    await wait(700);
    setMode("fulfilled");
  };

  // ── Picture it ──
  const [ritual, setRitual] = useState<RitualMode>("sound");
  const [picStart, setPicStart] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("open");
  const [soundOn, setSoundOn] = useState(true); // the visible sound control (ambient bed)
  useEffect(() => setSoundOn(appSoundOn()), []);
  const audio = useRef<RitualAudio | null>(null);
  const [wishTouch, setWishTouch] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [picLight, setPicLight] = useState<string | null>(null);
  const [picBright, setPicBright] = useState(false);
  const [picNote, setPicNote] = useState("");
  const [picSaving, setPicSaving] = useState(false);
  const [newFootprint, setNewFootprint] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const stopAudio = () => {
    audio.current?.stop();
    audio.current = null;
  };
  useEffect(
    () => () => {
      clearTimers();
      stopAudio();
    },
    [],
  );

  /** the entry card's choice — inside this tap, so sound may play later */
  const beginPicture = (rm: RitualMode, e?: React.MouseEvent<HTMLElement>) => {
    softGlint(glintPoint(e?.currentTarget));
    stopAudio();
    const a = new RitualAudio({ voice: rm === "sound", music: soundOn });
    a.prepare();
    audio.current = a;
    setRitual(rm);
    setPicStart(Date.now());
    setPhase("open");
    setWishTouch(false);
    setCanContinue(false);
    setPicLight(null);
    setPicNote("");
    setMode("picture");
  };
  const leaveRitual = () => {
    clearTimers();
    stopAudio();
    setPicStart(null); // nothing is saved, no Starlight
    setMode("journey");
  };
  /** the whole ritual was lived through → Starlight (once per Star per day) */
  const completeRitual = async () => {
    if (placeholder) return;
    const res = await awardStarlight({ source: "picture_it_completed", sourceId: `${star.id}:${localDate()}`, starId: star.id, silent: true });
    setPicLight(starlightMessage(res));
  };
  const enter = (ph: Phase) => {
    setPhase(ph);
    if (ph === "out") {
      haptic("breath"); // inhale → exhale, very light
      void audio.current?.startMusic(); // the ambient bed begins, quietly
    }
  };
  /** the shimmer travels into the Star; one restrained haptic when it arrives */
  const playWish = (then: () => void) => {
    enter("wish");
    later(WISH_TOUCH_MS, () => {
      setWishTouch(true);
      haptic("wish");
    });
    later(WISH_TOUCH_MS + 900, () => setWishTouch(false));
    later(WISH_MS, then);
  };
  useEffect(() => {
    if (mode !== "picture" || !picStart) return;
    clearTimers();
    if (ritual === "sound") {
      for (const step of SOUND_STEPS) {
        later(step.at, () => {
          if (step.phase === "wish") playWish(() => undefined);
          else enter(step.phase);
          if (step.voice) void audio.current?.say(step.voice);
          if (step.phase === "return") void completeRitual();
        });
      }
      later(SOUND_CONTINUE_AT, () => setCanContinue(true));
    } else {
      for (const step of SILENT_STEPS) later(step.at, () => enter(step.phase));
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, picStart, ritual]);
  /** silent mode: the person moves on when they're ready */
  const nextPrompt = () => {
    const i = PROMPT_ORDER.indexOf(phase);
    if (i < 0) return;
    if (i < PROMPT_ORDER.length - 1) return enter(PROMPT_ORDER[i + 1]);
    playWish(() => {
      enter("return");
      void completeRitual();
      later(900, () => setCanContinue(true));
    });
  };
  const toAnchor = () => {
    clearTimers();
    stopAudio();
    setMode("picture-anchor");
  };
  /** ANCHOR: keep what stayed, as a Visualization Moment on this Star */
  const keepFeeling = async (e?: React.MouseEvent<HTMLElement>) => {
    const t = picNote.trim();
    if (!t || picSaving) return;
    const btn = e?.currentTarget ?? null;
    const glint = glintPoint(btn);
    setPicSaving(true);
    try {
      const sign = await addSign(star.id, t, "manual", "visualization");
      setSigns((list) => [sign, ...(list ?? [])]);
      onEntrySaved?.(sign);
      softGlint(glint);
      setPicNote("");
      setNewFootprint(sign.id); // one footprint on the Star's path
      setTimeout(() => haptic("footprint"), 700); // as the footprint appears
      setMode("journey");
      // the Star illuminates briefly
      setPicBright(true);
      setTimeout(() => setPicBright(false), 1600);
    } catch {
      haptic("error", btn);
    } finally {
      setPicSaving(false);
    }
  };
  const words = ritualWords(phase, ritual);
  const pictureWords = (
    <AnimatePresence mode="wait">
      {words && (
        <motion.p
          key={`${ritual}-${phase}`}
          className={`smp-prompt-text${phase === "in" || phase === "out" ? " is-breath" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.4, ease: "easeInOut" } }}
          exit={{ opacity: 0, transition: { duration: 1, ease: "easeInOut" } }}
        >
          {words}
        </motion.p>
      )}
    </AnimatePresence>
  );

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
  const hasHeader = mode === "journey" || mode === "ceremony";
  /** completion moments: one clear way on, then back to this Star */
  const completion = mode === "saved" || mode === "done" || mode === "celebrate" || mode === "fulfilled";
  // A focused choice: the paper is a bottom sheet, the Star and Sísí's words
  // share the rest of the screen, and the global tabs step aside.
  const focus = mode === "practice";
  /** the global tabs step aside during the choice and the completion moments */
  /** the ritual (settle → breathe → picture → anchor): the tabs are disabled throughout */
  const picturing = mode === "picture-intro" || mode === "picture" || mode === "picture-anchor";
  const hideNav = focus || completion || mode === "ceremony" || picturing;
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
    mode === "journey" ||
    completion ||
    (mode === "invite" && !placeholder) ||
    mode === "picture-intro" ||
    mode === "picture-anchor" ||
    (mode === "picture" && canContinue) ||
    mode === "reflect";
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
        onClick={() => !picturing && onClose()}
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
            className={`sms-screen${focus ? " is-focus" : ""}${hideNav ? " no-nav" : ""}${completion || mode === "picture-anchor" || mode === "picture-intro" ? " is-completion" : ""}${mode === "picture" ? " is-picturing" : ""}${picturing ? " is-ritual" : ""}`}
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
                    ...(star.fulfilledAt
                      ? []
                      : [{ label: "This came true", icon: <StarGlyph size={16} />, destructive: false, onSelect: () => setOverlay("confirm-fulfil") }]),
                    { label: "Let this Star rest", icon: <MoonIcon />, destructive: true, onSelect: () => setOverlay("confirm-rest") },
                  ]}
                />
              ) : (
                <span className="smj-icon" aria-hidden />
              )}
            </header>
            )}

            {/* 2–3 · the full-screen breathing atmosphere, mist and particles —
                a fixed layer of its own, never inside the Star */}
            {mode === "picture" && <PictureItAtmosphere phase={phase === "open" || phase === "in" || phase === "out" ? phase : "after"} />}
            <div
              className="sms-scroll"
              ref={listRef}
              // without a header, the Star sits where it was in the sky
              style={hasHeader || focus || picturing ? undefined : { paddingTop: Math.max(8, anchor.y - 44) }}
              onClick={(e) => {
                // a tap on the open sky puts the paper away (not mid-visualization)
                const t = e.target as HTMLElement;
                if (!picturing && (t === e.currentTarget || t.classList.contains("sms-path"))) onClose();
              }}
            >
              <div className={`sms-path${shine ? ` is-${shine}` : ""}`}>
                {mode !== "picture" && <span className="sms-thread" aria-hidden />}
                <div ref={(el) => fxAnchorRef("selectedStar", el)} className={`sms-star${star.fulfilledAt || shine === "warm" ? " is-fulfilled" : ""}${shine === "bright" || shine === "warm" || picBright ? " is-shining" : ""}${mode === "picture" ? ` is-breathing ph-${phase}` : ""}${wishTouch ? " is-wished" : ""}`} aria-hidden>
                  <span className="sms-star-inner">
                    <StarLayers staged revealed focused />
                  </span>
                  {/* 4 · the Star's own small glow (~1.9× the Star) — a separate element
                      from the full-screen atmosphere */}
                  {mode === "picture" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={`smp-glow is-${phase}`} src={PIC.halo} alt="" draggable={false} />
                  )}
                </div>
                {/* 5 · the wish shimmer: rises from below into the Star's centre, then dissolves */}
                {mode === "picture" && phase === "wish" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="smp-wish" src={PIC.wish} alt="" draggable={false} />
                )}

                {!hasHeader && (
                  <div className="sms-stage">
                    {/* Sísí's words above her; she rests on the paper's edge */}
                    {!placeholder && mode !== "picture" && (
                      <div className="sms-say sms-say--card" aria-live="polite">
                        <AnimatePresence mode="wait">
                          {say && (
                            <SisiSpeechBubble key={mode} tailPosition="bottom-right" align="center" delay={0.2} message={say.text} />
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {mode === "picture" && (
                      // 6 · one prompt at a time, centred below the Star
                      <div className="smp-prompt" aria-live="polite">
                        {pictureWords}
                        {ritual === "silent" && (
                          // the slot is always there, so the words never jump when Next appears
                          <div className="smp-next-slot">
                            {PROMPT_ORDER.includes(phase) && (
                              <motion.div key={`next-${phase}`} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.6, duration: 1 } }}>
                                <TextAction surface="dark" className="smp-next" onClick={nextPrompt}>
                                  Next
                                </TextAction>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Sísí and her paper step away during the ritual and come back up for the Anchor */}
                    {mode !== "picture" && (
                    <motion.div
                      className="sms-paper-wrap"
                      layout
                      initial={{ y: mode === "picture-anchor" ? 220 : 40, opacity: 0 }}
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
                    <div className="smp-entry-head">
                      <h2 className="t-card-title smp-entry-title">Picture it with Sísí</h2>
                      {/* visible sound control, before the ritual begins */}
                      <button
                        type="button"
                        className={`smp-sound${soundOn ? " is-on" : ""}`}
                        aria-pressed={soundOn}
                        aria-label={soundOn ? "Sound on" : "Sound off"}
                        onClick={() => setSoundOn((v) => !v)}
                      >
                        {soundOn ? <IconSound /> : <IconSoundOff />}
                        <span className="smp-sound-label">{soundOn ? "Sound on" : "Sound off"}</span>
                      </button>
                    </div>
                    <p className="t-body smp-entry-desc">A quiet minute to see your wish more clearly.</p>
                    <p className="t-meta smp-star-label">Your Star</p>
                    <p className="t-dialogue smp-entry-wish">{star.wish}</p>
                  </motion.div>
                )}

                {mode === "picture-anchor" && (
                  <motion.div key="picture-anchor" className="smc-content" {...fade}>
                    <textarea
                      className="ds-field smc-entry"
                      rows={3}
                      maxLength={240}
                      value={picNote}
                      placeholder="I saw myself…"
                      aria-label="What stayed with you?"
                      onChange={(e) => setPicNote(e.target.value)}
                    />
                    {picLight && <p className="t-meta smp-light">{picLight}</p>}
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

                {(mode === "done" || mode === "celebrate" || mode === "fulfilled") && (
                  <motion.div key={mode} className="smc-content" {...fade}>
                    <p className="t-meta smc-when">{mode === "celebrate" ? "Created today" : mode === "fulfilled" ? "Came true today" : formatDate(star.createdAt)}</p>
                    <h2 className="t-card-title smc-title">{star.wish || "Your Star"}</h2>
                    <StatusChip tone="star">{star.fulfilledAt || mode === "fulfilled" ? "Fulfilled" : "Still walking"}</StatusChip>
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
                    )}
                  </div>
                )}

                {(mode === "journey" || mode === "ceremony") && (
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
                            {s.kind ? ` · ${KIND[s.kind].label}` : s.momentType === "companion_note" ? " · A note from Sísí" : s.momentType === "visualization" ? " · Visualization" : ""}
                          </p>
                          {s.momentType === "visualization" && (
                            // one footprint on the Star's path, stamped on the paper
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={`sms-footprint${newFootprint === s.id ? " is-new" : ""}`} src={PIC.footprint} alt="" aria-hidden draggable={false} />
                          )}
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

            {picturing && (
              <div className="smp-close">
                <IconButton surface="dark" label="Leave and return to my Star" onClick={leaveRitual}>
                  <IconClose />
                </IconButton>
              </div>
            )}
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
                <div className="sms-cta-pair">
                  {/* voice-guided: may be done with closed eyes */}
                  <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" onClick={(e) => beginPicture("sound", e)}>
                    Begin with sound
                  </button>
                  <TextAction surface="dark" className="sms-cta-secondary" onClick={(e) => beginPicture("silent", e)}>
                    Continue silently
                  </TextAction>
                </div>
              ) : mode === "picture" && canContinue ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.4 } }}>
                  <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" onClick={toAnchor}>
                    Continue
                  </button>
                </motion.div>
              ) : mode === "picture-anchor" ? (
                <div className="sms-cta-pair">
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta"
                    disabled={!picNote.trim() || picSaving}
                    onClick={keepFeeling}
                  >
                    Keep this feeling
                  </button>
                  <TextAction surface="dark" className="sms-cta-secondary" onClick={() => setMode("journey")}>
                    Done without writing
                  </TextAction>
                </div>
              ) : mode === "reflect" ? (
                <button type="button" className="ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta" disabled={!text.trim() || saving} onClick={save}>
                  Save to my Star
                </button>
              ) : null}
            </div>}

            <ConfirmationDialog
              open={overlay === "confirm-fulfil"}
              title="Shall we let this Star shine in a new way?"
              message="It will remain safely in your sky and Moments."
              confirmLabel="Let it shine"
              cancelLabel="Not yet"
              onConfirm={letItShine}
              onCancel={() => setOverlay(null)}
            />
            <ConfirmationDialog
              open={overlay === "confirm-rest"}
              title="Let this Star rest?"
              message="It will leave your Star path, but stay safely in your Moments."
              confirmLabel="Let it rest"
              cancelLabel="Keep walking"
              onConfirm={(e) => {
                softGlint(glintPoint(e?.currentTarget));
                onRest(star);
              }}
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
        .sms-date { margin: 0; font-family: var(--font-ui); font-size: var(--text-meta); line-height: var(--leading-meta); color: var(--ink-60); letter-spacing: 0.005em; }
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

        /* ── the fulfilled ceremony ── */
        /* (the card itself carries framer's rotation, so the fold lives on its sheet) */
        .sms-path .sms-card > .ds-memory-sheet { transition: transform 600ms var(--ease-sisi), opacity 500ms ease; transform-origin: 50% 0; }
        .sms-path .sms-card { transition: opacity 500ms ease 100ms; }
        .sms-path:is(.is-fold, .is-climb, .is-bright, .is-warm) .sms-card > .ds-memory-sheet { transform: translateY(18px) scaleY(0.4); opacity: 0; }
        .sms-path:is(.is-fold, .is-climb, .is-bright, .is-warm) .sms-card { opacity: 0 !important; }
        .sms-thread::after {
          content: ""; position: absolute; left: -1px; right: -1px; bottom: 0; height: 0; opacity: 0;
          background: linear-gradient(to top, rgba(241, 196, 94, 0), rgba(241, 196, 94, 0.9) 70%, rgba(245, 239, 221, 0.95));
          border-radius: 2px;
        }
        .sms-path.is-climb .sms-thread::after { animation: sms-climb 900ms cubic-bezier(0.45, 0, 0.25, 1) both; }
        @keyframes sms-climb { 0% { height: 0; opacity: 0; } 20% { opacity: 1; } 100% { height: 100%; opacity: 0.2; } }
        .sms-star.is-shining .sms-star-inner { animation: sms-shine 1.5s ease-in-out both; }
        @keyframes sms-shine {
          0% { filter: brightness(1); }
          45% { filter: brightness(1.55) drop-shadow(0 0 14px rgba(241, 196, 94, 0.65)); }
          100% { filter: brightness(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sms-path .sms-card > .ds-memory-sheet { transition: opacity 300ms linear; transform: none !important; }
          .sms-path.is-climb .sms-thread::after { animation: none; }
          .sms-star.is-shining .sms-star-inner { animation: none; filter: brightness(1.2); }
        }

        /* ── Picture it ── */
        .smp-kicker { margin: 0 0 6px; color: var(--ink-60); }
        .smp-lead { margin: 0 0 10px; }
        .smp-questions { margin: 0 0 16px; color: var(--ink-80); font-size: var(--text-body); line-height: 1.5; }
        .smp-star-label { margin: 0 0 2px; color: var(--ink-60); }
        .smp-light { margin: 10px 0 0; color: var(--ink-80); }
        /* the Star stays in one place for the whole ritual: centred, ~21dvh down
           (never closer than 32px to the top safe area) */
        .sms-screen.is-ritual .sms-scroll { padding-top: max(calc(var(--safe-top) + 32px), calc(21dvh - 44px)); }
        /* entry card */
        .smp-entry-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin: 0 0 6px; }
        .smp-entry-title { margin: 0; }
        .smp-entry-desc { margin: 0 0 14px; color: var(--ink-80); }
        .smp-entry-wish { margin: 2px 0 0; }
        .smp-sound {
          flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px 0 10px;
          border: 1px solid var(--ink-14); border-radius: 999px; background: transparent; color: var(--ink-60);
          font-family: var(--font-ui); font-size: var(--text-meta); cursor: pointer;
        }
        .smp-sound.is-on { color: var(--sisi-ink); border-color: var(--ink-30, rgba(16, 45, 50, 0.3)); }
        .smp-sound svg { width: 18px; height: 18px; }
        .smp-star-label { margin: 0; color: var(--ink-60); }
        .smp-light { margin: 10px 0 0; color: var(--ink-80); }

        /* during the ritual: only the night sky, the Star, its halo and one prompt —
           the prompt vertically centred in the space below the Star */
        .smp-prompt {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
          height: 40dvh; padding: 0 28px; margin: 0; box-sizing: border-box;
        }
        .smp-prompt-text {
          margin: 0; padding: 18px 26px; max-width: 320px; text-align: center;
          color: var(--sisi-paper); /* strong ivory on navy */
          background: radial-gradient(closest-side, rgba(16, 45, 50, 0.95) 60%, rgba(16, 45, 50, 0));
          font-family: var(--font-editorial); font-size: var(--text-dialogue); line-height: var(--leading-dialogue);
        }
        .smp-prompt-text.is-breath { font-style: italic; }
        .smp-next { min-height: 44px; }
        .smp-next-slot { min-height: 44px; }
        .smp-close { position: absolute; z-index: 4; top: calc(var(--safe-top) + 8px); right: max(8px, var(--safe-right)); pointer-events: auto; }

        /* layers: atmosphere (fixed root, z 0) · Star (z 3) · words and controls (z 4) */
        .sms-screen.is-picturing { isolation: isolate; }
        .sms-screen.is-picturing .sms-scroll { z-index: 3; overflow: visible; }
        .sms-screen.is-picturing .smp-prompt { position: relative; z-index: 4; }
        .sms-screen.is-picturing .sms-controls { z-index: 4; }
        /* the Star itself grows only 1 → 1.06 on the inhale, and back on the exhale */
        .sms-star.is-breathing .sms-star-inner { transition: transform 1.2s cubic-bezier(0.37, 0, 0.63, 1); }
        .sms-star.ph-in .sms-star-inner { transform: scale(${(1.7 * 1.06).toFixed(3)}); transition-duration: 4s; }
        .sms-star.ph-out .sms-star-inner { transform: scale(1.7); transition-duration: 6s; }
        /* the Star's local glow: ~1.9 × the Star (88px), soft, following the breath */
        .smp-glow {
          position: absolute; z-index: 0; pointer-events: none;
          width: 168px; height: 168px; max-width: none; left: calc(50% - 84px); top: calc(50% - 84px);
          -webkit-mask-image: radial-gradient(circle, #000 40%, transparent 70%);
          mask-image: radial-gradient(circle, #000 40%, transparent 70%);
          transform: scale(0.94); opacity: 0;
          transition: transform 1.2s cubic-bezier(0.37, 0, 0.63, 1), opacity 1.2s cubic-bezier(0.37, 0, 0.63, 1);
        }
        .smp-glow.is-open { opacity: 0.35; }
        .smp-glow.is-in { transform: scale(1.06); opacity: 0.6; transition-duration: 4s; }
        .smp-glow.is-out { transform: scale(0.97); opacity: 0.35; transition-duration: 6s; }
        .smp-glow.is-p0, .smp-glow.is-p1, .smp-glow.is-p2, .smp-glow.is-p3, .smp-glow.is-rest, .smp-glow.is-wish, .smp-glow.is-return {
          transform: scale(0.97); opacity: 0.28; transition-duration: 3s;
        }
        /* the wish reaches the Star: 1.12 for a moment, a restrained warm glow */
        .sms-screen.is-picturing .sms-star { transition: transform 900ms ease-in-out, filter 900ms ease-in-out; }
        .sms-screen.is-picturing .sms-star.is-wished {
          transform: scale(1.12); filter: drop-shadow(0 0 14px rgba(241, 196, 94, 0.5));
          transition: transform 450ms ease-out, filter 450ms ease-out;
        }
        /* the wish shimmer: revealed bottom → top, its head arriving on the Star's centre */
        .smp-wish {
          position: absolute; z-index: 2; pointer-events: none;
          width: 76px; height: ${(76 / 0.3171).toFixed(1)}px; max-width: none;
          left: calc(50% - ${(76 * 0.391).toFixed(1)}px); top: ${(44 - (76 / 0.3171) * 0.208).toFixed(1)}px;
          transform-origin: 39.1% 20.8%;
          opacity: 0; animation: smp-wish ${WISH_MS}ms ease-in-out both;
        }
        @keyframes smp-wish {
          0% { opacity: 0; transform: translateY(170px); clip-path: inset(100% 0 0 0); }
          12% { opacity: 0.9; }
          55% { transform: translateY(50px); clip-path: inset(0 0 0 0); }
          77% { opacity: 0.95; transform: translateY(0) scale(1); clip-path: inset(0 0 0 0); }
          100% { opacity: 0; transform: translateY(0) scale(0.35); clip-path: inset(0 0 0 0); }
        }
        html.app-hidden .sms-screen.is-picturing * { animation-play-state: paused !important; }

        /* one footprint on the Star's path, stamped on a Visualization note */
        .sms-footprint { position: absolute; top: 12px; right: 12px; width: 16px; height: auto; opacity: 0.8; transform: rotate(-14deg); pointer-events: none; }
        .sms-footprint.is-new { animation: smp-foot 1.4s ease-out 0.5s both; }
        @keyframes smp-foot { from { opacity: 0; } to { opacity: 0.8; } }

        @media (prefers-reduced-motion: reduce) {
          /* the same timing and words; no scaling or movement — opacity only */
          .sms-star.is-breathing .sms-star-inner, .sms-star[class] .sms-star-inner { transform: scale(1.7) !important; }
          .smp-glow, .smp-glow[class] { transform: none !important; }
          .sms-screen.is-picturing .sms-star.is-wished { transform: none; }
          .smp-wish { animation: smp-wish-soft ${WISH_MS}ms ease-in-out both; }
          @keyframes smp-wish-soft { 0% { opacity: 0; } 45% { opacity: 0.85; } 100% { opacity: 0; } }
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
