"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WalkingFoxRear } from "@/components/sisi/WalkingFoxRear";
import { JourneyScene } from "@/components/sisi/JourneyScene";
import { BottomNav } from "@/components/sisi/BottomNav";
import { MenuSheet } from "@/components/sisi/MenuSheet";
import { PostcardOptionsSheet } from "@/components/sisi/PostcardOptionsSheet";
import { GuestLoginNudge } from "@/components/sisi/GuestLoginNudge";
import { AngelMessageCard } from "@/components/sisi/AngelMessageCard";
import { useVideoLuminance } from "@/lib/useVideoLuminance";
import { createClient } from "@/lib/supabase/client";
import { ensureTodaysMessage, type AngelMessage } from "@/lib/angelMessages";
import { loadStars, type Star } from "@/lib/myStars";

/**
 * SkyStar — 하늘에 떠 있는 하나의 별.
 * 유저 최근 wish를 시적으로 표현. 탭 시 /my-stars 이동.
 * 글자 없음 = 상징만. 순수한 연결감.
 */
function SkyStar({ star }: { star: Star }) {
  // 별 위치 (하늘 상단, 살짝 오른쪽) — position 데이터 활용 가능하나 여기선 고정.
  // 인사말 텍스트 바로 아래에 붙어있던 것 → 여백 확보하되 살짝 위로 (22~30%).
  const top = 22 + (Math.abs(star.x) % 8); // 22~30%
  const left = 45 + (star.y % 20); // 45~65%
  const size = 28;

  return (
    <Link
      href="/my-stars"
      // 인사말을 감싸는 header wrapper가 z-10 + h-screen이라 투명한 영역까지
      // 클릭을 가로채고 있었음 — 그보다 높은 z로 올려서 실제로 탭되게 함.
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
      style={{ top: `${top}%`, left: `${left}%` }}
      aria-label="Your star in the sky"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{
          opacity: [0.85, 1, 0.85],
          scale: [1, 1.05, 1],
        }}
        transition={{
          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative flex items-center justify-center"
        style={{ width: size * 2.5, height: size * 2.5 }}
      >
        {/* Middle glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 1.6,
            height: size * 1.6,
            background:
              "radial-gradient(circle, rgba(238,137,79,0.5) 0%, rgba(238,137,79,0.2) 50%, transparent 90%)",
            filter: "blur(4px)",
            zIndex: 2,
          }}
        />
        {/* Inner halo */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size,
            height: size,
            background:
              "radial-gradient(circle, rgba(255,181,112,1) 0%, rgba(255,181,112,0.35) 55%, transparent 100%)",
            filter: "blur(3.5px)",
            zIndex: 3,
          }}
        />
        {/* Star SVG */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="relative"
          style={{ zIndex: 4 }}
        >
          <defs>
            <radialGradient id={`journey-star-${star.id}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgb(255,248,225)" />
              <stop offset="35%" stopColor="rgb(255,236,189)" />
              <stop offset="100%" stopColor="rgb(251,198,106)" />
            </radialGradient>
          </defs>
          <path
            d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
            fill={`url(#journey-star-${star.id})`}
          />
          <circle cx="50" cy="50" r="7" fill="rgb(255,248,225)" opacity="0.85" />
        </svg>
      </motion.div>
    </Link>
  );
}

/** 시간대별 인사 */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "Jul 14, 2026" 포맷 */
function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Journey Home — *Sky Children of Light* 느낌의 endless walking world.
 *
 * 핵심:
 *   1. Background = *Midjourney tracking shot video* (world-day.mp4)
 *      → 카메라가 *실제로 앞으로 흐름*, 분위기 전부 베이크됨
 *   2. Fox = walking webp + *cast shadow* → 무게감, 3D feel
 *   3. JourneyMusic = Desert Bloom Loop ambient
 *
 * 결과: *진짜 게임 세계*를 걷고 있는 명상 경험.
 */
export default function JourneyPage() {
  // 배경 video 밝기 감지 — dark scene(밤/starry)이면 텍스트 흰색으로
  const bgMode = useVideoLuminance();
  const isDark = bgMode === "dark";

  // Profile에서 사용자 이름 가져옴 (없으면 fallback "you")
  const [name, setName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [postcardSheetOpen, setPostcardSheetOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [hasNudge, setHasNudge] = useState(false); // bell dot badge
  const [angelMessage, setAngelMessage] = useState<AngelMessage | null>(null);
  const [featuredStar, setFeaturedStar] = useState<Star | null>(null);

  // Bell badge — 게스트 & nudge를 최소 한 번 봤으면 계속 badge (재열기 가능).
  // 로그인 유저는 badge 없음.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return; // logged-in: no nudge
      const seen = localStorage.getItem("sisi:guest-nudge-seen") === "true";
      setHasNudge(seen);
    })();
  }, []);
  const greeting = getGreeting();
  const dateStr = formatDate();

  // Angel message — 홈 열 때 오늘의 편지 확인 (24h 내 없으면 생성)
  useEffect(() => {
    ensureTodaysMessage().then((msg) => {
      // 안 읽은 것만 카드로 표시
      if (msg && !msg.read_at) setAngelMessage(msg);
    });
  }, []);

  // 최근 별 하나 하늘에 — 여우가 걷는 방향의 상징 (탭 시 /my-stars)
  useEffect(() => {
    loadStars().then((stars) => {
      if (stars.length > 0) setFeaturedStar(stars[0]); // 최근 별
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인 유저 — Supabase profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.display_name) setName(profile.display_name);
        } else {
          // 게스트 — localStorage 이름
          const guestName = localStorage.getItem("sisi:guest-name");
          if (guestName) setName(guestName);
        }
      } catch {
        // fail silent — 이름 없어도 앱 동작
      }
    })();
  }, []);

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#F5F4EC]">
      {/* Background video world — 48fps interpolated *smooth 명상 페이스* (0.5x = 24fps effective) */}
      <JourneyScene />

      {/* ✦ 하늘의 별 — 여우가 향해 걷는 상징. 탭 시 /my-stars로. */}
      {featuredStar && <SkyStar star={featuredStar} />}

      {/* Fox + cast shadow — *유저가 매뉴얼 튜닝한 path following*.
          /journey/tune 페이지에서 슬라이더로 조절해서 완성한 값들.
          Video 20s native @ 0.5x = 40s wall clock loop. */}
      <div className="absolute bottom-[210px] left-1/2 -translate-x-1/2 z-[5]">
        <motion.div
          className="relative"
          animate={{
            // 🎯 매뉴얼 튜닝 완료 — path 위에 정확히 매치
            x: [
              "-2vw", "-12.5vw", "-11vw", "-9vw", "6.5vw",
              "1.5vw", "-6.5vw", "-6vw", "12.5vw", "28.5vw", "-2vw",
            ],
          }}
          transition={{
            duration: 40, // Video 20s @ 0.5x speed = 40s wall clock
            // 🚶 각 구간 시간 = 거리에 비례해서 배분 → 여우가 일정한 속도로 걸음
            // (기존: 모두 0.1씩 균등 → 짧은 구간은 멈춘 듯, 긴 구간은 뛰는 듯)
            times: [0, 0.097, 0.111, 0.130, 0.273, 0.319, 0.394, 0.398, 0.570, 0.718, 1],
            repeat: Infinity,
            ease: "linear", // 각 구간 내에서도 일정한 속도 (easeInOut은 뚝뚝 끊기게 함)
          }}
        >
          {/* Walking fox — shadow layer 내장 (같은 img 뒤집어서 발밑 cast) */}
          <WalkingFoxRear size={180} />
        </motion.div>
      </div>

      <div className="relative z-10 flex h-screen flex-col">
        {/* Header — 배경 dark 감지시 텍스트 흰색으로 자동 전환 */}
        <header className="flex items-start justify-between pt-[52px] px-[24px]">
          <div className="transition-colors duration-500">
            <p
              className={`font-sentient text-[14px] leading-none mb-3 transition-colors duration-500 ${
                isDark ? "text-white/80" : "text-journey-navy/70"
              }`}
            >
              {dateStr}
            </p>
            <h1
              className={`font-sentient text-[34px] leading-[1.15] transition-colors duration-500 ${
                isDark ? "text-white" : "text-journey-navy/95"
              }`}
            >
              {greeting},
              <br />
              {name || "you"}
            </h1>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Notifications — 게스트 nudge를 봤으면 dot badge로 계속 접근 가능 */}
            <button
              onClick={() => setNudgeOpen(true)}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition"
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
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {hasNudge && (
                <span className="absolute top-[6px] right-[7px] h-[7px] w-[7px] rounded-full bg-[#B19CD9] border border-white" />
              )}
            </button>

            {/* Menu (hamburger) — profile + settings + logout */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1" />
      </div>

      {/* Camera FAB — 3-way sheet 열음 (take photo / gallery / keep this walk).
          카메라 아이콘이 universally recognized → 유저가 즉시 이해. */}
      <button
        onClick={() => setPostcardSheetOpen(true)}
        aria-label="Capture a moment"
        className="fixed bottom-[95px] right-[24px] z-30 flex h-[51px] w-[51px] items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-journey-navy shadow-lg hover:bg-white/60 active:scale-95 transition"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>

      {/* Bottom nav — shared component */}
      <BottomNav theme="light" />

      {/* Menu sheet — profile · music · settings · logout */}
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Postcard creation sheet — take photo / gallery / keep this walk */}
      <PostcardOptionsSheet
        open={postcardSheetOpen}
        onClose={() => setPostcardSheetOpen(false)}
      />

      {/* Guest login nudge — bell 아이콘에서 접근 (dot badge). Dismiss해도 사라지지 않음. */}
      <GuestLoginNudge
        open={nudgeOpen}
        onClose={() => setNudgeOpen(false)}
      />

      {/* Angel message — 오늘의 편지 (안 읽었을 때만) */}
      <AngelMessageCard
        message={angelMessage}
        onRead={() => setAngelMessage(null)}
      />
    </main>
  );
}

