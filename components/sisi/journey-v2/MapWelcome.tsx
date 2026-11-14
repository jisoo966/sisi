"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PrimaryButton, StarGlyph, TextAction } from "@/components/ds";
import { useStarlightBalance } from "@/lib/useStarlight";

/**
 * The Map, the first time — once, right after the onboarding lands on the
 * Journey (flag: localStorage "sisi:map-welcome" = "pending").
 *
 *   folded  "Time together gathers Starlight…" · a folded map floats · tap to unfold
 *   open    the forest unfolds · Starlight top right · a butterfly as a welcome gift
 *
 * One message, one action. "Maybe later" ends it too; it never comes back.
 */
export const MAP_WELCOME_KEY = "sisi:map-welcome";

export function mapWelcomePending(): boolean {
  try {
    return localStorage.getItem(MAP_WELCOME_KEY) === "pending";
  } catch {
    return false;
  }
}

const ART = "/V2/onboarding/";

export function MapWelcome({ open, onDone }: { open: boolean; onDone: (brought: boolean) => void }) {
  const [step, setStep] = useState<"folded" | "open">("folded");
  const [busy, setBusy] = useState(false);
  const balance = useStarlightBalance();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const finish = (brought: boolean) => {
    try {
      localStorage.setItem(MAP_WELCOME_KEY, "done");
    } catch {}
    onDone(brought);
  };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="map-welcome"
          className="mw"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <AnimatePresence mode="wait">
            {step === "folded" ? (
              <motion.div key="folded" className="mw-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="ds-note mw-bubble t-dialogue">
                  Time together gathers Starlight.
                  <br />
                  Little by little, this place becomes yours.
                </div>
                <motion.button
                  type="button"
                  className="mw-folded"
                  aria-label="Unfold the map"
                  onClick={() => setStep("open")}
                  initial={{ y: 40, opacity: 0, rotate: -6 }}
                  animate={{ y: [0, -8, 0], opacity: 1, rotate: -4 }}
                  transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.6 }, rotate: { duration: 0.6 } }}
                >
                  <img src={`${ART}map-folded.webp`} alt="" draggable={false} />
                  <span className="t-affirmation mw-hint">Tap to unfold</span>
                </motion.button>
                <div className="mw-foot">
                  <TextAction surface="dark" onClick={() => finish(false)}>
                    Maybe later
                  </TextAction>
                </div>
              </motion.div>
            ) : (
              <motion.div key="open" className="mw-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* what there is to spend (only once there is some) */}
                {balance > 0 && (
                  <span className="mw-balance" aria-label={`${balance} Starlight`}>
                    <StarGlyph size={16} />
                    <b>{balance}</b>
                  </span>
                )}
                <div className="ds-note mw-bubble t-dialogue">
                  This place can grow with you.
                  <br />
                  Here’s something to begin with.
                </div>
                <motion.img
                  src={`${ART}map-open.webp`}
                  alt="A forest path, a place on the Map"
                  className="mw-open"
                  initial={{ scaleX: 0.25, scaleY: 0.7, opacity: 0, rotate: -4 }}
                  animate={{ scaleX: 1, scaleY: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  draggable={false}
                />
                <motion.div
                  className="mw-gift"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <motion.img
                    src="/V2/themes/butterfly-forest/butterfly-ivory-01.webp"
                    alt=""
                    className="mw-butterfly"
                    animate={{ y: [0, -6, 0], rotate: [-8, -2, -8] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="ds-note mw-tag t-meta">A welcome gift</span>
                </motion.div>
                <div className="mw-foot">
                  <PrimaryButton
                    block
                    loading={busy}
                    onClick={() => {
                      setBusy(true);
                      finish(true);
                    }}
                  >
                    Bring my butterfly
                  </PrimaryButton>
                  <TextAction surface="dark" onClick={() => finish(false)}>
                    Maybe later
                  </TextAction>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <style jsx global>{`
            .mw {
              position: fixed;
              inset: 0;
              z-index: var(--z-modal, 900);
              background: linear-gradient(to bottom, rgba(16, 45, 50, 0.18), rgba(16, 45, 50, 0.32));
            }
            .mw-layer {
              position: absolute;
              inset: 0;
            }
            .mw-bubble {
              position: absolute;
              left: 40px;
              right: 40px;
              top: calc(env(safe-area-inset-top, 0px) + 92px);
              padding: 16px 20px;
              text-align: center;
              color: var(--sisi-ink);
            }
            .mw-folded {
              position: absolute;
              left: 50%;
              top: 34%;
              width: 210px;
              margin-left: -105px;
              padding: 0;
              border: 0;
              background: none;
              cursor: pointer;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }
            .mw-folded img {
              width: 100%;
              display: block;
              filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));
            }
            .mw-hint {
              color: var(--sisi-paper);
            }
            .mw-balance {
              position: absolute;
              top: calc(env(safe-area-inset-top, 0px) + 40px);
              right: 20px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              height: 34px;
              padding: 0 14px 0 11px;
              border-radius: 999px;
              background: var(--paper-90);
              color: var(--sisi-ink);
              box-shadow: var(--paper-shadow-soft);
            }
            .mw-balance b {
              font-family: var(--font-ui);
              font-size: 15px;
              font-weight: 600;
              font-variant-numeric: tabular-nums;
            }
            .mw-open {
              position: absolute;
              left: 2%;
              width: 96%;
              top: calc(env(safe-area-inset-top, 0px) + 220px);
              filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.35));
            }
            .mw-gift {
              position: absolute;
              left: 0;
              right: 0;
              top: calc(env(safe-area-inset-top, 0px) + 220px + 48vw + 24px);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            .mw-butterfly {
              width: 60px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
            }
            .mw-tag {
              padding: 6px 12px;
              color: var(--sisi-ink);
            }
            .mw-foot {
              position: absolute;
              left: 24px;
              right: 24px;
              bottom: calc(env(safe-area-inset-bottom, 0px) + 40px);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
            }
            @media (min-width: 500px) {
              .mw-gift {
                top: calc(220px + 206px + 24px);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("sisi-overlay-root") ?? document.body,
  );
}
