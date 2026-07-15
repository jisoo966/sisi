"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { markAsRead, type AngelMessage } from "@/lib/angelMessages";

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
      {/* Envelope card overlay — Journey 홈에 은은히 뜸 */}
      <AnimatePresence>
        {phase === "envelope" && (
          <motion.div
            key="envelope-card"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.4,
            }}
            className="fixed inset-x-0 top-[130px] z-30 flex justify-center px-[24px] pointer-events-none"
          >
            <button
              onClick={handleOpen}
              className="pointer-events-auto flex items-center gap-3 rounded-[20px] bg-white/85 backdrop-blur-md border border-white/70 px-[16px] py-[12px] shadow-lg hover:bg-white transition active:scale-98"
            >
              <div className="relative">
                <EnvelopeIcon />
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-journey-purple text-[10px] text-white font-medium px-1">
                  1
                </span>
              </div>
              <div className="flex flex-col items-start text-left">
                <p className="font-sentient text-[13px] text-journey-navy leading-tight">
                  a message arrived
                </p>
                <p className="font-sentient italic text-[11px] text-journey-navy/50">
                  tap to open
                </p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen letter view */}
      <AnimatePresence>
        {phase === "letter" && (
          <motion.div
            key="letter-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[110] flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
            }}
          >
            {/* Subtle stars */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {[
                { top: "12%", left: "18%" },
                { top: "20%", left: "80%" },
                { top: "30%", left: "50%" },
                { top: "72%", left: "12%" },
                { top: "80%", left: "88%" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  className="absolute h-[2px] w-[2px] rounded-full bg-white"
                  style={{
                    ...s,
                    boxShadow: "0 0 4px rgba(255,236,189,0.6)",
                  }}
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{
                    duration: 3 + (i % 2),
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                />
              ))}
            </div>

            {/* Close X */}
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-20 h-11 w-11 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white/85 hover:bg-white/25 transition"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Letter content */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10 mx-[32px] max-w-[380px] text-center"
            >
              {/* Big envelope illustration */}
              <motion.div
                initial={{ rotate: -8, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  duration: 1.0,
                  delay: 0.3,
                  type: "spring",
                  damping: 14,
                }}
                className="mx-auto mb-[32px] w-[120px]"
              >
                <EnvelopeIconLarge />
              </motion.div>

              {/* Message text — feels like handwritten note */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="font-sentient text-[22px] text-white/95 leading-[1.5]"
              >
                {displayMessage.content}
              </motion.p>

              {/* Signature */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                className="mt-[40px] font-sentient italic text-[14px] text-white/50"
              >
                — sísí
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        fill="#f7f2e3"
        stroke="#1F2A44"
        strokeWidth="1.4"
      />
      {/* Flap V-line (앞면 접힘 표시) */}
      <path
        d="M6 14 L24 26 L42 14"
        fill="none"
        stroke="#1F2A44"
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
        fill="#000000"
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
          fill="#faf5e6"
          stroke="#1F2A44"
          strokeWidth="1.2"
        />
        {/* 편지 위 작은 줄들 (편지 내용 표시) */}
        <line x1="42" y1="32" x2="98" y2="32" stroke="#1F2A44" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="42" x2="88" y2="42" stroke="#1F2A44" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="52" x2="92" y2="52" stroke="#1F2A44" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        <line x1="42" y1="62" x2="78" y2="62" stroke="#1F2A44" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
        {/* 서명 위치 표시 */}
        <line x1="80" y1="76" x2="98" y2="76" stroke="#1F2A44" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
      </g>

      {/* 편지 봉투 앞면 (뒤에 편지가 나와있게) */}
      <path
        d="M18 66 L18 116 A3 3 0 0 0 21 119 L119 119 A3 3 0 0 0 122 116 L122 66 L70 100 L18 66 Z"
        fill="#f0e8d0"
        stroke="#1F2A44"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* 편지 봉투 앞면 V-line */}
      <path
        d="M18 66 L70 100 L122 66"
        fill="none"
        stroke="#1F2A44"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* 열린 flap (위로 접힘 — 뒤로 살짝 회전) */}
      <path
        d="M18 66 L70 30 L122 66"
        fill="#f7f2e3"
        stroke="#1F2A44"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Wax seal (봉투 뒤에 살짝) */}
      <circle
        cx="70"
        cy="66"
        r="4"
        fill="#B19CD9"
        opacity="0.5"
      />
    </svg>
  );
}
