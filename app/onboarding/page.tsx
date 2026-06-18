"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StarCanvas from "@/components/sisi/StarCanvas";
import PaperBackground from "@/components/sisi/PaperBackground";

export const dynamic = "force-dynamic";

const STEPS = ["welcome", "star", "goal", "date", "vision", "reminders"] as const;
type Step = (typeof STEPS)[number];

const INTENSITIES = [
  { value: "gently", label: "gently", sub: "in its own time" },
  { value: "firmly", label: "firmly", sub: "i know it is coming" },
  { value: "urgently", label: "urgently", sub: "i feel it near" },
];

const REMINDER_OPTIONS = ["08:00", "12:00", "14:00", "20:00", "21:00", "22:00"];

const slideVariants = {
  enter: { opacity: 0, y: 32 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
};

async function uploadStarSignature(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = `${userId}/star-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("signatures")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("signatures").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [starDataUrl, setStarDataUrl] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [intensity, setIntensity] = useState("firmly");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reminders, setReminders] = useState<string[]>(["08:00", "21:00"]);

  const supabase = createClient();

  function next() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function toggleReminder(time: string) {
    setReminders((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  }

  function handleStarComplete(dataUrl: string) {
    setStarDataUrl(dataUrl);
    next();
  }

  async function finish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Upload star signature (fire-and-forget if fails)
    let signatureUrl: string | null = null;
    if (starDataUrl) {
      signatureUrl = await uploadStarSignature(supabase, user.id, starDataUrl);
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      reminder_times: reminders,
      onboarded: true,
      ...(signatureUrl && { signature_star_url: signatureUrl }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) {
      console.error("profile upsert error:", error);
      setLoading(false);
      return;
    }

    if (goal.trim()) {
      await supabase.from("goals").insert({
        user_id: user.id,
        content: goal.trim(),
        category: category || null,
        target_date: targetDate || null,
        intensity,
        status: "active",
      });
    }

    router.refresh();
    router.push("/app");
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <main className="min-h-screen bg-[#F5EFE6] flex flex-col">
      {/* Progress bar */}
      <div className="h-px bg-[#3D2E25]/10 w-full">
        <motion.div
          className="h-full bg-[#D4A82A]"
          animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">

          {/* STEP 1: WELCOME */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm text-center"
            >
              <div className="font-caveat text-3xl text-[#D4A82A] mb-6">☾</div>
              <h1 className="font-fraunces text-4xl text-[#3D2E25] mb-4 leading-tight">
                welcome.
              </h1>
              <p className="font-garamond text-lg text-[#6B5648] leading-relaxed mb-10">
                sísí is your inner self friend. she holds your dreams with you —
                quietly, warmly, without judgment.
              </p>
              <button
                onClick={next}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors"
              >
                begin
              </button>
            </motion.div>
          )}

          {/* STEP 2: DRAW YOUR STAR */}
          {step === "star" && (
            <motion.div
              key="star"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm flex flex-col items-center"
            >
              {/* Dot ornament */}
              <div className="flex items-center gap-2 mb-8">
                <span className="font-garamond text-[#D4A82A]">•</span>
                <span className="font-garamond text-[#D4A82A]/50 text-xs">◦</span>
                <span className="font-garamond text-[#D4A82A]">•</span>
              </div>

              {/* Title */}
              <h2 className="font-fraunces text-[36px] leading-tight text-[#3D2E25] text-center mb-3">
                draw your star.
              </h2>

              {/* Subtitle */}
              <p className="font-garamond italic text-lg text-[#6B5648] text-center mb-10 leading-relaxed">
                너의 첫 sign이야. 너 자신과의 약속.
              </p>

              {/* Canvas with paper border */}
              <PaperBackground noEdge className="w-full max-w-[300px] border border-[#D4A82A]/30 shadow-sm">
                <StarCanvas onComplete={handleStarComplete} onSkip={next} />
              </PaperBackground>
            </motion.div>
          )}

          {/* STEP 3: NAME */}
          {step === "goal" && (
            <motion.div
              key="goal"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm"
            >
              <p className="font-garamond italic text-[#6B5648] text-base mb-1">
                별이 그려졌어.
              </p>
              <h2 className="font-fraunces text-3xl text-[#3D2E25] mb-6 leading-snug">
                뭐라고 불러줄까?
              </h2>

              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="네 이름이나 별명"
                className="w-full bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors mb-8"
              />

              <div className="border-t border-[#3D2E25]/10 pt-8 mt-2">
                <h2 className="font-fraunces text-2xl text-[#3D2E25] mb-2 leading-snug">
                  {displayName ? `${displayName},` : "love,"} 지금 뭘 불러오고 있어?
                </h2>
                <p className="font-garamond italic text-[#8FA38C] text-sm mb-5">
                  구체적으로. 우주는 디테일을 좋아해.
                </p>

                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="나는 지금 불러오고 있어..."
                  rows={4}
                  className="w-full bg-transparent border border-[#3D2E25]/20 focus:border-[#D4A82A] outline-none p-4 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors resize-none mb-5"
                />

                <div className="grid grid-cols-3 gap-2 mb-6">
                  {[
                    ["love", "love"],
                    ["abundance", "풍요"],
                    ["career", "커리어"],
                    ["health", "건강"],
                    ["peace", "내면의 평화"],
                    ["other", "기타"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setCategory(category === val ? "" : val)}
                      className={`py-2 px-2 font-garamond text-xs transition-all border ${
                        category === val
                          ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                          : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.value}
                      onClick={() => setIntensity(i.value)}
                      className={`flex items-center justify-between py-3 px-4 border transition-all ${
                        intensity === i.value
                          ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                          : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/50"
                      }`}
                    >
                      <span className="font-garamond text-sm">{i.label}</span>
                      <span className={`font-garamond text-xs italic ${intensity === i.value ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                        {i.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={next}
                disabled={!goal.trim()}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                continue
              </button>
            </motion.div>
          )}

          {/* STEP 4: TARGET DATE */}
          {step === "date" && (
            <motion.div
              key="date"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm text-center"
            >
              <div className="font-caveat text-2xl text-[#D4A82A] mb-6">✦</div>
              <h2 className="font-fraunces text-3xl text-[#3D2E25] mb-3 leading-snug">
                언제쯤 원해?
              </h2>
              <p className="font-garamond italic text-[#6B5648] mb-8 leading-relaxed">
                마감이 아니야. 이미 살아가고 있는 날짜야.
              </p>

              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] transition-colors mb-8 text-center"
              />

              <button
                onClick={next}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors mb-3"
              >
                {targetDate ? "continue" : "나중에 정할게"}
              </button>
            </motion.div>
          )}

          {/* STEP 5: VISION BOARD TEASER */}
          {step === "vision" && (
            <motion.div
              key="vision"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm text-center"
            >
              <div className="w-full aspect-[3/4] bg-[#3D2E25] mb-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border border-[#D4A82A]"
                      style={{ inset: `${i * 12}px`, opacity: 1 - i * 0.15 }}
                    />
                  ))}
                </div>
                <p className="font-caveat text-4xl text-[#D4A82A] mb-4 relative z-10">☾</p>
                <p className="font-fraunces text-lg text-[#F5EFE6] relative z-10 px-8 leading-snug italic">
                  your vision board is waiting to be born.
                </p>
              </div>
              <h2 className="font-fraunces text-2xl text-[#3D2E25] mb-3">
                sísí will create yours.
              </h2>
              <p className="font-garamond text-[#6B5648] leading-relaxed mb-8">
                네가 불러오는 것을 중심으로 시각적인 세계를 만들어줄게.
              </p>
              <button
                onClick={next}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors"
              >
                준비됐어
              </button>
            </motion.div>
          )}

          {/* STEP 6: REMINDERS */}
          {step === "reminders" && (
            <motion.div
              key="reminders"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <div className="font-caveat text-2xl text-[#D4A82A] mb-4">◎</div>
                <h2 className="font-fraunces text-3xl text-[#3D2E25] mb-3">
                  sísí가 언제 연락할까?
                </h2>
                <p className="font-garamond italic text-[#6B5648] leading-relaxed">
                  이 시간에 조용히 알림을 보낼게. 느낌 가는 대로 골라봐.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-10">
                {REMINDER_OPTIONS.map((time) => {
                  const hour = parseInt(time.split(":")[0]);
                  const label = hour < 12 ? `오전 ${hour}시` : hour === 12 ? "낮 12시" : `오후 ${hour - 12}시`;
                  const sub = hour < 12 ? "아침" : hour < 17 ? "낮" : "저녁";
                  return (
                    <button
                      key={time}
                      onClick={() => toggleReminder(time)}
                      className={`py-4 px-4 border transition-all text-left ${
                        reminders.includes(time)
                          ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                          : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/50"
                      }`}
                    >
                      <div className="font-fraunces text-lg">{label}</div>
                      <div className={`font-garamond text-xs italic mt-0.5 ${reminders.includes(time) ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                        {sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={finish}
                disabled={loading}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-40 transition-colors"
              >
                {loading ? "entering..." : "sísí와 시작하기"}
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Step indicator */}
        {step !== "welcome" && (
          <div className="flex gap-2 mt-10">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-px transition-all duration-500 ${
                  i <= stepIndex ? "bg-[#D4A82A] w-8" : "bg-[#3D2E25]/15 w-4"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
