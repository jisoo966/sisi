"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/sisi/BottomNav";
import { sharePostcard } from "@/lib/share";
import { loadPostcards, type Postcard } from "@/lib/postcards";

export const dynamic = "force-dynamic";

/**
 * /gallery — Postcards 컬렉션.
 *   캡쳐한 순간들 grid. Tap → 1b lift & expand full-screen.
 *   Stars는 /my-stars에서 관리 (중복 제거).
 */
type View = "timeline" | "grid";
const VIEW_KEY = "sisi:gallery-view";

export default function GalleryPage() {
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [loaded, setLoaded] = useState(false); // 로딩 전엔 empty state 안 보여줌
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [view, setView] = useState<View>("timeline"); // Timeline default (저널링 감성)

  useEffect(() => {
    loadPostcards().then((data) => {
      setPostcards(data);
      setLoaded(true);
    });
    // Persisted view preference
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "timeline") setView(saved);
    } catch {
      // ignore
    }
  }, []);

  function handleViewChange(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // ignore
    }
  }

  const isDetailOpen = selectedPostcard !== null;

  return (
    <main
      className="relative min-h-svh w-full"
      style={{ backgroundColor: "#f7f2e3" }}
    >
      {/* Grid content — postcard 열리면 dim + slight scale (behind feel) */}
      <motion.div
        animate={{
          opacity: isDetailOpen ? 0.35 : 1,
          scale: isDetailOpen ? 0.97 : 1,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex min-h-svh flex-col pt-[52px] px-[24px] pb-[100px]"
      >
        {/* Header — 탭 페이지: back 없음. title + view toggle */}
        <header className="flex items-baseline justify-between mb-1">
          <h1 className="font-sentient text-[22px] text-journey-navy/95">
            Postcards
          </h1>
          <ViewToggle view={view} onChange={handleViewChange} />
        </header>
        <p className="font-sentient text-[13px] text-journey-navy/60 italic mb-6">
          {postcards.length > 0
            ? `${postcards.length} moment${postcards.length === 1 ? "" : "s"} you've kept`
            : "moments you've kept"}
        </p>

        {/* Content view — timeline (default, 저널) OR grid (시각적 브라우징) */}
        {loaded && postcards.length === 0 && (
          <EmptyState
            text="No postcards yet"
            subtext="Capture a moment on your journey"
            cta="+ keep a moment"
            href="/moment"
          />
        )}
        {loaded && postcards.length > 0 && view === "timeline" && (
          <PostcardsTimeline
            postcards={postcards}
            onSelect={setSelectedPostcard}
          />
        )}
        {loaded && postcards.length > 0 && view === "grid" && (
          <PostcardsGrid postcards={postcards} onSelect={setSelectedPostcard} />
        )}
      </motion.div>

      {/* Bottom nav — postcard 열리면 숨김 (전체 몰입) */}
      <motion.div
        animate={{ opacity: isDetailOpen ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: isDetailOpen ? "none" : "auto" }}
      >
        <BottomNav theme="light" />
      </motion.div>

      {/* 📮 Postcard Detail — 전체 화면 lift & expand */}
      <AnimatePresence>
        {selectedPostcard && (
          <PostcardDetail
            postcard={selectedPostcard}
            onClose={() => setSelectedPostcard(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ─── View Toggle ─────────────────────────────────────── */

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md rounded-full p-[3px] border border-journey-navy/8">
      <ToggleButton
        active={view === "timeline"}
        onClick={() => onChange("timeline")}
        label="Timeline view"
      >
        <TimelineIcon />
      </ToggleButton>
      <ToggleButton
        active={view === "grid"}
        onClick={() => onChange("grid")}
        label="Grid view"
      >
        <GridIcon />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-[28px] w-[32px] flex items-center justify-center rounded-full transition ${
        active
          ? "bg-white text-journey-navy shadow-sm"
          : "text-journey-navy/50 hover:text-journey-navy/80"
      }`}
    >
      {children}
    </button>
  );
}

function TimelineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/* ─── Grid view ───────────────────────────────────────── */

function PostcardsGrid({
  postcards,
  onSelect,
}: {
  postcards: Postcard[];
  onSelect: (p: Postcard) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {postcards.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            onClick={() => onSelect(p)}
            className="aspect-[3/4] rounded-xl overflow-hidden relative shadow-sm bg-journey-cream active:scale-95 transition-transform"
          >
            {p.image.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={p.image}
                alt=""
                fill
                sizes="50vw"
                className="object-cover"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* + keep a moment CTA */}
      <Link
        href="/moment"
        className="font-sentient block w-full text-center rounded-[24px] bg-journey-purple/80 backdrop-blur-md text-journey-navy text-[16px] h-[54px] flex items-center justify-center shadow-md hover:brightness-105 active:scale-98 transition"
      >
        + keep a moment
      </Link>
    </>
  );
}

/* ─── Timeline view ───────────────────────────────────── */

/**
 * Date-grouped 저널 스타일 timeline.
 *   - 날짜 헤더 (May 22, 2026)
 *   - 각 entry: 작은 thumbnail + 시간 + 텍스트 snippet + heart placeholder
 *   - Tap → full detail
 */
function PostcardsTimeline({
  postcards,
  onSelect,
}: {
  postcards: Postcard[];
  onSelect: (p: Postcard) => void;
}) {
  // Group by date (YYYY-MM-DD) → 각 그룹 안은 최신 시간 위
  const grouped = groupByDate(postcards);

  return (
    <div className="flex flex-col gap-[24px] mb-6">
      {grouped.map(({ dateLabel, items }) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="flex items-center gap-[8px] mb-[12px]">
            <div className="h-[6px] w-[6px] rounded-full bg-journey-purple" />
            <p className="font-sentient text-[13px] text-journey-navy/70 tracking-wider">
              {dateLabel}
            </p>
          </div>

          {/* Entries in this date */}
          <div className="flex flex-col gap-[10px] pl-[14px]">
            {items.map((p, i) => (
              <TimelineEntry
                key={p.id}
                postcard={p}
                onClick={() => onSelect(p)}
                delay={i * 0.04}
              />
            ))}
          </div>
        </div>
      ))}

      {/* + keep a moment CTA (bottom) */}
      <Link
        href="/moment"
        className="font-sentient block w-full text-center rounded-[24px] bg-journey-purple/80 backdrop-blur-md text-journey-navy text-[16px] h-[54px] flex items-center justify-center shadow-md hover:brightness-105 active:scale-98 transition mt-[8px]"
      >
        + keep a moment
      </Link>
    </div>
  );
}

function TimelineEntry({
  postcard,
  onClick,
  delay,
}: {
  postcard: Postcard;
  onClick: () => void;
  delay: number;
}) {
  const time = formatTime(postcard.createdAt);
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={onClick}
      className="flex items-start gap-[12px] w-full text-left p-[10px] rounded-[14px] bg-white/60 hover:bg-white active:scale-98 transition"
    >
      {/* Polaroid-style thumbnail — 흰 프레임 + tiny stamp ✦ + rotate으로 postcard 감성 */}
      <div className="shrink-0 relative bg-white rounded-[6px] p-[4px] pb-[10px] shadow-sm rotate-[-1.5deg]">
        <div className="w-[56px] h-[56px] rounded-[3px] overflow-hidden bg-journey-cream relative">
          {postcard.image.startsWith("data:") ? (
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
              sizes="56px"
              className="object-cover"
            />
          )}
          {/* Tiny stamp mark — top-right of photo (postcard identity) */}
          <div className="absolute top-[2px] right-[2px]">
            <svg width="10" height="10" viewBox="0 0 100 100">
              <defs>
                <radialGradient id={`thumb-star-${postcard.id}`} cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgb(255,248,225)" />
                  <stop offset="45%" stopColor="rgb(255,236,189)" />
                  <stop offset="100%" stopColor="rgb(251,198,106)" />
                </radialGradient>
              </defs>
              <path
                d="M50 12 L60 42 L90 42 L66 60 L76 90 L50 72 L24 90 L34 60 L10 42 L40 42 Z"
                fill={`url(#thumb-star-${postcard.id})`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Time + text snippet */}
      <div className="flex-1 min-w-0 pt-[2px]">
        <p className="font-sentient text-[11px] text-journey-navy/50 tracking-wider mb-[4px]">
          {time}
        </p>
        {postcard.text ? (
          <p className="font-sentient text-[14px] text-journey-navy/90 leading-snug line-clamp-3">
            {postcard.text}
          </p>
        ) : (
          <p className="font-sentient italic text-[13px] text-journey-navy/50">
            a moment kept in silence
          </p>
        )}
      </div>
    </motion.button>
  );
}

/** postcards → 날짜별 그룹 (최신 날짜 위) */
function groupByDate(postcards: Postcard[]): {
  dateLabel: string;
  items: Postcard[];
}[] {
  const map = new Map<string, Postcard[]>();
  for (const p of postcards) {
    const d = new Date(p.createdAt);
    // YYYY-MM-DD 로 그룹 key (locale-agnostic)
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  // Key 최신 순 정렬 (내림차순)
  const keys = Array.from(map.keys()).sort().reverse();
  return keys.map((key) => ({
    dateLabel: formatDateLabel(key),
    items: map.get(key)!,
  }));
}

/** "2026-05-22" → "May 22, 2026" */
function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO → "7:24 PM" */
function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * 📮 Postcard Detail — 1b (Lift & Expand) 스타일.
 *   - Full-bleed scene (상단)
 *   - Cream letter section (하단) with date + reflection + star
 *   - Stamp (top-right, 살짝 회전하며 등장)
 *   - Swipe down / X 클릭 / backdrop 클릭 → dismiss
 */
function PostcardDetail({
  postcard,
  onClose,
}: {
  postcard: Postcard;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const dateStr = new Date(postcard.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    const result = await sharePostcard({
      imageDataURL: postcard.image,
      text: postcard.text,
      dateStr,
    });
    setSharing(false);
    if (result === "shared" || result === "copied" || result === "downloaded") {
      setShareDone(true);
      setTimeout(() => setShareDone(false), 1500);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Postcard card — lift & expand (사진 55% / 글 45% 고정 비율) */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 500) onClose();
        }}
        initial={{ scale: 0.5, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.6, y: 40, opacity: 0 }}
        transition={{
          type: "spring",
          damping: 26,
          stiffness: 240,
        }}
        className="relative z-10 mx-4 w-full max-w-[380px] h-[78vh] max-h-[700px] rounded-[20px] overflow-hidden shadow-2xl bg-[#f7f2e3] flex flex-col cursor-grab active:cursor-grabbing"
      >
        {/* Scene image — 55% of card (그림 위) */}
        <div className="relative w-full shrink-0" style={{ height: "55%" }}>
          {postcard.image.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={postcard.image}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <Image
              src={postcard.image}
              alt=""
              fill
              sizes="380px"
              className="object-cover"
              draggable={false}
            />
          )}

          {/* Stamp — top-right, 살짝 회전하며 등장 */}
          <motion.div
            initial={{ rotate: 20, scale: 0.7, opacity: 0 }}
            animate={{ rotate: -6, scale: 1, opacity: 1 }}
            transition={{
              delay: 0.3,
              duration: 0.5,
              type: "spring",
              damping: 12,
              stiffness: 180,
            }}
            className="absolute top-[14px] right-[14px] z-10"
          >
            <Stamp />
          </motion.div>

          {/* X close button — top-left */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-[14px] left-[14px] z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm text-journey-navy/80 hover:bg-white transition active:scale-90"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Share button — top-left 옆 (stamp 반대편) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            disabled={sharing}
            aria-label="Share this moment"
            className="absolute top-[14px] left-[54px] z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm text-journey-navy/80 hover:bg-white transition active:scale-90 disabled:opacity-40"
          >
            {shareDone ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>

        {/* Letter section — cream bg, date + reflection + star (45% of card) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          className="flex-1 px-[28px] pt-[24px] pb-[36px] overflow-y-auto relative"
        >
          <p className="font-sentient text-[11px] text-journey-navy/50 tracking-[0.2em] uppercase mb-[14px]">
            {dateStr}
          </p>
          {postcard.text ? (
            <p className="font-sentient text-[18px] text-journey-navy leading-[1.55] pr-[44px]">
              {postcard.text}
            </p>
          ) : (
            <p className="font-sentient italic text-[16px] text-journey-navy/50">
              A moment kept in silence.
            </p>
          )}

          {/* Small star — bottom-right, glowing (links to a wish, tbd) */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.6,
              duration: 0.4,
              type: "spring",
              damping: 14,
            }}
            className="absolute bottom-[16px] right-[24px]"
          >
            <SmallStar />
          </motion.div>
        </motion.div>

        {/* Swipe-down hint — 카드 상단, 작은 handle */}
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.15, 0.5] }}
          transition={{
            duration: 2.2,
            repeat: 2,
            ease: "easeInOut",
          }}
          className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[36px] h-[4px] rounded-full bg-white/70 pointer-events-none z-20"
        />
      </motion.div>
    </motion.div>
  );
}

/** Vintage stamp — 짧은 세로 사각형 with 톱니 가장자리 */
function Stamp() {
  return (
    <div
      className="relative flex items-center justify-center bg-[#F5F4EC] shadow-md"
      style={{
        width: 48,
        height: 56,
        borderRadius: "3px",
        border: "1.5px dashed rgba(31,42,68,0.35)",
        transform: "rotate(0deg)",
      }}
    >
      {/* Sísí star mark 안에 */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 100 100"
      >
        <defs>
          <radialGradient id="stamp-star-grad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgb(255,248,225)" />
            <stop offset="40%" stopColor="rgb(255,236,189)" />
            <stop offset="100%" stopColor="rgb(212,168,42)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
          fill="url(#stamp-star-grad)"
        />
      </svg>
      {/* stamp corner mark */}
      <p className="absolute bottom-[3px] font-sentient text-[7px] text-journey-navy/70 tracking-[0.15em]">
        sísí
      </p>
    </div>
  );
}

/** 작은 별 — postcard 하단 우측 (링크 표시) */
function SmallStar() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 30, height: 30 }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 28,
          height: 28,
          background:
            "radial-gradient(circle, rgba(255,181,112,0.7), transparent 90%)",
          filter: "blur(3px)",
        }}
      />
      <svg width="20" height="20" viewBox="0 0 100 100" className="relative">
        <defs>
          <radialGradient id="detail-small-star" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgb(255,248,225)" />
            <stop offset="35%" stopColor="rgb(255,236,189)" />
            <stop offset="100%" stopColor="rgb(251,198,106)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
          fill="url(#detail-small-star)"
        />
      </svg>
    </div>
  );
}

function EmptyState({
  text,
  subtext,
  cta,
  href,
}: {
  text: string;
  subtext: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16">
      <p className="font-sentient text-base text-journey-navy/60 text-center mb-1">
        {text}
      </p>
      <p className="font-sentient text-sm text-journey-navy/40 text-center mb-6">
        {subtext}
      </p>
      <Link
        href={href}
        className="font-sentient text-sm rounded-[20px] bg-journey-purple/80 text-journey-navy px-[24px] h-[44px] flex items-center hover:brightness-105 shadow-md transition"
      >
        {cta}
      </Link>
    </div>
  );
}
