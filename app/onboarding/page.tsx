"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const STEPS = ["welcome", "goal", "date", "vision", "reminders"] as const;
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);

  const [goal, setGoal] = useState("");
  const [intensity, setIntensity] = useState("firmly");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [displayName, setDisplayName] = useState("");
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

  async function finish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // 프로필 업데이트
    await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      reminder_times: reminders,
      onboarded: true,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // 첫 goal 생성
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
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
              <div className="mb-8">
                <label className="block font-garamond text-sm text-[#6B5648] mb-2 text-left">
                  what do i call you?
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="your name or nickname"
                  className="w-full bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors"
                />
              </div>
              <button
                onClick={next}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors"
              >
                begin
              </button>
            </motion.div>
          )}

          {/* STEP 2: GOAL */}
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
              <p className="font-garamond italic text-[#6B5648] text-base mb-3">
                {displayName ? `${displayName},` : "love,"}
              </p>
              <h2 className="font-fraunces text-3xl text-[#3D2E25] mb-2 leading-snug">
                what are you calling in?
              </h2>
              <p className="font-garamond text-[#8FA38C] text-sm mb-8 italic">
                be specific. the universe loves detail.
              </p>

              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="i am calling in..."
                rows={4}
                className="w-full bg-transparent border border-[#3D2E25]/20 focus:border-[#D4A82A] outline-none p-4 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors resize-none mb-6"
              />

              <p className="font-garamond text-sm text-[#6B5648] mb-3">
                what area of life?
              </p>
              <div className="grid grid-cols-3 gap-2 mb-8">
                {[
                  ["love", "love"],
                  ["abundance", "abundance"],
                  ["career", "career"],
                  ["health", "health"],
                  ["peace", "inner peace"],
                  ["other", "other"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setCategory(category === val ? "" : val)}
                    className={`py-2 px-3 font-garamond text-sm transition-all border ${
                      category === val
                        ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                        : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="font-garamond text-sm text-[#6B5648] mb-3">
                how strongly do you feel it?
              </p>
              <div className="flex flex-col gap-2 mb-8">
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
                    <span className="font-garamond">{i.label}</span>
                    <span className={`font-garamond text-sm italic ${intensity === i.value ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                      {i.sub}
                    </span>
                  </button>
                ))}
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

          {/* STEP 3: TARGET DATE */}
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
                when do you want this?
              </h2>
              <p className="font-garamond italic text-[#6B5648] mb-8 leading-relaxed">
                not a deadline. a date you are already living toward.
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
                {targetDate ? "continue" : "i'll set this later"}
              </button>
              {!targetDate && (
                <button
                  onClick={next}
                  className="w-full py-2 font-garamond text-sm text-[#6B5648]/60 hover:text-[#3D2E25] transition-colors"
                >
                  skip for now
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 4: VISION BOARD TEASER */}
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
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border border-[#D4A82A]"
                      style={{
                        inset: `${i * 12}px`,
                        opacity: 1 - i * 0.15,
                      }}
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
                a visual world built around what you are calling in. we will generate
                it together in a moment.
              </p>
              <button
                onClick={next}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] transition-colors"
              >
                i am ready
              </button>
            </motion.div>
          )}

          {/* STEP 5: REMINDERS */}
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
                  when should sísí reach out?
                </h2>
                <p className="font-garamond italic text-[#6B5648] leading-relaxed">
                  she will send gentle reminders at these times.
                  pick what feels right.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-10">
                {REMINDER_OPTIONS.map((time) => {
                  const hour = parseInt(time.split(":")[0]);
                  const label = hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
                  const sub = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
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
                {loading ? "entering..." : "enter sísí"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicator */}
        {step !== "welcome" && (
          <div className="flex gap-2 mt-12">
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
