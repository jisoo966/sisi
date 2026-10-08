"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Sign, Star } from "@/lib/myStars";
import { addSign, fulfillStar, loadSignsForStar, updateStar, type EntryKind } from "@/lib/myStars";
import { addFulfilledFlower } from "@/lib/pathGifts";
import { emitFx, glintPoint, softGlint } from "@/lib/fx";
import { RitualAudio, VOICE_LINES, appSoundOn, type VoiceId } from "@/lib/ritualAudio";
import { haptic } from "@/lib/haptics";
import { FX_BLOOM_ALL, preload } from "@/lib/fxAssets";
import { awardStarlight, FIRST_STARLIGHT_LINE, localDate, onStarlight } from "@/lib/starlight";
import { hintDone, markHint } from "@/lib/hints";
import { careFor, careGlow, daysTogether, marksFor } from "@/lib/starCare";
import { activities, logActivity } from "@/lib/starActivity";
import { primeKeyboard, takeKeyboard } from "@/lib/keyboard";
import {
  ConfirmationDialog,
  FilterChip,
  IconBack,
  IconButton,
  IconChevronRight,
  IconClose,
  IconEye,
  IconMoon,
  IconPaws,
  IconSound,
  IconSoundOff,
  IconPencil,
  OverflowMenu,
  PrimaryButton,
  useKeyboardInset,
  SecondaryButton,
  StarGlyph,
  StatusChip,
  TextAction,
} from "@/components/ds";
import { SisiChatCharacter, type SisiChatExpression } from "@/components/sisi/journey-v2/SisiChatCharacter";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";
import { PictureItAtmosphere } from "@/components/sisi/journey-v2/PictureItAtmosphere";
import { WritingPage } from "@/components/sisi/WritingPage";
import { StarJournal, type JournalKind } from "@/components/sisi/stars/StarJournal";

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
  something_good: { chip: "A sign", label: "A sign", ph: "What showed up for this wish today?" },
  small_step: { chip: "A small step", label: "A step I took", ph: "What small step did you take?" },
};
const PRACTICES = [
  // what each is, and why it helps: seeing it as yours · keeping it close · noticing it arrive
  { id: "picture", title: "Picture it", desc: "Close your eyes and see it as already yours." },
  { id: "walk", title: "Walk with it", desc: "Carry it into your Journey, and keep it close today." },
  { id: "reflect", title: "Reflect on today", desc: "Notice a sign or a small step. Proof it’s on its way." },
] as const;

/** What Sísí says (and how she looks) in each moment. */
const SAY: Partial<Record<Mode, { text: React.ReactNode; face: SisiChatExpression }>> = {
  invite: { text: <>Your Star is still here.<br />Shall we spend a quiet moment with it?</>, face: "listening" },
  practice: { text: "How would you like to be with your Star today?", face: "listening" },
  "picture-anchor": { text: "Write it as if it’s already yours.", face: "listening" },
  "note-ask": { text: "Would you like to leave a small note for this Star?", face: "listening" },
  reflect: { text: "What would you like your Star to remember about today?", face: "listening" },
  saved: { text: <>Kept.<br />Your Star is a little brighter.</>, face: "comfort" },
  done: { text: <>That was enough for today.<br />Your Star is a little brighter.</>, face: "comfort" },
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
/**
 * sound: Sísí's recorded lines lead; each step lasts as long as her words
 * (plus a quiet tail), except the breath, which is held at exactly 4s / 6s.
 * About a minute in all.
 */
type SoundStep = { phase: Phase; clips: VoiceId[]; hold: number; tail: number };
const SOUND_SEQUENCE: SoundStep[] = [
  { phase: "open", clips: ["together", "close-eyes"], hold: 3000, tail: 900 },
  { phase: "in", clips: ["breathe-in"], hold: 4000, tail: 0 }, // halo 0.86 → 1.06
  { phase: "out", clips: ["breathe-out"], hold: 6000, tail: 0 }, // → 0.90 · music begins
  { phase: "p0", clips: ["picture", "ordinary"], hold: 5000, tail: 2500 },
  { phase: "p1", clips: ["where", "see"], hold: 5000, tail: 3000 },
  { phase: "p2", clips: ["doing", "notice"], hold: 5000, tail: 3000 },
  { phase: "p3", clips: ["feel"], hold: 5000, tail: 3500 },
  { phase: "rest", clips: ["stay", "no-need"], hold: 8000, tail: 5000 }, // then only music and the Star
];
/** after the wish shimmer reaches the Star */
const SOUND_RETURN: VoiceId[] = ["open-eyes", "keep-feeling"];
const BETWEEN_LINES_MS = 600;
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
    placeholder ? "invite" : initialMode === "reflect" ? "reflect" : initialMode === "celebrate" ? "journey" : initialMode === "quick" ? "invite" : "journey",
  );
  /** just born: its Star screen opens with "Your journey begins here." */
  const [fresh] = useState(initialMode === "celebrate");
  const [reflectBack, setReflectBack] = useState<Mode>(initialMode === "reflect" ? "journey" : "practice");
  /** where "back" from the activity choice returns (the timeline, or the invitation) */
  const [practiceBack, setPracticeBack] = useState<Mode>("journey");
  const startPractice = (from: Mode) => {
    setPracticeBack(from);
    setMode("practice");
  };
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [kind, setKind] = useState<EntryKind | null>(null); // optional: a moment is enough
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Sign | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(star.wish);
  const [signs, setSigns] = useState<Sign[] | null>(null);
  /** every time spent with this wish: its Moments, and the days walked with it.
   *  Only ever grows (no streaks): resting never dims a Star. */
  const care = useMemo(
    () => (placeholder || !signs ? 0 : careFor(star.id, signs)),
    // re-read after each completed step (mode changes back to the Star)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [star.id, placeholder, signs, mode],
  );
  /** what has been done for this wish, by kind (its three marks), and the days together */
  const days = useMemo(
    () => (placeholder ? [] : daysTogether(star.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [star.id, placeholder, signs, mode],
  );
  const marks = useMemo(() => marksFor(star.id, signs ?? []), [star.id, signs, days]); // eslint-disable-line react-hooks/exhaustive-deps
  /** the latest words left on this wish (a moment, a sign, a step, or what was pictured) */
  const latestWords = signs?.find((x) => !!x.text?.trim()) ?? null;
  /** the journal of this wish (null: closed), opened on one kind */
  const [journal, setJournal] = useState<JournalKind | null>(null);
  /** 0 → 1: how much brighter the Star has grown (the same as in the sky) */
  const glow = careGlow(care);
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
      const sign = await addSign(star.id, t, "manual", kind ?? undefined);
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
  const [picBright, setPicBright] = useState(false);
  const [picNote, setPicNote] = useState("");
  const [picSaving, setPicSaving] = useState(false);
  const [, setNewFootprint] = useState<string | null>(null); // the footprint stamp (its card now lives in Moments)
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
    setCaption("");
    setPicNote("");
    setMode("picture");
  };
  const leaveRitual = () => {
    soundRun.current++;
    clearTimers();
    stopAudio();
    setPicStart(null); // nothing is saved, no Starlight
    setMode("journey");
  };
  /** the whole ritual was lived through → Starlight (once per Star per day) */
  const completeRitual = async () => {
    if (placeholder) return;
    logActivity(star.id, "picture"); // it counts now — words after are a gift, not the proof
    // the shared "✦ +1" shows it (no words added to the paper)
    await awardStarlight({ source: "picture_it_completed", sourceId: `${star.id}:${localDate()}`, starId: star.id });
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
      const id = ++soundRun.current;
      void runSound(id);
      return () => {
        soundRun.current++; // cancel
        clearTimers();
      };
    } else {
      for (const step of SILENT_STEPS) later(step.at, () => enter(step.phase));
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, picStart, ritual]);
  /** sound mode: Sísí's lines in order; cancelled by leaving (soundRun changes) */
  const soundRun = useRef(0);
  const [caption, setCaption] = useState("");
  const runSound = async (id: number) => {
    const alive = () => soundRun.current === id;
    const wait = (ms: number) => new Promise<void>((r) => later(Math.max(0, ms), r));
    const speak = async (clips: VoiceId[]) => {
      for (let k = 0; k < clips.length; k++) {
        if (!alive()) return;
        setCaption(VOICE_LINES[clips[k]]);
        await audio.current?.say(clips[k]);
        if (k < clips.length - 1) await wait(BETWEEN_LINES_MS);
      }
    };
    for (const step of SOUND_SEQUENCE) {
      if (!alive()) return;
      enter(step.phase);
      const t0 = performance.now();
      if (step.phase === "in" || step.phase === "out") {
        // the breath keeps its exact length; the words ride on top of it
        void speak(step.clips);
        await wait(step.hold);
        continue;
      }
      await speak(step.clips);
      if (step.phase === "rest") setCaption(""); // only the music and the Star
      await wait(Math.max(step.hold - (performance.now() - t0), step.tail));
    }
    if (!alive()) return;
    setCaption("");
    await new Promise<void>((r) => playWish(r));
    if (!alive()) return;
    enter("return");
    void completeRitual();
    await speak(SOUND_RETURN);
    if (!alive()) return;
    await wait(1000);
    if (alive()) setCanContinue(true); // never advances by itself
  };
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
    primeKeyboard(); // "What stayed with you?" — the keyboard rises with the card
    soundRun.current++;
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
  const words = ritual === "sound" ? caption : ritualWords(phase, ritual);
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
    if (id === "reflect") primeKeyboard(); // writing: the keyboard rises with the card
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
  // One rule for the paper: whatever you do here (choose, write, keep, begin)
  // rises from the bottom as a sheet — the Star and Sísí's words stay above.
  // Only the Star screen itself (journey) and the ritual's open night have no paper.
  const focus = !hasHeader && mode !== "picture";
  /** a writing card's field takes the keyboard over once, when it appears */
  const takeKeyboardOnMount = useCallback((el: HTMLTextAreaElement | null) => takeKeyboard(el), []);
  /** a card you type in: it rides on top of the keyboard */
  const writingCard = mode === "picture-anchor"; // reflect writes on the writing page
  useKeyboardInset(writingCard);
  /** the global tabs step aside during the choice and the completion moments */
  /** the ritual (settle → breathe → picture → anchor): the tabs are disabled throughout */
  const picturing = mode === "picture-intro" || mode === "picture" || mode === "picture-anchor";
  // the journey too: a back arrow leads out, so the record and its one action get the screen
  const hideNav = focus || completion || mode === "ceremony" || picturing || mode === "journey";
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
    mode === "picture-intro" ||
    mode === "picture-anchor" ||
    (mode === "picture" && canContinue);
  /** the step's actions sit inside the card whenever the card is showing
   *  (one ✕ in the corner; nothing floats over the card's edge) */
  const paperControls = hasControls && !hasHeader && mode !== "picture";
  const controls = (onPaper: boolean) => {
    const primary = onPaper ? "ds-btn ds-btn--primary ds-btn--block" : "ds-btn ds-btn--primary ds-on-dark ds-btn--block sms-cta";
    const secondary = onPaper ? "ds-btn ds-btn--secondary ds-btn--block" : "ds-btn ds-btn--secondary ds-on-dark ds-btn--block sms-cta";
    const textSurface = onPaper ? "paper" : "dark";
    return mode === "journey" ? (
      // the wish's own story first: keep a moment on it; the quiet practices under it
      <div className="sms-cta-pair">
        <button
          type="button"
          className={primary}
          onClick={() => {
            primeKeyboard(); // the writing page opens with the keyboard (iOS: inside the tap)
            openReflect("journey");
          }}
        >
          Leave a moment
        </button>
        <TextAction surface={textSurface} className="sms-cta-secondary" onClick={() => startPractice("journey")}>
          Picture it, or walk with it
        </TextAction>
      </div>
    ) : completion ? (
      <div className="sms-cta-pair">
        <button
          type="button"
          className={primary}
          onClick={() => {
            setSaved(null);
            setMode("journey");
          }}
        >
          {mode === "celebrate" ? "View my Star" : "Back to my Star"}
        </button>
        <button type="button" className={secondary} onClick={() => onReturnToJourney?.()}>
          Return to Journey
        </button>
      </div>
    ) : mode === "picture-intro" ? (
      <div className="sms-cta-pair">
        {/* voice-guided: may be done with closed eyes */}
        <button type="button" className={primary} onClick={(e) => beginPicture("sound", e)}>
          Begin with sound
        </button>
        <button type="button" className={secondary} onClick={(e) => beginPicture("silent", e)}>
          Continue silently
        </button>
      </div>
    ) : mode === "picture" && canContinue ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.4 } }}>
        <button type="button" className={primary} onClick={toAnchor}>
          Continue
        </button>
      </motion.div>
    ) : mode === "picture-anchor" ? (
      <div className="sms-cta-pair">
        <button type="button" className={primary} disabled={!picNote.trim() || picSaving} onClick={keepFeeling}>
          Keep this feeling
        </button>
        <TextAction surface={textSurface} className="sms-cta-secondary" onClick={() => setMode("journey")}>
          Done without writing
        </TextAction>
      </div>
    ) : null;
  };
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
  // the very first Starlight, earned here: she says what it is, once
  const [firstLight, setFirstLight] = useState(false);
  useEffect(
    () =>
      onStarlight((r) => {
        if (r.awarded > 0 && !r.duplicate && !hintDone("firstStarlight")) {
          markHint("firstStarlight");
          setFirstLight(true);
        }
      }),
    [],
  );
  const say =
    placeholder ? null : firstLight && (mode === "saved" || mode === "done") ? { text: FIRST_STARLIGHT_LINE, face: "comfort" as const } : SAY[mode];
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
            className={`sms-screen${focus ? " is-focus" : ""}${hideNav ? " no-nav" : ""}${completion || mode === "picture-anchor" || mode === "picture-intro" ? " is-completion" : ""}${mode === "picture" ? " is-picturing" : ""}${picturing ? " is-ritual" : ""}${mode === "journey" ? " is-journey" : ""}${writingCard ? " is-writing" : ""}${journal ? " is-away" : ""}`}
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
                {mode === "journey" ? null : editing ? (
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
                {mode !== "journey" && (
                  <p className="smj-status">
                    <StarGlyph size={12} />
                    {star.fulfilledAt ? "Fulfilled" : "Still walking"}
                  </p>
                )}
              </div>
              {mode === "journey" ? (
                <OverflowMenu
                  surface="dark"
                  label="Manage this Star"
                  items={[
                    { label: "Edit Star", icon: <IconPencil size={20} />, destructive: false, onSelect: () => setEditing(true) },
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
              // the Star stays where it was in the sky — unless it sits low, then
              // it rises toward the top so her words and the card always fit
              style={hasHeader || focus || picturing ? undefined : { paddingTop: `min(${Math.max(8, anchor.y - 44)}px, 14dvh)` }}
              onClick={(e) => {
                // a tap on the open sky puts the paper away (not mid-visualization)
                // (anywhere on the night — the words, the light, the gaps — except
                // the paper, a card, Sísí or a control)
                const t = e.target as HTMLElement;
                if (picturing) return;
                if (t.closest(".sms-paper-wrap, .sms-card, .smc-sisi, button, a, input, textarea, [role='dialog']")) return;
                onClose();
              }}
            >
              <div className={`sms-path${shine ? ` is-${shine}` : ""}`}>
                <div ref={(el) => fxAnchorRef("selectedStar", el)} style={mode === "journey" ? { ["--care" as string]: String(1 + glow * 0.35) } : undefined} className={`sms-star${star.fulfilledAt || shine === "warm" ? " is-fulfilled" : ""}${shine === "bright" || shine === "warm" || picBright ? " is-shining" : ""}${mode === "picture" ? ` is-breathing ph-${phase}` : ""}${wishTouch ? " is-wished" : ""}`} aria-hidden>
                  {/* the more time spent with this wish, the wider its light (never past
                      the top of the scroll, where it would show a straight edge) */}
                  {mode === "journey" && <span className="smj-glow" aria-hidden style={{ opacity: 0.35 + glow * 0.65, transform: `translate(-50%, -50%) scale(${0.95 + glow * 0.2})` }} />}
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
                        {/* Sísí's words written softly on the night itself (no
                            box): the Star's light runs down through them */}
                        <AnimatePresence mode="wait">
                          {say && (
                            <motion.p
                              key={mode}
                              className="sms-words"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5, ease: EASE } }}
                              exit={{ opacity: 0, y: -4, transition: { duration: 0.22 } }}
                            >
                              {say.text}
                            </motion.p>
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
                    {mode !== "picture" && mode !== "reflect" && (
                    <motion.div
                      className="sms-paper-wrap"
                      layout
                      initial={{ y: mode === "picture-anchor" ? 220 : 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ y: { duration: 0.55, ease: EASE }, opacity: { duration: 0.3 }, layout: { duration: 0.4, ease: SOFT } }}
                      role="dialog"
                      aria-label={placeholder ? "Your waiting star" : `Star: ${star.wish}`}
                    >
                      {/* Sísí sits on the paper when she is the one speaking (choices,
                          completions); where you write, the page is yours — she steps away */}
                      {!placeholder && !writingCard && (
                        <div className="smc-sisi" aria-hidden>
                          <SisiChatCharacter expression={face} />
                        </div>
                      )}
                      <motion.div layout className="sms-paper ds-paper ds-deckle">
                        {/* the sheet's own ✕, top right (the choices have it in their ‹ · ✕ row) */}
                        {mode !== "practice" && !picturing && (
                          <span className="smc-sheet-close">
                            <IconButton label="Back to My Stars" onClick={onClose}>
                              <IconClose />
                            </IconButton>
                          </span>
                        )}
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
                        {/* status as a small crayon mark, not a grey pill */}
                        <p className="smc-status-mark">
                          <StarGlyph size={14} /> {star.fulfilledAt ? "Fulfilled" : "Still walking"}
                        </p>
                        {/* both ways on, on the paper: the one next step, then the journey */}
                        <div className="smc-invite-actions">
                          <PrimaryButton block onClick={() => startPractice("invite")}>
                            Spend a quiet moment
                          </PrimaryButton>
                          <SecondaryButton block onClick={() => setMode("journey")}>
                            View journey
                          </SecondaryButton>
                        </div>
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
                            {p.id === "picture" ? <EyeIcon /> : p.id === "walk" ? <PathIcon /> : <WriteIcon />}
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
                      placeholder="I am…"
                      ref={takeKeyboardOnMount}
                      aria-label="Write it as if it’s already yours"
                      onChange={(e) => setPicNote(e.target.value)}
                    />
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


                        </AnimatePresence>
                        {paperControls && <div className="smc-paper-actions">{controls(true)}</div>}
                      </motion.div>
                    </motion.div>
                    )}
                  </div>
                )}

                {mode === "journey" && (
                  <motion.div className="smj-hero" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: SOFT }}>
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
                      <h2 className="smj-wish">{star.wish || "Your Star"}</h2>
                    )}
                    <p className="smj-status">
                      <StarGlyph size={12} />
                      {star.fulfilledAt ? "Fulfilled" : "Still walking"}
                    </p>
                    {/* here you face the wish. With steps on it, its latest one rests
                        quietly below (a small step if there is one); the whole way so far
                        is one tap away. Without any yet, only a gentle line. */}
                    {/* what has been done for this wish, one mark per activity (the same
                        icon as its card: eye · paws · pencil); each opens
                        its journal on that kind. Before anything, one gentle line. */}
                    {/* what you actually left for it, first: the latest moment, in your words */}
                    {latestWords && (
                      <button type="button" className="smj-latest" onClick={() => setJournal("all")}>
                        <span className="smj-latest-meta">{dayLabel(latestWords.createdAt)}</span>
                        <span className="smj-latest-text">“{latestWords.text}”</span>
                        <span className="smj-latest-more">
                          {/* the count lives once, in the marks below */}
                          {marks.reflected > 1 ? "See all moments" : "Read it"}
                          <IconChevronRight size={14} />
                        </span>
                      </button>
                    )}
                    {signs !== null && care > 0 ? (
                      <div className="smj-marks" role="group" aria-label="Your way with this wish">
                        {(
                          [
                            { id: "pictured", n: marks.pictured, one: "pictured", many: "pictured", icon: <IconEye /> },
                            { id: "walked", n: marks.walked, one: "day walked", many: "days walked", icon: <IconPaws /> },
                            { id: "reflected", n: marks.reflected, one: "moment", many: "moments", icon: <IconPencil /> },
                          ] as const
                        ).map((m) => (
                          <button key={m.id} type="button" className={`smj-mark${m.n === 0 ? " is-zero" : ""}`} onClick={() => setJournal(m.id)}>
                            <span className="smj-mark-icon" aria-hidden>
                              {m.icon}
                            </span>
                            <span className="smj-mark-label">
                              <b>{m.n}</b> {m.n === 1 ? m.one : m.many}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : signs !== null ? (
                      <p className="smj-say">{fresh ? <>Your journey begins here.</> : <>A quiet moment is a good place to begin.</>}</p>
                    ) : null}
                  </motion.div>
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
            {/* on the night, the one action is an ivory button (the system's on-dark primary) */}
            {hasControls && !paperControls && <div className="sms-controls">{controls(false)}</div>}


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
        /* the journal is open over the night: the Star screen steps back */
        .sms-screen.is-away .sms-header, .sms-screen.is-away .sms-scroll, .sms-screen.is-away .sms-controls { opacity: 0; pointer-events: none; transition: opacity 240ms ease; }
        .sms-header {
          flex: none; position: relative; z-index: 3;
          display: flex; align-items: flex-start; gap: 6px;
          padding: var(--header-top) max(8px, var(--safe-right)) 8px max(8px, var(--safe-left));
          /* no band behind it: nothing scrolls under the header any more, and
             the night stays one sky */
          background: none;
        }
        .sms-scroll {
          flex: 1; min-height: 0; position: relative; z-index: 1;
          overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          padding: 4px 16px calc(var(--bottom-controls-height) + 32px);
          scrollbar-width: none;
        }
        .sms-scroll::-webkit-scrollbar { display: none; }
        .sms-path { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        /* just the Star: no light falls from it (its words and paper carry the moment) */
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
        /* lifted a little toward the Star, with room above Sísí's ears so the
           tail's tip (aimed at her head) shows instead of hiding behind her */
        .sms-say--card { position: relative; z-index: 1; width: 100%; justify-content: center; margin: 2px 0 92px; min-height: 1px; }
        .sms-words {
          position: relative; margin: 0; max-width: min(84vw, 320px); padding: 14px 18px;
          text-align: center; color: var(--sisi-paper); text-wrap: balance;
          font-family: var(--font-editorial); font-size: clamp(18px, 5vw, 21px); line-height: 1.35; letter-spacing: var(--tracking-editorial);
          text-shadow: 0 1px 10px rgba(5, 12, 24, 0.75);
        }
        /* the night pools softly behind the words, so the light passes beneath them */
        .sms-words::before {
          content: ""; position: absolute; inset: -6px -10px; z-index: -1; border-radius: 50%;
          background: radial-gradient(closest-side, rgba(6, 14, 26, 0.92), rgba(6, 14, 26, 0.55) 60%, rgba(6, 14, 26, 0));
        }
        .sms-paper-wrap { position: relative; }
        .smc-status-mark {
          display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 0;
          font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--ink-60);
        }
        .smc-invite-actions { display: flex; flex-direction: column; gap: 10px; margin-top: var(--space-5); }
        /* a step's actions, inside the card */
        .smc-paper-actions { margin-top: var(--space-5); }
        .smc-paper-actions .sms-cta-pair { display: flex; flex-direction: column; gap: 10px; }
        .sms-paper-wrap.is-quiet { width: min(60%, 220px); margin: 0 auto; }
        .sms-paper-wrap.is-quiet .smc-sisi { right: 50%; transform: scale(0.74) translateX(50%); }
        .sms-paper {
          position: relative; z-index: 1; padding: var(--space-5) var(--space-5) var(--space-5);
          /* deckled Focus paper (.ds-deckle): soft torn edges, lift follows the edge */
          --paper-grain-layer: var(--grain-focus);
          filter: drop-shadow(0 8px 16px rgba(16, 45, 50, 0.32));
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
          border-radius: 14px; cursor: pointer; color: var(--sisi-ink); background: none;
          /* a hand-drawn box, like the buttons and fields */
          border: 1px solid transparent;
          border-image: url("/assets/ui/sketch-box-thin-ink.svg") 24 / 24px / 0 stretch;
          transition: background-color var(--motion-instant) ease;
        }
        .smc-choice:hover { background: var(--ink-08); }
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
        /* the light starts at the Star (never above it) */
        .sms-screen.is-focus .sms-stage {
          flex: 1 1 auto; min-height: 150px; width: 100%; justify-content: flex-end;
        }
        /* her words float in the open sky between the Star and the sheet,
           not pressed onto the paper */
        .sms-screen.is-focus .sms-say--card {
          flex: 1 1 auto; display: flex; align-items: center; justify-content: center;
          margin: 0; padding: 8px var(--space-6) 64px;
        }
        /* Sísí a little smaller here, so the choice keeps the room */
        .sms-screen.is-focus .smc-sisi { transform: scale(0.6); }
        /* In the Stars every paper is the same floating card (as New Star):
           torn on all sides, 16px from the edges, resting just above the bottom
           — always in the same place, never hanging from the Star. */
        .sms-screen.is-focus .sms-paper-wrap {
          flex: 0 0 auto; width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
          margin: 0 auto calc(16px + var(--safe-bottom));
        }

        .sms-screen.is-focus.is-writing .sms-paper-wrap {
          margin-bottom: max(calc(16px + var(--safe-bottom)), calc(var(--ds-kb, 0px) + 12px));
          transition: margin-bottom 220ms var(--ease-sisi);
        }
        .sms-screen.is-focus .sms-paper {
          display: flex; flex-direction: column;
          max-height: calc(100dvh - var(--safe-top) - 186px);
          padding: var(--space-2) var(--space-5) var(--space-5);
          filter: drop-shadow(0 10px 26px rgba(16, 45, 50, 0.42));
        }
        .sms-screen.is-focus .sms-paper > * { min-height: 0; display: flex; flex-direction: column; }
        .sms-screen.is-focus .smc-content { min-height: 0; flex: 1 1 auto; }
        /* ‹ and ✕: their 44px targets overhang 12px so the marks sit on the gutter */
        .smc-sheet-close { position: absolute; z-index: 3; top: 6px; right: 12px; }
        /* a sheet with its ✕: the words begin level with it, never beneath it */
        .sms-screen.is-focus .smc-sheet-close ~ .smc-content { padding-top: 18px; }
        .sms-screen.is-focus .smc-sheet-close ~ .smc-content > :first-child { margin-right: 44px; }
        /* the ritual's sheets: the Star stays where the ritual keeps it */
        .sms-screen.is-focus.is-ritual .sms-scroll { padding-top: 0; }
        .sms-screen.is-focus.is-ritual .smc-content { padding-top: 14px; }
        .sms-screen.is-focus.is-ritual .sms-star { margin-top: max(calc(var(--safe-top) + 32px), calc(21dvh - 44px)); }
        .sms-screen.is-focus .smc-navrow { flex: none; height: 44px; margin: 0 -12px 6px; align-items: center; }
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
          min-height: 68px; max-height: 78px; padding: 12px 18px; gap: 14px; border-radius: 14px; flex: none;
          transition: transform var(--motion-instant) var(--ease-sisi), opacity 200ms ease, border-color var(--motion-instant) ease;
        }
        .smc-choice.is-picked { transform: scale(0.98); border-image-source: url("/assets/ui/sketch-box-bold-ink.svg"); }
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
          .sms-screen.is-focus .sms-paper { padding: var(--space-1) var(--space-5) var(--space-4); }
          .sms-screen.is-focus .smc-choice { min-height: 64px; max-height: 68px; padding: 10px 16px; }
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
        .sms-star.is-shining .sms-star-inner { animation: sms-shine 1.5s ease-in-out both; }
        @keyframes sms-shine {
          0% { filter: brightness(1); }
          45% { filter: brightness(1.55) drop-shadow(0 0 14px rgba(241, 196, 94, 0.65)); }
          100% { filter: brightness(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sms-path .sms-card > .ds-memory-sheet { transition: opacity 300ms linear; transform: none !important; }
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
        /* while picturing: the Star comes down to the centre of the night (it
           returns up for the anchor's paper) and the words rest below it, in
           one fixed place, so nothing moves as the lines change */
        .sms-screen.is-ritual .sms-scroll { transition: padding-top 1.4s var(--ease-sisi); }
        .sms-screen.is-picturing .sms-scroll { padding-top: calc(40dvh - 44px); }
        .sms-screen.is-picturing .smp-prompt {
          /* the Star ends at 40dvh + 44px; the words begin near 62dvh (the path's 20px gap included) */
          height: auto; margin-top: calc(22dvh - 64px); justify-content: flex-start;
        }
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
          margin: 0; padding: 18px 26px; max-width: 320px; text-align: center; text-wrap: balance;
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

        /* ── the journey: a timeline of what belongs to this wish ── */
        /* one screen: the Star (as bright as the time given to it) · the wish ·
           Sísí's one line · a way to its Moments · one action */
        .sms-screen.is-journey .sms-path { padding-top: 6dvh; gap: 0; }
        .sms-screen.is-journey .sms-star { width: 132px; height: 132px; }
        .sms-screen.is-journey .sms-star-inner { transform: scale(calc(1.75 * var(--care, 1))); transition: transform 1.2s var(--ease-sisi); }
        .smj-glow {
          position: absolute; left: 50%; top: 50%; width: 260px; height: 260px; border-radius: 50%; pointer-events: none;
          /* closest-side: the light has fully faded inside its own circle (never cut by an edge) */
          background: radial-gradient(circle closest-side, rgba(255, 228, 165, 0.42), rgba(241, 196, 94, 0.14) 42%, rgba(241, 196, 94, 0) 76%);
          transition: opacity 1.2s ease, transform 1.2s var(--ease-sisi);
        }
        .smj-hero { position: relative; z-index: 2; width: min(100%, 380px); display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 18px; }
        .smj-wish {
          margin: 0; font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-wish);
          line-height: 1.18; letter-spacing: -0.01em; color: var(--sisi-paper); overflow-wrap: anywhere;
          /* two lines share the words evenly (never one word left alone) */
          text-wrap: balance;
        }
        .smj-hero .smj-status { margin-top: 10px; }
        .smj-say {
          /* Sísí's own words stand upright, as everywhere she speaks
             (italic is kept for quiet states and for quoting your words) */
          margin: 36px 0 0; font-family: var(--font-editorial); font-size: var(--text-speech); line-height: var(--leading-dialogue); letter-spacing: var(--tracking-editorial); color: var(--paper-80); text-wrap: balance;
        }
        /* the latest moment: your own words, first (then the marks) */
        .smj-latest {
          margin-top: 20px; max-width: 320px; min-height: 44px; padding: 8px 12px; border: 0; background: none; border-radius: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 6px; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
        }
        .smj-latest:active { background: rgba(245, 239, 230, 0.06); }
        .smj-latest-meta { font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.02em; color: var(--paper-80); }
        .smj-latest-text {
          font-family: var(--font-editorial); font-size: 17px; line-height: 1.4; color: var(--sisi-paper); text-wrap: balance;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .smj-latest-more { display: inline-flex; align-items: center; gap: 2px; font-family: var(--font-ui); font-size: 13px; color: var(--paper-80); }
        /* the three marks: the system's mark square, round, on the night */
        .smj-marks { display: flex; justify-content: center; gap: 6px; width: 100%; margin-top: 16px; }
        .smj-mark {
          flex: 1 1 0; max-width: 116px; min-height: 44px; display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 6px 2px; border: 0; background: none; color: var(--sisi-paper); cursor: pointer; border-radius: 14px;
          -webkit-tap-highlight-color: transparent;
        }
        .smj-mark-icon {
          width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          background: rgba(245, 239, 230, 0.1); box-shadow: inset 0 0 0 1px rgba(245, 239, 230, 0.16);
          transition: transform 160ms var(--ease-sisi), background 160ms ease;
        }
        .smj-mark-icon svg { width: 24px; height: 24px; }
        .smj-mark:active .smj-mark-icon { transform: scale(0.94); background: rgba(245, 239, 230, 0.18); }
        .smj-mark-label { font-family: var(--font-editorial); font-size: 16px; line-height: 1.3; color: var(--paper-90); text-align: center; text-wrap: balance; }
        .smj-mark-label b { font-weight: 500; font-size: 17px; color: var(--sisi-paper); }
        /* nothing of this kind yet: still there, quieter */
        .smj-mark.is-zero { opacity: 0.62; }
        .smj-hero .smj-edit { width: 100%; text-align: left; }
        /* the pair (Leave a moment · Picture it, or walk with it) fits above the safe area */
        .sms-screen.is-journey { --bottom-controls-height: calc(var(--safe-bottom) + var(--cta-height) + 64px); }
        .smj-status {
          display: inline-flex; align-items: center; gap: 6px; margin: 0;
          font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.02em; color: var(--paper-80);
        }

        /* ── full journey header ── */
        .smj-icon { flex: 0 0 44px; width: 44px; height: 44px; }
        .smj-titles { flex: 1; min-width: 0; padding-top: 6px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
        .smj-title {
          margin: 0; font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-card-title);
          line-height: var(--leading-title); color: var(--sisi-paper); overflow-wrap: anywhere;
        }
        .smj-edit { width: 100%; padding: 10px 12px; border-radius: var(--paper-radius); }
        .smc-edit-input { font-size: var(--text-card-title); }
        .smc-edit-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 8px 0 0; }
        .smc-edit-actions .ds-btn { min-height: 44px; }
      `}</style>

      {/* the journal of this wish: what was done for it, by kind */}
      {!placeholder && (
        <StarJournal
          open={journal !== null}
          star={star}
          signs={signs ?? []}
          days={days}
          pictures={activities().filter((a) => a.kind === "picture" && a.starId === star.id).map((a) => a.at)}
          marks={marks}
          kind={journal ?? "all"}
          onKind={setJournal}
          onClose={() => setJournal(null)}
        />
      )}

      {/* Reflect on today: written on the writing page — the wish is this Star's */}
      <WritingPage
        open={mode === "reflect"}
        onClose={() => setMode(reflectBack)}
        label="Reflect on today"
        question={kind ? KIND[kind].ph : "What happened along the way?"}
        text={text}
        onText={setText}
        wish={star}
        extra={
          // choosing the kind keeps the keyboard up
          <div className="ds-chip-row" role="group" aria-label="What kind of moment (optional)" onMouseDown={(e) => e.preventDefault()}>
            {(Object.keys(KIND) as EntryKind[]).map((k) => (
              <FilterChip key={k} selected={kind === k} onClick={() => setKind((c) => (c === k ? null : k))}>
                {KIND[k].chip}
              </FilterChip>
            ))}
          </div>
        }
        saving={saving}
        canSave={!!text.trim()}
        onSave={save}
      />
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

function NavRow({ onBack, onClose }: { onBack: () => void; onClose?: () => void }) {
  return (
    <div className="smc-navrow">
      <IconButton label="Back" onClick={onBack}>
        <IconBack />
      </IconButton>
      {onClose && (
        <IconButton label="Close" onClick={onClose}>
          <IconClose />
        </IconButton>
      )}
    </div>
  );
}

/** Picture it · Walk with it · Reflect on today · Let it rest — the shared crayon marks */
const EyeIcon = () => <IconEye />;
const PathIcon = () => <IconPaws />; // walking with Sísí
const WriteIcon = () => <IconPencil />; // reflecting is writing
const MoonIcon = () => <IconMoon size={20} />;

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
