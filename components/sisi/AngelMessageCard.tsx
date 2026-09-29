"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { markAsRead, type AngelMessage } from "@/lib/angelMessages";
import { IconButton, IconClose, ModalPortal } from "@/components/ds";

/**
 * AngelMessageCard — Journey 홈 위에 등장하는 편지 카드 + full letter view.
 *
 * Figma 참고:
 *   - Envelope illustration + purple "1" badge
 *   - "A message arrived. open"
 *   - X to dismiss (marks as read)
 *
 * Flow:
 *   1. Journey 홈 로드 시 이 컴포넌트 렌더
 *   2. 안 읽은 message 있으면 카드 fade-in
 *   3. 유저가 "open" 탭 → 전체 화면 letter view
 *   4. X 또는 close → mark read → 카드 사라짐
 */
export function AngelMessageCard({
  message,
  onRead,
}: {
  message: AngelMessage | null;
  onRead: () => void;
}) {
  // handleOpen calls onRead() as soon as the letter opens (so Journey stops
  // treating it as unread), which nulls the `message` prop from the parent.
  // Keep our own copy so the letter view still has content to show instead
  // of the whole card vanishing mid-open (the "레터 오픈 눌렀을 때 그냥
  // 없어져" bug — `if (!message) return null` was firing the instant the
  // prop went null, before the user ever saw the letter).
  const [displayMessage, setDisplayMessage] = useState(message);
  const [phase, setPhase] = useState<"envelope" | "letter" | "closed">(
    "envelope",
  );

  useEffect(() => {
    if (message) setDisplayMessage(message);
  }, [message]);

  if (!displayMessage || phase === "closed") return null;

  async function handleOpen() {
    setPhase("letter");
    await markAsRead(displayMessage!.id);
    onRead();
  }

  function handleClose() {
    setPhase("closed");
  }

  return (
    <>
      {/* A small paper envelope on the Journey */}
      <AnimatePresence>
        {phase === "envelope" && (
          <motion.div
            key="envelope-card"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            className="angel-host"
          >
            <button type="button" onClick={handleOpen} className="angel-envelope ds-paper">
              <EnvelopeIcon />
              <span className="angel-envelope-text">
                <span className="angel-envelope-title">A message arrived</span>
                <span className="t-meta angel-envelope-sub">Tap to open</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The letter, over a quiet night sky */}
      <ModalPortal open={phase === "letter"} onClose={handleClose} labelledBy="angel-letter" className="angel-letter">
        <div className="angel-night" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="angel-letter-body"
        >
          <div className="angel-letter-art">
            <EnvelopeIconLarge />
          </div>
          <p id="angel-letter" className="angel-letter-text">
            {displayMessage.content}
          </p>
          <p className="angel-letter-sign">Sísí</p>
          <div className="ds-actions" style={{ alignItems: "center" }}>
            <IconButton surface="dark" label="Close" onClick={handleClose}>
              <IconClose />
            </IconButton>
          </div>
        </motion.div>
      </ModalPortal>

      <style jsx global>{`
        .angel-host {
          position: fixed; inset-inline: 0; top: calc(var(--safe-top) + 130px); z-index: var(--z-floating-ui);
          display: flex; justify-content: center; padding: 0 var(--screen-pad); pointer-events: none;
        }
        .angel-envelope {
          pointer-events: auto; display: flex; align-items: center; gap: 12px; min-height: 56px;
          padding: 10px 18px 10px 14px; border: 0; border-radius: var(--paper-radius);
          box-shadow: var(--paper-shadow); cursor: pointer; text-align: left;
        }
        .angel-envelope-text { display: flex; flex-direction: column; gap: 2px; }
        .angel-envelope-title { font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-body); color: var(--sisi-ink); }
        .angel-envelope-sub { color: var(--ink-60); }
        .angel-letter .ds-backdrop { background: var(--sisi-ink); -webkit-backdrop-filter: none; backdrop-filter: none; }
        .angel-night {
          position: fixed; inset: 0; z-index: var(--z-backdrop); pointer-events: none;
          background-image:
            radial-gradient(1.5px 1.5px at 18% 12%, var(--paper-80), transparent),
            radial-gradient(1.5px 1.5px at 80% 20%, var(--paper-60), transparent),
            radial-gradient(1.5px 1.5px at 50% 30%, var(--paper-60), transparent),
            radial-gradient(1.5px 1.5px at 12% 72%, var(--paper-60), transparent),
            radial-gradient(1.5px 1.5px at 88% 80%, var(--paper-80), transparent);
        }
        .angel-letter-body { position: relative; z-index: var(--z-modal); width: min(100%, 380px); text-align: center; color: var(--sisi-paper); }
        .angel-letter-art { width: 120px; margin: 0 auto 28px; }
        .angel-letter-text {
          margin: 0; font-family: var(--font-editorial); font-size: var(--text-card-title); line-height: var(--leading-dialogue);
          color: var(--sisi-paper); white-space: pre-wrap;
        }
        .angel-letter-sign { margin: 28px 0 0; font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--paper-60); }
      `}</style>
    </>
  );
}

/** Small envelope for card — closed envelope (표준 mail 아이콘) */
function EnvelopeIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Envelope body — 완전한 rectangle */}
      <rect
        x="6"
        y="12"
        width="36"
        height="24"
        rx="3"
        fill="var(--sisi-paper)"
        stroke="var(--sisi-ink)"
        strokeWidth="1.4"
      />
      {/* Flap V-line (앞면 접힘 표시) */}
      <path
        d="M6 14 L24 26 L42 14"
        fill="none"
        stroke="var(--sisi-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 큰 편지 아이콘 — 열려있는 편지 + 편지지 나옴.
 * Flap이 위로 열려있고, 안에서 편지가 나와있는 상태.
 */
function EnvelopeIconLarge() {
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 그림자 */}
      <ellipse
        cx="70"
        cy="128"
        rx="46"
        ry="3.5"
        fill="var(--sisi-ink)"
        opacity="0.25"
      />

      {/* 편지지 (letter paper) — 편지 뒤에 살짝 나옴 */}
      <g>
        <rect
          x="34"
          y="18"
          width="72"
          height="70"
          rx="2"
          fill="var(--sisi-paper)"
          stroke="var(--sisi-ink)"
          strokeWidth="1.2"
        />
        {/* 편지 위 작은 줄들 (편지 내용 표시) */}
        <line x1="42" y1="32" x2="98" y2="32" stroke="var(--sisi-ink)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="42" x2="88" y2="42" stroke="var(--sisi-ink)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="52" x2="92" y2="52" stroke="var(--sisi-ink)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="62" x2="78" y2="62" stroke="var(--sisi-ink)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        {/* 서명 위치 표시 */}
        <line x1="80" y1="76" x2="98" y2="76" stroke="var(--sisi-ink)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
      </g>

      {/* 편지 봉투 앞면 (뒤에 편지가 나와있게) */}
      <path
        d="M18 66 L18 116 A3 3 0 0 0 21 119 L119 119 A3 3 0 0 0 122 116 L122 66 L70 100 L18 66 Z"
        fill="var(--sisi-paper)"
        stroke="var(--sisi-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* 편지 봉투 앞면 V-line */}
      <path
        d="M18 66 L70 100 L122 66"
        fill="none"
        stroke="var(--sisi-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* 열린 flap (위로 접힘 — 뒤로 살짝 회전) */}
      <path
        d="M18 66 L70 30 L122 66"
        fill="var(--sisi-paper)"
        stroke="var(--sisi-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Wax seal (봉투 뒤에 살짝) */}
      <circle
        cx="70"
        cy="66"
        r="4"
        fill="var(--sisi-blue)"
        opacity="0.5"
      />
    </svg>
  );
}
