"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatBubble } from "@/components/sisi/ChatBubble";

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
};

const OPENING = "What's on your mind?";

function fmtTime(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${m} ${ampm}`;
}

export function CompanionSheet({ open, onClose }: Props) {
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
        body: JSON.stringify({ messages: history }),
      });
      if (!resp.ok || !resp.body) throw new Error("chat failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((x) => (x.id === sisiId ? { ...x, text: acc } : x)),
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
            aria-label="Talk with Sísí"
            className="companion-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
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
                <div key={m.id} className={`row row-${m.from}`}>
                  <ChatBubble
                    from={m.from}
                    text={m.text || (sending && i === messages.length - 1 ? "…" : "")}
                    time={i === messages.length - 1 ? fmtTime() : undefined}
                  />
                </div>
              ))}
            </div>

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
                placeholder="Share anything..."
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
              background: rgba(28, 35, 64, 0.28);
              backdrop-filter: blur(1px);
              -webkit-backdrop-filter: blur(1px);
              z-index: 30;
              border: 0;
              padding: 0;
            }
            :global(.companion-sheet) {
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              height: 58dvh;
              max-height: 620px;
              border-top-left-radius: 24px;
              border-top-right-radius: 24px;
              background: #f7f2e3;
              box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.18);
              z-index: 31;
              display: flex;
              flex-direction: column;
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
                background: rgba(247, 242, 227, 0.95);
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
