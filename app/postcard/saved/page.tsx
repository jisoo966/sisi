"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sharePostcard } from "@/lib/share";
import { getLatestPostcard, type Postcard } from "@/lib/postcards";

export const dynamic = "force-dynamic";

/**
 * /postcard/saved — 방금 저장한 postcard 축하 화면.
 *   - Figma: dark starry background + postcard card
 *   - "Your moment is saved" heading
 *   - Share button (top-right, Web Share API)
 *   - View Postcard / Back to Journey 두 CTA
 */
export default function PostcardSavedPage() {
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "done">(
    "idle",
  );

  useEffect(() => {
    getLatestPostcard().then((p) => {
      if (p) setPostcard(p);
    });
  }, []);

  async function handleShare() {
    if (!postcard || shareState === "sharing") return;
    setShareState("sharing");
    const result = await sharePostcard({
      imageDataURL: postcard.image,
      text: postcard.text,
      dateStr: formatDateTime(postcard.createdAt),
    });
    setShareState("done");
    // 짧게 표시 후 리셋
    setTimeout(() => setShareState("idle"), 1500);
    // 결과별 processing (silent)
    if (result === "failed") {
      console.warn("share failed");
    }
  }

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
      }}
    >
      {/* Starry background — 밤하늘 별들 */}
      <StarField />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between pt-[52px] px-[24px]">
        <Link
          href="/journey"
          aria-label="close"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <p className="font-sentient text-[13px] text-white/70 tracking-wider">
          A moment, saved
        </p>

        <button
          onClick={handleShare}
          disabled={!postcard || shareState === "sharing"}
          aria-label="Share this moment"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition disabled:opacity-40"
        >
          {shareState === "done" ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* Middle content */}
      <div className="relative z-10 flex flex-col items-center px-[24px] pt-[48px]">
        {/* Small twinkle above */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[24px] text-[#F5F4EC]/80 mb-3"
        >
          ✦
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-sentient text-[28px] text-white/95 text-center leading-tight"
        >
          Your moment is saved
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="font-sentient italic text-[15px] text-white/60 text-center mt-2 mb-[36px]"
        >
          It&apos;s always here when you need it.
        </motion.p>

        {/* Postcard card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.5,
            type: "spring",
            damping: 20,
            stiffness: 200,
          }}
          className="relative w-full max-w-[280px]"
        >
          <div className="bg-[#f7f2e3] rounded-[14px] p-[10px] pb-[14px] shadow-2xl">
            <div className="relative rounded-[8px] overflow-hidden aspect-[3/4] bg-journey-cream">
              {postcard?.image ? (
                postcard.image.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={postcard.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={postcard.image}
                    alt=""
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-journey-cream" />
              )}

              {/* Stamp on the card — top-right */}
              <motion.div
                initial={{ rotate: 15, scale: 0.7, opacity: 0 }}
                animate={{ rotate: -8, scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.9,
                  duration: 0.5,
                  type: "spring",
                  damping: 12,
                  stiffness: 180,
                }}
                className="absolute top-[8px] right-[8px] z-10"
              >
                <MiniStamp />
              </motion.div>
            </div>

            {/* Date at bottom of postcard */}
            {postcard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="flex items-center justify-between mt-[8px] px-[6px]"
              >
                <p className="font-sentient text-[11px] text-journey-navy/60 tracking-wider">
                  {formatDateTime(postcard.createdAt)}
                </p>
                <span className="text-[14px] text-[#D4A82A]">✦</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="absolute inset-x-0 bottom-0 px-[24px] pb-[42px] z-20 flex flex-col gap-3"
      >
        <Link
          href="/gallery"
          className="font-sentient block w-full text-center rounded-[30px] bg-journey-purple/85 backdrop-blur-md border border-white/30 text-journey-navy text-[17px] h-[56px] flex items-center justify-center shadow-lg hover:brightness-105 active:scale-98 transition"
        >
          View Postcard
        </Link>
        <Link
          href="/journey"
          className="font-sentient block w-full text-center rounded-[30px] bg-white/15 backdrop-blur-md border border-white/25 text-white text-[17px] h-[56px] flex items-center justify-center hover:bg-white/25 transition"
        >
          Back to Journey
        </Link>
      </motion.div>
    </main>
  );
}

/** 살랑거리는 별들 — 배경 mood */
function StarField() {
  const stars = [
    { top: "12%", left: "18%", size: 3, delay: 0 },
    { top: "18%", left: "78%", size: 2, delay: 0.5 },
    { top: "8%", left: "60%", size: 2, delay: 1 },
    { top: "26%", left: "12%", size: 2, delay: 1.5 },
    { top: "32%", left: "88%", size: 3, delay: 0.3 },
    { top: "48%", left: "8%", size: 2, delay: 0.8 },
    { top: "52%", left: "92%", size: 2, delay: 1.2 },
    { top: "68%", left: "6%", size: 3, delay: 0.6 },
    { top: "72%", left: "94%", size: 2, delay: 1.4 },
    { top: "82%", left: "22%", size: 2, delay: 0.9 },
    { top: "86%", left: "76%", size: 3, delay: 0.2 },
  ];
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {stars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,236,189,0.6)`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** 작은 우표 — postcard 카드 안 */
function MiniStamp() {
  return (
    <div
      className="relative flex items-center justify-center bg-[#F5F4EC] shadow-sm"
      style={{
        width: 36,
        height: 42,
        borderRadius: "2px",
        border: "1.2px dashed rgba(31,42,68,0.35)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="saved-stamp-star" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgb(255,248,225)" />
            <stop offset="40%" stopColor="rgb(255,236,189)" />
            <stop offset="100%" stopColor="rgb(212,168,42)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
          fill="url(#saved-stamp-star)"
        />
      </svg>
    </div>
  );
}

/** "May 22, 2026 · 9:41 PM" 포맷 */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${dateStr} · ${h}:${m} ${ampm}`;
}
