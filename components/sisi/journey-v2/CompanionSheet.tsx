"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
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

type Msg = { id: string; from: "sisi" | "user"; text: string };

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
};

const OPENING = "What's on your mind?";

export function CompanionSheet({ open, onClose, onMeaningful, star = null }: Props) {
  const [savedAs, setSavedAs] = useState<null | "star" | "moment">(null);
  useEffect(() => {
    if (open) setSavedAs(null);
  }, [open]);
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
      setMessages([{ id: "greet", from: "sisi", text: OPENING }]);
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

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
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
        .filter((x) => x.id !== "greet")
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
                <p key={m.id} className={`line line-${m.from}`}>
                  {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                </p>
              ))}
            </div>

            {/* Keep what mattered: to the Star's timeline, or as a Moment. */}
            {star && lastUserText(messages) && (
              <div className="keep-row">
                {savedAs ? (
                  <span className="keep-done">
                    {savedAs === "star" ? "Added to this Star." : "Saved as a Moment."}
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="keep-btn"
                      onClick={async () => {
                        await addSign(star.id, lastUserText(messages)!);
                        setSavedAs("star");
                      }}
                    >
                      Add to this Star
                    </button>
                    <span className="keep-dot" aria-hidden>·</span>
                    <button
                      type="button"
                      className="keep-btn"
                      onClick={async () => {
                        await addSign(star.id, lastUserText(messages)!, "chat");
                        setSavedAs("moment");
                      }}
                    >
                      Save as a Moment
                    </button>
                  </>
                )}
              </div>
            )}

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
            .handle, .header, .scroll, .keep-row, .input-row { position: relative; z-index: 2; }
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
