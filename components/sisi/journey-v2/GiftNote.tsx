"use client";

import { useEffect, useState } from "react";
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
 *   box      a wrapped box (dusty rose, gold ribbon) sways · "Tap to open"
 *   opening  the lid lifts off, a little light, Fern rises out of the box
 *   letter   the box gives way to an envelope; a handwritten letter slides
 *            out of it (lined paper, a stamp) and Fern hops onto its top
 *            edge · "You unlocked a new character" · "Open the Map"
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
      .then((d) => alive && d?.ok && (preview || !hasGift(d.note.gift)) && setGift(d.note))
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

export function GiftNote({ gift, open, onOpenMap }: { gift: Gift | null; open: boolean; onOpenMap: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"box" | "opening" | "note">("box");
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (step !== "opening") return;
    const t = setTimeout(() => setStep("note"), 1500);
    return () => clearTimeout(t);
  }, [step]);
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
              <motion.img
                src={FERN}
                alt={opened ? "Fern, a little poodle" : ""}
                className="gn-fern"
                draggable={false}
                initial={false}
                animate={
                  step === "note"
                    ? { y: ["0%", "-14%", "0%"], opacity: 1 }
                    : opened
                      ? { y: "0%", opacity: 1 }
                      : { y: "100%", opacity: 0 }
                }
                transition={
                  step === "note"
                    ? { duration: 0.8, times: [0, 0.45, 1], ease: "easeInOut" }
                    : { delay: opened ? 0.35 : 0, duration: 0.7, ease: EASE }
                }
              />
            </div>

            {/* below Fern: the box, then the note */}
            <div className="gn-below">
              <AnimatePresence mode="popLayout" initial={false}>
                {step !== "note" ? (
                  <motion.button
                    key="box"
                    type="button"
                    className="gn-box"
                    aria-label="Open the gift"
                    disabled={opened}
                    onClick={() => setStep("opening")}
                    exit={{ y: 40, opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }}
                  >
                    {/* the lid (with its bow): sways, then lifts off */}
                    <motion.img
                      src={`${ART}box-lid.webp`}
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
                    <img src={`${ART}box-body.webp`} alt="" className="gn-body" draggable={false} />
                  </motion.button>
                ) : (
                  <motion.div
                    key="note"
                    className="gn-letter-wrap"
                    initial={{ y: 70, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    {/* the envelope's back, then the letter, then its front pocket */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="gn-env-back" src={`${ART}envelope-back.webp`} alt="" aria-hidden draggable={false} />
                    <motion.article
                      className={`ds-deckle gn-letter ${hand.className}`}
                      initial={{ y: 120 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.35, duration: 0.75, ease: EASE }}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="gn-env-front" src={`${ART}envelope-front.webp`} alt="" aria-hidden draggable={false} />
                  </motion.div>
                )}
              </AnimatePresence>
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
            .gn-fern { position: absolute; bottom: -6px; height: 196px; width: auto; z-index: 1; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.2)); }
            .gn-stage.is-on-note { z-index: 3; }
            .gn-glow {
              position: absolute;
              bottom: -40px;
              width: 260px;
              height: 260px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 236, 170, 0.75), rgba(255, 220, 140, 0.25) 45%, transparent 70%);
              z-index: 0;
            }
            .gn-below { position: relative; width: 100%; display: flex; justify-content: center; z-index: 2; }
            .gn-box {
              position: relative;
              width: 220px;
              padding: 0;
              border: 0;
              background: none;
              cursor: pointer;
              margin-top: -44px; /* the lid's bow rises into Fern's place */
              -webkit-tap-highlight-color: transparent;
            }
            .gn-box:disabled { cursor: default; }
            .gn-lid { position: absolute; left: -12px; top: 0; width: 244px; z-index: 2; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25)); }
            .gn-body { display: block; width: 220px; margin-top: 76px; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.3)); }
            /* the letter: lined paper, deckled, half out of a rose envelope */
            .gn-letter-wrap { position: relative; width: 100%; max-width: 340px; padding-bottom: 62px; }
            /* the envelope: painted paper with a crayon outline (back + open flap, front pocket with a gold seal) */
            .gn-env-back, .gn-env-front {
              position: absolute;
              left: -6px;
              width: calc(100% + 12px);
              height: auto;
              bottom: 0;
              pointer-events: none;
            }
            .gn-env-back { filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.35)); }
            .gn-env-front { z-index: 2; }
            .gn-letter {
              position: relative;
              z-index: 1;
              margin: 0 10px;
              padding: 22px 22px 40px;
              --paper-grain-layer: var(--grain-memory);
              color: var(--sisi-ink);
              line-height: 34px;
              font-size: 25px;
            }
            .gn-letter p { margin: 0; }
            /* writing lines under each line of the letter */
            .gn-ruled { background: repeating-linear-gradient(to bottom, transparent 0 33px, rgba(16, 45, 50, 0.12) 33px 34px); }
            .gn-to { font-size: 26px; margin-bottom: 4px !important; }
            .gn-line { padding-left: 2px; }
            .gn-from { text-align: right; margin-top: 8px !important; }
            .gn-stamp {
              position: absolute;
              top: 14px;
              right: 14px;
              width: 46px;
              height: 54px;
              display: grid;
              place-items: center;
              background: #2f4c7a;
              /* a perforated stamp edge */
              outline: 3px dotted var(--sisi-paper);
              outline-offset: -2px;
              box-shadow: 0 0 0 2px var(--sisi-paper), 0 1px 3px rgba(0, 0, 0, 0.2);
              transform: rotate(4deg);
            }
            .gn-stamp img { width: 34px; }
            .gn-foot { position: absolute; left: 24px; right: 24px; bottom: calc(var(--safe-bottom, 0px) + 40px); display: flex; justify-content: center; }
            .gn-foot-in { width: 100%; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("sisi-overlay-root") ?? document.body,
  );
}
