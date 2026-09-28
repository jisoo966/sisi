"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment, type MomentType } from "@/lib/momentStore";
import { tornEdge } from "@/lib/tornEdge";

const PAPER_EDGE = tornEdge(51, 30, 0.9);

/**
 * CompanionSheet — the small conversation with Sísí.
 *
 * Opens when the user taps the cat. Slides up over the walking world;
 * the world remains subtly visible behind (soft backdrop dim, not black).
 * Sísí greets first, the user responds.
 *
 * Uses the existing /api/chat streaming endpoint. Session persistence
 * (chatSessions) can be layered in a later phase; for now the sheet is
 * ephemeral — each open starts a fresh short conversation.
 *
 * Cat pauses (via the parent) while the sheet is open, matching the
 * "we stopped and talked" feeling.
 */

/**
 * offer    Sísí marked the user's words as worth keeping ([SAVE:…]) — offer
 *          Save as a Moment · Add to a Star · Keep talking. Never automatic.
 * choices  once per talk, a gentle direction: See my journey · Find a small
 *          step · Just keep talking (ignoring it is fine too).
 */
type Msg = { id: string; from: "sisi" | "user"; text: string; offer?: string; choices?: boolean };
/** An explicit keep, previewed and editable before anything is saved. */
type Keep = { mode: "moment" | "star"; text: string; starId: string | null; type: MomentType };

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Fired once per open when the talk becomes meaningful (the user has
   * shared at least two real messages). Used to grant one Little Light —
   * never per message.
   */
  onMeaningful?: () => void;
  /** The Current Star — SiSi remembers it in the conversation. */
  star?: Star | null;
  /** "See my journey" — rise to this Star's journey */
  onSeeJourney?: (star: Star) => void;
  /** Sísí's first line (e.g. the thought the user wanted to talk about) */
  opening?: string | null;
};

const OPENING = "What's on your mind?";

export function CompanionSheet({ open, onClose, onMeaningful, star = null, onSeeJourney, opening = null }: Props) {
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [keep, setKeep] = useState<Keep | null>(null);
  const [keepBusy, setKeepBusy] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [manualOffer, setManualOffer] = useState<string | null>(null);
  const choicesShown = useRef(false);
  useEffect(() => {
    if (!open) return;
    setSavedNote(null);
    setKeep(null);
    setDismissed(new Set());
    setManualOffer(null);
    choicesShown.current = false;
    loadStars().then((s) => setStars(walkingStars(s)));
  }, [open]);

  const startKeep = (mode: Keep["mode"], text: string) =>
    setKeep({ mode, text, starId: mode === "star" ? star?.id ?? stars[0]?.id ?? null : null, type: "something_good" });
  const confirmKeep = async () => {
    if (!keep || keepBusy || !keep.text.trim()) return;
    if (keep.mode === "star" && !keep.starId) return;
    setKeepBusy(true);
    try {
      // only the chosen words — never the conversation
      await createMoment({
        source: "sisi_conversation",
        type: keep.mode === "star" ? keep.type : "general",
        text: keep.text,
        starId: keep.mode === "star" ? keep.starId : null,
      });
      const wish = stars.find((s) => s.id === keep.starId)?.wish;
      setSavedNote(keep.mode === "star" ? `Added to “${wish ?? "your Star"}”. It’s in Moments too.` : "Kept in your Moments.");
      setKeep(null);
      setManualOffer(null);
    } finally {
      setKeepBusy(false);
    }
  };
  const sharedChars = useRef(0);
  const sharedCount = useRef(0);
  const meaningfulSent = useRef(false);
  useEffect(() => {
    if (open) {
      sharedChars.current = 0;
      sharedCount.current = 0;
      meaningfulSent.current = false;
    }
  }, [open]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed with Sísí's opening when the sheet first opens (once per open).
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "greet", from: "sisi", text: opening ?? OPENING }]);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
    if (!open) {
      // Reset when closed so next open starts fresh
      setTimeout(() => {
        setMessages([]);
        setDraft("");
      }, 400);
    }
  }, [open, messages.length]);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(preset?: string) {
    const text = (preset ?? draft).trim();
    if (!text || sending) return;
    setSavedNote(null);
    const userMsg: Msg = { id: `u-${Date.now()}`, from: "user", text };
    setMessages((m) => [...m, userMsg]);
    sharedCount.current += 1;
    sharedChars.current += text.length;
    if (!meaningfulSent.current && sharedCount.current >= 2 && sharedChars.current >= 40) {
      meaningfulSent.current = true;
      onMeaningful?.();
    }
    setDraft("");
    setSending(true);
    // Placeholder Sísí bubble while streaming
    const sisiId = `s-${Date.now()}`;
    setMessages((m) => [...m, { id: sisiId, from: "sisi", text: "" }]);

    try {
      const history = [...messages, userMsg]
        .filter((x) => x.id !== "greet" || x.text !== OPENING)
        .map((x) => ({ role: x.from === "user" ? "user" : "assistant", content: x.text }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, currentStar: star?.wish ?? null }),
      });
      if (!resp.ok || !resp.body) throw new Error("chat failed");

      // The route streams Server-Sent Events: `data: {"text": "..."}` lines.
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            acc += JSON.parse(payload).text ?? "";
          } catch {
            // ignore partial lines
          }
        }
        const shown = acc.replace(/\[SAVE:[a-z]+\]/g, "").trim();
        setMessages((m) => m.map((x) => (x.id === sisiId ? { ...x, text: shown } : x)));
      }
      // Sísí thought these words were worth keeping → offer (never save).
      const worth = /\[SAVE:[a-z]+\]/.test(acc);
      const giveChoices = !!star && sharedCount.current >= 2 && !choicesShown.current && !worth;
      if (giveChoices) choicesShown.current = true;
      if (worth || giveChoices) {
        setMessages((m) =>
          m.map((x) => (x.id === sisiId ? { ...x, offer: worth ? text : undefined, choices: giveChoices } : x)),
        );
      }
    } catch {
      setMessages((m) =>
        m.map((x) =>
          x.id === sisiId
            ? { ...x, text: "let's try that again in a moment." }
            : x,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — soft dim, world still visible */}
          <motion.button
            type="button"
            aria-label="Close conversation"
            onClick={onClose}
            className="companion-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Sheet — slides up */}
          <motion.aside
            role="dialog"
            aria-label="Talk with SiSi"
            className="companion-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* SiSi stops and rests against the top edge of the paper. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sisi-rest" src="/V2/fox-walk/fox-walk-preview.png" alt="" aria-hidden />
            <div className="paper paper-bg" aria-hidden />
            {/* Drag handle */}
            <div className="handle" />

            {/* Header — close */}
            <div className="header">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="close-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="scroll" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={m.id} className={`turn turn-${m.from}`}>
                  <p className={`line line-${m.from}`}>
                    {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                  </p>
                  {m.offer && !dismissed.has(m.id) && !keep && (
                    <div className="offer" role="group" aria-label="Keep this?">
                      <button type="button" className="keep-btn" onClick={() => startKeep("moment", m.offer!)}>Save as a Moment</button>
                      <span className="keep-dot" aria-hidden>·</span>
                      <button type="button" className="keep-btn" onClick={() => startKeep("star", m.offer!)}>Add to a Star</button>
                      <span className="keep-dot" aria-hidden>·</span>
                      <button type="button" className="keep-btn keep-btn--quiet" onClick={() => setDismissed((d) => new Set(d).add(m.id))}>Keep talking</button>
                    </div>
                  )}
                  {m.choices && !dismissed.has(`c-${m.id}`) && star && (
                    <div className="offer" role="group" aria-label="Where would you like to go?">
                      <button type="button" className="chip" onClick={() => onSeeJourney?.(star)}>See my journey</button>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => {
                          setDismissed((d) => new Set(d).add(`c-${m.id}`));
                          send("Could you help me find one very small next step?");
                        }}
                      >
                        Find a small step
                      </button>
                      <button type="button" className="chip chip--quiet" onClick={() => setDismissed((d) => new Set(d).add(`c-${m.id}`))}>
                        Just keep talking
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Keep something — only when the user asks, with an editable
                preview; only the chosen words are saved. */}
            {keep ? (
              <div className="keep-panel">
                <p className="keep-h">{keep.mode === "star" ? "Add to a Star" : "Save as a Moment"}</p>
                <textarea
                  className="keep-text"
                  rows={2}
                  maxLength={240}
                  value={keep.text}
                  aria-label="What to keep"
                  onChange={(e) => setKeep({ ...keep, text: e.target.value })}
                />
                {keep.mode === "star" && (
                  <>
                    <div className="keep-stars">
                      {stars.map((s2) => (
                        <button
                          key={s2.id}
                          type="button"
                          className={`chip${keep.starId === s2.id ? " is-on" : ""}`}
                          onClick={() => setKeep({ ...keep, starId: s2.id })}
                        >
                          {s2.wish}
                        </button>
                      ))}
                    </div>
                    <div className="keep-types">
                      {([
                        ["something_good", "Something good"],
                        ["small_step", "A small step"],
                      ] as const).map(([t, label]) => (
                        <button
                          key={t}
                          type="button"
                          className={`chip${keep.type === t ? " is-on" : ""}`}
                          onClick={() => setKeep({ ...keep, type: t })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="keep-actions">
                  <button type="button" className="keep-btn keep-btn--quiet" onClick={() => setKeep(null)}>Keep talking</button>
                  <button
                    type="button"
                    className="keep-save"
                    disabled={keepBusy || !keep.text.trim() || (keep.mode === "star" && !keep.starId)}
                    onClick={confirmKeep}
                  >
                    {keep.mode === "star" ? "Add to this Star" : "Save as a Moment"}
                  </button>
                </div>
              </div>
            ) : manualOffer ? (
              <div className="keep-row">
                <button type="button" className="keep-btn" onClick={() => startKeep("moment", manualOffer)}>Save as a Moment</button>
                <span className="keep-dot" aria-hidden>·</span>
                <button type="button" className="keep-btn" onClick={() => startKeep("star", manualOffer)}>Add to a Star</button>
                <span className="keep-dot" aria-hidden>·</span>
                <button type="button" className="keep-btn keep-btn--quiet" onClick={() => setManualOffer(null)}>Keep talking</button>
              </div>
            ) : savedNote ? (
              <div className="keep-row"><span className="keep-done">{savedNote}</span></div>
            ) : lastUserText(messages) && !sending ? (
              <div className="keep-row">
                <button type="button" className="keep-btn keep-btn--quiet" onClick={() => setManualOffer(lastUserText(messages))}>
                  Keep something from this talk
                </button>
              </div>
            ) : null}

            {/* Input pill */}
            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tell SiSi…"
                disabled={sending}
                className="input"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Send"
                className="send-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </motion.aside>

          <style jsx>{`
            :global(.companion-backdrop) {
              position: fixed;
              inset: 0;
              background: rgba(28, 35, 64, 0.14);
              z-index: 30;
              border: 0;
              padding: 0;
            }
            :global(.companion-sheet) {
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              height: 56dvh;
              max-height: 600px;
              background: transparent;
              filter: drop-shadow(0 -8px 22px rgba(0, 0, 0, 0.22));
              z-index: 31;
              display: flex;
              flex-direction: column;
            }
            /* Warm-ivory torn paper behind the conversation. */
            .paper {
              position: absolute;
              inset: 0;
              z-index: 1;
              clip-path: ${PAPER_EDGE};
            }
            /* SiSi rests against the paper's top edge (lower half tucked
               behind the paper). */
            .sisi-rest {
              position: absolute;
              top: -64px;
              left: 22px;
              width: 104px;
              height: auto;
              z-index: 0;
              pointer-events: none;
              user-select: none;
            }
            .handle, .header, .scroll, .keep-row, .keep-panel, .input-row { position: relative; z-index: 2; }
            .line {
              margin: 0;
              max-width: 88%;
              line-height: 1.45;
            }
            .line-sisi {
              align-self: flex-start;
              font-family: var(--font-fraunces), Georgia, serif;
              font-size: 17px;
              color: #2b2f45;
            }
            .line-user {
              align-self: flex-end;
              text-align: right;
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-style: italic;
              font-size: 16px;
              color: rgba(43, 47, 69, 0.7);
            }
            .keep-row {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 8px;
              padding: 0 var(--stage-padding) 6px;
            }
            .keep-btn {
              border: 0;
              background: transparent;
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-size: 14px;
              color: #3d74d8;
              cursor: pointer;
              padding: 4px 2px;
            }
            .keep-dot { color: rgba(43, 47, 69, 0.35); }
            .keep-btn--quiet { color: rgba(43, 47, 69, 0.55); }
            .turn { display: flex; flex-direction: column; gap: 6px; }
            .turn-user { align-items: flex-end; }
            .offer { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
            .chip {
              min-height: 36px; padding: 0 12px; border-radius: 999px; cursor: pointer;
              border: 1px solid rgba(61, 116, 216, 0.35); background: rgba(255, 255, 255, 0.5);
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14.5px; color: #2b4f9e;
              max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .chip.is-on { background: #3d74d8; border-color: #3d74d8; color: #f7f2e3; }
            .chip--quiet { border-color: rgba(43, 47, 69, 0.15); color: rgba(43, 47, 69, 0.6); }
            .keep-panel { position: relative; z-index: 2; margin: 0 var(--stage-padding) 8px; padding: 12px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(43, 47, 69, 0.1); }
            .keep-h { margin: 0 0 6px; font-family: var(--font-fraunces), Georgia, serif; font-size: 16px; color: #2b2f45; }
            .keep-text { width: 100%; resize: none; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(43, 47, 69, 0.15); background: #fffdf8; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; color: #2b2f45; outline: none; }
            .keep-stars, .keep-types { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
            .keep-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
            .keep-save { min-height: 40px; padding: 0 16px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; cursor: pointer; }
            .keep-save:disabled { opacity: 0.45; }
            .keep-done {
              font-family: var(--font-eb-garamond), Georgia, serif;
              font-style: italic;
              font-size: 14px;
              color: rgba(43, 47, 69, 0.6);
            }

              .handle {
                margin: 8px auto 6px;
                width: 42px;
                height: 4px;
                border-radius: 9999px;
                background: rgba(31, 42, 68, 0.2);
              }
              .header {
                display: flex;
                justify-content: flex-end;
                padding: 0 var(--stage-padding) 4px;
              }
              .close-btn {
                width: 32px;
                height: 32px;
                border-radius: 9999px;
                border: 0;
                background: transparent;
                color: rgba(31, 42, 68, 0.55);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              }
              .close-btn svg { width: 16px; height: 16px; }

              .scroll {
                flex: 1;
                overflow-y: auto;
                padding: 8px var(--stage-padding) 12px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                min-height: 0;
              }
              .row-sisi { align-self: flex-start; }
              .row-user { align-self: flex-end; }

              .input-row {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px var(--stage-padding) calc(var(--safe-bottom) + 14px);
                background: transparent;
                border-top: 1px solid rgba(31, 42, 68, 0.08);
              }
              .input {
                flex: 1;
                height: 44px;
                border-radius: 9999px;
                border: 1px solid rgba(31, 42, 68, 0.12);
                background: white;
                padding: 0 18px;
                font-family: var(--font-sentient), Georgia, serif;
                font-size: 15px;
                color: var(--journey-navy);
                outline: none;
              }
              .input:focus {
                border-color: rgba(31, 42, 68, 0.3);
              }
              .send-btn {
                width: 44px;
                height: 44px;
                border-radius: 9999px;
                border: 0;
                background: var(--journey-purple);
                color: var(--journey-navy);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: filter 0.2s ease;
              }
              .send-btn:hover:enabled { filter: brightness(1.06); }
              .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
              .send-btn svg { width: 16px; height: 16px; }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

function lastUserText(messages: { from: string; text: string }[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].from === "user" && messages[i].text.trim()) return messages[i].text.trim();
  }
  return null;
}
