"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WalkingFoxRear } from "@/components/sisi/WalkingFoxRear";
import { JourneyScene } from "@/components/sisi/JourneyScene";
import { BottomNav } from "@/components/sisi/BottomNav";
import { MenuSheet } from "@/components/sisi/MenuSheet";
import { AngelMessageCard } from "@/components/sisi/AngelMessageCard";
import { useVideoLuminance } from "@/lib/useVideoLuminance";
import { createClient } from "@/lib/supabase/client";
import { ensureTodaysMessage, type AngelMessage } from "@/lib/angelMessages";

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
  const [angelMessage, setAngelMessage] = useState<AngelMessage | null>(null);
  const greeting = getGreeting();
  const dateStr = formatDate();

  // Angel message — 홈 열 때 오늘의 편지 확인 (24h 내 없으면 생성)
  useEffect(() => {
    ensureTodaysMessage().then((msg) => {
      // 안 읽은 것만 카드로 표시
      if (msg && !msg.read_at) setAngelMessage(msg);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setName(profile.display_name);
        }
      } catch {
        // fail silent — 이름 없어도 앱 동작
      }
    })();
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#F5F4EC]">
      {/* Background video world — 48fps interpolated *smooth 명상 페이스* (0.5x = 24fps effective) */}
      <JourneyScene />

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
            {/* Notifications */}
            <button
              aria-label="Notifications"
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
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
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

      {/* Camera FAB — nav 위로 딱 (my-stars의 + 버튼과 같은 높이) */}
      <Link
        href="/moment"
        aria-label="Capture this moment"
        className="absolute bottom-[110px] right-[24px] z-30 flex h-[51px] w-[51px] items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-journey-navy shadow-lg hover:bg-white/60 active:scale-95 transition"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </Link>

      {/* Bottom nav — shared component */}
      <BottomNav theme="light" />

      {/* Menu sheet — profile · music · settings · logout */}
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Angel message — 오늘의 편지 (안 읽었을 때만) */}
      <AngelMessageCard
        message={angelMessage}
        onRead={() => setAngelMessage(null)}
      />
    </main>
  );
}

