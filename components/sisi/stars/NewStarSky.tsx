"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { createStar, saveStar } from "@/lib/myStars";
import { IconButton, IconClose, PrimaryButton, TextAction, useKeyboardInset } from "@/components/ds";
import { StarLayers } from "@/components/sisi/journey-v2/StarLayers";
import { bySentence } from "@/components/sisi/SisiSpeechBubble";
import { CURRENT_STAR_POS } from "@/components/sisi/journey-v2/StarWorld";
import { takeKeyboard } from "@/lib/keyboard";
import { haptic } from "@/lib/haptics";

/**
 * NewStarSky — writing a new wish, inside the black Star World.
 *
 *   write   a small, dim seed-star waits where the Current Star lives; a thin
 *           hand-drawn thread falls from it to an ivory paper rising from the
 *           bottom (≥ 45% of the night sky stays visible)
 *   birth   the paper folds away, the seed brightens and grows into a Star
 *           (soft bloom, one gentle pulse), its wish appears beside it, and a
 *           small ivory note hangs from it: "Your journey begins here."
 *   done    onBorn(star) — the page places it on the path (same spot, no
 *           jump) and opens its detail
 *
 * No confetti, points, badges or bounce.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const STAR_PX = 48; // StarLayers base size (as in StarWorld)

type Phase = "write" | "hold" | "birth";
/** the Star screen's composition (StarMemoryCard, journey mode): a Star of
 *  48px × 1.75, its wish starting 84px below its centre */
const FOCUS_STAR_SCALE = 1.75;
const FOCUS_WISH_BELOW = 84;
const HOLD_MS = 1500; // hold to light: long enough to feel, short enough to finish

export function NewStarSky({
  open,
  existing,
  onClose,
  onBorn,
  onDirty,
  onBirth,
  first = false,
  bornLine,
}: {
  /** a quiet line under the born wish (onboarding: "Your journey begins here.") */
  bornLine?: string;
  /** the very first Star (onboarding): no way out, and you hold to light it */
  first?: boolean;
  open: boolean;
  existing: Star[];
  onClose: () => void;
  onBorn: (star: Star) => void;
  onDirty?: (dirty: boolean) => void;
  /** the seed is becoming a Star (the other stars may return now) */
  onBirth?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("write");
  const [wish, setWish] = useState("");
  const [born, setBorn] = useState<Star | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  /** "Rephrase it for me" (only when asked): the words change in the field.
   *  rephrased.from is what was there before (Undo); same: they already said it */
  const [rephrased, setRephrased] = useState<{ from: string; to: string } | { same: string } | null>(null);
  const [phrasing, setPhrasing] = useState(false);
  const [flash, setFlash] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  /** where the paper's top edge is (it moves with the keyboard), in the root's space */
  const [paperTop, setPaperTop] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  /** where a Star rests on its own screen (the Star screen is the reference) */
  const [focusY, setFocusY] = useState<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPhase("write");
    setWish("");
    setBorn(null);
    setError("");
    setBusy(false);
    setRephrased(null);
    setPhrasing(false);
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, [open]);

  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  useEffect(() => {
    onDirtyRef.current?.(open && phase === "write" && wish.trim().length > 0);
  }, [open, phase, wish]);

  // while writing, the tabs step aside (as for every paper in the Stars)
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("ns-open", open && phase === "write");
    return () => el.classList.remove("ns-open");
  }, [open, phase]);
  // the paper always sits above the keyboard (or the bottom), on every phone
  useKeyboardInset(open && phase === "write");
  useEffect(() => {
    const el = paperRef.current;
    const root = rootRef.current;
    if (!open || phase !== "write" || !el || !root) return;
    const measure = () => setPaperTop(el.getBoundingClientRect().top - root.getBoundingClientRect().top);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(root);
    // the paper rises (0.6s) and slides with the keyboard (0.22s): read again once it settles
    el.addEventListener("transitionend", measure);
    const vv = window.visualViewport;
    let t2 = 0;
    const onViewport = () => {
      measure();
      clearTimeout(t2);
      t2 = window.setTimeout(measure, 260);
    };
    vv?.addEventListener("resize", onViewport);
    const t = window.setTimeout(measure, 750);
    return () => {
      ro.disconnect();
      el.removeEventListener("transitionend", measure);
      vv?.removeEventListener("resize", onViewport);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open, phase]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current;
      if (!r) return;
      setSize({ w: r.offsetWidth, h: r.offsetHeight });
      // read the shared position (globals: --focus-star-y) in this screen's units
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;left:0;width:0;height:0;top:var(--focus-star-y)";
      r.appendChild(probe);
      setFocusY(probe.offsetTop || null);
      probe.remove();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, phase]);

  const sx = size.w * CURRENT_STAR_POS.x;
  const sy = size.h * CURRENT_STAR_POS.y;


  // the keyboard was opened by the tap on New Star; the field takes it over
  // once, as it appears (never scrolling the world to it). A stable ref, so a
  // re-render never takes the keyboard back.
  const fieldRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el && inputRef.current !== el) takeKeyboard(el);
    inputRef.current = el;
  }, []);

  /** Sísí's wording for these words; "" if they already say it */
  const askPresent = async (w: string): Promise<string> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000); // never keep a wish waiting
    try {
      const r = await fetch("/api/present-tense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wish: w }),
        signal: ctrl.signal,
      });
      const { line } = (await r.json()) as { line: string | null };
      return line?.trim() ?? "";
    } catch {
      return "";
    } finally {
      clearTimeout(t);
    }
  };

  const create = async () => {
    const typed = wish.trim();
    if (!typed || busy) return;
    // the first Star is lit by you: the paper steps away, you hold the seed
    if (first && phase === "write") {
      inputRef.current?.blur();
      setPhase("hold");
      return;
    }
    setBusy(true);
    setError("");
    // what is in the field is what is kept — always
    const w = typed;
    try {
      const s = createStar(w, "someday", existing);
      await saveStar(s);
      setBorn(s);
      setPhase("birth");
      onBirth?.();
      const hold = reduced.current ? 1200 : 2400;
      setTimeout(() => onBorn(s), hold);
    } catch {
      setError("Your Star didn’t save just now. Try once more?");
      setBusy(false);
    }
  };

  /** only when asked: Sísí rephrases the words right in the field (Undo puts them back) */
  const rephrase = async () => {
    const typed = wish.trim();
    if (!typed || phrasing) return;
    setPhrasing(true);
    const line = await askPresent(typed);
    setPhrasing(false);
    if (!line) return setRephrased({ same: typed });
    setWish(line);
    setRephrased({ from: wish, to: line });
    setFlash((n) => n + 1); // the new words glow for a moment
  };
  const undo = () => {
    if (!rephrased || !("from" in rephrased)) return;
    setWish(rephrased.from);
    setRephrased(null);
  };

  // hold to light (first Star): the light gathers while you hold, eases back if you let go
  const [held, setHeld] = useState(0);
  const holdRaf = useRef(0);
  const holding = useRef(false);
  const heldRef = useRef(0);
  const holdStep = (last: number) => (now: number) => {
    const dt = now - last;
    const v = Math.max(0, Math.min(1, heldRef.current + (holding.current ? dt / HOLD_MS : -dt / 600)));
    heldRef.current = v;
    setHeld(v);
    if (v >= 1) {
      holding.current = false;
      haptic("wish");
      create();
      return;
    }
    if (v > 0 || holding.current) holdRaf.current = requestAnimationFrame(holdStep(now));
  };
  const holdStart = () => {
    if (phase !== "hold" || busy) return;
    holding.current = true;
    haptic("select");
    cancelAnimationFrame(holdRaf.current);
    holdRaf.current = requestAnimationFrame(holdStep(performance.now()));
  };
  const holdEnd = () => {
    holding.current = false;
  };
  useEffect(() => () => cancelAnimationFrame(holdRaf.current), []);

  // the seed listens: the longer the wish, the brighter and a little larger it grows
  const listen = Math.min(1, wish.trim().length / 36);
  const seedScale = phase === "birth" ? FOCUS_STAR_SCALE : phase === "hold" ? 1.5 + held * 0.5 : 1.1 + listen * 0.3;
  const seedGlow = `brightness(${(1 + listen * 0.25).toFixed(2)}) drop-shadow(0 0 ${Math.round(12 + listen * 14)}px rgba(241, 196, 94, ${(0.5 + listen * 0.3).toFixed(2)}))`;
  // while writing, the seed rests in the middle of the sky that is left above
  // the paper (whatever the phone or keyboard); once born it rises to its place
  const seedY = paperTop === null ? sy : Math.min(sy, Math.max(56, paperTop / 2 + 8));
  // holding: the seed waits a little lower, in reach of the thumb
  const holdY = size.h * 0.42;
  // where it is born: its place in the sky — or, the first Star (lit by your
  // hand), right where you held it, its words beneath it in the middle of the night
  // born: exactly where its Star screen will show it (same place, size and
  // words below) — so being born, and opening it later, look the same
  const bornY = focusY ?? sy;
  const starY = phase === "birth" ? bornY : phase === "hold" ? holdY : seedY;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-star"
          ref={rootRef}
          className="ns-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.35 }}
        >
          {/* the seed-star, in the Current Star's place on the path */}
          <motion.div
            className="ns-star"
            style={{ left: sx, top: starY }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: seedScale,
              opacity: phase === "birth" ? 1 : 0.85 + listen * 0.15,
              filter:
                phase === "birth"
                  ? ["brightness(1.2) drop-shadow(0 0 22px rgba(241, 196, 94, 0.75))", "brightness(1.6) drop-shadow(0 0 34px rgba(241, 196, 94, 0.9))", "brightness(1) drop-shadow(0 0 14px rgba(241, 196, 94, 0.55))"]
                  : seedGlow,
            }}
            transition={
              phase === "birth"
                ? {
                    scale: { duration: reduced.current ? 0.2 : 1.1, delay: reduced.current ? 0 : 0.25, ease: EASE },
                    opacity: { duration: 0.6, delay: 0.25 },
                    filter: { duration: 1.2, delay: 1.0, times: [0, 0.4, 1] },
                  }
                : { duration: 0.6, ease: EASE }
            }
            aria-hidden
          >
            {/* waiting: it breathes slowly; each word makes it twinkle once */}
            <span className={`ns-breathe${phase === "write" ? " is-on" : ""}`}>
              <StarLayers staged revealed focused={phase === "birth"} />
            </span>
            {phase === "write" && wish.length > 0 && <span key={wish.length} className="ns-twinkle" />}
          </motion.div>

          {/* hold to light: a ring of light gathers around the seed while you hold */}
          <AnimatePresence>
            {phase === "hold" && (
              <motion.div
                key="hold"
                className="ns-hold"
                style={{ left: sx, top: holdY }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.45, duration: 0.5 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <button
                  type="button"
                  className="ns-hold-btn"
                  aria-label="Hold to light your Star"
                  onPointerDown={holdStart}
                  onPointerUp={holdEnd}
                  onPointerLeave={holdEnd}
                  onPointerCancel={holdEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={(e) => (e.key === " " || e.key === "Enter") && holdStart()}
                  onKeyUp={holdEnd}
                >
                  <svg viewBox="0 0 120 120" aria-hidden>
                    <circle cx="60" cy="60" r="54" className="ns-hold-track" />
                    <circle cx="60" cy="60" r="54" className="ns-hold-fill" style={{ strokeDashoffset: 339.3 * (1 - held) }} />
                  </svg>
                </button>
                <p className="ns-hold-wish">{wish.trim()}</p>
                <p className="ns-hold-say">Hold to light your Star</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* born: a ring of light opens and small dabs scatter from the Star */}
          {phase === "birth" && !reduced.current && (
            <div className="ns-burst" style={{ left: sx, top: bornY }} aria-hidden>
              <span className="ns-ring" />
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="ns-spark" style={{ ["--a" as string]: `${i * 30 + (i % 2) * 11}deg`, ["--d" as string]: `${54 + (i % 3) * 22}px` }} />
              ))}
            </div>
          )}

          {/* while writing there is no light yet: only the quiet seed of a Star
              waits above (the light falls once it is born) */}

          {/* ── write ── */}
          <AnimatePresence>
            {phase === "write" && (
              <motion.div
                key="paper"
                ref={paperRef}
                className="ns-paper-wrap"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{ y: "30%", scaleY: 0.6, opacity: 0, transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] } }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                role="dialog"
                aria-label="New Star"
              >
                <div className="ns-paper ds-paper ds-deckle">
                  {!first && (
                    <IconButton className="ns-close" label="Not now" onClick={onClose}>
                      <IconClose />
                    </IconButton>
                  )}
                  <h2 className="ns-title">What are you wishing for?</h2>
                  <p className="ns-sub">A few words are enough.</p>
                  <textarea
                    key={`field-${flash}`}
                    className={`ds-field ns-input${flash ? " is-rephrased" : ""}`}
                    aria-label="Your wish"
                    rows={3}
                    maxLength={140}
                    ref={fieldRef}
                    value={wish}
                    placeholder="For example: A home by the sea."
                    onChange={(e) => {
                      setWish(e.target.value);
                      if (rephrased) setRephrased(null); // their own words again
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create();
                    }}
                  />
                  {/* Rephrase it for me: a quiet text button (Create my Star is the action).
                      The words change in the field; the same line then offers Undo. */}
                  <div className="ns-phrase-row" onMouseDown={(e) => e.preventDefault()}>
                    {rephrased && "from" in rephrased ? (
                      <>
                        <span className="ns-phrase-note">✦ Rephrased by Sísí</span>
                        <TextAction className="ns-phrase" onClick={undo}>
                          Undo
                        </TextAction>
                      </>
                    ) : rephrased ? (
                      <span className="ns-phrase-note">Your words already say it.</span>
                    ) : (
                      wish.trim() && (
                        <TextAction className="ns-phrase" disabled={phrasing} onClick={rephrase}>
                          {phrasing ? "Rephrasing…" : "✦ Rephrase it for me"}
                        </TextAction>
                      )
                    )}
                  </div>
                  {error && <p className="ds-error ns-error" role="alert">{error}</p>}
                  <PrimaryButton block loading={busy} disabled={!wish.trim()} onClick={create}>
                    Create my Star
                  </PrimaryButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── birth ── */}
          {phase === "birth" && born && (
            <>
              <motion.p
                className="ns-wish"
                style={{ left: sx, top: bornY + FOCUS_WISH_BELOW }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: reduced.current ? 0.1 : 0.95, ease: EASE }}
              >
                {born.wish}
                {/* under the wish however many lines it takes */}
                {bornLine && (
                  <motion.span
                    className="ns-born-line"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: reduced.current ? 0.3 : 1.6 }}
                  >
                    {bySentence(bornLine)}
                  </motion.span>
                )}
              </motion.p>
{/* (the light and "Your journey begins here." now belong to its Star screen) */}
            </>
          )}

          <style jsx global>{`
            .ns-root { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
            html.ns-open .ds-nav { opacity: 0 !important; pointer-events: none !important; transition: opacity 320ms var(--ease-sisi) !important; }
            .ns-root > * { pointer-events: none; }
            .ns-root .ns-paper-wrap { pointer-events: auto; }
            .ns-breathe { position: absolute; inset: 0; display: block; }
            .ns-breathe.is-on { animation: ns-breathe 3.6s ease-in-out infinite; }
            @keyframes ns-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
            .ns-twinkle {
              position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 246, 220, 0.85), rgba(241, 196, 94, 0.25) 45%, rgba(241, 196, 94, 0) 70%);
              animation: ns-twinkle 520ms ease-out forwards; pointer-events: none;
            }
            @keyframes ns-twinkle { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
            .ns-burst { position: absolute; width: 0; height: 0; pointer-events: none; }
            .ns-ring {
              position: absolute; left: -60px; top: -60px; width: 120px; height: 120px; border-radius: 50%;
              /* a soft wave of light, never a drawn line */
              background: radial-gradient(circle, rgba(255, 236, 190, 0) 38%, rgba(255, 236, 190, 0.45) 55%, rgba(241, 196, 94, 0.22) 64%, rgba(241, 196, 94, 0) 74%);
              filter: blur(1.5px);
              opacity: 0; animation: ns-ring 1.3s var(--ease-sisi) 0.35s forwards;
            }
            @keyframes ns-ring { 0% { opacity: 0; transform: scale(0.2); } 25% { opacity: 1; } 100% { opacity: 0; transform: scale(2.2); } }
            /* little painted dabs (from the Star's own light texture) */
            .ns-spark {
              position: absolute; left: -4px; top: -4px; width: 8px; height: 8px;
              border-radius: 46% 54% 42% 58% / 52% 44% 56% 48%;
              background: radial-gradient(circle at 40% 38%, #fffaf0, #f6d58c 55%, rgba(241, 160, 90, 0.9));
              box-shadow: 0 0 6px rgba(241, 196, 94, 0.8);
              opacity: 0; animation: ns-spark 1.4s cubic-bezier(0.2, 0.7, 0.3, 1) 0.4s forwards;
            }
            @keyframes ns-spark {
              0% { opacity: 0; transform: rotate(var(--a)) translateX(6px) scale(0.6); }
              20% { opacity: 1; }
              100% { opacity: 0; transform: rotate(var(--a)) translateX(var(--d)) translateY(14px) scale(0.3); }
            }
            @media (prefers-reduced-motion: reduce) { .ns-breathe.is-on, .ns-twinkle { animation: none; } }
            .ns-star {
              position: absolute; transition: top 0.9s var(--ease-sisi); width: ${STAR_PX}px; height: ${STAR_PX}px;
              margin: -${STAR_PX / 2}px 0 0 -${STAR_PX / 2}px; transform-origin: center;
            }
            /* every phone: the paper sits 12px above whichever is higher, the tabs
               or the keyboard; 16px (or the safe area) at the sides, at most 420px
               wide; and at least 112px of night always stays above it for the
               seed. If that leaves too little room, the paper scrolls inside. */
            .ns-root {
              /* the same floating card as every paper in the Stars: 16px above the
                 bottom (the tabs step aside), or 12px above the keyboard */
              /* the keyboard opens with the card (it's focused on the tap), so the
                 card rides 12px above it; without a keyboard it rests 16px above
                 the bottom, like every card in the Stars */
              --ns-bottom: max(calc(16px + var(--safe-bottom)), calc(var(--ds-kb, 0px) + 12px));
            }
            .ns-paper-wrap {
              position: absolute; left: 0; right: 0; margin: 0 auto;
              width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
              bottom: var(--ns-bottom);
              max-height: calc(100% - var(--ns-bottom) - var(--safe-top) - 112px);
            }
            /* keyboard up: a little less sky, a little less box — the button stays in view */
            html.kb-open .ns-paper-wrap { max-height: calc(100% - var(--ns-bottom) - var(--safe-top) - 64px); }
            .ns-paper-wrap {
              display: flex; flex-direction: column;
              transition: bottom 220ms var(--ease-sisi);
            }
            .ns-paper {
              position: relative; flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain;
              padding: var(--space-6) var(--space-5) var(--space-5);
              --paper-grain-layer: var(--grain-focus);
              filter: drop-shadow(0 10px 26px rgba(16, 45, 50, 0.42)); scrollbar-width: none;
            }
            .ns-paper::-webkit-scrollbar { display: none; }
            .ns-close { position: absolute; right: 6px; top: 6px; }
            .ns-title {
              margin: 0 40px 6px 0; font-family: var(--font-editorial); font-weight: 300;
              font-size: var(--text-paper-title); line-height: 1.2; letter-spacing: -0.01em; color: var(--sisi-ink); white-space: nowrap;
            }
            .ns-sub { margin: 0 0 16px; font-family: var(--font-editorial); font-style: italic; font-size: 15px; line-height: 1.4; color: var(--ink-60); }
            /* their wish, in their own words: written larger than the guide */
            .ns-input { margin-bottom: 16px; font-family: var(--font-editorial); font-size: 18px; line-height: 1.4; }
            .ns-input::placeholder { font-size: 16px; color: var(--ink-35); }
            .ns-input { min-height: 72px; resize: none; } /* the same with or without the keyboard */
            /* short phones (SE, mini): tighter, so the button stays in view above the keyboard */
            @media (max-height: 700px) {
              .ns-paper { padding: var(--space-5) var(--space-4) var(--space-4); }
              .ns-sub { margin-bottom: 14px; }
              .ns-input { min-height: 72px; margin-bottom: 12px; }
            }
            .ns-error { margin: -8px 0 12px; }
            .ns-born-line .sisi-line { display: block; } /* a sentence to a line */
            .ns-born-line {
              display: block; margin-top: 14px; font-family: var(--font-editorial); font-weight: 400; font-size: var(--text-speech); /* Sísí's voice */
              line-height: var(--leading-dialogue); letter-spacing: var(--tracking-editorial); color: var(--paper-80);
            }
            /* hold to light */
            .ns-hold { position: absolute; width: 0; height: 0; pointer-events: auto; }
            .ns-hold-btn {
              position: absolute; left: -76px; top: -76px; width: 152px; height: 152px; border: 0; padding: 0; border-radius: 50%;
              background: none; cursor: pointer; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
              -webkit-tap-highlight-color: transparent;
            }
            .ns-hold-btn svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
            .ns-hold-track { fill: none; stroke: rgba(245, 239, 230, 0.16); stroke-width: 2; }
            .ns-hold-fill { fill: none; stroke: var(--sisi-gold, #f1c45e); stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 339.3; filter: drop-shadow(0 0 6px rgba(241, 196, 94, 0.7)); }
            .ns-hold-wish, .ns-hold-say { position: absolute; left: 0; width: min(calc(100vw - 48px), 340px); translate: -50% 0; margin: 0; text-align: center; }
            .ns-hold-wish { top: 100px; font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-wish); line-height: 1.2; color: var(--sisi-paper); text-wrap: balance; }
            .ns-hold-say { top: 172px; font-family: var(--font-editorial); font-style: italic; font-size: 15px; color: var(--paper-60); animation: nsHoldSay 2.6s ease-in-out infinite; }
            @keyframes nsHoldSay { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
            /* Rephrase it for me: small, under the field; never the main action */
            .ns-phrase-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 36px; margin: -10px 0 10px; }
            .ns-phrase { margin-left: -6px; min-height: 36px; font-size: 15px !important; }
            .ns-phrase-row .ns-phrase:last-child:not(:first-child) { margin: 0 -6px 0 0; }
            .ns-phrase-note { font-family: var(--font-ui); font-size: var(--text-meta); letter-spacing: 0.02em; color: var(--ink-60); }
            /* the new words glow for a moment, like a correction */
            .ns-input.is-rephrased { animation: nsRephrased 1.6s var(--ease-sisi); }
            @keyframes nsRephrased { 0% { background-color: rgba(233, 196, 106, 0.38); } 100% { background-color: transparent; } }
            /* the wish appears under its Star exactly as its Star screen will show it */
            .ns-wish {
              position: absolute; margin: 0; width: min(calc(100vw - 32px), 380px); translate: -50% 0; text-wrap: balance;
              text-align: center; font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-wish);
              line-height: 1.18; letter-spacing: -0.01em; color: var(--sisi-paper); overflow-wrap: anywhere;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
