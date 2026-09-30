"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
import { recommendedPractice, type PracticeKind } from "@/lib/littleLights";
import { awardStarlight, localDate, starlightMessage } from "@/lib/starlight";
import { createPortal } from "react-dom";
import { FocusPaper } from "@/components/ds";

/**
 * DailyPractice — "Spend time with your Star".
 *
 * One torn-paper panel rises over the Journey (the world pauses, SiSi stops):
 *
 *   suggest   ONE gentle action for today (e.g. "Today, write one sentence.
 *             What feels a little closer?") → Begin · Choose something else
 *   choose    only after "Choose something else": See it · Write it ·
 *             Walk with it · Talk with SiSi
 *   practice  the short activity itself
 *   reward    a Little Light descends from the Current Star onto the paper:
 *             "A Little Light found you. +1" → Continue
 *
 * Writing is saved to the Current Star's timeline (as a sign). Moment
 * capture is never required to receive a Light.
 */

type Kind = "write" | "see" | "walk" | "talk";
type Step = "suggest" | "choose" | "practice" | "reward" | "no-star";

const COPY: Record<Kind, { title: string; sub: string; label: string }> = {
  write: { title: "Today, write one sentence.", sub: "What feels a little closer?", label: "Write it" },
  see: { title: "Today, see it clearly.", sub: "One quiet minute with the picture of it.", label: "See it" },
  walk: { title: "Today, walk with it.", sub: "A short walk, holding it lightly in mind.", label: "Walk with it" },
  talk: { title: "Today, talk it through.", sub: "Tell Sísí one small thing about it.", label: "Talk with Sísí" },
};

type Props = {
  open: boolean;
  star: Star | null;
  /** No wish yet — the panel invites creating one. */
  placeholder: boolean;
  onClose: () => void;
  /** "Talk with SiSi" — hand over to the conversation panel. */
  onTalk: () => void;
  /** A Light was granted (for any listeners, e.g. analytics). */
  onLight?: (kind: PracticeKind) => void;
  /** No Star yet → open the Create Star flow. */
  onCreateStar?: () => void;
};



export function DailyPractice({ open, star, placeholder, onClose, onTalk, onLight, onCreateStar }: Props) {
  const today = recommendedPractice();
  const [step, setStep] = useState<Step>("suggest");
  const [kind, setKind] = useState<Kind>(today);
  const [text, setText] = useState("");
  const [granted, setGranted] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setStep(placeholder || !star ? "no-star" : "suggest");
    setKind(today);
    setText("");
    setGranted(null);
    setSaving(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (k: Kind) => {
    if (k === "talk") {
      onClose();
      onTalk();
      return;
    }
    setKind(k);
    setText("");
    setStep("practice");
  };

  const finish = async () => {
    if (!star || saving) return;
    setSaving(true);
    const note = text.trim();
    let signId: string | null = null;
    if (note) {
      try {
        signId = (await addSign(star.id, note)).id;
      } catch {
        // not saved: no Starlight for the writing (nothing to connect)
      }
    }
    // Starlight only for completed, saved activities (lib/starlight)
    const r =
      kind === "see"
        ? await awardStarlight({ source: "picture_it_completed", sourceId: `${star.id}:${localDate()}`, starId: star.id })
        : kind === "walk"
          ? await awardStarlight({ source: "walk_with_it_completed", sourceId: `${star.id}:${localDate()}`, starId: star.id })
          : signId
            ? await awardStarlight({ source: "something_good_saved", sourceId: signId, starId: star.id })
            : null;
    setGranted(r ? starlightMessage(r) : null);
    if (r && r.awarded > 0) onLight?.(kind);
    setSaving(false);
    setStep("reward");
  };

  return (
    <FocusPaper open={open} onClose={onClose} title="Spend time with your Star" titleId="dp-title" className="dp-focus">
      <div className="dp-body">
              <AnimatePresence mode="wait" initial={false}>
                {step === "no-star" && (
                  <Pane key="nostar">
                    <p className="t-card-title dp-title">First, name your Star.</p>
                    <p className="t-body dp-sub">What would you like to move toward?</p>
                    <button
                      type="button"
                      className="ds-btn ds-btn--primary ds-btn--block"
                      onClick={() => {
                        onClose();
                        if (onCreateStar) onCreateStar();
                        else window.location.href = "/my-stars";
                      }}
                    >
                      Create my Star
                    </button>
                  </Pane>
                )}

                {step === "suggest" && (
                  <Pane key="suggest">
                    <p className="t-card-title dp-title">{COPY[today].title}</p>
                    <p className="t-body dp-sub">{COPY[today].sub}</p>
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" onClick={() => begin(today)}>
                      Begin
                    </button>
                    <button type="button" className="ds-text-action" onClick={() => setStep("choose")}>
                      Choose something else
                    </button>
                  </Pane>
                )}

                {step === "choose" && (
                  <Pane key="choose">
                    <p className="t-card-title dp-title">Spend a little time with your Star.</p>
                    <div className="dp-choices">
                      {(["see", "write", "walk", "talk"] as Kind[]).map((k) => (
                        <button key={k} type="button" className="ds-btn ds-btn--secondary" onClick={() => begin(k)}>
                          {COPY[k].label}
                        </button>
                      ))}
                    </div>
                  </Pane>
                )}

                {step === "practice" && kind === "write" && (
                  <Pane key="write">
                    <p className="t-card-title dp-title">What feels a little closer?</p>
                    <textarea
                      className="ds-field dp-input"
                      rows={3}
                      maxLength={240}
                      placeholder="I’m starting to believe this could be mine."
                      value={text}
                      autoFocus
                      onChange={(e) => setText(e.target.value)}
                    />
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={!text.trim() || saving} onClick={finish}>
                      Finish
                    </button>
                  </Pane>
                )}

                {step === "practice" && kind === "see" && (
                  <Pane key="see">
                    <SeeIt wish={star?.wish ?? ""} onDone={finish} />
                  </Pane>
                )}

                {step === "practice" && kind === "walk" && (
                  <Pane key="walk">
                    <WalkWithIt text={text} setText={setText} onDone={finish} saving={saving} />
                  </Pane>
                )}

                {step === "reward" && (
                  <Pane key="reward" delay={0.2}>
                    <p className="t-card-title dp-title">Kept with your Star.</p>
                    {granted && <p className="t-body dp-sub">{granted}</p>}
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" onClick={onClose}>
                      Continue
                    </button>
                  </Pane>
                )}
              </AnimatePresence>
      </div>

      <style jsx global>{`
        .dp-body { text-align: center; padding-bottom: 4px; }
        .dp-title { margin: 4px 0 8px; }
        .dp-sub { margin: 0 0 20px; color: var(--ink-80); }
        .dp-body .ds-text-action { margin-top: 8px; }
        .dp-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
        .dp-choices .ds-btn { padding: 0 12px; }
        .dp-input { margin: 4px 0 16px; text-align: left; }
        .dp-plus {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-screen-title); margin: 2px 0 20px;
        }
        .dp-plus img { width: 30px; height: 30px; }
        .dp-breath {
          width: 88px; height: 88px; margin: 6px auto 16px; border-radius: 50%;
          background: radial-gradient(circle, rgba(241, 196, 94, 0.35), rgba(241, 196, 94, 0) 70%);
          display: flex; align-items: center; justify-content: center;
          animation: dpBreath 8s ease-in-out infinite;
        }
        .dp-breath img { width: 40px; height: 40px; }
        @keyframes dpBreath { 0%, 100% { transform: scale(0.86); } 50% { transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) { .dp-breath { animation: none; } }
      `}</style>
    </FocusPaper>
  );
}

function Pane({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      {children}
    </motion.div>
  );
}

/** See it — one quiet minute of picturing it, breathing with the star. */
function SeeIt({ wish, onDone }: { wish: string; onDone: () => void }) {
  const [left, setLeft] = useState(60);
  useEffect(() => {
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <p className="t-card-title dp-title">See it already here.</p>
      <p className="t-body dp-sub">{wish ? `“${wish}”` : "Your Star"} — breathe slowly and picture the day it’s real.</p>
      <div className="dp-breath" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/sisi-star-mark-painted-512.png" alt="" />
      </div>
      <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={left > 45} onClick={onDone}>
        {left > 0 ? `Finish · ${left}s` : "Finish"}
      </button>
    </>
  );
}

/** Walk with it — go, come back, optionally note what you noticed. */
function WalkWithIt({
  text,
  setText,
  onDone,
  saving,
}: {
  text: string;
  setText: (v: string) => void;
  onDone: () => void;
  saving: boolean;
}) {
  const [back, setBack] = useState(false);
  return !back ? (
    <>
      <p className="t-card-title dp-title">Take a short walk with your Star.</p>
      <p className="t-body dp-sub">No need to think hard. Just let it walk beside you. Come back when you’re ready.</p>
      <button type="button" className="ds-btn ds-btn--primary ds-btn--block" onClick={() => setBack(true)}>
        I’m back
      </button>
    </>
  ) : (
    <>
      <p className="t-card-title dp-title">What did you notice?</p>
      <textarea
        className="ds-field dp-input"
        rows={2}
        maxLength={240}
        placeholder="optional"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={saving} onClick={onDone}>
        Finish
      </button>
    </>
  );
}

