"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PrimaryButton, StatusChip } from "@/components/ds";
import { hasGift, unlockGift } from "@/lib/gifts";
import { Nanum_Pen_Script } from "next/font/google";

// the letter is written by hand (Korean and Latin)
const hand = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });

/**
 * A thank-you gift, for one person (lib/server/gifts decides who).
 *
 * Once, on the Journey:
 *   box      a wrapped blue box with a red bow sways · "Tap to open"
 *   opening  the lid lifts off, a little light, Fern rises out of the box
 *   letter   the box gives way to a sealed envelope and Fern hops onto it;
 *            the flap opens, and the handwritten letter (lined paper, a
 *            stamp) slides out, lifting Fern on its top edge ·
 *            "You unlocked a new character" · "Open the Map"
 * "Open the Map" unlocks Fern and opens the Map on "Who walks with you".
 */
export type Gift = { gift: "fern"; body: string[]; from: string };

/** Asks the server once whether there is a gift for this account. */
export function usePendingGift(enabled: boolean): Gift | null {
  const [gift, setGift] = useState<Gift | null>(null);
  useEffect(() => {
    // development only: /journey?gift=preview shows the gift (to look at it)
    const preview = process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("gift") === "preview";
    if (!enabled || (hasGift("fern") && !preview)) return;
    let alive = true;
    fetch(preview ? "/api/gift?preview=1" : "/api/gift")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.ok || (!preview && hasGift(d.note.gift))) return;
        // load the art before it is shown, so nothing pops in mid-animation
        for (const src of PRELOAD) {
          const img = new Image();
          img.src = src;
        }
        setGift(d.note);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);
  return gift;
}

const ART = "/V2/gift/";
const FERN = "/V2/poodle-walk/fern-sit.webp";
const EASE = [0.22, 1, 0.36, 1] as const;
const PRELOAD = [
  FERN,
  ...["gift-inside", "gift-lid", "gift-front", "envelope-back", "envelope-flap-open", "envelope-front", "envelope-flap-closed"].map(
    (n) => `${ART}${n}.webp`,
  ),
  "/V2/onboarding/star.webp",
];
/** in the box, Fern's lower half is hidden behind the box's front (px) */
const IN_BOX = 56;
/** the envelope's body: 352 × 200 (a real envelope's shape) */
const ENV_RATIO = 200 / 352;
/** once out, how much of the envelope's height the letter's foot stays tucked into —
 *  past the bottom of the pocket's V, so no empty inside shows below the paper */
const TUCK = 0.62;

export function GiftNote({ gift, open, onOpenMap }: { gift: Gift | null; open: boolean; onOpenMap: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"box" | "opening" | "note">("box");
  // the envelope: arrives sealed → the flap opens → the letter comes out
  const [env, setEnv] = useState<"sealed" | "open" | "out">("sealed");
  const wrapRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLElement>(null);
  // how far down the letter sits while inside (its top at the envelope's mouth)
  const [lift, setLift] = useState(200);
  // and how much deeper the letter waits inside, below the pocket's V (unseen)
  const [inset, setInset] = useState(100);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (step !== "opening") return;
    const t = setTimeout(() => setStep("note"), 1300);
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (step !== "note") return;
    const a = setTimeout(() => setEnv("open"), 1100);
    const b = setTimeout(() => setEnv("out"), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [step]);
  // the letter is laid out from the start (hidden), so this is known before it shows
  useLayoutEffect(() => {
    const measure = () => {
      if (!wrapRef.current || !letterRef.current) return;
      // inside: the letter's top sits at the envelope's mouth
      const bodyH = (wrapRef.current.offsetWidth + 12) * ENV_RATIO;
      setLift(Math.round(letterRef.current.offsetHeight - bodyH * TUCK));
      setInset(Math.round(bodyH * 0.55));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, gift, mounted]);
  if (!mounted || !gift) return null;
  const opened = step !== "box";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="gift" className="gn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <div className="gn-col">
            {/* the line above: what this is */}
            <div className="gn-top">
              <AnimatePresence mode="wait">
                {step === "note" ? (
                  <motion.div key="unlocked" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <StatusChip surface="dark" tone="star">
                      You unlocked a new character
                    </StatusChip>
                  </motion.div>
                ) : (
                  <motion.p key="for" className="t-affirmation gn-for" exit={{ opacity: 0 }}>
                    A gift for you
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Fern's place: she rises out of the box and stays, sitting on what is below */}
            <div className={`gn-stage${step === "note" ? " is-on-note" : ""}`}>
              {opened && (
                <motion.div
                  className="gn-glow"
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0.55], scale: [0.4, 1.15, 1] }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              )}
              <motion.div
                className="gn-ride"
                initial={false}
                animate={{ y: step !== "note" ? IN_BOX : env !== "out" ? lift : [lift, lift, 0] }}
                transition={env === "out" ? { duration: 1.2, times: [0, 0.3, 1], ease: ["linear", EASE] } : { duration: 0.7, ease: EASE }}
              >
              <motion.img
                src={FERN}
                alt={opened ? "Fern, a little poodle" : ""}
                className="gn-fern"
                draggable={false}
                initial={false}
                animate={
                  step === "note"
                    ? { y: ["0%", "-12%", "0%"], opacity: 1, scaleY: 1 }
                    : opened
                      ? { y: ["70%", "-20%", "0%"], opacity: [0, 1, 1], scaleY: [0.92, 1.04, 1] }
                      : { y: "70%", opacity: 0, scaleY: 0.92 }
                }
                transition={
                  step === "note"
                    ? { duration: 0.7, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }
                    : { delay: opened ? 0.25 : 0, duration: 0.8, times: [0, 0.6, 1], ease: ["easeOut", "easeInOut"] }
                }
              />
              </motion.div>
            </div>

            {/* below Fern: the box, then the note */}
            <div className="gn-below">
              {/* the box and the letter share one place, both laid out from the start: nothing jumps */}
              <motion.button
                    key="box"
                    type="button"
                    className="gn-box"
                    aria-label="Open the gift"
                    disabled={opened}
                    initial={false}
                    animate={step === "note" ? { y: 30, opacity: 0 } : { y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeIn" }}
                    style={{ pointerEvents: step === "note" ? "none" : undefined }}
                    onClick={() => setStep("opening")}
                  >
                    {/* the open inside sits behind Fern; the front faces (gn-body) in front of her */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ART}gift-inside.webp`} alt="" className="gn-inside" draggable={false} />
                    {/* the lid (with its bow): sways, then lifts off */}
                    <motion.img
                      src={`${ART}gift-lid.webp`}
                      alt=""
                      className="gn-lid"
                      draggable={false}
                      animate={opened ? { y: -160, x: 70, rotate: 24, opacity: 0 } : { rotate: [0, -3, 3, -2, 0], y: [0, -4, 0, -2, 0] }}
                      transition={
                        opened
                          ? { duration: 0.7, ease: EASE }
                          : { duration: 1.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }
                      }
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ART}gift-front.webp`} alt="" className="gn-body" draggable={false} />
                  </motion.button>
              <motion.div
                    ref={wrapRef}
                    className="gn-letter-wrap"
                    aria-hidden={step !== "note"}
                    initial={false}
                    animate={step === "note" ? { y: 0, opacity: 1 } : { y: 70, opacity: 0 }}
                    transition={{ duration: 0.7, ease: EASE, delay: step === "note" ? 0.3 : 0 }}
                  >
                    {/* the envelope, layered around the letter:
                        back 0 · open flap 0 · letter 1 · front pocket 2 · closed flap 3 */}
                    <div className="gn-env" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="gn-env-back" src={`${ART}envelope-back.webp`} alt="" draggable={false} />
                      <motion.img
                        className="gn-env-flap-open"
                        src={`${ART}envelope-flap-open.webp`}
                        alt=""
                        draggable={false}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: env === "sealed" ? 0 : 1 }}
                        transition={{ delay: env === "open" ? 0.22 : 0, duration: 0.25, ease: "easeOut" }}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="gn-env-front" src={`${ART}envelope-front.webp`} alt="" draggable={false} />
                      <motion.img
                        className="gn-env-flap-closed"
                        src={`${ART}envelope-flap-closed.webp`}
                        alt=""
                        draggable={false}
                        initial={{ scaleY: 1 }}
                        animate={{ scaleY: env === "sealed" ? 1 : 0 }}
                        transition={{ duration: 0.22, ease: "easeIn" }}
                      />
                    </div>
                    {/* the letter: inside the envelope (hidden below its mouth), then out */}
                    <div className="gn-letter-clip">
                      <motion.article
                        ref={letterRef}
                        className={`ds-deckle gn-letter ${hand.className}`}
                        initial={false}
                        animate={{ y: env === "out" ? [lift + inset, lift, 0] : lift + inset }}
                        transition={env === "out" ? { duration: 1.2, times: [0, 0.3, 1], ease: ["easeIn", EASE] } : { duration: 0 }}
                      >
                        <span className="gn-stamp" aria-hidden>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/V2/onboarding/star.webp" alt="" />
                        </span>
                        <div className="gn-ruled">
                          <p className="gn-to">To. 원님</p>
                          {gift.body.map((p, i) => (
                            <p key={i} className="gn-line">
                              {p}
                            </p>
                          ))}
                          <p className="gn-from">From. {gift.from}</p>
                        </div>
                      </motion.article>
                    </div>
                  </motion.div>
            </div>
          </div>

          <div className="gn-foot">
            <AnimatePresence mode="wait">
              {step === "note" ? (
                <motion.div key="go" className="gn-foot-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <PrimaryButton
                    surface="dark"
                    block
                    onClick={() => {
                      unlockGift(gift.gift);
                      onOpenMap();
                    }}
                  >
                    Open the Map
                  </PrimaryButton>
                </motion.div>
              ) : step === "box" ? (
                <motion.p key="tap" className="t-affirmation gn-hint" exit={{ opacity: 0 }}>
                  Tap to open
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <style jsx global>{`
            .gn {
              position: fixed;
              inset: 0;
              z-index: var(--z-modal, 900);
              background: linear-gradient(to bottom, rgba(16, 45, 50, 0.4), rgba(16, 45, 50, 0.6));
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: calc(var(--safe-top, 0px) + 32px) 24px calc(var(--safe-bottom, 0px) + 120px);
            }
            .gn-col { display: flex; flex-direction: column; align-items: center; }
            .gn-top { height: 40px; display: flex; align-items: center; margin-bottom: 8px; }
            .gn-for, .gn-hint { margin: 0; color: var(--sisi-paper); }
            /* Fern's place: her paws are on its bottom line */
            .gn-stage { position: relative; z-index: 1; pointer-events: none; width: 100%; height: 190px; display: flex; justify-content: center; }
            .gn-fern { position: absolute; bottom: -6px; height: 196px; width: auto; z-index: 1; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.2)); will-change: transform, opacity; transform-origin: 50% 100%; }
            .gn-stage.is-on-note { z-index: 3; }
            .gn-glow {
              position: absolute;
              bottom: -40px;
              width: 260px;
              height: 260px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 236, 170, 0.75), rgba(255, 220, 140, 0.25) 45%, transparent 70%);
              z-index: 0;
              will-change: transform, opacity;
            }
            /* no stacking context here: the box's layers sit around Fern (inside 0 · Fern 1 · front 2 · lid 3) */
            .gn-below { position: relative; width: 100%; display: grid; justify-items: center; align-items: start; }
            .gn-below > * { grid-area: 1 / 1; }
            .gn-box {
              position: relative;
              width: 190px;
              padding: 0;
              border: 0;
              background: none;
              cursor: pointer;
              /* the box's open top sits at Fern's paws: she rises out of it */
              margin-top: -136px;
              -webkit-tap-highlight-color: transparent;
            }
            .gn-box:disabled { cursor: default; }
            /* lid and body are cut from one painting: same canvas, stacked */
            .gn-lid { position: absolute; inset: 0; width: 100%; z-index: 3; }
            .gn-body { display: block; width: 190px; position: relative; z-index: 2; }
            .gn-inside { position: absolute; inset: 0; width: 100%; z-index: 0; }
            /* the letter: lined paper, deckled, half out of a rose envelope */
            .gn-letter-wrap { position: relative; width: 100%; max-width: 340px; pointer-events: none; will-change: transform, opacity; }
            /* the envelope: one box the size of its body, flaps hinged on its top edge */
            .gn-env { position: absolute; left: -6px; right: -6px; bottom: 0; aspect-ratio: 352 / 200; pointer-events: none; }
            .gn-env img { position: absolute; left: 0; width: 100%; height: auto; }
            .gn-env-back { top: 0; z-index: 0; filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.35)); }
            .gn-env-flap-open { bottom: calc(100% - 4px); z-index: 0; transform-origin: 50% 100%; }
            .gn-env-front { bottom: 0; z-index: 2; }
            .gn-env-flap-closed { top: 0; z-index: 3; transform-origin: 50% 0; }
            /* the letter shows only above the envelope's bottom edge */
            .gn-letter-clip { position: relative; z-index: 1; overflow: hidden; margin: -420px -14px 0; margin-bottom: 16px;
              /* the letter's foot stays tucked inside the envelope (padding % is of the wrap's width) */
              padding: 420px 14px calc((100% + 12px) * ${ENV_RATIO * (1 - TUCK)} - 16px); pointer-events: none; }
            /* (the clip ends at the envelope's painted bottom edge, not its image edge) */
            .gn-ride { position: absolute; inset: 0; display: flex; justify-content: center; will-change: transform; }
            .gn-letter {
              position: relative;
              z-index: 1;
              /* well inside the envelope's painted edges */
              margin: 0 28px;
              /* the paper runs on below the writing, down into the envelope (the tucked part) */
              padding: 20px 18px calc((100% + 12px) * ${ENV_RATIO * TUCK} + 12px);
              --paper-grain-layer: var(--grain-memory);
              color: var(--sisi-ink);
              line-height: 34px;
              font-size: 22px;
              word-break: keep-all; /* Korean wraps between words */
            }
            .gn-letter p { margin: 0; }
            /* writing lines under each line of the letter */
            .gn-ruled { background: repeating-linear-gradient(to bottom, transparent 0 33px, rgba(16, 45, 50, 0.12) 33px 34px); }
            .gn-to { font-size: 24px; margin-bottom: 10px !important; padding-right: 44px; }
            .gn-line { padding-left: 2px; }
            .gn-from { text-align: right; margin-top: 8px !important; }
            .gn-stamp {
              position: absolute;
              top: 12px;
              right: 12px;
              width: 36px;
              height: 42px;
              display: grid;
              place-items: center;
              background: #2f4c7a;
              /* a perforated stamp edge */
              outline: 3px dotted var(--sisi-paper);
              outline-offset: -2px;
              box-shadow: 0 0 0 2px var(--sisi-paper), 0 1px 3px rgba(0, 0, 0, 0.2);
              transform: rotate(4deg);
            }
            .gn-stamp img { width: 26px; }
            .gn-foot { position: absolute; left: 24px; right: 24px; bottom: calc(var(--safe-bottom, 0px) + 40px); display: flex; justify-content: center; }
            .gn-foot-in { width: 100%; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("sisi-overlay-root") ?? document.body,
  );
}
