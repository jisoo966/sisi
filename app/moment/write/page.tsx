"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { savePostcard } from "@/lib/postcards";

export const dynamic = "force-dynamic";

const PENDING_KEY = "sisi:pending-postcard";

type Pending = {
  dataURL: string;
  width: number;
  height: number;
};

/**
 * /moment/write — Postcard 작성 full-page.
 *   PostcardOptionsSheet에서 사진 선택 후 넘어옴.
 *   sessionStorage로 사진 데이터 받음 (URL로 넘길 수 없어서).
 *
 * Layout:
 *   - Back button (top left)
 *   - Photo preview (polaroid style, stamp 우측)
 *   - Date below photo
 *   - "Today I felt..." heading
 *   - Textarea for reflection
 *   - Save postcard (primary purple)
 */
export default function WritePostcardPage() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nowStr, setNowStr] = useState("");

  useEffect(() => {
    // sessionStorage에서 pending photo 로드
    const stored = sessionStorage.getItem(PENDING_KEY);
    if (!stored) {
      // 사진 없으면 홈으로 (직접 URL로 진입한 경우)
      router.replace("/journey");
      return;
    }
    try {
      setPending(JSON.parse(stored) as Pending);
    } catch {
      router.replace("/journey");
      return;
    }
    setNowStr(formatDateTime(new Date().toISOString()));
  }, [router]);

  async function handleSave() {
    if (!pending) return;
    setSaving(true);
    setError("");

    try {
      await savePostcard({
        text: caption.trim(),
        imageDataURL: pending.dataURL,
        width: pending.width,
        height: pending.height,
        takenAt: new Date().toISOString(),
      });
      // Cleanup pending state
      sessionStorage.removeItem(PENDING_KEY);
      router.push("/postcard/saved");
    } catch (err) {
      console.error("save postcard failed:", err);
      const msg = String(err);
      if (msg.includes("Quota") || msg.includes("quota")) {
        setError("your storage is full. try logging in to save more.");
      } else {
        setError("save failed. try again?");
      }
      setSaving(false);
    }
  }

  function handleBack() {
    // 사용자가 back → 진행 중이었던 사진 폐기
    sessionStorage.removeItem(PENDING_KEY);
    router.back();
  }

  if (!pending) {
    // Loading state (short flash, sessionStorage 읽는 중)
    return <main className="min-h-svh bg-journey-cream" />;
  }

  return (
    <main className="relative min-h-svh w-full bg-journey-cream flex flex-col">
      {/* Header — back only */}
      <header className="shrink-0 pt-[52px] px-[24px]">
        <button
          onClick={handleBack}
          aria-label="back"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-md border border-white/50 text-journey-navy shadow-sm hover:bg-white/80 transition"
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
        </button>
      </header>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-[24px] pt-[16px] pb-[24px]">
        {/* Polaroid preview */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[280px] mx-auto"
        >
          <div className="bg-white rounded-[12px] p-[10px] pb-[14px] shadow-xl">
            <div className="relative rounded-[6px] overflow-hidden aspect-square bg-journey-navy/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pending.dataURL}
                alt="postcard preview"
                className="w-full h-full object-cover"
              />
              {/* Stamp corner */}
              <div className="absolute top-[8px] right-[8px]">
                <MiniStamp />
              </div>
            </div>
            {/* Date inside polaroid */}
            <p className="font-sentient text-[10px] text-journey-navy/60 tracking-wider mt-[6px] px-[4px]">
              {nowStr}
            </p>
          </div>
        </motion.div>

        {/* "Today I felt..." heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-[28px]"
        >
          <p className="font-sentient text-[18px] text-journey-navy leading-tight">
            today i felt...
          </p>
        </motion.div>

        {/* Caption textarea */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 300))}
            placeholder="share your thoughts, feelings, or anything that stays with you."
            rows={5}
            className="font-sentient w-full mt-[12px] p-[16px] rounded-[14px] bg-white/70 border border-journey-navy/10 text-[15px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none leading-relaxed transition-colors focus:bg-white focus:border-journey-navy/25"
          />
          <p className="text-[10px] font-mono text-journey-navy/40 text-right mt-1">
            {caption.length}/300
          </p>
        </motion.div>

        {error && (
          <p className="mt-3 font-sentient italic text-[13px] text-journey-oxblood text-center">
            {error}
          </p>
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="shrink-0 px-[24px] pt-[12px] pb-[36px]"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[56px] rounded-[28px] bg-journey-purple text-journey-navy font-sentient text-[16px] shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-70 disabled:cursor-wait transition-all"
        >
          {saving ? "saving..." : "save postcard"}
        </button>
      </motion.div>
    </main>
  );
}

/** Polaroid stamp — 우측 상단 */
function MiniStamp() {
  return (
    <div
      className="relative flex items-center justify-center bg-white shadow-sm"
      style={{
        width: 34,
        height: 40,
        borderRadius: "2px",
        border: "1.2px dashed rgba(31,42,68,0.3)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="write-stamp-star" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgb(255,248,225)" />
            <stop offset="40%" stopColor="rgb(255,236,189)" />
            <stop offset="100%" stopColor="rgb(212,168,42)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
          fill="url(#write-stamp-star)"
        />
      </svg>
    </div>
  );
}

/** "May 22, 2026 · 7:24 PM" 포맷 */
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
