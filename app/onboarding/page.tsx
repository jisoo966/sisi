"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * /onboarding — 단일 단계: 이름만 물어봄.
 * 첫 별(wish)은 /my-stars 페이지에서 receivingstar / sendingstar 애니메이션과 함께 만듦.
 *
 * Flow:
 *   name 입력 → 저장 + onboarded=true → /my-stars?firstTime=true 로 이동
 *   /my-stars가 firstTime 감지해서 자동으로 첫 별 만드는 애니메이션 시작
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  // 이미 온보딩 완료된 사용자면 /journey로 우회 (게스트 모드도 지원)
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 게스트 모드 — 로컬 스토리지 확인
      const isGuest = localStorage.getItem("sisi:guest") === "true";

      if (!user && !isGuest) {
        router.push("/login");
        return;
      }

      // 게스트: localStorage에서 이름/온보딩 상태 확인
      if (!user && isGuest) {
        const guestName = localStorage.getItem("sisi:guest-name");
        const guestOnboarded = localStorage.getItem("sisi:guest-onboarded");
        if (guestOnboarded === "true") {
          router.push("/journey");
          return;
        }
        if (guestName) setName(guestName);
        setReady(true);
        return;
      }

      // 로그인 유저: Supabase profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded, display_name")
        .eq("id", user!.id)
        .maybeSingle();

      if (profile?.onboarded) {
        router.push("/journey");
        return;
      }
      if (profile?.display_name) {
        setName(profile.display_name);
      }
      setReady(true);
    })();
  }, [router]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // upsert (no handle_new_user trigger) — display_name 저장 + onboarded 마크
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          display_name: trimmed,
          onboarded: true,
        });
      } else {
        // 게스트 — localStorage 이름 + onboarded 마크
        localStorage.setItem("sisi:guest-name", trimmed);
        localStorage.setItem("sisi:guest-onboarded", "true");
      }
      // /my-stars가 자동으로 첫 별 만드는 애니메이션 flow 시작
      router.push("/my-stars?firstTime=true");
    } catch (err) {
      console.error("save name failed:", err);
      // 실패해도 계속 진행 — 로컬 게스트로 fallback
      router.push("/my-stars?firstTime=true");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <main
        className="relative min-h-svh w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
        }}
      />
    );
  }

  return (
    <main
      className="relative min-h-svh w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
      }}
    >
      {/* Starry background */}
      <StarField />

      {/* Content */}
      <div className="relative z-10 flex min-h-svh flex-col px-[24px] pt-[52px] pb-[42px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          <div className="mt-[80px] mb-[36px]">
            <p className="font-sentient italic text-[16px] text-white mb-3">
              hello, love.
            </p>
            <h1 className="font-sentient text-[32px] text-white leading-[1.2]">
              what should sísí
              <br />
              call you?
            </h1>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="your name"
            autoFocus
            className="font-sentient text-[22px] text-white placeholder:text-white/40 bg-transparent border-b border-white/40 focus:border-white/80 outline-none pb-3 mb-3 transition-colors"
          />
          <p className="font-sentient italic text-[13px] text-white/60">
            or whatever feels like you.
          </p>

          <div className="flex-1" />

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="font-sentient text-[16px] rounded-[24px] bg-[#B19CD9] text-journey-navy h-[56px] w-full shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-40 transition"
          >
            {saving ? "..." : "continue"}
          </button>
        </motion.div>
      </div>
    </main>
  );
}

/** 배경 별들 */
function StarField() {
  const stars = [
    { top: "8%", left: "18%", size: 3, delay: 0 },
    { top: "12%", left: "78%", size: 2, delay: 0.5 },
    { top: "18%", left: "60%", size: 2, delay: 1 },
    { top: "22%", left: "12%", size: 2, delay: 1.5 },
    { top: "26%", left: "88%", size: 3, delay: 0.3 },
    { top: "32%", left: "50%", size: 2, delay: 0.8 },
    { top: "38%", left: "8%", size: 2, delay: 1.2 },
    { top: "42%", left: "92%", size: 3, delay: 0.6 },
    { top: "48%", left: "70%", size: 2, delay: 1.4 },
    { top: "55%", left: "22%", size: 2, delay: 0.9 },
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
