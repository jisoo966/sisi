"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createMoment } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { SisiSpeechBubble } from "@/components/sisi/SisiSpeechBubble";
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
  actions?: { label: string; act: () => void; quiet?: boolean }[];
  onDismiss?: () => void;
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

/** three short strokes beside Sísí's face — she is saying this */
function SpeakLines() {
  return (
    <motion.span
      className="cc-lines"
      aria-hidden
      // just in front of her face (she faces right), on the sky
      style={{
        left: "calc(var(--companion-x, 37%) + var(--cat-width) * 0.45)",
        bottom: "calc(var(--walking-baseline) + var(--cat-width) * 0.6)",
        zIndex: 6,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.4 } }}
      exit={{ opacity: 0 }}
    >
      <span style={{ transform: "translate(0, -9px) rotate(-28deg)" }} />
      <span style={{ transform: "translate(2px, 0) rotate(0deg)" }} />
      <span style={{ transform: "translate(0, 9px) rotate(28deg)" }} />
    </motion.span>
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

  const dismissThought = () => {
    finishTodaysThought();
    setOpenThought(false);
    setThought(null);
  };

  return (
    <>
    <AnimatePresence>
      {visible && (talkHint || !!shown) && <SpeakLines key="lines" />}
    </AnimatePresence>
    <div className="cc-root" aria-live="polite">
      <AnimatePresence>
        {visible && talkHint && !line && (
          <SisiSpeechBubble
            key="talk"
            tailPosition="bottom-right"
            align="center"
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
            tailPosition="bottom-right"
            align="left"
            className="cc-thought"
            corner={
              shown.key.startsWith("thought-") || shown.onDismiss ? (
                <button
                  type="button"
                  className="cc-x"
                  aria-label="Dismiss"
                  onClick={shown.key.startsWith("thought-") ? dismissThought : shown.onDismiss}
                >
                  ×
                </button>
              ) : undefined
            }
          >
            {shown.kicker && <p className="cc-kicker">{shown.kicker}</p>}
            <p className="cc-thought-text">{shown.text}</p>
            {shown.key.startsWith("thought-") && thought ? (
              <div className="cc-actions">
                <button
                  type="button"
                  className="cc-link"
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
                  className="cc-link"
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
                {shown.actions.map((a) => (
                  <button key={a.label} type="button" className={`cc-link${a.quiet ? " cc-link--quiet" : ""}`} onClick={a.act}>
                    {a.label}
                  </button>
                ))}
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
        .cc-thought.sisi-speech { padding: 14px 38px 10px 18px; }
        .cc-thought-text { margin: 0; font-family: var(--font-editorial), Georgia, serif; font-size: clamp(15px, 4vw, 16.5px); line-height: 1.34; }
        .cc-thought .cc-actions { justify-content: flex-start; gap: 14px; white-space: nowrap; }
        .cc-thought .cc-actions--wrap { flex-wrap: wrap; row-gap: 0; }
        .cc-link--quiet { color: rgba(24, 51, 58, 0.6) !important; }
        .cc-thought .cc-link { font-size: 15px; }
        .cc-thought .cc-kicker { color: rgba(24, 51, 58, 0.6); }
        .cc-thought .cc-x { color: rgba(24, 51, 58, 0.5); }
        /* a speech bubble from Sísí: warm ivory, rounded, tail down to her */
        .cc-bubble {
          position: relative; display: block; margin: 0; padding: 12px 20px 13px; text-align: center; cursor: pointer;
          border: 1px solid rgba(43, 47, 69, 0.08); border-radius: 18px; background: #f8f1e2; color: #2b2f45;
          box-shadow: 0 6px 16px rgba(10, 18, 30, 0.18);
        }
        .cc-bubble::after {
          content: ""; position: absolute; left: 30%; bottom: -11px; width: 18px; height: 16px; background: #f8f1e2;
          clip-path: polygon(0 0, 100% 0, 18% 100%);
          filter: drop-shadow(0 2px 1px rgba(10, 18, 30, 0.06));
        }
        .cc-bubble--thought { cursor: default; padding: 14px 40px 10px 18px; text-align: left; }
        .cc-bubble-text { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.32; }
        .cc-bubble-text em { font-style: italic; }
        .cc-bubble-text--thought { font-family: var(--font-fraunces), Georgia, serif; font-size: 16.5px; margin: 0; }
        .cc-lines { position: absolute; pointer-events: none; }
        .cc-lines span { position: absolute; left: 0; top: 0; width: 11px; height: 2px; border-radius: 2px; background: rgba(247, 241, 227, 0.9); transform-origin: 0 50%; }
        .cc-kicker { margin: 0 0 4px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 13px; color: rgba(43, 47, 69, 0.6); }
        .cc-text { margin: 0; font-family: var(--font-fraunces), Georgia, serif; font-size: 16.5px; line-height: 1.34; }
        .cc-text--hint { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; }
        .cc-actions { display: flex; gap: 16px; margin-top: 6px; }
        .cc-link {
          min-height: 40px; padding: 0; border: 0; background: transparent; cursor: pointer;
          font-family: var(--font-editorial), Georgia, serif; font-size: 15.5px; color: #3d74d8;
        }
        .cc-link:disabled { color: rgba(43, 47, 69, 0.55); cursor: default; }
        .cc-x {
          position: absolute; right: 2px; top: 2px; width: 40px; height: 40px; border: 0; background: transparent;
          font-size: 20px; color: rgba(43, 47, 69, 0.5); cursor: pointer;
        }
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
