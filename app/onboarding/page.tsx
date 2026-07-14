"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createStar, saveStar, type Timeframe } from "@/lib/myStars";

export const dynamic = "force-dynamic";

type Step = "name" | "wish";

/**
 * /onboarding — 최소 2단계 온보딩.
 *   1. 이름 (sísí가 뭐라고 부를지)
 *   2. 첫 소원 (첫 별)
 * 완료 → /journey로 진입 (하늘에 별 하나 이미 있음)
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  // 이미 온보딩 완료된 사용자면 /journey로 우회
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded, display_name")
        .eq("id", user.id)
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

  async function handleNameSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ display_name: trimmed })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("save name failed:", err);
    } finally {
      setSaving(false);
      setStep("wish");
    }
  }

  async function handleWishSubmit() {
    const trimmed = wish.trim();
    if (!trimmed || !timeframe) return;

    setSaving(true);
    try {
      const star = createStar(trimmed, timeframe, []);
      await saveStar(star);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarded: true })
          .eq("id", user.id);
      }

      router.push("/journey");
    } catch (err) {
      console.error("save first star failed:", err);
      router.push("/journey");
    }
  }

  if (!ready) {
    return (
      <main
        className="relative min-h-screen w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
        }}
      />
    );
  }

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #1a1737 0%, #2a2456 45%, #3a4a72 100%)",
      }}
    >
      {/* Starry background */}
      <StarField />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col px-[24px] pt-[52px] pb-[42px]">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-[36px]">
          <Dot active={step === "name"} />
          <Dot active={step === "wish"} />
        </div>

        <AnimatePresence mode="wait">
          {step === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              <div className="mt-[60px] mb-[36px]">
                <p className="font-sentient italic text-[16px] text-white/70 mb-3">
                  hello, love.
                </p>
                <h1 className="font-sentient text-[32px] text-white/95 leading-[1.2]">
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
                className="font-sentient text-[22px] text-white placeholder:text-white/30 bg-transparent border-b border-white/30 focus:border-white/70 outline-none pb-3 mb-3 transition-colors"
              />
              <p className="font-sentient italic text-[13px] text-white/40">
                or whatever feels like you.
              </p>

              <div className="flex-1" />

              <button
                onClick={handleNameSubmit}
                disabled={!name.trim() || saving}
                className="font-sentient text-[16px] rounded-[24px] bg-white/95 text-journey-navy h-[56px] w-full shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-30 transition"
              >
                {saving ? "..." : "continue"}
              </button>
            </motion.div>
          )}

          {step === "wish" && (
            <motion.div
              key="wish"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              <div className="mt-[60px] mb-[24px]">
                <p className="font-sentient italic text-[16px] text-white/70 mb-3">
                  nice to meet you, {name || "you"}.
                </p>
                <h1 className="font-sentient text-[28px] text-white/95 leading-[1.25]">
                  what&apos;s one thing
                  <br />
                  meant for you?
                </h1>
                <p className="font-sentient italic text-[14px] text-white/50 mt-3 leading-[1.5]">
                  we&apos;ll place it in the sky.
                  <br />
                  a star to walk toward.
                </p>
              </div>

              <textarea
                value={wish}
                onChange={(e) => setWish(e.target.value.slice(0, 80))}
                placeholder="I want to..."
                rows={2}
                autoFocus
                className="font-sentient text-[18px] text-white placeholder:text-white/30 bg-transparent border-b border-white/30 focus:border-white/70 outline-none resize-none pb-3 leading-snug transition-colors"
              />
              <p className="font-mono text-[11px] text-white/30 text-right mt-1">
                {wish.length}/80
              </p>

              <p className="font-sentient text-[12px] text-white/60 tracking-widest uppercase mt-[20px] mb-[10px]">
                By when?
              </p>
              <div className="grid grid-cols-2 gap-[8px]">
                {(
                  [
                    "this month",
                    "this season",
                    "this year",
                    "someday",
                  ] as Timeframe[]
                ).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`font-sentient text-[14px] rounded-[12px] h-[44px] transition ${
                      timeframe === tf
                        ? "bg-white/95 text-journey-navy"
                        : "bg-white/10 border border-white/25 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <button
                onClick={handleWishSubmit}
                disabled={!wish.trim() || !timeframe || saving}
                className="font-sentient text-[16px] rounded-[24px] bg-[#B19CD9] text-journey-navy h-[56px] w-full shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-30 transition"
              >
                {saving ? "..." : "send this star ✦"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <div
      className={`h-[6px] rounded-full transition-all duration-300 ${
        active ? "w-[24px] bg-white/90" : "w-[6px] bg-white/30"
      }`}
    />
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
