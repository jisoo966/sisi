"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Goal = {
  id: string;
  content: string;
  category: string | null;
  target_date: string | null;
  intensity: string;
  status: string;
  created_at: string;
};

type Capture = {
  id: string;
  content: string;
  type: string;
  created_at: string;
  goal_id: string | null;
};

type MeditationSession = { created_at: string };

function toDateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDaysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const days: string[] = [];
  const cur = new Date(s);
  while (cur <= e) {
    days.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const INTENSITY_COLORS: Record<string, string> = {
  gently: "#8FA38C",
  firmly: "#D4A82A",
  urgently: "#C4847C",
};

export default function TimelineClient({
  goals,
  captures,
  meditationSessions,
}: {
  goals: Goal[];
  captures: Capture[];
  meditationSessions: MeditationSession[];
}) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(
    goals.find((g) => g.status === "active" && g.target_date) ?? goals[0] ?? null
  );

  const today = toDateStr(new Date());

  // 활동 날짜 집합
  const activeDates = new Set([
    ...captures.map((c) => toDateStr(new Date(c.created_at))),
    ...meditationSessions.map((s) => toDateStr(new Date(s.created_at))),
  ]);

  // 선택된 goal의 달력 날짜들
  const calendarDays = selectedGoal?.target_date
    ? getDaysBetween(
        selectedGoal.created_at.split("T")[0],
        selectedGoal.target_date
      )
    : [];

  const totalDays = calendarDays.length;

  // 선택된 goal의 captures
  const goalCaptures = captures.filter(
    (c) => !selectedGoal || c.goal_id === selectedGoal.id || !c.goal_id
  );

  return (
    <main className="min-h-screen bg-[#F5EFE6]">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">timeline</span>
        <Link href="/capture" className="font-garamond text-sm text-[#D4A82A] hover:text-[#3D2E25] transition-colors">
          + capture
        </Link>
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16">

        {/* Goal selector */}
        {goals.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGoal(g)}
                className={`shrink-0 px-3 py-1.5 font-garamond text-sm border transition-all ${
                  selectedGoal?.id === g.id
                    ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                    : "text-[#6B5648] border-[#3D2E25]/20"
                }`}
              >
                {g.category ?? "goal"}
              </button>
            ))}
          </div>
        )}

        {selectedGoal ? (
          <>
            {/* Goal header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8"
            >
              <p
                className="font-garamond text-xs uppercase tracking-widest mb-2"
                style={{ color: INTENSITY_COLORS[selectedGoal.intensity] ?? "#D4A82A" }}
              >
                {selectedGoal.intensity} · {selectedGoal.category ?? "manifestation"}
              </p>
              <h2 className="font-fraunces text-2xl text-[#3D2E25] leading-snug mb-3">
                {selectedGoal.content}
              </h2>
              {selectedGoal.target_date && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#D4A82A]/20" />
                  <p className="font-garamond italic text-sm text-[#6B5648]">
                    {daysUntil(selectedGoal.target_date) > 0
                      ? `${daysUntil(selectedGoal.target_date)} days away`
                      : daysUntil(selectedGoal.target_date) === 0
                      ? "today is the day."
                      : "it is already here."}
                  </p>
                  <div className="h-px flex-1 bg-[#D4A82A]/20" />
                </div>
              )}
            </motion.div>

            {/* Calendar grid */}
            {calendarDays.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="mb-8"
              >
                <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-4">
                  your journey · {formatDate(calendarDays[0])} → {formatDate(calendarDays[calendarDays.length - 1])}
                </p>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {calendarDays.map((day, i) => {
                    const isToday = day === today;
                    const isPast = day < today;
                    const hasActivity = activeDates.has(day);
                    const progress = i / totalDays;
                    const isFuture = day > today;

                    return (
                      <div
                        key={day}
                        title={formatDate(day)}
                        className={`aspect-square flex items-center justify-center text-[9px] font-garamond transition-all ${
                          isToday
                            ? "ring-1 ring-[#D4A82A]"
                            : ""
                        }`}
                        style={{
                          backgroundColor: hasActivity
                            ? `rgba(212, 168, 42, ${0.3 + progress * 0.7})`
                            : isPast
                            ? "rgba(61, 46, 37, 0.05)"
                            : "rgba(61, 46, 37, 0.03)",
                          opacity: isFuture ? 0.4 : 1,
                        }}
                      >
                        {isToday && (
                          <span className="text-[#D4A82A] font-caveat text-xs">◎</span>
                        )}
                        {hasActivity && !isToday && (
                          <span style={{ color: `rgba(212, 168, 42, ${0.6 + progress * 0.4})` }}>
                            ✦
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="font-garamond text-xs text-[#8FA38C] italic">less active</span>
                  <div className="flex gap-1 flex-1">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
                      <div key={o} className="h-2 flex-1" style={{ backgroundColor: `rgba(212, 168, 42, ${o})` }} />
                    ))}
                  </div>
                  <span className="font-garamond text-xs text-[#D4A82A] italic">more active</span>
                </div>
              </motion.div>
            )}

            {/* Captures list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest">
                  synchronicities captured
                </p>
                <Link
                  href="/capture"
                  className="font-garamond text-xs text-[#D4A82A]"
                >
                  + add
                </Link>
              </div>

              {goalCaptures.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {goalCaptures.map((capture, i) => (
                    <motion.div
                      key={capture.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="flex gap-4 bg-[#FAF6F0] border border-[#3D2E25]/8 p-4"
                    >
                      <div className="font-caveat text-[#D4A82A] text-lg mt-0.5">◇</div>
                      <div className="flex-1">
                        <p className="font-garamond text-[#3D2E25] leading-relaxed">
                          {capture.content}
                        </p>
                        <p className="font-garamond italic text-xs text-[#8FA38C] mt-1">
                          {formatDate(capture.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Link
                  href="/capture"
                  className="block border border-dashed border-[#3D2E25]/20 p-6 text-center hover:border-[#D4A82A]/40 transition-colors"
                >
                  <p className="font-garamond italic text-[#6B5648]">
                    what has the universe shown you?
                  </p>
                  <p className="font-garamond text-xs text-[#8FA38C] mt-1">
                    tap to capture a synchronicity
                  </p>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="text-center pt-20">
            <p className="font-fraunces text-2xl text-[#3D2E25] mb-4">no goals yet.</p>
            <p className="font-garamond italic text-[#6B5648] mb-8">
              what are you calling in?
            </p>
            <Link
              href="/onboarding"
              className="font-garamond px-8 py-4 bg-[#3D2E25] text-[#F5EFE6]"
            >
              set a goal
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
