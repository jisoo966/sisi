"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
import { earnLight, recommendedPractice, type PracticeKind } from "@/lib/littleLights";
import { tornEdge } from "@/lib/tornEdge";

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
  talk: { title: "Today, talk it through.", sub: "Tell SiSi one small thing about it.", label: "Talk with SiSi" },
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

const EASE = [0.22, 1, 0.36, 1] as const;
const EDGE = tornEdge(3);

export function DailyPractice({ open, star, placeholder, onClose, onTalk, onLight, onCreateStar }: Props) {
  const today = recommendedPractice();
  const [step, setStep] = useState<Step>("suggest");
  const [kind, setKind] = useState<Kind>(today);
  const [text, setText] = useState("");
  const [granted, setGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setStep(placeholder || !star ? "no-star" : "suggest");
    setKind(today);
    setText("");
    setGranted(false);
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
    if (note) {
      try {
        await addSign(star.id, note);
      } catch {
        // keep going — the Light is about the practice, not the save
      }
    }
    const ok = await earnLight(kind, star.id);
    setGranted(ok);
    if (ok) onLight?.(kind);
    setSaving(false);
    setStep("reward");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            key="dp-backdrop"
            aria-label="Close"
            className="dp-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="dp-sheet"
            className="dp-sheet"
            role="dialog"
            aria-label="Spend time with your Star"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "115%", transition: { duration: 0.4, ease: [0.55, 0, 0.75, 0.2] } }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="dp-shadow" aria-hidden />
            <motion.div layout className="dp-paper paper-bg" transition={{ layout: { duration: 0.45, ease: EASE } }}>
              <span className="dp-handle" aria-hidden />
              <AnimatePresence mode="wait" initial={false}>
                {step === "no-star" && (
                  <Pane key="nostar">
                    <p className="dp-title">First, name your Star.</p>
                    <p className="dp-sub">What would you like to move toward?</p>
                    <button
                      type="button"
                      className="dp-primary"
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
                    <p className="dp-title">{COPY[today].title}</p>
                    <p className="dp-sub">{COPY[today].sub}</p>
                    <button type="button" className="dp-primary" onClick={() => begin(today)}>
                      Begin
                    </button>
                    <button type="button" className="dp-link" onClick={() => setStep("choose")}>
                      Choose something else
                    </button>
                  </Pane>
                )}

                {step === "choose" && (
                  <Pane key="choose">
                    <p className="dp-title">Spend a little time with your Star.</p>
                    <div className="dp-choices">
                      {(["see", "write", "walk", "talk"] as Kind[]).map((k) => (
                        <button key={k} type="button" className="dp-choice" onClick={() => begin(k)}>
                          {COPY[k].label}
                        </button>
                      ))}
                    </div>
                  </Pane>
                )}

                {step === "practice" && kind === "write" && (
                  <Pane key="write">
                    <p className="dp-title">What feels a little closer?</p>
                    <textarea
                      className="dp-input"
                      rows={3}
                      maxLength={240}
                      placeholder="I’m starting to believe this could be mine."
                      value={text}
                      autoFocus
                      onChange={(e) => setText(e.target.value)}
                    />
                    <button type="button" className="dp-primary" disabled={!text.trim() || saving} onClick={finish}>
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
                  <Pane key="reward" delay={granted ? 1.15 : 0}>
                    {granted ? (
                      <>
                        <p className="dp-title dp-center">A Little Light found you.</p>
                        <p className="dp-plus">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/assets/sisi-star-mark-painted-512.png" alt="" /> +1
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="dp-title dp-center">Kept with your Star.</p>
                        <p className="dp-sub dp-center">You’ve already found today’s light for this.</p>
                      </>
                    )}
                    <button type="button" className="dp-primary" onClick={onClose}>
                      Continue
                    </button>
                  </Pane>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {step === "reward" && granted && <DescendingLight key="dp-light" />}

          <style jsx global>{`
            .dp-backdrop {
              position: absolute;
              inset: 0;
              z-index: 24;
              border: 0;
              padding: 0;
              background: rgba(12, 20, 38, 0.12);
              pointer-events: auto;
            }
            .dp-sheet {
              position: absolute;
              left: max(14px, var(--safe-left));
              right: max(14px, var(--safe-right));
              bottom: calc(var(--safe-bottom) + 14px);
              z-index: 25;
              pointer-events: auto;
            }
            .dp-shadow {
              position: absolute;
              inset: 14px 6px -6px 6px;
              background: rgba(0, 0, 0, 0.4);
              border-radius: 12px;
              filter: blur(14px);
              pointer-events: none;
            }
            .dp-paper {
              position: relative;
              padding: 26px 24px 22px;
              clip-path: ${EDGE};
              color: #2b2f45;
              text-align: center;
            }
            .dp-handle {
              position: absolute;
              top: 10px;
              left: 50%;
              width: 34px;
              height: 3px;
              margin-left: -17px;
              border-radius: 3px;
              background: rgba(43, 47, 69, 0.18);
            }
            .dp-title {
              font-family: var(--font-fraunces), Georgia, serif;
              font-weight: 400;
              font-size: clamp(19px, 5.4vw, 22px);
              line-height: 1.3;
              margin: 6px 0 8px;
            }
            .dp-sub {
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 16px;
              color: rgba(43, 47, 69, 0.72);
              margin: 0 0 18px;
            }
            .dp-center { text-align: center; }
            .dp-primary {
              display: block;
              width: 100%;
              height: 48px;
              margin-top: 6px;
              border: 0;
              border-radius: 999px;
              background: #3d74d8;
              color: #f7f2e3;
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 17px;
              cursor: pointer;
              box-shadow: 0 2px 0 rgba(22, 40, 90, 0.18);
            }
            .dp-primary:disabled { opacity: 0.45; cursor: default; }
            .dp-link {
              display: inline-block;
              margin-top: 12px;
              border: 0;
              background: transparent;
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 15px;
              color: #3d74d8;
              text-decoration: underline;
              text-underline-offset: 3px;
              cursor: pointer;
            }
            .dp-choices {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 12px;
            }
            .dp-choice {
              height: 52px;
              border-radius: 14px;
              border: 1px solid rgba(43, 47, 69, 0.14);
              background: rgba(255, 255, 255, 0.5);
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 16px;
              color: #2b2f45;
              cursor: pointer;
            }
            .dp-input {
              width: 100%;
              resize: none;
              margin: 6px 0 12px;
              padding: 12px 14px;
              border-radius: 10px;
              border: 1px solid rgba(43, 47, 69, 0.16);
              background: rgba(255, 255, 255, 0.55);
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 17px;
              line-height: 1.4;
              color: #2b2f45;
              outline: none;
              text-align: left;
            }
            .dp-input::placeholder { font-style: italic; color: rgba(43, 47, 69, 0.4); }
            .dp-plus {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-family: var(--font-fraunces), Georgia, serif;
              font-size: 26px;
              margin: 2px 0 16px;
            }
            .dp-plus img { width: 30px; height: 30px; }
            .dp-breath {
              width: 88px;
              height: 88px;
              margin: 6px auto 14px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(246, 216, 155, 0.55), rgba(246, 216, 155, 0) 70%);
              display: flex;
              align-items: center;
              justify-content: center;
              animation: dpBreath 8s ease-in-out infinite;
            }
            .dp-breath img { width: 40px; height: 40px; }
            @keyframes dpBreath {
              0%, 100% { transform: scale(0.86); }
              50% { transform: scale(1.08); }
            }
            @media (prefers-reduced-motion: reduce) {
              .dp-breath { animation: none; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
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
      <p className="dp-title">See it already here.</p>
      <p className="dp-sub">{wish ? `“${wish}”` : "Your Star"} — breathe slowly and picture the day it’s real.</p>
      <div className="dp-breath" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/sisi-star-mark-painted-512.png" alt="" />
      </div>
      <button type="button" className="dp-primary" disabled={left > 45} onClick={onDone}>
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
      <p className="dp-title">Take a short walk with your Star.</p>
      <p className="dp-sub">No need to think hard. Just let it walk beside you. Come back when you’re ready.</p>
      <button type="button" className="dp-primary" onClick={() => setBack(true)}>
        I’m back
      </button>
    </>
  ) : (
    <>
      <p className="dp-title">What did you notice?</p>
      <textarea
        className="dp-input"
        rows={2}
        maxLength={240}
        placeholder="optional"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" className="dp-primary" disabled={saving} onClick={onDone}>
        Finish
      </button>
    </>
  );
}

/**
 * A small irregular eight-point Light descending from the Current Star
 * (day-sky position) onto the paper.
 */
function DescendingLight() {
  const ref = useRef<HTMLImageElement>(null);
  const [path, setPath] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  useLayoutEffect(() => {
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    const sheet = document.querySelector<HTMLElement>(".dp-sheet");
    if (!stage || !sheet) return;
    const W = stage.offsetWidth;
    const H = stage.offsetHeight;
    setPath({ x0: W * 0.78, y0: H * 0.15, x1: W * 0.5, y1: sheet.offsetTop + 34 });
  }, []);
  if (!path) return null;
  const midX = (path.x0 + path.x1) / 2 + 30;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <motion.img
      ref={ref}
      src="/assets/sisi-star-mark-painted-512.png"
      alt=""
      aria-hidden
      className="dp-falling-light"
      initial={{ x: path.x0 - 13, y: path.y0 - 13, scale: 0.5, opacity: 0 }}
      animate={{
        x: [path.x0 - 13, midX - 13, path.x1 - 13],
        y: [path.y0 - 13, (path.y0 + path.y1) / 2 - 13, path.y1 - 13],
        scale: [0.5, 1, 0.8],
        opacity: [0, 1, 0],
      }}
      transition={{ duration: 1.2, ease: [0.45, 0, 0.35, 1], times: [0, 0.55, 1] }}
      style={{ position: "absolute", left: 0, top: 0, width: 26, height: 26, zIndex: 26, pointerEvents: "none" }}
    />
  );
}
