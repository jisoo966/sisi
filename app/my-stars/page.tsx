"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/sisi/BottomNav";
import {
  loadStars,
  saveStar,
  createStar,
  type Star,
  type Timeframe,
} from "@/lib/myStars";

export const dynamic = "force-dynamic";

type Phase = "default" | "receiving" | "wish" | "sending";

/**
 * /my-stars — Wish → Star 페이지.
 *
 * Flow:
 *   1. default (별 없음) → default.png + "Do you want to add a star?" prompt
 *   2. Yes 클릭 → receivingstar.mp4 (첫 별만)
 *   3. wish modal → 소원 작성 + timeframe 선택
 *   4. Send → sendingstar.mp4 + 끝나면 별 pin됨
 *   5. default (별 있음) → 별들 클릭 가능 + "+" 버튼
 *   6. 두 번째 이후 별 추가 → receiving 건너뛰고 바로 wish modal
 */
export default function MyStarsPage() {
  const [phase, setPhase] = useState<Phase>("default");
  const [stars, setStars] = useState<Star[]>([]);
  const [pendingStar, setPendingStar] = useState<Star | null>(null);
  const [mounted, setMounted] = useState(false);
  // 방금 추가된 별 ID — 뾰로롱 spawn animation 적용
  const [justAddedStarId, setJustAddedStarId] = useState<string | null>(null);

  useEffect(() => {
    loadStars().then((s) => {
      setStars(s);
      setMounted(true);
    });
  }, []);

  function startAddingStar() {
    if (stars.length === 0) {
      setPhase("receiving");
    } else {
      setPhase("wish");
    }
  }

  function handleWishSubmit(wish: string, timeframe: Timeframe) {
    // 기존 stars 전달 → position 겹침 방지
    const star = createStar(wish, timeframe, stars);
    setPendingStar(star);
    setPhase("sending");
  }

  function onVideoEnd(which: "receiving" | "sending") {
    if (which === "receiving") {
      setPhase("wish");
    } else if (which === "sending") {
      // 별 착지 순간 hold — 영상 마지막 프레임 좀 더 유지 (여운)
      setTimeout(async () => {
        if (pendingStar) {
          // Supabase(로그인) 또는 localStorage에 저장
          await saveStar(pendingStar);
          setStars([pendingStar, ...stars]);
          setJustAddedStarId(pendingStar.id); // spawn 마킹
          setPendingStar(null);
        }
        setPhase("default");
        // 스며드는 animation 끝나면 flag clear (그 후엔 일반 twinkle만)
        setTimeout(() => setJustAddedStarId(null), 2800);
      }, 900);
    }
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#1a1737]">
      {/* Background — phase에 따라 다름 */}
      <BackgroundLayer phase={phase} onVideoEnd={onVideoEnd} />

      {/* 별들 overlay — default phase에서만 (별 있으면) */}
      {phase === "default" && mounted && stars.length > 0 && (
        <StarsLayer stars={stars} justAddedStarId={justAddedStarId} />
      )}

      {/* UI Layer — pointer-events-none로 클릭 통과, interactive elements만 auto */}
      <div className="relative z-30 flex h-svh flex-col text-white pointer-events-none">
        {/* Header */}
        {phase === "default" && (
          <header className="flex items-center justify-between pt-[52px] px-[24px] pointer-events-auto">
            {stars.length > 0 ? (
              <h1 className="font-sentient text-[22px] text-white/95 pointer-events-none">
                My Stars
              </h1>
            ) : (
              <span />
            )}
            <button
              aria-label="Notifications"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
          </header>
        )}

        <div className="flex-1" />

        {/* Plus button — pointer-events-auto */}
        {phase === "default" && mounted && stars.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            onClick={startAddingStar}
            aria-label="Add a wish"
            className="absolute bottom-[110px] right-[24px] h-[56px] w-[56px] rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg flex items-center justify-center hover:bg-white/30 active:scale-95 transition z-30 pointer-events-auto"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        )}

      </div>

      {/* Bottom nav — shared component, phase가 default일 때만 */}
      {phase === "default" && <BottomNav theme="dark" />}

      {/* Empty state prompt — 첫 방문 시 */}
      <AnimatePresence>
        {phase === "default" && mounted && stars.length === 0 && (
          <FirstTimePrompt onYes={startAddingStar} />
        )}
      </AnimatePresence>

      {/* Wish modal */}
      <AnimatePresence>
        {phase === "wish" && (
          <WishModal
            onCreate={handleWishSubmit}
            onCancel={() => setPhase("default")}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/** Background — default 이미지 또는 phase에 맞는 비디오 */
function BackgroundLayer({
  phase,
  onVideoEnd,
}: {
  phase: Phase;
  onVideoEnd: (which: "receiving" | "sending") => void;
}) {
  // wish phase는 default 배경 (modal이 위에 있음)
  const showVideo = phase === "receiving" || phase === "sending";

  return (
    <div className="absolute inset-0">
      {/* Default 이미지는 항상 렌더 (base). 비디오 재생 중이면 위에 덮음 */}
      <Image
        src="/mystars/default.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Receiving video — 한번만 재생, 끝나면 pause */}
      <AnimatePresence>
        {phase === "receiving" && (
          <motion.video
            key="receiving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            src="/mystars/receivingstar.mp4"
            autoPlay
            muted
            playsInline
            loop={false}
            preload="auto"
            onEnded={(e) => {
              e.currentTarget.pause();
              onVideoEnd("receiving");
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {/* Sending video — 한번만 재생, 끝나면 부드럽게 사라짐 */}
      <AnimatePresence>
        {phase === "sending" && (
          <motion.video
            key="sending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: {
                duration: 1.4,
                ease: [0.4, 0, 0.2, 1], // easeOut — 하늘로 스며들듯
              },
            }}
            src="/mystars/sendingstar.mp4"
            autoPlay
            muted
            playsInline
            loop={false}
            preload="auto"
            onEnded={(e) => {
              e.currentTarget.pause();
              onVideoEnd("sending");
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** 첫 방문 프롬프트 — "Do you want to add a star?" */
function FirstTimePrompt({ onYes }: { onYes: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="absolute inset-x-0 top-1/3 z-30 flex flex-col items-center px-[24px] text-center"
    >
      <p className="font-sentient text-[22px] text-white/95 leading-[1.3] mb-[24px]">
        Do you want to
        <br />
        add a star?
      </p>
      <button
        onClick={onYes}
        className="font-sentient text-[16px] rounded-[24px] bg-[#B19CD9] text-journey-navy px-[36px] h-[48px] shadow-lg hover:brightness-105 active:scale-95 transition"
      >
        Yes ✦
      </button>
    </motion.div>
  );
}

/** Clickable stars overlay */
function StarsLayer({
  stars,
  justAddedStarId,
}: {
  stars: Star[];
  justAddedStarId: string | null;
}) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {stars.map((star, i) => (
        <ClickableStar
          key={star.id}
          star={star}
          appearDelay={i * 0.1}
          justAdded={star.id === justAddedStarId}
        />
      ))}
    </div>
  );
}

function ClickableStar({
  star,
  appearDelay = 0,
  justAdded = false,
}: {
  star: Star;
  appearDelay?: number;
  justAdded?: boolean;
}) {
  const sizeMap = { sm: 22, md: 32, lg: 44 };
  const size = sizeMap[star.size];
  // 별마다 다른 숨쉬기 사이클 — 7~11초 사이 (별끼리 동시에 안 깜빡이도록)
  const breatheDur = 7 + (Math.abs(star.x) % 4);
  // 별마다 다른 시작 offset — 완전 랜덤 phase
  const breatheOffset = (star.x + star.y) % 3;

  return (
    <Link
      href={`/my-stars/${star.id}`}
      className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${star.x}%`, top: `${star.y}%` }}
    >
      {/* ✦ 뾰로롱 spawn burst — 방금 만든 별에만 (한 번 크게 반짝!) */}
      {justAdded && (
        <>
          {/* 외곽 큰 glow — 확 퍼지면서 사라짐 */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{
              scale: [0.2, 2.2, 4.5],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.6,
              ease: [0.16, 1, 0.3, 1], // easeOutExpo — 확 터졌다 잔잔히
            }}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              width: size * 2.2,
              height: size * 2.2,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(255,240,200,0.95) 0%, rgba(255,181,112,0.5) 35%, rgba(255,181,112,0.15) 65%, transparent 90%)",
              filter: "blur(6px)",
              zIndex: 1,
            }}
          />
          {/* 내부 밝은 flash — 별 중심 하이라이트 */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: [0.3, 1.4, 2.2],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.05,
            }}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              width: size * 1.4,
              height: size * 1.4,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(255,255,240,1) 0%, rgba(255,236,189,0.6) 40%, transparent 80%)",
              filter: "blur(3px)",
              zIndex: 2,
            }}
          />
        </>
      )}

      <motion.div
        // 🎯 방금 만든 별 = 한 번 크게 뾰로롱! (반짝 flash 후 정착)
        // 기존 별 = 아주 잔잔한 숨쉬기 (거의 안 보일 정도로)
        initial={{ scale: justAdded ? 0 : 1, opacity: justAdded ? 0 : 0.95 }}
        animate={
          justAdded
            ? {
                // 한 번 크게 튀었다가 정착: 0 → 1.6 → 0.95 → 1
                scale: [0, 1.6, 0.95, 1],
                opacity: [0, 1, 1, 0.95],
              }
            : {
                // 잔잔한 숨쉬기: 크기는 거의 안 변함 + 밝기만 살짝
                scale: [1, 1.03, 1],
                opacity: [0.95, 1, 0.95],
              }
        }
        transition={
          justAdded
            ? {
                // 한 번만 크게 반짝! — 1.4초 총 (repeat 없음)
                scale: {
                  times: [0, 0.35, 0.7, 1],
                  duration: 1.4,
                  ease: [0.16, 1, 0.3, 1], // easeOutExpo — 확 튀었다 정착
                  delay: appearDelay,
                },
                opacity: {
                  times: [0, 0.3, 0.7, 1],
                  duration: 1.4,
                  ease: [0.4, 0, 0.2, 1],
                  delay: appearDelay,
                },
              }
            : {
                // 잔잔한 숨쉬기 — 7~11초 사이, 별마다 다른 phase
                scale: {
                  duration: breatheDur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: breatheOffset,
                },
                opacity: {
                  duration: breatheDur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: breatheOffset,
                },
              }
        }
        className="relative flex items-center justify-center"
        style={{ width: size * 2.5, height: size * 2.5 }}
      >
        {/* Middle glow (warm orange) — 뒤 layer */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 1.6,
            height: size * 1.6,
            background: "radial-gradient(circle, rgba(238,137,79,0.5) 0%, rgba(238,137,79,0.2) 50%, transparent 90%)",
            filter: "blur(4px)",
            zIndex: 2,
          }}
        />
        {/* Inner halo (warm cream-orange) — 별 바로 뒤 */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size,
            height: size,
            background: "radial-gradient(circle, rgba(255,181,112,1) 0%, rgba(255,181,112,0.35) 55%, transparent 100%)",
            filter: "blur(3.5px)",
            zIndex: 3,
          }}
        />
        {/* 5-point star — 앞 (선명) */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="relative"
          style={{ zIndex: 4 }}
        >
          <defs>
            <radialGradient id={`star-grad-${star.id}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgb(255,248,225)" />
              <stop offset="35%" stopColor="rgb(255,236,189)" />
              <stop offset="100%" stopColor="rgb(251,198,106)" />
            </radialGradient>
          </defs>
          <path
            d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
            fill={`url(#star-grad-${star.id})`}
          />
          <circle cx="50" cy="50" r="7" fill="rgb(255,248,225)" opacity="0.85" />
        </svg>
      </motion.div>

      {/* Label — 별 위치에 따라 자동으로 좌/우 정렬 (edge 넘어가지 않도록) */}
      <div
        className={`absolute -translate-y-1/2 whitespace-nowrap ${
          star.x > 55
            ? "right-full mr-4 text-right" // 오른쪽 별 → label 왼쪽
            : "left-full ml-4 text-left" // 왼쪽/중앙 별 → label 오른쪽
        }`}
        style={{ top: "50%" }}
      >
        <p className="font-sentient text-[13px] text-white/95 leading-tight">
          {star.timeframe}
        </p>
        <p className="font-sentient text-[11px] text-white/65 leading-tight mt-[3px] max-w-[130px] whitespace-normal">
          {star.wish}
        </p>
      </div>
    </Link>
  );
}

/** Wish modal — 소원 작성 + timeframe */
function WishModal({
  onCreate,
  onCancel,
}: {
  onCreate: (wish: string, tf: Timeframe) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);

  const canSubmit = text.trim().length > 0 && timeframe;

  const timeframes: Timeframe[] = [
    "this month",
    "this season",
    "this year",
    "someday",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-[24px] bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] rounded-[16px] bg-[#f7f2e3] shadow-2xl p-[24px]"
      >
        <div className="flex items-center justify-between mb-[16px]">
          <h3 className="font-sentient text-[13px] text-journey-navy tracking-widest uppercase">
            Name a wish
          </h3>
          <button onClick={onCancel} aria-label="close" className="text-journey-navy/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 80))}
          placeholder="I want to..."
          rows={2}
          autoFocus
          className="font-sentient w-full bg-transparent text-[18px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none leading-snug border-b border-journey-navy/20 pb-2"
        />
        <p className="text-[11px] font-mono text-journey-navy/40 text-right mt-1">
          {text.length}/80
        </p>

        <p className="font-sentient text-[12px] text-journey-navy/70 tracking-widest uppercase mt-[16px] mb-[10px]">
          By when?
        </p>
        <div className="grid grid-cols-2 gap-[8px]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`font-sentient text-[14px] rounded-[10px] h-[42px] transition ${
                timeframe === tf
                  ? "bg-journey-navy text-white"
                  : "bg-white/60 border border-journey-navy/15 text-journey-navy hover:bg-white/90"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-[20px] pt-[12px] border-t border-journey-navy/10">
          <button
            onClick={onCancel}
            className="font-sentient text-[13px] text-journey-navy/60 tracking-widest uppercase"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onCreate(text, timeframe!)}
            disabled={!canSubmit}
            className="font-sentient text-[15px] rounded-[20px] bg-[#B19CD9] text-journey-navy px-[20px] h-[40px] disabled:opacity-40 transition"
          >
            Send ✦
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

