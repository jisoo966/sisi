"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/sisi/BottomNav";
import {
  loadStars,
  saveStar,
  createStar,
  starsByTimeframe,
  followingStars,
  constellationStars,
  type Star,
  type Timeframe,
} from "@/lib/myStars";

/**
 * 시간대별 별의 하늘 위치 (고정).
 * someday=가장 멀리(위+오른쪽), this month=가장 가깝게(아래+왼쪽).
 * → 여우가 하늘 올려다볼 때 시간의 원근감이 자연스럽게 느껴짐.
 */
const TIMEFRAME_POSITIONS: Record<
  Timeframe,
  { x: number; y: number; size: Star["size"]; labelSide: "left" | "right" }
> = {
  // Tab bar (~19% 차지) 밑 여유 확보 + 별들 사이 균등 간격 (~9%).
  // 위(먼 미래)에서 아래(가까운 미래)로 부드럽게 cascade.
  // 크기 gradient: 먼 미래 = 작음(sm), 가까운 미래 = 큼(md).
  someday:      { x: 65, y: 29, size: "sm", labelSide: "left" },
  "this year":  { x: 38, y: 39, size: "sm", labelSide: "right" },
  "this season":{ x: 60, y: 49, size: "md", labelSide: "left" },
  "this month": { x: 22, y: 58, size: "md", labelSide: "right" },
};

/** 시간대 표시 순서 — 위(먼 미래)에서 아래(가까운 미래)로 */
const TIMEFRAME_ORDER: Timeframe[] = [
  "someday",
  "this year",
  "this season",
  "this month",
];

export const dynamic = "force-dynamic";

type Phase = "default" | "receiving" | "wish" | "sending";
type Tab = "following" | "constellation";

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
  const [tab, setTab] = useState<Tab>("following");
  const [stars, setStars] = useState<Star[]>([]);
  const [pendingStar, setPendingStar] = useState<Star | null>(null);
  const [mounted, setMounted] = useState(false);
  // 방금 추가된 별 ID — 뾰로롱 spawn animation 적용
  const [justAddedStarId, setJustAddedStarId] = useState<string | null>(null);
  // 첫 유저 flow 진입 (?firstTime=true) — receivingstar 애니메이션 자동 시작
  const [isFirstTime, setIsFirstTime] = useState(false);
  // 첫 별이 하늘에 pin된 직후 CTA 카드 노출 여부
  const [showFirstStarCTA, setShowFirstStarCTA] = useState(false);

  // Query params 감지 — tab 스위치 + firstTime flag
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === "constellation") {
      setTab("constellation");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
    if (url.searchParams.get("firstTime") === "true") {
      setIsFirstTime(true);
      url.searchParams.delete("firstTime");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // 파생된 값
  const following = followingStars(stars);
  const constellation = constellationStars(stars);

  useEffect(() => {
    loadStars().then((s) => {
      setStars(s);
      setMounted(true);
    });
  }, []);

  // firstTime flag가 있고 별이 아직 없으면 → receivingstar 자동 재생.
  // Onboarding에서 이름만 받고 바로 이 화면으로 넘어오는 flow.
  useEffect(() => {
    if (mounted && isFirstTime && stars.length === 0 && phase === "default") {
      setPhase("receiving");
    }
  }, [mounted, isFirstTime, stars.length, phase]);

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

        // 첫 유저 flow였다면 → CTA 카드로 홈으로 유도
        if (isFirstTime) {
          setTimeout(() => setShowFirstStarCTA(true), 1600);
          setIsFirstTime(false); // 한 번만
        }
      }, 900);
    }
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#1a1737]">
      {/* Background — phase에 따라 다름 */}
      <BackgroundLayer phase={phase} onVideoEnd={onVideoEnd} />

      {/* 별들 overlay — default phase에서만, 탭에 따라 다르게 */}
      {phase === "default" && mounted && following.length > 0 && tab === "following" && (
        <StarsLayer stars={following} justAddedStarId={justAddedStarId} />
      )}
      {phase === "default" && mounted && tab === "constellation" && (
        <ConstellationLayer stars={constellation} />
      )}

      {/* UI Layer — pointer-events-none로 클릭 통과, interactive elements만 auto */}
      <div className="relative z-30 flex h-svh flex-col text-white pointer-events-none">
        {/* Header — 두 줄: (1) 타이틀 + 벨, (2) full-width 탭 */}
        {phase === "default" && (
          <header className="shrink-0 pt-[52px] px-[24px] pointer-events-auto">
            <div className="flex items-center justify-between">
              {stars.length > 0 ? (
                <h1 className="font-sentient text-[22px] text-white/95">
                  My Stars
                </h1>
              ) : (
                <span />
              )}
              <button
                aria-label="Notifications"
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </button>
            </div>
            {stars.length > 0 && (
              <div className="mt-[14px]">
                <TabSwitcher current={tab} onChange={setTab} />
              </div>
            )}
          </header>
        )}

        {/* Constellation 탭인데 완료된 별이 없을 때 empty state */}
        {phase === "default" && mounted && tab === "constellation" && constellation.length === 0 && (
          <div className="pointer-events-none flex-1 flex flex-col items-center justify-center px-[24px] text-center">
            <p className="font-sentient text-[20px] text-white/85 leading-[1.4] mb-3">
              your constellation
              <br />
              is still forming.
            </p>
            <p className="font-sentient italic text-[14px] text-white/50 leading-relaxed max-w-[280px]">
              when you arrive at a star, it stays here.
              <br />
              a memory in the sky.
            </p>
          </div>
        )}

        <div className="flex-1" />

        {/* Plus button — Following 탭에서만 (별 있을 때) */}
        {phase === "default" && mounted && stars.length > 0 && tab === "following" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            onClick={startAddingStar}
            aria-label="Add a wish"
            className="fixed bottom-[95px] right-[24px] h-[56px] w-[56px] rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg flex items-center justify-center hover:bg-white/30 active:scale-95 transition z-30 pointer-events-auto"
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

      {/* First-time CTA — 첫 별 pin된 직후 잔잔하게 아래에서 올라옴.
          "start walking" → /journey. "see how this works"는 Phase 2 walkthrough (TODO). */}
      <AnimatePresence>
        {showFirstStarCTA && (
          <FirstStarCTA
            onStartWalking={() => {
              setShowFirstStarCTA(false);
              // 홈으로 이동
              window.location.href = "/journey";
            }}
            onSeeHowItWorks={() => {
              // Phase 2: 말풍선 tour. 지금은 그냥 dismiss + /journey로 유도.
              setShowFirstStarCTA(false);
              window.location.href = "/journey";
            }}
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

/**
 * Clickable stars overlay — 시간대별로 하나씩만, 고정 위치.
 * 각 timeframe의 최신 wish를 대표 별로. 여러 개 있으면 잔잔한 +N indicator.
 */
function StarsLayer({
  stars,
  justAddedStarId,
}: {
  stars: Star[];
  justAddedStarId: string | null;
}) {
  const grouped = starsByTimeframe(stars); // 각 시간대 배열 (최신 순 아닐 수 있음)

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {TIMEFRAME_ORDER.map((tf, i) => {
        const tfStars = grouped[tf];
        if (!tfStars || tfStars.length === 0) return null;

        // 최신 순 정렬 — 대표 별은 가장 최근에 만든 것
        const sorted = [...tfStars].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );
        const primary = sorted[0];
        const extraCount = sorted.length - 1;
        const pos = TIMEFRAME_POSITIONS[tf];

        return (
          <ClickableStar
            key={tf}
            star={primary}
            position={pos}
            extraCount={extraCount}
            appearDelay={i * 0.15}
            justAdded={primary.id === justAddedStarId}
          />
        );
      })}
    </div>
  );
}

function ClickableStar({
  star,
  position,
  extraCount = 0,
  appearDelay = 0,
  justAdded = false,
}: {
  star: Star;
  position: {
    x: number;
    y: number;
    size: Star["size"];
    labelSide: "left" | "right";
  };
  extraCount?: number;
  appearDelay?: number;
  justAdded?: boolean;
}) {
  // 크기 축소 — 화면에서 좀 더 은은하게. 라벨과 겹침 방지.
  const sizeMap = { sm: 18, md: 26, lg: 34 };
  const size = sizeMap[position.size];
  // 별마다 다른 숨쉬기 사이클 — 7~11초 사이 (별끼리 동시에 안 깜빡이도록)
  const breatheDur = 7 + (Math.abs(position.x) % 4);
  // 별마다 다른 시작 offset — 완전 랜덤 phase
  const breatheOffset = (position.x + position.y) % 3;

  return (
    <Link
      href={`/my-stars/${star.id}`}
      className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
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

      {/* Label — 시간대 slot에 지정된 방향 (labelSide) 기준.
          텍스트 사이즈 축소로 별과 라벨 사이 겹침 최소화. */}
      <div
        className={`absolute -translate-y-1/2 ${
          position.labelSide === "left"
            ? "right-full mr-2 text-right"
            : "left-full ml-2 text-left"
        }`}
        style={{ top: "50%" }}
      >
        <p className="font-sentient text-[12px] text-white/90 leading-tight whitespace-nowrap">
          {star.timeframe}
        </p>
        <p className="font-sentient text-[10px] text-white/60 leading-snug mt-[2px] max-w-[110px]">
          {star.wish}
        </p>
        {/* +N indicator — 같은 timeframe에 다른 wish 있으면 잔잔히 */}
        {extraCount > 0 && (
          <p className="font-sentient italic text-[9px] text-white/40 mt-[2px] whitespace-nowrap">
            + {extraCount} more
          </p>
        )}
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
      {/* Dark theme modal — 별하늘과 매칭 (베이지 background 안 튀게).
          my-stars의 밤 배경과 자연스럽게 연결. */}
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] rounded-[24px] p-[24px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(35, 30, 75, 0.97) 0%, rgba(20, 17, 55, 0.98) 100%)",
          border: "1px solid rgba(255, 236, 189, 0.14)",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(177, 156, 217, 0.12)",
        }}
      >
        <div className="flex items-center justify-between mb-[16px]">
          <h3 className="font-sentient text-[13px] text-white/85 tracking-widest uppercase">
            Name a wish
          </h3>
          <button
            onClick={onCancel}
            aria-label="close"
            className="text-white/60 hover:text-white/85 transition"
          >
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
          className="font-sentient w-full bg-transparent text-[18px] text-white placeholder:text-white/35 outline-none resize-none leading-snug border-b border-white/25 focus:border-white/50 pb-2 transition-colors"
        />
        <p className="text-[11px] font-mono text-white/35 text-right mt-1">
          {text.length}/80
        </p>

        <p className="font-sentient text-[12px] text-white/70 tracking-widest uppercase mt-[16px] mb-[10px]">
          By when?
        </p>
        <div className="grid grid-cols-2 gap-[8px]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`font-sentient text-[14px] rounded-[12px] h-[42px] transition ${
                timeframe === tf
                  ? "bg-[#B19CD9]/90 text-journey-navy shadow-sm"
                  : "bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-[20px] pt-[14px] border-t border-white/12">
          <button
            onClick={onCancel}
            className="font-sentient text-[13px] text-white/55 tracking-widest uppercase hover:text-white/80 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onCreate(text, timeframe!)}
            disabled={!canSubmit}
            className="font-sentient text-[15px] rounded-full bg-[#B19CD9]/90 backdrop-blur-md border border-white/25 text-journey-navy px-[22px] h-[42px] shadow-md disabled:opacity-40 hover:brightness-105 transition"
          >
            Send ✦
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Tab switcher — Following | Constellation.
 * 활성 탭은 purple pill, 비활성은 투명 white.
 */
function TabSwitcher({
  current,
  onChange,
}: {
  current: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-full p-1">
      <TabButton
        active={current === "following"}
        onClick={() => onChange("following")}
      >
        Following
      </TabButton>
      <TabButton
        active={current === "constellation"}
        onClick={() => onChange("constellation")}
      >
        Constellation
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-sentient text-[13px] rounded-full h-[34px] w-full flex items-center justify-center leading-none transition ${
        active
          ? "bg-[#B19CD9]/85 text-journey-navy shadow-sm"
          : "text-white/75 hover:text-white/95"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Constellation layer — 도착한 별들 (fulfilled_at 있는) 을 하늘에 픽셀로 pin +
 * 시간 순서대로 얇은 선으로 연결. 유저의 여정을 시각화.
 *
 * 위치는 저장된 x/y를 그대로 쓰되, y를 살짝 위로 (fox 영역 피해).
 * 선은 부드러운 SVG polyline (opacity 낮게 = 별자리 실선 느낌).
 */
function ConstellationLayer({ stars }: { stars: Star[] }) {
  if (stars.length === 0) return null;

  // 도착 순서대로 정렬 (오래된 → 최신) — 시간의 흐름이 선으로
  const sorted = [...stars].sort(
    (a, b) =>
      new Date(a.fulfilledAt ?? a.createdAt).getTime() -
      new Date(b.fulfilledAt ?? b.createdAt).getTime(),
  );

  // 별 크기 (constellation은 조금 더 작게, 별자리 느낌)
  const STAR_SIZE = 20;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Constellation lines — 별들을 시간 순서로 연결 */}
      {sorted.length >= 2 && (
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <polyline
            fill="none"
            stroke="rgba(255,236,189,0.35)"
            strokeWidth="0.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.6 0.4"
            points={sorted.map((s) => `${s.x},${s.y}`).join(" ")}
          />
        </svg>
      )}

      {/* 각 별 — Following과 같은 look, 살짝 작고 warm */}
      {sorted.map((star, i) => (
        <Link
          key={star.id}
          href={`/my-stars/${star.id}`}
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${star.x}%`, top: `${star.y}%` }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.95, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative flex items-center justify-center"
            style={{ width: STAR_SIZE * 2, height: STAR_SIZE * 2 }}
          >
            {/* Warm halo — fulfilled 별은 orange-cream glow */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: STAR_SIZE * 1.4,
                height: STAR_SIZE * 1.4,
                background:
                  "radial-gradient(circle, rgba(255,181,112,0.9) 0%, rgba(255,181,112,0.3) 50%, transparent 100%)",
                filter: "blur(3px)",
              }}
            />
            <svg
              width={STAR_SIZE}
              height={STAR_SIZE}
              viewBox="0 0 100 100"
              className="relative"
            >
              <defs>
                <radialGradient id={`cst-grad-${star.id}`} cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgb(255,248,225)" />
                  <stop offset="35%" stopColor="rgb(255,236,189)" />
                  <stop offset="100%" stopColor="rgb(251,198,106)" />
                </radialGradient>
              </defs>
              <path
                d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
                fill={`url(#cst-grad-${star.id})`}
              />
            </svg>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

/**
 * FirstStarCTA — 첫 별 pin된 직후 아래에서 잔잔하게 올라오는 CTA 카드.
 *
 * Goals:
 *  - 유저가 방금 만든 별을 잠깐 감상할 수 있게 (delay 1.6초 후 등장)
 *  - "start walking to that star?" 로 자연스럽게 홈으로 유도
 *  - "see how this works" 보조 옵션 (Phase 2에서 walkthrough tour 붙일 자리)
 *
 * Design system: 다크 배경이라 primary는 purple pill, secondary는 subtle text link.
 */
function FirstStarCTA({
  onStartWalking,
  onSeeHowItWorks,
}: {
  onStartWalking: () => void;
  onSeeHowItWorks: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-[95px] left-[24px] right-[24px] z-40"
    >
      <div
        className="rounded-[24px] p-[24px] shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(35, 30, 75, 0.96) 0%, rgba(20, 17, 55, 0.96) 100%)",
          border: "1px solid rgba(255, 236, 189, 0.15)",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(177, 156, 217, 0.12)",
        }}
      >
        <p className="font-sentient text-[20px] text-white/95 text-center leading-tight mb-[6px]">
          shall we start walking
          <br />
          to that star?
        </p>
        <p className="font-sentient italic text-[13px] text-white/60 text-center mb-[20px]">
          your journey begins now.
        </p>

        <div className="flex flex-col gap-[10px]">
          {/* Primary — start walking → /journey */}
          <button
            onClick={onStartWalking}
            className="w-full h-[52px] rounded-full bg-[#B19CD9] backdrop-blur-md border border-white/25 text-journey-navy font-sentient text-[15px] shadow-lg hover:brightness-105 active:scale-98 transition-all"
          >
            start walking ✦
          </button>

          {/* Secondary — see how this works (Phase 2 walkthrough) */}
          <button
            onClick={onSeeHowItWorks}
            className="w-full h-[42px] font-sentient italic text-[13px] text-white/60 hover:text-white/85 transition"
          >
            see how this works
          </button>
        </div>
      </div>
    </motion.div>
  );
}

