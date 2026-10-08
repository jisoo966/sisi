"use client";

import { IconButton, IconClose } from "@/components/ds";
import { SpeakLines as SharedSpeakLines } from "@/components/sisi/SpeakLines";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createMoment } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { bySentence, SisiSpeechBubble, aimTail } from "@/components/sisi/SisiSpeechBubble";
import { finishTodaysThought, isKept, markKept, thoughtForToday, type Thought } from "@/lib/sisiThoughts";

/**
 * CompanionCues — small, quiet things that sit beside Sísí in the Journey.
 *
 *   talk hint   first Journey visit only: "Tap Sísí whenever you want to talk."
 *               (gone once the user taps Sísí or dismisses it)
 *   thought     some days: a tiny star near Sísí. Opening it shows
 *               "A thought for your walk" — Keep this · Talk to Sísí · ×.
 *               Never a modal, never on every open.
 *   line        anything else Sísí says on the walk (e.g. "Walk with it")
 *
 * Slow Walk: Sísí doesn't stop to talk. When a line opens, `onSpeaking(true)`
 * lets the world ease down (to ~40%) and the bubble appears ~300ms later;
 * when it closes, the bubble fades and lifts out first, then ~150ms later
 * `onSpeaking(false)` lets the walk ease back. (The one-time "Tap Sísí"
 * hint is guidance, not conversation — the walk doesn't slow for it.)
 */

export type SpokenLine = {
  key: string;
  text: React.ReactNode;
  kicker?: string;
  actions?: { label: string; act: (e?: React.MouseEvent<HTMLElement>) => void; quiet?: boolean }[];
  onDismiss?: () => void;
  /** "sky": centred in the upper-middle clear sky, clear of Sísí and any discovery object */
  placement?: "sky";
};

const REVEAL_AFTER_MS = 300;
const EXIT_MS = 220;
const RESUME_AFTER_MS = 150;

/** Save a thought as one Moment ("A note from Sísí") — once, however many taps. */
export async function keepThought(t: Thought): Promise<void> {
  if (isKept(t.id)) return;
  markKept(t.id); // claim first, so repeated taps can't save twice
  await createMoment({ source: "sisi_note", type: "companion_note", text: t.text });
}

/** three short strokes beside Sísí's face — she is saying this (shared) */
function SpeakLines({ delay }: { delay: number }) {
  return (
    <SharedSpeakLines
      delay={delay}
      // just in front of her face (she faces right), on the sky
      style={{
        left: "calc(var(--companion-x, 37%) + var(--cat-width) * 0.45)",
        bottom: "calc(var(--walking-baseline) + var(--cat-width) * 0.6)",
        zIndex: 6,
      }}
    />
  );
}

export function CompanionCues({
  visible,
  onTalk,
  line = null,
  onSpeaking,
}: {
  visible: boolean;
  onTalk: (opening?: string) => void;
  /** a line Sísí says right now (takes the place of hints and thoughts) */
  line?: SpokenLine | null;
  onSpeaking?: (speaking: boolean) => void;
}) {
  const [talkHint, setTalkHint] = useState(false);
  const [thought, setThought] = useState<Thought | null>(null);
  const [openThought, setOpenThought] = useState(false);
  const [kept, setKept] = useState(false);

  useEffect(() => {
    const first = !hintDone("talk");
    setTalkHint(first);
    // the first visit teaches talking; thoughts wait for another day
    if (!first) {
      const t = thoughtForToday();
      setThought(t);
      if (t) setKept(isKept(t.id));
    }
  }, []);

  // talked already (e.g. tapped Sísí) → the talk hint has done its work
  useEffect(() => {
    if (visible && talkHint && hintDone("talk")) setTalkHint(false);
  }, [visible, talkHint]);

  // the talk hint is a passing note: one tap anywhere puts it away (a tap on
  // the hint itself still starts the talk)
  useEffect(() => {
    if (!visible || !talkHint || line) return;
    const away = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.(".sisi-speech")) return;
      markHint("talk");
      setTalkHint(false);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [visible, talkHint, line]);

  // ── the Slow Walk rhythm ──
  const wanted: SpokenLine | null =
    visible && line
      ? line
      : visible && !talkHint && thought && openThought
        ? { key: `thought-${thought.id}`, text: thought.text, kicker: "A thought for your walk" }
        : null;
  const [shown, setShown] = useState<SpokenLine | null>(null);
  const speakingRef = useRef(false);
  const onSpeakingRef = useRef(onSpeaking);
  onSpeakingRef.current = onSpeaking;
  const wantedKey = wanted?.key ?? null;
  const wantedRef = useRef(wanted);
  wantedRef.current = wanted;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (wantedKey) {
      if (!speakingRef.current) {
        speakingRef.current = true;
        onSpeakingRef.current?.(true); // start slowing…
        timers.push(setTimeout(() => setShown(wantedRef.current), REVEAL_AFTER_MS)); // …then speak
      } else setShown(wantedRef.current); // another line while already slow
    } else {
      setShown(null); // the bubble fades and lifts out first…
      if (speakingRef.current)
        timers.push(
          setTimeout(() => {
            speakingRef.current = false;
            onSpeakingRef.current?.(false); // …then the walk picks up again
          }, EXIT_MS + RESUME_AFTER_MS),
        );
    }
    return () => timers.forEach(clearTimeout);
  }, [wantedKey]);
  // keep the shown line's actions current (e.g. "Kept" state)
  useEffect(() => {
    if (shown && wanted && shown.key === wanted.key && shown !== wanted) setShown(wanted);
  }, [shown, wanted]);
  useEffect(() => () => {
    if (speakingRef.current) onSpeakingRef.current?.(false);
  }, []);

  // a speech bubble sits centred on the screen; its tail slides to her head
  const speaking = visible && ((talkHint && !line) || !!shown) && shown?.placement !== "sky";
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!speaking) return;
    let raf = 0;
    const aim = () => {
      raf = requestAnimationFrame(aim);
      const head = headRef.current?.getBoundingClientRect();
      rootRef.current?.querySelectorAll<HTMLElement>(".sisi-speech").forEach((b) => head && aimTail(b, head.left));
    };
    raf = requestAnimationFrame(aim);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  const dismissThought = () => {
    finishTodaysThought();
    setOpenThought(false);
    setThought(null);
  };

  return (
    <>
    <AnimatePresence>
      {/* the strokes arrive with the bubble (the talk hint waits 1.4s) */}
      {visible && (talkHint || !!shown) && <SpeakLines key="lines" delay={!shown && talkHint ? 1.4 : 0} />}
    </AnimatePresence>
    {/* where her head is (the tail aims here) */}
    <span ref={headRef} className="cc-head" aria-hidden />
    <div
      ref={rootRef}
      className={`cc-root${shown?.placement === "sky" ? " is-sky" : speaking ? " is-centred" : ""}`}
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && talkHint && !line && (
          <SisiSpeechBubble
            key="talk"
            tailPosition="bottom-right"
            align="left"
            delay={1.4}
            ariaLabel="Tap Sísí whenever you want to talk."
            // the hint itself is a way in: tapping it starts the talk
            onClick={() => {
              markHint("talk");
              setTalkHint(false);
              onTalk();
            }}
            message={
              <>
                Tap <em>Sísí</em> whenever you want to talk.
              </>
            }
          />
        )}

        {visible && !line && !talkHint && thought && !openThought && (
          <motion.button
            key="spark"
            type="button"
            className="cc-spark"
            aria-label="A thought for your walk"
            onClick={() => setOpenThought(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.6 } }}
            exit={{ opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/sisi-star-mark-painted-512.png" alt="" aria-hidden />
          </motion.button>
        )}

        {shown && (
          <SisiSpeechBubble
            key={shown.key}
            tailPosition={shown.placement === "sky" ? "no-tail" : "bottom-right"}
            align="left"
            className={`cc-thought${shown.key.startsWith("thought-") || shown.onDismiss ? " has-x" : ""}${shown.actions?.length || shown.key.startsWith("thought-") ? " has-actions" : ""}`}
            corner={
              shown.key.startsWith("thought-") || shown.onDismiss ? (
                <IconButton
                  className="cc-x"
                  label="Dismiss"
                  onClick={shown.key.startsWith("thought-") ? dismissThought : shown.onDismiss}
                >
                  <IconClose size={20} />
                </IconButton>
              ) : undefined
            }
          >
            {shown.kicker && <p className="cc-kicker">{shown.kicker}</p>}
            <p className="cc-thought-text">{bySentence(shown.text)}</p>
            {shown.key.startsWith("thought-") && thought ? (
              <div className="cc-actions">
                <button
                  type="button"
                  className="ds-text-action cc-link"
                  disabled={kept}
                  onClick={async () => {
                    setKept(true);
                    await keepThought(thought);
                  }}
                >
                  {kept ? "Kept in your Moments" : "Keep this"}
                </button>
                <button
                  type="button"
                  className="ds-text-action cc-link"
                  onClick={() => {
                    finishTodaysThought();
                    setOpenThought(false);
                    setThought(null);
                    onTalk(thought.text);
                  }}
                >
                  Talk to Sísí
                </button>
              </div>
            ) : shown.actions?.length ? (
              <div className="cc-actions cc-actions--wrap">
                {/* her answer to choose is a reply chip (as in a talk with her); a quiet one stays text */}
                {shown.actions.map((a) =>
                  a.quiet ? (
                    <button key={a.label} type="button" className="ds-text-action cc-link cc-link--quiet" onClick={(e) => a.act(e)}>
                      {a.label}
                    </button>
                  ) : (
                    <button key={a.label} type="button" className="ds-reply-chip cc-chip" onClick={(e) => a.act(e)}>
                      {a.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </SisiSpeechBubble>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .cc-root {
          /* the bubble grows to the left and upward; its bottom-right tail
             (≈29px from its right edge) points down at Sísí's head */
          --cc-anchor: calc(var(--companion-x, 37%) + var(--cat-width) * 0.3 + 29px);
          position: absolute; z-index: 6; pointer-events: none;
          right: calc(100% - var(--cc-anchor));
          bottom: calc(var(--walking-baseline) + var(--cat-width) * 0.92);
          max-width: calc(var(--cc-anchor) - 12px);
          display: flex; flex-direction: column; align-items: flex-end;
        }
        .cc-root > * { pointer-events: auto; }
        /* Sísí speaking: the bubble is centred on the screen (tail aimed at her head) */
        .cc-root.is-centred {
          left: 50%; right: auto; transform: translateX(-50%);
          width: max-content; max-width: min(84%, 300px); align-items: center;
        }
        .cc-head {
          position: absolute; width: 0; height: 0; pointer-events: none;
          left: calc(var(--companion-x, 37%) + var(--cat-width) * 0.3);
          bottom: calc(var(--walking-baseline) + var(--cat-width) * 0.9);
        }
        /* a discovery: the words sit centred in the upper-middle sky */
        .cc-root.is-sky {
          left: 50%; right: auto; bottom: auto; top: max(calc(var(--safe-top) + 72px), 31%); /* below a Cloud Garden cloud (16–28%), above Sísí */
          transform: translateX(-50%); width: min(84%, 320px); max-width: none; align-items: center;
        }
        /* the same optically centred paper as every bubble (15 · 16 · 11 · 16);
           room on the right only when there is a × to tap, and a shorter
           bottom when text buttons (with their own air) close the bubble */
        .cc-thought.sisi-speech { padding: 14px 16px 12px; } /* her lines are dialogue size (17px): one px less above */
        .cc-thought.sisi-speech.has-x { padding-right: 40px; }
        .cc-thought.sisi-speech.has-actions { padding-bottom: 13px; } /* a chip carries its own edge */
        .cc-thought-text { margin: 0; font-family: var(--font-editorial); font-size: var(--text-speech); line-height: var(--leading-dialogue); } /* Sísí's voice: one size everywhere */
        .cc-kicker { margin: 0 0 4px; font-family: var(--font-ui); font-weight: 500; font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        /* her choices sit on one row under her words (Yes, please · Not now) */
        .cc-actions { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; margin: 8px 0 0 -12px; }
        .cc-actions--wrap { margin-left: 0; } /* a chip starts on the words' line */
        /* a chip a step smaller than her words (a reply, not a headline);
           the tap target stays 44px */
        .cc-chip.ds-reply-chip { white-space: nowrap; min-height: 28px; padding: 0 11px; font-size: 13.5px; border-image-width: 20px; }
        .cc-chip.ds-reply-chip::before { inset: -8px -4px; }
        .cc-actions .cc-link { min-height: 40px; white-space: nowrap; }
        .cc-thought .cc-actions--wrap { flex-wrap: wrap; }
        .cc-link { color: var(--sisi-ink); font-weight: 500; }
        .cc-link--quiet { color: var(--ink-60) !important; font-weight: 400; }
        .cc-link:disabled { color: var(--ink-60); opacity: 1; }
        .cc-x { position: absolute !important; right: 0; top: 0; color: var(--ink-60); }
        .cc-spark {
          position: relative; left: calc(var(--cat-width) * 0.42); width: 44px; height: 44px; padding: 10px;
          border: 0; background: transparent; cursor: pointer; animation: cc-breathe 3s ease-in-out infinite;
        }
        .cc-spark img { width: 100%; height: 100%; display: block; }
        @keyframes cc-breathe { 0%, 100% { opacity: 0.75; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.04); } }
        @media (prefers-reduced-motion: reduce) { .cc-spark { animation: none; } }
      `}</style>
    </div>
    </>
  );
}
